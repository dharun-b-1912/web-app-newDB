-- ============================================================================
-- Migration: 20260829_071_provision_superadmin_joypeoplehr.sql
-- Description: Provision and auto-confirm Platform SuperAdmin user in Supabase
--
-- Credentials:
--   Email: superadmin@joypeoplehr.com
--   Password: Joyson@5610
--   User ID: 069e584c-c577-4577-9890-c96c6fbdcb07
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Ensure all columns exist across historical schema versions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_staff') THEN
        ALTER TABLE public.platform_staff ADD COLUMN IF NOT EXISTS user_id UUID;
        ALTER TABLE public.platform_staff ADD COLUMN IF NOT EXISTS auth_user_id UUID;
        ALTER TABLE public.platform_staff ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '';
        ALTER TABLE public.platform_staff ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';
        ALTER TABLE public.platform_staff ADD COLUMN IF NOT EXISTS staff_code TEXT DEFAULT 'STF-ROOT';
        ALTER TABLE public.platform_staff ADD COLUMN IF NOT EXISTS job_title TEXT DEFAULT 'Platform Super Administrator';
        ALTER TABLE public.platform_staff ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'Platform Core & Infrastructure';
        ALTER TABLE public.platform_staff ADD COLUMN IF NOT EXISTS phone TEXT DEFAULT '+91 9384125278';
        ALTER TABLE public.platform_staff ADD COLUMN IF NOT EXISTS is_root_superadmin BOOLEAN DEFAULT true;
        ALTER TABLE public.platform_staff ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'SUPER_ADMIN';
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_profiles') THEN
        ALTER TABLE public.platform_profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;
        ALTER TABLE public.platform_profiles ADD COLUMN IF NOT EXISTS first_name TEXT DEFAULT '';
        ALTER TABLE public.platform_profiles ADD COLUMN IF NOT EXISTS last_name TEXT DEFAULT '';
        ALTER TABLE public.platform_profiles ADD COLUMN IF NOT EXISTS display_name TEXT DEFAULT 'Super Admin';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 2. Provision and confirm the Super Admin
DO $$
DECLARE
    v_user_id UUID := '069e584c-c577-4577-9890-c96c6fbdcb07'::uuid;
    v_email TEXT := 'superadmin@joypeoplehr.com';
    v_password TEXT := 'Joyson@5610';
    v_encrypted_password TEXT := crypt(v_password, gen_salt('bf'));
    v_user_exists BOOLEAN;
    v_org_id TEXT;
BEGIN
    -- Check if auth user exists in auth.users
    SELECT EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = v_user_id OR LOWER(email) = LOWER(v_email)
    ) INTO v_user_exists;

    -- Create or Update Supabase auth.users record
    IF v_user_exists THEN
        UPDATE auth.users
        SET 
            encrypted_password = v_encrypted_password,
            email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
            last_sign_in_at = NOW(),
            raw_app_meta_data = jsonb_build_object(
                'provider', 'email',
                'providers', ARRAY['email']::text[],
                'role', 'super_admin',
                'is_platform_admin', true
            ),
            raw_user_meta_data = jsonb_build_object(
                'full_name', 'Super Admin',
                'name', 'Super Admin',
                'role', 'superadmin',
                'platform_role', 'SUPER_ADMIN',
                'is_platform_admin', true
            ),
            updated_at = NOW()
        WHERE id = v_user_id OR LOWER(email) = LOWER(v_email);
    ELSE
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            v_user_id,
            'authenticated',
            'authenticated',
            v_email,
            v_encrypted_password,
            NOW(),
            NOW(),
            jsonb_build_object(
                'provider', 'email',
                'providers', ARRAY['email']::text[],
                'role', 'super_admin',
                'is_platform_admin', true
            ),
            jsonb_build_object(
                'full_name', 'Super Admin',
                'name', 'Super Admin',
                'role', 'superadmin',
                'platform_role', 'SUPER_ADMIN',
                'is_platform_admin', true
            ),
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        );
    END IF;

    -- Link or update auth.identities
    IF EXISTS (SELECT 1 FROM auth.identities WHERE user_id = v_user_id OR identity_data->>'email' = v_email) THEN
        UPDATE auth.identities
        SET 
            identity_data = jsonb_build_object('sub', v_user_id::text, 'email', v_email),
            last_sign_in_at = NOW(),
            updated_at = NOW()
        WHERE user_id = v_user_id OR identity_data->>'email' = v_email;
    ELSE
        INSERT INTO auth.identities (
            id,
            user_id,
            identity_data,
            provider,
            last_sign_in_at,
            created_at,
            updated_at
        ) VALUES (
            gen_random_uuid(),
            v_user_id,
            jsonb_build_object('sub', v_user_id::text, 'email', v_email),
            'email',
            NOW(),
            NOW(),
            NOW()
        );
    END IF;

    -- Upsert into public.platform_profiles
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_profiles') THEN
        INSERT INTO public.platform_profiles (
            id,
            auth_user_id,
            email,
            first_name,
            last_name,
            display_name,
            job_title,
            department,
            phone,
            is_primary_email_verified,
            created_at,
            last_profile_update_at
        ) VALUES (
            v_user_id,
            v_user_id,
            v_email,
            'Super',
            'Admin',
            'Super Admin',
            'Platform Super Administrator',
            'Platform Core & Infrastructure',
            '+91 9384125278',
            true,
            NOW(),
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            id = v_user_id,
            auth_user_id = v_user_id,
            display_name = 'Super Admin',
            job_title = 'Platform Super Administrator',
            is_primary_email_verified = true,
            last_profile_update_at = NOW();
    END IF;

    -- Upsert into public.platform_staff
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_staff') THEN
        INSERT INTO public.platform_staff (
            id,
            user_id,
            auth_user_id,
            email,
            first_name,
            last_name,
            name,
            staff_code,
            job_title,
            department,
            phone,
            role,
            status,
            is_root_superadmin,
            mfa_enabled,
            mfa_enforced,
            created_at
        ) VALUES (
            v_user_id,
            v_user_id,
            v_user_id,
            v_email,
            'Super',
            'Admin',
            'Super Admin',
            'STF-ROOT',
            'Platform Super Administrator',
            'Platform Core & Infrastructure',
            '+91 9384125278',
            'SUPER_ADMIN',
            'Active',
            true,
            false,
            false,
            NOW()
        )
        ON CONFLICT (email) DO UPDATE SET
            user_id = v_user_id,
            auth_user_id = v_user_id,
            name = 'Super Admin',
            role = 'SUPER_ADMIN',
            status = 'Active',
            is_root_superadmin = true,
            job_title = 'Platform Super Administrator',
            department = 'Platform Core & Infrastructure';
    END IF;

    -- Upsert into public.app_users (resolving valid organization_id)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_users') THEN
        -- Find existing organization or ensure default
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'organizations') THEN
            SELECT id::text INTO v_org_id FROM public.organizations ORDER BY created_at ASC LIMIT 1;
            
            IF v_org_id IS NULL THEN
                v_org_id := 'org-platform-root';
                INSERT INTO public.organizations (id, name, plan, status)
                VALUES (v_org_id, 'Joy PeopleHR Platform', 'Enterprise', 'Active')
                ON CONFLICT (id) DO NOTHING;
            END IF;
        ELSE
            v_org_id := 'org-platform-root';
        END IF;

        BEGIN
            INSERT INTO public.app_users (
                id,
                organization_id,
                email,
                name,
                role,
                status,
                created_at
            ) VALUES (
                v_user_id,
                v_org_id,
                v_email,
                'Super Admin',
                'superadmin',
                'Active',
                NOW()
            )
            ON CONFLICT (email) DO UPDATE SET
                id = v_user_id,
                organization_id = COALESCE(public.app_users.organization_id, v_org_id),
                role = 'superadmin',
                status = 'Active';
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    RAISE NOTICE 'Platform SuperAdmin (%) provisioned and auto-confirmed successfully with UUID %', v_email, v_user_id;
END $$;
