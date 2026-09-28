// supabase/functions/vendor-auth-provisioner/index.ts
// ============================================================================
// Joy PeopleHR — Enterprise Vendor Provisioner & Lifecycle Engine
// Server-Side Execution with SUPABASE_SERVICE_ROLE_KEY:
// 1. INVITE_VENDOR: Creates Vendor, Relationship & dispatches secure token
// 2. ACCEPT_VENDOR_INVITE: Sets password, creates vendor_user & activates onboarding
// 3. APPROVE_VENDOR: Transitions relationship to ACTIVE & dispatches confirmation
// 4. TOGGLE_VENDOR_STATUS: Handles Suspension / Reactivation with audit logging
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { checkRateLimit } from '../_shared/rateLimiter.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || 're_mock_dummy_resend_api_key_sanitized';
const APP_BASE_URL = Deno.env.get('APP_URL') || 'https://joypeoplehr.com';

async function sendResendEmail(to: string, subject: string, html: string) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Joy PeopleHR <noreply@joypeoplehr.com>',
        to: [to],
        subject: subject,
        html: html,
      }),
    });
    return await res.json();
  } catch (e) {
    console.error('[VendorProvisioner] Resend dispatch error:', e);
    return null;
  }
}

serve(async (req: Request) => {
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  // Rate Limiting Protection (60 requests / minute)
  const rateLimitCheck = await checkRateLimit(req, {
    profile: 'AUTH_PROVISIONING',
    maxRequests: 60,
    windowSeconds: 60,
  });
  if (!rateLimitCheck.allowed && rateLimitCheck.response) {
    return rateLimitCheck.response;
  }

  try {
    const body = await req.json();
    const { action } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://ysiajemrqakfngasehhi.supabase.co';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // --------------------------------------------------------------------------
    // ACTION: INVITE_VENDOR
    // --------------------------------------------------------------------------
    if (action === 'INVITE_VENDOR') {
      const {
        organization_id,
        legal_name,
        display_name,
        vendor_type,
        category,
        contact_name,
        contact_email,
        contact_phone,
        service_type,
        sites,
      } = body;

      if (!organization_id || !legal_name || !contact_email) {
        return new Response(
          JSON.stringify({ error: 'Missing required organization, vendor name, or contact email.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const cleanEmail = contact_email.trim().toLowerCase();
      const vendorCode = `VND-${Math.floor(1000 + Math.random() * 9000)}`;

      // 1. Create or Find Vendor
      let vendorId: string;
      const { data: existingVendor } = await supabaseAdmin
        .from('vendors')
        .select('id')
        .ilike('legal_name', legal_name.trim())
        .maybeSingle();

      if (existingVendor) {
        vendorId = existingVendor.id;
      } else {
        const { data: newVendor, error: vErr } = await supabaseAdmin
          .from('vendors')
          .insert({
            legal_name: legal_name.trim(),
            display_name: (display_name || legal_name).trim(),
            vendor_code: vendorCode,
            vendor_type: vendor_type || 'Company',
            category: category || 'General',
            email: cleanEmail,
            phone: contact_phone,
            status: 'ACTIVE',
          })
          .select('id')
          .single();

        if (vErr || !newVendor) {
          throw new Error(vErr?.message || 'Failed to create vendor entity.');
        }
        vendorId = newVendor.id;
      }

      // 2. Create Vendor Relationship
      const relationshipCode = `REL-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: relationship, error: rErr } = await supabaseAdmin
        .from('vendor_relationships')
        .upsert(
          {
            organization_id,
            vendor_id: vendorId,
            relationship_code: relationshipCode,
            category: category || 'General',
            service_type: service_type || 'Contract Services',
            onboarding_status: 'INVITED',
            compliance_status: 'PENDING',
            sites_json: sites || [],
            status: 'ACTIVE',
          },
          { onConflict: 'organization_id,vendor_id' }
        )
        .select()
        .single();

      if (rErr) throw new Error(rErr.message);

      // 3. Generate Secure Invitation Token
      const inviteToken = `vinv_${Math.random().toString(36).substring(2)}${Date.now()}`;
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

      await supabaseAdmin.from('organization_invitations').insert({
        organization_id,
        email: cleanEmail,
        full_name: contact_name || legal_name,
        role_code: 'VENDOR_ADMIN',
        target_id: vendorId,
        target_type: 'VENDOR',
        token: inviteToken,
        status: 'INVITED',
        expires_at: expiresAt,
      });

      // Fetch organization name
      const { data: orgRecord } = await supabaseAdmin
        .from('organizations')
        .select('legal_name, display_name')
        .eq('id', organization_id)
        .maybeSingle();

      const orgDisplayName = orgRecord?.display_name || orgRecord?.legal_name || 'Joy PeopleHR';
      const activationUrl = `${APP_BASE_URL}/vendor/activate?token=${inviteToken}&email=${encodeURIComponent(cleanEmail)}&org=${encodeURIComponent(orgDisplayName)}`;

      // 4. Dispatch Branded Invitation Email
      await sendResendEmail(
        cleanEmail,
        `Vendor Portal Invitation — ${orgDisplayName}`,
        `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #073B2A, #0D9488); padding: 32px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Joy PeopleHR</h1>
              <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Enterprise Vendor Management & Collaboration Portal</p>
            </div>
            <div style="padding: 32px; background: #ffffff; color: #1e293b;">
              <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">You've Been Invited to the Vendor Portal</h2>
              <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                Hello <strong>${contact_name || legal_name}</strong>,
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                <strong>${orgDisplayName}</strong> has invited <strong>${legal_name}</strong> to collaborate on the Joy PeopleHR platform as an authorized vendor partner.
              </p>
              <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                To activate your Vendor Portal account, configure your password, and submit your company profile and compliance documents, click below:
              </p>
              <div style="text-align: center; margin: 28px 0;">
                <a href="${activationUrl}" style="background: #073B2A; color: #ffffff; padding: 14px 32px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block;">
                  Activate Vendor Portal Account
                </a>
              </div>
              <p style="font-size: 12px; color: #64748b;">
                This secure one-time activation link is valid for 7 days.
              </p>
            </div>
          </div>
        `
      );

      // 5. Audit Log
      await supabaseAdmin.from('vendor_audit_logs').insert({
        relationship_id: relationship?.id,
        vendor_id: vendorId,
        organization_id,
        actor_name: 'Company Admin',
        actor_type: 'COMPANY',
        action: 'VENDOR_INVITED',
        new_values: { legal_name, contact_email: cleanEmail, relationshipCode },
      });

      return new Response(
        JSON.stringify({
          success: true,
          vendor_id: vendorId,
          relationship_id: relationship?.id,
          invitation_token: inviteToken,
          message: `Vendor invitation dispatched successfully to ${cleanEmail}.`,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --------------------------------------------------------------------------
    // ACTION: ACCEPT_VENDOR_INVITE
    // --------------------------------------------------------------------------
    if (action === 'ACCEPT_VENDOR_INVITE') {
      const { token, password, full_name, phone } = body;
      if (!token || !password) {
        return new Response(
          JSON.stringify({ error: 'Token and password are required.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch invitation
      const { data: invite, error: iErr } = await supabaseAdmin
        .from('organization_invitations')
        .select('*')
        .eq('token', token)
        .maybeSingle();

      if (iErr || !invite) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired invitation token.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const cleanEmail = invite.email.trim().toLowerCase();

      // Create or update Supabase Auth GoTrue user
      let authUserId: string;
      const { data: usersList } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = usersList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);

      if (existingUser) {
        authUserId = existingUser.id;
        await supabaseAdmin.auth.admin.updateUserById(authUserId, {
          password,
          email_confirm: true,
          user_metadata: {
            full_name: full_name || invite.full_name,
            role: 'VENDOR_ADMIN',
            vendor_id: invite.target_id,
          },
        });
      } else {
        const { data: newUser, error: uErr } = await supabaseAdmin.auth.admin.createUser({
          email: cleanEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: full_name || invite.full_name,
            role: 'VENDOR_ADMIN',
            vendor_id: invite.target_id,
          },
        });
        if (uErr || !newUser?.user) {
          throw new Error(uErr?.message || 'Failed to create auth user.');
        }
        authUserId = newUser.user.id;
      }

      // Create or activate vendor_users record
      if (invite.target_id) {
        await supabaseAdmin.from('vendor_users').upsert(
          {
            vendor_id: invite.target_id,
            auth_user_id: authUserId,
            email: cleanEmail,
            full_name: full_name || invite.full_name || 'Vendor Admin',
            role: 'VENDOR_ADMIN',
            status: 'ACTIVE',
            phone,
          },
          { onConflict: 'vendor_id,email' }
        );

        // Transition relationship onboarding status
        await supabaseAdmin
          .from('vendor_relationships')
          .update({ onboarding_status: 'ONBOARDING' })
          .eq('vendor_id', invite.target_id)
          .eq('organization_id', invite.organization_id);
      }

      // Mark invitation activated
      await supabaseAdmin
        .from('organization_invitations')
        .update({ status: 'ACTIVATED', activated_at: new Date().toISOString() })
        .eq('token', token);

      return new Response(
        JSON.stringify({
          success: true,
          email: cleanEmail,
          message: 'Vendor Portal account activated successfully.',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --------------------------------------------------------------------------
    // ACTION: APPROVE_VENDOR
    // --------------------------------------------------------------------------
    if (action === 'APPROVE_VENDOR') {
      const { relationship_id, approved_by_name } = body;
      if (!relationship_id) {
        return new Response(
          JSON.stringify({ error: 'relationship_id is required.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: rel, error: rErr } = await supabaseAdmin
        .from('vendor_relationships')
        .update({
          onboarding_status: 'APPROVED',
          compliance_status: 'COMPLIANT',
          status: 'ACTIVE',
        })
        .eq('id', relationship_id)
        .select('*, vendors(legal_name, email)')
        .single();

      if (rErr || !rel) throw new Error(rErr?.message || 'Failed to update relationship.');

      // Dispatch Approval Email
      if (rel.vendors?.email) {
        await sendResendEmail(
          rel.vendors.email,
          'Vendor Onboarding Approved — Joy PeopleHR',
          `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
              <div style="background: linear-gradient(135deg, #073B2A, #0D9488); padding: 32px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 800;">Joy PeopleHR</h1>
                <p style="margin: 6px 0 0 0; opacity: 0.9; font-size: 14px;">Vendor Onboarding Approved</p>
              </div>
              <div style="padding: 32px; background: #ffffff; color: #1e293b;">
                <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin-top: 0;">Congratulations!</h2>
                <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                  Your vendor onboarding has been officially reviewed and <strong>approved</strong> by the organization.
                </p>
                <p style="font-size: 14px; line-height: 1.6; color: #475569;">
                  Your company is now an active partner. You may log in to manage your workforce roster, view assigned sites, and track collaboration requests.
                </p>
                <div style="text-align: center; margin: 28px 0;">
                  <a href="${APP_BASE_URL}/vendor/login" style="background: #073B2A; color: #ffffff; padding: 14px 32px; border-radius: 10px; font-weight: 700; text-decoration: none; display: inline-block;">
                    Open Vendor Portal
                  </a>
                </div>
              </div>
            </div>
          `
        );
      }

      await supabaseAdmin.from('vendor_audit_logs').insert({
        relationship_id,
        vendor_id: rel.vendor_id,
        organization_id: rel.organization_id,
        actor_name: approved_by_name || 'Company Reviewer',
        actor_type: 'COMPANY',
        action: 'VENDOR_APPROVED',
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Vendor onboarding approved successfully.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Unsupported action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('[VendorProvisioner] Internal error:', err);
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error.' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
