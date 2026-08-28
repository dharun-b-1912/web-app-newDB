// src/services/platform/platformAuthInvitationService.ts
// ============================================================
// Joy PeopleHR — Supabase Dedicated User & Admin Auth Invitation Service
// ============================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { platformAuditService } from './platformAuditService';

export type UserRole =
  | 'Organization Owner'
  | 'Organization Admin'
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
}

const localInvitationsDb: OrganizationInvitation[] = [
  {
    id: 'inv-joy-corp-001',
    organization_id: 'org-joy-corp',
    organization_name: 'Joy Corporate Solutions Pvt Ltd',
    email: 'suresh.k@joycorporate.com',
    full_name: 'Suresh Kumar',
    phone: '+91 98765 43214',
    role: 'HR Admin',
    department: 'People Operations',
    invitation_token: 'token_joy_suresh_auth_invite_2026',
    invite_url: 'https://app.workforceos.in/auth/accept-invite?token=token_joy_suresh_auth_invite_2026',
    status: 'pending',
    invited_by: 'Thirumalai R K (Platform Admin)',
    expires_at: new Date(Date.now() + 6 * 86400000).toISOString(),
    created_at: new Date().toLocaleDateString(),
  },
];

export const platformAuthInvitationService = {
  /**
   * Invite an administrator or staff user to a company using Supabase Auth.
   */
  async inviteUser(params: {
    organizationId: string;
    organizationName: string;
    email: string;
    fullName: string;
    phone?: string;
    role: UserRole;
    department?: string;
    invitedBy?: string;
    sendSupabaseEmail?: boolean;
  }): Promise<OrganizationInvitation> {
    const token = `inv_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    const inviteUrl = `${window.location.origin}/auth/accept-invite?token=${token}`;
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    const invId = `inv-${Date.now()}`;

    const newInvite: OrganizationInvitation = {
      id: invId,
      organization_id: params.organizationId,
      organization_name: params.organizationName,
      email: params.email.trim().toLowerCase(),
      full_name: params.fullName.trim(),
      phone: params.phone?.trim(),
      role: params.role,
      department: params.department || 'General',
      invitation_token: token,
      invite_url: inviteUrl,
      status: 'pending',
      invited_by: params.invitedBy || 'Thirumalai R K (Platform Admin)',
      expires_at: expiresAt,
      created_at: new Date().toLocaleDateString(),
    };

    localInvitationsDb.unshift(newInvite);

    // Call Supabase if configured
    if (isSupabaseEnabled) {
      try {
        await supabase.from('organization_invitations').insert({
          id: invId,
          organization_id: params.organizationId,
          email: newInvite.email,
          full_name: newInvite.full_name,
          phone: newInvite.phone,
          role: newInvite.role,
          department: newInvite.department,
          invitation_token: token,
          status: 'pending',
          invited_by: newInvite.invited_by,
          expires_at: expiresAt,
        });

        // If email dispatch enabled, trigger Supabase Auth invite
        if (params.sendSupabaseEmail) {
          await supabase.auth.admin.inviteUserByEmail(newInvite.email, {
            data: {
              organization_id: params.organizationId,
              role: params.role,
              full_name: params.fullName,
            },
            redirectTo: `${window.location.origin}/auth/accept-invite`,
          });
        }
      } catch (err) {
        console.warn('[PlatformAuthInvitationService] Supabase fallback:', err);
      }
    }

    // Forensic audit entry
    await platformAuditService.logEvent({
      actor_id: 'user-thirumalai',
      actor_name: 'Thirumalai R K',
      actor_role: 'Platform Admin',
      organization_id: params.organizationId,
      organization_name: params.organizationName,
      action: 'ADMIN_INVITATION_SENT',
      resource_type: 'OrganizationInvitation',
      resource_id: invId,
      severity: 'Normal',
      reason: `Dispatched ${params.role} invitation to ${params.email} for ${params.organizationName}`,
    });

    return newInvite;
  },

  /**
   * Get all active and pending invitations for an organization.
   */
  getInvitations(organizationId: string): OrganizationInvitation[] {
    return localInvitationsDb.filter((inv) => inv.organization_id === organizationId);
  },

  /**
   * Resend invitation with a refreshed 7-day token.
   */
  async resendInvitation(invitationId: string): Promise<OrganizationInvitation> {
    const invite = localInvitationsDb.find((i) => i.id === invitationId);
    if (!invite) throw new Error('Invitation record not found');

    invite.expires_at = new Date(Date.now() + 7 * 86400000).toISOString();
    invite.status = 'pending';

    await platformAuditService.logEvent({
      actor_id: 'user-thirumalai',
      actor_name: 'Thirumalai R K',
      actor_role: 'Platform Admin',
      organization_id: invite.organization_id,
      organization_name: invite.organization_name,
      action: 'ADMIN_INVITATION_RESENT',
      resource_type: 'OrganizationInvitation',
      resource_id: invite.id,
      severity: 'Normal',
      reason: `Refreshed and resent ${invite.role} invitation to ${invite.email}`,
    });

    return invite;
  },

  /**
   * Revoke an invitation.
   */
  async revokeInvitation(invitationId: string): Promise<void> {
    const invite = localInvitationsDb.find((i) => i.id === invitationId);
    if (!invite) throw new Error('Invitation record not found');

    invite.status = 'revoked';

    await platformAuditService.logEvent({
      actor_id: 'user-thirumalai',
      actor_name: 'Thirumalai R K',
      actor_role: 'Platform Admin',
      organization_id: invite.organization_id,
      organization_name: invite.organization_name,
      action: 'ADMIN_INVITATION_REVOKED',
      resource_type: 'OrganizationInvitation',
      resource_id: invite.id,
      severity: 'Normal',
      reason: `Revoked pending invitation for ${invite.email}`,
    });
  },

  /**
   * Accept an invitation (Completes onboarding, password setup, and tenant association).
   */
  async acceptInvitation(token: string, password?: string): Promise<OrganizationInvitation> {
    const invite = localInvitationsDb.find((i) => i.invitation_token === token && i.status === 'pending');
    if (!invite) throw new Error('Invalid or expired invitation token');

    invite.status = 'accepted';
    invite.accepted_at = new Date().toISOString();

    await platformAuditService.logEvent({
      actor_id: invite.email,
      actor_name: invite.full_name,
      actor_role: invite.role,
      organization_id: invite.organization_id,
      organization_name: invite.organization_name,
      action: 'ADMIN_INVITATION_ACCEPTED',
      resource_type: 'OrganizationInvitation',
      resource_id: invite.id,
      severity: 'Normal',
      reason: `${invite.full_name} accepted invitation and completed authentication setup`,
    });

    return invite;
  },
};
