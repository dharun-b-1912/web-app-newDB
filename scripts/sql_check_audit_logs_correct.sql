SELECT 
    id, organization_id, user_id, action, entity_type, entity_id, created_at
FROM public.audit_logs
ORDER BY created_at DESC
LIMIT 10;
