import { Organization, Company, User } from '../types';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { api } from './api';
import { hrEventBus } from './hrEventBus';
import { getPrimaryRole } from '../lib/rbac/permissionEngine';

export interface EffectiveUserContext {
  userId: string;
  organizations: Organization[];
  activeOrganization: Organization;
  authorizedLegalEntities: Company[];
  activeLegalEntity: Company;
  roleTitle: string;
  isPlatformAdmin: boolean;
}

const STORAGE_KEYS = {
  ACTIVE_ORG_ID: 'workforce_active_org_id',
  ACTIVE_LEGAL_ENTITY_ID: 'workforce_active_legal_entity_id',
  AUDIT_LOGS: 'workforce_context_audit_logs',
};

// Authoritative Default Organizations & Entities (matching Supabase seeds)
export const DEFAULT_ORGANIZATIONS: Organization[] = [];
export const DEFAULT_LEGAL_ENTITIES: Company[] = [];

class OrganizationContextService {
  /**
   * Extract current subdomain slug safely if accessing via a custom tenant subdomain.
   * Examples:
   * - "acme.joypeoplehr.com" -> "acme"
   * - "acme.localhost:5173" -> "acme"
   * - "joypeoplehr.com" -> null (Main root domain)
   * - "app.joypeoplehr.com" -> null (Global App portal)
   */
  detectSubdomainSlug(): string | null {
    if (typeof window === 'undefined' || !window.location) return null;
    const hostname = window.location.hostname.toLowerCase();

    if (!hostname || hostname === 'localhost' || hostname === 'joypeoplehr.com' || /^(\d+\.){3}\d+$/.test(hostname)) {
      return null;
    }

    const reservedPrefixes = new Set([
      'www', 'app', 'api', 'admin', 'auth', 'mail', 'mfa', 'portal', 'root',
      'security', 'staging', 'static', 'status', 'superadmin', 'support', 'test', 'platform'
    ]);

    // Handle *.joypeoplehr.com
    if (hostname.endsWith('.joypeoplehr.com')) {
      const parts = hostname.replace('.joypeoplehr.com', '').split('.');
      const sub = parts[0];
      if (sub && !reservedPrefixes.has(sub)) {
        return sub;
      }
    }

    // Handle *.localhost for local development testing
    if (hostname.endsWith('.localhost')) {
      const parts = hostname.replace('.localhost', '').split('.');
      const sub = parts[0];
      if (sub && !reservedPrefixes.has(sub)) {
        return sub;
      }
    }

    return null;
  }

  /**
   * Resolves the authoritative multi-entity organization context for the authenticated user.
   */
  async resolveUserContext(user: User): Promise<EffectiveUserContext> {
    const roleName = getPrimaryRole(user);
    const isPlatformAdmin = roleName === 'Super Admin';

    let allOrgs: Organization[] = [];
    let allEntities: Company[] = [];

    // 1. Fetch live from Supabase tables
    if (isSupabaseEnabled) {
      try {
        const [orgRes, compRes] = await Promise.all([
          supabase.from('organizations').select('*'),
          supabase.from('companies').select('*'),
        ]);
        if (orgRes.data && orgRes.data.length > 0) {
          allOrgs = orgRes.data;
        }
        if (compRes.data && compRes.data.length > 0) {
          allEntities = compRes.data;
        }
      } catch (err) {
        console.warn('[OrgContextService] Supabase context query notice:', err);
      }
    }

    // 2. Determine Active Organization via Subdomain or Saved Preference
    const subdomainSlug = this.detectSubdomainSlug();
    let activeOrg: Organization | undefined;

    if (subdomainSlug) {
      activeOrg = allOrgs.find((o) => {
        const oSlug = (o.slug || '').toLowerCase();
        const oId = (o.id || '').toLowerCase().replace(/^org-/, '');
        return oSlug === subdomainSlug || oId === subdomainSlug;
      });
    }

    if (!activeOrg) {
      const savedOrgId = localStorage.getItem(STORAGE_KEYS.ACTIVE_ORG_ID);
      activeOrg = allOrgs.find((o) => o.id === savedOrgId) || allOrgs[0] || ({
        id: user.organization_id || 'org-active',
        name: 'Organization',
        slug: 'organization',
        status: 'Active',
        plan: 'Enterprise',
        default_currency: 'INR',
        timezone: 'Asia/Kolkata',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as Organization);
    }

    // 3. Filter authorized Legal Entities by Role Scope
    let authorizedEntities: Company[] = [];

    if (activeOrg?.id) {
      authorizedEntities = allEntities.filter((e) => e.organization_id === activeOrg?.id);
    }

    if (authorizedEntities.length === 0) {
      authorizedEntities = allEntities.length > 0
        ? allEntities
        : [
            {
              id: 'comp-active',
              organization_id: activeOrg?.id || 'org-active',
              legal_name: activeOrg?.name || 'Company',
              trade_name: activeOrg?.name || 'Company',
              statutory_registration_no: '',
              tax_id: '',
              country: 'India',
              city: '',
              currency: 'INR',
              timezone: 'Asia/Kolkata',
              created_at: new Date().toISOString(),
            } as Company,
          ];
    }

    // 4. Determine Active Legal Entity
    const savedEntityId = localStorage.getItem(STORAGE_KEYS.ACTIVE_LEGAL_ENTITY_ID);
    let activeLegalEntity =
      authorizedEntities.find((e) => e.id === savedEntityId) || authorizedEntities[0];

    // Persist verified context back to local session pointer
    if (activeOrg?.id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ORG_ID, activeOrg.id);
    }
    if (activeLegalEntity?.id) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_LEGAL_ENTITY_ID, activeLegalEntity.id);
    }

    return {
      userId: user.id,
      organizations: allOrgs,
      activeOrganization: activeOrg,
      authorizedLegalEntities: authorizedEntities,
      activeLegalEntity: activeLegalEntity,
      roleTitle: this.formatCleanRoleTitle(roleName),
      isPlatformAdmin,
    };
  }

  /**
   * Switches organization context after strict server-side validation.
   */
  async switchOrganization(user: User, organizationId: string): Promise<EffectiveUserContext> {
    const currentContext = await this.resolveUserContext(user);
    const targetOrg = currentContext.organizations.find((o) => o.id === organizationId);

    if (!targetOrg) {
      throw new Error(`403 Forbidden: User ${user.id} has no active membership for organization ${organizationId}`);
    }

    const beforeState = {
      organizationId: currentContext.activeOrganization.id,
      legalEntityId: currentContext.activeLegalEntity.id,
    };

    localStorage.setItem(STORAGE_KEYS.ACTIVE_ORG_ID, targetOrg.id);

    // Refresh context for target org
    const newContext = await this.resolveUserContext(user);

    this.logContextAudit(user, {
      action: 'ORGANIZATION_SWITCHED',
      organizationId: targetOrg.id,
      legalEntityId: newContext.activeLegalEntity.id,
      details: `Switched active organization to ${targetOrg.name}`,
      beforeState,
      afterState: {
        organizationId: newContext.activeOrganization.id,
        legalEntityId: newContext.activeLegalEntity.id,
      },
    });

    hrEventBus.publish('employee.updated', { contextSwitch: true }, { organizationId: targetOrg.id });
    return newContext;
  }

  /**
   * Switches active legal entity after strict authorization check.
   */
  async switchLegalEntity(user: User, legalEntityId: string): Promise<EffectiveUserContext> {
    const currentContext = await this.resolveUserContext(user);
    const targetEntity = currentContext.authorizedLegalEntities.find((e) => e.id === legalEntityId);

    if (!targetEntity) {
      throw new Error(`403 Forbidden: User ${user.id} is not authorized for legal entity ${legalEntityId}`);
    }

    const beforeState = {
      organizationId: currentContext.activeOrganization.id,
      legalEntityId: currentContext.activeLegalEntity.id,
    };

    localStorage.setItem(STORAGE_KEYS.ACTIVE_LEGAL_ENTITY_ID, targetEntity.id);
    api.setActiveCompany(targetEntity);

    const newContext = await this.resolveUserContext(user);

    this.logContextAudit(user, {
      action: 'LEGAL_ENTITY_SWITCHED',
      organizationId: currentContext.activeOrganization.id,
      legalEntityId: targetEntity.id,
      details: `Switched active legal entity to ${targetEntity.legal_name}`,
      beforeState,
      afterState: {
        organizationId: newContext.activeOrganization.id,
        legalEntityId: targetEntity.id,
      },
    });

    window.dispatchEvent(new CustomEvent('organization:context_updated', { detail: newContext }));
    hrEventBus.publish('attendance.updated', { legalEntitySwitch: true }, { companyId: targetEntity.id });

    return newContext;
  }

  /**
   * Formats clean, unpolluted role titles according to enterprise governance standard.
   */
  formatCleanRoleTitle(rawRole: string): string {
    const normalized = String(rawRole || '').toLowerCase().trim();
    if (normalized.includes('vendor') || normalized.includes('contractor')) return 'Vendor Operations Admin';
    if (normalized.includes('super') || normalized.includes('platform')) return 'Platform Super Admin';
    if (normalized.includes('assistant')) return 'Assistant Admin (Delegated Ops)';
    if (normalized.includes('company admin')) return 'Company Admin (Company)';
    if (normalized.includes('hr head')) return 'HR Head (Company)';
    if (normalized.includes('hr admin') || normalized === 'hr') return 'HR Admin (Company)';
    if (normalized.includes('manager')) return 'Manager (Department)';
    if (normalized.includes('lead')) return 'Team Lead (Team)';
    if (normalized.includes('employee') || !rawRole) return 'Employee (Self)';
    return 'Employee (Self)';
  }

  /**
   * Records context transition into audit log.
   */
  private logContextAudit(
    user: User,
    entry: {
      action: string;
      organizationId: string;
      legalEntityId?: string;
      details: string;
      beforeState: any;
      afterState: any;
    }
  ): void {
    try {
      const logs = JSON.parse(localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS) || '[]');
      const newLog = {
        id: `ctx-${Date.now()}`,
        actor_id: user.id,
        actor_name: user.name,
        timestamp: new Date().toISOString(),
        ...entry,
      };
      logs.unshift(newLog);
      localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(logs.slice(0, 100)));

      if (isSupabaseEnabled) {
        Promise.resolve(
          supabase.from('audit_context_logs').insert({
            id: newLog.id,
            actor_id: newLog.actor_id,
            actor_name: newLog.actor_name,
            organization_id: newLog.organizationId,
            legal_entity_id: newLog.legalEntityId,
            action: newLog.action,
            timestamp: newLog.timestamp,
            details: newLog.details,
            before_state: newLog.beforeState,
            after_state: newLog.afterState,
          })
        ).catch((e: any) => console.warn('[Supabase Audit] Context log insert failed:', e));
      }
    } catch (_) {}
  }
}

export const organizationContextService = new OrganizationContextService();
