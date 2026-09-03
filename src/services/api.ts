import {
  Organization,
  Company,
  Branch,
  Location,
  Department,
  Designation,
  Role,
  User,
  Employee,
  EmployeeStatus,
  EmploymentDetails,
  EmployeeProfile,
  ApprovalItem,
  ActivityItem,
  DashboardMetrics,
  Asset,
} from '../types';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import { hrEventBus } from './hrEventBus';
import { logger } from './diagnostics/loggerService';
import { CorrelationService } from './diagnostics/correlationService';

// Storage Keys for temporary offline cache only
const KEYS = {
  ORG: 'workforce_organization',
  COMPANIES: 'workforce_companies',
  BRANCHES: 'workforce_branches',
  LOCATIONS: 'workforce_locations',
  DEPARTMENTS: 'workforce_departments',
  DESIGNATIONS: 'workforce_designations',
  ROLES: 'workforce_roles',
  USERS: 'workforce_users',
  EMPLOYEES: 'workforce_employees',
  APPROVALS: 'workforce_approvals',
  ACTIVITIES: 'workforce_activities',
  METRICS: 'workforce_metrics',
  CURRENT_USER: 'workforce_current_user',
  ACTIVE_COMPANY: 'workforce_active_company',
};

const _nodeApiFallback = new Map<string, string>();

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    if (typeof localStorage !== 'undefined') {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : defaultValue;
    } else {
      const data = _nodeApiFallback.get(key);
      return data ? JSON.parse(data) : defaultValue;
    }
  } catch {
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, JSON.stringify(value));
    } else {
      _nodeApiFallback.set(key, JSON.stringify(value));
    }
  } catch (err) {
    console.error('Error writing to storage', err);
  }
}

export function sanitizeEmployeeForSupabase(emp: any): Record<string, any> {
  if (!emp || typeof emp !== 'object') return {};
  const allowedKeys = new Set([
    'id',
    'tenant_id',
    'organization_id',
    'company_id',
    'company_name',
    'branch_id',
    'branch_name',
    'department_id',
    'department_name',
    'designation_id',
    'designation_title',
    'user_id',
    'employee_code',
    'first_name',
    'last_name',
    'middle_name',
    'display_name',
    'work_email',
    'avatar_url',
    'avatar_asset_id',
    'avatar_version',
    'status',
    'employment_type',
    'employment_source',
    'vendor_id',
    'vendor_name',
    'vendor_employee_code',
    'profile',
    'employment',
    'shift_name',
    'shift_start_time',
    'shift_end_time',
    'current_profile_media_id',
    'media_version',
    'record_version',
    'updated_by',
    'created_at',
    'updated_at',
    'deleted_at',
  ]);

  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(emp)) {
    if (allowedKeys.has(k) && v !== undefined) {
      clean[k] = v;
    }
  }
  return clean;
}

const DEFAULT_LEGAL_ENTITIES: Company[] = [];

export const DEFAULT_EMPLOYEES: Employee[] = [];

export const api = {
  // ==========================================
  // Organization API
  // ==========================================
  getOrganizationSync(): Organization {
    const cached = getStorage<Organization | null>(KEYS.ORG, null);
    if (cached) return cached;
    return {
      id: 'org-joy-01',
      name: 'Joy Corporate Solutions',
      slug: 'joy-corporate-solutions',
      status: 'Active',
      plan: 'Enterprise',
      default_currency: 'INR',
      timezone: 'Asia/Kolkata',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    };
  },

  async getOrganization(): Promise<Organization> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.from('organizations').select('*').limit(1).single();
        if (!error && data) {
          setStorage(KEYS.ORG, data);
          return data;
        }
      } catch (err) {
        console.error('[API] Failed to fetch organization from Supabase:', err);
      }
    }
    return this.getOrganizationSync();
  },

  async updateOrganization(data: Partial<Organization>): Promise<Organization> {
    const current = await this.getOrganization();
    const updated = { ...current, ...data, updated_at: new Date().toISOString() };
    if (isSupabaseEnabled) {
      try {
        const { error } = await supabase.from('organizations').upsert(updated);
        if (error) throw error;
      } catch (err) {
        console.error('[API] Failed to update organization on Supabase:', err);
        throw err;
      }
    }
    setStorage(KEYS.ORG, updated);
    return updated;
  },

  // ==========================================
  // Company API

  async getCompanies(): Promise<Company[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.from('companies').select('*');
        if (!error && data !== null) {
          setStorage(KEYS.COMPANIES, data);
          return data;
        }
      } catch (err) {
        console.error('[API] Failed to fetch companies from Supabase:', err);
      }
    }
    const list = getStorage<Company[]>(KEYS.COMPANIES, []);
    return list;
  },

  async createCompany(input: Omit<Company, 'id' | 'created_at'>): Promise<Company> {
    const newCompany: Company = {
      ...input,
      id: `comp-${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
    };
    if (isSupabaseEnabled) {
      try {
        const { error } = await supabase.from('companies').insert(newCompany);
        if (error) throw error;
      } catch (err) {
        console.error('[API] Failed to insert company into Supabase:', err);
        throw err;
      }
    }
    const list = getStorage<Company[]>(KEYS.COMPANIES, []);
    setStorage(KEYS.COMPANIES, [newCompany, ...list]);
    return newCompany;
  },

  async updateCompany(id: string, updates: Partial<Company>): Promise<Company> {
    const companies = await this.getCompanies();
    const index = companies.findIndex((c) => c.id === id);
    const existing = index >= 0 ? companies[index] : ({ id } as Company);
    const updated: Company = { ...existing, ...updates };

    if (isSupabaseEnabled) {
      try {
        const { error } = await supabase.from('companies').update(updates).eq('id', id);
        if (error) console.error('[API] Failed to update company in Supabase:', error);
      } catch (err) {
        console.error('[API] Failed to update company in Supabase:', err);
      }
    }

    if (index >= 0) {
      companies[index] = updated;
      setStorage(KEYS.COMPANIES, companies);
    } else {
      setStorage(KEYS.COMPANIES, [updated, ...companies]);
    }

    const active = getStorage<Company | null>(KEYS.ACTIVE_COMPANY, null);
    if (active && active.id === id) {
      setStorage(KEYS.ACTIVE_COMPANY, updated);
    }

    return updated;
  },

  // ==========================================
  // Branch API
  // ==========================================
  async getBranches(companyId?: string): Promise<Branch[]> {
    if (isSupabaseEnabled) {
      try {
        let q = supabase.from('branches').select('*');
        if (companyId) q = q.eq('company_id', companyId);
        const { data, error } = await q;
        if (!error && data !== null) {
          setStorage(KEYS.BRANCHES, data);
          return data;
        }
      } catch (err) {
        console.error('[API] Failed to fetch branches from Supabase:', err);
      }
    }
    const list = getStorage<Branch[]>(KEYS.BRANCHES, []);
    return companyId ? list.filter((b) => b.company_id === companyId) : list;
  },

  async createBranch(input: Omit<Branch, 'id' | 'created_at'>): Promise<Branch> {
    const newBranch: Branch = {
      ...input,
      id: `br-${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
    };
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.from('branches').insert(newBranch).select().single();
        if (error) throw error;
        if (data) return data;
      } catch (err) {
        console.error('[API] Failed to insert branch into Supabase:', err);
        throw err;
      }
    }
    const list = getStorage<Branch[]>(KEYS.BRANCHES, []);
    setStorage(KEYS.BRANCHES, [newBranch, ...list]);
    return newBranch;
  },

  // ==========================================
  // Location API
  // ==========================================
  async getLocations(branchId?: string): Promise<Location[]> {
    if (isSupabaseEnabled) {
      try {
        let q = supabase.from('locations').select('*');
        if (branchId) q = q.eq('branch_id', branchId);
        const { data, error } = await q;
        if (!error && data !== null) {
          setStorage(KEYS.LOCATIONS, data);
          return data;
        }
      } catch (err) {
        console.error('[API] Failed to fetch locations from Supabase:', err);
      }
    }
    const list = getStorage<Location[]>(KEYS.LOCATIONS, []);
    return branchId ? list.filter((l) => l.branch_id === branchId) : list;
  },

  async createLocation(input: Omit<Location, 'id'>): Promise<Location> {
    const newLoc: Location = { ...input, id: `loc-${Date.now().toString(36)}` };
    if (isSupabaseEnabled) {
      try {
        const { error } = await supabase.from('locations').insert(newLoc);
        if (error) throw error;
      } catch (err) {
        console.error('[API] Failed to insert location into Supabase:', err);
        throw err;
      }
    }
    const list = getStorage<Location[]>(KEYS.LOCATIONS, []);
    setStorage(KEYS.LOCATIONS, [newLoc, ...list]);
    return newLoc;
  },

  // ==========================================
  // Department API
  // ==========================================
  async getDepartments(companyId?: string): Promise<Department[]> {
    if (isSupabaseEnabled) {
      try {
        let q = supabase.from('departments').select('*');
        if (companyId) q = q.eq('company_id', companyId);
        const { data, error } = await q;
        if (!error && data !== null) {
          setStorage(KEYS.DEPARTMENTS, data);
          return data;
        }
      } catch (err) {
        console.error('[API] Failed to fetch departments from Supabase:', err);
      }
    }
    const list = getStorage<Department[]>(KEYS.DEPARTMENTS, []);
    return companyId ? list.filter((d) => d.company_id === companyId) : list;
  },

  getDepartmentsSync(companyId?: string): Department[] {
    const list = getStorage<Department[]>(KEYS.DEPARTMENTS, []);
    return companyId ? list.filter((d) => d.company_id === companyId) : list;
  },

  async createDepartment(input: Omit<Department, 'id'>): Promise<Department> {
    const newDept: Department = { ...input, id: `dept-${Date.now().toString(36)}`, employee_count: 0 };
    if (isSupabaseEnabled) {
      try {
        const payload: Record<string, any> = {
          id: newDept.id,
          name: newDept.name,
          code: newDept.code,
          company_id: newDept.company_id || api.getActiveCompany()?.id || 'comp-01',
          organization_id: (newDept as any).organization_id || (typeof window !== 'undefined' ? localStorage.getItem('workforce_active_org_id') : null),
        };
        if (newDept.branch_id) payload.branch_id = newDept.branch_id;
        if (newDept.description) payload.description = newDept.description;
        if (newDept.status) payload.status = newDept.status;

        const { error } = await supabase.from('departments').insert(payload);
        if (error) console.warn('[API] Department insert to Supabase notice:', error.message || error);
      } catch (err) {
        console.warn('[API] Department insert fallback:', err);
      }
    }
    const list = getStorage<Department[]>(KEYS.DEPARTMENTS, []);
    setStorage(KEYS.DEPARTMENTS, [newDept, ...list]);
    return newDept;
  },

  // ==========================================
  // Designation API
  // ==========================================
  async getDesignations(companyId?: string): Promise<Designation[]> {
    const defaultDesignations: Designation[] = [
      { id: 'desig-se', company_id: companyId || 'comp-joy-01', title: 'Software Engineer', code: 'SE', grade: 'L3 - Mid Level' },
      { id: 'desig-sse', company_id: companyId || 'comp-joy-01', title: 'Senior Software Engineer', code: 'SSE', grade: 'L4 - Senior' },
      { id: 'desig-techlead', company_id: companyId || 'comp-joy-01', title: 'Technical Lead', code: 'TECHLEAD', grade: 'L5 - Lead' },
      { id: 'desig-eng-mgr', company_id: companyId || 'comp-joy-01', title: 'Engineering Manager', code: 'EM', grade: 'L6 - Manager' },
      { id: 'desig-hr-exec', company_id: companyId || 'comp-joy-01', title: 'HR Executive', code: 'HRE', grade: 'L2 - Associate' },
      { id: 'desig-hr-mgr', company_id: companyId || 'comp-joy-01', title: 'HR Manager', code: 'HRM', grade: 'L5 - Lead' },
      { id: 'desig-hr-head', company_id: companyId || 'comp-joy-01', title: 'HR Head', code: 'HRH', grade: 'L7 - Director' },
      { id: 'desig-qa-eng', company_id: companyId || 'comp-joy-01', title: 'QA Engineer', code: 'QAE', grade: 'L3 - Mid Level' },
      { id: 'desig-qa-lead', company_id: companyId || 'comp-joy-01', title: 'QA Specialist / Lead', code: 'QAL', grade: 'L5 - Lead' },
      { id: 'desig-prod-mgr', company_id: companyId || 'comp-joy-01', title: 'Product Manager', code: 'PM', grade: 'L5 - Lead' },
      { id: 'desig-ops-lead', company_id: companyId || 'comp-joy-01', title: 'Operations Lead', code: 'OPL', grade: 'L4 - Senior' },
      { id: 'desig-md', company_id: companyId || 'comp-joy-01', title: 'Managing Director', code: 'MD', grade: 'L8 - Executive' },
      { id: 'desig-admin', company_id: companyId || 'comp-joy-01', title: 'Administrative Assistant', code: 'ADM', grade: 'L2 - Associate' },
      { id: 'desig-accountant', company_id: companyId || 'comp-joy-01', title: 'Accountant', code: 'ACC', grade: 'L3 - Mid Level' },
      { id: 'desig-uiux', company_id: companyId || 'comp-joy-01', title: 'UI/UX Designer', code: 'UIUX', grade: 'L3 - Mid Level' },
      { id: 'desig-machine-op', company_id: companyId || 'comp-joy-01', title: 'Machine Operator Grade 1', code: 'MOP', grade: 'L1 - Entry Level' },
    ];

    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase
          .from('designations')
          .select('*')
          .order('title', { ascending: true });

        if (!error && data && data.length > 0) {
          setStorage(KEYS.DESIGNATIONS, data);
          return companyId ? data.filter((d: any) => !d.company_id || d.company_id === companyId || d.company_id === 'comp-joy-01') : data;
        }
      } catch (err) {
        console.warn('[API] Failed to fetch designations from Supabase:', err);
      }
    }

    const list = getStorage<Designation[]>(KEYS.DESIGNATIONS, []);
    if (list.length === 0) {
      setStorage(KEYS.DESIGNATIONS, defaultDesignations);
      return defaultDesignations;
    }
    return companyId ? list.filter((d) => !d.company_id || d.company_id === companyId || d.company_id === 'comp-joy-01') : list;
  },

  async createDesignation(input: Omit<Designation, 'id'>): Promise<Designation> {
    const rawCode = input.code || input.title.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'DESIG';
    const cleanId = `desig-${rawCode.toLowerCase()}-${Date.now().toString(36).slice(-4)}`;
    
    const newDesig: Designation = {
      id: cleanId,
      title: input.title.trim(),
      code: rawCode,
      grade: input.grade || 'L3 - Mid Level',
      company_id: input.company_id || 'comp-joy-01',
    };

    if (isSupabaseEnabled) {
      try {
        const payload: Record<string, any> = {
          id: newDesig.id,
          title: newDesig.title,
          code: newDesig.code,
          company_id: newDesig.company_id,
          grade: newDesig.grade,
        };

        const { error } = await supabase.from('designations').upsert(payload, { onConflict: 'id' });
        if (error) console.warn('[API] Designation upsert to Supabase notice:', error.message || error);
      } catch (err) {
        console.warn('[API] Designation insert fallback:', err);
      }
    }

    const list = getStorage<Designation[]>(KEYS.DESIGNATIONS, []);
    const updated = [newDesig, ...list.filter((d) => d.id !== newDesig.id && d.title.toLowerCase() !== newDesig.title.toLowerCase())];
    setStorage(KEYS.DESIGNATIONS, updated);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('designation:created', { detail: newDesig }));
    }

    return newDesig;
  },

  async updateDesignation(id: string, patch: Partial<Designation>): Promise<Designation> {
    const list = getStorage<Designation[]>(KEYS.DESIGNATIONS, []);
    const idx = list.findIndex((d) => d.id === id);
    const existing = idx >= 0 ? list[idx] : { id, title: 'Staff', code: 'STF', grade: 'L3 - Mid Level', company_id: 'comp-joy-01' };
    const updated: Designation = { ...existing, ...patch };

    if (isSupabaseEnabled) {
      try {
        await supabase.from('designations').update({
          title: updated.title,
          code: updated.code,
          grade: updated.grade,
          company_id: updated.company_id,
        }).eq('id', id);
      } catch (err) {
        console.warn('[API] Designation update notice:', err);
      }
    }

    if (idx >= 0) list[idx] = updated;
    else list.unshift(updated);
    setStorage(KEYS.DESIGNATIONS, list);

    return updated;
  },

  async deleteDesignation(id: string): Promise<boolean> {
    if (isSupabaseEnabled) {
      try {
        await supabase.from('designations').delete().eq('id', id);
      } catch (err) {
        console.warn('[API] Designation delete notice:', err);
      }
    }
    const list = getStorage<Designation[]>(KEYS.DESIGNATIONS, []);
    setStorage(KEYS.DESIGNATIONS, list.filter((d) => d.id !== id));
    return true;
  },

  // ==========================================
  // Employees API (Direct Realtime Supabase)
  // ==========================================
  getEmployeesSync(params?: {
    search?: string;
    departmentId?: string;
    companyId?: string;
    status?: string;
    type?: string;
    source?: string;
    vendorId?: string;
  } | string): Employee[] {
    // 1. Authoritative in-memory cache takes precedence
    let list: Employee[] = [];
    if (this._empCache?.data) {
      list = [...this._empCache.data];
    } else if (isSupabaseEnabled) {
      // In Supabase mode, start with empty list while remote query executes
      list = [];
    } else {
      list = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
      if (list.length > 0) {
        this._empCache = { data: list, timestamp: Date.now() };
      }
    }

    if (!params) return list;

    const filterObj = typeof params === 'string' ? { companyId: params } : params;
    if (filterObj && filterObj.search) {
      const q = typeof filterObj.search === 'string' ? filterObj.search.toLowerCase() : String(filterObj.search).toLowerCase();
      list = list.filter(
        (e) =>
          (e.first_name && e.first_name.toLowerCase().includes(q)) ||
          (e.last_name && e.last_name.toLowerCase().includes(q)) ||
          (e.work_email && e.work_email.toLowerCase().includes(q)) ||
          (e.employee_code && e.employee_code.toLowerCase().includes(q)) ||
          (e.department_name && e.department_name.toLowerCase().includes(q)) ||
          (e.designation_title && e.designation_title.toLowerCase().includes(q)) ||
          (e.vendor_name && e.vendor_name.toLowerCase().includes(q))
      );
    }
    if (filterObj && filterObj.companyId && filterObj.companyId !== 'all') {
      list = list.filter((e) => e.company_id === filterObj.companyId);
    }
    if (filterObj && filterObj.departmentId && filterObj.departmentId !== 'all') {
      list = list.filter((e) => e.department_id === filterObj.departmentId);
    }
    if (filterObj && filterObj.status && filterObj.status !== 'all') {
      list = list.filter((e) => e.status === filterObj.status);
    }
    if (filterObj && filterObj.source && filterObj.source !== 'all') {
      list = list.filter((e) => (e.employment_source || 'DIRECT') === filterObj.source);
    }
    if (filterObj && filterObj.vendorId && filterObj.vendorId !== 'all') {
      list = list.filter((e) => e.vendor_id === filterObj.vendorId);
    }
    return list;
  },

  _empCache: null as { data: Employee[]; timestamp: number } | null,
  _empInFlight: null as Promise<Employee[]> | null,

  async getEmployees(params?: {
    search?: string;
    departmentId?: string;
    companyId?: string;
    status?: string;
    type?: string;
    source?: string;
    vendorId?: string;
  } | string): Promise<Employee[]> {
    const isUnfiltered = !params || (typeof params === 'object' && Object.keys(params).length === 0);
    const now = Date.now();

    // Serve from fresh 5-second memory cache for unfiltered calls to protect browser socket limit
    if (isUnfiltered && this._empCache && now - this._empCache.timestamp < 5000) {
      return this._empCache.data;
    }

    if (isUnfiltered && this._empInFlight) {
      return this._empInFlight;
    }

    const fetchPromise = (async () => {
      if (isSupabaseEnabled) {
        try {
          let q = supabase.from('employees').select('*');
          const filterObj = typeof params === 'string' ? { companyId: params } : params;
          if (filterObj?.companyId && filterObj.companyId !== 'all') q = q.eq('company_id', filterObj.companyId);
          if (filterObj?.departmentId && filterObj.departmentId !== 'all') q = q.eq('department_id', filterObj.departmentId);
          if (filterObj?.status && filterObj.status !== 'all') q = q.eq('status', filterObj.status);
          if (filterObj?.source && filterObj.source !== 'all') q = q.eq('employment_source', filterObj.source);
          if (filterObj?.vendorId && filterObj.vendorId !== 'all') q = q.eq('vendor_id', filterObj.vendorId);
          const { data, error } = await q;

          if (!error && data !== null) {
            // Authoritative remote response
            if (data.length === 0) {
              if (isUnfiltered) {
                setStorage(KEYS.EMPLOYEES, []);
                this._empCache = { data: [], timestamp: Date.now() };
              }
              return [];
            }

            // Concurrently fetch real Bank Accounts and Statutory records for all retrieved employees
            const empIds = data.map((e: any) => e.id);
            if (empIds.length > 0) {
              try {
                const [bRes, sRes] = await Promise.all([
                  supabase.from('employee_bank_accounts').select('*').in('employee_id', empIds),
                  supabase.from('employee_statutory_details').select('*').in('employee_id', empIds),
                ]);

                const bankMap = new Map((bRes?.data || []).map((b: any) => [b.employee_id, b]));
                const statMap = new Map((sRes?.data || []).map((s: any) => [s.employee_id, s]));

                data.forEach((e: any) => {
                  const b = bankMap.get(e.id);
                  if (b) {
                    e.bank = {
                      bank_name: b.bank_name,
                      account_number: b.account_number,
                      ifsc: b.ifsc_code,
                      ifsc_code: b.ifsc_code,
                      account_type: b.account_type,
                      account_holder_name: b.account_holder_name,
                    };
                  }
                  const s = statMap.get(e.id);
                  if (s) {
                    e.statutory = {
                      pan: s.pan_number,
                      pan_number: s.pan_number,
                      uan: s.uan_number,
                      uan_number: s.uan_number,
                      pf_number: s.pf_number,
                      esi_number: s.esi_number,
                      tax_regime: s.tax_regime,
                      pf_applicable: s.pf_applicable,
                      esi_applicable: s.esi_applicable,
                      pt_applicable: s.pt_applicable,
                      lwf_applicable: s.lwf_applicable,
                    };
                  }
                });
              } catch (_) {}
            }

            if (isUnfiltered) {
              setStorage(KEYS.EMPLOYEES, data);
              this._empCache = { data, timestamp: Date.now() };
            }
            return data;
          }
          if (error) {
            console.warn('[API] Supabase getEmployees error:', error.message || error);
            if (!isSupabaseEnabled) {
              return this.getEmployeesSync(params);
            }
            return [];
          }
        } catch (err) {
          console.warn('[API] Supabase getEmployees fetch notice:', err);
          if (!isSupabaseEnabled) {
            return this.getEmployeesSync(params);
          }
          return [];
        }
      }

      const syncResult = this.getEmployeesSync(params);
      if (isUnfiltered) {
        this._empCache = { data: syncResult, timestamp: Date.now() };
      }
      return syncResult;
    })();

    if (isUnfiltered) {
      this._empInFlight = fetchPromise;
      try {
        const res = await fetchPromise;
        return res;
      } finally {
        this._empInFlight = null;
      }
    }

    return fetchPromise;
  },

  async getEmployeeById(id: string): Promise<Employee | undefined> {
    if (isSupabaseEnabled) {
      try {
        const [empRes, bankRes, statRes] = await Promise.all([
          supabase.from('employees').select('*').eq('id', id).maybeSingle(),
          supabase.from('employee_bank_accounts').select('*').eq('employee_id', id).maybeSingle(),
          supabase.from('employee_statutory_details').select('*').eq('employee_id', id).maybeSingle(),
        ]);

        if (empRes?.data && !empRes.error) {
          const emp = empRes.data as any;
          if (bankRes?.data) {
            emp.bank = {
              bank_name: bankRes.data.bank_name,
              account_number: bankRes.data.account_number,
              ifsc: bankRes.data.ifsc_code,
              ifsc_code: bankRes.data.ifsc_code,
              account_type: bankRes.data.account_type,
              account_holder_name: bankRes.data.account_holder_name,
            };
          }
          if (statRes?.data) {
            emp.statutory = {
              pan: statRes.data.pan_number,
              pan_number: statRes.data.pan_number,
              uan: statRes.data.uan_number,
              uan_number: statRes.data.uan_number,
              pf_number: statRes.data.pf_number,
              esi_number: statRes.data.esi_number,
              tax_regime: statRes.data.tax_regime,
              pf_applicable: statRes.data.pf_applicable,
              esi_applicable: statRes.data.esi_applicable,
              pt_applicable: statRes.data.pt_applicable,
            };
          }
          return emp;
        }
      } catch (err) {
        console.error('[API] Supabase getEmployeeById error:', err);
      }
    }
    const list = await this.getEmployees();
    return list.find((e) => e.id === id);
  },

  async createEmployee(input: any): Promise<Employee> {
    const list = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
    
    // Auto-generate unique code WF-100X if not supplied
    let generatedCode = input.employee_code;
    if (!generatedCode) {
      const existingCodes = list
        .map(e => e.employee_code)
        .filter(c => /^WF-\d+$/.test(c))
        .map(c => parseInt(c.replace('WF-', ''), 10));
      const maxCode = existingCodes.length > 0 ? Math.max(...existingCodes) : 1000;
      generatedCode = `WF-${maxCode + 1}`;
    }

    const source = input.employment_source || (input.employment?.employment_source) || 'DIRECT';

    const newEmp: Employee = {
      id: input.id || `emp-${Date.now().toString(36)}`,
      organization_id: input.organization_id || 'org-joy-01',
      company_id: input.company_id || 'comp-joy-01',
      company_name: input.company_name || 'Joy Corporate Solutions Pvt Ltd',
      department_id: input.department_id || 'dept-eng',
      department_name: input.department_name || 'Engineering & DevOps',
      designation_id: input.designation_id || 'desig-sr-eng',
      designation_title: input.designation_title || 'Software Engineer',
      employee_code: generatedCode,
      first_name: input.first_name || 'New',
      last_name: input.last_name || 'Employee',
      display_name: `${input.first_name || 'New'} ${input.last_name || 'Employee'}`.trim(),
      work_email: input.work_email || `emp.${Date.now()}@joycorporate.com`,
      avatar_url: input.avatar_url || '',
      status: input.status || 'Active',
      employment_type: input.employment_type || 'Full Time',
      employment_source: source,
      vendor_id: input.vendor_id,
      vendor_name: input.vendor_name,
      vendor_employee_code: input.vendor_employee_code,
      profile: {
        first_name: input.first_name,
        middle_name: input.middle_name,
        last_name: input.last_name,
        preferred_name: input.preferred_name,
        personal_email: input.personal_email,
        phone: input.primary_mobile || input.phone,
        date_of_birth: input.date_of_birth,
        gender: input.gender,
        current_address: input.current_address,
        permanent_address: input.permanent_address,
        emergency_contacts: input.emergency_contacts,
        family_members: input.family_members,
        ...(input.profile || {}),
      },
      employment: {
        doj: input.doj || input.date_of_joining || new Date().toISOString().split('T')[0],
        employment_type: input.employment_type || 'Full Time',
        employment_source: source,
        vendor_id: input.vendor_id,
        vendor_name: input.vendor_name,
        vendor_employee_code: input.vendor_employee_code,
        vendor_contract_id: input.vendor_contract_id,
        vendor_start_date: input.vendor_start_date,
        vendor_end_date: input.vendor_end_date,
        work_location: input.work_location || 'Coimbatore HQ',
        reporting_manager_id: input.reporting_manager_id,
        reporting_manager_name: input.reporting_manager_name,
        team_lead_id: input.team_lead_id,
        team_lead_name: input.team_lead_name,
        probation_period_months: input.probation_period_months || 6,
        confirmation_status: input.confirmation_status || 'Pending',
        ...(input.employment || {}),
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled) {
      try {
        // 1. Resolve valid organization_id from database (Read-only lookup to avoid 403 RLS)
        let validOrgId = newEmp.organization_id || 'org-joy-01';
        try {
          const { data: matchedOrg } = await supabase
            .from('organizations')
            .select('id')
            .eq('id', validOrgId)
            .maybeSingle();

          if (matchedOrg) {
            validOrgId = matchedOrg.id;
          } else {
            const { data: firstOrg } = await supabase
              .from('organizations')
              .select('id')
              .limit(1)
              .maybeSingle();

            if (firstOrg) {
              validOrgId = firstOrg.id;
            }
          }
        } catch (e) {
          console.warn('[API] Organization lookup notice:', e);
        }

        // 2. Resolve valid company_id from database
        let validCompanyId = newEmp.company_id || `comp-${validOrgId.replace('org-', '')}`;
        try {
          const { data: matchedCompany } = await supabase
            .from('companies')
            .select('id, organization_id, legal_name')
            .eq('id', validCompanyId)
            .maybeSingle();

          if (matchedCompany) {
            validCompanyId = matchedCompany.id;
            validOrgId = matchedCompany.organization_id || validOrgId;
            newEmp.company_name = matchedCompany.legal_name || newEmp.company_name;
          } else {
            const { data: firstCompany } = await supabase
              .from('companies')
              .select('id, organization_id, legal_name')
              .limit(1)
              .maybeSingle();

            if (firstCompany) {
              validCompanyId = firstCompany.id;
              validOrgId = firstCompany.organization_id || validOrgId;
              newEmp.company_name = firstCompany.legal_name || newEmp.company_name;
            } else {
              try {
                await supabase.from('companies').upsert({
                  id: validCompanyId,
                  organization_id: validOrgId,
                  legal_name: newEmp.company_name || 'Joy Corporate Solutions Pvt Ltd',
                  trade_name: 'Joy Corporate India',
                  country: 'India',
                  city: 'Coimbatore',
                });
              } catch (compInsErr) {
                console.warn('[API] Company auto-seed notice:', compInsErr);
              }
            }
          }
        } catch (e) {
          console.warn('[API] Company lookup notice:', e);
        }

        // 3. Resolve valid department_id
        let validDeptId = newEmp.department_id || `dept-${validCompanyId}-eng`;
        try {
          const { data: matchedDept } = await supabase
            .from('departments')
            .select('id')
            .eq('id', validDeptId)
            .maybeSingle();

          if (matchedDept) {
            validDeptId = matchedDept.id;
          } else {
            const { data: firstDept } = await supabase
              .from('departments')
              .select('id')
              .eq('company_id', validCompanyId)
              .limit(1)
              .maybeSingle();

            if (firstDept) {
              validDeptId = firstDept.id;
            } else {
              try {
                await supabase.from('departments').upsert({
                  id: validDeptId,
                  company_id: validCompanyId,
                  name: newEmp.department_name || 'Engineering & Technology',
                  code: 'ENG'
                });
              } catch (deptInsErr) {
                console.warn('[API] Department auto-seed notice:', deptInsErr);
              }
            }
          }
        } catch (e) {
          console.warn('[API] Department lookup notice:', e);
        }

        // 4. Resolve valid designation_id
        let validDesigId = newEmp.designation_id || `desig-${validCompanyId}-se`;
        try {
          const { data: matchedDesig } = await supabase
            .from('designations')
            .select('id')
            .eq('id', validDesigId)
            .maybeSingle();

          if (matchedDesig) {
            validDesigId = matchedDesig.id;
          } else {
            const { data: firstDesig } = await supabase
              .from('designations')
              .select('id')
              .eq('company_id', validCompanyId)
              .limit(1)
              .maybeSingle();

            if (firstDesig) {
              validDesigId = firstDesig.id;
            } else {
              try {
                await supabase.from('designations').upsert({
                  id: validDesigId,
                  company_id: validCompanyId,
                  title: newEmp.designation_title || 'Software Engineer',
                  code: 'SE'
                });
              } catch (desigInsErr) {
                console.warn('[API] Designation auto-seed notice:', desigInsErr);
              }
            }
          }
        } catch (e) {
          console.warn('[API] Designation lookup notice:', e);
        }

        // 5. Resolve branch_id (Read-only lookup or null)
        let validBranchId: string | null = newEmp.branch_id || null;
        if (validBranchId) {
          try {
            const { data: matchedBranch } = await supabase
              .from('branches')
              .select('id')
              .eq('id', validBranchId)
              .maybeSingle();

            if (!matchedBranch) {
              const { data: firstBranch } = await supabase
                .from('branches')
                .select('id')
                .limit(1)
                .maybeSingle();

              validBranchId = firstBranch ? firstBranch.id : null;
            }
          } catch (e) {
            console.warn('[API] Branch lookup notice:', e);
            validBranchId = null;
          }
        }

        newEmp.organization_id = validOrgId;
        newEmp.company_id = validCompanyId;
        newEmp.department_id = validDeptId;
        newEmp.designation_id = validDesigId;
        if (validBranchId) {
          newEmp.branch_id = validBranchId;
        } else {
          delete (newEmp as any).branch_id;
        }

        const cleanEmp = sanitizeEmployeeForSupabase(newEmp);
        const { error } = await supabase.from('employees').upsert(cleanEmp, { onConflict: 'id' });

        if (error) {
          console.warn('[API] Supabase employee insert notice (persisted to local outbox):', error.message || error);
        }

        // Automatically Provision Supabase Auth & Identity Mapping on Supabase
        const phoneNum = newEmp.profile?.phone || input.primary_mobile || input.phone || '+919791817437';
        const role = newEmp.designation_title?.toLowerCase().includes('manager') ? 'Manager' :
                     newEmp.designation_title?.toLowerCase().includes('lead') ? 'Team Lead' :
                     newEmp.designation_title?.toLowerCase().includes('hr') ? 'HR Head' : 'Employee';

        const { data: authResult, error: authRpcErr } = await supabase.rpc('fn_provision_employee_auth', {
          p_tenant_id: newEmp.organization_id || 'org-joy-01',
          p_employee_id: newEmp.id,
          p_email: newEmp.work_email,
          p_phone: phoneNum,
          p_first_name: newEmp.first_name,
          p_last_name: newEmp.last_name,
          p_role: role,
          p_verification_mode: 'TEST_AUTO_VERIFY',
          p_initial_password: 'Joy@2026!'
        });

        if (authRpcErr) {
          console.warn('[API] Auth Provisioning RPC warning:', authRpcErr);
        } else {
          console.log('[API] Auto-provisioned Auth identity successfully:', authResult);
        }

        // 3. Upsert Bank Details
        if (input.bank || input.bank_name || input.account_number) {
          const b = input.bank || input;
          try {
            await supabase.from('employee_bank_accounts').upsert({
              id: `bank-${newEmp.id}`,
              employee_id: newEmp.id,
              bank_name: b.bank_name || 'HDFC Bank',
              account_number: b.account_number || '',
              ifsc_code: b.ifsc || b.ifsc_code || 'HDFC0001234',
              account_type: b.account_type || 'SALARY',
              account_holder_name: b.account_holder_name || `${newEmp.first_name} ${newEmp.last_name}`.trim(),
              is_primary: true,
              updated_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('[API] Bank upsert warning:', e);
          }
        }

        // 4. Upsert Statutory Details
        if (input.statutory || input.pan || input.uan) {
          const s = input.statutory || input;
          const taxRegimeNormalized = (s.tax_regime || 'New').toString().toLowerCase() === 'old' ? 'Old' : 'New';
          try {
            await supabase.from('employee_statutory_details').upsert({
              employee_id: newEmp.id,
              pan_number: s.pan || s.pan_number || '',
              uan_number: s.uan || s.uan_number || '',
              pf_number: s.pf_number || '',
              esi_number: s.esi_number || '',
              tax_regime: taxRegimeNormalized,
              pf_applicable: s.pf_applicable !== undefined ? s.pf_applicable : true,
              esi_applicable: s.esi_applicable !== undefined ? s.esi_applicable : false,
              pt_applicable: s.pt_applicable !== undefined ? s.pt_applicable : true,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'employee_id' });
          } catch (e) {
            console.warn('[API] Statutory upsert warning:', e);
          }
        }
      } catch (err) {
        console.error('[API] Failed to insert/provision employee into Supabase:', err);
        throw err;
      }
    }

    setStorage(KEYS.EMPLOYEES, [newEmp, ...list]);

    // Provision Authenticated Employee Identity in local cache / fallback service
    try {
      const { employeeAuthService } = await import('./auth/employeeAuthService');
      const phoneNum = newEmp.profile?.phone || input.primary_mobile || input.phone || '+919791817437';
      await employeeAuthService.provisionEmployeeAuth({
        tenantId: newEmp.organization_id || 'org-joy-01',
        employeeId: newEmp.id,
        phone: phoneNum,
        email: newEmp.work_email,
        firstName: newEmp.first_name,
        lastName: newEmp.last_name,
        role: newEmp.designation_title?.toLowerCase().includes('manager') ? 'Manager' :
              newEmp.designation_title?.toLowerCase().includes('lead') ? 'Team Lead' :
              newEmp.designation_title?.toLowerCase().includes('hr') ? 'HR Head' : 'Employee',
        sendSms: false,
      });
    } catch (authErr) {
      console.warn('[API] Auto-provisioning employee auth identity warning:', authErr);
    }

    // Auto-dispatch Employee Welcome & Activation Email for Mobile App & Web login
    const targetEmail = newEmp.work_email || (newEmp.profile as any)?.personal_email || (newEmp.profile as any)?.email;
    if (targetEmail && targetEmail.includes('@')) {
      try {
        const { resendEmailService } = await import('./email/resendEmailService');
        await resendEmailService.sendEmployeeActivationEmail({
          to: targetEmail,
          employeeName: `${newEmp.first_name} ${newEmp.last_name}`.trim(),
          employeeId: newEmp.employee_code,
          loginIdentifier: newEmp.employee_code,
          activationToken: `act-${newEmp.id}`,
          organizationName: newEmp.company_name || 'Joy Corporate Solutions',
          authMethod: 'Employee ID & Password / OTP',
          requiresPasswordChange: true,
        });
        console.log('[API] Employee activation email dispatched successfully to:', targetEmail);
      } catch (emailErr) {
        console.warn('[API] Employee activation email dispatch notice:', emailErr);
      }
    }

    hrEventBus.publish('employee.created', newEmp);
    return newEmp;
  },

  async updateEmployee(id: string, data: Partial<Employee>, expectedUpdatedAt?: string, expectedVersion?: number): Promise<Employee> {
    const correlationId = CorrelationService.generate('WF');
    const list = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
    const idx = list.findIndex((e) => e.id === id);
    const existing = idx !== -1 ? list[idx] : ({} as Employee);

    logger.web('EMPLOYEE_UPDATE_STARTED', {
      correlationId,
      employeeId: id,
      tenantId: existing.organization_id || 'org-joy-01',
      operation: 'UPDATE',
      status: 'STARTED',
      metadata: { fields: Object.keys(data) },
    });

    // Concurrency Protection: Detect dirty writes if expectedUpdatedAt provided
    if (expectedUpdatedAt && existing.updated_at && existing.updated_at !== expectedUpdatedAt) {
      const err: any = new Error('This employee was updated by another administrator. Please reload latest changes before saving.');
      err.status = 409;
      err.code = 'CONCURRENCY_CONFLICT';
      logger.error('WEB', 'CONCURRENCY_CONFLICT', err, { correlationId, employeeId: id });
      throw err;
    }

    let canonicalRecord: Employee | null = null;

    if (isSupabaseEnabled) {
      try {
        logger.db('EMPLOYEE_UPDATE_SENT', {
          correlationId,
          table: 'employees',
          employeeId: id,
          operation: 'UPDATE',
        });

        const cleanPatch = sanitizeEmployeeForSupabase(data);

        // 1. Try atomic canonical mutation RPC with optimistic concurrency
        const { data: rpcData, error: rpcErr } = await supabase.rpc('fn_mutate_employee', {
          p_employee_id: id,
          p_patch: cleanPatch,
          p_expected_version: expectedVersion || (existing as any).record_version || null,
          p_actor_id: 'current-admin'
        });

        if (!rpcErr && rpcData) {
          canonicalRecord = rpcData as Employee;
          logger.db('EMPLOYEE_UPDATE_SUCCESS', {
            correlationId,
            table: 'employees',
            employeeId: id,
            operation: 'RPC_MUTATE',
            status: 'SUCCESS',
            rows: 1,
          });
        } else if (rpcErr) {
          if (rpcErr.code === '40001' || rpcErr.message?.includes('CONCURRENCY_CONFLICT')) {
            const conflictErr: any = new Error('Record was modified by another administrator. Please reload latest changes.');
            conflictErr.status = 409;
            conflictErr.code = 'CONCURRENCY_CONFLICT';
            logger.error('DB', 'CONCURRENCY_CONFLICT', conflictErr, { correlationId, employeeId: id });
            throw conflictErr;
          }
          
          // Fallback to direct table update with .select() to get authoritative server record
          const firstName = data.first_name !== undefined ? data.first_name : (existing.first_name || '');
          const lastName = data.last_name !== undefined ? data.last_name : (existing.last_name || '');
          const displayName = data.display_name || `${firstName} ${lastName}`.trim();

          const fallbackUpdated: any = { 
            ...existing, 
            ...data, 
            first_name: firstName,
            last_name: lastName,
            display_name: displayName,
            profile: { ...(existing.profile || {}), ...(data.profile || {}) } as EmployeeProfile,
            employment: { ...(existing.employment || {}), ...(data.employment || {}) } as EmploymentDetails,
            updated_at: new Date().toISOString() 
          };

          const cleanFallback = sanitizeEmployeeForSupabase(fallbackUpdated);

          // Try upserting so it succeeds whether the record was previously in DB or local-only
          const { data: selectData, error: directErr } = await supabase
            .from('employees')
            .upsert(cleanFallback, { onConflict: 'id' })
            .select('*')
            .maybeSingle();

          if (directErr) {
            console.warn('[API] Direct Supabase employee upsert notice (persisting locally):', directErr.message || directErr);
          } else if (selectData) {
            canonicalRecord = selectData as Employee;
          }
        }

        // Upsert Bank Details if provided
        if ((data as any).bank || (data as any).bank_name || (data as any).account_number) {
          const b = (data as any).bank || data;
          try {
            await supabase.from('employee_bank_accounts').upsert({
              id: `bank-${id}`,
              employee_id: id,
              bank_name: b.bank_name || 'HDFC Bank',
              account_number: b.account_number || '',
              ifsc_code: b.ifsc || b.ifsc_code || 'HDFC0001234',
              account_type: b.account_type || 'SALARY',
              account_holder_name: b.account_holder_name || `${existing.first_name || ''} ${existing.last_name || ''}`.trim(),
              is_primary: true,
              updated_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('[API] Bank update warning:', e);
          }
        }

        // Upsert Statutory Details if provided
        if ((data as any).statutory || (data as any).pan || (data as any).uan || (data as any).pan_number || (data as any).uan_number) {
          const s = (data as any).statutory || data;
          const taxRegimeNormalized = (s.tax_regime || 'New').toString().toLowerCase() === 'old' ? 'Old' : 'New';
          try {
            await supabase.from('employee_statutory_details').upsert({
              employee_id: id,
              pan_number: s.pan || s.pan_number || '',
              uan_number: s.uan || s.uan_number || '',
              pf_number: s.pf_number || '',
              esi_number: s.esi_number || '',
              tax_regime: taxRegimeNormalized,
              pf_applicable: s.pf_applicable !== undefined ? s.pf_applicable : true,
              esi_applicable: s.esi_applicable !== undefined ? s.esi_applicable : false,
              pt_applicable: s.pt_applicable !== undefined ? s.pt_applicable : true,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'employee_id' });
          } catch (e) {
            console.warn('[API] Statutory update warning:', e);
          }
        }
      } catch (err: any) {
        if (err?.code === 'CONCURRENCY_CONFLICT' || err?.status === 409) {
          throw err;
        }
        console.warn('[API] Handled Supabase employee update exception (persisted locally):', err.message || err);
      }
    }

    // 2. Resolve final updated record
    const firstName = data.first_name !== undefined ? data.first_name : (existing.first_name || '');
    const lastName = data.last_name !== undefined ? data.last_name : (existing.last_name || '');
    const displayName = data.display_name || `${firstName} ${lastName}`.trim();

    const updated: Employee = canonicalRecord || { 
      ...existing, 
      ...data, 
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      profile: { ...(existing.profile || {}), ...(data.profile || {}) } as EmployeeProfile,
      employment: { ...(existing.employment || {}), ...(data.employment || {}) } as EmploymentDetails,
      bank: (data as any).bank || (existing as any).bank,
      statutory: (data as any).statutory || (existing as any).statutory,
      updated_at: new Date().toISOString() 
    };

    if (idx !== -1) {
      list[idx] = updated;
    } else {
      list.unshift(updated);
    }
    setStorage(KEYS.EMPLOYEES, list);

    // Record audit event
    try {
      const { employeeAuthService } = await import('./auth/employeeAuthService');
      const changedKeys = Object.keys(data).join(', ');
      employeeAuthService.logAuthEvent({
        employee_id: id,
        tenant_id: updated.organization_id || 'org-joy-01',
        event_type: 'PROFILE_UPDATED',
        actor_id: 'current-admin',
        actor_name: 'Authorized Administrator',
        actor_type: 'ADMIN',
        status: 'SUCCESS',
        ip_address: '127.0.0.1',
        details: { changed_fields: changedKeys, correlation_id: correlationId }
      });
    } catch (_) {}

    logger.sync('EMPLOYEE_SYNC_COMPLETE', {
      correlationId,
      employeeId: id,
      status: 'SYNC_COMPLETE',
      message: 'Employee updated in database and local cache invalidated',
    });

    hrEventBus.publish('employee.updated', updated, { actorId: 'api-service', correlationId });
    if (data.status && data.status !== existing.status) {
      hrEventBus.publish('employee.status_changed', { employee_id: id, old_status: existing.status, new_status: data.status, employee: updated }, { actorId: 'api-service', correlationId });
    }
    return updated;
  },

  async archiveEmployee(id: string, reason: string, actorName = 'Authorized Administrator'): Promise<Employee> {
    const list = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
    const idx = list.findIndex((e) => e.id === id);
    const existing = idx !== -1 ? list[idx] : ({} as Employee);

    const updated: Employee = {
      ...existing,
      status: 'Archived',
      employment: {
        ...(existing.employment || {}),
        exit_reason: reason,
        resignation_date: (existing.employment as any)?.resignation_date || new Date().toISOString().split('T')[0],
      } as EmploymentDetails,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled) {
      try {
        const cleanArchive = sanitizeEmployeeForSupabase(updated);
        await supabase.from('employees').update(cleanArchive).eq('id', id);
      } catch (err) {
        console.error('[API] Supabase archive exception:', err);
      }
    }

    if (idx !== -1) {
      list[idx] = updated;
      setStorage(KEYS.EMPLOYEES, list);
    }

    // Revoke active sessions upon archival
    try {
      const { employeeAuthService } = await import('./auth/employeeAuthService');
      employeeAuthService.revokeAllSessions(id);
      employeeAuthService.logAuthEvent({
        employee_id: id,
        tenant_id: updated.organization_id || 'org-joy-01',
        event_type: 'ACCOUNT_SUSPENDED',
        actor_id: 'current-admin',
        actor_name: actorName,
        actor_type: 'ADMIN',
        status: 'SUCCESS',
        ip_address: '127.0.0.1',
        details: { reason }
      });
    } catch (_) {}

    hrEventBus.publish('employee.archived', { employee_id: id, reason, employee: updated });
    hrEventBus.publish('employee.status_changed', { employee_id: id, old_status: existing.status, new_status: 'Archived', employee: updated });
    return updated;
  },

  async restoreEmployee(id: string, targetStatus: EmployeeStatus = 'Active', actorName = 'Authorized Administrator'): Promise<Employee> {
    const list = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
    const idx = list.findIndex((e) => e.id === id);
    const existing = idx !== -1 ? list[idx] : ({} as Employee);

    const updated: Employee = {
      ...existing,
      status: targetStatus,
      updated_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled) {
      try {
        const cleanRestore = sanitizeEmployeeForSupabase(updated);
        await supabase.from('employees').update(cleanRestore).eq('id', id);
      } catch (err) {
        console.error('[API] Supabase restore exception:', err);
      }
    }

    if (idx !== -1) {
      list[idx] = updated;
      setStorage(KEYS.EMPLOYEES, list);
    }

    try {
      const { employeeAuthService } = await import('./auth/employeeAuthService');
      employeeAuthService.logAuthEvent({
        employee_id: id,
        tenant_id: updated.organization_id || 'org-joy-01',
        event_type: 'ACCOUNT_REACTIVATED',
        actor_id: 'current-admin',
        actor_name: actorName,
        actor_type: 'ADMIN',
        status: 'SUCCESS',
        ip_address: '127.0.0.1',
        details: { target_status: targetStatus }
      });
    } catch (_) {}

    hrEventBus.publish('employee.restored', { employee_id: id, employee: updated });
    hrEventBus.publish('employee.status_changed', { employee_id: id, old_status: 'Archived', new_status: targetStatus, employee: updated });
    return updated;
  },

  async deleteEmployee(id: string): Promise<boolean> {
    const list = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
    const target = list.find((e) => e.id === id);
    const updated = list.filter((e) => e.id !== id);
    setStorage(KEYS.EMPLOYEES, updated);

    if (isSupabaseEnabled) {
      try {
        await supabase.from('employee_onboardings').delete().eq('employee_id', id);
        const { error } = await supabase.from('employees').delete().eq('id', id);
        if (error) {
          console.error('[API] Failed to delete employee from Supabase:', error);
          throw error;
        }
      } catch (err) {
        console.error('[API] Supabase employee delete exception:', err);
        throw err;
      }
    }

    hrEventBus.publish('employee.deleted', target || { id });
    return true;
  },

  async getEmployeeAuditLogs(employeeId: string, orgId = 'org-joy-01'): Promise<any[]> {
    try {
      const { employeeAuthService } = await import('./auth/employeeAuthService');
      return employeeAuthService.getAuthAuditLogs(employeeId, orgId);
    } catch {
      return [];
    }
  },

  // ==========================================
  // Roles API
  // ==========================================
  getRolesSync(): Role[] {
    return getStorage<Role[]>(KEYS.ROLES, []);
  },

  async getRoles(): Promise<Role[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.from('roles').select('*');
        if (!error && data !== null) {
          setStorage(KEYS.ROLES, data);
          return data;
        }
      } catch (err) {
        console.error('[API] Failed to fetch roles from Supabase:', err);
      }
    }
    return this.getRolesSync();
  },

  async createRole(roleData: Omit<Role, 'id' | 'organization_id'> & { id?: string; organization_id?: string }): Promise<Role> {
    const roles = await this.getRoles();
    const newRole: Role = {
      id: roleData.id || `role-${Date.now().toString().slice(-6)}`,
      organization_id: roleData.organization_id || 'org-joy-01',
      name: roleData.name,
      description: roleData.description || '',
      is_system: roleData.is_system || false,
      permissions: roleData.permissions || [],
    };

    const updated = [...roles, newRole];
    setStorage(KEYS.ROLES, updated);

    if (isSupabaseEnabled) {
      try {
        const dbRole = {
          id: newRole.id,
          organization_id: newRole.organization_id,
          name: newRole.name,
          description: newRole.description,
          is_system: newRole.is_system,
        };
        const { error } = await supabase.from('roles').insert([dbRole]);
        if (error) console.warn('[API] Supabase role insert notice:', error.message || error);
      } catch (err) {
        console.warn('[API] Supabase role insert fallback:', err);
      }
    }

    return newRole;
  },

  async updateRole(id: string, updates: Partial<Role>): Promise<Role> {
    const roles = await this.getRoles();
    const idx = roles.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Role not found');

    const updatedRole: Role = { ...roles[idx], ...updates };
    roles[idx] = updatedRole;
    setStorage(KEYS.ROLES, roles);

    if (isSupabaseEnabled) {
      try {
        const dbUpdates: Record<string, any> = {};
        if (updates.name !== undefined) dbUpdates.name = updates.name;
        if (updates.description !== undefined) dbUpdates.description = updates.description;
        if (updates.is_system !== undefined) dbUpdates.is_system = updates.is_system;

        if (Object.keys(dbUpdates).length > 0) {
          const { error } = await supabase.from('roles').update(dbUpdates).eq('id', id);
          if (error) console.warn('[API] Supabase role update notice:', error.message || error);
        }
      } catch (err) {
        console.warn('[API] Supabase role update fallback:', err);
      }
    }

    return updatedRole;
  },

  async deleteRole(id: string): Promise<boolean> {
    const roles = await this.getRoles();
    const target = roles.find((r) => r.id === id);
    if (target?.is_system) {
      throw new Error('System roles cannot be deleted.');
    }

    const filtered = roles.filter((r) => r.id !== id);
    setStorage(KEYS.ROLES, filtered);

    if (isSupabaseEnabled) {
      try {
        await supabase.from('roles').delete().eq('id', id);
      } catch (err) {
        console.warn('[API] Supabase role delete fallback:', err);
      }
    }

    return true;
  },

  // ==========================================
  // Users API
  // ==========================================
  getUsersSync(): User[] {
    return getStorage<User[]>(KEYS.USERS, []);
  },

  async getUsers(): Promise<User[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data !== null) {
          setStorage(KEYS.USERS, data);
          return data;
        }
      } catch (err) {
        console.error('[API] Failed to fetch users from Supabase:', err);
      }
    }
    return this.getUsersSync();
  },

  async createUser(userData: {
    name: string;
    email: string;
    phone?: string;
    roleIds: string[];
    employee_id?: string;
    employee_code?: string;
    organization_id?: string;
  }): Promise<User> {
    const users = await this.getUsers();
    const roles = await this.getRoles();
    const matchedRoles = roles.filter((r) => userData.roleIds.includes(r.id));
    const primaryRoleName = matchedRoles[0]?.name || 'Employee';

    // Duplicate email check
    const existing = users.find((u) => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existing) {
      throw new Error(`A user with email "${userData.email}" already exists.`);
    }

    const newUser: User = {
      id: `user-${Date.now().toString().slice(-6)}`,
      organization_id: userData.organization_id || 'org-joy-01',
      name: userData.name,
      email: userData.email,
      phone: userData.phone || '',
      role: primaryRoleName,
      status: 'Active',
      roles: matchedRoles,
      employee_id: userData.employee_id || null,
      employee_code: userData.employee_code,
      created_at: new Date().toISOString(),
    };

    const updated = [newUser, ...users];
    setStorage(KEYS.USERS, updated);

    if (isSupabaseEnabled) {
      try {
        const dbUser = {
          id: newUser.id,
          organization_id: newUser.organization_id,
          name: newUser.name,
          email: newUser.email,
          phone: newUser.phone,
          role: newUser.role,
          status: newUser.status,
          employee_id: newUser.employee_id,
          employee_code: newUser.employee_code,
          created_at: newUser.created_at,
        };
        const { error } = await supabase.from('users').insert([dbUser]);
        if (error) console.warn('[API] Supabase user insert notice:', error.message || error);
      } catch (err) {
        console.warn('[API] Supabase user insert fallback:', err);
      }
    }

    return newUser;
  },

  async deleteUser(id: string): Promise<boolean> {
    const users = await this.getUsers();
    const filtered = users.filter((u) => u.id !== id);
    setStorage(KEYS.USERS, filtered);

    if (isSupabaseEnabled) {
      try {
        await supabase.from('users').delete().eq('id', id);
      } catch (err) {
        console.warn('[API] Supabase user delete fallback:', err);
      }
    }

    return true;
  },

  async assignUserRole(userId: string, roleId: string): Promise<User> {
    const users = await this.getUsers();
    const roles = await this.getRoles();
    const role = roles.find((r) => r.id === roleId);
    if (!role) throw new Error('Role not found');

    const uIdx = users.findIndex((u) => u.id === userId);
    if (uIdx === -1) throw new Error('User not found');

    users[uIdx].roles = [role];
    setStorage(KEYS.USERS, users);
    return users[uIdx];
  },

  async assignUserRoles(userId: string, roleIds: string[]): Promise<User> {
    const users = await this.getUsers();
    const roles = await this.getRoles();
    const matchedRoles = roles.filter((r) => roleIds.includes(r.id));

    const uIdx = users.findIndex((u) => u.id === userId);
    if (uIdx === -1) throw new Error('User not found');

    users[uIdx].roles = matchedRoles;
    setStorage(KEYS.USERS, users);
    return users[uIdx];
  },

  async updateEmployeeStatus(id: string, status: any): Promise<Employee> {
    return this.updateEmployee(id, { status });
  },

  // ==========================================
  // Approvals API
  // ==========================================
  async getApprovals(): Promise<ApprovalItem[]> {
    return getStorage<ApprovalItem[]>(KEYS.APPROVALS, []);
  },

  async getApprovalRequests(): Promise<any[]> {
    const items = await this.getApprovals();
    return items.map((a) => ({
      ...a,
      created_at: a.date_submitted,
      requester_name: a.requested_by_name,
      description: a.details,
    }));
  },

  async updateApprovalStatus(id: string, status: 'Approved' | 'Rejected'): Promise<any> {
    const item = await this.actOnApproval(id, status);
    return {
      ...item,
      created_at: item.date_submitted,
      requester_name: item.requested_by_name,
      description: item.details,
    };
  },

  async actOnApproval(id: string, action: 'Approved' | 'Rejected'): Promise<ApprovalItem> {
    const list = getStorage<ApprovalItem[]>(KEYS.APPROVALS, []);
    const idx = list.findIndex((a) => a.id === id);
    if (idx === -1) throw new Error('Approval item not found');

    list[idx].status = action;
    setStorage(KEYS.APPROVALS, list);
    return list[idx];
  },

  // ==========================================
  // Dashboard API
  // ==========================================
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const employees = await this.getEmployees();
    const approvals = await this.getApprovals();
    const pendingCount = approvals.filter((a) => a.status === 'Pending').length;

    return {
      total_employees: employees.length,
      employee_growth_pct: 6.4,
      present_today: Math.round(employees.length * 0.92),
      present_pct: 92.0,
      on_leave_today: employees.filter((e) => e.status === 'On Leave').length || 0,
      pending_approvals_count: pendingCount,
      open_requisitions: 4,
      payroll_status: 'Attendance Reconciled',
      next_payroll_date: '31 Aug 2026',
    };
  },

  async getActivities(): Promise<ActivityItem[]> {
    return getStorage<ActivityItem[]>(KEYS.ACTIVITIES, []);
  },

  async getAuditLogs(): Promise<any[]> {
    const list = await this.getActivities();
    return list.map((a) => ({
      id: a.id,
      actor_name: a.actor_name,
      action: a.action,
      target: a.entity,
      timestamp: a.time_ago,
    }));
  },

  async getAssets(): Promise<Asset[]> {
    const { assetService } = await import('./asset/assetService');
    return assetService.getAssets({ limit: 1000 }).items;
  },

  // ==========================================
  // Active Company Session
  // ==========================================
  getActiveCompany(): Company {
    const comp = getStorage<Company | null>(KEYS.ACTIVE_COMPANY, null);
    if (comp) return comp;
    const list = getStorage<Company[]>(KEYS.COMPANIES, []);
    return list[0] || (null as any);
  },

  setActiveCompany(company: Company): void {
    setStorage(KEYS.ACTIVE_COMPANY, company);
  },

  getCurrentUser(): User | null {
    const u = getStorage<User | null>(KEYS.CURRENT_USER, null);
    if (u) return u;
    return {
      id: 'user-hr-01',
      organization_id: 'org-joy-01',
      email: 'haripriya@joycorporate.com',
      name: 'Haripriya',
      avatar_url: '',
      employee_id: 'emp-hr-001',
      status: 'Active',
      roles: [{ id: 'role-003', organization_id: 'org-joy-01', name: 'HR Head', description: 'HR Head', permissions: [] }],
      created_at: '2024-01-01T00:00:00Z',
    };
  },

  setCurrentUser(user: User): void {
    setStorage(KEYS.CURRENT_USER, user);
  },

  clearAllOfflineCache(): void {
    Object.values(KEYS).forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('Could not clear key', key, e);
      }
    });
    console.info('[API] All local storage offline cache and mock keys cleared.');
  },
};

// ============================================================================
// Joy PeopleHR — 7 Enterprise Workforce & Operational Engines Re-exports
// ============================================================================
export * from './operations/workforceIdentityEngine';
export * from './operations/shiftRotationEngine';
export * from './operations/attendancePolicyEngine';
export * from './operations/overtimePolicyEngine';
export * from './operations/vendorCommercialEngine';
export * from './operations/bankingExportEngine';
export * from './operations/enterpriseNotificationEngine';
export * from './operations/employeeDocumentEngine';
export * from './operations/dailyWagePayrollEngine';
export * from './operations/vendorGovernanceEngine';
export * from './operations/vendorGovernancePolicyEngine';
export * from './identity/employeeIdentityResolver';
