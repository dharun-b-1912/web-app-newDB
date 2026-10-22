import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

const client = createClient(url, key);

async function main() {
  console.log('Checking Supabase Database Tables for Assets:');
  
  // 1. Assets Table
  const { data: assets, error: err1 } = await client.from('assets').select('*');
  console.log('\n=== Table: public.assets ===');
  if (err1) {
    console.error('Error fetching assets:', err1);
  } else {
    console.log(`Row count: ${assets.length}`);
    if (assets.length > 0) {
      console.log('Columns on public.assets:', Object.keys(assets[0]));
      console.log('Sample Row:', assets[0]);
    }
  }

  // 2. Asset Assignments Table
  const { data: asgns, error: err2 } = await client.from('asset_assignments').select('*');
  console.log('\n=== Table: public.asset_assignments ===');
  if (err2) {
    console.error('Error fetching asset_assignments:', err2);
  } else {
    console.log(`Row count: ${asgns.length}`);
    if (asgns.length > 0) {
      console.log('Columns on public.asset_assignments:', Object.keys(asgns[0]));
      console.log('Sample Row:', asgns[0]);
    }
  }
}

main().catch(console.error);
