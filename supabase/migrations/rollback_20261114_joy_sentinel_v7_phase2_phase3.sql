-- supabase/migrations/rollback_20261114_joy_sentinel_v7_phase2_phase3.sql
-- ============================================================================
-- ROLLBACK SCRIPT: JOY SENTINEL V7 — Phases 2 & 3
-- ============================================================================
-- Rollback targets:
-- 1. Functions: fn_sentinel_evaluate_slos, fn_sentinel_get_cost_forecast, fn_sentinel_get_recurring_patterns
-- 2. Tables: sentinel_slos, sentinel_postmortems
-- NON-CASCADING: Does not affect Core or Phase 1 objects.
-- ============================================================================

DROP FUNCTION IF EXISTS public.fn_sentinel_evaluate_slos();
DROP FUNCTION IF EXISTS public.fn_sentinel_get_cost_forecast();
DROP FUNCTION IF EXISTS public.fn_sentinel_get_recurring_patterns();

DROP TABLE IF EXISTS public.sentinel_postmortems;
DROP TABLE IF EXISTS public.sentinel_slos;
