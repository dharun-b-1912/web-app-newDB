SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_active_user_employee_id', 'get_active_user_org_id', 'is_org_admin', 'is_platform_admin', 'fn_prevent_employee_field_tampering');
