SELECT tablename, policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN (
    'employees', 'employee_profiles', 'employee_addresses', 
    'employee_bank_details', 'employee_statutory_details', 'employee_documents',
    'attendance_daily', 'attendance_punches', 'leave_balances', 'leave_requests', 
    'employee_requests', 'payslips', 'payroll_line_items'
  )
ORDER BY tablename, policyname;
