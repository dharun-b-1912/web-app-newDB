SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('employees', 'employee_profiles', 'work_locations', 'attendance_daily', 'attendance_punches', 'attendance_regularizations', 'employee_work_location_assignments', 'leave_requests', 'leave_balances', 'employee_bank_details', 'employee_statutory_details', 'employee_documents', 'payslips', 'employee_requests')
ORDER BY tablename, policyname;
