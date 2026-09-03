-- ============================================================
-- Joy PeopleHR — Engineering Ops Phase 5 Database Schema
-- ============================================================
-- Predictive Reliability, Baselines, Dependencies & Controlled Automation
-- Protected by Strict Row-Level Security (RLS)
-- ============================================================

-- 1. Historical Baselines Table
CREATE TABLE IF NOT EXISTS public.engineering_metric_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    normal_baseline_value NUMERIC(10,4) NOT NULL,
    current_observed_value NUMERIC(10,4) NOT NULL,
    deviation_percentage NUMERIC(10,2) NOT NULL,
    sample_count BIGINT NOT NULL DEFAULT 0,
    window_days INT NOT NULL DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'NORMAL', -- 'NORMAL', 'ELEVATED', 'ANOMALOUS', 'INSUFFICIENT_DATA'
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Predictive Risk Assessments Table
CREATE TABLE IF NOT EXISTS public.engineering_risk_predictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id TEXT NOT NULL,
    total_risk_score INT NOT NULL, -- 0 to 100
    risk_level TEXT NOT NULL, -- 'LOW', 'WATCH', 'HIGH', 'CRITICAL'
    factors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    recommendation TEXT NOT NULL,
    historical_window TEXT NOT NULL DEFAULT '30 Days',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Trend Snapshots Table
CREATE TABLE IF NOT EXISTS public.engineering_trend_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id TEXT NOT NULL,
    metric_type TEXT NOT NULL,
    velocity_rate NUMERIC(10,4) NOT NULL,
    acceleration_rate NUMERIC(10,4) NOT NULL,
    classification TEXT NOT NULL, -- 'RAPID_ACCELERATION', 'STEADY_INCREASE', 'STABLE', 'DECREASING'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Dependency Graph Nodes & Edges
CREATE TABLE IF NOT EXISTS public.dependency_graph_nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    criticality_weight NUMERIC(4,2) NOT NULL DEFAULT 1.0,
    status TEXT NOT NULL DEFAULT 'HEALTHY'
);

CREATE TABLE IF NOT EXISTS public.dependency_graph_edges (
    id TEXT PRIMARY KEY,
    source_service_id TEXT REFERENCES public.dependency_graph_nodes(id) ON DELETE CASCADE,
    target_service_id TEXT REFERENCES public.dependency_graph_nodes(id) ON DELETE CASCADE,
    relation_type TEXT NOT NULL,
    latency_impact TEXT NOT NULL
);

-- 5. Automation Actions & Policies Table
CREATE TABLE IF NOT EXISTS public.automation_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_name TEXT NOT NULL,
    category TEXT NOT NULL,
    safety_level TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'EXECUTED_AUTOMATICALLY',
    triggered_by TEXT NOT NULL,
    approved_by TEXT,
    result_message TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Only internal Engineering/DevOps/Security roles have access.
-- Customer tenants and employee accounts are strictly barred.
-- ============================================================

ALTER TABLE public.engineering_metric_baselines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engineering_risk_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.engineering_trend_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependency_graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dependency_graph_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Engineering Ops Read Only For Platform Engineers"
ON public.engineering_metric_baselines FOR SELECT
USING (
    auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'PLATFORM_ENGINEER', 'DEVOPS_SRE', 'SECURITY_OFFICER')
);

CREATE POLICY "Engineering Ops Automation Manage Policy"
ON public.automation_actions FOR ALL
USING (
    auth.jwt() ->> 'role' IN ('SUPER_ADMIN', 'PLATFORM_ENGINEER', 'DEVOPS_SRE', 'SECURITY_OFFICER')
);
