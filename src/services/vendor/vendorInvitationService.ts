// src/services/vendor/vendorInvitationService.ts
// ============================================================================
// JOY PeopleHR — Authoritative Vendor Invitation & Activation Gateway
// Manages Company Admin -> Vendor Account Invitations, Secure Tokens & Activation
// ============================================================================

import { supabase, isSupabaseEnabled, getAppBaseUrl } from '../../lib/supabase';
import { VendorInvitation } from '../../types/vendorEcosystem';
import { hrEventBus } from '../hrEventBus';
import { VendorOnboardingLifecycleEngine } from './vendorOnboardingLifecycleEngine';

const INVITATIONS_STORAGE_KEY = 'workforce_vendor_invitations_store';
const memoryInvitationsStore: Record<string, VendorInvitation[]> = {};

function getStoredInvitations(): VendorInvitation[] {
  try {
    if (typeof localStorage === 'undefined') {
      return memoryInvitationsStore[INVITATIONS_STORAGE_KEY] || [];
    }
    const raw = localStorage.getItem(INVITATIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredInvitations(invites: VendorInvitation[]): void {
  try {
    if (typeof localStorage === 'undefined') {
      memoryInvitationsStore[INVITATIONS_STORAGE_KEY] = invites;
      return;
    }
    localStorage.setItem(INVITATIONS_STORAGE_KEY, JSON.stringify(invites));
  } catch (err) {
    console.error('[VendorInvitationService] Storage save error:', err);
  }
}

export class VendorInvitationService {
  /**
   * Generates a secure, expiring invitation for a vendor organization contact
   */
  public static async createInvitation(params: {
    vendorId: string;
    organizationId: string;
    companyId: string;
    targetEmail: string;
    targetName: string;
    targetPhone?: string;
    createdBy?: string;
    validityDays?: number;
    validityHours?: number;
    relationshipScope?: string[];
    role?: string;
  }): Promise<VendorInvitation> {
    const cleanEmail = params.targetEmail.trim().toLowerCase();
    const token = `vinv_tok_${Math.random().toString(36).substring(2, 12)}_${Date.now().toString(36)}`;
    const msToAdd = params.validityHours
      ? params.validityHours * 3600 * 1000
      : (params.validityDays || 7) * 24 * 60 * 60 * 1000;
    const expiresAt = new Date(Date.now() + msToAdd).toISOString();
    const invitationId = `vinv_${Math.random().toString(36).substring(2, 10)}`;
    const inviteUrl = `${getAppBaseUrl()}/vendor/activate?token=${token}&vendor=${params.vendorId}&org=${params.organizationId}`;

    const invitation: VendorInvitation & { relationship_scope?: string[]; role?: string } = {
      id: invitationId,
      vendor_id: params.vendorId,
      organization_id: params.organizationId,
      company_id: params.companyId,
      target_email: cleanEmail,
      target_name: params.targetName,
      target_phone: params.targetPhone,
      invitation_token: token,
      token,
      invite_url: inviteUrl,
      status: 'PENDING',
      expires_at: expiresAt,
      created_by: params.createdBy || 'Company Admin',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled) {
      try {
        await supabase.from('vendor_invitations').insert({
          id: invitation.id,
          vendor_id: invitation.vendor_id,
          organization_id: invitation.organization_id,
          company_id: invitation.company_id,
          target_email: invitation.target_email,
          target_phone: invitation.target_phone,
          target_name: invitation.target_name,
          invitation_token: invitation.invitation_token,
          status: invitation.status,
          expires_at: invitation.expires_at,
          created_by: invitation.created_by,
        });
      } catch (err) {
        console.warn('[VendorInvitationService] Supabase insert warning:', err);
      }
    }

    const all = getStoredInvitations();
    all.push(invitation);
    saveStoredInvitations(all);

    hrEventBus.emit('vendor.invited', {
      vendor_id: params.vendorId,
      organization_id: params.organizationId,
      company_id: params.companyId,
      target_email: cleanEmail,
      invitation_id: invitation.id,
      timestamp: new Date().toISOString(),
    });

    return invitation;
  }

  /**
   * Retrieves an invitation by its unique token and verifies expiration status
   */
  public static async getInvitationByToken(token: string): Promise<VendorInvitation | null> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('vendor_invitations')
          .select('*')
          .eq('invitation_token', token)
          .maybeSingle();

        if (!error && data) {
          return {
            id: data.id,
            vendor_id: data.vendor_id,
            organization_id: data.organization_id,
            company_id: data.company_id,
            target_email: data.target_email,
            target_name: data.target_name || data.target_email.split('@')[0],
            target_phone: data.target_phone,
            invitation_token: data.invitation_token,
            invite_url: `${getAppBaseUrl()}/vendor/activate?token=${data.invitation_token}`,
            status: data.status,
            expires_at: data.expires_at,
            accepted_at: data.accepted_at,
            created_by: data.created_by,
            created_at: data.created_at,
          };
        }
      } catch (err) {
        console.warn('[VendorInvitationService] Supabase token lookup warning:', err);
      }
    }

    const all = getStoredInvitations();
    const found = all.find((i) => i.invitation_token === token);
    if (!found) return null;

    // Check expiration
    if (found.status === 'PENDING' && new Date(found.expires_at).getTime() < Date.now()) {
      found.status = 'EXPIRED';
      saveStoredInvitations(all);
    }

    return found;
  }

  /**
   * Authoritatively accepts an invitation and transitions vendor account to DRAFT onboarding
   */
  public static async acceptInvitation(
    token: string,
    authUserId?: string
  ): Promise<{ success: boolean; invitation: VendorInvitation; error?: string }> {
    const invite = await this.getInvitationByToken(token);
    if (!invite) {
      return { success: false, invitation: null as any, error: 'INVITATION_NOT_FOUND: Invalid invitation token.' };
    }

    if (invite.status === 'EXPIRED' || new Date(invite.expires_at).getTime() < Date.now()) {
      return { success: false, invitation: invite, error: 'INVITATION_EXPIRED: This vendor invitation has expired.' };
    }

    if (invite.status === 'ACCEPTED') {
      return { success: true, invitation: invite };
    }

    if (invite.status === 'REVOKED') {
      return { success: false, invitation: invite, error: 'INVITATION_REVOKED: This invitation has been revoked.' };
    }

    // Mark as accepted
    invite.status = 'ACCEPTED';
    invite.accepted_at = new Date().toISOString();

    if (isSupabaseEnabled) {
      try {
        await supabase
          .from('vendor_invitations')
          .update({ status: 'ACCEPTED', accepted_at: invite.accepted_at })
          .eq('id', invite.id);

        if (authUserId) {
          await supabase
            .from('user_profiles')
            .update({ vendor_id: invite.vendor_id, role: 'Vendor Admin' })
            .eq('id', authUserId);
        }
      } catch (err) {
        console.warn('[VendorInvitationService] Supabase accept update warning:', err);
      }
    }

    const all = getStoredInvitations();
    const idx = all.findIndex((i) => i.id === invite.id);
    if (idx >= 0) {
      all[idx] = invite;
      saveStoredInvitations(all);
    }

    hrEventBus.emit('vendor.onboarding_started', {
      vendor_id: invite.vendor_id,
      organization_id: invite.organization_id,
      invitation_id: invite.id,
      auth_user_id: authUserId,
      timestamp: new Date().toISOString(),
    });

    return { success: true, invitation: invite };
  }

  /**
   * Complete vendor portal account activation:
   * Accepts invitation, stores password, activates credentials, and redirects to /vendor/dashboard
   */
  public static async activateAndSetPassword(params: {
    token: string;
    password: string;
    authUserId?: string;
  }): Promise<{ success: boolean; redirectUrl: string; error?: string }> {
    const acceptRes = await this.acceptInvitation(params.token, params.authUserId);
    if (!acceptRes.success) {
      return { success: false, redirectUrl: '', error: acceptRes.error };
    }

    const invite = acceptRes.invitation;
    // Provision / update credentials with new password
    const { VendorCredentialService } = await import('./vendorCredentialService');
    await VendorCredentialService.provisionCredentials({
      vendorId: invite.vendor_id,
      organizationId: invite.organization_id,
      companyId: invite.company_id,
      email: invite.target_email,
      fullName: invite.target_name,
      password: params.password,
    });

    hrEventBus.emit('vendor.account_activated', {
      vendor_id: invite.vendor_id,
      email: invite.target_email,
      redirect_url: '/vendor/dashboard',
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      redirectUrl: '/vendor/dashboard',
    };
  }
}

export const vendorInvitationService = VendorInvitationService;

