import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OrganizationContextService } from '../organizationContextService';

const ELECTRA_ORG_ID = 'c5ab6b03-adde-47cc-a033-064f4c39b21e';
const JOY_ORG_ID = '0c621892-e938-4707-9957-13534ea32c19';
const ELECTRA_COMPANY_ID = 'c0bbfb28-1500-4ebb-aba8-453b3681f342';

const memoryStorage = new Map<string, string>();
const mockLocalStorage = {
  getItem: (key: string) => memoryStorage.get(key) ?? null,
  setItem: (key: string, value: string) => { memoryStorage.set(key, String(value)); },
  removeItem: (key: string) => { memoryStorage.delete(key); },
  clear: () => { memoryStorage.clear(); },
};

describe('Multi-Tenant Organization & Legal Entity Isolation', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', mockLocalStorage);
    memoryStorage.clear();
    OrganizationContextService.clearCache();
  });

  it('locks HR Head of Electra EV strictly to Electra EV and hides Joy Corporate Solutions', async () => {
    const svc = new OrganizationContextService();
    const shaliniUser: any = {
      id: '5fb9c461-cec7-4265-817c-64f7971bea6a',
      organization_id: ELECTRA_ORG_ID,
      role: 'HR_HEAD',
      email: 'shalini@electraev.com',
      name: 'Shalini J',
    };

    const ctx = await svc.resolveUserContext(shaliniUser);

    // Must ONLY see Electra EV, never Joy Corporate Solutions
    expect(ctx.isPlatformAdmin).toBe(false);
    expect(ctx.activeOrganization?.id).toBe(ELECTRA_ORG_ID);
    expect(ctx.organizations.length).toBe(1);
    expect(ctx.organizations.map((o) => o.id)).toEqual([ELECTRA_ORG_ID]);

    // Must ONLY have 1 canonical Electra EV legal entity (no duplicate Electra EV Pvt Ltd)
    expect(ctx.authorizedLegalEntities.length).toBe(1);
    expect(ctx.authorizedLegalEntities[0].id).toBe(ELECTRA_COMPANY_ID);
    expect(ctx.activeLegalEntity?.id).toBe(ELECTRA_COMPANY_ID);

    // Attempting to switch to Joy Corporate Solutions must be forbidden
    await expect(svc.switchOrganization(shaliniUser, JOY_ORG_ID)).rejects.toThrow(/403 Forbidden/);
  });

  it('ignores stale localStorage ACTIVE_ORG_ID for non-platform-admin users', async () => {
    mockLocalStorage.setItem('workforce_active_org_id', JOY_ORG_ID);
    const svc = new OrganizationContextService();
    const shaliniUser: any = {
      id: '5fb9c461-cec7-4265-817c-64f7971bea6a',
      organization_id: ELECTRA_ORG_ID,
      role: 'HR_HEAD',
      email: 'shalini@electraev.com',
      name: 'Shalini J',
    };

    const ctx = await svc.resolveUserContext(shaliniUser);
    expect(ctx.activeOrganization?.id).toBe(ELECTRA_ORG_ID);
    expect(ctx.organizations.map((o) => o.id)).toEqual([ELECTRA_ORG_ID]);
  });
});

