// supabase/functions/employee-auth-provisioner/index.ts
// ============================================================================
// Joy PeopleHR Enterprise — Secure Server-Side Identity & Auth Provisioner
// Uses SUPABASE_SERVICE_ROLE_KEY to create GoTrue Auth Users, public.user_profiles,
// and public.user_roles without exposing secrets to client applications.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';

interface ProvisionRequest {
  organization_id: string;
  email: string;
  password?: string;
  full_name: string;
  role_code: 'COMPANY_ADMIN' | 'HR_HEAD' | 'EMPLOYEE';
  employee_id?: string;
  phone?: string;
}

serve(async (req: Request) => {
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  let createdAuthUserId: string | null = null;
  let supabaseAdmin: any = null;

  try {
    const supabaseAdminUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseAdminUrl || !supabaseServiceKey) {
      throw new Error('Supabase admin service-role credentials are missing in server environment.');
    }

    supabaseAdmin = createClient(supabaseAdminUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // 1. Caller Authorization Validation
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization header.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: callerData, error: callerError } = await supabaseAdmin.auth.getUser(token);
    if (callerError || !callerData?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid or expired session token.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ProvisionRequest = await req.json();
    const {
      organization_id,
      email,
      password = 'joypeoplehr',
      full_name,
      role_code = 'EMPLOYEE',
      employee_id,
      phone,
    } = body;

    if (!organization_id || !email || !full_name) {
      return new Response(
        JSON.stringify({ error: 'organization_id, email, and full_name are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1b. Tenant and Role Scope Authorization Check
    const callerId = callerData.user.id;
    const isPlatformAdmin = callerData.user.app_metadata?.role === 'SUPER_ADMIN' ||
      callerData.user.user_metadata?.role === 'SUPER_ADMIN';

    let targetOrgId = organization_id;

    if (!isPlatformAdmin) {
      const { data: callerProfile } = await supabaseAdmin
        .from('user_profiles')
        .select(`
          id,
          organization_id,
          user_roles (
            role_id,
            roles (
              code
            )
          )
        `)
        .eq('auth_user_id', callerId)
        .maybeSingle();

      if (!callerProfile || !callerProfile.organization_id) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: Caller profile or organization not found.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const callerRoleCodes = callerProfile.user_roles?.map((ur: any) => ur.roles?.code) || [];
      const isAuthorizedAdmin = callerRoleCodes.includes('COMPANY_ADMIN') || callerRoleCodes.includes('HR_HEAD') || callerRoleCodes.includes('HR_ADMIN');

      if (!isAuthorizedAdmin) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: Insufficient privileges to provision users.' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Strictly enforce caller's tenant
      targetOrgId = callerProfile.organization_id;
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 2. Fetch or create canonical role record
    let roleRow: any = null;
    const { data: existingRole, error: roleError } = await supabaseAdmin
      .from('roles')
      .select('id, code, name')
      .eq('organization_id', targetOrgId)
      .eq('code', role_code)
      .maybeSingle();

    if (existingRole) {
      roleRow = existingRole;
    } else {
      const roleNameMap: Record<string, string> = {
        COMPANY_ADMIN: 'Company Administrator',
        HR_HEAD: 'HR Head',
        HR_ADMIN: 'HR Administrator',
        EMPLOYEE: 'Employee',
      };
      const roleDisplayName = roleNameMap[role_code] || role_code;

      const { data: newRole, error: newRoleErr } = await supabaseAdmin
        .from('roles')
        .insert([
          {
            organization_id: targetOrgId,
            name: roleDisplayName,
            code: role_code,
            description: `Authoritative ${roleDisplayName} Role`,
          },
        ])
        .select('id, code, name')
        .single();

      if (newRoleErr || !newRole) {
        throw new Error(`Failed to create canonical role "${role_code}": ${newRoleErr?.message || 'Unknown error'}`);
      }
      roleRow = newRole;
    }

    // 3. Create or reconcile real Supabase GoTrue Auth User
    let authUserRecord: any = null;

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: normalizedEmail,
      password: password || 'joypeoplehr',
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        organization_id: targetOrgId,
        role: role_code,
        must_change_password: true,
        require_password_change: true,
        employee_id: employee_id || undefined,
      },
      app_metadata: {
        organization_id: targetOrgId,
        role: role_code,
        provisioned_by: callerData.user.id,
      },
    });

    if (createError) {
      // If user already exists, check if they belong to this org
      if (createError.message?.toLowerCase().includes('already registered') || createError.message?.toLowerCase().includes('already exists')) {
        const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
        const existingAuthUser = userList?.users?.find(
          (u: any) => u.email?.toLowerCase() === normalizedEmail
        );

        if (existingAuthUser) {
          // Check existing profile organization
          const { data: existingProf } = await supabaseAdmin
            .from('user_profiles')
            .select('id, organization_id')
            .eq('auth_user_id', existingAuthUser.id)
            .maybeSingle();

          if (existingProf && existingProf.organization_id !== targetOrgId) {
            return new Response(
              JSON.stringify({ error: 'This email is already associated with another organization.' }),
              { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }

          authUserRecord = existingAuthUser;
          createdAuthUserId = existingAuthUser.id;

          // Update user metadata
          await supabaseAdmin.auth.admin.updateUserById(existingAuthUser.id, {
            user_metadata: {
              full_name: full_name.trim(),
              organization_id: targetOrgId,
              role: role_code,
              must_change_password: true,
              require_password_change: true,
              employee_id: employee_id || undefined,
            },
          });
        } else {
          throw new Error(`GoTrue Auth creation failed: ${createError.message}`);
        }
      } else {
        throw new Error(`GoTrue Auth creation failed: ${createError.message}`);
      }
    } else {
      if (!userData?.user?.id) {
        throw new Error('GoTrue failed to return a valid Auth UID.');
      }
      authUserRecord = userData.user;
      createdAuthUserId = userData.user.id;
    }

    // 4. Validate employee_id if passed
    const isEmpUuid = Boolean(employee_id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(employee_id));
    let verifiedEmployeeId: string | null = null;
    if (isEmpUuid && employee_id) {
      const { data: matchedEmp } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('id', employee_id)
        .eq('organization_id', targetOrgId)
        .maybeSingle();
      if (matchedEmp) {
        verifiedEmployeeId = matchedEmp.id;
      }
    }

    // 4b. Upsert canonical public.user_profiles record
    const { data: profileRow, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert(
        {
          auth_user_id: createdAuthUserId,
          organization_id: targetOrgId,
          employee_id: verifiedEmployeeId,
          email: normalizedEmail,
          full_name: full_name.trim(),
          phone: phone || null,
          status: 'ACTIVE',
        },
        { onConflict: 'auth_user_id,organization_id' }
      )
      .select()
      .single();

    if (profileError || !profileRow) {
      throw new Error(`Failed to persist canonical user profile: ${profileError?.message || 'Unknown error'}`);
    }

    // 5. Upsert canonical public.user_roles record
    const { error: userRoleError } = await supabaseAdmin
      .from('user_roles')
      .upsert(
        {
          organization_id: targetOrgId,
          user_profile_id: profileRow.id,
          role_id: roleRow.id,
        },
        { onConflict: 'user_profile_id,role_id' }
      );

    if (userRoleError) {
      throw new Error(`Failed to link canonical user role: ${userRoleError.message}`);
    }

    // 6. If Employee: link employees.user_id = createdAuthUserId (auth.users.id FK)
    if (verifiedEmployeeId) {
      const { error: empLinkError } = await supabaseAdmin
        .from('employees')
        .update({ user_id: createdAuthUserId })
        .eq('id', verifiedEmployeeId)
        .eq('organization_id', targetOrgId);

      if (empLinkError) {
        console.warn(`[Provisioner] Notice linking employee record ${verifiedEmployeeId}:`, empLinkError.message);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        auth_user_id: createdAuthUserId,
        user_profile_id: profileRow.id,
        role_id: roleRow.id,
        role_code: roleRow.code,
        employee_id: verifiedEmployeeId,
        message: 'Identity provisioned successfully with temporary credentials.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    // 7. Atomic Rollback on DB Linkage Failure
    if (createdAuthUserId && supabaseAdmin) {
      console.warn(`[Provisioner] DB linkage failed. Rolling back GoTrue Auth user ${createdAuthUserId}...`);
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUserId).catch((delErr: any) => {
        console.error('[Provisioner] Rollback deleteUser error:', delErr);
      });
    }

    return new Response(
      JSON.stringify({
        success: false,
        error_code: err.code || 'PROVISIONING_FAILED',
        error: err.message || 'Identity provisioning failed.',
        message: err.message || 'Identity provisioning failed.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
