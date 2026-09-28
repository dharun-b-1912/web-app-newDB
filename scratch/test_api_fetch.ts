import { api } from '../src/services/api.ts';

async function testApi() {
  console.log('--- Testing API on Supabase ---');
  const org = await api.getOrganization();
  console.log('Organization:', org);

  const comps = await api.getCompanies();
  console.log('Companies count:', comps.length, comps[0]?.legal_name);

  const depts = await api.getDepartments();
  console.log('Departments count:', depts.length, depts.map(d => d.name));

  const desigs = await api.getDesignations();
  console.log('Designations count:', desigs.length, desigs.map(d => d.title));

  const emps = await api.getEmployees();
  console.log('Employees count:', emps.length);
  emps.forEach(e => {
    console.log(`- ${e.first_name} ${e.last_name} (${e.employee_code}) | Dept: ${e.department_name} | Desig: ${e.designation_title} | Status: ${e.status} | Phone: ${(e as any).phone || (e as any).mobile_number || '—'}`);
  });

  const syncEmps = api.getEmployeesSync();
  console.log('getEmployeesSync count:', syncEmps.length);
}

testApi().catch(console.error);
