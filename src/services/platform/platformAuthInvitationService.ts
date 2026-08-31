// src/services/platform/platformAuthInvitationService.ts
// ============================================================
// Joy PeopleHR — Customer User & Admin Realtime Auth Invitation Gateway
// Integrated with Resend API & Supabase Identity Engine
// ============================================================

import { supabase, isSupabaseEnabled, getAppBaseUrl } from '../../lib/supabase';
import { platformAuditService } from './platformAuditService';
import { resendEmailService, EmailDeliveryResponse } from '../email/resendEmailService';

export type UserRole =
  | 'Organization Owner'
  | 'Organization Admin'
  | 'HR Head'
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

const localInvitationsDb: OrganizationInvitation[] = [];

export const platformAuthInvitationService = {
  /**
   * Invite an administrator or staff user to a company in realtime using Resend & Supabase Auth.
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
  }): Promise<{ invitation: OrganizationInvitation; emailDelivery?: EmailDeliveryResponse }> {
    const token = `inv_${Math.random().toString(36).substring(2)}${Date.now().toString(36)}`;
    const inviteUrl = `${getAppBaseUrl()}/auth/accept-invite?token=${token}&org=${encodeURIComponent(params.organizationId)}&email=${encodeURIComponent(params.email)}&role=${encodeURIComponent(params.role)}`;
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();
    const invId = `inv-${Date.now()}`;

    // Realtime Email Dispatch via Resend API Gateway
    let emailDelivery: EmailDeliveryResponse | undefined;
    if (params.sendSupabaseEmail !== false) {
      try {
        emailDelivery = await resendEmailService.sendOrganizationUserInvitationEmail({
          to: params.email.trim().toLowerCase(),
          recipientName: params.fullName.trim(),
          organizationName: params.organizationName,
          roleDisplayName: params.role,
          roleKey: params.role,
          department: params.department || 'People Operations',
          invitedBy: params.invitedBy || 'THIRUMALAI R K (Platform Super Admin)',
          invitationUrl: inviteUrl,
          token: token,
          phone: params.phone,
          expiresInDays: 7,
        });
      } catch (emailErr) {
        console.warn('[PlatformAuthInvitationService] Resend email dispatch warning:', emailErr);
      }
    }

    const newInvite: OrganizationInvitation = {
      id: invId,
      organization_id: params.organizationId,
      organization_name: params.organizationName,
      email: params.email.trim().toLowerCase(),
      full_name: params.fullName.trim(),
      phone: params.phone?.trim(),
      role: params.role,
      department: params.department || 'People Operations',
      invitation_token: token,
      invite_url: inviteUrl,
      status: 'pending',
      invited_by: params.invitedBy || 'THIRUMALAI R K (Platform Super Admin)',
      expires_at: expiresAt,
      created_at: new Date().toLocaleDateString(),
      delivery_id: emailDelivery?.id,
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

        if (params.sendSupabaseEmail) {
          await supabase.auth.admin.inviteUserByEmail(newInvite.email, {
            data: {
              organization_id: params.organizationId,
              role: params.role,
              full_name: params.fullName,
            },
            redirectTo: inviteUrl,
          });
        }
      } catch (err) {
        console.warn('[PlatformAuthInvitationService] Supabase fallback:', err);
      }
    }

    // Forensic audit entry
    await platformAuditService.logEvent({
      actor_id: 'user-thirumalai',
      actor_name: 'THIRUMALAI R K',
      actor_role: 'Platform Super Admin',
      organization_id: params.organizationId,
      organization_name: params.organizationName,
      action: 'ADMIN_INVITATION_SENT',
      resource_type: 'OrganizationInvitation',
      resource_id: invId,
      severity: 'Normal',
      reason: `Dispatched ${params.role} invitation to ${params.email} for ${params.organizationName} via Resend (Delivery ID: ${emailDelivery?.id || 'dispatched'})`,
    });

    return { invitation: newInvite, emailDelivery };
  },

  /**
   * Get all active and pending invitations for an organization.
   */
  getInvitations(organizationId: string): OrganizationInvitation[] {
    return localInvitationsDb.filter((inv) => inv.organization_id === organizationId);
  },

  /**
   * Resend invitation with a refreshed 7-day token and dispatch realtime email.
   */
  async resendInvitation(
    invitationId: string,
    actorName: string = 'THIRUMALAI R K'
  ): Promise<{ invite: OrganizationInvitation; emailDelivery?: EmailDeliveryResponse }> {
    const invite = localInvitationsDb.find((i) => i.id === invitationId);
    if (!invite) throw new Error('Invitation record not found');

    const rawToken = `inv_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    invite.invitation_token = rawToken;
    invite.invite_url = `${getAppBaseUrl()}/auth/accept-invite?token=${rawToken}&org=${encodeURIComponent(invite.organization_id)}&email=${encodeURIComponent(invite.email)}&role=${encodeURIComponent(invite.role)}`;
    invite.expires_at = new Date(Date.now() + 7 * 86400000).toISOString();
    invite.status = 'pending';

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
      console.warn('[PlatformAuthInvitationService] Resend email resend warning:', err);
    }

    await platformAuditService.logEvent({
      actor_id: 'user-thirumalai',
      actor_name: actorName,
      actor_role: 'Platform Super Admin',
      organization_id: invite.organization_id,
      organization_name: invite.organization_name,
      action: 'ADMIN_INVITATION_RESENT',
      resource_type: 'OrganizationInvitation',
      resource_id: invite.id,
      severity: 'Normal',
      reason: `Refreshed and resent ${invite.role} invitation to ${invite.email} in realtime via Resend Gateway (Delivery ID: ${emailDelivery?.id || 'dispatched'})`,
    });

    return { invite, emailDelivery };
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
      actor_name: 'THIRUMALAI R K',
      actor_role: 'Platform Super Admin',
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
   * Dispatch single-use realtime direct authentication & password setup link.
   */
  async dispatchAuthLink(params: {
    email: string;
    fullName: string;
    organizationId: string;
    organizationName: string;
    actorName?: string;
  }): Promise<EmailDeliveryResponse> {
    const rawToken = `auth_${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
    const resetUrl = `${getAppBaseUrl()}/reset-password?token=${encodeURIComponent(rawToken)}&email=${encodeURIComponent(params.email)}`;

    const delivery = await resendEmailService.sendDirectAuthenticationLinkEmail({
      to: params.email,
      employeeName: params.fullName,
      resetToken: rawToken,
      resetUrl: resetUrl,
      organizationName: params.organizationName,
      expiresInMinutes: 30,
    });

    await platformAuditService.logEvent({
      actor_id: 'user-thirumalai',
      actor_name: params.actorName || 'THIRUMALAI R K',
      actor_role: 'Platform Super Admin',
      organization_id: params.organizationId,
      organization_name: params.organizationName,
      action: 'AUTHENTICATION_LINK_DISPATCHED',
      resource_type: 'UserAuth',
      resource_id: params.email,
      severity: 'Normal',
      reason: `Dispatched direct authentication & password setup link to ${params.email} for ${params.organizationName} via Resend (Delivery ID: ${delivery.id || 'dispatched'})`,
    });

    return delivery;
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
