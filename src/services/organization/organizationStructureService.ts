// src/services/organization/organizationStructureService.ts
// ============================================================================
// Joy PeopleHR — Organization Structure & Entities Service 2.0
// Database-Backed Engine for Legal Entities, Branches, Departments & Teams
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { Company, Branch, BranchType, Department, Team, Location, OrganizationSummaryMetrics, Employee } from '../../types';
import { hrEventBus } from '../hrEventBus';
import { api, isValidUUID, ensureUUID, DEFAULT_COMPANIES, DEFAULT_BRANCHES, DEFAULT_DEPARTMENTS } from '../api';
import { appLogger } from '../../lib/appLogger';

const DEPT_STORAGE_KEY = 'workforce_departments_custom';
const BRANCH_STORAGE_KEY = 'workforce_branches_custom';
const TEAM_STORAGE_KEY = 'workforce_teams_custom';

function getLocalStore<T>(key: string, def: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : def;
  } catch {
    return def;
  }
}

function setLocalStore<T>(key: string, val: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch (err) {
    console.error(`[OrganizationStructureService] Storage error for ${key}:`, err);
  }
}

class OrganizationStructureService {
  /**
   * Resolves aggregated summary metrics for the organization directly from database.
   */
  async getMetrics(organizationId: string): Promise<OrganizationSummaryMetrics> {
    if (!organizationId) {
      return {
        totalLegalEntities: 0,
        totalBranches: 0,
        totalDepartments: 0,
        totalTeams: 0,
        totalEmployees: 0,
        totalVendors: 0,
        totalManpowerProviders: 0,
        totalVendorWorkers: 0,
        totalActiveDeployments: 0,
        complianceExpiringCount: 0,
      };
    }

    // Resolve unified live collections across multi-tenant database & domain services
    const [comps, branches, depts, teams, emps] = await Promise.all([
      this.getLegalEntities(organizationId),
      this.getBranches(undefined, organizationId),
      this.getDepartments(undefined, organizationId),
      this.getTeams(organizationId),
      api.getEmployees(),
    ]);

    return {
      totalLegalEntities: comps.length,
      totalBranches: branches.length,
      totalDepartments: depts.length,
      totalTeams: teams.length,
      totalEmployees: emps.length,
      totalVendors: 0,
      totalManpowerProviders: 0,
      totalVendorWorkers: 0,
      totalActiveDeployments: 0,
      complianceExpiringCount: 0,
    };
  }

  /**
   * Fetches all Legal Entities / Companies for an organization from SQL.
   */
  async getLegalEntities(organizationId: string): Promise<Company[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        let q = supabase.from('companies').select('*');
        if (organizationId && isValidUUID(organizationId)) {
          q = q.eq('organization_id', organizationId);
        }
        const { data, error } = await q.order('created_at', { ascending: true });

        if (!error && data && data.length > 0) {
          const mapped: Company[] = data.map((d: any) => ({
            id: d.id,
            organization_id: d.organization_id,
            legal_name: d.legal_name,
            trade_name: d.trade_name || d.legal_name,
            statutory_registration_no: d.cin_number || d.statutory_registration_no || '',
            tax_id: d.pan_number || d.gstin || d.tax_id || '',
            country: d.country || 'India',
            city: d.city || 'Coimbatore',
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            address: d.registered_address || d.address || '',
            status: d.is_active === false ? 'Inactive' : 'Active',
            created_at: d.created_at || new Date().toISOString(),
          }));
          return mapped;
        }
      } catch (err) {
        console.warn('[OrganizationStructureService] getLegalEntities error:', err);
      }
    }
    const comps = api.getCompanies ? await api.getCompanies() : [];
    return comps.length > 0 ? comps : DEFAULT_COMPANIES;
  }

  /**
   * Creates a new Legal Entity in the database with exact PostgreSQL schema alignment.
   */
  async createLegalEntity(payload: Partial<Company> & { organization_id: string; legal_name: string; statutory_registration_no: string }): Promise<Company> {
    const orgId = payload.organization_id || (typeof window !== 'undefined' ? localStorage.getItem('workforce_active_org_id') : null) || '';
    const tempId = `comp-${Date.now()}`;
    const code = (payload as any).company_code || `CMP-${Math.floor(1000 + Math.random() * 9000)}`;

    const newComp: Company = {
      id: tempId,
      organization_id: orgId,
      legal_name: payload.legal_name,
      trade_name: payload.trade_name || payload.legal_name,
      statutory_registration_no: payload.statutory_registration_no,
      tax_id: payload.tax_id || '',
      country: payload.country || 'India',
      city: payload.city || 'Coimbatore',
      currency: payload.currency || 'INR',
      timezone: payload.timezone || 'Asia/Kolkata',
      address: payload.address || '',
      status: payload.status || 'Active',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled && supabase && orgId && isValidUUID(orgId)) {
      try {
        const dbPayload = {
          organization_id: orgId,
          legal_name: payload.legal_name,
          trade_name: payload.trade_name || payload.legal_name,
          company_code: code,
          cin_number: payload.statutory_registration_no || null,
          pan_number: payload.tax_id || null,
          gstin: (payload as any).gstin || null,
          registered_address: payload.address || null,
          city: payload.city || 'Coimbatore',
          state: (payload as any).state || 'Tamil Nadu',
          postal_code: (payload as any).postal_code || '641001',
          country: payload.country || 'India',
          is_headquarters: Boolean((payload as any).is_headquarters),
          is_active: payload.status !== 'Inactive',
        };

        const { data, error } = await supabase.from('companies').insert([dbPayload]).select().single();
        if (!error && data) {
          const created: Company = {
            id: data.id,
            organization_id: data.organization_id,
            legal_name: data.legal_name,
            trade_name: data.trade_name || data.legal_name,
            statutory_registration_no: data.cin_number || payload.statutory_registration_no || '',
            tax_id: data.pan_number || data.gstin || payload.tax_id || '',
            country: data.country || 'India',
            city: data.city || 'Coimbatore',
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            address: data.registered_address || payload.address || '',
            status: data.is_active === false ? 'Inactive' : 'Active',
            created_at: data.created_at || new Date().toISOString(),
          };

          try {
            const existingComps = JSON.parse(localStorage.getItem('workforce_companies') || '[]');
            localStorage.setItem('workforce_companies', JSON.stringify([created, ...existingComps.filter((c: any) => c.id !== created.id)]));
          } catch (_) {}

          window.dispatchEvent(new CustomEvent('organization:context_updated'));
          hrEventBus.emit('organization.legal_entity_created', { legalEntity: created });
          return created;
        } else if (error) {
          console.warn('[OrganizationStructureService] createLegalEntity insert error:', error);
        }
      } catch (err) {
        console.warn('[OrganizationStructureService] createLegalEntity fallback:', err);
      }
    }

    try {
      const existingComps = JSON.parse(localStorage.getItem('workforce_companies') || '[]');
      localStorage.setItem('workforce_companies', JSON.stringify([newComp, ...existingComps.filter((c: any) => c.id !== newComp.id)]));
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('organization:context_updated'));
    hrEventBus.emit('organization.legal_entity_created', { legalEntity: newComp });
    return newComp;
  }

  /**
   * Updates an existing Legal Entity in SQL and local state.
   */
  async updateLegalEntity(id: string, updates: Partial<Company>): Promise<Company> {
    if (isSupabaseEnabled && supabase && isValidUUID(id)) {
      try {
        const dbUpdates: any = {};
        if (updates.legal_name) dbUpdates.legal_name = updates.legal_name;
        if (updates.trade_name !== undefined) dbUpdates.trade_name = updates.trade_name;
        if (updates.statutory_registration_no !== undefined) dbUpdates.cin_number = updates.statutory_registration_no;
        if (updates.tax_id !== undefined) dbUpdates.pan_number = updates.tax_id;
        if (updates.address !== undefined) dbUpdates.registered_address = updates.address;
        if (updates.city) dbUpdates.city = updates.city;
        if (updates.country) dbUpdates.country = updates.country;
        if (updates.status !== undefined) dbUpdates.is_active = updates.status !== 'Inactive';

        const { data, error } = await supabase.from('companies').update(dbUpdates).eq('id', id).select().maybeSingle();
        if (!error && data) {
          const updated: Company = {
            id: data.id,
            organization_id: data.organization_id,
            legal_name: data.legal_name,
            trade_name: data.trade_name || data.legal_name,
            statutory_registration_no: data.cin_number || updates.statutory_registration_no || '',
            tax_id: data.pan_number || data.gstin || updates.tax_id || '',
            country: data.country || 'India',
            city: data.city || 'Coimbatore',
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            address: data.registered_address || updates.address || '',
            status: data.is_active === false ? 'Inactive' : 'Active',
            created_at: data.created_at || new Date().toISOString(),
          };

          try {
            const existingComps = JSON.parse(localStorage.getItem('workforce_companies') || '[]');
            localStorage.setItem('workforce_companies', JSON.stringify(existingComps.map((c: any) => c.id === id ? updated : c)));
          } catch (_) {}

          window.dispatchEvent(new CustomEvent('organization:context_updated'));
          hrEventBus.emit('organization.legal_entity_updated', { legalEntity: updated });
          return updated;
        }
      } catch (err) {
        console.warn('[OrganizationStructureService] updateLegalEntity error:', err);
      }
    }

    const comps = api.getCompanies ? await api.getCompanies() : [];
    const index = comps.findIndex((c) => c.id === id);
    const existing = index >= 0 ? comps[index] : ({ id } as Company);
    const localUpdated: Company = { ...existing, ...updates };

    try {
      const existingComps = JSON.parse(localStorage.getItem('workforce_companies') || '[]');
      localStorage.setItem('workforce_companies', JSON.stringify(existingComps.map((c: any) => c.id === id ? localUpdated : c)));
    } catch (_) {}

    window.dispatchEvent(new CustomEvent('organization:context_updated'));
    hrEventBus.emit('organization.legal_entity_updated', { legalEntity: localUpdated });
    return localUpdated;
  }

  /**
   * Fetches all Branches / Campuses / Sites from SQL database.
   */
  async getBranches(companyId?: string, organizationId?: string): Promise<Branch[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        let query = supabase.from('branches').select('*');
        if (companyId && isValidUUID(companyId)) {
          query = query.eq('company_id', companyId);
        } else if (organizationId && isValidUUID(organizationId)) {
          query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query.order('created_at', { ascending: true });
        if (!error && data) {
          const mapped: Branch[] = data.map((b: any) => ({
            id: b.id,
            company_id: b.company_id,
            name: b.name,
            code: b.branch_code || 'BR01',
            branch_type: (b.branch_type || 'OFFICE') as BranchType,
            country: b.country || 'India',
            city: b.city || 'Coimbatore',
            state: b.state || 'Tamil Nadu',
            address: b.address || '',
            postal_code: b.postal_code || '',
            timezone: 'Asia/Kolkata',
            status: b.is_active === false ? 'Inactive' : 'Active',
            contact_phone: b.phone || '',
            contact_email: b.email || '',
            created_at: b.created_at || new Date().toISOString(),
          }));
          return mapped;
        }
      } catch (err) {
        console.warn('[OrganizationStructureService] getBranches SQL error:', err);
      }
    }

    // Direct database store fallback
    const list = getLocalStore<Branch[]>(BRANCH_STORAGE_KEY, []);
    const cleanList = list.length > 0 ? list.filter(
      b => b.name !== 'Chennai Tech Park' && b.name !== 'Bengaluru Innovation Center' && b.name !== 'Remote Distributed Hub'
    ) : DEFAULT_BRANCHES;
    if (companyId) {
      return cleanList.filter(b => b.company_id === companyId);
    }
    return cleanList;
  }

  /**
   * Creates a new Branch in SQL database with exact PostgreSQL schema alignment.
   */
  async createBranch(payload: Partial<Branch> & { company_id?: string; name: string; code: string }): Promise<Branch> {
    const branchCode = payload.code || (payload as any).branch_code || `BR-${Math.floor(100 + Math.random() * 900)}`;

    let orgId = (payload as any).organization_id;
    let compId = payload.company_id;

    if (isSupabaseEnabled && supabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const authUid = sessionData?.session?.user?.id;
        if (authUid) {
          const { data: prof } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('auth_user_id', authUid)
            .maybeSingle();

          if (prof?.organization_id) {
            orgId = prof.organization_id;
          }
        }

        if (!orgId && typeof window !== 'undefined') {
          orgId = localStorage.getItem('workforce_active_org_id') || '';
        }

        if (orgId && isValidUUID(orgId)) {
          // Verify company belongs to this organization or find active company
          let compValid = false;
          if (compId && isValidUUID(compId)) {
            const { data: compCheck } = await supabase
              .from('companies')
              .select('id')
              .eq('id', compId)
              .eq('organization_id', orgId)
              .maybeSingle();
            if (compCheck?.id) compValid = true;
          }
          if (!compValid) {
            const { data: comp } = await supabase
              .from('companies')
              .select('id')
              .eq('organization_id', orgId)
              .limit(1)
              .maybeSingle();
            if (comp?.id) compId = comp.id;
          }
        }
      } catch (_) {}
    }

    const fallbackId = `br-${Date.now()}`;
    const newBranch: Branch = {
      id: fallbackId,
      company_id: compId || '',
      name: payload.name,
      code: branchCode,
      branch_type: payload.branch_type || 'OFFICE',
      country: payload.country || 'India',
      city: payload.city || 'Coimbatore',
      state: payload.state || 'Tamil Nadu',
      address: payload.address || '',
      postal_code: payload.postal_code || '',
      timezone: payload.timezone || 'Asia/Kolkata',
      status: payload.status || 'Active',
      head_employee_id: payload.head_employee_id || null,
      contact_phone: payload.contact_phone || '',
      contact_email: payload.contact_email || '',
      created_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled && supabase && orgId && isValidUUID(orgId) && compId && isValidUUID(compId)) {
      try {
        const dbPayload = {
          organization_id: orgId,
          company_id: compId,
          name: newBranch.name,
          branch_code: branchCode,
          city: newBranch.city || 'Coimbatore',
          state: newBranch.state || 'Tamil Nadu',
          country: newBranch.country || 'India',
          phone: newBranch.contact_phone || null,
          email: newBranch.contact_email || null,
          is_active: newBranch.status !== 'Inactive',
        };
        const { data, error, status } = await supabase.from('branches').insert([dbPayload]).select().single();
        if (!error && data) {
          appLogger.dbOperation('branches', 'INSERT', dbPayload);
          const merged: Branch = {
            id: data.id,
            company_id: data.company_id,
            name: data.name,
            code: data.branch_code || branchCode,
            branch_type: payload.branch_type || 'OFFICE',
            country: data.country || 'India',
            city: data.city || 'Coimbatore',
            state: data.state || 'Tamil Nadu',
            address: payload.address || '',
            postal_code: payload.postal_code || '',
            timezone: 'Asia/Kolkata',
            status: data.is_active === false ? 'Inactive' : 'Active',
            head_employee_id: payload.head_employee_id || null,
            contact_phone: data.phone || '',
            contact_email: data.email || '',
            created_at: data.created_at || new Date().toISOString(),
          };
          const current = getLocalStore<Branch[]>(BRANCH_STORAGE_KEY, []);
          setLocalStore(BRANCH_STORAGE_KEY, [merged, ...current.filter((b) => b.id !== merged.id)]);
          hrEventBus.emit('organization.branch_created', { branch: merged });
          return merged;
        } else if (error) {
          appLogger.dbOperation('branches', 'INSERT', dbPayload, error, status);
        }
      } catch (err) {
        appLogger.warn('BRANCHES', 'createBranch caught exception, activating resilient local storage', String(err));
      }
    }

    const current = getLocalStore<Branch[]>(BRANCH_STORAGE_KEY, []);
    setLocalStore(BRANCH_STORAGE_KEY, [newBranch, ...current]);

    hrEventBus.emit('organization.branch_created', { branch: newBranch });
    return newBranch;
  }

  /**
   * Updates an existing Branch in SQL database.
   */
  async updateBranch(id: string, updates: Partial<Branch>): Promise<Branch> {
    let updatedBranch: Branch | null = null;

    if (isSupabaseEnabled && supabase && isValidUUID(id)) {
      try {
        const dbUpdates: any = {
          updated_at: new Date().toISOString(),
        };
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.code !== undefined) dbUpdates.branch_code = updates.code;
        if (updates.city !== undefined) dbUpdates.city = updates.city;
        if (updates.state !== undefined) dbUpdates.state = updates.state;
        if (updates.country !== undefined) dbUpdates.country = updates.country;
        if (updates.contact_phone !== undefined) dbUpdates.phone = updates.contact_phone || null;
        if (updates.contact_email !== undefined) dbUpdates.email = updates.contact_email || null;
        if (updates.status !== undefined) dbUpdates.is_active = updates.status !== 'Inactive';
        if (updates.company_id && isValidUUID(updates.company_id)) dbUpdates.company_id = updates.company_id;

        const { data, error } = await supabase
          .from('branches')
          .update(dbUpdates)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (!error && data) {
          appLogger.dbOperation('branches', 'UPDATE', dbUpdates);
          updatedBranch = {
            id: data.id,
            company_id: data.company_id,
            name: data.name,
            code: data.branch_code || updates.code || 'BR01',
            branch_type: updates.branch_type || 'OFFICE',
            country: data.country || 'India',
            city: data.city || 'Coimbatore',
            state: data.state || 'Tamil Nadu',
            address: updates.address || '',
            postal_code: updates.postal_code || '',
            timezone: data.timezone || 'Asia/Kolkata',
            status: data.is_active === false ? 'Inactive' : 'Active',
            contact_phone: data.phone || '',
            contact_email: data.email || '',
            created_at: data.created_at || new Date().toISOString(),
          };
        } else if (error) {
          console.warn('[OrganizationStructureService] updateBranch SQL error:', error);
        }
      } catch (err) {
        console.warn('[OrganizationStructureService] updateBranch exception:', err);
      }
    }

    if (!updatedBranch) {
      const current = getLocalStore<Branch[]>(BRANCH_STORAGE_KEY, []);
      const index = current.findIndex(b => b.id === id);
      const existing = index >= 0 ? current[index] : ({ id } as Branch);
      updatedBranch = { ...existing, ...updates };
    }

    const current = getLocalStore<Branch[]>(BRANCH_STORAGE_KEY, []);
    setLocalStore(BRANCH_STORAGE_KEY, current.map(b => b.id === id ? updatedBranch! : b));
    hrEventBus.emit('organization.branch_updated', { branch: updatedBranch });
    return updatedBranch;
  }

  /**
   * Safely archives a Branch (soft delete) preserving historical employee & attendance records.
   */
  async archiveBranch(id: string): Promise<boolean> {
    if (isSupabaseEnabled && supabase && isValidUUID(id)) {
      try {
        const { error } = await supabase
          .from('branches')
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (!error) {
          hrEventBus.emit('organization.branch_updated', { branchId: id, action: 'archived' });
          return true;
        }
      } catch (err) {
        console.warn('[OrganizationStructureService] archiveBranch error:', err);
      }
    }

    const current = getLocalStore<Branch[]>(BRANCH_STORAGE_KEY, []);
    setLocalStore(BRANCH_STORAGE_KEY, current.map(b => b.id === id ? { ...b, status: 'Inactive' } : b));
    hrEventBus.emit('organization.branch_updated', { branchId: id, action: 'archived' });
    return true;
  }

  /**
   * Checks dependencies before branch deletion (employees assigned, active records).
   */
  async checkBranchDependencies(branchId: string): Promise<{ employeeCount: number; employees: any[]; canHardDelete: boolean }> {
    if (isSupabaseEnabled && supabase && isValidUUID(branchId)) {
      try {
        const { data: emps, error } = await supabase
          .from('employees')
          .select('id, employee_code, display_name, first_name, last_name, designation_title, work_email, avatar_url, status')
          .eq('branch_id', branchId);

        if (!error && emps) {
          return {
            employeeCount: emps.length,
            employees: emps,
            canHardDelete: emps.length === 0,
          };
        }
      } catch (err) {
        console.warn('[OrganizationStructureService] checkBranchDependencies error:', err);
      }
    }

    // Fallback: check employees through API
    try {
      const allEmps = await api.getEmployees();
      const matching = allEmps.filter((e: any) => e.branch_id === branchId);
      return {
        employeeCount: matching.length,
        employees: matching,
        canHardDelete: matching.length === 0,
      };
    } catch (_) {
      return { employeeCount: 0, employees: [], canHardDelete: true };
    }
  }

  /**
   * Deletes a Branch from SQL database.
   */
  async deleteBranch(id: string): Promise<boolean> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { error } = await supabase.from('branches').delete().eq('id', id);
        if (!error) {
          hrEventBus.emit('organization.branch_created', { branchId: id, action: 'deleted' });
          return true;
        }
      } catch (err) {
        console.warn('[OrganizationStructureService] deleteBranch error:', err);
      }
    }
    const current = getLocalStore<Branch[]>(BRANCH_STORAGE_KEY, []);
    setLocalStore(BRANCH_STORAGE_KEY, current.filter(b => b.id !== id));
    hrEventBus.emit('organization.branch_created', { branchId: id, action: 'deleted' });
    return true;
  }

  /**
   * Fetches all Departments with SQL employee join and real member counts.
   */
  async getDepartments(companyId?: string, organizationId?: string): Promise<Department[]> {
    let deptList: Department[] = [];
    const effectiveOrgId = organizationId || (typeof window !== 'undefined' ? localStorage.getItem('workforce_active_org_id') : null);

    if (isSupabaseEnabled && supabase) {
      try {
        let query = supabase.from('departments').select('*');
        if (effectiveOrgId) {
          query = query.eq('organization_id', effectiveOrgId);
        }
        if (companyId) {
          query = query.eq('company_id', companyId);
        }

        const { data, error } = await query.order('name', { ascending: true });
        if (!error && data !== null && data.length > 0) {
          deptList = data;
        } else {
          // If no rows found with organization_id, also fetch all accessible departments
          const { data: allDepts } = await supabase.from('departments').select('*').order('name', { ascending: true });
          if (allDepts && allDepts.length > 0) {
            deptList = allDepts;
          }
        }
      } catch (err) {
        console.warn('[OrganizationStructureService] getDepartments SQL error:', err);
      }
    }

    if (deptList.length === 0) {
      const stored = getLocalStore<Department[]>(DEPT_STORAGE_KEY, []);
      if (stored.length > 0) {
        deptList = stored;
      } else {
        const fromApi = await (api.getDepartments ? api.getDepartments(companyId) : Promise.resolve([]));
        deptList = fromApi.length > 0 ? fromApi : DEFAULT_DEPARTMENTS;
      }
    }

    // Resolve live employees to attach accurate Head names and Member Counts
    try {
      const emps: Employee[] = await api.getEmployees();
      const teams = await this.getTeams(effectiveOrgId || undefined);

      deptList = deptList.map(d => {
        const matchingEmps = emps.filter(
          e => e.department_id === d.id || e.department_name?.toLowerCase() === d.name.toLowerCase()
        );

        let headName = d.head_employee_name;
        if (d.head_employee_id) {
          const matchedHead = emps.find(e => e.id === d.head_employee_id);
          if (matchedHead) {
            headName = matchedHead.display_name || `${matchedHead.first_name} ${matchedHead.last_name}`.trim();
          }
        }

        return {
          ...d,
          head_employee_name: headName || undefined,
          employee_count: matchingEmps.length,
          team_count: teams.filter(t => t.department_id === d.id).length,
        };
      });
    } catch (_) {}

    return deptList;
  }

  /**
   * Creates a new Department in SQL database.
   */
  async createDepartment(payload: Partial<Department> & { company_id?: string; name: string; code: string; organization_id?: string }): Promise<Department> {
    const id = ensureUUID(payload.id);
    let effectiveOrgId = payload.organization_id && isValidUUID(payload.organization_id) ? payload.organization_id : (typeof window !== 'undefined' ? localStorage.getItem('workforce_active_org_id') : null) || '';
    let effectiveCompId = payload.company_id && isValidUUID(payload.company_id) ? payload.company_id : '';

    if (isSupabaseEnabled && supabase) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const authUid = sessionData?.session?.user?.id;
        if (authUid) {
          const { data: prof } = await supabase
            .from('user_profiles')
            .select('organization_id')
            .eq('auth_user_id', authUid)
            .maybeSingle();

          if (prof?.organization_id) {
            effectiveOrgId = prof.organization_id;
          }
        }

        if (effectiveOrgId) {
          let compValid = false;
          if (effectiveCompId && isValidUUID(effectiveCompId)) {
            const { data: compCheck } = await supabase
              .from('companies')
              .select('id')
              .eq('id', effectiveCompId)
              .eq('organization_id', effectiveOrgId)
              .maybeSingle();
            if (compCheck?.id) compValid = true;
          }
          if (!compValid) {
            const { data: comp } = await supabase
              .from('companies')
              .select('id')
              .eq('organization_id', effectiveOrgId)
              .limit(1)
              .maybeSingle();
            if (comp?.id) effectiveCompId = comp.id;
          }
        }
      } catch (_) {}
    }

    const newDept: Department & { organization_id?: string } = {
      id,
      organization_id: effectiveOrgId,
      company_id: effectiveCompId,
      branch_id: payload.branch_id && isValidUUID(payload.branch_id) ? payload.branch_id : null,
      parent_department_id: payload.parent_department_id && isValidUUID(payload.parent_department_id) ? payload.parent_department_id : null,
      name: payload.name,
      code: payload.code,
      cost_center_code: payload.cost_center_code || '',
      head_employee_id: payload.head_employee_id && isValidUUID(payload.head_employee_id) ? payload.head_employee_id : null,
      description: payload.description || '',
      status: payload.status || 'Active',
      employee_count: 0,
      team_count: 0,
    };

    if (isSupabaseEnabled && supabase && effectiveOrgId && effectiveCompId) {
      try {
        const dbPayload = {
          id,
          organization_id: effectiveOrgId,
          company_id: effectiveCompId,
          parent_department_id: newDept.parent_department_id,
          name: newDept.name,
          code: newDept.code,
          head_employee_id: newDept.head_employee_id,
          is_active: newDept.status !== 'Inactive',
        };
        const { data, error, status } = await supabase.from('departments').insert([dbPayload]).select().single();
        if (!error && data) {
          appLogger.dbOperation('departments', 'INSERT', dbPayload);
          const merged = { ...newDept, ...data };
          hrEventBus.emit('organization.department_created', { department: merged });
          return merged;
        } else if (error) {
          appLogger.dbOperation('departments', 'INSERT', dbPayload, error, status);
        }
      } catch (err) {
        console.warn('[OrganizationStructureService] createDepartment fallback:', err);
      }
    }

    const current = getLocalStore<Department[]>(DEPT_STORAGE_KEY, []);
    setLocalStore(DEPT_STORAGE_KEY, [newDept, ...current]);

    hrEventBus.emit('organization.department_created', { department: newDept });
    return newDept;
  }

  /**
   * Updates an existing Department in SQL database (e.g. rename, change code, assign Head, status).
   */
  async updateDepartment(id: string, updates: Partial<Department>): Promise<Department | null> {
    if (isSupabaseEnabled && supabase) {
      try {
        // Sanitize columns strictly to columns existing in PostgreSQL 'departments' table
        const dbUpdates: any = {};
        if (updates.name) dbUpdates.name = updates.name;
        if (updates.code) dbUpdates.code = updates.code;
        if (updates.company_id && isValidUUID(updates.company_id)) dbUpdates.company_id = updates.company_id;
        if (updates.head_employee_id !== undefined) {
          dbUpdates.head_employee_id = updates.head_employee_id && isValidUUID(updates.head_employee_id) ? updates.head_employee_id : null;
        }
        if (updates.parent_department_id !== undefined) {
          dbUpdates.parent_department_id = updates.parent_department_id && isValidUUID(updates.parent_department_id) ? updates.parent_department_id : null;
        }
        if (updates.status !== undefined) {
          dbUpdates.is_active = updates.status !== 'Inactive';
        }

        const { data, error } = await supabase
          .from('departments')
          .update(dbUpdates)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (!error && data) {
          const merged: Department = {
            id: data.id,
            company_id: data.company_id,
            name: data.name,
            code: data.code,
            head_employee_id: data.head_employee_id,
            parent_department_id: data.parent_department_id,
            status: data.is_active === false ? 'Inactive' : 'Active',
            cost_center_code: updates.cost_center_code || '',
            description: updates.description || '',
          };

          const current = getLocalStore<Department[]>(DEPT_STORAGE_KEY, []);
          setLocalStore(DEPT_STORAGE_KEY, [merged, ...current.filter(d => d.id !== id)]);
          hrEventBus.emit('organization.department_created', { department: merged });
          return merged;
        } else if (error) {
          console.warn('[OrganizationStructureService] updateDepartment Supabase error:', error.message || error);
        }
      } catch (err) {
        console.warn('[OrganizationStructureService] updateDepartment error:', err);
      }
    }

    try {
      const current = getLocalStore<Department[]>(DEPT_STORAGE_KEY, []);
      const idx = current.findIndex(d => d.id === id);
      if (idx !== -1) {
        const updated = { ...current[idx], ...updates };
        current[idx] = updated;
        setLocalStore(DEPT_STORAGE_KEY, current);
        hrEventBus.emit('organization.department_created', { department: updated });
        return updated;
      } else {
        const depts = await this.getDepartments();
        const found = depts.find(d => d.id === id);
        if (found) {
          const updated = { ...found, ...updates };
          setLocalStore(DEPT_STORAGE_KEY, [updated, ...current.filter(d => d.id !== id)]);
          hrEventBus.emit('organization.department_created', { department: updated });
          return updated;
        }
      }
    } catch (_) {}
    return null;
  }

  /**
   * Deletes a department, safely reassigning orphaned employee references if present.
   */
  async deleteDepartment(id: string): Promise<boolean> {
    if (isSupabaseEnabled && supabase) {
      try {
        // Find another department to reassign any employees attached to this department
        const { data: fallbackDept } = await supabase
          .from('departments')
          .select('id')
          .neq('id', id)
          .limit(1)
          .maybeSingle();

        if (fallbackDept?.id) {
          await supabase
            .from('employees')
            .update({ department_id: fallbackDept.id })
            .eq('department_id', id);
        }

        const { error } = await supabase.from('departments').delete().eq('id', id);
        if (error) {
          console.warn('[OrganizationStructureService] deleteDepartment db error:', error.message || error);
        }
      } catch (err) {
        console.warn('[OrganizationStructureService] deleteDepartment error:', err);
      }
    }
    const current = getLocalStore<Department[]>(DEPT_STORAGE_KEY, []);
    setLocalStore(DEPT_STORAGE_KEY, current.filter(d => d.id !== id));
    hrEventBus.emit('organization.department_deleted', { id });
    return true;
  }

  /**
   * Fetches all Teams from local store.
   */
  async getTeams(organizationId?: string, departmentId?: string): Promise<Team[]> {
    const current = getLocalStore<Team[]>(TEAM_STORAGE_KEY, []);
    if (departmentId) {
      return current.filter(t => t.department_id === departmentId);
    }
    return current;
  }

  /**
   * Creates a new Team in local store.
   */
  async createTeam(payload: Partial<Team> & { organization_id?: string; department_id: string; name: string; code: string }): Promise<Team> {
    const effectiveOrgId = payload.organization_id || (typeof window !== 'undefined' ? localStorage.getItem('workforce_active_org_id') : null) || 'org-active';
    const newTeam: Team = {
      id: `team-${Date.now()}`,
      organization_id: effectiveOrgId,
      company_id: payload.company_id,
      department_id: payload.department_id,
      branch_id: payload.branch_id,
      name: payload.name,
      code: payload.code,
      description: payload.description || '',
      team_lead_employee_id: payload.team_lead_employee_id || null,
      manager_employee_id: payload.manager_employee_id || null,
      status: payload.status || 'Active',
      member_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const current = getLocalStore<Team[]>(TEAM_STORAGE_KEY, []);
    setLocalStore(TEAM_STORAGE_KEY, [newTeam, ...current]);

    hrEventBus.emit('organization.team_created', { team: newTeam });
    return newTeam;
  }

  /**
   * Updates an existing Team in local store.
   */
  async updateTeam(id: string, updates: Partial<Team>): Promise<Team | null> {
    const current = getLocalStore<Team[]>(TEAM_STORAGE_KEY, []);
    const idx = current.findIndex(t => t.id === id);
    if (idx !== -1) {
      const updated = { ...current[idx], ...updates };
      current[idx] = updated;
      setLocalStore(TEAM_STORAGE_KEY, current);
      hrEventBus.emit('organization.team_created', { team: updated });
      return updated;
    }
    return null;
  }

  /**
   * Deletes a team.
   */
  async deleteTeam(id: string): Promise<boolean> {
    if (isSupabaseEnabled && supabase) {
      try {
        await supabase.from('teams').delete().eq('id', id);
      } catch (err) {
        console.warn('[OrganizationStructureService] deleteTeam db error:', err);
      }
    }
    const current = getLocalStore<Team[]>(TEAM_STORAGE_KEY, []);
    setLocalStore(TEAM_STORAGE_KEY, current.filter(t => t.id !== id));
    hrEventBus.emit('organization.team_deleted', { id });
    return true;
  }

  /**
   * Fetches active members of a department.
   */
  async getDepartmentMembers(departmentId: string, departmentName?: string): Promise<any[]> {
    try {
      const emps = await api.getEmployees();
      return emps.filter(e => {
        if (e.department_id && e.department_id === departmentId) return true;
        if (departmentName && e.department_name && e.department_name.toLowerCase() === departmentName.toLowerCase()) return true;
        return false;
      });
    } catch {
      return [];
    }
  }

  /**
   * Fetches active members of a team.
   */
  async getTeamMembers(teamId: string): Promise<any[]> {
    try {
      const emps = await api.getEmployees();
      return emps.filter(e => (e as any).team_id === teamId);
    } catch {
      return [];
    }
  }
}

export const organizationStructureService = new OrganizationStructureService();
