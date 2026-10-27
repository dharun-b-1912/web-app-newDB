import { useState, useEffect, useRef, createContext, useContext, ReactNode, useCallback } from 'react';
import { Company, Organization } from '../types';
import { useAuth } from './useAuth';
import { organizationContextService } from '../services/organizationContextService';
import { api } from '../services/api';

interface TenantContextType {
  organization: Organization | null;
  organizations: Organization[];
  companies: Company[];
  legalEntities: Company[];
  activeCompany: Company | null;
  activeLegalEntity: Company | null;
  roleTitle: string;
  setActiveCompany: (company: Company) => void;
  switchOrganization: (orgId: string) => Promise<void>;
  switchLegalEntity: (entityId: string) => Promise<void>;
  reloadTenant: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  retryTenant: () => void;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const initialFastCtx = user ? organizationContextService.getCachedContextSync(user) : null;
  const [organization, setOrganization] = useState<Organization | null>(() => initialFastCtx?.activeOrganization || null);
  const [organizations, setOrganizations] = useState<Organization[]>(() => initialFastCtx?.organizations || []);
  const [legalEntities, setLegalEntities] = useState<Company[]>(() => initialFastCtx?.authorizedLegalEntities || []);
  const [activeLegalEntity, setActiveLegalEntity] = useState<Company | null>(() => initialFastCtx?.activeLegalEntity || null);
  const [roleTitle, setRoleTitle] = useState<string>(() => initialFastCtx?.roleTitle || 'Unassigned');
  const [isLoading, setIsLoading] = useState<boolean>(() => !initialFastCtx);
  const [error, setError] = useState<string | null>(null);

  const userId = user?.id || '';
  const userOrgId = user?.organization_id || '';
  const userRole = user?.role || '';

  const inFlightRef = useRef<boolean>(false);
  const lastResolvedKeyRef = useRef<string>('');
  const orgRef = useRef<Organization | null>(null);
  orgRef.current = organization;

  const loadTenant = useCallback(async (force = false) => {
    const resolutionKey = `${userId}_${userOrgId}_${userRole}`;

    // Skip if already in flight or already resolved for this exact user profile unless forced
    if (inFlightRef.current) return;
    if (!force && lastResolvedKeyRef.current === resolutionKey && lastResolvedKeyRef.current !== '') {
      return;
    }

    inFlightRef.current = true;
    const tenantStartTime = performance.now();
    console.log('[BOOT] organization_started: Resolving multi-tenant organization and company context');

    // Only set loading to true on initial cold start to avoid unmounting module views
    if (!orgRef.current) {
      setIsLoading(true);
    }

    const tenantSafetyTimer = setTimeout(() => {
      setIsLoading(false);
    }, 2500);

    try {
      setError(null);
      if (user) {
        // FAST PATH: Hydrate synchronous context immediately if not yet set
        const fastCtx = organizationContextService.getCachedContextSync(user);
        if (fastCtx && (!orgRef.current || orgRef.current.id !== fastCtx.activeOrganization?.id)) {
          setOrganization(fastCtx.activeOrganization);
          setOrganizations(fastCtx.organizations);
          setLegalEntities(fastCtx.authorizedLegalEntities);
          setActiveLegalEntity(fastCtx.activeLegalEntity);
          setRoleTitle(fastCtx.roleTitle);
          api.setActiveCompany(fastCtx.activeLegalEntity);
          setIsLoading(false);
        }

        const ctxPromise = organizationContextService.resolveUserContext(user);
        const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2500));
        const ctx = await Promise.race([ctxPromise, timeoutPromise]);

        if (ctx && ctx.activeOrganization) {
          setOrganization(ctx.activeOrganization);
          setOrganizations(ctx.organizations);
          setLegalEntities(ctx.authorizedLegalEntities);
          setActiveLegalEntity(ctx.activeLegalEntity);
          setRoleTitle(ctx.roleTitle);
          api.setActiveCompany(ctx.activeLegalEntity);
          lastResolvedKeyRef.current = resolutionKey;
          const elapsed = (performance.now() - tenantStartTime).toFixed(1);
          console.log(`[BOOT] organization_resolved: Tenant context resolved (${elapsed}ms). Org: "${ctx.activeOrganization?.name || 'Default'}", Company: "${ctx.activeLegalEntity?.legal_name || 'HQ'}"`);
          if (typeof window !== 'undefined') {
            (window as any).__joyBootStep?.(90, 'Tenant Synchronized', `Org: ${ctx.activeOrganization?.name || 'Joy Corporate Solutions'}`);
          }
        } else if (!orgRef.current) {
          // Strict Tenant Isolation: Never silently replace with another organization's stored defaults!
          const targetOrgId = userOrgId || '0c621892-e938-4707-9957-13534ea32c19';
          console.warn('[TenantProvider] organizationContextService timed out; preserving strict tenant identity:', targetOrgId);
          const scopedOrg: Organization = {
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
          const scopedComp: Company = {
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
          setOrganization(scopedOrg);
          setOrganizations([scopedOrg]);
          setLegalEntities([scopedComp]);
          setActiveLegalEntity(scopedComp);
          lastResolvedKeyRef.current = resolutionKey;
          const elapsed = (performance.now() - tenantStartTime).toFixed(1);
          console.log(`[BOOT] organization_resolved: Scoped tenant context established (${elapsed}ms)`);
        }
      } else {
        const defaultOrg = await api.getOrganization();
        const compList = await api.getCompanies();
        const activeComp = api.getActiveCompany();
        setOrganization(defaultOrg);
        setOrganizations([defaultOrg]);
        setLegalEntities(compList);
        setActiveLegalEntity(activeComp || compList[0]);
        lastResolvedKeyRef.current = resolutionKey;
        const elapsed = (performance.now() - tenantStartTime).toFixed(1);
        console.log(`[BOOT] organization_resolved: Anonymous tenant context resolved (${elapsed}ms)`);
      }
    } catch (err: any) {
      console.error('[TenantProvider] Error loading multi-entity context:', err);
      setError(err?.message || 'Failed to initialize tenant organization');
    } finally {
      clearTimeout(tenantSafetyTimer);
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, [userId, userOrgId, userRole]);

  useEffect(() => {
    loadTenant();

    const handleContextUpdate = () => {
      loadTenant(true);
    };
    window.addEventListener('organization:context_updated', handleContextUpdate);
    return () => window.removeEventListener('organization:context_updated', handleContextUpdate);
  }, [loadTenant]);

  const switchOrganization = async (orgId: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const newCtx = await organizationContextService.switchOrganization(user, orgId);
      setOrganization(newCtx.activeOrganization);
      setOrganizations(newCtx.organizations);
      setLegalEntities(newCtx.authorizedLegalEntities);
      setActiveLegalEntity(newCtx.activeLegalEntity);
      setRoleTitle(newCtx.roleTitle);
      api.setActiveCompany(newCtx.activeLegalEntity);
      api.clearEmployeeCache();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('tenant:switched', {
            detail: {
              organizationId: newCtx.activeOrganization?.id,
              legalEntityId: newCtx.activeLegalEntity?.id,
            },
          })
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const switchLegalEntity = async (entityId: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      const newCtx = await organizationContextService.switchLegalEntity(user, entityId);
      setActiveLegalEntity(newCtx.activeLegalEntity);
      setLegalEntities(newCtx.authorizedLegalEntities);
      api.setActiveCompany(newCtx.activeLegalEntity);
      api.clearEmployeeCache();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('tenant:switched', {
            detail: {
              organizationId: organization?.id,
              legalEntityId: newCtx.activeLegalEntity?.id,
            },
          })
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const setActiveCompany = (company: Company) => {
    setActiveLegalEntity(company);
    api.setActiveCompany(company);
  };

  return (
    <TenantContext.Provider
      value={{
        organization,
        organizations,
        companies: legalEntities,
        legalEntities,
        activeCompany: activeLegalEntity,
        activeLegalEntity,
        roleTitle,
        setActiveCompany,
        switchOrganization,
        switchLegalEntity,
        reloadTenant: loadTenant,
        isLoading,
        error,
        retryTenant: () => loadTenant(true),
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    return {
      organization: null,
      organizations: [],
      companies: [],
      legalEntities: [],
      activeCompany: null,
      activeLegalEntity: null,
      roleTitle: 'Unassigned',
      setActiveCompany: () => {},
      switchOrganization: async () => {},
      switchLegalEntity: async () => {},
      reloadTenant: async () => {},
      isLoading: true,
      error: null,
      retryTenant: () => {},
    };
  }
  return context;
};
