import { api } from '../src/services/api';

async function test() {
  const emps = await api.getEmployees();
  console.log(`Fetched ${emps.length} employees:`);
  emps.forEach(e => {
    console.log(`${e.employee_code} | ${e.display_name} | department_name: "${e.department_name}" | department: "${e.department}" | dept_id: ${e.department_id}`);
  });
}
test().catch(console.error);
