import { executeSql } from '../scratch/execute_sql.mjs';

async function main() {
  const res = await executeSql(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'biometric_devices'
    ORDER BY ordinal_position;
  `);
  console.log('Columns in biometric_devices:');
  console.table(res.rows);

  const polRes = await executeSql(`
    SELECT policyname, permissive, roles, cmd, qual, with_check 
    FROM pg_policies 
    WHERE tablename = 'biometric_devices';
  `);
  console.log('Policies on biometric_devices:');
  console.table(polRes.rows);
}

main().catch(console.error);
