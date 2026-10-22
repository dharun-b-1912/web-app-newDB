import { executeSql } from '../scratch/execute_sql.mjs';

async function main() {
  const assetsCols = await executeSql(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'assets'
    ORDER BY ordinal_position;
  `);
  console.log('Columns in assets:');
  console.table(assetsCols.rows);

  const asgnCols = await executeSql(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns 
    WHERE table_name = 'asset_assignments'
    ORDER BY ordinal_position;
  `);
  console.log('Columns in asset_assignments:');
  console.table(asgnCols.rows);
}

main().catch(console.error);
