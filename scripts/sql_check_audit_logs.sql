SELECT 
    id, organization_id, actor_id, action, entity_type, entity_id, created_at
FROM public.audit_logs
ORDER BY created_at DESC
LIMIT 10;
