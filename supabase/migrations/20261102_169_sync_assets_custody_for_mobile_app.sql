-- =========================================================================================
-- JOY PEOPLEHR — BACKEND RETROFIT: ASSET CUSTODY SYNC FOR MOBILE APP COMPATIBILITY
-- Migration: 20261102_169_sync_assets_custody_for_mobile_app.sql
-- =========================================================================================
-- Solves: Existing mobile app versions query `public.assets` directly looking for 
-- `employee_id` and `custodian_id`. By adding these columns and keeping them synced 
-- via trigger with `asset_assignments`, all installed mobile apps will display assigned 
-- assets immediately WITHOUT requiring an app store update!
-- =========================================================================================

-- 1. Add employee_id and custodian_id columns to public.assets table
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS custodian_id TEXT;

-- 2. Populate employee_id and custodian_id for currently active asset assignments
UPDATE public.assets a
SET employee_id = aa.employee_id,
    custodian_id = aa.employee_id,
    status = 'ASSIGNED',
    updated_at = NOW()
FROM public.asset_assignments aa
WHERE aa.asset_id = a.id
  AND aa.status = 'ACTIVE';

-- 3. Create automatic real-time trigger to sync assets table whenever HR assigns/returns assets
CREATE OR REPLACE FUNCTION public.fn_sync_asset_custody_on_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.status = 'ACTIVE' THEN
            UPDATE public.assets
            SET employee_id = NEW.employee_id,
                custodian_id = NEW.employee_id,
                status = 'ASSIGNED',
                updated_at = NOW()
            WHERE id = NEW.asset_id;
        ELSIF NEW.status = 'RETURNED' THEN
            UPDATE public.assets
            SET employee_id = NULL,
                custodian_id = NULL,
                status = 'AVAILABLE',
                updated_at = NOW()
            WHERE id = NEW.asset_id;
        END IF;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.assets
        SET employee_id = NULL,
            custodian_id = NULL,
            status = 'AVAILABLE',
            updated_at = NOW()
        WHERE id = OLD.asset_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_asset_custody ON public.asset_assignments;
CREATE TRIGGER trg_sync_asset_custody
AFTER INSERT OR UPDATE OR DELETE ON public.asset_assignments
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_asset_custody_on_assignment();

