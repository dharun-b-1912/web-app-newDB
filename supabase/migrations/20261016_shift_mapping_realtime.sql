-- Migration: 20261016_shift_mapping_realtime.sql
-- Enables real-time shift mapping across multi-tenant onboarding & attendance workspace

-- 1. Ensure RLS policies on shifts table
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shifts' AND policyname = 'shifts_select_all'
  ) THEN
    CREATE POLICY shifts_select_all ON public.shifts FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'shifts' AND policyname = 'shifts_write_auth'
  ) THEN
    CREATE POLICY shifts_write_auth ON public.shifts FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. Ensure RLS policies on employee_shift_assignments table
ALTER TABLE public.employee_shift_assignments ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'employee_shift_assignments' AND policyname = 'esa_select_all'
  ) THEN
    CREATE POLICY esa_select_all ON public.employee_shift_assignments FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'employee_shift_assignments' AND policyname = 'esa_write_auth'
  ) THEN
    CREATE POLICY esa_write_auth ON public.employee_shift_assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Ensure GEN-10 shift exists (09:30 - 18:30) with 15 mins grace
INSERT INTO public.shifts (
  organization_id,
  name,
  code,
  start_time,
  end_time,
  grace_entry_minutes,
  grace_exit_minutes,
  min_half_day_hours,
  min_full_day_hours,
  is_overnight,
  is_active
)
SELECT
  '0c621892-e938-4707-9957-13534ea32c19'::uuid,
  'General Day Shift (Corporate)',
  'GEN-10',
  '09:30:00'::time,
  '18:30:00'::time,
  15,
  15,
  4,
  8,
  false,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.shifts WHERE code = 'GEN-10'
);

-- Update existing GEN-10 if already present to guarantee exact timings 09:30:00 - 18:30:00
UPDATE public.shifts
SET 
  start_time = '09:30:00',
  end_time = '18:30:00',
  name = 'General Day Shift (Corporate)',
  grace_entry_minutes = 15,
  grace_exit_minutes = 15,
  is_active = true
WHERE code = 'GEN-10';

-- 4. Map assigned shifts for employees in employee_shift_assignments
DO $$
DECLARE
  v_gen10_id UUID;
  v_gen09_id UUID;
  v_org_id UUID := '0c621892-e938-4707-9957-13534ea32c19';
  v_comp_id UUID := '2030277f-a6a1-427f-beaf-4fc677a3bae2';
BEGIN
  SELECT id INTO v_gen10_id FROM public.shifts WHERE code = 'GEN-10' LIMIT 1;
  SELECT id INTO v_gen09_id FROM public.shifts WHERE code = 'GEN-09' LIMIT 1;

  -- Shalini J (JCS-013) -> GEN-10 (09:30 - 18:30)
  IF EXISTS (SELECT 1 FROM public.employee_shift_assignments WHERE employee_id = 'fec265e6-c63e-494c-84de-949ba57728f0') THEN
    UPDATE public.employee_shift_assignments
    SET shift_id = v_gen10_id
    WHERE employee_id = 'fec265e6-c63e-494c-84de-949ba57728f0';
  ELSE
    INSERT INTO public.employee_shift_assignments (
      organization_id, company_id, employee_id, shift_id, effective_from, valid_from, weekly_offs
    ) VALUES (
      v_org_id, v_comp_id, 'fec265e6-c63e-494c-84de-949ba57728f0', v_gen10_id, '2026-01-01', '2026-01-01', ARRAY[0, 6]::integer[]
    );
  END IF;

  -- Monishraj A (JCS-026) -> GEN-10 (09:30 - 18:30)
  IF EXISTS (SELECT 1 FROM public.employee_shift_assignments WHERE employee_id = 'dbabe03c-5202-4f3e-8e88-c996e93e1258') THEN
    UPDATE public.employee_shift_assignments
    SET shift_id = v_gen10_id
    WHERE employee_id = 'dbabe03c-5202-4f3e-8e88-c996e93e1258';
  ELSE
    INSERT INTO public.employee_shift_assignments (
      organization_id, company_id, employee_id, shift_id, effective_from, valid_from, weekly_offs
    ) VALUES (
      v_org_id, v_comp_id, 'dbabe03c-5202-4f3e-8e88-c996e93e1258', v_gen10_id, '2026-01-01', '2026-01-01', ARRAY[0, 6]::integer[]
    );
  END IF;

  -- Priyanka M N (JCS-016) -> GEN-10 (09:30 - 18:30)
  IF EXISTS (SELECT 1 FROM public.employee_shift_assignments WHERE employee_id = '4779f377-6373-40c7-af01-6a472a952c5e') THEN
    UPDATE public.employee_shift_assignments
    SET shift_id = v_gen10_id
    WHERE employee_id = '4779f377-6373-40c7-af01-6a472a952c5e';
  ELSE
    INSERT INTO public.employee_shift_assignments (
      organization_id, company_id, employee_id, shift_id, effective_from, valid_from, weekly_offs
    ) VALUES (
      v_org_id, v_comp_id, '4779f377-6373-40c7-af01-6a472a952c5e', v_gen10_id, '2026-01-01', '2026-01-01', ARRAY[0, 6]::integer[]
    );
  END IF;

  -- Dharun B (JCS-017) -> GEN-09 (09:00 - 18:00)
  IF EXISTS (SELECT 1 FROM public.employee_shift_assignments WHERE employee_id = '0ce6436c-e9b4-4e0e-9102-93ea238be0df') THEN
    UPDATE public.employee_shift_assignments
    SET shift_id = v_gen09_id
    WHERE employee_id = '0ce6436c-e9b4-4e0e-9102-93ea238be0df';
  ELSE
    INSERT INTO public.employee_shift_assignments (
      organization_id, company_id, employee_id, shift_id, effective_from, valid_from, weekly_offs
    ) VALUES (
      v_org_id, v_comp_id, '0ce6436c-e9b4-4e0e-9102-93ea238be0df', v_gen09_id, '2026-01-01', '2026-01-01', ARRAY[0, 6]::integer[]
    );
  END IF;
END $$;

-- 5. Enable Supabase Realtime publication on shifts and employee_shift_assignments
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts;
  EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication
    NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_shift_assignments;
  EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication
    NULL;
  END;
END $$;
