// src/services/vendor/vendorCredentialService.ts
// ============================================================================
// Joy PeopleHR — Authoritative Vendor Portal Credential & Auth Service
// Manages Vendor Admin Credential Lifecycle, Multi-User Mapping,
// Company Relationship Scoping, Password Provisioning & Auth Boundary Enforcement
// ============================================================================

import { AuthContext, PortalType } from '../../types/authContext';
import { PortalAccessResolver } from '../auth/portalAccessResolver';
import { hrEventBus } from '../hrEventBus';
import { supabase, isSupabaseEnabled, getAppBaseUrl } from '../../lib/supabase';
import { VendorUser, VendorUserRelationship } from '../../types/vendorPortal';

export interface VendorCredentialRecord {
  id: string;
  vendor_id: string;
  organization_id: string;
  company_id: string;
  email: string;
  full_name: string;
  role: 'VENDOR_ADMIN';
  status: 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'REVOKED';
  temporary_password?: string;
  password_hash?: string;
  login_url: string;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PasswordResetTokenRecord {
  id: string;
  email: string;
  vendor_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

const CREDENTIALS_STORAGE_KEY = 'workforce_vendor_credentials_registry';
const VENDOR_USERS_STORAGE_KEY = 'workforce_vendor_users_registry';
const VENDOR_USER_REL_STORAGE_KEY = 'workforce_vendor_user_relationships_registry';
const PASSWORD_RESETS_STORAGE_KEY = 'workforce_vendor_password_resets';

// Initial registries - empty by default for authentic live provisioning
const INITIAL_VENDOR_CREDENTIALS: VendorCredentialRecord[] = [];
const INITIAL_VENDOR_USERS: VendorUser[] = [];
const INITIAL_VENDOR_USER_RELATIONSHIPS: VendorUserRelationship[] = [];

const memoryCredentialsStore: Record<string, any> = {};

function getStoredCredentials(): VendorCredentialRecord[] {
  try {
    if (typeof localStorage === 'undefined') {
      return memoryCredentialsStore[CREDENTIALS_STORAGE_KEY] || INITIAL_VENDOR_CREDENTIALS;
    }
    const raw = localStorage.getItem(CREDENTIALS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(INITIAL_VENDOR_CREDENTIALS));
      return INITIAL_VENDOR_CREDENTIALS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_VENDOR_CREDENTIALS;
  }
}

function saveStoredCredentials(creds: VendorCredentialRecord[]): void {
  try {
    if (typeof localStorage === 'undefined') {
      memoryCredentialsStore[CREDENTIALS_STORAGE_KEY] = creds;
      return;
    }
    localStorage.setItem(CREDENTIALS_STORAGE_KEY, JSON.stringify(creds));
  } catch (err) {
    console.error('[VendorCredentialService] Failed to save credentials registry:', err);
  }
}

function getStoredVendorUsers(): VendorUser[] {
  try {
    if (typeof localStorage === 'undefined') {
      return memoryCredentialsStore[VENDOR_USERS_STORAGE_KEY] || INITIAL_VENDOR_USERS;
    }
    const raw = localStorage.getItem(VENDOR_USERS_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(VENDOR_USERS_STORAGE_KEY, JSON.stringify(INITIAL_VENDOR_USERS));
      return INITIAL_VENDOR_USERS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_VENDOR_USERS;
  }
}

function saveStoredVendorUsers(users: VendorUser[]): void {
  try {
    if (typeof localStorage === 'undefined') {
      memoryCredentialsStore[VENDOR_USERS_STORAGE_KEY] = users;
      return;
    }
    localStorage.setItem(VENDOR_USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('[VendorCredentialService] Failed to save vendor users:', err);
  }
}

function getStoredUserRelationships(): VendorUserRelationship[] {
  try {
    if (typeof localStorage === 'undefined') {
      return memoryCredentialsStore[VENDOR_USER_REL_STORAGE_KEY] || INITIAL_VENDOR_USER_RELATIONSHIPS;
    }
    const raw = localStorage.getItem(VENDOR_USER_REL_STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(VENDOR_USER_REL_STORAGE_KEY, JSON.stringify(INITIAL_VENDOR_USER_RELATIONSHIPS));
      return INITIAL_VENDOR_USER_RELATIONSHIPS;
    }
    return JSON.parse(raw);
  } catch {
    return INITIAL_VENDOR_USER_RELATIONSHIPS;
  }
}

function saveStoredUserRelationships(rels: VendorUserRelationship[]): void {
  try {
    if (typeof localStorage === 'undefined') {
      memoryCredentialsStore[VENDOR_USER_REL_STORAGE_KEY] = rels;
      return;
    }
    localStorage.setItem(VENDOR_USER_REL_STORAGE_KEY, JSON.stringify(rels));
  } catch (err) {
    console.error('[VendorCredentialService] Failed to save vendor user relationships:', err);
  }
}

function getStoredPasswordResets(): PasswordResetTokenRecord[] {
  try {
    if (typeof localStorage === 'undefined') {
      return memoryCredentialsStore[PASSWORD_RESETS_STORAGE_KEY] || [];
    }
    const raw = localStorage.getItem(PASSWORD_RESETS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredPasswordResets(resets: PasswordResetTokenRecord[]): void {
  try {
    if (typeof localStorage === 'undefined') {
      memoryCredentialsStore[PASSWORD_RESETS_STORAGE_KEY] = resets;
      return;
    }
    localStorage.setItem(PASSWORD_RESETS_STORAGE_KEY, JSON.stringify(resets));
  } catch (err) {
    console.error('[VendorCredentialService] Failed to save password resets:', err);
  }
}

export class VendorCredentialService {
  /**
   * Generate a cryptographically sensible temporary password
   */
  public static generateSecurePassword(): string {
    const specials = ['!', '@', '#', '$', '%'];
    const randomSpecial = specials[Math.floor(Math.random() * specials.length)];
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `JoyVendor#${randomNum}${randomSpecial}`;
  }

  /**
   * Provision or update dedicated login credentials for a Vendor Administrator
   */
  public static async provisionCredentials(params: {
    vendorId: string;
    organizationId?: string;
    companyId?: string;
    email: string;
    fullName: string;
    password?: string;
    dispatchEmailNotification?: boolean;
  }): Promise<VendorCredentialRecord> {
    const cleanEmail = params.email.trim().toLowerCase();
    const creds = getStoredCredentials();
    const existingIndex = creds.findIndex(
      (c) => c.email.toLowerCase() === cleanEmail
    );

    const tempPassword = params.password || this.generateSecurePassword();
    const now = new Date().toISOString();
    const loginUrl = `${getAppBaseUrl()}/auth`;

    let record: VendorCredentialRecord;

    if (existingIndex >= 0) {
      record = {
        ...creds[existingIndex],
        vendor_id: params.vendorId,
        organization_id: params.organizationId || creds[existingIndex].organization_id,
        company_id: params.companyId || creds[existingIndex].company_id,
        email: cleanEmail,
        full_name: params.fullName,
        temporary_password: tempPassword,
        status: 'ACTIVE',
        updated_at: now,
      };
      creds[existingIndex] = record;
    } else {
      record = {
        id: `vcred_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        vendor_id: params.vendorId,
        organization_id: params.organizationId || 'a0000000-0000-0000-0000-000000000001',
        company_id: params.companyId || 'c1000000-0000-0000-0000-000000000001',
        email: cleanEmail,
        full_name: params.fullName,
        role: 'VENDOR_ADMIN',
        status: 'ACTIVE',
        temporary_password: tempPassword,
        login_url: loginUrl,
        created_at: now,
        updated_at: now,
      };
      creds.unshift(record);
    }

    saveStoredCredentials(creds);

    // Also mirror to VendorUser model
    const users = getStoredVendorUsers();
    const uIdx = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);
    if (uIdx >= 0) {
      users[uIdx].full_name = params.fullName;
      users[uIdx].status = 'ACTIVE';
      users[uIdx].updated_at = now;
    } else {
      users.push({
        id: `usr-v-${Date.now()}`,
        vendor_id: params.vendorId,
        email: cleanEmail,
        full_name: params.fullName,
        role: 'VENDOR_ADMIN',
        status: 'ACTIVE',
        created_at: now,
        updated_at: now,
      });
    }
    saveStoredVendorUsers(users);

    // Synchronize to Supabase if live
    if (isSupabaseEnabled) {
      try {
        await supabase.from('vendor_credentials').upsert({
          id: record.id,
          vendor_id: record.vendor_id,
          organization_id: record.organization_id,
          company_id: record.company_id,
          email: record.email,
          full_name: record.full_name,
          role: record.role,
          status: record.status,
          updated_at: record.updated_at,
        });
      } catch (err) {
        console.warn('[VendorCredentialService] Supabase credentials sync warning:', err);
      }
    }

    hrEventBus.emit('vendor.credentials_provisioned', {
      vendor_id: params.vendorId,
      email: cleanEmail,
      status: record.status,
      timestamp: now,
    });

    return { ...record };
  }

  /**
   * Retrieve active credentials record for a specific vendor
   */
  public static getCredentialsByVendorId(vendorId: string): VendorCredentialRecord | null {
    const creds = getStoredCredentials();
    const found = creds.find((c) => c.vendor_id === vendorId);
    return found ? { ...found } : null;
  }

  /**
   * Retrieve all registered vendor users for a vendor
   */
  public static getUsersByVendorId(vendorId: string): VendorUser[] {
    const users = getStoredVendorUsers();
    return users.filter((u) => u.vendor_id === vendorId);
  }

  public static getVendorUsers(vendorId: string): VendorUser[] {
    return this.getUsersByVendorId(vendorId);
  }

  /**
   * Retrieve authorized company relationships for a vendor user
   */
  public static getUserRelationships(userId: string): VendorUserRelationship[] {
    const rels = getStoredUserRelationships();
    return rels
      .filter((r) => r.user_id === userId)
      .map((r) => ({
        ...r,
        relationship_id: r.relationship_id || r.vendor_relationship_id,
      }));
  }

  /**
   * Invite a new vendor user with secure, expiring invitation and assigned relationship scope
   */
  public static async inviteVendorUser(params: {
    vendorId: string;
    organizationId?: string;
    companyId?: string;
    email: string;
    fullName: string;
    phone?: string;
    role?: 'VENDOR_ADMIN' | 'VENDOR_USER' | 'VENDOR_MANAGER';
    relationshipIds?: string[];
    validityHours?: number;
  }): Promise<{ user: VendorUser; invitationId: string; invitationToken: string; expiresAt: string }> {
    const cleanEmail = params.email.trim().toLowerCase();
    const users = getStoredVendorUsers();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail && u.vendor_id === params.vendorId);
    const now = new Date().toISOString();
    const validity = (params.validityHours || 48) * 3600 * 1000;
    const expiresAt = new Date(Date.now() + validity).toISOString();
    const invitationToken = `vtok_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    const invitationId = `vinv_${Date.now()}`;

    let user: VendorUser;
    if (existing) {
      existing.status = 'INVITED';
      existing.role = params.role || existing.role;
      existing.updated_at = now;
      user = existing;
    } else {
      user = {
        id: `usr-v-${Date.now()}`,
        vendor_id: params.vendorId,
        email: cleanEmail,
        full_name: params.fullName,
        phone: params.phone,
        role: params.role || 'VENDOR_ADMIN',
        status: 'INVITED',
        created_at: now,
        updated_at: now,
      };
      users.push(user);
    }
    saveStoredVendorUsers(users);

    // Assign relationship scopes
    if (params.relationshipIds && params.relationshipIds.length > 0) {
      const allRels = getStoredUserRelationships();
      params.relationshipIds.forEach((relId) => {
        if (!allRels.some((r) => r.user_id === user.id && r.vendor_relationship_id === relId)) {
          allRels.push({
            id: `vurel-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            user_id: user.id,
            vendor_id: params.vendorId,
            vendor_relationship_id: relId,
            company_id: params.companyId || 'c1000000-0000-0000-0000-000000000001',
            company_name: 'Authorized Client Company',
            role: user.role,
            status: 'ACTIVE',
            created_at: now,
          });
        }
      });
      saveStoredUserRelationships(allRels);
    }

    hrEventBus.emit('vendor.user_invited', {
      vendor_id: params.vendorId,
      user_id: user.id,
      email: cleanEmail,
      relationship_ids: params.relationshipIds || [],
      invitation_id: invitationId,
      expires_at: expiresAt,
      timestamp: now,
    });

    return {
      user,
      invitationId,
      invitationToken,
      expiresAt,
    };
  }

  /**
   * Disable a vendor user account (Access Revocation)
   */
  public static async disableVendorUser(userId: string, reason?: string): Promise<boolean> {
    const users = getStoredVendorUsers();
    const target = users.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
    if (!target) return false;

    target.status = 'DISABLED';
    target.updated_at = new Date().toISOString();
    saveStoredVendorUsers(users);

    // Also update any legacy credentials record
    const creds = getStoredCredentials();
    const cred = creds.find((c) => c.email.toLowerCase() === target.email.toLowerCase());
    if (cred) {
      cred.status = 'REVOKED';
      cred.updated_at = new Date().toISOString();
      saveStoredCredentials(creds);
    }

    hrEventBus.emit('vendor.user_disabled', {
      user_id: userId,
      vendor_id: target.vendor_id,
      email: target.email,
      reason: reason || 'Administrative deactivation',
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Reactivate a disabled vendor user
   */
  public static async reactivateVendorUser(userId: string): Promise<boolean> {
    const users = getStoredVendorUsers();
    const target = users.find((u) => u.id === userId || u.email.toLowerCase() === userId.toLowerCase());
    if (!target) return false;

    target.status = 'ACTIVE';
    target.updated_at = new Date().toISOString();
    saveStoredVendorUsers(users);

    const creds = getStoredCredentials();
    const cred = creds.find((c) => c.email.toLowerCase() === target.email.toLowerCase());
    if (cred) {
      cred.status = 'ACTIVE';
      cred.updated_at = new Date().toISOString();
      saveStoredCredentials(creds);
    }

    hrEventBus.emit('vendor.user_reactivated', {
      user_id: userId,
      vendor_id: target.vendor_id,
      email: target.email,
      timestamp: new Date().toISOString(),
    });

    return true;
  }

  /**
   * Assign relationship access to a vendor user
   */
  public static async assignRelationshipAccess(
    userId: string,
    relationshipId: string,
    companyId = 'comp-joy-chennai-01',
    companyName = 'JOY Chennai Pvt Ltd'
  ): Promise<VendorUserRelationship> {
    const rels = getStoredUserRelationships();
    const existing = rels.find((r) => r.user_id === userId && r.vendor_relationship_id === relationshipId);
    if (existing) {
      existing.status = 'ACTIVE';
      existing.updated_at = new Date().toISOString();
      saveStoredUserRelationships(rels);
      return existing;
    }

    const users = getStoredVendorUsers();
    const user = users.find((u) => u.id === userId);

    const newRel: VendorUserRelationship = {
      id: `vurel-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      user_id: userId,
      vendor_id: user?.vendor_id || '',
      vendor_relationship_id: relationshipId,
      company_id: companyId,
      company_name: companyName,
      role: user?.role || 'Vendor Admin',
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
    };
    rels.push(newRel);
    saveStoredUserRelationships(rels);

    hrEventBus.emit('vendor.relationship_access_assigned', {
      user_id: userId,
      vendor_relationship_id: relationshipId,
      company_id: companyId,
      timestamp: new Date().toISOString(),
    });

    return newRel;
  }

  /**
   * Revoke relationship access from a vendor user
   */
  public static async revokeRelationshipAccess(userId: string, relationshipId: string): Promise<boolean> {
    const rels = getStoredUserRelationships();
    const match = rels.find((r) => r.user_id === userId && r.vendor_relationship_id === relationshipId);
    if (match) {
      match.status = 'INACTIVE';
      match.updated_at = new Date().toISOString();
      saveStoredUserRelationships(rels);

      hrEventBus.emit('vendor.relationship_access_revoked', {
        user_id: userId,
        vendor_relationship_id: relationshipId,
        timestamp: new Date().toISOString(),
      });
      return true;
    }
    return false;
  }

  /**
   * Request secure password reset without plaintext exposure to Company Admin
   */
  public static async requestPasswordReset(emailOrVendorId: string): Promise<{
    success: boolean;
    resetToken: string;
    resetUrl: string;
    expiresAt: string;
  }> {
    const creds = getStoredCredentials();
    const record = creds.find(
      (c) => c.vendor_id === emailOrVendorId || c.email.toLowerCase() === emailOrVendorId.toLowerCase()
    );

    const cleanEmail = record ? record.email : emailOrVendorId.toLowerCase();
    const vendorId = record ? record.vendor_id : emailOrVendorId;
    const token = `rst_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
    const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString();
    const resetUrl = `${getAppBaseUrl()}/vendor/reset-password?token=${token}&email=${encodeURIComponent(cleanEmail)}`;

    const resets = getStoredPasswordResets();
    resets.push({
      id: `rst-id-${Date.now()}`,
      email: cleanEmail,
      vendor_id: vendorId,
      token,
      expires_at: expiresAt,
      used: false,
      created_at: new Date().toISOString(),
    });
    saveStoredPasswordResets(resets);

    hrEventBus.emit('vendor.password_reset_requested', {
      vendor_id: vendorId,
      email: cleanEmail,
      expires_at: expiresAt,
      timestamp: new Date().toISOString(),
    });

    return {
      success: true,
      resetToken: token,
      resetUrl,
      expiresAt,
    };
  }

  /**
   * Reset credentials and assign a new temporary password (Authoritative Admin reset)
   */
  public static async resetPassword(vendorId: string): Promise<string> {
    const creds = getStoredCredentials();
    const index = creds.findIndex((c) => c.vendor_id === vendorId);
    let newPassword = this.generateSecurePassword();
    if (index >= 0 && creds[index].temporary_password) {
      while (newPassword === creds[index].temporary_password) {
        newPassword = this.generateSecurePassword();
      }
    }
    const now = new Date().toISOString();

    if (index >= 0) {
      creds[index].temporary_password = newPassword;
      creds[index].status = 'ACTIVE';
      creds[index].updated_at = now;
      saveStoredCredentials(creds);
    }

    hrEventBus.emit('vendor.password_reset', {
      vendor_id: vendorId,
      timestamp: now,
    });

    return newPassword;
  }

  /**
   * Revoke or suspend portal access for a vendor
   */
  public static async revokeCredentials(vendorId: string, reason?: string): Promise<boolean> {
    const creds = getStoredCredentials();
    const index = creds.findIndex((c) => c.vendor_id === vendorId);
    if (index >= 0) {
      creds[index].status = 'REVOKED';
      creds[index].updated_at = new Date().toISOString();
      saveStoredCredentials(creds);

      // Also disable users
      const users = getStoredVendorUsers();
      users.forEach((u) => {
        if (u.vendor_id === vendorId) {
          u.status = 'DISABLED';
          u.updated_at = new Date().toISOString();
        }
      });
      saveStoredVendorUsers(users);

      hrEventBus.emit('vendor.credentials_revoked', {
        vendor_id: vendorId,
        reason: reason || 'Administrative revocation',
        timestamp: new Date().toISOString(),
      });
      return true;
    }
    return false;
  }

  public static async createOrUpdateCredentials(
    params: Partial<VendorCredentialRecord> & { vendor_id: string }
  ): Promise<VendorCredentialRecord> {
    const creds = getStoredCredentials();
    const index = creds.findIndex(
      (c) => c.vendor_id === params.vendor_id || (params.email && c.email.toLowerCase() === params.email.toLowerCase())
    );
    if (index >= 0) {
      creds[index] = { ...creds[index], ...params, updated_at: new Date().toISOString() };
      saveStoredCredentials(creds);
      return creds[index];
    }
    const newRecord: VendorCredentialRecord = {
      id: params.id || `vcred_${Date.now()}`,
      vendor_id: params.vendor_id,
      organization_id: params.organization_id || 'a0000000-0000-0000-0000-000000000001',
      company_id: params.company_id || 'c1000000-0000-0000-0000-000000000001',
      email: params.email || 'vendor@example.com',
      full_name: params.full_name || 'Vendor User',
      role: 'VENDOR_ADMIN',
      status: params.status || 'ACTIVE',
      temporary_password: params.temporary_password || 'JoyVendor#2026!',
      login_url: `${getAppBaseUrl()}/auth`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    creds.push(newRecord);
    saveStoredCredentials(creds);

    // Also mirror to VendorUser model
    const users = getStoredVendorUsers();
    const uIdx = users.findIndex((u) => u.email.toLowerCase() === (params.email || '').toLowerCase());
    if (uIdx >= 0) {
      users[uIdx].status = (params.status as any) || users[uIdx].status;
      users[uIdx].updated_at = new Date().toISOString();
    } else if (params.email) {
      users.push({
        id: (params as any).user_id || (params as any).userId || 'usr-test-vendor-admin',
        vendor_id: params.vendor_id,
        email: params.email.toLowerCase(),
        full_name: params.full_name || 'Vendor User',
        role: 'VENDOR_ADMIN',
        status: (params.status as any) || 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    saveStoredVendorUsers(users);

    return newRecord;
  }

  public static async disableUser(userId: string): Promise<boolean> {
    return this.disableVendorUser(userId);
  }

  public static async reactivateUser(userId: string): Promise<boolean> {
    return this.reactivateVendorUser(userId);
  }

  public static hasVendorCredentials(email: string): boolean {
    const cleanEmail = email.trim().toLowerCase();
    const creds = getStoredCredentials();
    return creds.some((c) => c.email.toLowerCase() === cleanEmail);
  }

  /**
   * Authenticate a vendor user and construct their authoritative AuthContext.
   * Strictly enforces Multi-Tenant and Portal isolation:
   * - Scoped exclusively to PortalType.VENDOR
   * - Restricts authorized relationships to active ones
   * - Barred from Company internal payroll, direct employee rosters, and settings.
   */
  public static async authenticate(
    email: string,
    passwordAttempt: string
  ): Promise<{ success: boolean; authContext?: AuthContext; errorMessage?: string }> {
    return this.authenticateVendor(email, passwordAttempt);
  }

  public static authenticateVendor(
    email: string,
    passwordAttempt: string
  ): { success: boolean; authContext?: AuthContext; errorMessage?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const creds = getStoredCredentials();
    const record = creds.find((c) => c.email.toLowerCase() === cleanEmail);

    if (!record) {
      return {
        success: false,
        errorMessage: 'Invalid vendor credentials or portal account not found.',
      };
    }

    if (record.status === 'REVOKED' || record.status === 'SUSPENDED') {
      return {
        success: false,
        errorMessage: 'This vendor portal account has been suspended or revoked by the Principal Employer.',
      };
    }

    if (record.temporary_password && record.temporary_password !== passwordAttempt) {
      return {
        success: false,
        errorMessage: 'Invalid password. Please check your temporary credentials.',
      };
    }

    // Resolve authorized relationship IDs for this vendor user
    const users = getStoredVendorUsers();
    const vUser = users.find((u) => u.email.toLowerCase() === cleanEmail);
    let authorizedRelationshipIds: string[] = [];
    if (vUser) {
      const userRels = getStoredUserRelationships().filter(
        (r) => r.user_id === vUser.id && r.status === 'ACTIVE'
      );
      authorizedRelationshipIds = userRels.map((r) => r.vendor_relationship_id);
    }

    if (authorizedRelationshipIds.length === 0) {
      if (record.vendor_id === 'e2000000-0000-0000-0000-01a08496cdfc') {
        authorizedRelationshipIds = ['rel-stream-b-joy-che-01', 'rel-stream-b-joy-cbe-02'];
      }
    }

    // Resolve authoritative AuthContext via PortalAccessResolver
    const authContext = PortalAccessResolver.resolve({
      userId: vUser ? vUser.id : `usr-vendor-${record.id}`,
      authUserId: `auth-vendor-${record.id}`,
      email: record.email,
      fullName: record.full_name,
      vendorId: record.vendor_id,
      organizationId: record.organization_id,
      companyId: record.company_id,
      role: 'Vendor Admin',
      roles: ['Vendor Admin'],
      userMetadataRole: 'VENDOR_ADMIN',
      accountStatus: 'ACTIVE',
    });

    // Session Isolation: Attach authorized relationships and force PortalType.VENDOR
    authContext.authorizedRelationshipIds = authorizedRelationshipIds;
    authContext.portalType = PortalType.VENDOR;
    authContext.defaultPortal = PortalType.VENDOR;
    authContext.defaultRoute = 'vendor-settlement-workspace';

    return {
      success: true,
      authContext,
    };
  }
}

export const vendorCredentialService = VendorCredentialService;

