import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDbClient } from './inspect_canonical_m1.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('Connecting to database...');
  const client = await getDbClient();
  console.log('✅ Connected to database!');

  try {
    const sqlPath = path.resolve(__dirname, '../supabase/migrations/20260907_300_phase_storage_architecture_canonicalization.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('\nApplying migration 20260907_300_phase_storage_architecture_canonicalization.sql...');
    await client.query(sqlContent);
    console.log('✅ Migration applied successfully!');

    // Query storage.buckets
    const bucketRes = await client.query(`
      SELECT id, name, public, file_size_limit, allowed_mime_types
      FROM storage.buckets;
    `);
    console.log('\nActive storage.buckets:');
    console.table(bucketRes.rows);

    // Query storage.objects policies
    const polRes = await client.query(`
      SELECT policyname, cmd, roles, qual, with_check
      FROM pg_policies
      WHERE tablename = 'objects' AND schemaname = 'storage';
    `);
    console.log('\nActive policies on storage.objects:');
    console.table(polRes.rows.map(r => ({
      policyname: r.policyname,
      cmd: r.cmd,
      qual: (r.qual || '').substring(0, 45) + '...',
      with_check: (r.with_check || '').substring(0, 45) + '...'
    })));

    // Query document_types count
    const dtRes = await client.query(`
      SELECT count(*) as count, organization_id
      FROM public.document_types
      GROUP BY organization_id;
    `);
    console.log('\nDocument types summary:');
    console.table(dtRes.rows);

  } catch (err) {
    console.error('Migration execution failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err.message);
  process.exit(1);
});
