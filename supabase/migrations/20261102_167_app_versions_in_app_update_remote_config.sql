-- Migration 167: Remote App Version & In-App Update Gatekeeper Config
-- Enables dynamic remote version management, mandatory security update gates,
-- and seamless Google Play / App Store redirect links.

CREATE TABLE IF NOT EXISTS public.app_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL DEFAULT 'android', -- 'android' | 'ios'
    latest_version TEXT NOT NULL DEFAULT '1.1.9',
    latest_build_number INTEGER NOT NULL DEFAULT 30,
    min_required_version TEXT NOT NULL DEFAULT '1.1.9',
    min_required_build_number INTEGER NOT NULL DEFAULT 30,
    release_notes TEXT DEFAULT '• Security updates and ghost session purge\n• Background GPS tracking stops when on leave or clocked out\n• Live fleet radar precision upgrades',
    play_store_url TEXT DEFAULT 'https://play.google.com/store/apps/details?id=com.joypeoplehr.app',
    is_force_update BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

-- Allow public read access so unauthenticated apps on boot can check update requirements
DROP POLICY IF EXISTS "Allow public read access to app_versions" ON public.app_versions;
CREATE POLICY "Allow public read access to app_versions"
    ON public.app_versions FOR SELECT
    USING (true);

-- Allow authenticated admins to manage versions
DROP POLICY IF EXISTS "Allow admins to manage app_versions" ON public.app_versions;
CREATE POLICY "Allow admins to manage app_versions"
    ON public.app_versions FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Insert baseline configuration for Android
INSERT INTO public.app_versions (
    platform,
    latest_version,
    latest_build_number,
    min_required_version,
    min_required_build_number,
    release_notes,
    play_store_url,
    is_force_update,
    is_active
) VALUES (
    'android',
    '1.1.10',
    31,
    '1.1.10',
    31,
    '• Important Security Update: Legacy session purge\n• Automatic location tracking stopped on approved leaves\n• Enhanced fleet radar stability',
    'https://play.google.com/store/apps/details?id=com.joypeoplehr.app',
    true,
    true
) ON CONFLICT DO NOTHING;

