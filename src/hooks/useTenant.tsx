import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from 'react';
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
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [legalEntities, setLegalEntities] = useState<Company[]>([]);
  const [activeLegalEntity, setActiveLegalEntity] = useState<Company | null>(null);
  const [roleTitle, setRoleTitle] = useState<string>('Employee (Self)');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadTenant = useCallback(async () => {
    setIsLoading(true);
    try {
      if (user) {
        const ctx = await organizationContextService.resolveUserContext(user);
        setOrganization(ctx.activeOrganization);
        setOrganizations(ctx.organizations);
        setLegalEntities(ctx.authorizedLegalEntities);
        setActiveLegalEntity(ctx.activeLegalEntity);
        setRoleTitle(ctx.roleTitle);
        api.setActiveCompany(ctx.activeLegalEntity);
      } else {
        const defaultOrg = await api.getOrganization();
        const compList = await api.getCompanies();
        const activeComp = api.getActiveCompany();
        setOrganization(defaultOrg);
        setOrganizations([defaultOrg]);
        setLegalEntities(compList);
        setActiveLegalEntity(activeComp || compList[0]);
      }
    } catch (err) {
      console.error('[TenantProvider] Error loading multi-entity context:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTenant();

    const handleContextUpdate = () => {
      loadTenant();
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
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
};
