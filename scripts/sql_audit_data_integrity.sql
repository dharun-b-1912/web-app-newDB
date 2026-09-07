-- 1. Orphan employees (organization_id not in organizations)
SELECT count(*) as orphan_employees FROM public.employees e 
WHERE e.organization_id NOT IN (SELECT id FROM public.organizations);

-- 2. Duplicate employee codes per organization
SELECT organization_id, employee_code, count(*) as code_count 
FROM public.employees 
GROUP BY organization_id, employee_code 
HAVING count(*) > 1;

-- 3. Orphan salary assignments
SELECT count(*) as orphan_salaries FROM public.employee_salary_assignments esa 
WHERE esa.employee_id NOT IN (SELECT id FROM public.employees);

-- 4. Orphan shift assignments
SELECT count(*) as orphan_shifts FROM public.employee_shift_assignments esa 
WHERE esa.employee_id NOT IN (SELECT id FROM public.employees);

-- 5. Orphan leave balances
SELECT count(*) as orphan_leave_balances FROM public.leave_balances lb 
WHERE lb.employee_id NOT IN (SELECT id FROM public.employees);

-- 6. Orphan payslips
SELECT count(*) as orphan_payslips FROM public.payslips p 
WHERE p.employee_id NOT IN (SELECT id FROM public.employees);

-- 7. Orphan payroll line items
SELECT count(*) as orphan_line_items FROM public.payroll_line_items pli 
WHERE pli.payroll_run_id NOT IN (SELECT id FROM public.payroll_runs);

-- 8. Orphan employee documents
SELECT count(*) as orphan_docs FROM public.employee_documents ed 
WHERE ed.employee_id NOT IN (SELECT id FROM public.employees);

-- 9. Companies with invalid organization
SELECT count(*) as orphan_companies FROM public.companies c 
WHERE c.organization_id NOT IN (SELECT id FROM public.organizations);
