SELECT 
    p.proname as function_name,
    pg_get_userbyid(p.proowner) as owner,
    p.prosecdef as is_security_definer,
    p.provolatile as volatility,
    p.proconfig as config_search_path,
    p.proacl as acl,
    pg_get_function_arguments(p.oid) as arguments
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.prosecdef = true
ORDER BY p.proname;
