import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf-8');
const urlMatch = env.match(/VITE_SUPABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/);
const keyMatch = env.match(/VITE_SUPABASE_ANON_KEY\s*=\s*["']?([^"'\r\n]+)["']?/);

const supabaseUrl = urlMatch ? urlMatch[1].trim() : '';
const supabaseKey = keyMatch ? keyMatch[1].trim() : '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Using URL:', supabaseUrl);
  const { data: vendors, error: vErr } = await supabase.from('vendors').select('id, vendor_code, legal_name, display_name, status');
  console.log('Vendors count:', vendors?.length, 'Vendors:', vendors, 'Error:', vErr);

  const { data: workers, error: wErr } = await supabase.from('vendor_workers').select('id, worker_code, full_name, designation, status');
  console.log('Workers count:', workers?.length, 'Workers:', workers, 'Error:', wErr);

  const { data: contracts, error: cErr } = await supabase.from('vendor_contracts').select('id, contract_code, vendor_id, status');
  console.log('Contracts count:', contracts?.length, 'Contracts:', contracts, 'Error:', cErr);

  const { data: dailyOt, error: otErr } = await supabase.from('vendor_daily_ot_records').select('*');
  console.log('Daily OT count:', dailyOt?.length, 'Error:', otErr);

  const { data: documents, error: dErr } = await supabase.from('vendor_documents').select('*');
  console.log('Documents count:', documents?.length, 'Error:', dErr);
}

main().catch(console.error);
