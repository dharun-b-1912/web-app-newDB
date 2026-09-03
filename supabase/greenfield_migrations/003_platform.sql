-- ============================================================================
-- JOY PeopleHR — Greenfield Database Migration 003
-- Target Project: ysiajemrqakfngasehhi
-- Description: Platform Control Plane Core (Plans and Operators)
-- ============================================================================

-- 1. Platform Operators & Support Engineers
CREATE TABLE IF NOT EXISTS public.platform_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN' CHECK (role IN ('SUPER_ADMIN', 'BILLING_ADMIN', 'SUPPORT_LEAD', 'SECURITY_OFFICER')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_users_auth ON public.platform_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_platform_users_email ON public.platform_users(email);

-- 2. SaaS Subscription Plans Catalog
CREATE TABLE IF NOT EXISTS public.platform_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    billing_interval VARCHAR(20) NOT NULL DEFAULT 'MONTHLY' CHECK (billing_interval IN ('MONTHLY', 'QUARTERLY', 'ANNUAL')),
    base_price NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    price_per_employee NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    max_employees INTEGER NOT NULL DEFAULT 100,
    feature_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_plans_code ON public.platform_plans(code);
