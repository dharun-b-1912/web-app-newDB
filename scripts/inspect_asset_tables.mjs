import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const sb = createClient(url, key);

async function check() {
  const { data: assets, error: errA } = await sb.from('assets').select('*').limit(2);
  const { data: asgns, error: errB } = await sb.from('asset_assignments').select('*').limit(2);
  console.log('assets error:', errA ? errA.message : 'OK, rows=' + (assets?.length || 0));
  if (assets && assets[0]) console.log('assets keys:', Object.keys(assets[0]));
  console.log('asset_assignments error:', errB ? errB.message : 'OK, rows=' + (asgns?.length || 0));
  if (asgns && asgns[0]) console.log('asset_assignments keys:', Object.keys(asgns[0]));
}

check();
