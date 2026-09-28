// src/services/platform/platformAuthInvitationService.ts
// ============================================================
// Joy PeopleHR — Customer User & Admin Realtime Auth Invitation Gateway
// Integrated with Resend API & Supabase Identity Engine
// ============================================================

import { supabase, isSupabaseEnabled, getAppBaseUrl } from '../../lib/supabase';
import { platformAuditService } from './platformAuditService';
import { resendEmailService, EmailDeliveryResponse } from '../email/resendEmailService';
import { userAuthProvisionerService } from '../auth/userAuthProvisionerService';

export type UserRole =
  | 'Organization Owner'
  | 'Organization Admin'
  | 'Company Admin'
  | 'HR Head'
  | 'Finance Head'
  | 'HR Admin'
  | 'Payroll Admin'
  | 'Attendance Admin'
  | 'Manager'
  | 'Employee';

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  organization_name: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  department: string;
  invitation_token: string;
  invite_url: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  invited_by: string;
  expires_at: string;
  created_at: string;
  accepted_at?: string;
  delivery_id?: string;
}

const INVITATION_STORAGE_KEY = 'workforce_platform_auth_invitations';

let inMemoryInvitations: OrganizationInvitation[] = [
  {
    id: 'inv-seed-jcs-admin',
    organization_id: '0944f742-f0e1-4084-8848-894ab0b57da7',
    organization_name: 'JOY CORPORATE SOLUTIONS PVT LTD',
    email: 'rameshrajajcs@gmail.com',
    full_name: 'Ramesh Raja',
    role: 'Company Admin',
    department: 'Executive Operations',
    invitation_token: 'inv_jcs_seed_token',
    invite_url: `${getAppBaseUrl()}/auth/accept-invite?token=inv_jcs_seed_token&org=0944f742-f0e1-4084-8848-894ab0b57da7&email=rameshrajajcs@gmail.com&role=Company%20Admin`,
    status: 'pending',
    invited_by: 'THIRUMALAI R K (Platform Super Admin)',
    expires_at: '2099-12-31T23:59:59.000Z',
    created_at: '2026-09-05T05:00:00.000Z',
  },
  {
    id: 'inv-seed-spear-admin',
    organization_id: '80f6721c-63c0-40ec-852c-57ddae997eee',
    organization_name: 'Spear Digital',
    email: 'info.speardigital@gmail.com',
    full_name: 'Spear Digital Admin',
    role: 'Company Admin',
    department: 'Executive Operations',
    invitation_token: 'inv_spear_seed_token',
    invite_url: `${getAppBaseUrl()}/auth/accept-invite?token=inv_spear_seed_token&org=80f6721c-63c0-40ec-852c-57ddae997eee&email=info.speardigital@gmail.com&role=Company%20Admin`,
    status: 'pending',
    invited_by: 'THIRUMALAI R K (Platform Super Admin)',
    expires_at: '2099-12-31T23:59:59.000Z',
    created_at: '2026-09-05T05:49:00.000Z',
  },
  {
    id: 'inv-vguard-admin',
    organization_id: 'org-vguard',
    organization_name: 'V-Guard Industries Ltd',
    email: 'admin@vguard.in',
    full_name: 'Mithun Chittilappilly',
    role: 'Company Admin',
    department: 'Executive Operations',
    invitation_token: 'inv_vguard_token_2026',
    invite_url: `${getAppBaseUrl()}/auth/accept-invite?token=inv_vguard_token_2026&org=org-vguard&email=admin@vguard.in&role=Company%20Admin`,
    status: 'pending',
    invited_by: 'Platform Super Admin',
    expires_at: '2099-12-31T23:59:59.000Z',
    created_at: '2026-09-18T00:00:00.000Z',
  },
];

const loadStoredInvitations = (): OrganizationInvitation[] => {
  if (typeof localStorage === 'undefined') {
    return inMemoryInvitations;
  }
  try {
    const raw = localStorage.getItem(INVITATION_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(INVITATION_STORAGE_KEY, JSON.stringify(inMemoryInvitations));
      return inMemoryInvitations;
    }
    const parsed: OrganizationInvitation[] = JSON.parse(raw);
    for (const seed of inMemoryInvitations) {
      if (!parsed.some((p) => p.email.toLowerCase() === seed.email.toLowerCase() && p.organization_id === seed.organization_id)) {
        parsed.push(seed);
      }
    }
    return parsed;
  } catch {
    return inMemoryInvitations;
  }
};

const saveStoredInvitations = (invs: OrganizationInvitation[]) => {
  inMemoryInvitations = invs;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(INVITATION_STORAGE_KEY, JSON.stringify(invs));
  } catch {}
};

let localInvitationsDb: OrganizationInvitation[] = loadStoredInvitations();

export const platformAuthInvitationService = {
  /**
   * Helper: Map invitation display role to canonical DB role code
   */
  mapRoleToCanonicalCode(role: string): string {
    const r = (role || '').trim().toUpperCase();
    if (r.includes('OWNER') || r.includes('COMPANY ADMIN') || r.includes('COMPANY_ADMIN') || r.includes('ORGANIZATION ADMIN')) {
      return 'COMPANY_ADMIN';
    }
    if (r === 'HR HEAD' || r === 'HR_HEAD') {
      return 'HR_HEAD';
    }
    if (r === 'HR ADMIN' || r === 'HR_ADMIN') {
      return 'HR_ADMIN';
    }
    if (r === 'FINANCE HEAD' || r === 'FINANCE_HEAD' || r.includes('FINANCE') || r.includes('PAYROLL')) {
      return 'FINANCE_HEAD';
    }
    if (r.includes('ATTENDANCE')) {
      return 'ATTENDANCE_ADMIN';
    }
    if (r.includes('MANAGER')) {
      return 'MANAGER';
    }
    if (r.includes('LEAD')) {
      return 'TEAM_LEAD';
    }
    if (r.includes('EMPLOYEE') || r.includes('STAFF')) {
      return 'EMPLOYEE';
    }
    return 'COMPANY_ADMIN';
  },

  /**
   * Invite an administrator or staff user to a company in realtime using Resend & Supabase Auth.
   */
  async inviteUser(params: {
    organizationId?: string;
    organization_id?: string;
    organizationName?: string;
    organization_name?: string;
    email: string;
    fullName?: string;
    full_name?: string;
    phone?: string;
    role: UserRole;
    department?: string;
    invitedBy?: string;
    invited_by?: string;
    sendSupabaseEmail?: boolean;
  }): Promise<{ invitation: OrganizationInvitation; emailDelivery?: EmailDeliveryResponse }> {
    const orgId = params.organizationId || params.organization_id || 'org-default';
    const orgName = params.organizationName || params.organization_name || 'Organization';
    const name = (params.fullName || params.full_name || 'Invited User').trim();
    const cleanEmail = (params.email || '').trim().toLowerCase();
    const inviter = params.invitedBy || params.invited_by || 'THIRUMALAI R K (Platform Super Admin)';
    const token = `inv_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    const inviteUrl = `${getAppBaseUrl()}/auth/accept-invite?token=${token}&org=${encodeURIComponent(orgId)}&email=${encodeURIComponent(cleanEmail)}&role=${encodeURIComponent(params.role)}`;
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    const invId = `inv-${Date.now()}`;

    // Realtime Email Dispatch via Resend API Gateway
    let emailDelivery: EmailDeliveryResponse | undefined;
    if (params.sendSupabaseEmail !== false) {
      try {
        emailDelivery = await resendEmailService.sendOrganizationUserInvitationEmail({
          to: cleanEmail,
          recipientName: name,
          organizationName: orgName,
          roleDisplayName: params.role,
          roleKey: params.role,
          department: params.department || 'People Operations',
          invitedBy: inviter,
          invitationUrl: inviteUrl,
          token: token,
          phone: params.phone,
          expiresInDays: 7,
        });
      } catch (emailErr) {
        console.warn('[PlatformAuthInvitationService] Resend email dispatch notice:', emailErr);
      }
    }

    const newInvite: OrganizationInvitation = {
      id: invId,
      organization_id: orgId,
      organization_name: orgName,
      email: cleanEmail,
      full_name: name,
      phone: params.phone?.trim(),
      role: params.role,
      department: params.department || 'People Operations',
      invitation_token: token,
      invite_url: inviteUrl,
      status: 'pending',
      invited_by: inviter,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      delivery_id: emailDelivery?.id,
    };

    localInvitationsDb = localInvitationsDb.filter((i) => !(i.email === cleanEmail && i.organization_id === params.organizationId && i.status === 'pending'));
    localInvitationsDb.unshift(newInvite);
    saveStoredInvitations(localInvitationsDb);

    // Automatically provision GoTrue Auth User with temporary credentials if Supabase is enabled
    if (isSupabaseEnabled) {
      try {
        const canonicalRoleCode = this.mapRoleToCanonicalCode(params.role);
        const provResult = await userAuthProvisionerService.provisionUser({
          email: cleanEmail,
          fullName: newInvite.full_name,
          roleCode: canonicalRoleCode,
          organizationId: params.organizationId,
          phone: newInvite.phone,
          department: newInvite.department,
          temporaryPassword: 'joypeoplehr',
        });
        if (provResult.userProfile?.auth_user_id) {
          await this.reconcileAuthUserWithInvitation(provResult.userProfile.auth_user_id, cleanEmail);
        }
      } catch (authErr) {
        console.warn('[PlatformAuthInvitationService] Realtime auth setup notice:', authErr);
      }
    }

    // Call Supabase if configured
    if (isSupabaseEnabled) {
      try {
        await supabase.from('organization_invitations').insert({
          id: invId,
          organization_id: params.organizationId,
          email: cleanEmail,
          full_name: newInvite.full_name,
          phone: newInvite.phone,
          role: newInvite.role,
          department: newInvite.department,
          invitation_token: token,
          status: 'pending',
          invited_by: newInvite.invited_by,
          expires_at: expiresAt,
        });
      } catch (err) {
        console.warn('[PlatformAuthInvitationService] Supabase fallback notice:', err);
      }
    }

    // Forensic audit entry
    await platformAuditService.logEvent({
      actor_id: 'user-superadmin',
      actor_name: 'Platform Super Admin',
      actor_role: 'Super Admin',
      organization_id: params.organizationId,
      organization_name: params.organizationName,
      action: 'ADMIN_INVITATION_SENT',
      resource_type: 'OrganizationInvitation',
      resource_id: invId,
      severity: 'Normal',
      reason: `Dispatched ${params.role} invitation to ${cleanEmail} for ${params.organizationName}`,
    });

    return { invitation: newInvite, emailDelivery };
  },

  /**
   * Find a valid pending invitation by email.
   */
  findPendingInvitation(email: string): OrganizationInvitation | null {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return null;

    // Refresh from localStorage cache
    localInvitationsDb = loadStoredInvitations();

    const invite = localInvitationsDb.find(
      (i) => i.email.toLowerCase() === cleanEmail && (i.status === 'pending' || i.status === 'accepted')
    );
    return invite || null;
  },

  /**
   * Reconcile authenticated Supabase user with their pending invitation.
   * Auto-provisions user_profiles and user_roles in canonical database.
   */
  async reconcileAuthUserWithInvitation(
    authUserId: string,
    email: string
  ): Promise<{ reconciled: boolean; invitation: OrganizationInvitation | null; roleCode: string; organizationId: string | null }> {
    const cleanEmail = (email || '').trim().toLowerCase();
    const invite = this.findPendingInvitation(cleanEmail);

    if (!invite) {
      return { reconciled: false, invitation: null, roleCode: '', organizationId: null };
    }

    const canonicalRoleCode = this.mapRoleToCanonicalCode(invite.role);
    const orgId = invite.organization_id;

    if (isSupabaseEnabled && authUserId) {
      try {
        // 1. Upsert / Create user_profile
        const { data: existingProf } = await supabase
          .from('user_profiles')
          .select('id, auth_user_id')
          .eq('auth_user_id', authUserId)
          .maybeSingle();

        let profileId = existingProf?.id;

        if (!profileId) {
          const { data: profByEmail } = await supabase
            .from('user_profiles')
            .select('id, auth_user_id')
            .eq('email', cleanEmail)
            .maybeSingle();

          if (profByEmail) {
            profileId = profByEmail.id;
            await supabase
              .from('user_profiles')
              .update({ auth_user_id: authUserId, organization_id: orgId, status: 'ACTIVE' })
              .eq('id', profileId);
          } else {
            const { data: newProf } = await supabase
              .from('user_profiles')
              .insert([
                {
                  auth_user_id: authUserId,
                  organization_id: orgId,
                  email: cleanEmail,
                  full_name: invite.full_name || cleanEmail.split('@')[0],
                  phone: invite.phone || null,
                  status: 'ACTIVE',
                },
              ])
              .select()
              .single();
            profileId = newProf?.id;
          }
        }

        // 2. Find or create matching canonical role in roles table
        let roleId: string | null = null;
        const { data: existingRoles } = await supabase
          .from('roles')
          .select('id')
          .eq('organization_id', orgId)
          .eq('code', canonicalRoleCode)
          .maybeSingle();

        if (existingRoles?.id) {
          roleId = existingRoles.id;
        } else {
          const roleDisplayName = invite.role || (canonicalRoleCode === 'COMPANY_ADMIN' ? 'Company Administrator' : 'HR Head');
          const { data: createdRole } = await supabase
            .from('roles')
            .insert([
              {
                organization_id: orgId,
                name: roleDisplayName,
                code: canonicalRoleCode,
                description: `Authoritative ${roleDisplayName} role for organization`,
              },
            ])
            .select()
            .single();
          roleId = createdRole?.id || null;
        }

        // 3. Link user_roles
        if (profileId && roleId) {
          const { data: existingUr } = await supabase
            .from('user_roles')
            .select('id')
            .eq('user_profile_id', profileId)
            .eq('role_id', roleId)
            .maybeSingle();

          if (!existingUr) {
            await supabase.from('user_roles').insert([
              {
                organization_id: orgId,
                user_profile_id: profileId,
                role_id: roleId,
              },
            ]);
          }
        }
      } catch (dbErr) {
        console.warn('[PlatformAuthInvitationService] Database reconciliation notice:', dbErr);
      }
    }

    // 4. Mark invitation accepted
    invite.status = 'accepted';
    invite.accepted_at = new Date().toISOString();
    saveStoredInvitations(localInvitationsDb);

    return {
      reconciled: true,
      invitation: invite,
      roleCode: canonicalRoleCode,
      organizationId: orgId,
    };
  },

  /**
   * Get all active and pending invitations for an organization.
   */
  getInvitations(organizationId: string): OrganizationInvitation[] {
    localInvitationsDb = loadStoredInvitations();
    return localInvitationsDb.filter((inv) => inv.organization_id === organizationId);
  },

  /**
   * Resend invitation with a refreshed 7-day token and dispatch realtime email.
   */
  async resendInvitation(
    invitationId: string,
    actorName: string = 'Platform Super Admin'
  ): Promise<{ invite: OrganizationInvitation; emailDelivery?: EmailDeliveryResponse }> {
    localInvitationsDb = loadStoredInvitations();
    const invite = localInvitationsDb.find((i) => i.id === invitationId);
    if (!invite) throw new Error('Invitation record not found');

    const rawToken = `inv_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    invite.invitation_token = rawToken;
    invite.invite_url = `${getAppBaseUrl()}/auth/accept-invite?token=${rawToken}&org=${encodeURIComponent(invite.organization_id)}&email=${encodeURIComponent(invite.email)}&role=${encodeURIComponent(invite.role)}`;
    invite.expires_at = new Date(Date.now() + 7 * 86400000).toISOString();
    invite.status = 'pending';
    saveStoredInvitations(localInvitationsDb);

    // Realtime email dispatch via Resend
    let emailDelivery: EmailDeliveryResponse | undefined;
    try {
      emailDelivery = await resendEmailService.sendOrganizationUserInvitationEmail({
        to: invite.email,
        recipientName: invite.full_name,
        organizationName: invite.organization_name,
        roleDisplayName: invite.role,
        roleKey: invite.role,
        department: invite.department,
        invitedBy: `${actorName} (Platform Super Admin)`,
        invitationUrl: invite.invite_url,
        token: rawToken,
        phone: invite.phone,
        expiresInDays: 7,
      });
      invite.delivery_id = emailDelivery?.id;
    } catch (err) {
      console.warn('[PlatformAuthInvitationService] Resend email resend notice:', err);
    }

    return { invite, emailDelivery };
  },

  /**
   * Revoke an invitation.
   */
  async revokeInvitation(invitationId: string): Promise<void> {
    localInvitationsDb = loadStoredInvitations();
    const invite = localInvitationsDb.find((i) => i.id === invitationId);
    if (!invite) throw new Error('Invitation record not found');

    invite.status = 'revoked';
    saveStoredInvitations(localInvitationsDb);
  },

  /**
   * Accept an invitation (Completes onboarding, password setup, and tenant association).
   */
  async acceptInvitation(token: string, password?: string, overrideInvite?: OrganizationInvitation): Promise<OrganizationInvitation> {
    localInvitationsDb = loadStoredInvitations();
    const invite = overrideInvite || localInvitationsDb.find((i) => i.invitation_token === token && i.status === 'pending');
    if (!invite) throw new Error('Invalid or expired invitation token');

    let authUserId: string | null = null;

    if (isSupabaseEnabled && password) {
      // 1. Register with Supabase GoTrue Auth
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: invite.email,
        password: password,
        options: {
          data: {
            full_name: invite.full_name,
            organization_id: invite.organization_id,
            role: invite.role,
          },
        },
      });

      if (signUpErr) {
        if (signUpErr.message?.toLowerCase().includes('already registered')) {
          try {
            const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
              email: invite.email,
              password: password,
            });
            if (signInData?.user) {
              authUserId = signInData.user.id;
            }
          } catch (signInCatch) {
            console.warn('[PlatformAuthInvitationService] Sign-in fallback notice:', signInCatch);
          }
        } else if (signUpErr.message?.toLowerCase().includes('rate limit')) {
          console.warn('[PlatformAuthInvitationService] Supabase rate limit encountered, falling back to database activation.');
          authUserId = `auth-act-${Date.now()}`;
        } else {
          console.warn('[PlatformAuthInvitationService] Supabase signUp notice:', signUpErr.message);
          authUserId = `auth-act-${Date.now()}`;
        }
      } else if (signUpData?.user) {
        authUserId = signUpData.user.id;
      }
    }

    invite.status = 'accepted';
    invite.accepted_at = new Date().toISOString();
    saveStoredInvitations(localInvitationsDb);

    if (authUserId) {
      await this.reconcileAuthUserWithInvitation(authUserId, invite.email);
    }

    return invite;
  },
};

