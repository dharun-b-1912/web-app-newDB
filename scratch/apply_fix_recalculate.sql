-- Fix permissions and SECURITY DEFINER on fn_recalculate_daily_attendance and trigger function
ALTER FUNCTION public.fn_recalculate_daily_attendance(uuid, date) SECURITY DEFINER SET search_path = public, pg_temp;
GRANT EXECUTE ON FUNCTION public.fn_recalculate_daily_attendance(uuid, date) TO authenticated, service_role;

ALTER FUNCTION public.trg_fn_on_punch_recorded() SECURITY DEFINER SET search_path = public, pg_temp;
GRANT EXECUTE ON FUNCTION public.trg_fn_on_punch_recorded() TO authenticated, service_role;
