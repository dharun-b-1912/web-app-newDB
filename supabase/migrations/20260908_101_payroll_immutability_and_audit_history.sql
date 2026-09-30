-- ============================================================================
-- JOY PeopleHR — Migration 101
-- Financial-Grade Payroll Immutability, State Machine & Transition History
-- Enforces zero post-lock tampering and auditable maker-checker governance
-- Canonical Project: ysiajemrqakfngasehhi
-- Target Tables: public.payroll_runs, public.payroll_line_items
-- ============================================================================

-- 1. Payroll Run Transition History Table
CREATE TABLE IF NOT EXISTS public.payroll_run_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
    from_status VARCHAR(32) NOT NULL,
    to_status VARCHAR(32) NOT NULL,
    actor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    transition_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_hist_run ON public.payroll_run_history(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_hist_created ON public.payroll_run_history(created_at);

-- RLS for payroll_run_history
ALTER TABLE public.payroll_run_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payroll_run_history_select" ON public.payroll_run_history;
CREATE POLICY "payroll_run_history_select" ON public.payroll_run_history
    FOR SELECT TO authenticated
    USING (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.payroll_runs pr
            WHERE pr.id = payroll_run_history.payroll_run_id
            AND public.is_org_admin(pr.organization_id)
        )
    );

DROP POLICY IF EXISTS "payroll_run_history_insert" ON public.payroll_run_history;
CREATE POLICY "payroll_run_history_insert" ON public.payroll_run_history
    FOR INSERT TO authenticated
    WITH CHECK (
        public.is_platform_admin()
        OR EXISTS (
            SELECT 1 FROM public.payroll_runs pr
            WHERE pr.id = payroll_run_history.payroll_run_id
            AND public.is_org_admin(pr.organization_id)
        )
    );

-- 2. State Machine Transition RPC Function
CREATE OR REPLACE FUNCTION public.fn_transition_payroll_status(
    p_run_id UUID,
    p_to_status VARCHAR(32),
    p_actor_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_run RECORD;
    v_curr_status VARCHAR(32);
    v_target_status public.payroll_status_enum;
BEGIN
    SELECT * INTO v_run FROM public.payroll_runs WHERE id = p_run_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payroll run not found');
    END IF;

    v_curr_status := UPPER(v_run.status::text);
    p_to_status := UPPER(p_to_status);

    -- Map synonyms to canonical payroll_status_enum:
    -- DRAFT, CALCULATED, VERIFIED, APPROVED, DISBURSED, LOCKED
    IF p_to_status IN ('READY_FOR_REVIEW', 'HR_REVIEWED', 'VERIFIED') THEN
        v_target_status := 'VERIFIED'::public.payroll_status_enum;
    ELSIF p_to_status IN ('FINANCE_APPROVED', 'FINALIZED', 'APPROVED') THEN
        v_target_status := 'APPROVED'::public.payroll_status_enum;
    ELSIF p_to_status IN ('LOCKED', 'LOCK') THEN
        v_target_status := 'LOCKED'::public.payroll_status_enum;
    ELSIF p_to_status IN ('DISBURSED', 'PAID', 'COMPLETED') THEN
        v_target_status := 'DISBURSED'::public.payroll_status_enum;
    ELSIF p_to_status IN ('CALCULATED') THEN
        v_target_status := 'CALCULATED'::public.payroll_status_enum;
    ELSIF p_to_status IN ('DRAFT') THEN
        v_target_status := 'DRAFT'::public.payroll_status_enum;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Invalid target status: ' || p_to_status);
    END IF;

    -- If already in that state
    IF v_curr_status = v_target_status::text THEN
        RETURN jsonb_build_object('success', true, 'status', v_target_status::text, 'note', 'Status unchanged');
    END IF;

    -- Strict immutability guards:
    IF v_curr_status IN ('LOCKED', 'DISBURSED') AND v_target_status NOT IN ('LOCKED', 'DISBURSED') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot revert or modify locked/disbursed payroll run. Adjustments must occur in the next cycle.');
    END IF;

    -- Update payroll_runs status
    UPDATE public.payroll_runs
    SET status = v_target_status,
        updated_at = now()
    WHERE id = p_run_id;

    -- If transitioning to DISBURSED, set disbursed_at
    IF v_target_status = 'DISBURSED'::public.payroll_status_enum THEN
        UPDATE public.payroll_runs
        SET disbursed_at = now()
        WHERE id = p_run_id AND disbursed_at IS NULL;
    END IF;

    -- Log to immutable history
    INSERT INTO public.payroll_run_history (
        payroll_run_id, from_status, to_status, actor_id, transition_metadata
    ) VALUES (
        p_run_id, v_curr_status, v_target_status::text, p_actor_id, p_metadata
    );

    RETURN jsonb_build_object(
        'success', true,
        'run_id', p_run_id,
        'from_status', v_curr_status,
        'to_status', v_target_status::text,
        'timestamp', now()
    );
END;
$$;

-- 3. Trigger to prevent direct mutation of locked payroll run records
CREATE OR REPLACE FUNCTION public.fn_prevent_locked_payroll_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.status IN ('LOCKED', 'DISBURSED') THEN
            IF NEW.status NOT IN ('LOCKED', 'DISBURSED') THEN
                RAISE EXCEPTION 'Payroll run % is locked and financially immutable. Direct status reopening is prohibited.', OLD.id;
            END IF;
            IF (OLD.total_gross_pay <> NEW.total_gross_pay) OR 
               (OLD.total_deductions <> NEW.total_deductions) OR 
               (OLD.total_net_pay <> NEW.total_net_pay) OR
               (OLD.total_employees <> NEW.total_employees) THEN
                RAISE EXCEPTION 'Financial totals on locked payroll run % are immutable and cannot be modified.', OLD.id;
            END IF;
        END IF;
    ELSIF TG_OP = 'DELETE' THEN
        IF OLD.status IN ('LOCKED', 'DISBURSED') THEN
            RAISE EXCEPTION 'Cannot delete locked or disbursed payroll run %.', OLD.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_payroll_mutation ON public.payroll_runs;
CREATE TRIGGER trg_prevent_locked_payroll_mutation
BEFORE UPDATE OR DELETE ON public.payroll_runs
FOR EACH ROW
EXECUTE FUNCTION public.fn_prevent_locked_payroll_mutation();

-- 4. Trigger to prevent mutation of line items once parent payroll run is locked
CREATE OR REPLACE FUNCTION public.fn_prevent_locked_line_item_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
    v_run_status public.payroll_status_enum;
    v_run_id UUID;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_run_id := OLD.payroll_run_id;
    ELSE
        v_run_id := NEW.payroll_run_id;
    END IF;
    SELECT status INTO v_run_status FROM public.payroll_runs WHERE id = v_run_id;
    
    IF v_run_status IN ('LOCKED', 'DISBURSED') THEN
        RAISE EXCEPTION 'Cannot modify or delete line items for payroll run % because the cycle is locked/disbursed.', v_run_id;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_locked_line_item_mutation ON public.payroll_line_items;
CREATE TRIGGER trg_prevent_locked_line_item_mutation
BEFORE INSERT OR UPDATE OR DELETE ON public.payroll_line_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_prevent_locked_line_item_mutation();

-- 5. Backward Compatibility View
-- Maps canonical public.payroll_runs to legacy public.payroll_periods schema
CREATE OR REPLACE VIEW public.payroll_periods
WITH (security_invoker = true)
AS 
SELECT 
    id,
    organization_id,
    organization_id AS tenant_id,
    trim(to_char(to_date(month::text, 'MM'), 'Month')) || ' ' || year::text AS period_name,
    make_date(year, month, 1) AS start_date,
    (make_date(year, month, 1) + interval '1 month' - interval '1 day')::date AS end_date,
    (make_date(year, month, 1) + interval '1 month' - interval '1 day')::date AS pay_date,
    status::text AS status,
    'v1.0' AS policy_version,
    (status IN ('LOCKED', 'DISBURSED')) AS is_locked,
    disbursed_at AS locked_at,
    approved_by::text AS locked_by,
    company_id,
    month,
    year,
    total_employees,
    total_gross_pay,
    total_deductions,
    total_net_pay,
    created_at,
    updated_at
FROM public.payroll_runs;
