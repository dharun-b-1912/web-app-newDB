-- ============================================================================
-- JOY PeopleHR — Migration 191: Organization Mobile Punch Policy & Biometric Enforcement
-- Enforces Biometric Terminal Only Punch per organization (e.g. Electra EV)
-- to prevent accidental or unauthorized in-between shift mobile check-outs.
-- ============================================================================

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS mobile_punch_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_mobile_checkin BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS allow_mobile_checkout BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS attendance_mode VARCHAR(32) NOT NULL DEFAULT 'HYBRID';

-- Configure Electra EV for Biometric Only Punch
UPDATE public.organizations
SET mobile_punch_enabled = FALSE,
    allow_mobile_checkin = FALSE,
    allow_mobile_checkout = FALSE,
    attendance_mode = 'BIOMETRIC_ONLY'
WHERE id = 'c5ab6b03-adde-47cc-a033-064f4c39b21e'
   OR slug = 'electra-ev'
   OR legal_name ILIKE '%Electra%';

-- Ensure Joy Corporate Solutions remains Hybrid (mobile GPS + biometric enabled)
UPDATE public.organizations
SET mobile_punch_enabled = TRUE,
    allow_mobile_checkin = TRUE,
    allow_mobile_checkout = TRUE,
    attendance_mode = 'HYBRID'
WHERE id = '0c621892-e938-4707-9957-13534ea32c19'
   OR slug = 'joy-corporate-solutions-pvt';

-- Helper RPC for Flutter and backend services to get organization attendance policy
CREATE OR REPLACE FUNCTION public.get_organization_attendance_policy(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_res jsonb;
BEGIN
  SELECT jsonb_build_object(
    'organization_id', o.id,
    'legal_name', o.legal_name,
    'mobile_punch_enabled', COALESCE(o.mobile_punch_enabled, true),
    'allow_mobile_checkin', COALESCE(o.allow_mobile_checkin, true),
    'allow_mobile_checkout', COALESCE(o.allow_mobile_checkout, true),
    'attendance_mode', COALESCE(o.attendance_mode, 'HYBRID')
  ) INTO v_res
  FROM public.organizations o
  WHERE o.id = p_org_id;

  RETURN COALESCE(v_res, jsonb_build_object(
    'organization_id', p_org_id,
    'mobile_punch_enabled', true,
    'allow_mobile_checkin', true,
    'allow_mobile_checkout', true,
    'attendance_mode', 'HYBRID'
  ));
END;
$$;

