import { executeSql } from './execute_sql.mjs';

async function main() {
  console.log('Auditing live leave tables and routines in Supabase...');

  const tablesQuery = `
    SELECT table_name, column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('leave_types', 'leave_balances', 'leave_requests', 'leave_ledger_entries', 'holidays', 'leave_policies', 'holiday_calendars')
    ORDER BY table_name, ordinal_position;
  `;

  const tablesRes = await executeSql(tablesQuery);
  const byTable = {};
  for (const row of tablesRes.rows) {
    if (!byTable[row.table_name]) byTable[row.table_name] = [];
    byTable[row.table_name].push({
      col: row.column_name,
      type: row.data_type,
      nullable: row.is_nullable,
      default: row.column_default
    });
  }

  console.log('=== TABLES & COLUMNS ===');
  for (const [table, cols] of Object.entries(byTable)) {
    console.log(`\nTable: ${table} (${cols.length} columns)`);
    cols.forEach(c => console.log(`  - ${c.col}: ${c.type} (nullable: ${c.nullable}, default: ${c.default})`));
  }

  const routinesQuery = `
    SELECT routine_name, routine_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND (routine_name ILIKE '%leave%' OR routine_name ILIKE '%holiday%')
    ORDER BY routine_name;
  `;
  const routinesRes = await executeSql(routinesQuery);
  console.log('\n=== LEAVE ROUTINES ===');
  routinesRes.rows.forEach(r => console.log(`  - ${r.routine_name} (${r.routine_type})`));
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
