// scripts/probe_live_schema.ts
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { runForensicAudit } from './forensic_auditor';

async function probeLiveSchema() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
  const client = createClient(supabaseUrl, supabaseAnonKey);

  const tables = runForensicAudit();
  const tableNames = Array.from(tables.keys());

  console.log(`\n[PROBING LIVE SUPABASE INSTANCE: ${supabaseUrl}]`);
  console.log(`Testing ${tableNames.length} tables against PostgREST schema...`);

  const results = {
    accessible: [] as string[],
    rlsRestrictedOrEmpty: [] as string[],
    relationNotFound: [] as string[],
    otherError: [] as { table: string; error: string }[],
  };

  // Test in batches of 15
  for (let i = 0; i < tableNames.length; i += 15) {
    const chunk = tableNames.slice(i, i + 15);
    await Promise.all(
      chunk.map(async (table) => {
        try {
          const { data, error } = await client.from(table).select('*').limit(1);
          if (error) {
            if (error.code === '42P01' || error.message.includes('relation') || error.message.includes('does not exist') || error.message.includes('Could not find')) {
              results.relationNotFound.push(table);
            } else {
              results.otherError.push({ table, error: error.message });
            }
          } else {
            if (data && data.length > 0) {
              results.accessible.push(table);
            } else {
              // 0 rows returned, which for anon could mean empty OR protected by RLS
              results.rlsRestrictedOrEmpty.push(table);
            }
          }
        } catch (e: any) {
          results.otherError.push({ table, error: e.message });
        }
      })
    );
  }

  console.log('\n[LIVE PROBE RESULTS SUMMARY]');
  console.log(`- Accessible with live data (anon): ${results.accessible.length} tables:`, results.accessible);
  console.log(`- RLS Protected or Empty (0 rows returned): ${results.rlsRestrictedOrEmpty.length} tables`);
  console.log(`- Not Found / Removed in Live Schema: ${results.relationNotFound.length} tables`);
  console.log(`- Other / Custom errors: ${results.otherError.length} tables`);

  return results;
}

probeLiveSchema().catch(console.error);
