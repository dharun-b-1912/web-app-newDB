-- ============================================================================
-- Migration 183: Universal RLS for All FaceAttend Module Tables
-- ============================================================================
-- Unlocks read and sync access for faceattend_templates, faceattend_consents,
-- faceattend_verification_attempts, faceattend_exception_reviews, and related tables
-- so that both production (app.joypeoplehr.com) and localhost seamlessly access
-- the live Supabase PostgreSQL backend without RLS drops or browser session discrepancies.
-- ============================================================================

-- 1. faceattend_templates
DROP POLICY IF EXISTS "faceattend_templates_select" ON public.faceattend_templates;
DROP POLICY IF EXISTS "faceattend_templates_select_v2" ON public.faceattend_templates;
DROP POLICY IF EXISTS "faceattend_templates_all" ON public.faceattend_templates;

CREATE POLICY "faceattend_templates_select_v2" ON public.faceattend_templates
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "faceattend_templates_all" ON public.faceattend_templates
FOR ALL TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 2. faceattend_consents
DROP POLICY IF EXISTS "faceattend_consents_select" ON public.faceattend_consents;
DROP POLICY IF EXISTS "faceattend_consents_select_v2" ON public.faceattend_consents;
DROP POLICY IF EXISTS "faceattend_consents_all" ON public.faceattend_consents;

CREATE POLICY "faceattend_consents_select_v2" ON public.faceattend_consents
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "faceattend_consents_all" ON public.faceattend_consents
FOR ALL TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 3. faceattend_verification_attempts
DROP POLICY IF EXISTS "faceattend_attempts_select" ON public.faceattend_verification_attempts;
DROP POLICY IF EXISTS "faceattend_attempts_select_v2" ON public.faceattend_verification_attempts;
DROP POLICY IF EXISTS "faceattend_attempts_all" ON public.faceattend_verification_attempts;

CREATE POLICY "faceattend_attempts_select_v2" ON public.faceattend_verification_attempts
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "faceattend_attempts_all" ON public.faceattend_verification_attempts
FOR ALL TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 4. faceattend_exception_reviews
DROP POLICY IF EXISTS "faceattend_exceptions_select" ON public.faceattend_exception_reviews;
DROP POLICY IF EXISTS "faceattend_exceptions_select_v2" ON public.faceattend_exception_reviews;
DROP POLICY IF EXISTS "faceattend_exceptions_all" ON public.faceattend_exception_reviews;

CREATE POLICY "faceattend_exceptions_select_v2" ON public.faceattend_exception_reviews
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "faceattend_exceptions_all" ON public.faceattend_exception_reviews
FOR ALL TO authenticated, anon
USING (true)
WITH CHECK (true);

-- 5. faceattend_subscriptions & billing_snapshots
DROP POLICY IF EXISTS "faceattend_subscriptions_select" ON public.faceattend_subscriptions;
DROP POLICY IF EXISTS "faceattend_subscriptions_select_v2" ON public.faceattend_subscriptions;
DROP POLICY IF EXISTS "faceattend_subscriptions_all" ON public.faceattend_subscriptions;

CREATE POLICY "faceattend_subscriptions_select_v2" ON public.faceattend_subscriptions
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "faceattend_subscriptions_all" ON public.faceattend_subscriptions
FOR ALL TO authenticated, anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "faceattend_billing_select" ON public.faceattend_billing_snapshots;
DROP POLICY IF EXISTS "faceattend_billing_select_v2" ON public.faceattend_billing_snapshots;
DROP POLICY IF EXISTS "faceattend_billing_all" ON public.faceattend_billing_snapshots;

CREATE POLICY "faceattend_billing_select_v2" ON public.faceattend_billing_snapshots
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "faceattend_billing_all" ON public.faceattend_billing_snapshots
FOR ALL TO authenticated, anon
USING (true)
WITH CHECK (true);
