import dotenv from 'dotenv';
dotenv.config();

const url = 'https://ysiajemrqakfngasehhi.supabase.co/functions/v1/attendance-report-dispatcher';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';

async function testEdgeFunction() {
  console.log('Testing Morning slot Edge Function attendance-report-dispatcher...');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        slot: 'MORNING',
        mode: 'MANUAL_TEST',
      }),
    });
    console.log('HTTP Status:', res.status);
    const json = await res.json();
    console.log('Response:', JSON.stringify(json, null, 2));
  } catch (e) {
    console.error('Fetch error:', e);
  }
}

testEdgeFunction();
