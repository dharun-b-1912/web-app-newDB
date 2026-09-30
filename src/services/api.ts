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
  Vendor,
} from '../types';
import { supabase, isSupabaseEnabled, ensureSupabaseSession } from '../lib/supabase';
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
  VENDORS: 'workforce_vendors',
};

export const DEFAULT_COMPANIES: Company[] = [
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

export const DEFAULT_BRANCHES: Branch[] = [
  {
    id: 'fc1782e6-fb46-47e8-a428-9da95e5a4f6f',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    name: 'Coimbatore Campus (HQ)',
    code: 'CBE-HQ',
    branch_type: 'HEADQUARTERS',
    country: 'India',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    address: 'Avinashi Road, Peelamedu, Coimbatore',
    postal_code: '641004',
    timezone: 'Asia/Kolkata',
    status: 'Active',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'b-102',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    name: 'Chennai Regional Office',
    code: 'CHN-01',
    branch_type: 'REGIONAL_OFFICE',
    country: 'India',
    city: 'Chennai',
    state: 'Tamil Nadu',
    address: 'OMR IT Corridor, Chennai',
    postal_code: '600096',
    timezone: 'Asia/Kolkata',
    status: 'Active',
    created_at: '2024-01-01T00:00:00Z',
  },
];

export const DEFAULT_DEPARTMENTS: Department[] = [
  {
    id: '0cdef8b4-014c-4487-895c-cf264824a0da',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    name: 'Engineering & Development',
    code: 'ENG',
    description: 'Software Product Engineering, Web and Mobile App Development',
    status: 'Active',
    employee_count: 2,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '70d63528-7aa9-4630-adcc-b7a6194250cd',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    name: 'Human Resources',
    code: 'HR',
    description: 'People Operations, Talent Acquisition, Statutory & Payroll',
    status: 'Active',
    employee_count: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
];

export const DEFAULT_DESIGNATIONS: Designation[] = [
  {
    id: 'fd2762cd-b1bb-402e-a7ee-81a80aa0eab7',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    title: 'Senior Software Engineer',
    code: 'SSE',
    grade: 'L4 - Senior',
  },
  {
    id: '0dfa6748-c76b-4867-a9f4-59eaf6804a44',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    title: 'HR Operations Specialist',
    code: 'HROS',
    grade: 'L3 - Mid Level',
  },
];

export const DEFAULT_LOCATIONS: Location[] = [
  {
    id: 'loc-101',
    branch_id: 'fc1782e6-fb46-47e8-a428-9da95e5a4f6f',
    name: 'Coimbatore HQ Main Facility',
    address: 'Avinashi Road, Peelamedu, Coimbatore, Tamil Nadu 641004',
    latitude: 11.0168,
    longitude: 76.9558,
    geofence_radius_meters: 100,
    is_geofencing_enabled: true,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
  },
];

const _nodeApiFallback = new Map<string, string>();

// Synchronous module-load cleanup: strip all pre-seeded 21 workers & fabricated attendance caches before any component renders
(function purgeSeededLocalStateSync() {
  if (typeof localStorage === 'undefined') return;
  try {
    const PURGE_TOKEN = 'wf_strict_zero_seed_v8';
    const shouldFullPurge = localStorage.getItem('wf_zero_seed_token') !== PURGE_TOKEN;

    const allKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) allKeys.push(k);
    }

    for (const k of allKeys) {
      if (
        k.startsWith('workforce_21_workers') ||
        k.startsWith('workforce_attendance_inputs') ||
        k.startsWith('workforce_excel_test_data') ||
        (shouldFullPurge && (
          k.startsWith('workforceos_attendance_daily_v2') ||
          k.startsWith('workforceos_attendance_regularizations_v2') ||
          k.startsWith('workforce_payroll_runs') ||
          k.startsWith('workforce_payroll_salaries') ||
          k.startsWith('workforce_payroll_canteen') ||
          k.startsWith('workforce_payroll_advances') ||
          k.startsWith('joy_redis_') ||
          k.startsWith('upstash_redis_')
        ))
      ) {
        localStorage.removeItem(k);
      }
    }

    // Always sanitize workforce_employees in localStorage to remove any CE0* or non-UUID seeded workers
    const rawEmps = localStorage.getItem('workforce_employees');
    if (rawEmps) {
      const parsed = JSON.parse(rawEmps);
      if (Array.isArray(parsed)) {
        const cleanEmps = parsed.filter((e: any) => {
          const id = String(e?.id || '');
          const code = String(e?.employee_code || '').toUpperCase();
          const email = String(e?.work_email || '').toLowerCase();
          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
          return isUuid && !code.startsWith('CE0') && !email.includes('@plant.joycorporatesolutions.com');
        });
        if (cleanEmps.length !== parsed.length) {
          localStorage.setItem('workforce_employees', JSON.stringify(cleanEmps));
        }
      }
    }

    if (shouldFullPurge) {
      localStorage.setItem('wf_zero_seed_token', PURGE_TOKEN);
    }
  } catch (_) {}
})();

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

  const clean: Record<string, any> = {};

  if (emp.id) clean.id = ensureUUID(emp.id);
  if (emp.organization_id) clean.organization_id = isValidUUID(emp.organization_id) ? emp.organization_id : '0c621892-e938-4707-9957-13534ea32c19';
  if (emp.company_id && isValidUUID(emp.company_id)) {
    clean.company_id = emp.company_id;
  } else {
    const cachedCompanies = getStorage<Company[]>(KEYS.COMPANIES, []);
    const validComp = cachedCompanies.find((c) => isValidUUID(c.id));
    clean.company_id = validComp ? validComp.id : '0c621892-e938-4707-9957-13534ea32c19';
  }
  const rawDeptId = emp.department_id || emp.employment?.department_id || 'dept-eng';
  clean.department_id = isValidUUID(rawDeptId) ? rawDeptId : ensureUUID(rawDeptId);
  const rawDesigId = emp.designation_id || emp.employment?.designation_id || 'desig-se';
  clean.designation_id = isValidUUID(rawDesigId) ? rawDesigId : ensureUUID(rawDesigId);
  const rawBranchId = emp.branch_id || emp.employment?.branch_id || 'br-hq';
  clean.branch_id = isValidUUID(rawBranchId) ? rawBranchId : ensureUUID(rawBranchId);
  if (emp.reporting_manager_id && isValidUUID(emp.reporting_manager_id)) clean.reporting_manager_id = emp.reporting_manager_id;
  if (emp.user_id && isValidUUID(emp.user_id)) clean.user_id = emp.user_id;

  clean.employee_code = String(emp.employee_code || (emp.identity?.employee_code) || `WF-${Math.floor(1000 + Math.random() * 9000)}`).trim();
  if (emp.first_name) clean.first_name = String(emp.first_name).trim();
  if (emp.middle_name) clean.middle_name = String(emp.middle_name).trim();
  if (emp.last_name) clean.last_name = String(emp.last_name).trim();
  clean.display_name = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee';
  if (emp.work_email) clean.work_email = String(emp.work_email).trim();
  if (emp.personal_email || emp.profile?.personal_email) clean.personal_email = String(emp.personal_email || emp.profile?.personal_email).trim();
  if (emp.phone || emp.primary_mobile || emp.profile?.phone) clean.phone = String(emp.phone || emp.primary_mobile || emp.profile?.phone).trim();

  // Gender enum normalization: 'MALE' | 'FEMALE' | 'NON_BINARY' | 'PREFER_NOT_TO_SAY'
  const rawGender = String(emp.gender || emp.profile?.gender || 'MALE').toUpperCase().replace(/[\s-]/g, '_');
  if (rawGender.includes('FEMALE')) clean.gender = 'FEMALE';
  else if (rawGender.includes('NON_BINARY')) clean.gender = 'NON_BINARY';
  else if (rawGender.includes('PREFER')) clean.gender = 'PREFER_NOT_TO_SAY';
  else clean.gender = 'MALE';

  if (emp.dob || emp.profile?.dob || emp.profile?.date_of_birth) clean.dob = emp.dob || emp.profile?.dob || emp.profile?.date_of_birth;
  clean.doj = emp.doj || emp.employment?.doj || new Date().toISOString().split('T')[0];
  if (emp.confirmation_date || emp.employment?.confirmation_date) clean.confirmation_date = emp.confirmation_date || emp.employment?.confirmation_date;

  // Employment Type enum: 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERN'
  const rawType = String(emp.employment_type || emp.employment?.employment_type || 'FULL_TIME').toUpperCase().replace(/[\s-]/g, '_');
  if (rawType.includes('PART')) clean.employment_type = 'PART_TIME';
  else if (rawType.includes('CONTRACT')) clean.employment_type = 'CONTRACT';
  else if (rawType.includes('INTERN')) clean.employment_type = 'INTERN';
  else clean.employment_type = 'FULL_TIME';

  // Employment Status enum: 'ACTIVE' | 'PROBATION' | 'NOTICE_PERIOD' | 'SUSPENDED' | 'TERMINATED' | 'RESIGNED'
  const rawStatus = String(emp.status || emp.employment_status || 'ACTIVE').toUpperCase().replace(/[\s-]/g, '_');
  if (rawStatus.includes('PROBATION')) clean.employment_status = 'PROBATION';
  else if (rawStatus.includes('NOTICE')) clean.employment_status = 'NOTICE_PERIOD';
  else if (rawStatus.includes('SUSPEND')) clean.employment_status = 'SUSPENDED';
  else if (rawStatus.includes('TERMINAT')) clean.employment_status = 'TERMINATED';
  else if (rawStatus.includes('RESIGN')) clean.employment_status = 'RESIGNED';
  else clean.employment_status = 'ACTIVE';

  if (emp.avatar_url) clean.avatar_url = emp.avatar_url;
  if (emp.created_at) clean.created_at = emp.created_at;
  clean.updated_at = new Date().toISOString();

  return clean;
}

const DEFAULT_LEGAL_ENTITIES: Company[] = [];

export const DEFAULT_EMPLOYEES: Employee[] = [];

export const isValidUUID = (id?: string | null): boolean => {
  if (!id) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const ensureUUID = (id?: string | null): string => {
  if (id && isValidUUID(id)) return id;
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const hasAuthenticatedSession = async (): Promise<boolean> => {
  if (!isSupabaseEnabled || !supabase) return false;
  return true;
};

export function filterEmployeesLocalHelper(list: Employee[], params?: any): Employee[] {
  if (!params) return list;

  const filterObj = typeof params === 'string' ? { companyId: params } : params;
  let filtered = [...list];
  if (filterObj && filterObj.search) {
    const q = typeof filterObj.search === 'string' ? filterObj.search.toLowerCase() : String(filterObj.search).toLowerCase();
    filtered = filtered.filter(
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
    if (isValidUUID(filterObj.companyId)) {
      filtered = filtered.filter((e) => e.company_id === filterObj.companyId);
    }
  }
  if (filterObj && filterObj.departmentId && filterObj.departmentId !== 'all') {
    if (isValidUUID(filterObj.departmentId)) {
      filtered = filtered.filter((e) => e.department_id === filterObj.departmentId);
    }
  }
  if (filterObj && filterObj.status && filterObj.status !== 'all') {
    filtered = filtered.filter((e) => e.status === filterObj.status);
  }
  if (filterObj && filterObj.source && filterObj.source !== 'all') {
    filtered = filtered.filter((e) => (e.employment_source || 'DIRECT') === filterObj.source);
  }
  if (filterObj && filterObj.vendorId && filterObj.vendorId !== 'all') {
    if (isValidUUID(filterObj.vendorId)) {
      filtered = filtered.filter((e) => e.vendor_id === filterObj.vendorId);
    }
  }
  return filtered;
}

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
        const { data, error } = await supabase.from('organizations').select('*').limit(1).maybeSingle();
        if (!error && data) {
          const org: Organization = {
            id: data.id,
            name: data.display_name || data.legal_name || data.name || 'Joy Corporate Solutions',
            slug: data.slug || 'joy-corporate-solutions',
            status: data.status === 'ACTIVE' ? 'Active' : (data.status || 'Active'),
            plan: data.plan || 'Enterprise',
            default_currency: data.currency || 'INR',
            timezone: data.timezone || 'Asia/Kolkata',
            created_at: data.created_at || '2024-01-01T00:00:00Z',
            updated_at: data.updated_at || '2024-01-01T00:00:00Z',
          };
          setStorage(KEYS.ORG, org);
          return org;
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

  async provisionInitialOrganization(payload: {
    organization_name: string;
    organization_slug?: string;
    organization_code?: string;
    country?: string;
    currency?: string;
    timezone?: string;
    initial_company_name?: string;
    initial_company_code?: string;
    user_full_name?: string;
  }): Promise<{
    success: boolean;
    organization_id: string;
    organization_name: string;
    organization_slug: string;
    company_id: string;
    user_profile_id: string;
    role_id: string;
  }> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.rpc('fn_provision_initial_organization', {
          p_organization_name: payload.organization_name,
          p_organization_slug: payload.organization_slug,
          p_organization_code: payload.organization_code,
          p_country: payload.country || 'IN',
          p_currency: payload.currency || 'INR',
          p_timezone: payload.timezone || 'Asia/Kolkata',
          p_initial_company_name: payload.initial_company_name,
          p_initial_company_code: payload.initial_company_code,
          p_user_full_name: payload.user_full_name,
        });
        if (error) throw error;
        if (data && (data as any).success) {
          return data as any;
        }
      } catch (err) {
        console.error('[API] Failed to provision initial organization via RPC:', err);
        throw err;
      }
    }
    const orgId = `org-${Date.now().toString(36)}`;
    const compId = `comp-${Date.now().toString(36)}`;
    return {
      success: true,
      organization_id: orgId,
      organization_name: payload.organization_name,
      organization_slug: payload.organization_slug || 'org-main',
      company_id: compId,
      user_profile_id: `usr-${Date.now().toString(36)}`,
      role_id: `role-admin`,
    };
  },

  // ==========================================
  // Company API
  // ==========================================

  async getCompanies(): Promise<Company[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.from('companies').select('*').order('created_at', { ascending: true });
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
          setStorage(KEYS.COMPANIES, mapped);
          return mapped;
        }
      } catch (err) {
        console.error('[API] Failed to fetch companies from Supabase:', err);
      }
    }
    const list = getStorage<Company[]>(KEYS.COMPANIES, DEFAULT_COMPANIES);
    if (!list || list.length === 0) {
      setStorage(KEYS.COMPANIES, DEFAULT_COMPANIES);
      return DEFAULT_COMPANIES;
    }
    return list;
  },

  async createCompany(input: Omit<Company, 'id' | 'created_at'>): Promise<Company> {
    const orgId = input.organization_id || (typeof window !== 'undefined' ? localStorage.getItem('workforce_active_org_id') : null) || '';
    const tempId = `comp-${Date.now().toString(36)}`;
    const code = (input as any).company_code || `CMP-${Math.floor(1000 + Math.random() * 9000)}`;

    const newCompany: Company = {
      ...input,
      id: tempId,
      created_at: new Date().toISOString(),
    };

    if (isSupabaseEnabled && orgId && isValidUUID(orgId)) {
      try {
        const dbPayload = {
          organization_id: orgId,
          legal_name: input.legal_name,
          trade_name: input.trade_name || input.legal_name,
          company_code: code,
          cin_number: input.statutory_registration_no || null,
          pan_number: input.tax_id || null,
          gstin: (input as any).gstin || null,
          registered_address: input.address || null,
          city: input.city || 'Coimbatore',
          state: (input as any).state || 'Tamil Nadu',
          postal_code: (input as any).postal_code || '641001',
          country: input.country || 'India',
          is_headquarters: Boolean((input as any).is_headquarters),
          is_active: input.status !== 'Inactive',
        };

        const { data, error } = await supabase.from('companies').insert([dbPayload]).select().single();
        if (!error && data) {
          const created: Company = {
            id: data.id,
            organization_id: data.organization_id,
            legal_name: data.legal_name,
            trade_name: data.trade_name || data.legal_name,
            statutory_registration_no: data.cin_number || input.statutory_registration_no || '',
            tax_id: data.pan_number || data.gstin || input.tax_id || '',
            country: data.country || 'India',
            city: data.city || 'Coimbatore',
            currency: 'INR',
            timezone: 'Asia/Kolkata',
            address: data.registered_address || input.address || '',
            status: data.is_active === false ? 'Inactive' : 'Active',
            created_at: data.created_at || new Date().toISOString(),
          };
          const list = getStorage<Company[]>(KEYS.COMPANIES, []);
          setStorage(KEYS.COMPANIES, [created, ...list.filter((c) => c.id !== created.id)]);
          return created;
        } else if (error) {
          console.warn('[API] Company insert notice:', error);
        }
      } catch (err) {
        console.warn('[API] Company insert fallback:', err);
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

    if (isSupabaseEnabled && isValidUUID(id)) {
      try {
        const dbUpdates: any = {};
        if (updates.legal_name) dbUpdates.legal_name = updates.legal_name;
        if (updates.trade_name) dbUpdates.trade_name = updates.trade_name;
        if (updates.statutory_registration_no) dbUpdates.cin_number = updates.statutory_registration_no;
        if (updates.tax_id) dbUpdates.pan_number = updates.tax_id;
        if (updates.address) dbUpdates.registered_address = updates.address;
        if (updates.city) dbUpdates.city = updates.city;
        if (updates.country) dbUpdates.country = updates.country;
        if (updates.status !== undefined) dbUpdates.is_active = updates.status !== 'Inactive';

        const { error } = await supabase.from('companies').update(dbUpdates).eq('id', id);
        if (error) console.warn('[API] Failed to update company in Supabase:', error);
      } catch (err) {
        console.warn('[API] Failed to update company in Supabase:', err);
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
        if (companyId && isValidUUID(companyId)) q = q.eq('company_id', companyId);
        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          const mapped = data.map((b: any) => ({
            ...b,
            code: b.branch_code || b.code,
            contact_phone: b.phone || b.contact_phone,
            contact_email: b.email || b.contact_email,
            status: b.is_active === false ? 'Inactive' : 'Active',
          }));
          setStorage(KEYS.BRANCHES, mapped);
          return mapped;
        }
      } catch (err) {
        console.error('[API] Failed to fetch branches from Supabase:', err);
      }
    }
    const list = getStorage<Branch[]>(KEYS.BRANCHES, DEFAULT_BRANCHES);
    if (!list || list.length === 0) {
      setStorage(KEYS.BRANCHES, DEFAULT_BRANCHES);
      return companyId ? DEFAULT_BRANCHES.filter((b) => b.company_id === companyId) : DEFAULT_BRANCHES;
    }
    return companyId ? list.filter((b) => b.company_id === companyId) : list;
  },

  async createBranch(input: Omit<Branch, 'id' | 'created_at'>): Promise<Branch> {
    const id = ensureUUID((input as any).id);
    let orgId = (input as any).organization_id || (typeof window !== 'undefined' ? localStorage.getItem('workforce_active_org_id') : null) || '';
    let compId = input.company_id && isValidUUID(input.company_id) ? input.company_id : (api.getActiveCompany()?.id && isValidUUID(api.getActiveCompany()?.id) ? api.getActiveCompany()!.id : '');
    const branchCode = (input as any).branch_code || input.code || 'BR01';

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
          if (prof?.organization_id) orgId = prof.organization_id;
        }
      } catch (_) {}
    }

    const newBranch: Branch = {
      ...input,
      id,
      company_id: compId,
      code: branchCode,
      created_at: new Date().toISOString(),
    };
    if (isSupabaseEnabled && orgId && compId) {
      try {
        const payload: Record<string, any> = {
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
        const { data, error } = await supabase.from('branches').insert(payload).select().single();
        if (error) throw error;
        if (data) {
          const mapped = { ...newBranch, ...data, code: data.branch_code };
          const list = getStorage<Branch[]>(KEYS.BRANCHES, []);
          setStorage(KEYS.BRANCHES, [mapped, ...list]);
          return mapped;
        }
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
        let q = supabase.from('work_locations').select('*');
        if (branchId && isValidUUID(branchId)) q = q.eq('branch_id', branchId);
        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          const mapped = data.map((l: any) => ({
            ...l,
            address: l.address_line1 || l.address,
            is_active: l.is_active ?? true,
          }));
          setStorage(KEYS.LOCATIONS, mapped);
          return mapped;
        }
      } catch (err) {
        console.error('[API] Failed to fetch locations from Supabase:', err);
      }
    }
    const list = getStorage<Location[]>(KEYS.LOCATIONS, DEFAULT_LOCATIONS);
    if (!list || list.length === 0) {
      setStorage(KEYS.LOCATIONS, DEFAULT_LOCATIONS);
      return branchId ? DEFAULT_LOCATIONS.filter((l) => l.branch_id === branchId) : DEFAULT_LOCATIONS;
    }
    return branchId ? list.filter((l) => l.branch_id === branchId) : list;
  },

  async createLocation(input: Omit<Location, 'id'>): Promise<Location> {
    const id = ensureUUID((input as any).id);
    let orgId = (input as any).organization_id || (typeof window !== 'undefined' ? localStorage.getItem('workforce_active_org_id') : null) || '';
    const newLoc: Location = { ...input, id };
    if (isSupabaseEnabled && orgId) {
      try {
        let branchId = newLoc.branch_id && isValidUUID(newLoc.branch_id) ? newLoc.branch_id : null;
        if (!branchId) {
          const { data: bList } = await supabase.from('branches').select('id').eq('organization_id', orgId).limit(1);
          if (bList && bList.length > 0) {
            branchId = bList[0].id;
          }
        }
        const payload: Record<string, any> = {
          id,
          organization_id: orgId,
          branch_id: branchId,
          name: newLoc.name,
          address_line1: (newLoc as any).address_line1 || newLoc.address || newLoc.name,
          latitude: newLoc.latitude ?? null,
          longitude: newLoc.longitude ?? null,
          geofence_radius_meters: (newLoc as any).geofence_radius_meters ?? 100,
          is_geofencing_enabled: true,
          is_active: (newLoc as any).is_active ?? true,
        };
        const { data, error } = await supabase.from('work_locations').insert(payload).select().single();
        if (error) throw error;
        if (data) {
          const mapped = { ...newLoc, ...data, address: data.address_line1 };
          const list = getStorage<Location[]>(KEYS.LOCATIONS, []);
          setStorage(KEYS.LOCATIONS, [mapped, ...list]);
          return mapped;
        }
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
        if (companyId && companyId !== 'all' && isValidUUID(companyId)) {
          q = q.eq('company_id', companyId);
        }
        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          setStorage(KEYS.DEPARTMENTS, data);
          return data;
        }
      } catch (err) {
        console.error('[API] Failed to fetch departments from Supabase:', err);
      }
    }
    const list = getStorage<Department[]>(KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
    if (!list || list.length === 0) {
      setStorage(KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
      return companyId && isValidUUID(companyId) ? DEFAULT_DEPARTMENTS.filter((d) => d.company_id === companyId) : DEFAULT_DEPARTMENTS;
    }
    return companyId && isValidUUID(companyId) ? list.filter((d) => d.company_id === companyId) : list;
  },

  getDepartmentsSync(companyId?: string): Department[] {
    const list = getStorage<Department[]>(KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
    if (!list || list.length === 0) {
      return companyId && isValidUUID(companyId) ? DEFAULT_DEPARTMENTS.filter((d) => d.company_id === companyId) : DEFAULT_DEPARTMENTS;
    }
    return companyId && isValidUUID(companyId) ? list.filter((d) => d.company_id === companyId) : list;
  },

  async createDepartment(input: Omit<Department, 'id'>): Promise<Department> {
    const id = ensureUUID((input as any).id);
    let orgId = (input as any).organization_id || (typeof window !== 'undefined' ? localStorage.getItem('workforce_active_org_id') : null) || '';
    let compId = input.company_id && isValidUUID(input.company_id) ? input.company_id : (api.getActiveCompany()?.id && isValidUUID(api.getActiveCompany()?.id) ? api.getActiveCompany()!.id : '');

    const newDept: Department = { ...input, id, company_id: compId, employee_count: 0 };
    if (isSupabaseEnabled && orgId && compId) {
      try {
        const payload: Record<string, any> = {
          id,
          organization_id: orgId,
          company_id: compId,
          name: newDept.name,
          code: newDept.code,
          parent_department_id: newDept.parent_department_id && isValidUUID(newDept.parent_department_id) ? newDept.parent_department_id : null,
          head_employee_id: newDept.head_employee_id && isValidUUID(newDept.head_employee_id) ? newDept.head_employee_id : null,
          is_active: newDept.status !== 'Inactive',
        };

        const { data, error } = await supabase.from('departments').insert(payload).select().single();
        if (error) {
          console.warn('[API] Department insert to Supabase notice:', error.message || error);
        } else if (data) {
          const merged = { ...newDept, ...data };
          const list = getStorage<Department[]>(KEYS.DEPARTMENTS, []);
          setStorage(KEYS.DEPARTMENTS, [merged, ...list]);
          return merged;
        }
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
    if (isSupabaseEnabled) {
      try {
        let q = supabase.from('designations').select('*').order('title', { ascending: true });
        if (companyId && isValidUUID(companyId)) {
          q = q.eq('company_id', companyId);
        }
        const { data, error } = await q;

        if (!error && data && data.length > 0) {
          setStorage(KEYS.DESIGNATIONS, data);
          return data;
        }
      } catch (err) {
        console.warn('[API] Failed to fetch designations from Supabase:', err);
      }
    }

    const list = getStorage<Designation[]>(KEYS.DESIGNATIONS, DEFAULT_DESIGNATIONS);
    if (!list || list.length === 0) {
      setStorage(KEYS.DESIGNATIONS, DEFAULT_DESIGNATIONS);
      return companyId && isValidUUID(companyId) ? DEFAULT_DESIGNATIONS.filter((d) => d.company_id === companyId) : DEFAULT_DESIGNATIONS;
    }
    return companyId && isValidUUID(companyId) ? list.filter((d) => d.company_id === companyId) : list;
  },

  async createDesignation(input: Omit<Designation, 'id'>): Promise<Designation> {
    const rawCode = input.code || input.title.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'DESIG';
    const id = ensureUUID((input as any).id);
    const orgId = (input as any).organization_id || (typeof window !== 'undefined' ? localStorage.getItem('workforce_active_org_id') : null) || 'e539780b-df07-4b45-beaa-ccf1d2224be8';
    const compId = input.company_id && isValidUUID(input.company_id) ? input.company_id : (api.getActiveCompany()?.id && isValidUUID(api.getActiveCompany()?.id) ? api.getActiveCompany()!.id : '5537b879-7299-48a4-bdfe-16e327a2d3d0');

    const newDesig: Designation = {
      id,
      title: input.title.trim(),
      code: rawCode,
      grade: input.grade || 'L3 - Mid Level',
      company_id: compId,
    };

    if (isSupabaseEnabled) {
      try {
        const payload: Record<string, any> = {
          id: newDesig.id,
          organization_id: orgId,
          company_id: compId,
          title: newDesig.title,
          code: newDesig.code,
          grade: newDesig.grade,
          is_active: true,
        };

        const { data, error } = await supabase.from('designations').upsert(payload, { onConflict: 'id' }).select().single();
        if (error) {
          console.warn('[API] Designation upsert to Supabase notice:', error.message || error);
        } else if (data) {
          const merged = { ...newDesig, ...data };
          const list = getStorage<Designation[]>(KEYS.DESIGNATIONS, []);
          const updated = [merged, ...list.filter((d) => d.id !== merged.id && d.title.toLowerCase() !== merged.title.toLowerCase())];
          setStorage(KEYS.DESIGNATIONS, updated);
          return merged;
        }
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
  filterEmployeesLocal(list: Employee[], params?: any): Employee[] {
    return filterEmployeesLocalHelper(list, params);
  },

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
    if (api._empCache?.data && api._empCache.data.length > 0) {
      list = [...api._empCache.data];
    } else {
      list = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
      if (isSupabaseEnabled && list.length > 0) {
        const cleanOnly = list.filter((e: any) =>
          isValidUUID(e?.id) &&
          !String(e?.employee_code || '').toUpperCase().startsWith('CE0') &&
          !String(e?.work_email || '').toLowerCase().includes('@plant.joycorporatesolutions.com')
        );
        if (cleanOnly.length !== list.length) {
          list = cleanOnly;
          setStorage(KEYS.EMPLOYEES, list);
        }
      }
      if (list.length > 0) {
        api._empCache = { data: list, timestamp: Date.now() };
      }
    }

    if (isSupabaseEnabled) {
      list = list.filter((e: any) =>
        isValidUUID(e?.id) &&
        !String(e?.employee_code || '').toUpperCase().startsWith('CE0') &&
        !String(e?.work_email || '').toLowerCase().includes('@plant.joycorporatesolutions.com')
      );
    }

    return filterEmployeesLocalHelper(list, params);
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
          await ensureSupabaseSession();
          let q = supabase.from('employees').select('*');
          const filterObj = typeof params === 'string' ? { companyId: params } : params;
          if (filterObj?.companyId && filterObj.companyId !== 'all') {
            if (isValidUUID(filterObj.companyId)) {
              q = q.eq('company_id', filterObj.companyId);
            }
          }
          if (filterObj?.departmentId && filterObj.departmentId !== 'all') {
            if (isValidUUID(filterObj.departmentId)) {
              q = q.eq('department_id', filterObj.departmentId);
            }
          }
          if (filterObj?.status && filterObj.status !== 'all') q = q.eq('employment_status', filterObj.status.toUpperCase());
          if (filterObj?.source && filterObj.source !== 'all') q = q.eq('employment_source', filterObj.source);
          if (filterObj?.vendorId && filterObj.vendorId !== 'all') {
            if (isValidUUID(filterObj.vendorId)) {
              q = q.eq('vendor_id', filterObj.vendorId);
            }
          }
          const { data, error } = await q;

          if (!error && data !== null) {
            // Authoritative remote response (preserving local outbox records)
            const localList = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
            if (data.length === 0) {
              if (localList.length > 0) {
                return filterEmployeesLocalHelper(localList, filterObj);
              }
              if (isUnfiltered) {
                setStorage(KEYS.EMPLOYEES, []);
                api._empCache = { data: [], timestamp: Date.now() };
              }
              return [];
            }

            // Concurrently fetch real Bank Accounts and Statutory records for all retrieved employees
            const empIds = data.map((e: any) => e.id);
            if (empIds.length > 0) {
              try {
                const [bRes, sRes] = await Promise.all([
                  supabase.from('employee_bank_details').select('*').in('employee_id', empIds),
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

                // Enrich with real relational manager, department, designation, and branch
                const empLookup = new Map<string, any>(data.map((e: any) => [e.id, e]));
                data.forEach((e: any) => {
                  const rawStat = (e.employment_status || e.status || 'ACTIVE').toUpperCase();
                  e.status = rawStat === 'PROBATION' ? 'Probation' : rawStat === 'NOTICE_PERIOD' ? 'Notice Period' : rawStat === 'TERMINATED' ? 'Terminated' : rawStat === 'RESIGNED' ? 'Resigned' : 'Active';
                  e.employment_status = e.employment_status || rawStat;

                  e.profile = e.profile || {
                    personal_email: e.personal_email || undefined,
                    phone: e.phone || undefined,
                    date_of_birth: e.dob || undefined,
                    gender: e.gender || undefined,
                  };
                  if (e.phone) {
                    e.primary_mobile = e.primary_mobile || e.phone;
                    e.profile.phone = e.profile.phone || e.phone;
                  }
                  if (e.personal_email) {
                    e.profile.personal_email = e.profile.personal_email || e.personal_email;
                  }

                  e.employment = e.employment || {
                    doj: e.doj || '2026-09-01',
                    employment_type: e.employment_type || 'FULL_TIME',
                    reporting_manager_id: e.reporting_manager_id || null,
                  };

                  if (e.reporting_manager_id) {
                    const mgr = empLookup.get(e.reporting_manager_id);
                    if (mgr) {
                      e.reporting_manager_name = `${mgr.display_name || `${mgr.first_name || ''} ${mgr.last_name || ''}`.trim()} (${mgr.employee_code || 'MGR'})`;
                    }
                  }

                  const dId = String(e.department_id || '').toLowerCase();
                  if (dId.includes('0cdef8b4') || dId.includes('eng') || dId.includes('dev')) {
                    e.department = e.department || 'Engineering & Development';
                    e.department_name = e.department_name || 'Engineering & Development';
                  } else if (dId.includes('hr') || dId.includes('70d63528')) {
                    e.department = e.department || 'Human Resources';
                    e.department_name = e.department_name || 'Human Resources';
                  } else {
                    e.department = e.department || e.department_name || 'Engineering & Development';
                    e.department_name = e.department_name || e.department || 'Engineering & Development';
                  }

                  const desId = String(e.designation_id || '').toLowerCase();
                  if (desId.includes('fd2762cd') || desId.includes('se') || desId.includes('dev')) {
                    e.designation = e.designation || 'Senior Software Engineer';
                    e.designation_title = e.designation_title || 'Senior Software Engineer';
                  } else if (desId.includes('0dfa6748') || desId.includes('hr')) {
                    e.designation = e.designation || 'HR Operations Specialist';
                    e.designation_title = e.designation_title || 'HR Operations Specialist';
                  } else {
                    e.designation = e.designation || e.designation_title || 'Software Engineer';
                    e.designation_title = e.designation_title || e.designation || 'Software Engineer';
                  }

                  e.branch_name = e.branch_name || 'Coimbatore Campus (HQ)';
                  e.location = e.location || 'Coimbatore Campus (HQ)';
                  e.company_name = e.company_name || 'Joy Corporate Solutions Pvt Ltd';
                });
              } catch (_) {}
            }

            const combined = data.filter((e: any) =>
              isValidUUID(e?.id) &&
              !String(e?.employee_code || '').toUpperCase().startsWith('CE0') &&
              !String(e?.work_email || '').toLowerCase().includes('@plant.joycorporatesolutions.com')
            );
            const resultList = filterObj ? filterEmployeesLocalHelper(combined, filterObj) : combined;
            if (isUnfiltered) {
              setStorage(KEYS.EMPLOYEES, combined);
              api._empCache = { data: combined, timestamp: Date.now() };
            }
            return resultList;
          }
          if (error) {
            console.warn('[API] Supabase getEmployees error:', error.message || error);
            if (!isSupabaseEnabled) {
              return api.getEmployeesSync(params);
            }
            return [];
          }
        } catch (err) {
          console.warn('[API] Supabase getEmployees fetch notice:', err);
          if (!isSupabaseEnabled) {
            return api.getEmployeesSync(params);
          }
          return [];
        }
      }

      const syncResult = api.getEmployeesSync(params);
      if (isUnfiltered) {
        api._empCache = { data: syncResult, timestamp: Date.now() };
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
    const cachedList = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
    const cachedEmp = cachedList.find((e) => e.id === id);

    if (isSupabaseEnabled) {
      try {
        const [empRes, bankRes, statRes, emgRes, salRes, docRes, profRes, addrRes] = await Promise.all([
          supabase.from('employees').select('*').eq('id', id).maybeSingle(),
          supabase.from('employee_bank_details').select('*').eq('employee_id', id).maybeSingle(),
          supabase.from('employee_statutory_details').select('*').eq('employee_id', id).maybeSingle(),
          supabase.from('employee_emergency_contacts').select('*').eq('employee_id', id).order('is_primary', { ascending: false }),
          supabase.from('employee_salary_assignments').select('*').eq('employee_id', id).order('effective_from', { ascending: false }).limit(1).maybeSingle(),
          supabase.from('employee_documents').select('*').eq('employee_id', id),
          Promise.resolve(supabase.from('employee_profiles').select('*').eq('employee_id', id).maybeSingle()).catch(() => ({ data: null })),
          Promise.resolve(supabase.from('employee_addresses').select('*').eq('employee_id', id)).catch(() => ({ data: null })),
        ]);

        if (empRes?.data && !empRes.error) {
          const emp: any = {
            ...(cachedEmp || {}),
            ...empRes.data,
            profile: {
              ...(cachedEmp?.profile || {}),
              ...(empRes.data.profile || {}),
            },
            employment: {
              ...(cachedEmp?.employment || {}),
              ...(empRes.data.employment || {}),
            },
          };

          // Personal email from employee record or profile
          if (empRes.data.personal_email) {
            emp.personal_email = empRes.data.personal_email;
            emp.profile.personal_email = empRes.data.personal_email;
          }

          // Hydrate demographic fallbacks
          if (!emp.profile.phone && emp.phone) emp.profile.phone = emp.phone;
          if (!emp.profile.primary_mobile && emp.phone) emp.profile.primary_mobile = emp.phone;
          if (!emp.profile.date_of_birth && emp.dob) emp.profile.date_of_birth = emp.dob;
          if (!emp.profile.gender && emp.gender) emp.profile.gender = emp.gender;

          // Hydrate from employee_profiles table if available
          if (profRes?.data) {
            emp.profile.marital_status = profRes.data.marital_status || emp.profile.marital_status;
            emp.profile.blood_group = profRes.data.blood_group || emp.profile.blood_group;
            emp.profile.nationality = profRes.data.nationality || emp.profile.nationality;
            if (profRes.data.emergency_contact_name) {
              emp.profile.emergency_contact_name = profRes.data.emergency_contact_name;
              emp.profile.emergency_contact_phone = profRes.data.emergency_contact_phone;
              emp.profile.emergency_contact_relationship = profRes.data.emergency_contact_relationship;
            }
          }

          // Hydrate from employee_addresses table if available
          if (addrRes?.data && Array.isArray(addrRes.data) && addrRes.data.length > 0) {
            const present = addrRes.data.find((a: any) => a.address_type === 'PRESENT');
            const perm = addrRes.data.find((a: any) => a.address_type === 'PERMANENT');
            if (present) {
              emp.profile.current_address = {
                line1: present.address_line1 || '',
                line2: present.address_line2 || '',
                city: present.city || '',
                state: present.state || '',
                country: present.country || 'India',
                postal_code: present.postal_code || '',
              };
            }
            if (perm) {
              emp.profile.permanent_address = {
                line1: perm.address_line1 || '',
                line2: perm.address_line2 || '',
                city: perm.city || '',
                state: perm.state || '',
                country: perm.country || 'India',
                postal_code: perm.postal_code || '',
              };
            }
          }

          // Hydrate Bank Details
          if (bankRes?.data) {
            emp.bank = {
              bank_name: bankRes.data.bank_name,
              account_number: bankRes.data.account_number,
              ifsc: bankRes.data.ifsc_code,
              ifsc_code: bankRes.data.ifsc_code,
              account_type: bankRes.data.account_type,
              account_holder_name: bankRes.data.account_holder_name,
            };
            emp.profile.bank_account = emp.bank;
          }

          // Hydrate Statutory Details
          if (statRes?.data) {
            emp.statutory = {
              pan: statRes.data.pan_number,
              pan_number: statRes.data.pan_number,
              uan: statRes.data.uan_number,
              uan_number: statRes.data.uan_number,
              pf_number: statRes.data.pf_number,
              esi_number: statRes.data.esi_number,
              tax_regime: statRes.data.tax_regime,
              pf_applicable: statRes.data.pf_applicable !== undefined ? statRes.data.pf_applicable : (statRes.data.is_pf_eligible ?? true),
              esi_applicable: statRes.data.esi_applicable !== undefined ? statRes.data.esi_applicable : (statRes.data.is_esi_eligible ?? false),
              pt_applicable: statRes.data.pt_applicable !== undefined ? statRes.data.pt_applicable : (statRes.data.is_pt_eligible ?? true),
            };
            emp.profile.statutory = emp.statutory;
          }

          // Hydrate Emergency Contacts
          if (emgRes?.data && emgRes.data.length > 0) {
            emp.emergency_contacts = emgRes.data;
            emp.profile.emergency_contacts = emgRes.data;
            const primaryEmg = emgRes.data[0];
            emp.profile.emergency_contact_name = primaryEmg.name;
            emp.profile.emergency_contact_phone = primaryEmg.primary_phone;
            emp.profile.emergency_contact_relationship = primaryEmg.relationship;
          }

          // Hydrate Salary Assignment & Compensation
          if (salRes?.data) {
            emp.salary_assignment = salRes.data;
            emp.annual_ctc = Number(salRes.data.annual_ctc) || emp.annual_ctc;
            emp.monthly_gross = Number(salRes.data.gross_monthly || salRes.data.monthly_gross) || emp.monthly_gross;
            emp.ctc = emp.annual_ctc;
            if (emp.employment) {
              emp.employment.annual_ctc = emp.annual_ctc;
              emp.employment.monthly_gross = emp.monthly_gross;
              emp.employment.salary_structure_id = salRes.data.salary_structure_id;
            }
          }

          // Hydrate Documents
          if (docRes?.data && docRes.data.length > 0) {
            emp.documents = docRes.data;
          }

          // Update local cache
          const list = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
          const updatedList = list.some((e) => e.id === emp.id)
            ? list.map((e) => (e.id === emp.id ? { ...e, ...emp } : e))
            : [emp, ...list];
          setStorage(KEYS.EMPLOYEES, updatedList);
          if (this._empCache?.data) {
            this._empCache.data = updatedList;
          }

          return emp;
        }
      } catch (err) {
        console.error('[API] Supabase getEmployeeById error:', err);
      }
    }

    if (cachedEmp) return cachedEmp;

    const list = await this.getEmployees();
    return list.find((e) => e.id === id);
  },

  async saveEmployeeOnboardingStep(
    employeeId: string,
    organizationId: string,
    stepNumber: number,
    formData: any
  ): Promise<Employee> {
    const existing = (await this.getEmployeeById(employeeId)) || ({} as any);
    let compId = existing.company_id || api.getActiveCompany()?.id;
    let orgId = organizationId || existing.organization_id;

    if (isSupabaseEnabled && (!compId || !isValidUUID(compId))) {
      try {
        const { data: firstComp } = await supabase.from('companies').select('id, organization_id').limit(1).maybeSingle();
        if (firstComp) {
          compId = firstComp.id;
          if (!orgId) orgId = firstComp.organization_id;
        }
      } catch (_) {}
    }
    if (!orgId) orgId = 'org-joy-01';
    if (!compId) compId = 'comp-joy-01';

    const mergedProfile: any = {
      ...(existing.profile || {}),
    };

    const mergedEmployment: any = {
      ...(existing.employment || {}),
    };

    const employeePatch: Record<string, any> = {
      id: employeeId,
      organization_id: orgId,
      company_id: compId,
      updated_at: new Date().toISOString(),
    };

    if (stepNumber === 1) {
      // Step 1: Identity
      const code = formData.employee_code?.trim() || existing.employee_code || `WF-${Math.floor(1000 + Math.random() * 9000)}`;
      employeePatch.employee_code = code;
      if (formData.first_name !== undefined) employeePatch.first_name = formData.first_name.trim();
      if (formData.middle_name !== undefined) employeePatch.middle_name = formData.middle_name.trim();
      if (formData.last_name !== undefined) employeePatch.last_name = formData.last_name.trim();
      employeePatch.display_name = formData.preferred_name?.trim() || `${employeePatch.first_name || existing.first_name || ''} ${employeePatch.last_name || existing.last_name || ''}`.trim() || 'Employee';
      if (formData.work_email) employeePatch.work_email = formData.work_email.trim();
      if (formData.photo_url) employeePatch.avatar_url = formData.photo_url;
      if (formData.phone) employeePatch.phone = formData.phone.trim();
      if (formData.dob) employeePatch.dob = formData.dob;
      if (formData.gender) employeePatch.gender = formData.gender;

      mergedProfile.employee_code = code;
      mergedProfile.first_name = employeePatch.first_name;
      mergedProfile.middle_name = employeePatch.middle_name;
      mergedProfile.last_name = employeePatch.last_name;
      mergedProfile.display_name = employeePatch.display_name;
      mergedProfile.phone = formData.phone;
      mergedProfile.primary_mobile = formData.phone;
      mergedProfile.date_of_birth = formData.dob;
      mergedProfile.gender = formData.gender;
      if (formData.personal_email) mergedProfile.personal_email = formData.personal_email.trim();
    } else if (stepNumber === 2) {
      // Step 2: Contact & Addresses
      if (formData.personal_email !== undefined) {
        mergedProfile.personal_email = formData.personal_email.trim();
        employeePatch.personal_email = formData.personal_email.trim();
      }
      if (formData.alternate_phone !== undefined) mergedProfile.alternate_phone = formData.alternate_phone;
      if (formData.marital_status !== undefined) mergedProfile.marital_status = formData.marital_status;
      if (formData.nationality !== undefined) mergedProfile.nationality = formData.nationality;
      if (formData.blood_group !== undefined) mergedProfile.blood_group = formData.blood_group;
      if (formData.preferred_language !== undefined) mergedProfile.preferred_language = formData.preferred_language;

      const currentAddress = {
        line1: formData.current_line1 || '',
        line2: formData.current_line2 || '',
        city: formData.current_city || '',
        state: formData.current_state || '',
        country: formData.current_country || '',
        postal_code: formData.current_postal || '',
      };
      const permanentAddress = formData.same_as_permanent
        ? { ...currentAddress }
        : {
            line1: formData.perm_line1 || '',
            line2: formData.perm_line2 || '',
            city: formData.perm_city || '',
            state: formData.perm_state || '',
            country: formData.perm_country || '',
            postal_code: formData.perm_postal || '',
          };

      mergedProfile.current_address = currentAddress;
      mergedProfile.permanent_address = permanentAddress;
      mergedProfile.same_as_permanent = Boolean(formData.same_as_permanent);

      // Upsert to employee_profiles & employee_addresses if Supabase is active and authenticated
      const isAuth = await hasAuthenticatedSession();
      if (isAuth && isValidUUID(employeeId)) {
        try {
          await supabase.from('employee_profiles').upsert({
            employee_id: employeeId,
            organization_id: isValidUUID(orgId) ? orgId : '0c621892-e938-4707-9957-13534ea32c19',
            marital_status: formData.marital_status || null,
            blood_group: formData.blood_group || null,
            nationality: formData.nationality || 'Indian',
            updated_at: new Date().toISOString(),
          }, { onConflict: 'employee_id' });
        } catch (profErr) {
          console.warn('[API] Step 2 employee_profiles upsert notice:', profErr);
        }

        try {
          if (formData.current_line1) {
            await supabase.from('employee_addresses').upsert({
              employee_id: employeeId,
              organization_id: isValidUUID(orgId) ? orgId : '0c621892-e938-4707-9957-13534ea32c19',
              address_type: 'PRESENT',
              address_line1: formData.current_line1,
              address_line2: formData.current_line2 || null,
              city: formData.current_city || 'Coimbatore',
              state: formData.current_state || 'Tamil Nadu',
              postal_code: formData.current_postal || '641001',
              country: formData.current_country || 'India',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'employee_id,address_type' });
          }
        } catch (addrErr) {
          console.warn('[API] Step 2 employee_addresses upsert notice:', addrErr);
        }
      }
    } else if (stepNumber === 3) {
      // Step 3: Employment & Compensation
      if (formData.doj) {
        employeePatch.doj = formData.doj;
        mergedEmployment.doj = formData.doj;
      }
      if (formData.employment_type) {
        employeePatch.employment_type = formData.employment_type;
        mergedEmployment.employment_type = formData.employment_type;
      }
      if (formData.employment_source) {
        employeePatch.employment_source = formData.employment_source;
        mergedEmployment.employment_source = formData.employment_source;
      }
      if (formData.vendor_id) {
        employeePatch.vendor_id = formData.vendor_id;
        mergedEmployment.vendor_id = formData.vendor_id;
      }
      if (formData.vendor_name) {
        employeePatch.vendor_name = formData.vendor_name;
        mergedEmployment.vendor_name = formData.vendor_name;
      }
      if (formData.vendor_employee_code) {
        employeePatch.vendor_employee_code = formData.vendor_employee_code;
        mergedEmployment.vendor_employee_code = formData.vendor_employee_code;
      }
      if (formData.client_company_id) {
        employeePatch.client_company_id = formData.client_company_id;
        mergedEmployment.client_company_id = formData.client_company_id;
      }
      if (formData.site_id) {
        employeePatch.site_id = formData.site_id;
        mergedEmployment.site_id = formData.site_id;
      }
      if (formData.vendor_contract_id) {
        mergedEmployment.vendor_contract_id = formData.vendor_contract_id;
      }
      if (formData.vendor_start_date) {
        mergedEmployment.vendor_start_date = formData.vendor_start_date;
      }
      if (formData.vendor_end_date) {
        mergedEmployment.vendor_end_date = formData.vendor_end_date;
      }
      if (formData.status) employeePatch.status = formData.status;
      if (formData.department_id) {
        employeePatch.department_id = formData.department_id;
        mergedEmployment.department_id = formData.department_id;
      }
      if (formData.department_name) {
        employeePatch.department_name = formData.department_name;
        mergedEmployment.department_name = formData.department_name;
      }
      if (formData.designation_id) {
        employeePatch.designation_id = formData.designation_id;
        mergedEmployment.designation_id = formData.designation_id;
      }
      if (formData.designation_title) {
        employeePatch.designation_title = formData.designation_title;
        mergedEmployment.designation_title = formData.designation_title;
      }
      if (formData.branch_id) employeePatch.branch_id = formData.branch_id;

      mergedEmployment.work_mode = formData.work_mode;
      mergedEmployment.job_level = formData.job_level;
      mergedEmployment.grade = formData.grade;
      mergedEmployment.probation_period_months = formData.probation_months;
      mergedEmployment.notice_period_days = formData.notice_period_days;
      mergedEmployment.shift_id = formData.shift_id;
      mergedEmployment.attendance_policy_id = formData.attendance_policy_id;
      mergedEmployment.leave_policy_id = formData.leave_policy_id;
      mergedEmployment.salary_structure_code = formData.salary_structure_code;
      mergedEmployment.annual_ctc = formData.annual_ctc;
      mergedEmployment.monthly_ctc = formData.monthly_ctc;
      mergedEmployment.compensation_basis = formData.compensation_basis || 'CTC_INCLUSIVE';

      // Upsert into employee_salary_assignments
      const isAuth = await hasAuthenticatedSession();
      if (isAuth && (formData.annual_ctc || formData.monthly_ctc)) {
        try {
          const annCtc = Number(formData.annual_ctc) || 0;
          const monGross = Number(formData.monthly_ctc) || Math.round(annCtc / 12);
          await supabase.from('employee_salary_assignments').upsert({
            id: `sal-${employeeId}`,
            organization_id: orgId,
            employee_id: employeeId,
            annual_ctc: annCtc,
            gross_monthly: monGross,
            monthly_gross: monGross,
            effective_from: formData.salary_effective_from || formData.doj || new Date().toISOString().split('T')[0],
            is_active: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'employee_id' });
        } catch (salErr) {
          console.warn('[API] Step 3 salary assignment notice:', salErr);
        }
      }

      // Upsert/Update statutory flags
      if (isAuth && (formData.pf_applicable !== undefined || formData.esi_applicable !== undefined || formData.pt_applicable !== undefined)) {
        try {
          await supabase.from('employee_statutory_details').upsert({
            employee_id: employeeId,
            organization_id: orgId,
            pf_applicable: formData.pf_applicable !== false,
            esi_applicable: formData.esi_applicable === true,
            pt_applicable: formData.pt_applicable !== false,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'employee_id' });
        } catch (statErr) {
          console.warn('[API] Step 3 statutory flags notice:', statErr);
        }
      }

      // Sync Vendor Workforce Assignment if employment_source === 'VENDOR' or vendor_id is present
      if (formData.employment_source === 'VENDOR' || formData.vendor_id) {
        try {
          const { VendorWorkforceService } = await import('./vendor/vendorWorkforceService');
          await VendorWorkforceService.syncEmployeeAssignment({
            id: employeeId,
            organization_id: orgId,
            employee_code: employeePatch.employee_code || existing.employee_code,
            first_name: employeePatch.first_name || existing.first_name,
            last_name: employeePatch.last_name || existing.last_name,
            display_name: employeePatch.display_name || existing.display_name,
            work_email: employeePatch.work_email || existing.work_email,
            phone: employeePatch.phone || existing.phone,
            designation_title: formData.designation_title || employeePatch.designation_title || existing.designation_title,
            department_name: formData.department_name || employeePatch.department_name || existing.department_name,
            vendor_id: formData.vendor_id,
            vendor_name: formData.vendor_name,
            vendor_employee_code: formData.vendor_employee_code,
            employment: {
              ...mergedEmployment,
              vendor_id: formData.vendor_id,
              vendor_name: formData.vendor_name,
              vendor_contract_id: formData.vendor_contract_id,
              client_company_id: formData.client_company_id,
              site_id: formData.site_id,
              doj: formData.doj,
              monthly_ctc: formData.monthly_ctc,
            },
          }, formData.vendor_id);
        } catch (vSyncErr) {
          console.warn('[API] Vendor workforce sync warning in Step 3:', vSyncErr);
        }
      }
    } else if (stepNumber === 4) {
      // Step 4: Organization & Reporting
      if (formData.reporting_manager_id || formData.reporting_manager_name) {
        employeePatch.reporting_manager_id = formData.reporting_manager_id;
        mergedEmployment.reporting_manager_id = formData.reporting_manager_id;
        mergedEmployment.reporting_manager_name = formData.reporting_manager_name;
      }
      if (formData.team_lead_id || formData.team_lead_name) {
        mergedEmployment.team_lead_id = formData.team_lead_id;
        mergedEmployment.team_lead_name = formData.team_lead_name;
      }
      if (formData.business_unit) {
        mergedEmployment.business_unit = formData.business_unit;
        employeePatch.business_unit = formData.business_unit;
      }
      if (formData.cost_center) {
        mergedEmployment.cost_center_code = formData.cost_center;
        employeePatch.cost_center_code = formData.cost_center;
      }
    } else if (stepNumber === 5) {
      // Step 5: Emergency, Bank & Statutory
      mergedProfile.emergency_contacts = [
        {
          name: formData.emergency_name,
          relationship: formData.emergency_relation,
          phone: formData.emergency_phone,
          alt_phone: formData.emergency_alt_phone,
          email: formData.emergency_email,
        },
      ];
      mergedProfile.emergency_contact_name = formData.emergency_name;
      mergedProfile.emergency_contact_phone = formData.emergency_phone;
      mergedProfile.emergency_contact_relationship = formData.emergency_relation;
      mergedProfile.family_members = formData.family_members || [];

      const isAuth = await hasAuthenticatedSession();

      // Upsert emergency contacts to dedicated table
      if (isAuth && formData.emergency_name && formData.emergency_phone) {
        try {
          await supabase.from('employee_emergency_contacts').upsert({
            id: `emg-${employeeId}`,
            employee_id: employeeId,
            name: formData.emergency_name,
            relationship: formData.emergency_relation || 'Spouse',
            primary_phone: formData.emergency_phone,
            alternate_phone: formData.emergency_alt_phone || null,
            email: formData.emergency_email || null,
            address: formData.emergency_address || null,
            is_primary: true,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });
        } catch (emgErr) {
          console.warn('[API] Emergency contact upsert notice:', emgErr);
        }
      }

      // Set in mergedProfile
      if (formData.bank_name || formData.account_number) {
        const bankData = {
          bank_name: formData.bank_name || 'HDFC Bank',
          account_number: formData.account_number || '',
          ifsc: formData.ifsc || formData.ifsc_code || 'HDFC0001234',
          ifsc_code: formData.ifsc || formData.ifsc_code || 'HDFC0001234',
          account_type: (formData.account_type || 'SALARY').toUpperCase(),
          account_holder_name: formData.account_holder_name || `${employeePatch.first_name || existing.first_name || ''} ${employeePatch.last_name || existing.last_name || ''}`.trim(),
        };
        mergedProfile.bank_account = bankData;
        (employeePatch as any).bank = bankData;
      }

      if (formData.pan || formData.uan || formData.pf_number || formData.esi_number || formData.tax_regime) {
        const statData = {
          pan: formData.pan || null,
          pan_number: formData.pan || null,
          uan: formData.uan || null,
          uan_number: formData.uan || null,
          pf_number: formData.pf_number || null,
          esi_number: formData.esi_number || null,
          tax_regime: (formData.tax_regime || 'NEW').toUpperCase(),
          pf_applicable: formData.pf_applicable !== false,
          esi_applicable: formData.esi_applicable === true,
          pt_applicable: formData.pt_applicable !== false,
        };
        mergedProfile.statutory = statData;
        (employeePatch as any).statutory = statData;
      }

      // Upsert bank details
      if (isAuth && (formData.bank_name || formData.account_number)) {
        try {
          const bankPayload: any = {
            organization_id: isValidUUID(orgId) ? orgId : '0c621892-e938-4707-9957-13534ea32c19',
            employee_id: employeeId,
            bank_name: formData.bank_name || 'HDFC Bank',
            account_number: formData.account_number || '',
            ifsc_code: formData.ifsc || formData.ifsc_code || 'HDFC0001234',
            account_type: (formData.account_type || 'SALARY').toUpperCase(),
            account_holder_name: formData.account_holder_name || `${employeePatch.first_name || existing.first_name || ''} ${employeePatch.last_name || existing.last_name || ''}`.trim(),
            is_verified: true,
            updated_at: new Date().toISOString(),
          };
          if (formData.id && isValidUUID(formData.id)) {
            bankPayload.id = formData.id;
          }
          await supabase.from('employee_bank_details').upsert(bankPayload, { onConflict: 'employee_id' });
        } catch (bErr) {
          console.warn('[API] Bank details upsert notice:', bErr);
        }
      }

      // Upsert statutory details
      if (isAuth && (formData.pan || formData.uan || formData.pf_number || formData.esi_number)) {
        try {
          const statPayload: any = {
            organization_id: isValidUUID(orgId) ? orgId : '0c621892-e938-4707-9957-13534ea32c19',
            employee_id: employeeId,
            pan_number: formData.pan || null,
            uan_number: formData.uan || null,
            pf_number: formData.pf_number || null,
            esi_number: formData.esi_number || null,
            tax_regime: (formData.tax_regime || 'NEW').toUpperCase(),
            is_pf_eligible: formData.pf_applicable !== false,
            is_esi_eligible: formData.esi_applicable === true,
            is_pt_eligible: formData.pt_applicable !== false,
            updated_at: new Date().toISOString(),
          };
          if (formData.id && isValidUUID(formData.id)) {
            statPayload.id = formData.id;
          }
          await supabase.from('employee_statutory_details').upsert(statPayload, { onConflict: 'employee_id' });
        } catch (sErr) {
          console.warn('[API] Statutory details upsert notice:', sErr);
        }
      }
    } else if (stepNumber === 6) {
      // Step 6: Documents
      const isAuth = await hasAuthenticatedSession();
      if (isAuth && Array.isArray(formData.documents) && formData.documents.length > 0) {
        try {
          const docPayloads = formData.documents.map((doc: any, i: number) => ({
            id: doc.id || `doc-${employeeId}-${i}`,
            employee_id: employeeId,
            document_category: doc.category || doc.document_category || 'Identity',
            document_type: doc.type || doc.document_type || 'ID_CARD',
            file_name: doc.name || doc.file_name || 'document.pdf',
            file_url: doc.url || doc.file_url || '',
            file_size_bytes: doc.size || doc.file_size_bytes || 0,
            verification_status: doc.status || 'Verified',
            uploaded_at: doc.uploaded_at || new Date().toISOString(),
          }));
          await supabase.from('employee_documents').upsert(docPayloads, { onConflict: 'id' });
        } catch (docErr) {
          console.warn('[API] Documents upsert notice:', docErr);
        }
      }
      mergedProfile.documents = formData.documents || [];
      employeePatch.documents = formData.documents || [];
    } else if (stepNumber === 7) {
      // Step 7: Final Review & Confirmation
      if (formData.status) employeePatch.status = formData.status;
      if (formData.enable_app_access !== undefined) {
        (employeePatch as any).app_access = {
          enable_app_access: formData.enable_app_access !== false,
          auth_method: formData.auth_method || 'EMPLOYEE_ID_PASSWORD',
          require_password_change: formData.require_password_change !== false,
          require_device_verification: formData.require_device_verification !== false,
        };
      }
    }

    employeePatch.profile = mergedProfile;
    employeePatch.employment = mergedEmployment;

    // Apply patch to employees table in Supabase if authenticated
    const isAuth = await hasAuthenticatedSession();
    if (isAuth) {
      try {
        const cleanPatch = sanitizeEmployeeForSupabase({ ...existing, ...employeePatch });
        const { error } = await supabase.from('employees').upsert(cleanPatch, { onConflict: 'id' });
        if (error) {
          console.warn('[API] Supabase step upsert notice:', error.message || error);
        }
      } catch (err) {
        console.warn('[API] Supabase employee step upsert fallback:', err);
      }
    }

    // Always update local cache so in-memory/fallback state is 100% in sync
    const list = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
    const updatedEmp: Employee = {
      ...existing,
      ...employeePatch,
      profile: mergedProfile,
      employment: mergedEmployment,
    };
    const updatedList = list.some((e) => e.id === employeeId)
      ? list.map((e) => (e.id === employeeId ? updatedEmp : e))
      : [updatedEmp, ...list];
    setStorage(KEYS.EMPLOYEES, updatedList);
    this._empCache = null;

    // Always re-hydrate canonical record from DB, merged with updatedEmp
    const fresh = await this.getEmployeeById(employeeId);
    const finalEmp: Employee = {
      ...updatedEmp,
      ...(fresh || {}),
      profile: {
        ...(updatedEmp.profile || {}),
        ...((fresh && fresh.profile) || {}),
      },
      employment: {
        ...(updatedEmp.employment || {}),
        ...((fresh && fresh.employment) || {}),
      },
      bank: (fresh as any)?.bank || (updatedEmp as any)?.bank,
      statutory: (fresh as any)?.statutory || (updatedEmp as any)?.statutory,
      emergency_contacts: (fresh as any)?.emergency_contacts || (updatedEmp as any)?.emergency_contacts,
    };
    return finalEmp;
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
      id: ensureUUID(input.id),
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

        const isAuth = await hasAuthenticatedSession();
        if (isAuth) {
          const cleanEmp = sanitizeEmployeeForSupabase(newEmp);
          const { error } = await supabase.from('employees').upsert(cleanEmp, { onConflict: 'id' });

          if (error) {
            console.warn('[API] Supabase employee insert notice (persisted to local outbox):', error.message || error);
          }

          // 3. Upsert Bank Details
          if (input.bank || input.bank_name || input.account_number) {
            const b = input.bank || input;
            try {
              const bankId = ensureUUID(b.id || (newEmp.id ? 'b0000000-0000-0000-0000-' + newEmp.id.replace(/-/g, '').slice(0, 12) : null));
              await supabase.from('employee_bank_details').upsert({
                id: bankId,
                organization_id: newEmp.organization_id,
                employee_id: newEmp.id,
                bank_name: b.bank_name || 'HDFC Bank',
                account_number: b.account_number || '1234567890',
                ifsc_code: b.ifsc || b.ifsc_code || 'HDFC0001234',
                account_type: (b.account_type || 'SALARY').toUpperCase(),
                account_holder_name: b.account_holder_name || `${newEmp.first_name} ${newEmp.last_name}`.trim(),
                is_verified: true,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'employee_id' });
            } catch (e) {
              console.warn('[API] Bank upsert warning:', e);
            }
          }

          // 4. Upsert Statutory Details
          if (input.statutory || input.pan || input.uan) {
            const s = input.statutory || input;
            try {
              const statId = ensureUUID(s.id || (newEmp.id ? 'c0000000-0000-0000-0000-' + newEmp.id.replace(/-/g, '').slice(0, 12) : null));
              await supabase.from('employee_statutory_details').upsert({
                id: statId,
                organization_id: newEmp.organization_id,
                employee_id: newEmp.id,
                pan_number: s.pan || s.pan_number || null,
                uan_number: s.uan || s.uan_number || null,
                pf_number: s.pf_number || null,
                esi_number: s.esi_number || null,
                is_pf_eligible: s.pf_applicable !== undefined ? Boolean(s.pf_applicable) : true,
                is_esi_eligible: s.esi_applicable !== undefined ? Boolean(s.esi_applicable) : false,
                is_pt_eligible: s.pt_applicable !== undefined ? Boolean(s.pt_applicable) : true,
                updated_at: new Date().toISOString(),
              }, { onConflict: 'employee_id' });
            } catch (e) {
              console.warn('[API] Statutory upsert warning:', e);
            }
          }
        }
      } catch (err) {
        console.error('[API] Failed to insert/provision employee into Supabase:', err);
        throw err;
      }
    }

    const updatedList = list.some((e) => e.id === newEmp.id)
      ? list.map((e) => (e.id === newEmp.id ? { ...e, ...newEmp } : e))
      : [newEmp, ...list];
    setStorage(KEYS.EMPLOYEES, updatedList);
    this._empCache = null;

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
        const { getAppBaseUrl } = await import('../lib/supabase');
        const actToken = `act-${newEmp.id}`;
        const actUrl = `${getAppBaseUrl()}/activate?token=${encodeURIComponent(actToken)}&emp=${encodeURIComponent(newEmp.employee_code)}&email=${encodeURIComponent(targetEmail)}`;
        await resendEmailService.sendEmployeeActivationEmail({
          to: targetEmail,
          employeeName: `${newEmp.first_name} ${newEmp.last_name}`.trim(),
          employeeId: newEmp.employee_code,
          loginIdentifier: newEmp.employee_code,
          activationToken: actToken,
          activationUrl: actUrl,
          organizationName: newEmp.company_name || 'Joy Corporate Solutions',
          authMethod: 'Employee ID & Password / OTP',
          requiresPasswordChange: true,
        });
        console.log('[API] Employee activation email dispatched successfully to:', targetEmail);
      } catch (emailErr) {
        console.warn('[API] Employee activation email dispatch notice:', emailErr);
      }
    }

    // Auto-dispatch WhatsApp Welcome & Onboarding Pack to Employee's Primary Mobile
    const targetMobile = newEmp.profile?.phone || input.primary_mobile || input.phone;
    if (targetMobile && targetMobile.replace(/\D/g, '').length >= 10) {
      try {
        const { whatsAppNotificationService } = await import('./whatsapp/whatsappNotificationService');
        await whatsAppNotificationService.sendEmployeeWelcomeOnboarding({
          phone: targetMobile,
          employeeName: `${newEmp.first_name} ${newEmp.last_name}`.trim(),
          employeeCode: newEmp.employee_code,
          companyName: newEmp.company_name || 'Joy Corporate Solutions Pvt Ltd',
          designation: newEmp.designation_title || 'Team Member',
          organizationId: newEmp.organization_id || 'org-joy-01',
          employeeId: newEmp.id,
        });
        console.log('[API] WhatsApp Welcome Pack auto-dispatched successfully to:', targetMobile);
      } catch (waErr) {
        console.warn('[API] WhatsApp Welcome auto-dispatch notice:', waErr);
      }
    }

    if (newEmp.employment_source === 'VENDOR' || newEmp.vendor_id || newEmp.employment?.vendor_id) {
      try {
        const { VendorWorkforceService } = await import('./vendor/vendorWorkforceService');
        await VendorWorkforceService.syncEmployeeAssignment(newEmp, newEmp.vendor_id || newEmp.employment?.vendor_id);
      } catch (vErr) {
        console.warn('[API] Vendor workforce sync warning in createEmployee:', vErr);
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

    // Concurrency Protection: Detect dirty writes if expectedUpdatedAt provided with 5-second drift tolerance
    if (expectedUpdatedAt && existing.updated_at) {
      const timeDiff = Math.abs(new Date(existing.updated_at).getTime() - new Date(expectedUpdatedAt).getTime());
      if (existing.updated_at !== expectedUpdatedAt && timeDiff > 5000) {
        const err: any = new Error('This employee was updated by another administrator. Please reload latest changes before saving.');
        err.status = 409;
        err.code = 'CONCURRENCY_CONFLICT';
        logger.error('WEB', 'CONCURRENCY_CONFLICT', err, { correlationId, employeeId: id });
        throw err;
      }
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

          const isAuth = await hasAuthenticatedSession();
          if (isAuth) {
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
        }

        const isAuth = await hasAuthenticatedSession();
        // Upsert Bank Details if provided
        if (isAuth && ((data as any).bank || (data as any).bank_name || (data as any).account_number)) {
          const b = (data as any).bank || data;
          try {
            await supabase.from('employee_bank_details').upsert({
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
        if (isAuth && ((data as any).statutory || (data as any).pan || (data as any).uan || (data as any).pan_number || (data as any).uan_number)) {
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

    const updated: Employee = { 
      ...existing, 
      ...(canonicalRecord || {}),
      ...data, 
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      profile: { 
        ...(existing.profile || {}), 
        ...(canonicalRecord?.profile || {}),
        ...(data.profile || {}) 
      } as EmployeeProfile,
      employment: { 
        ...(existing.employment || {}), 
        ...(canonicalRecord?.employment || {}),
        ...(data.employment || {}) 
      } as EmploymentDetails,
      bank: (data as any).bank || (canonicalRecord as any)?.bank || (existing as any).bank,
      statutory: (data as any).statutory || (canonicalRecord as any)?.statutory || (existing as any).statutory,
      emergency_contacts: (canonicalRecord as any)?.emergency_contacts || (existing as any).emergency_contacts,
      updated_at: new Date().toISOString() 
    } as any as Employee;

    if (idx !== -1) {
      list[idx] = updated;
    } else {
      list.unshift(updated);
    }
    setStorage(KEYS.EMPLOYEES, list);
    this._empCache = null;

    if (updated.employment_source === 'VENDOR' || updated.vendor_id || updated.employment?.vendor_id) {
      try {
        const { VendorWorkforceService } = await import('./vendor/vendorWorkforceService');
        await VendorWorkforceService.syncEmployeeAssignment(updated, updated.vendor_id || updated.employment?.vendor_id);
      } catch (vErr) {
        console.warn('[API] Vendor workforce sync warning in updateEmployee:', vErr);
      }
    }

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
    const orgId = target?.organization_id || 'org-joy-01';

    const { employeeLifecycleEngine } = await import('./identity/employeeLifecycleEngine');
    const result = await employeeLifecycleEngine.deleteEmployee({
      employeeId: id,
      organizationId: orgId,
      actorId: 'admin-action',
      reason: 'Administrator initiated employee deletion / archival',
    });

    if (result.isSoftDeleted) {
      if (target) {
        target.status = 'Archived';
        (target as any).deleted_at = result.employee.deleted_at;
      }
      setStorage(KEYS.EMPLOYEES, list);
    } else if (result.isHardDeleted) {
      const updated = list.filter((e) => e.id !== id);
      setStorage(KEYS.EMPLOYEES, updated);
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

    const activeComp = this.getActiveCompany();
    const resolvedOrgId = userData.organization_id || activeComp?.organization_id || 'org-active';

    const newUser: User = {
      id: `user-${Date.now().toString().slice(-6)}`,
      organization_id: resolvedOrgId,
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
  // Vendor / Contractor API (Database Driven — ZERO MOCK POLICY)
  // Returns exclusively live database records or empty array
  // ==========================================
  getVendorsSync(): Vendor[] {
    const cached = getStorage<Vendor[]>(KEYS.VENDORS, []);
    return cached || [];
  },

  async getVendors(organizationId?: string): Promise<Vendor[]> {
    try {
      if (isSupabaseEnabled && supabase) {
        let query = supabase.from('vendors').select('*').order('created_at', { ascending: true });
        if (organizationId) {
          query = query.eq('organization_id', organizationId);
        }
        
        const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
          setTimeout(() => reject(new Error('Vendor query timed out')), 3000)
        );

        const { data, error } = await Promise.race([query, timeoutPromise]);
        if (!error && Array.isArray(data)) {
          setStorage(KEYS.VENDORS, data);
          return data as Vendor[];
        }
      }
    } catch (err) {
      console.warn('[API] Vendor query notice, using local cache:', err);
    }
    return this.getVendorsSync();
  },

  async createVendor(vendorData: Omit<Vendor, 'id'> & { id?: string }): Promise<Vendor> {
    if (!isSupabaseEnabled) {
      throw new Error('Supabase database connection is not enabled.');
    }
    try {
      const payload = {
        ...vendorData,
        organization_id: vendorData.organization_id || 'org-joy-01',
        status: vendorData.status || 'ACTIVE',
      };
      const { data, error } = await supabase.from('vendors').insert([payload]).select().single();
      if (error) {
        console.error('[API] Failed to insert vendor into database:', error);
        throw error;
      }
      return data as Vendor;
    } catch (err) {
      console.error('[API] Error in createVendor:', err);
      throw err;
    }
  },

  async updateVendor(vendorId: string, patch: Partial<Vendor>): Promise<Vendor> {
    if (!isSupabaseEnabled) {
      throw new Error('Supabase database connection is not enabled.');
    }
    try {
      const { data, error } = await supabase
        .from('vendors')
        .update({ ...patch, updated_at: new Date().toISOString() })
        .eq('id', vendorId)
        .select()
        .single();
      if (error) {
        console.error('[API] Failed to update vendor in database:', error);
        throw error;
      }
      return data as Vendor;
    } catch (err) {
      console.error('[API] Error in updateVendor:', err);
      throw err;
    }
  },

  async deleteVendor(vendorId: string): Promise<boolean> {
    if (!isSupabaseEnabled) {
      throw new Error('Supabase database connection is not enabled.');
    }
    try {
      const { error } = await supabase.from('vendors').delete().eq('id', vendorId);
      if (error) {
        console.error('[API] Failed to delete vendor from database:', error);
        throw error;
      }
      return true;
    } catch (err) {
      console.error('[API] Error in deleteVendor:', err);
      throw err;
    }
  },

  // ==========================================
  // Active Company Session
  // ==========================================
  getActiveCompany(): Company {
    const comp = getStorage<Company | null>(KEYS.ACTIVE_COMPANY, null);
    if (comp) return comp;
    const list = getStorage<Company[]>(KEYS.COMPANIES, DEFAULT_COMPANIES);
    const active = list[0] || DEFAULT_COMPANIES[0];
    setStorage(KEYS.ACTIVE_COMPANY, active);
    return active;
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
export * from './operations/bankingExportEngine';
export * from './operations/enterpriseNotificationEngine';
export * from './operations/employeeDocumentEngine';
export * from './operations/dailyWagePayrollEngine';
export * from './identity/employeeIdentityResolver';
