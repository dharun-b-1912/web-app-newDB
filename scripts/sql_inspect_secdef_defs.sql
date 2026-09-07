SELECT 
    p.proname,
    pg_get_functiondef(p.oid) as def
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.prosecdef = true
ORDER BY p.proname;
