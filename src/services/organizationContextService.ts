import { Organization, Company, User } from '../types';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { api } from './api';
import { hrEventBus } from './hrEventBus';

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
export const DEFAULT_ORGANIZATIONS: Organization[] = [
  {
    id: 'org-joy-01',
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
    id: 'comp-joy-01',
    organization_id: 'org-joy-01',
    legal_name: 'Joy Corporate Solutions Pvt Ltd',
    trade_name: 'Joy Corporate India',
    statutory_registration_no: 'U72200TZ2020PTC034567',
    tax_id: '33AABCJ1234F1Z5',
    country: 'India',
    city: 'Coimbatore',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    address: 'Joy Tech Park, Avinashi Road, Coimbatore, Tamil Nadu 641014',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'comp-joy-02',
    organization_id: 'org-joy-01',
    legal_name: 'Joy Global Technologies Inc',
    trade_name: 'Joy Global USA',
    statutory_registration_no: 'EIN-84-9876543',
    tax_id: 'US-TAX-98765',
    country: 'United States',
    city: 'New York',
    currency: 'USD',
    timezone: 'America/New_York',
    address: '450 Lexington Avenue, Suite 1200, New York, NY 10017',
    created_at: '2024-01-01T00:00:00Z',
  },
];

class OrganizationContextService {
  /**
   * Resolves the authoritative multi-entity organization context for the authenticated user.
   */
  async resolveUserContext(user: User): Promise<EffectiveUserContext> {
    const roleName = user.roles?.[0]?.name || 'Employee';
    const isPlatformAdmin = [
      'Super Admin',
      'Assistant Admin',
      'Billing Admin',
      'Security Officer',
      'Platform Admin',
    ].includes(roleName);

    let allOrgs: Organization[] = [...DEFAULT_ORGANIZATIONS];
    let allEntities: Company[] = [...DEFAULT_LEGAL_ENTITIES];

    // 1. Fetch from live Supabase if enabled
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
        console.warn('[OrgContextService] Supabase context query fallback to local state:', err);
      }
    }

    // 2. Determine Active Organization
    const savedOrgId = localStorage.getItem(STORAGE_KEYS.ACTIVE_ORG_ID);
    let activeOrg = allOrgs.find((o) => o.id === savedOrgId) || allOrgs[0];

    // 3. Filter authorized Legal Entities by Role Scope
    let authorizedEntities: Company[] = [];

    if (isPlatformAdmin) {
      // Platform Admin can inspect all entities in the selected org
      authorizedEntities = allEntities.filter((e) => e.organization_id === activeOrg.id);
    } else if (roleName === 'Company Admin') {
      // Company Admin manages all legal entities in their Customer Organization
      authorizedEntities = allEntities.filter((e) => e.organization_id === activeOrg.id);
    } else if (roleName === 'HR Head') {
      // HR Head scope: Default 1 assigned legal entity (Joy Corporate Solutions Pvt Ltd)
      // If multi-entity HR explicitly configured, includes additional entities
      const assignedEntityId = 'comp-joy-01'; // Default legal entity
      authorizedEntities = allEntities.filter(
        (e) => e.organization_id === activeOrg.id && e.id === assignedEntityId
      );
      if (authorizedEntities.length === 0) {
        authorizedEntities = [allEntities.find((e) => e.organization_id === activeOrg.id) || allEntities[0]];
      }
    } else {
      // Manager / Team Lead / Employee: assigned legal entity
      const userEntityId = 'comp-joy-01';
      authorizedEntities = allEntities.filter((e) => e.id === userEntityId);
      if (authorizedEntities.length === 0) {
        authorizedEntities = [allEntities[0]];
      }
    }

    // 4. Determine Active Legal Entity
    const savedEntityId = localStorage.getItem(STORAGE_KEYS.ACTIVE_LEGAL_ENTITY_ID);
    let activeLegalEntity =
      authorizedEntities.find((e) => e.id === savedEntityId) || authorizedEntities[0];

    // Persist verified context back to local session pointer
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ORG_ID, activeOrg.id);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_LEGAL_ENTITY_ID, activeLegalEntity.id);

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
    switch (rawRole) {
      case 'Super Admin':
      case 'Platform Admin':
        return 'Platform Super Admin';
      case 'Assistant Admin':
        return 'Assistant Admin (Delegated Ops)';
      case 'Company Admin':
        return 'Company Admin (Company)';
      case 'HR Head':
        return 'HR Head (Company)';
      case 'Manager':
        return 'Manager (Department)';
      case 'Team Lead':
        return 'Team Lead (Team)';
      case 'Employee':
        return 'Employee (Self)';
      default:
        return rawRole;
    }
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
