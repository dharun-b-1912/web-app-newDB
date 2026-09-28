import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Inspecting vendors before cleanup:');
  const { data: before, error: bErr } = await supabase.from('vendors').select('id, vendor_code, legal_name');
  console.log('Vendors before:', before, bErr);

  // Attempt to delete seed/test vendors
  const { data: deleted, error: dErr } = await supabase
    .from('vendors')
    .delete()
    .in('vendor_code', ['VND_TEST_MUARMMVV', 'VND-TEST-001', 'VEN-000001'])
    .select();

  console.log('Delete result:', deleted, 'Error:', dErr);

  const { data: after } = await supabase.from('vendors').select('id, vendor_code, legal_name');
  console.log('Vendors after:', after);
}

main().catch(console.error);
