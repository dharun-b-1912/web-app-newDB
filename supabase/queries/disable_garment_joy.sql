UPDATE public.organization_addon_entitlements
SET is_enabled = false, disabled_at = NOW()
WHERE organization_id = '0c621892-e938-4707-9957-13534ea32c19'
  AND addon_key = 'garment_workforce';

SELECT organization_id, addon_key, is_enabled, disabled_at 
FROM public.organization_addon_entitlements;

