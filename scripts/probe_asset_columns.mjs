import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = 'https://ysiajemrqakfngasehhi.supabase.co';
const key = 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const sb = createClient(url, key);

async function checkAnon() {
  const { data: emps, error: errE } = await sb.from('employees').select('id, first_name, last_name, organization_id, company_id').limit(2);
  console.log('Anon employees:', emps, errE);

  if (emps && emps[0]) {
    const orgId = emps[0].organization_id;
    const compId = emps[0].company_id;

    const testAsset = {
      organization_id: orgId,
      company_id: compId,
      asset_code: 'AST-ANON-001',
      name: 'Safety Helmet & Vest Kit',
      category: 'HARDWARE',
      serial_number: 'PPE-01',
      purchase_date: '2026-10-16',
      purchase_cost: 850,
      status: 'AVAILABLE'
    };

    const { data: insData, error: insErr } = await sb.from('assets').insert([testAsset]).select();
    console.log('Anon Asset Insert:', insErr ? insErr : 'SUCCESS! ' + JSON.stringify(insData));

    if (insData && insData[0]) {
      await sb.from('assets').delete().eq('id', insData[0].id);
      console.log('Cleaned up.');
    }
  }
}

checkAnon().catch(console.error);
