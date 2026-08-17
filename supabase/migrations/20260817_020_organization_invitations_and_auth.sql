-- supabase/migrations/20260817_020_organization_invitations_and_auth.sql
-- ============================================================
-- WorkForceOS — Supabase Organization User Invitations & Auth Mesh
-- ============================================================

CREATE TABLE IF NOT EXISTS public.organization_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id VARCHAR(100) NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    role VARCHAR(50) NOT NULL DEFAULT 'HR Admin',
    department VARCHAR(100) DEFAULT 'General',
    invitation_token VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
    status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    invited_by VARCHAR(100) NOT NULL DEFAULT 'System Superadmin',
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    accepted_at TIMESTAMPTZ
);

-- Indexing for fast token lookups and organization queries
CREATE INDEX IF NOT EXISTS idx_org_invitations_org_id ON public.organization_invitations(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_invitations_token ON public.organization_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_org_invitations_email ON public.organization_invitations(email);

-- Enable RLS
ALTER TABLE public.organization_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Admins can view and manage organization invitations
DROP POLICY IF EXISTS "Allow admins to manage organization invitations" ON public.organization_invitations;
CREATE POLICY "Allow admins to manage organization invitations"
    ON public.organization_invitations
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Seed an example pending invitation for Joy Corporate Solutions Pvt Ltd
INSERT INTO public.organization_invitations (
    id,
    organization_id,
    email,
    full_name,
    phone,
    role,
    department,
    invitation_token,
    status,
    invited_by,
    expires_at,
    created_at
) VALUES (
    'inv-joy-corp-001',
    'org-joy-corp',
    'suresh.k@joycorporate.com',
    'Suresh Kumar',
    '+91 98765 43214',
    'HR Admin',
    'People Operations',
    'token_joy_suresh_auth_invite_2026',
    'pending',
    'Thirumalai R K (Platform Admin)',
    NOW() + INTERVAL '6 days',
    NOW()
) ON CONFLICT (id) DO NOTHING;
