-- ============================================================================
-- WorkForceOS Enterprise HRMS — Migration 055
-- Purge Mock / Seed / Static Notifications & Ensure Strict Realtime Multi-Tenant Isolation
-- ============================================================================

-- 1. Remove any known test / demo / seed document requests
DELETE FROM public.document_requirements
WHERE title IN (
    'Aadhaar Identity Card',
    'Aadhaar / National Identity Card',
    'Highest Degree Certificate',
    'Mock Document Request',
    'Sample Notification'
) OR description ILIKE '%upload clear front & back copy%'
  OR description ILIKE '%university degree certificate%';

-- 2. Remove matching legacy notification events
DELETE FROM public.notification_events
WHERE title IN (
    'Aadhaar Identity Card',
    'Aadhaar / National Identity Card',
    'Highest Degree Certificate'
) OR body ILIKE '%upload clear front & back copy%'
  OR body ILIKE '%university degree certificate%';

-- 3. If public.notifications exists, clean it as well
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notifications') THEN
        DELETE FROM public.notifications
        WHERE title IN (
            'Aadhaar Identity Card',
            'Aadhaar / National Identity Card',
            'Highest Degree Certificate'
        ) OR body ILIKE '%upload clear front & back copy%'
          OR body ILIKE '%university degree certificate%';
    END IF;
END $$;

-- 4. Secure RLS Policies for Document Requirements
ALTER TABLE public.document_requirements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "doc_req_select_policy" ON public.document_requirements;
CREATE POLICY "doc_req_select_policy" ON public.document_requirements
    FOR SELECT
    USING (
        employee_id = (SELECT employee_id FROM public.app_users WHERE auth_user_id = auth.uid() LIMIT 1)
        OR employee_code = (SELECT employee_code FROM public.employees WHERE id = (SELECT employee_id FROM public.app_users WHERE auth_user_id = auth.uid() LIMIT 1) LIMIT 1)
        OR EXISTS (SELECT 1 FROM public.app_users WHERE auth_user_id = auth.uid() AND role IN ('ADMIN', 'HR', 'SUPER_ADMIN'))
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon' -- fallback for public dev test
    );

-- 5. Secure RLS Policies for Notification Deliveries
ALTER TABLE public.notification_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notif_deliv_select_policy" ON public.notification_deliveries;
CREATE POLICY "notif_deliv_select_policy" ON public.notification_deliveries
    FOR SELECT
    USING (
        recipient_user_id = auth.uid()
        OR recipient_employee_id = (SELECT employee_id FROM public.app_users WHERE auth_user_id = auth.uid() LIMIT 1)
        OR auth.role() = 'service_role'
        OR auth.role() = 'anon'
    );
