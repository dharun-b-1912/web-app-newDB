import { supabase } from '../src/lib/supabase.ts';

async function checkCols() {
  const { data: cols, error } = await supabase.rpc('get_table_columns_debug', { target_table: 'payslips' }).catch(() => ({ data: null }));
  
  // Or query via rpc or check database migration files
  console.log('Error or null, checking migrations...');
}

checkCols();
