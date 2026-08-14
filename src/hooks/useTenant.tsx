import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { Company, Organization } from '../types';
import { api } from '../services/api';

interface TenantContextType {
  organization: Organization | null;
  companies: Company[];
  activeCompany: Company | null;
  setActiveCompany: (company: Company) => void;
  reloadTenant: () => Promise<void>;
  isLoading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompanyState] = useState<Company | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTenant = async () => {
    setIsLoading(true);
    try {
      const org = await api.getOrganization();
      const compList = await api.getCompanies();
      const currentActive = api.getActiveCompany();

      setOrganization(org);
      setCompanies(compList);
      setActiveCompanyState(currentActive || compList[0] || null);
    } catch (err) {
      console.error('Error loading tenant context', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTenant();
  }, []);

  const setActiveCompany = (company: Company) => {
    setActiveCompanyState(company);
    api.setActiveCompany(company);
  };

  return (
    <TenantContext.Provider
      value={{
        organization,
        companies,
        activeCompany,
        setActiveCompany,
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
