const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  console.log('=== 1. CHECKING ELECTRA EMPLOYEES IN SUPABASE ===');
  const { data: emps, error } = await supabase
    .from('employees')
    .select('id, employee_code, first_name, last_name, department_id, designation_id, employment_status, doj')
    .eq('organization_id', 'c5ab6b03-adde-47cc-a033-064f4c39b21e');

  if (error) {
    console.error('Error fetching employees:', error);
    return;
  }

  console.log(`Total Electra employees in DB: ${emps.length}`);
  const statusCounts = {};
  emps.forEach(e => {
    statusCounts[e.employment_status] = (statusCounts[e.employment_status] || 0) + 1;
  });
  console.log('Employment status counts in DB:', statusCounts);

  const noDept = emps.filter(e => !e.department_id);
  console.log(`Employees with no department_id: ${noDept.length}`);

  // Fetch departments for Electra EV
  const { data: depts } = await supabase
    .from('departments')
    .select('id, name, code')
    .eq('organization_id', 'c5ab6b03-adde-47cc-a033-064f4c39b21e');
  console.log('Existing Electra departments in DB:', depts);

  // Check how many employees in each department
  const deptMap = {};
  depts.forEach(d => { deptMap[d.id] = { name: d.name, count: 0 }; });
  emps.forEach(e => {
    if (e.department_id && deptMap[e.department_id]) {
      deptMap[e.department_id].count++;
    }
  });
  console.log('Employees per department in DB:', deptMap);

  // Check raw data departments
  console.log('\n=== 2. CHECKING RAW CSVs FOR DEPARTMENTS AND BADGES ===');
  const p1 = fs.readFileSync('scripts/raw_part1.csv', 'utf8').split('\n');
  const p2 = fs.readFileSync('scripts/raw_part2.csv', 'utf8').split('\n');
  const p3 = fs.readFileSync('scripts/raw_part3.csv', 'utf8').split('\n');
  console.log(`p1 lines: ${p1.length}, p2 lines: ${p2.length}, p3 lines: ${p3.length}`);

  // Let's parse all lines and see departments
  const rawDepts = new Set();
  const rawCodes = [];
  const numericBadges = [];

  [...p1, ...p2, ...p3].forEach(line => {
    const parts = line.split(',');
    if (parts.length > 5) {
      const code = parts[1]?.trim();
      const name = parts[2]?.trim();
      const dept = parts[4]?.trim();
      if (dept) rawDepts.add(dept);
      if (code) {
        rawCodes.push({ code, name, dept });
        if (/^\d+$/.test(code) || code.startsWith('SUB') || code.toLowerCase().includes('sub')) {
          numericBadges.push({ code, name, dept });
        }
      }
    }
  });

  console.log('Distinct raw departments found:', Array.from(rawDepts));
  console.log(`Total raw numeric / sub badges found: ${numericBadges.length}`);
  console.log('Sample numeric badges:', numericBadges.slice(0, 15));
}

run();
