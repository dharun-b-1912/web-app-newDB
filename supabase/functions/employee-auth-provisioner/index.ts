// supabase/functions/employee-auth-provisioner/index.ts
// ============================================================================
// WorkForceOS — Server-Side Trusted Employee Auth Provisioner
// Uses SUPABASE_SERVICE_ROLE_KEY to securely create Auth Users without exposing
// secret keys to client browsers or mobile applications.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProvisionRequest {
  tenant_id: string;
  employee_id: string;
  phone: string;
  email?: string;
  first_name: string;
  last_name: string;
  role?: string;
  send_activation_sms?: boolean;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdminUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseAdminUrl || !supabaseServiceKey) {
      throw new Error('Supabase admin credentials are missing in server environment.');
    }

    const supabaseAdmin = createClient(supabaseAdminUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body: ProvisionRequest = await req.json();
    const {
      tenant_id,
      employee_id,
      phone,
      email,
      first_name,
      last_name,
      role = 'Employee',
      send_activation_sms = true,
    } = body;

    if (!tenant_id || !employee_id || !phone) {
      return new Response(
        JSON.stringify({ error: 'tenant_id, employee_id, and phone are required.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Check if Supabase Auth user already exists for this phone or email
    let authUserId: string | null = null;

    // Try creating the user via Supabase Auth Admin
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      phone: phone,
      email: email || undefined,
      phone_confirm: true,
      email_confirm: true,
      user_metadata: {
        first_name,
        last_name,
        full_name: `${first_name} ${last_name}`.trim(),
        tenant_id,
        employee_id,
        role,
      },
      app_metadata: {
        tenant_id,
        employee_id,
        role,
        provisioned_by: 'workforceos-admin',
      },
    });

    if (createError) {
      // If user already exists in Supabase Auth, lookup existing UID
      if (createError.message.includes('already exists') || createError.message.includes('registered')) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const existing = listData?.users?.find(
          (u) => u.phone === phone || (email && u.email?.toLowerCase() === email.toLowerCase())
        );
        if (existing) {
          authUserId = existing.id;
        }
      } else {
        throw createError;
      }
    } else if (userData?.user) {
      authUserId = userData.user.id;
    }

    // 2. Call RPC to register/link identity in employee_auth_identities table
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      'provision_employee_auth_identity',
      {
        p_tenant_id: tenant_id,
        p_employee_id: employee_id,
        p_phone: phone,
        p_email: email || null,
        p_role: role,
        p_auth_user_id: authUserId,
      }
    );

    if (rpcError) {
      throw rpcError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        auth_user_id: authUserId,
        identity: rpcData,
        message: 'Employee authentication identity provisioned successfully.',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Failed to provision employee authentication account.',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
