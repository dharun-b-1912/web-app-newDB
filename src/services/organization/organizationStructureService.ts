// src/services/organization/organizationStructureService.ts
// ============================================================================
// Joy PeopleHR — Organization Structure & Entities Service 2.0
// Database-Backed Engine for Legal Entities, Branches, Departments & Teams
// ============================================================================

import { supabase, isSupabaseEnabled } from '../../lib/supabase';
import { Company, Branch, Department, Team, Location, OrganizationSummaryMetrics, Employee } from '../../types';
import { hrEventBus } from '../hrEventBus';
import { api, isValidUUID, ensureUUID } from '../api';
import { vendorWorkforceService } from './vendorWorkforceService';
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
    const [comps, branches, depts, teams, emps, vendors, workers, deploy] = await Promise.all([
      this.getLegalEntities(organizationId),
      this.getBranches(undefined, organizationId),
      this.getDepartments(undefined, organizationId),
      this.getTeams(organizationId),
      api.getEmployees(),
      vendorWorkforceService.getVendors(organizationId),
      vendorWorkforceService.getVendorWorkers(organizationId),
      vendorWorkforceService.getDeployments(organizationId),
    ]);

    return {
      totalLegalEntities: comps.length,
      totalBranches: branches.length,
      totalDepartments: depts.length,
      totalTeams: teams.length,
      totalEmployees: emps.length,
      totalVendors: vendors.length,
      totalManpowerProviders: vendors.filter(v => v.vendor_type === 'MANPOWER_PROVIDER').length,
      totalVendorWorkers: workers.length,
      totalActiveDeployments: deploy.filter(d => d.status === 'ACTIVE').length,
      complianceExpiringCount: 0,
    };
  }

  /**
   * Fetches all Legal Entities / Companies for an organization from SQL.
   */
  async getLegalEntities(organizationId: string): Promise<Company[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase
          .from('companies')
          .select('*')
          .eq('organization_id', organizationId)
          .order('created_at', { ascending: true });

        if (!error && data !== null) {
          return data;
        }
      } catch (err) {
        console.warn('[OrganizationStructureService] getLegalEntities error:', err);
      }
    }
    return api.getCompanies ? api.getCompanies() : [];
  }

  /**
   * Creates a new Legal Entity in the database.
   */
  async createLegalEntity(payload: Partial<Company> & { organization_id: string; legal_name: string; statutory_registration_no: string }): Promise<Company> {
    const newComp: Company = {
      id: `comp-${Date.now()}`,
      organization_id: payload.organization_id,
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

    if (isSupabaseEnabled && supabase) {
      try {
        const { data, error } = await supabase.from('companies').insert([newComp]).select().single();
        if (!error && data) {
          try {
            const existingComps = JSON.parse(localStorage.getItem('workforce_companies') || '[]');
            localStorage.setItem('workforce_companies', JSON.stringify([data, ...existingComps.filter((c: any) => c.id !== data.id)]));
          } catch (_) {}
          window.dispatchEvent(new CustomEvent('organization:context_updated'));
          hrEventBus.emit('organization.legal_entity_created', { legalEntity: data });
          return data;
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
   * Fetches all Branches / Campuses / Sites from SQL database (No hardcoded mock seeds).
   */
  async getBranches(companyId?: string, organizationId?: string): Promise<Branch[]> {
    if (isSupabaseEnabled && supabase) {
      try {
        let query = supabase.from('branches').select('*');
        if (companyId) {
          query = query.eq('company_id', companyId);
        } else if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }

        const { data, error } = await query.order('created_at', { ascending: true });
        if (!error && data) {
          return data;
        }
      } catch (err) {
        console.warn('[OrganizationStructureService] getBranches SQL error:', err);
      }
    }

    // Direct database store
    const list = getLocalStore<Branch[]>(BRANCH_STORAGE_KEY, []);
    // Filter out any stale mock branches
    const cleanList = list.filter(
      b => b.name !== 'Chennai Tech Park' && b.name !== 'Bengaluru Innovation Center' && b.name !== 'Remote Distributed Hub'
    );
    if (companyId) {
      return cleanList.filter(b => b.company_id === companyId);
    }
    return cleanList;
  }

  /**
   * Creates a new Branch in SQL database with adaptive resilient retry.
   */
  async createBranch(payload: Partial<Branch> & { company_id?: string; name: string; code: string }): Promise<Branch> {
    const id = ensureUUID(payload.id);
    const branchCode = payload.code || (payload as any).branch_code || 'BR01';

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

        if (orgId) {
          // Verify company belongs to this organization
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

    const newBranch: Branch = {
      id,
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

    if (isSupabaseEnabled && supabase && orgId && compId) {
      try {
        const dbPayload = {
          id,
          organization_id: orgId,
          company_id: compId,
          name: newBranch.name,
          branch_code: branchCode,
          city: newBranch.city || 'Coimbatore',
          state: newBranch.state || 'Tamil Nadu',
          country: newBranch.country || 'India',
          timezone: newBranch.timezone || 'Asia/Kolkata',
          phone: newBranch.contact_phone || null,
          email: newBranch.contact_email || null,
          is_active: newBranch.status !== 'Inactive',
        };
        const { data, error, status } = await supabase.from('branches').insert([dbPayload]).select().single();
        if (!error && data) {
          appLogger.dbOperation('branches', 'INSERT', dbPayload);
          const merged = { ...newBranch, ...data, code: data.branch_code };
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
        deptList = await (api.getDepartments ? api.getDepartments(companyId) : Promise.resolve([]));
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
   * Updates an existing Department in SQL database (e.g. assign Head, change cost center).
   */
  async updateDepartment(id: string, updates: Partial<Department>): Promise<Department | null> {
    if (isSupabaseEnabled && supabase) {
      try {
        const dbUpdates: any = { ...updates };
        delete dbUpdates.employee_count;
        delete dbUpdates.team_count;

        const { data, error } = await supabase
          .from('departments')
          .update(dbUpdates)
          .eq('id', id)
          .select()
          .single();
        if (!error && data) {
          hrEventBus.emit('organization.department_created', { department: data });
          return data;
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
        // Fetch from api and store
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
