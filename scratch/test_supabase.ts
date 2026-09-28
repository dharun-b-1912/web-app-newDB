import { supabase } from '../src/lib/supabase';

async function testSupabase() {
  console.log('Testing Supabase query for vendor_attendance_records...');
  try {
    const { data, error, count } = await supabase
      .from('vendor_attendance_records')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.log('Supabase error:', error.message, error.code);
    } else {
      console.log('Supabase vendor_attendance_records count:', count);
    }

    // Check vendor_attendance_batches
    const { count: batchCount, error: batchErr } = await supabase
      .from('vendor_attendance_batches')
      .select('*', { count: 'exact', head: true });

    if (batchErr) {
      console.log('Batch error:', batchErr.message);
    } else {
      console.log('Supabase vendor_attendance_batches count:', batchCount);
    }
  } catch (err: any) {
    console.log('Catch error:', err.message);
  }
}

testSupabase().catch(console.error);
