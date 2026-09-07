SELECT json_build_object(
  'orphan_employees', (SELECT count(*) FROM public.employees e WHERE e.organization_id NOT IN (SELECT id FROM public.organizations)),
  'duplicate_employee_codes', (SELECT count(*) FROM (SELECT organization_id, employee_code FROM public.employees GROUP BY organization_id, employee_code HAVING count(*) > 1) d),
  'orphan_salary_assignments', (SELECT count(*) FROM public.employee_salary_assignments esa WHERE esa.employee_id NOT IN (SELECT id FROM public.employees)),
  'orphan_shift_assignments', (SELECT count(*) FROM public.employee_shift_assignments esa WHERE esa.employee_id NOT IN (SELECT id FROM public.employees)),
  'orphan_leave_balances', (SELECT count(*) FROM public.leave_balances lb WHERE lb.employee_id NOT IN (SELECT id FROM public.employees)),
  'orphan_payslips', (SELECT count(*) FROM public.payslips p WHERE p.employee_id NOT IN (SELECT id FROM public.employees)),
  'orphan_line_items', (SELECT count(*) FROM public.payroll_line_items pli WHERE pli.payroll_run_id NOT IN (SELECT id FROM public.payroll_runs)),
  'orphan_docs', (SELECT count(*) FROM public.employee_documents ed WHERE ed.employee_id NOT IN (SELECT id FROM public.employees)),
  'orphan_companies', (SELECT count(*) FROM public.companies c WHERE c.organization_id NOT IN (SELECT id FROM public.organizations))
) as integrity_summary;
