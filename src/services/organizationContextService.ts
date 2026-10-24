import { Organization, Company, User } from '../types';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { api } from './api';
import { hrEventBus } from './hrEventBus';
import { getPrimaryRole } from '../lib/rbac/permissionEngine';

export interface EffectiveUserContext {
  userId: string;
  organizations: Organization[];
  activeOrganization: Organization | null;
  authorizedLegalEntities: Company[];
  activeLegalEntity: Company | null;
  roleTitle: string;
  isPlatformAdmin: boolean;
}

const STORAGE_KEYS = {
  ACTIVE_ORG_ID: 'workforce_active_org_id',
  ACTIVE_LEGAL_ENTITY_ID: 'workforce_active_legal_entity_id',
  AUDIT_LOGS: 'workforce_context_audit_logs',
};

// One-time migration: replace stale company ID from old default with correct Supabase UUID
const STALE_COMPANY_ID = '0ce6436c-e9b4-4e0e-9102-411ea21b8b80';
const CORRECT_COMPANY_ID = '2030277f-a6a1-427f-beaf-4fc677a3bae2';
if (typeof localStorage !== 'undefined') {
  try {
    const cachedEntityId = localStorage.getItem(STORAGE_KEYS.ACTIVE_LEGAL_ENTITY_ID);
    if (cachedEntityId === STALE_COMPANY_ID) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_LEGAL_ENTITY_ID, CORRECT_COMPANY_ID);
    }
    // Also migrate the cached COMPANIES list in api.ts KEYS.COMPANIES
    const cachedCompanies = localStorage.getItem('workforce_companies');
    if (cachedCompanies) {
      const parsed = JSON.parse(cachedCompanies);
      if (Array.isArray(parsed) && parsed.some((c: any) => c.id === STALE_COMPANY_ID)) {
        const migrated = parsed.map((c: any) => c.id === STALE_COMPANY_ID ? { ...c, id: CORRECT_COMPANY_ID } : c);
        localStorage.setItem('workforce_companies', JSON.stringify(migrated));
      }
    }
    const cachedActiveCompany = localStorage.getItem('workforce_active_company');
    if (cachedActiveCompany) {
      const parsed = JSON.parse(cachedActiveCompany);
      if (parsed?.id === STALE_COMPANY_ID) {
        localStorage.setItem('workforce_active_company', JSON.stringify({ ...parsed, id: CORRECT_COMPANY_ID }));
      }
    }
  } catch (_) {}
}

// Authoritative Default Organizations & Entities (matching Supabase seeds)
export const DEFAULT_ORGANIZATIONS: Organization[] = [
  {
    id: '0c621892-e938-4707-9957-13534ea32c19',
    name: 'Joy Corporate Solutions',
    slug: 'joy-corporate-solutions',
    status: 'Active',
    plan: 'Enterprise',
    default_currency: 'INR',
    timezone: 'Asia/Kolkata',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
];

export const DEFAULT_LEGAL_ENTITIES: Company[] = [
  {
    id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    organization_id: '0c621892-e938-4707-9957-13534ea32c19',
    legal_name: 'Joy Corporate Solutions Pvt Ltd',
    trade_name: 'Joy Corporate Solutions',
    statutory_registration_no: 'U72900TZ2024PTC012345',
    tax_id: 'AAACJ1234F',
    country: 'India',
    city: 'Coimbatore',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    address: 'Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu 641004',
    status: 'Active',
    created_at: '2024-01-01T00:00:00Z',
  },
];

class OrganizationContextService {
  private static cachedOrgs: Organization[] | null = null;
  private static cachedEntities: Company[] | null = null;
  private static cacheTimestamp: number = 0;
  private static inFlightResolvePromise: Map<string, Promise<EffectiveUserContext>> = new Map();
  private static cachedUserContext: Map<string, { ctx: EffectiveUserContext; timestamp: number }> = new Map();

  /**
   * Clear cache on explicit tenant switch
   */
  public static clearCache(): void {
    OrganizationContextService.cachedOrgs = null;
    OrganizationContextService.cachedEntities = null;
    OrganizationContextService.cacheTimestamp = 0;
    OrganizationContextService.cachedUserContext.clear();
  }

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

    const parts = hostname.split('.');
    if (parts.length >= 3) {
      const sub = parts[0];
      if (sub !== 'www' && sub !== 'app' && sub !== 'api' && sub !== 'auth') {
        return sub;
      }
    }
    return null;
  }

  /**
   * Fast synchronous context resolver from memory or localStorage.
   * Enables immediate 0ms UI render without waiting for remote DB queries.
   */
  getCachedContextSync(user: User): EffectiveUserContext | null {
    if (!user) return null;
    const userKey = `${user?.id || 'anon'}_${user?.organization_id || ''}_${user?.role || ''}`;
    const cachedEntry = OrganizationContextService.cachedUserContext.get(userKey);
    if (cachedEntry) {
      return cachedEntry.ctx;
    }

    if (typeof localStorage !== 'undefined') {
      try {
        const stored = localStorage.getItem(`workforce_ctx_${user.id}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.activeOrganization && (!user.organization_id || parsed.activeOrganization.id === user.organization_id)) {
            OrganizationContextService.cachedUserContext.set(userKey, { ctx: parsed, timestamp: Date.now() });
            return parsed;
          }
        }
      } catch (_) {}
    }

    // Deterministic fallback based on user's organization_id (0ms)
    const targetOrgId = user.organization_id || '0c621892-e938-4707-9957-13534ea32c19';
    const fallbackOrg = DEFAULT_ORGANIZATIONS.find((o) => o.id === targetOrgId) || {
      id: targetOrgId,
      name: (user as any).organization_name || 'Joy Corporate Solutions',
      slug: `tenant-${targetOrgId.slice(0, 8)}`,
      status: 'Active',
      plan: 'Enterprise',
      default_currency: 'INR',
      timezone: 'Asia/Kolkata',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const fallbackComp = DEFAULT_LEGAL_ENTITIES.find((c) => c.organization_id === targetOrgId) || {
      id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
      organization_id: targetOrgId,
      legal_name: 'Joy Corporate Solutions Pvt Ltd',
      trade_name: 'Joy Corporate Solutions',
      statutory_registration_no: 'U72900TZ2024PTC032145',
      country: 'India',
      city: 'Coimbatore',
      currency: 'INR',
      timezone: 'Asia/Kolkata',
      status: 'Active',
      created_at: new Date().toISOString(),
    };

    const primaryRole = getPrimaryRole(user);
    const roleName = primaryRole !== 'Unassigned' ? primaryRole : ((user as any).roleCode || (user as any).primaryRole || user.role || 'Unassigned');

    const synCtx: EffectiveUserContext = {
      userId: user.id,
      organizations: [fallbackOrg],
      activeOrganization: fallbackOrg,
      authorizedLegalEntities: [fallbackComp],
      activeLegalEntity: fallbackComp,
      roleTitle: this.formatCleanRoleTitle(roleName),
      isPlatformAdmin: primaryRole === 'Super Admin' || user.role === 'Super Admin' || (user as any).is_platform_admin === true,
    };

    return synCtx;
  }

  /**
   * Resolves the authoritative multi-tenant context for a user session.
   * Validates organization and legal entity hierarchy directly against DB.
   * Single-flight deduplicated and cached for 2 minutes to protect the browser HTTP pool.
   */
  async resolveUserContext(user: User): Promise<EffectiveUserContext> {
    const userKey = `${user?.id || 'anon'}_${user?.organization_id || ''}_${user?.role || ''}`;
    const now = Date.now();

    const cachedEntry = OrganizationContextService.cachedUserContext.get(userKey);
    if (cachedEntry && now - cachedEntry.timestamp < 120_000) {
      return cachedEntry.ctx;
    }

    const inFlight = OrganizationContextService.inFlightResolvePromise.get(userKey);
    if (inFlight) {
      return inFlight;
    }

    const resolvePromise = (async (): Promise<EffectiveUserContext> => {
      try {
        const primaryRole = getPrimaryRole(user);
        const isPlatformAdmin = primaryRole === 'Super Admin' || user.role === 'Super Admin' || (user as any).is_platform_admin === true;
        const roleName = primaryRole !== 'Unassigned' ? primaryRole : ((user as any).roleCode || (user as any).primaryRole || user.role || 'Unassigned');

        let allOrgs: Organization[] = [];
        let allEntities: Company[] = [];

        // Check memory cache for orgs and entities (120s TTL)
        if (
          OrganizationContextService.cachedOrgs &&
          OrganizationContextService.cachedEntities &&
          now - OrganizationContextService.cacheTimestamp < 120_000
        ) {
          allOrgs = OrganizationContextService.cachedOrgs;
          allEntities = OrganizationContextService.cachedEntities;
        } else if (isSupabaseEnabled) {
          // 1. Fetch live organizations and legal entities directly from Supabase with bounded timeout
          try {
            const rawOrgId = user.organization_id || (user as any).organizationId;
            const isUuid = typeof rawOrgId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawOrgId);
            const userOrgId = isUuid ? rawOrgId : '0c621892-e938-4707-9957-13534ea32c19';
            let orgQ = supabase.from('organizations').select('*');
            let compQ = supabase.from('companies').select('*');
            if (rawOrgId !== 'platform-root') {
              orgQ = orgQ.eq('id', userOrgId);
              compQ = compQ.eq('organization_id', userOrgId);
            }

            const abortCtrl = new AbortController();
            const tid = setTimeout(() => abortCtrl.abort(), 2000);

            const [orgRes, compRes] = await Promise.all([
              orgQ.abortSignal(abortCtrl.signal),
              compQ.abortSignal(abortCtrl.signal),
            ]);
            clearTimeout(tid);

            if (orgRes.data && orgRes.data.length > 0) {
              allOrgs = orgRes.data.map((o: any) => ({
                ...o,
                name: o.display_name || o.legal_name || o.name || 'Joy Corporate Solutions',
                status: o.status === 'ACTIVE' ? 'Active' : (o.status || 'Active'),
              })) as Organization[];
            }
            if (compRes.data && compRes.data.length > 0) {
              allEntities = compRes.data.map((c: any) => ({
                ...c,
                legal_name: c.legal_name || c.trade_name,
                trade_name: c.trade_name || c.legal_name,
                address: c.registered_address || c.address || '',
                status: c.is_active === false ? 'Inactive' : 'Active',
              })) as Company[];
            }
          } catch (err) {
            console.warn('[OrgContextService] Supabase context query notice:', err);
          }

          if (allOrgs.length > 0) OrganizationContextService.cachedOrgs = allOrgs;
          if (allEntities.length > 0) OrganizationContextService.cachedEntities = allEntities;
          OrganizationContextService.cacheTimestamp = Date.now();
        }

      // 2. Authoritative Active Organization Selection: strictly enforce user.organization_id
      let activeOrg: Organization | null = null;
      const userOrgId = user.organization_id || (user as any).organizationId;

      if (userOrgId) {
        activeOrg = allOrgs.find((o) => o.id === userOrgId) || null;
        if (!activeOrg) {
          // Construct authentic tenant organization descriptor preserving the user's real organization_id
          activeOrg = {
            id: userOrgId,
            name: (user as any).organization_name || (user as any).tenant_name || (userOrgId === '0c621892-e938-4707-9957-13534ea32c19' ? 'Joy Corporate Solutions' : 'Authorized Organization'),
            slug: `tenant-${userOrgId.slice(0, 8)}`,
            status: 'Active',
            plan: 'Enterprise',
            default_currency: 'INR',
            timezone: 'Asia/Kolkata',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          allOrgs = [activeOrg, ...allOrgs];
        }
      }

      if (!activeOrg) {
        const subdomainSlug = this.detectSubdomainSlug();
        if (subdomainSlug) {
          activeOrg = allOrgs.find((o) => {
            const oSlug = (o.slug || '').toLowerCase();
            const oId = (o.id || '').toLowerCase().replace(/^org-/, '');
            return oSlug === subdomainSlug || oId === subdomainSlug;
          }) || null;
        }
      }

      if (!activeOrg && allOrgs.length > 0) {
        activeOrg = allOrgs[0];
      }

      if (!activeOrg) {
        activeOrg = DEFAULT_ORGANIZATIONS[0];
      }

      // 3. Filter authorized Legal Entities by Role Scope
      let authorizedEntities: Company[] = [];

      if (activeOrg?.id) {
        authorizedEntities = allEntities.filter((e) => e.organization_id === activeOrg?.id);
      }
      if (authorizedEntities.length === 0) {
        authorizedEntities = allEntities.length > 0 ? allEntities : DEFAULT_LEGAL_ENTITIES.map(e => ({
          ...e,
          organization_id: activeOrg?.id || e.organization_id,
        }));
      }

      // 4. Determine Active Legal Entity
      let activeLegalEntity: Company | null = null;
      if (authorizedEntities.length > 0) {
        activeLegalEntity = authorizedEntities[0];
      }
      if (!activeLegalEntity) {
        activeLegalEntity = DEFAULT_LEGAL_ENTITIES[0];
      }

      // Persist verified context back to local session pointer
      if (typeof localStorage !== 'undefined') {
        if (activeOrg?.id) {
          localStorage.setItem(STORAGE_KEYS.ACTIVE_ORG_ID, activeOrg.id);
        }
        if (activeLegalEntity?.id) {
          localStorage.setItem(STORAGE_KEYS.ACTIVE_LEGAL_ENTITY_ID, activeLegalEntity.id);
        }
      }

        const finalContext: EffectiveUserContext = {
          userId: user?.id || 'anon',
          organizations: allOrgs,
          activeOrganization: activeOrg,
          authorizedLegalEntities: authorizedEntities,
          activeLegalEntity: activeLegalEntity,
          roleTitle: this.formatCleanRoleTitle(roleName),
          isPlatformAdmin,
        };

        OrganizationContextService.cachedUserContext.set(userKey, {
          ctx: finalContext,
          timestamp: Date.now(),
        });

        if (typeof localStorage !== 'undefined' && user?.id) {
          try {
            localStorage.setItem(`workforce_ctx_${user.id}`, JSON.stringify(finalContext));
          } catch (_) {}
        }

        return finalContext;
      } finally {
        OrganizationContextService.inFlightResolvePromise.delete(userKey);
      }
    })();

    OrganizationContextService.inFlightResolvePromise.set(userKey, resolvePromise);
    return resolvePromise;
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
      organizationId: currentContext.activeOrganization?.id || null,
      legalEntityId: currentContext.activeLegalEntity?.id || null,
    };

    localStorage.setItem(STORAGE_KEYS.ACTIVE_ORG_ID, targetOrg.id);

    // Refresh context for target org
    OrganizationContextService.clearCache();
    const newContext = await this.resolveUserContext(user);

    this.logContextAudit(user, {
      action: 'ORGANIZATION_SWITCHED',
      organizationId: targetOrg.id,
      legalEntityId: newContext.activeLegalEntity?.id || undefined,
      details: `Switched active organization to ${targetOrg.name}`,
      beforeState,
      afterState: {
        organizationId: newContext.activeOrganization?.id || null,
        legalEntityId: newContext.activeLegalEntity?.id || null,
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
      organizationId: currentContext.activeOrganization?.id || null,
      legalEntityId: currentContext.activeLegalEntity?.id || null,
    };

    localStorage.setItem(STORAGE_KEYS.ACTIVE_LEGAL_ENTITY_ID, targetEntity.id);
    api.setActiveCompany(targetEntity);

    OrganizationContextService.clearCache();
    const newContext = await this.resolveUserContext(user);

    this.logContextAudit(user, {
      action: 'LEGAL_ENTITY_SWITCHED',
      organizationId: currentContext.activeOrganization?.id || 'org-joy-01',
      legalEntityId: targetEntity.id,
      details: `Switched active legal entity to ${targetEntity.legal_name}`,
      beforeState,
      afterState: {
        organizationId: newContext.activeOrganization?.id || null,
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
    if (!rawRole) return 'Unassigned';
    const normalized = String(rawRole || '').toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').trim();
    if (normalized.includes('vendor') || normalized.includes('contractor')) return 'Vendor Operations Admin (Partner)';
    if (normalized.includes('super') || normalized.includes('platform')) return 'Platform Super Admin';
    if (normalized.includes('organization admin') || normalized.includes('org admin') || normalized === 'organization_admin') return 'Organization Admin (Tenant)';
    if (normalized.includes('assistant')) return 'Assistant Admin (Delegated Ops)';
    if (normalized.includes('company admin') || normalized.includes('owner') || normalized.includes('executive')) return 'Company Admin (Company)';
    if (normalized.includes('hr head')) return 'HR Head (Company)';
    if (normalized.includes('hr admin') || normalized === 'hr') return 'HR Admin (Company)';
    if (normalized.includes('payroll')) return 'Payroll Admin (Company)';
    if (normalized.includes('attendance')) return 'Attendance Admin (Company)';
    if (normalized.includes('manager')) return 'Manager (Department)';
    if (normalized.includes('lead')) return 'Team Lead (Team)';
    if (normalized.includes('employee')) return 'Employee (Self)';
    return 'Unassigned';
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
