SELECT 
    up.id as profile_id,
    up.auth_user_id,
    up.email,
    up.organization_id,
    e.id as employee_id,
    e.employee_code,
    e.first_name,
    e.last_name
FROM public.user_profiles up
LEFT JOIN public.employees e ON e.user_id = up.id OR up.employee_id = e.id
ORDER BY up.created_at;
