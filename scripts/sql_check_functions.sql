SELECT 
    p.proname as function_name,
    p.prosecdef as is_secdef,
    p.proconfig as search_path,
    p.proacl as acl
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN (
    'is_platform_admin', 
    'is_org_admin', 
    'get_active_user_org_id', 
    'get_active_user_employee_id', 
    'current_org_id', 
    'fn_prevent_employee_field_tampering', 
    'rls_auto_enable',
    'can_access_storage_object'
  )
ORDER BY p.proname;
