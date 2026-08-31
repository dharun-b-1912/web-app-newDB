-- ============================================================================
-- JOY PeopleHR / WorkforceOS — Hard Clean Deleted Auth Accounts
-- Target Accounts:
--   1) a0000000-0000-0000-0000-000000000001 (admin@joycorporate.com)
--   2) a0000000-0000-0000-0000-000000000017 (dharun@joyglobalcorp.com)
--   3) a0000000-0000-0000-0000-000000000099 (superadmin@workforceos.com)
-- ============================================================================

DO $$
DECLARE
    target_ids_text TEXT[] := ARRAY[
        'a0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000017',
        'a0000000-0000-0000-0000-000000000099'
    ];
    target_emails TEXT[] := ARRAY[
        'admin@joycorporate.com',
        'dharun@joyglobalcorp.com',
        'superadmin@workforceos.com'
    ];
BEGIN
    -- 1. Unlink employees referencing these user accounts
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'employees' AND column_name = 'user_id') THEN
        EXECUTE 'UPDATE public.employees SET user_id = NULL WHERE user_id::text = ANY($1)' USING target_ids_text;
    END IF;

    -- 2. Clean up pairing tokens if table & column exist
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_pairing_tokens' AND column_name = 'generated_by') THEN
        EXECUTE 'UPDATE public.biometric_pairing_tokens SET generated_by = NULL WHERE generated_by::text = ANY($1)' USING target_ids_text;
    END IF;

    -- 3. Delete from public app & identity tables
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employee_auth_identities') THEN
        EXECUTE 'DELETE FROM public.employee_auth_identities WHERE auth_user_id::text = ANY($1) OR LOWER(email) = ANY($2)' USING target_ids_text, target_emails;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'app_users') THEN
        EXECUTE 'DELETE FROM public.app_users WHERE auth_user_id::text = ANY($1) OR id::text = ANY($1) OR LOWER(email) = ANY($2)' USING target_ids_text, target_emails;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_staff') THEN
        EXECUTE 'DELETE FROM public.platform_staff WHERE auth_user_id::text = ANY($1) OR LOWER(email) = ANY($2)' USING target_ids_text, target_emails;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'platform_users') THEN
        EXECUTE 'DELETE FROM public.platform_users WHERE auth_user_id::text = ANY($1) OR id::text = ANY($1) OR LOWER(email) = ANY($2)' USING target_ids_text, target_emails;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        EXECUTE 'DELETE FROM public.users WHERE id::text = ANY($1) OR LOWER(email) = ANY($2)' USING target_ids_text, target_emails;
    END IF;

    -- 4. Delete Supabase Auth internal tables (identities, sessions, MFA)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'identities') THEN
        EXECUTE 'DELETE FROM auth.identities WHERE user_id::text = ANY($1)' USING target_ids_text;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'sessions') THEN
        EXECUTE 'DELETE FROM auth.sessions WHERE user_id::text = ANY($1)' USING target_ids_text;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'mfa_factors') THEN
        EXECUTE 'DELETE FROM auth.mfa_factors WHERE user_id::text = ANY($1)' USING target_ids_text;
    END IF;

    -- 5. Delete from auth.users
    EXECUTE 'DELETE FROM auth.users WHERE id::text = ANY($1) OR LOWER(email) = ANY($2)' USING target_ids_text, target_emails;

    RAISE NOTICE 'Hard clean complete: 3 target accounts and all associated data deleted.';
END $$;
