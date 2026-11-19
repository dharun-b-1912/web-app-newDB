const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkFks() {
  const { data: emps } = await supabase
    .from('employees')
    .select('id')
    .eq('organization_id', 'c5ab6b03-adde-47cc-a033-064f4c39b21e');

  const empIds = emps.map(e => e.id);
  console.log(`Checking foreign key references for ${empIds.length} Electra employees...`);

  // Check attendance_punches
  const { count: punchCount } = await supabase
    .from('attendance_punches')
    .select('*', { count: 'exact', head: true })
    .in('employee_id', empIds.slice(0, 100));
  console.log('attendance_punches referencing these employees:', punchCount);

  // Check attendance_daily
  const { count: dailyCount } = await supabase
    .from('attendance_daily')
    .select('*', { count: 'exact', head: true })
    .in('employee_id', empIds.slice(0, 100));
  console.log('attendance_daily referencing these employees:', dailyCount);

  // Check leave_applications
  const { count: leaveCount } = await supabase
    .from('leave_applications')
    .select('*', { count: 'exact', head: true })
    .in('employee_id', empIds.slice(0, 100));
  console.log('leave_applications referencing these employees:', leaveCount);
}

checkFks();

