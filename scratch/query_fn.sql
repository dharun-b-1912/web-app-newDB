SELECT proname, prosecdef, prosrc 
FROM pg_proc 
WHERE proname = 'get_active_user_employee_id';
