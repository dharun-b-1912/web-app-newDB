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

function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch {
    return defaultValue;
  }
}

function setStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
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

const DEFAULT_LEGAL_ENTITIES: Company[] = [
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
];

export const DEFAULT_EMPLOYEES: Employee[] = [
  {
    id: 'emp-hr-001',
    organization_id: 'org-joy-01',
    company_id: 'comp-joy-01',
    branch_id: null,
    department_id: 'dept-hr-01',
    designation_id: 'desig-hr-01',
    user_id: null,
    employee_code: 'JCS-HR-001',
    first_name: 'Haripriya',
    last_name: '',
    middle_name: null,
    display_name: 'Haripriya',
    work_email: 'haripriya@joycorporate.com',
    avatar_url: null,
    status: 'Active',
    employment_type: 'Full Time',
    profile: {
      phone: '+919840122334',
      gender: 'Female',
      nationality: 'Indian',
    },
    employment: {
      doj: '2024-01-15',
      work_location: 'Joy Corporate Solutions Private Limited (HQ)',
      employment_type: 'Full Time',
      confirmation_status: 'Confirmed',
      reporting_manager_name: 'Dharun B',
    },
    company_name: 'Joy Corporate Solutions Pvt Ltd',
    branch_name: 'Joy Corporate Solutions Private Limited (HQ)',
    department_name: 'Human Resources',
    designation_title: 'HR Head & People Operations',
    created_at: '2026-08-17T10:46:22.749284+00:00',
    updated_at: '2026-08-25T05:05:33.855+00:00',
    employment_source: 'DIRECT',
    vendor_id: null,
    vendor_name: null,
    vendor_employee_code: null,
  },
  {
    id: 'emp-admin-001',
    organization_id: 'org-joy-01',
    company_id: 'comp-joy-01',
    branch_id: 'br-cbe-01',
    department_id: 'dept-eng',
    designation_id: 'desig-sr-eng',
    user_id: null,
    employee_code: 'JCS-017',
    first_name: 'Dharun',
    last_name: 'B',
    middle_name: null,
    display_name: 'Dharun B',
    work_email: 'dharunjoysolutions@gmail.com',
    avatar_url: null,
    status: 'Active',
    employment_type: 'Full Time',
    profile: {
      phone: '+919791817437',
      gender: 'Male',
      nationality: 'Indian',
    },
    employment: {
      doj: '2024-01-01',
      work_location: 'Joy Corporate Solutions Private Limited (HQ)',
      employment_type: 'Full Time',
      confirmation_status: 'Confirmed',
      reporting_manager_name: 'Haripriya',
    },
    company_name: 'Joy Corporate Solutions Pvt Ltd',
    branch_name: 'Joy Corporate Solutions Private Limited (HQ)',
    department_name: 'Engineering & Management',
    designation_title: 'Software Engineer & Administrator',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2026-08-25T05:05:34.246+00:00',
    employment_source: 'DIRECT',
    vendor_id: null,
    vendor_name: null,
    vendor_employee_code: null,
  },
];

export const api = {
  // ==========================================
  // Organization API
  // ==========================================
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
  // ==========================================
  async getCompanies(): Promise<Company[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.from('companies').select('*');
        if (!error && data && data.length > 0) {
          setStorage(KEYS.COMPANIES, data);
          return data;
        }
      } catch (err) {
        console.error('[API] Failed to fetch companies from Supabase:', err);
      }
    }
    const list = getStorage<Company[]>(KEYS.COMPANIES, []);
    if (list.length > 0) return list;
    return DEFAULT_LEGAL_ENTITIES;
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

  // ==========================================
  // Branch API
  // ==========================================
  async getBranches(companyId?: string): Promise<Branch[]> {
    if (isSupabaseEnabled) {
      try {
        let q = supabase.from('branches').select('*');
        if (companyId) q = q.eq('company_id', companyId);
        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          setStorage(KEYS.BRANCHES, data);
          return data;
        }
      } catch (err) {
        console.error('[API] Failed to fetch branches from Supabase:', err);
      }
    }
    const list = getStorage<Branch[]>(KEYS.BRANCHES, []);
    if (list.length > 0) {
      return companyId ? list.filter((b) => b.company_id === companyId) : list;
    }
    return [
      {
        id: 'br-cbe-01',
        company_id: 'comp-joy-01',
        name: 'Joy Corporate Solutions Private Limited (HQ)',
        code: 'HQ-CBE',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        timezone: 'Asia/Kolkata',
        created_at: '2024-01-01T00:00:00Z',
      },
    ];
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
        if (!error && data && data.length > 0) {
          setStorage(KEYS.LOCATIONS, data);
          return data;
        }
      } catch (err) {
        console.error('[API] Failed to fetch locations from Supabase:', err);
      }
    }
    const list = getStorage<Location[]>(KEYS.LOCATIONS, []);
    if (list.length > 0) {
      return branchId ? list.filter((l) => l.branch_id === branchId) : list;
    }
    return [
      {
        id: 'loc-cbe-01',
        branch_id: 'br-cbe-01',
        name: 'Joy Tech Park, Avinashi Road',
        building: 'Tower A, 4th Floor',
        address: 'Coimbatore, Tamil Nadu 641014',
        code: 'LOC-CBE-01',
        created_at: '2024-01-01T00:00:00Z',
      },
    ];
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
        if (!error && data && data.length > 0) {
          setStorage(KEYS.DEPARTMENTS, data);
          return data;
        }
      } catch (err) {
        console.error('[API] Failed to fetch departments from Supabase:', err);
      }
    }
    const list = getStorage<Department[]>(KEYS.DEPARTMENTS, []);
    if (list.length > 0) {
      return companyId ? list.filter((d) => d.company_id === companyId) : list;
    }
    // Dynamic fallback matching active employees
    return [
      { id: 'dept-hr-01', company_id: 'comp-joy-01', name: 'Human Resources', code: 'HR', employee_count: 1 },
      { id: 'dept-eng', company_id: 'comp-joy-01', name: 'Engineering & Management', code: 'ENG-MGMT', employee_count: 1 },
    ];
  },

  async createDepartment(input: Omit<Department, 'id'>): Promise<Department> {
    const newDept: Department = { ...input, id: `dept-${Date.now().toString(36)}`, employee_count: 0 };
    if (isSupabaseEnabled) {
      try {
        const { error } = await supabase.from('departments').insert(newDept);
        if (error) throw error;
      } catch (err) {
        console.error('[API] Failed to insert department into Supabase:', err);
        throw err;
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
    if (isSupabaseEnabled) {
      try {
        let q = supabase.from('designations').select('*');
        if (companyId) q = q.eq('company_id', companyId);
        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          setStorage(KEYS.DESIGNATIONS, data);
          return data;
        }
      } catch (err) {
        console.error('[API] Failed to fetch designations from Supabase:', err);
      }
    }
    const list = getStorage<Designation[]>(KEYS.DESIGNATIONS, []);
    if (list.length > 0) {
      return companyId ? list.filter((d) => d.company_id === companyId) : list;
    }
    return [
      { id: 'desig-hr-01', company_id: 'comp-joy-01', title: 'HR Head & People Operations', code: 'HR-HEAD', grade: 'L6' },
      { id: 'desig-sr-eng', company_id: 'comp-joy-01', title: 'Software Engineer & Administrator', code: 'SWE-ADMIN', grade: 'L4' },
    ];
  },

  async createDesignation(input: Omit<Designation, 'id'>): Promise<Designation> {
    const newDesig: Designation = { ...input, id: `desig-${Date.now().toString(36)}` };
    if (isSupabaseEnabled) {
      try {
        const { error } = await supabase.from('designations').insert(newDesig);
        if (error) throw error;
      } catch (err) {
        console.error('[API] Failed to insert designation into Supabase:', err);
        throw err;
      }
    }
    const list = getStorage<Designation[]>(KEYS.DESIGNATIONS, []);
    setStorage(KEYS.DESIGNATIONS, [newDesig, ...list]);
    return newDesig;
  },

  // ==========================================
  // Employees API (Direct Realtime Supabase)
  // ==========================================
  async getEmployees(params?: {
    search?: string;
    departmentId?: string;
    companyId?: string;
    status?: string;
    type?: string;
    source?: string;
    vendorId?: string;
  } | string): Promise<Employee[]> {
    if (isSupabaseEnabled) {
      try {
        let q = supabase.from('employees').select('*');
        const filterObj = typeof params === 'string' ? { companyId: params } : params;
        if (filterObj?.companyId) q = q.eq('company_id', filterObj.companyId);
        if (filterObj?.departmentId && filterObj.departmentId !== 'all') q = q.eq('department_id', filterObj.departmentId);
        if (filterObj?.status && filterObj.status !== 'all') q = q.eq('status', filterObj.status);
        if (filterObj?.source && filterObj.source !== 'all') q = q.eq('employment_source', filterObj.source);
        if (filterObj?.vendorId && filterObj.vendorId !== 'all') q = q.eq('vendor_id', filterObj.vendorId);
        const { data, error } = await q;
        if (!error && data !== null && data.length > 0) {
          setStorage(KEYS.EMPLOYEES, data);
          return data;
        }
        // If 0 returned with companyId filter, fallback to query all active employees from Supabase
        if (!error && data !== null && data.length === 0 && filterObj?.companyId) {
          const fallback = await supabase.from('employees').select('*');
          if (fallback.data && fallback.data.length > 0) {
            setStorage(KEYS.EMPLOYEES, fallback.data);
            return fallback.data;
          }
        }
        if (error) {
          console.error('[API] Supabase getEmployees error:', error);
        }
      } catch (err) {
        console.error('[API] Failed to fetch employees from Supabase:', err);
      }
    }

    let list = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
    if (!list || list.length === 0) {
      list = [...DEFAULT_EMPLOYEES];
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
    if (filterObj && filterObj.companyId) {
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

  async getEmployeeById(id: string): Promise<Employee | undefined> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.from('employees').select('*').eq('id', id).maybeSingle();
        if (data && !error) return data;
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
        const cleanEmp = sanitizeEmployeeForSupabase(newEmp);
        const { error } = await supabase.from('employees').insert(cleanEmp);
        if (error) {
          console.error('[API] Supabase employee insert error:', error);
          throw error;
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
          try {
            await supabase.from('employee_statutory_details').upsert({
              id: `stat-${newEmp.id}`,
              employee_id: newEmp.id,
              pan_number: s.pan || s.pan_number || '',
              uan_number: s.uan || s.uan_number || '',
              pf_number: s.pf_number || '',
              esi_number: s.esi_number || '',
              tax_regime: s.tax_regime || 'NEW',
              updated_at: new Date().toISOString(),
            });
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

          const { data: selectData, error: directErr } = await supabase
            .from('employees')
            .update(cleanFallback)
            .eq('id', id)
            .select('*')
            .single();

          if (directErr) {
            logger.error('DB', 'EMPLOYEE_UPDATE_FAILED', directErr, { correlationId, employeeId: id, table: 'employees' });
            throw directErr;
          } else if (selectData) {
            canonicalRecord = selectData as Employee;
            logger.db('EMPLOYEE_UPDATE_SUCCESS', {
              correlationId,
              table: 'employees',
              employeeId: id,
              operation: 'UPDATE',
              status: 'SUCCESS',
              rows: 1,
            });
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
              account_holder_name: b.account_holder_name || `${existing.first_name} ${existing.last_name}`.trim(),
              is_primary: true,
              updated_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('[API] Bank update warning:', e);
          }
        }

        // Upsert Statutory Details if provided
        if ((data as any).statutory || (data as any).pan || (data as any).uan) {
          const s = (data as any).statutory || data;
          try {
            await supabase.from('employee_statutory_details').upsert({
              id: `stat-${id}`,
              employee_id: id,
              pan_number: s.pan || s.pan_number || '',
              uan_number: s.uan || s.uan_number || '',
              pf_number: s.pf_number || '',
              esi_number: s.esi_number || '',
              tax_regime: s.tax_regime || 'NEW',
              updated_at: new Date().toISOString(),
            });
          } catch (e) {
            console.warn('[API] Statutory update warning:', e);
          }
        }
      } catch (err: any) {
        if (err?.code === 'CONCURRENCY_CONFLICT' || err?.status === 409) {
          throw err;
        }
        logger.error('DB', 'SUPABASE_EXCEPTION', err, { correlationId, employeeId: id });
        throw err;
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
  async getRoles(): Promise<Role[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.from('roles').select('*');
        if (!error && data) {
          setStorage(KEYS.ROLES, data);
          return data;
        }
      } catch (err) {
        console.error('[API] Failed to fetch roles from Supabase:', err);
      }
    }
    return getStorage<Role[]>(KEYS.ROLES, []);
  },

  // ==========================================
  // Users API
  // ==========================================
  async getUsers(): Promise<User[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) {
          setStorage(KEYS.USERS, data);
          return data;
        }
      } catch (err) {
        console.error('[API] Failed to fetch users from Supabase:', err);
      }
    }
    return getStorage<User[]>(KEYS.USERS, []);
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
  getActiveCompany(): Company | null {
    const comp = getStorage<Company | null>(KEYS.ACTIVE_COMPANY, null);
    if (comp) return comp;
    return DEFAULT_LEGAL_ENTITIES[0];
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
};
