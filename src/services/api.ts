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
  ApprovalItem,
  ActivityItem,
  DashboardMetrics,
  Asset,
} from '../types';
import { supabase, isSupabaseEnabled } from '../lib/supabase';
import {
  defaultBranches,
  defaultLocations,
  defaultDepartments,
  defaultDesignations,
} from './employeeSeedData';
import { hrEventBus } from './hrEventBus';

// Standard Default Types & Records
const defaultOrganization: Organization = {
  id: 'org-joy-01',
  name: 'Joy Corporate Solutions',
  industry: 'Software & Technology Services',
  default_currency: 'INR',
  timezone: 'Asia/Kolkata',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2026-08-17T00:00:00Z',
};

const defaultCompany: Company = {
  id: 'comp-joy-01',
  organization_id: 'org-joy-01',
  legal_name: 'Joy Corporate Solutions Pvt Ltd',
  trade_name: 'JoyHRMS India',
  statutory_registration_no: 'CIN-U72200TZ2020PTC034120',
  tax_id: 'PAN-AAACJ9988F',
  country: 'India',
  city: 'Coimbatore',
  created_at: '2024-01-15T00:00:00Z',
};

const defaultCompanies: Company[] = [
  defaultCompany,
  {
    id: 'comp-joy-02',
    organization_id: 'org-joy-01',
    legal_name: 'Joy Global Technologies Inc',
    trade_name: 'Joy Tech International',
    statutory_registration_no: 'DE-EIN-987654321',
    tax_id: 'TAX-US9876543',
    country: 'United States',
    city: 'San Francisco',
    created_at: '2024-06-01T00:00:00Z',
  },
];

const defaultRoles: Role[] = [
  { id: 'role-001', organization_id: 'org-joy-01', name: 'Super Admin', description: 'Root Platform Administrator with global access', permissions: [] },
  { id: 'role-001b', organization_id: 'org-joy-01', name: 'Assistant Admin', description: 'Assistant Platform Administrator with delegated operations & customer support access', permissions: [] },
  { id: 'role-001c', organization_id: 'org-joy-01', name: 'Billing Admin', description: 'FinOps & SaaS Invoicing Administrator', permissions: [] },
  { id: 'role-001d', organization_id: 'org-joy-01', name: 'Security Officer', description: 'Compliance, Session Security & Audit Officer', permissions: [] },
  { id: 'role-002', organization_id: 'org-joy-01', name: 'Company Admin', description: 'Enterprise Organization Admin', permissions: [] },
  { id: 'role-003', organization_id: 'org-joy-01', name: 'HR Head', description: 'Head of Human Resources & People Operations', permissions: [] },
  { id: 'role-004', organization_id: 'org-joy-01', name: 'Team Lead', description: 'Department Supervisor / Team Lead', permissions: [] },
  { id: 'role-005', organization_id: 'org-joy-01', name: 'Employee', description: 'Standard Employee with Employee Self Service access', permissions: [] },
];

const defaultEnterpriseUser: User = {
  id: 'user-hr-01',
  organization_id: 'org-joy-01',
  email: 'haripriya@joycorporate.com',
  name: 'Hari priya',
  avatar_url: '',
  employee_id: 'emp-hr-001',
  status: 'Active',
  roles: [defaultRoles[5]], // HR Head
  created_at: '2024-01-01T00:00:00Z',
};

const defaultCorporateUsers: User[] = [
  defaultEnterpriseUser,
  {
    id: 'user-admin-01',
    organization_id: 'org-joy-01',
    email: 'admin@joycorporate.com',
    name: 'Dharun Joy',
    avatar_url: '',
    employee_id: 'emp-admin-001',
    status: 'Active',
    roles: [defaultRoles[4]], // Company Admin
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-mgr-01',
    organization_id: 'org-joy-01',
    email: 'karthik.n@joycorporate.com',
    name: 'Karthik N.',
    avatar_url: '',
    employee_id: 'emp-mgr-001',
    status: 'Active',
    roles: [defaultRoles[6]], // Team Lead / Manager
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-tl-01',
    organization_id: 'org-joy-01',
    email: 'deepa.s@joycorporate.com',
    name: 'Deepa S.',
    avatar_url: '',
    employee_id: 'emp-tl-001',
    status: 'Active',
    roles: [defaultRoles[6]], // Team Lead
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-emp-01',
    organization_id: 'org-joy-01',
    email: 'priya.sharma@joycorporate.com',
    name: 'Priya Sharma',
    avatar_url: '',
    employee_id: 'emp-001',
    status: 'Active',
    roles: [defaultRoles[7]], // Employee
    created_at: '2024-01-01T00:00:00Z',
  },
];

const defaultPlatformUsers: User[] = [
  {
    id: 'user-super-01',
    organization_id: 'org-platform',
    email: 'superadmin@workforceos.com',
    name: 'THIRUMALAI R K',
    avatar_url: '',
    employee_id: 'emp-root-001',
    status: 'Active',
    roles: [defaultRoles[0]], // Super Admin
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'user-asst-02',
    organization_id: 'org-platform',
    email: 'assistant.admin@workforceos.com',
    name: 'Karthik Natarajan',
    avatar_url: '',
    employee_id: 'emp-asst-002',
    status: 'Active',
    roles: [defaultRoles[1]], // Assistant Admin
    created_at: '2024-02-01T00:00:00Z',
  },
  {
    id: 'user-fin-03',
    organization_id: 'org-platform',
    email: 'finance@workforceos.com',
    name: 'Pooja Agarwal',
    avatar_url: '',
    employee_id: 'emp-fin-003',
    status: 'Active',
    roles: [defaultRoles[2]], // Billing Admin
    created_at: '2024-03-01T00:00:00Z',
  },
  {
    id: 'user-sec-04',
    organization_id: 'org-platform',
    email: 'security@workforceos.com',
    name: 'Vikram Sethi',
    avatar_url: '',
    employee_id: 'emp-sec-004',
    status: 'Active',
    roles: [defaultRoles[3]], // Security Officer
    created_at: '2024-04-01T00:00:00Z',
  },
];

const defaultAllUsers: User[] = [...defaultCorporateUsers, ...defaultPlatformUsers];

const defaultCanonicalEmployees: Employee[] = [
  {
    id: 'emp-hr-001',
    organization_id: 'org-joy-01',
    company_id: 'comp-joy-01',
    company_name: 'Joy Corporate Solutions Pvt Ltd',
    department_id: 'dept-hr',
    department_name: 'People & HR',
    designation_id: 'desig-hr-head',
    designation_title: 'HR Head',
    user_id: 'user-hr-01',
    employee_code: 'WF-1001',
    first_name: 'Hari',
    last_name: 'Priya',
    display_name: 'Hari Priya',
    work_email: 'haripriya@joycorporate.com',
    status: 'Active',
    employment_type: 'Full Time',
    employment_source: 'DIRECT',
    profile: {
      first_name: 'Hari',
      last_name: 'Priya',
      display_name: 'Hari Priya',
      gender: 'Female',
      date_of_birth: '1992-06-18',
      blood_group: 'O+',
      nationality: 'Indian',
      phone: '+91 98401 22334',
      personal_email: 'haripriya.personal@gmail.com',
      current_address: {
        line1: '42 Orchid Villa, Race Course Road',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        postal_code: '641018',
        country: 'India',
      },
    },
    employment: {
      doj: '2025-01-15',
      employment_type: 'Full Time',
      employment_source: 'DIRECT',
      work_location: 'Coimbatore HQ',
      reporting_manager_id: 'emp-admin-001',
      reporting_manager_name: 'Dharun Joy (Company Admin)',
      probation_period_months: 6,
      confirmation_status: 'Confirmed',
    },
    created_at: '2025-01-15T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  },
  {
    id: 'emp-admin-001',
    organization_id: 'org-joy-01',
    company_id: 'comp-joy-01',
    company_name: 'Joy Corporate Solutions Pvt Ltd',
    department_id: 'dept-exec',
    department_name: 'Executive Management',
    designation_id: 'desig-vp-ops',
    designation_title: 'Managing Director & VP Operations',
    user_id: 'user-admin-01',
    employee_code: 'WF-1000',
    first_name: 'Dharun',
    last_name: 'Joy',
    display_name: 'Dharun Joy',
    work_email: 'admin@joycorporate.com',
    status: 'Active',
    employment_type: 'Full Time',
    employment_source: 'DIRECT',
    profile: {
      first_name: 'Dharun',
      last_name: 'Joy',
      display_name: 'Dharun Joy',
      gender: 'Male',
      phone: '+91 98400 99000',
    },
    employment: {
      doj: '2024-01-01',
      employment_type: 'Full Time',
      employment_source: 'DIRECT',
      work_location: 'Coimbatore HQ',
      confirmation_status: 'Confirmed',
    },
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  },
  {
    id: 'emp-mgr-001',
    organization_id: 'org-joy-01',
    company_id: 'comp-joy-01',
    company_name: 'Joy Corporate Solutions Pvt Ltd',
    department_id: 'dept-eng',
    department_name: 'Engineering & DevOps',
    designation_id: 'desig-eng-mgr',
    designation_title: 'Engineering Manager',
    user_id: 'user-mgr-01',
    employee_code: 'WF-1002',
    first_name: 'Karthik',
    last_name: 'Natarajan',
    display_name: 'Karthik N.',
    work_email: 'karthik.n@joycorporate.com',
    status: 'Active',
    employment_type: 'Full Time',
    employment_source: 'DIRECT',
    profile: {
      first_name: 'Karthik',
      last_name: 'Natarajan',
      display_name: 'Karthik N.',
      phone: '+91 98402 33445',
    },
    employment: {
      doj: '2025-02-01',
      employment_type: 'Full Time',
      employment_source: 'DIRECT',
      work_location: 'Coimbatore HQ',
      reporting_manager_id: 'emp-admin-001',
      reporting_manager_name: 'Dharun Joy (Company Admin)',
      confirmation_status: 'Confirmed',
    },
    created_at: '2025-02-01T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  },
  {
    id: 'emp-tl-001',
    organization_id: 'org-joy-01',
    company_id: 'comp-joy-01',
    company_name: 'Joy Corporate Solutions Pvt Ltd',
    department_id: 'dept-eng',
    department_name: 'Engineering & DevOps',
    designation_id: 'desig-lead-eng',
    designation_title: 'Senior Lead Engineer',
    user_id: 'user-tl-01',
    employee_code: 'WF-1003',
    first_name: 'Deepa',
    last_name: 'Subramanian',
    display_name: 'Deepa S.',
    work_email: 'deepa.s@joycorporate.com',
    status: 'Active',
    employment_type: 'Full Time',
    employment_source: 'DIRECT',
    profile: {
      first_name: 'Deepa',
      last_name: 'Subramanian',
      display_name: 'Deepa S.',
      phone: '+91 98403 44556',
    },
    employment: {
      doj: '2025-03-01',
      employment_type: 'Full Time',
      employment_source: 'DIRECT',
      work_location: 'Coimbatore HQ',
      reporting_manager_id: 'emp-mgr-001',
      reporting_manager_name: 'Karthik N.',
      confirmation_status: 'Confirmed',
    },
    created_at: '2025-03-01T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  },
  {
    id: 'emp-001',
    organization_id: 'org-joy-01',
    company_id: 'comp-joy-01',
    company_name: 'Joy Corporate Solutions Pvt Ltd',
    department_id: 'dept-eng',
    department_name: 'Engineering & DevOps',
    designation_id: 'desig-sr-eng',
    designation_title: 'Senior Software Engineer',
    user_id: 'user-emp-01',
    employee_code: 'WF-1004',
    first_name: 'Priya',
    last_name: 'Sharma',
    display_name: 'Priya Sharma',
    work_email: 'priya.sharma@joycorporate.com',
    status: 'Active',
    employment_type: 'Full Time',
    employment_source: 'DIRECT',
    profile: {
      first_name: 'Priya',
      last_name: 'Sharma',
      display_name: 'Priya Sharma',
      phone: '+91 98404 55667',
    },
    employment: {
      doj: '2025-04-15',
      employment_type: 'Full Time',
      employment_source: 'DIRECT',
      work_location: 'Coimbatore HQ',
      reporting_manager_id: 'emp-tl-001',
      reporting_manager_name: 'Deepa S.',
      confirmation_status: 'Confirmed',
    },
    created_at: '2025-04-15T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  },
  {
    id: 'emp-vnd-001',
    organization_id: 'org-joy-01',
    company_id: 'comp-joy-01',
    company_name: 'Joy Corporate Solutions Pvt Ltd',
    department_id: 'dept-admin',
    department_name: 'Administration & Facilities',
    designation_id: 'desig-fac-exec',
    designation_title: 'Facilities & Operations Specialist',
    employee_code: 'WF-1005',
    first_name: 'Senthil',
    last_name: 'Nathan',
    display_name: 'Senthil Nathan',
    work_email: 'senthil.n@joycorporate.com',
    status: 'Active',
    employment_type: 'Contract',
    employment_source: 'VENDOR',
    vendor_id: 'e2000000-0000-0000-0000-000000000001',
    vendor_name: 'ABC Workforce Solutions Pvt Ltd',
    vendor_employee_code: 'ABC-TN-8821',
    profile: {
      first_name: 'Senthil',
      last_name: 'Nathan',
      display_name: 'Senthil Nathan',
      phone: '+91 98405 66778',
    },
    employment: {
      doj: '2025-05-01',
      employment_type: 'Contract',
      employment_source: 'VENDOR',
      vendor_id: 'e2000000-0000-0000-0000-000000000001',
      vendor_name: 'ABC Workforce Solutions Pvt Ltd',
      vendor_employee_code: 'ABC-TN-8821',
      vendor_start_date: '2025-05-01',
      vendor_end_date: '2026-12-31',
      work_location: 'Coimbatore HQ',
      reporting_manager_id: 'emp-hr-001',
      reporting_manager_name: 'Hari Priya (HR Head)',
      confirmation_status: 'Confirmed',
    },
    created_at: '2025-05-01T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  },
  {
    id: 'emp-vnd-002',
    organization_id: 'org-joy-01',
    company_id: 'comp-joy-01',
    company_name: 'Joy Corporate Solutions Pvt Ltd',
    department_id: 'dept-cs',
    department_name: 'Customer Support',
    designation_id: 'desig-tech-sup',
    designation_title: 'Technical Support Specialist',
    employee_code: 'WF-1006',
    first_name: 'Meera',
    last_name: 'Krishnan',
    display_name: 'Meera Krishnan',
    work_email: 'meera.k@joycorporate.com',
    status: 'Active',
    employment_type: 'Contract',
    employment_source: 'VENDOR',
    vendor_id: 'e2000000-0000-0000-0000-000000000001',
    vendor_name: 'ABC Workforce Solutions Pvt Ltd',
    vendor_employee_code: 'ABC-TN-8829',
    profile: {
      first_name: 'Meera',
      last_name: 'Krishnan',
      display_name: 'Meera Krishnan',
      phone: '+91 98406 77889',
    },
    employment: {
      doj: '2025-06-01',
      employment_type: 'Contract',
      employment_source: 'VENDOR',
      vendor_id: 'e2000000-0000-0000-0000-000000000001',
      vendor_name: 'ABC Workforce Solutions Pvt Ltd',
      vendor_employee_code: 'ABC-TN-8829',
      vendor_start_date: '2025-06-01',
      vendor_end_date: '2026-12-31',
      work_location: 'Coimbatore HQ',
      reporting_manager_id: 'emp-hr-001',
      reporting_manager_name: 'Hari Priya (HR Head)',
      confirmation_status: 'Confirmed',
    },
    created_at: '2025-06-01T00:00:00Z',
    updated_at: '2026-08-17T00:00:00Z',
  },
  {
    id: 'emp-1040',
    organization_id: 'org-joy-01',
    company_id: 'comp-joy-01',
    company_name: 'Joy Corporate Solutions Pvt Ltd',
    department_id: 'dept-eng',
    department_name: 'Engineering & DevOps',
    designation_id: 'desig-sr-eng',
    designation_title: 'Senior Staff Frontend Architect',
    user_id: 'user-emp-1040',
    employee_code: 'EMP-1040',
    first_name: 'Priya',
    last_name: 'Sundaram',
    display_name: 'Priya Sundaram',
    work_email: 'priya.sundaram@joycorporate.com',
    status: 'Onboarding',
    employment_type: 'Full Time',
    employment_source: 'DIRECT',
    profile: {
      first_name: 'Priya',
      last_name: 'Sundaram',
      display_name: 'Priya Sundaram',
      phone: '+91 98405 88990',
      gender: 'Female',
      date_of_birth: '1994-06-18',
      blood_group: 'O+',
      nationality: 'Indian',
      current_address: {
        line1: '42, Brookefields Residency, Avinashi Road',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        country: 'India',
        postal_code: '641001',
      },
      permanent_address: {
        line1: '42, Brookefields Residency, Avinashi Road',
        city: 'Coimbatore',
        state: 'Tamil Nadu',
        country: 'India',
        postal_code: '641001',
      },
      same_as_permanent: true,
      emergency_contacts: [
        {
          name: 'Sundaram Natarajan',
          relationship: 'Father',
          phone: '+91 98401 11223',
          is_primary: true,
          priority: 1,
        },
      ],
    },
    employment: {
      doj: '2026-08-20',
      employment_type: 'Full Time',
      employment_source: 'DIRECT',
      work_location: 'Coimbatore HQ',
      reporting_manager_id: 'emp-mgr-001',
      reporting_manager_name: 'Karthik Natarajan (Engineering Manager)',
      team_lead_id: 'emp-tl-001',
      team_lead_name: 'Deepa Subramanian (Senior Lead Engineer)',
      confirmation_status: 'Pending',
      probation_period_months: 3,
      notice_period_days: 60,
    },
    created_at: '2026-08-15T09:00:00Z',
    updated_at: '2026-08-17T11:00:00Z',
  },
];

// Local Storage Keys
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

export const api = {
  // Organization API
  async getOrganization(): Promise<Organization> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.from('organizations').select('*').limit(1).maybeSingle();
        if (data && !error) return data;
      } catch (err) {
        console.warn('[API] Failed to fetch organization from Supabase:', err);
      }
    }
    const stored = getStorage<Organization | null>(KEYS.ORG, null);
    if (!stored || stored.name?.includes('Acme') || stored.id === 'org-acme-01') {
      setStorage(KEYS.ORG, defaultOrganization);
      return defaultOrganization;
    }
    return stored;
  },

  async updateOrganization(data: Partial<Organization>): Promise<Organization> {
    const current = await this.getOrganization();
    const updated = { ...current, ...data, updated_at: new Date().toISOString() };
    if (isSupabaseEnabled) {
      try {
        await supabase.from('organizations').upsert(updated);
      } catch (err) {
        console.warn('[API] Failed to update organization on Supabase:', err);
      }
    }
    setStorage(KEYS.ORG, updated);
    return updated;
  },

  // Company API
  async getCompanies(): Promise<Company[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.from('companies').select('*');
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[API] Failed to fetch companies from Supabase:', err);
      }
    }
    const stored = getStorage<Company[] | null>(KEYS.COMPANIES, null);
    if (!stored || stored.length === 0 || stored.some(c => c.legal_name?.includes('Acme') || c.id === 'comp-01')) {
      setStorage(KEYS.COMPANIES, defaultCompanies);
      return defaultCompanies;
    }
    return stored;
  },

  async createCompany(input: Omit<Company, 'id' | 'created_at'>): Promise<Company> {
    const newCompany: Company = {
      ...input,
      id: `comp-${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
    };
    if (isSupabaseEnabled) {
      try {
        await supabase.from('companies').insert(newCompany);
      } catch (err) {
        console.warn('[API] Failed to insert company into Supabase:', err);
      }
    }
    const list = getStorage(KEYS.COMPANIES, [defaultCompany]);
    setStorage(KEYS.COMPANIES, [newCompany, ...list]);
    return newCompany;
  },

  // Branch API
  async getBranches(companyId?: string): Promise<Branch[]> {
    if (isSupabaseEnabled) {
      try {
        let q = supabase.from('branches').select('*');
        if (companyId) q = q.eq('company_id', companyId);
        const { data, error } = await q;
        if (!error && data) return data;
      } catch (err) {
        console.warn('[API] Failed to fetch branches from Supabase:', err);
      }
    }
    let list = getStorage<Branch[]>(KEYS.BRANCHES, []);
    // Purge legacy mock branches if present
    if (list && list.some(b => b.name === 'Chennai Tech Park' || b.name === 'Remote Distributed Hub')) {
      list = list.filter(b => b.name !== 'Chennai Tech Park' && b.name !== 'Bengaluru Innovation Center' && b.name !== 'Remote Distributed Hub');
      setStorage(KEYS.BRANCHES, list);
    }
    if (companyId) return list.filter((b) => b.company_id === companyId);
    return list;
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
        if (!error && data) return data;
      } catch (err) {
        console.warn('[API] Failed to insert branch into Supabase:', err);
      }
    }
    const list = getStorage<Branch[]>(KEYS.BRANCHES, []);
    setStorage(KEYS.BRANCHES, [newBranch, ...list]);
    return newBranch;
  },

  // Location API
  async getLocations(branchId?: string): Promise<Location[]> {
    if (isSupabaseEnabled) {
      try {
        let q = supabase.from('locations').select('*');
        if (branchId) q = q.eq('branch_id', branchId);
        const { data, error } = await q;
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[API] Failed to fetch locations from Supabase:', err);
      }
    }
    let list = getStorage<Location[]>(KEYS.LOCATIONS, []);
    if (!list || list.length === 0) {
      list = defaultLocations;
      setStorage(KEYS.LOCATIONS, list);
    }
    if (branchId) return list.filter((l) => l.branch_id === branchId);
    return list;
  },

  async createLocation(input: Omit<Location, 'id'>): Promise<Location> {
    const newLoc: Location = { ...input, id: `loc-${Date.now().toString(36)}` };
    if (isSupabaseEnabled) {
      try {
        await supabase.from('locations').insert(newLoc);
      } catch (err) {
        console.warn('[API] Failed to insert location into Supabase:', err);
      }
    }
    const list = getStorage<Location[]>(KEYS.LOCATIONS, defaultLocations);
    setStorage(KEYS.LOCATIONS, [newLoc, ...list]);
    return newLoc;
  },

  // Department API
  async getDepartments(companyId?: string): Promise<Department[]> {
    if (isSupabaseEnabled) {
      try {
        let q = supabase.from('departments').select('*');
        if (companyId) q = q.eq('company_id', companyId);
        const { data, error } = await q;
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[API] Failed to fetch departments from Supabase:', err);
      }
    }
    let list = getStorage<Department[]>(KEYS.DEPARTMENTS, []);
    if (!list || list.length === 0) {
      list = defaultDepartments;
      setStorage(KEYS.DEPARTMENTS, list);
    }
    if (companyId) return list.filter((d) => d.company_id === companyId);
    return list;
  },

  async createDepartment(input: Omit<Department, 'id'>): Promise<Department> {
    const newDept: Department = { ...input, id: `dept-${Date.now().toString(36)}`, employee_count: 0 };
    if (isSupabaseEnabled) {
      try {
        await supabase.from('departments').insert(newDept);
      } catch (err) {
        console.warn('[API] Failed to insert department into Supabase:', err);
      }
    }
    const list = getStorage<Department[]>(KEYS.DEPARTMENTS, defaultDepartments);
    setStorage(KEYS.DEPARTMENTS, [newDept, ...list]);
    return newDept;
  },

  // Designation API
  async getDesignations(companyId?: string): Promise<Designation[]> {
    if (isSupabaseEnabled) {
      try {
        let q = supabase.from('designations').select('*');
        if (companyId) q = q.eq('company_id', companyId);
        const { data, error } = await q;
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[API] Failed to fetch designations from Supabase:', err);
      }
    }
    let list = getStorage<Designation[]>(KEYS.DESIGNATIONS, []);
    if (!list || list.length === 0) {
      list = defaultDesignations;
      setStorage(KEYS.DESIGNATIONS, list);
    }
    if (companyId) return list.filter((d) => d.company_id === companyId);
    return list;
  },

  async createDesignation(input: Omit<Designation, 'id'>): Promise<Designation> {
    const newDesig: Designation = { ...input, id: `desig-${Date.now().toString(36)}` };
    if (isSupabaseEnabled) {
      try {
        await supabase.from('designations').insert(newDesig);
      } catch (err) {
        console.warn('[API] Failed to insert designation into Supabase:', err);
      }
    }
    const list = getStorage<Designation[]>(KEYS.DESIGNATIONS, defaultDesignations);
    setStorage(KEYS.DESIGNATIONS, [newDesig, ...list]);
    return newDesig;
  },

  // Employees API
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
        // Exclude legacy mock acme.com records
        q = q.not('work_email', 'ilike', '%acme.com%');
        const filterObj = typeof params === 'string' ? { companyId: params } : params;
        if (filterObj?.companyId) q = q.eq('company_id', filterObj.companyId);
        if (filterObj?.departmentId && filterObj.departmentId !== 'all') q = q.eq('department_id', filterObj.departmentId);
        if (filterObj?.status && filterObj.status !== 'all') q = q.eq('status', filterObj.status);
        if (filterObj?.source && filterObj.source !== 'all') q = q.eq('employment_source', filterObj.source);
        if (filterObj?.vendorId && filterObj.vendorId !== 'all') q = q.eq('vendor_id', filterObj.vendorId);
        const { data, error } = await q;
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[API] Failed to fetch employees from Supabase:', err);
      }
    }
    let list = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
    if (!list || list.length === 0 || list.some(e => e.first_name === 'Alex' && e.last_name === 'Rivera') || list.some(e => e.work_email?.includes('acme.com'))) {
      list = defaultCanonicalEmployees;
      setStorage(KEYS.EMPLOYEES, list);
    }
    list = list.filter(e => !e.work_email?.includes('acme.com'));
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
    const list = await this.getEmployees();
    return list.find((e) => e.id === id);
  },

  async createEmployee(input: any): Promise<Employee> {
    const list = getStorage<Employee[]>(KEYS.EMPLOYEES, defaultCanonicalEmployees);
    
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
      organization_id: input.organization_id || 'a0000000-0000-0000-0000-000000000001',
      company_id: input.company_id || 'c1000000-0000-0000-0000-000000000001',
      company_name: input.company_name || 'Joy Corporate Solutions Pvt Ltd',
      department_id: input.department_id || 'dept-eng',
      department_name: input.department_name || 'Engineering & DevOps',
      designation_id: input.designation_id || 'desig-sr-eng',
      designation_title: input.designation_title || 'Software Engineer',
      employee_code: generatedCode,
      first_name: input.first_name || 'New',
      last_name: input.last_name || 'Employee',
      display_name: `${input.first_name || 'New'} ${input.last_name || 'Employee'}`,
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
        await supabase.from('employees').insert(newEmp);
      } catch (err) {
        console.warn('[API] Failed to insert employee into Supabase:', err);
      }
    }

    setStorage(KEYS.EMPLOYEES, [newEmp, ...list]);

    // Provision Authenticated Employee Identity
    try {
      const { employeeAuthService } = await import('./auth/employeeAuthService');
      const phoneNum = newEmp.profile?.phone || input.primary_mobile || input.phone || '+919840999999';
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
        sendSms: true,
      });
    } catch (authErr) {
      console.warn('[API] Auto-provisioning employee auth identity warning:', authErr);
    }

    hrEventBus.publish('employee.created', newEmp);
    return newEmp;
  },

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
    const list = getStorage<Employee[]>(KEYS.EMPLOYEES, defaultCanonicalEmployees);
    const idx = list.findIndex((e) => e.id === id);
    if (idx === -1) throw new Error('Employee not found');

    const updated = { ...list[idx], ...data, updated_at: new Date().toISOString() };
    if (isSupabaseEnabled) {
      try {
        await supabase.from('employees').update(updated).eq('id', id);
      } catch (err) {
        console.warn('[API] Failed to update employee on Supabase:', err);
      }
    }
    list[idx] = updated;
    setStorage(KEYS.EMPLOYEES, list);
    hrEventBus.publish('employee.updated', updated);
    return updated;
  },

  async deleteEmployee(id: string): Promise<boolean> {
    const list = getStorage<Employee[]>(KEYS.EMPLOYEES, defaultCanonicalEmployees);
    const target = list.find((e) => e.id === id);
    const updated = list.filter((e) => e.id !== id);
    setStorage(KEYS.EMPLOYEES, updated);

    if (isSupabaseEnabled) {
      try {
        await supabase.from('employee_onboardings').delete().eq('employee_id', id);
        await supabase.from('employees').delete().eq('id', id);
      } catch (err) {
        console.warn('[API] Failed to delete employee from Supabase:', err);
      }
    }

    hrEventBus.publish('employee.deleted', target || { id });
    return true;
  },

  // Roles API
  async getRoles(): Promise<Role[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.from('roles').select('*');
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[API] Failed to fetch roles from Supabase:', err);
      }
    }
    return getStorage<Role[]>(KEYS.ROLES, defaultRoles);
  },

  // Users API
  async getUsers(): Promise<User[]> {
    if (isSupabaseEnabled) {
      try {
        const { data, error } = await supabase.from('users').select('*');
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[API] Failed to fetch users from Supabase:', err);
      }
    }
    return getStorage<User[]>(KEYS.USERS, defaultAllUsers);
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

  // Approvals API
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

  // Dashboard API
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

  // Active Company & Current User Session
  getActiveCompany(): Company {
    const stored = getStorage<Company | null>(KEYS.ACTIVE_COMPANY, null);
    if (!stored || stored.legal_name?.includes('Acme') || stored.id === 'comp-01') {
      setStorage(KEYS.ACTIVE_COMPANY, defaultCompany);
      return defaultCompany;
    }
    return stored;
  },

  setActiveCompany(company: Company): void {
    setStorage(KEYS.ACTIVE_COMPANY, company);
  },

  getCurrentUser(): User {
    return getStorage(KEYS.CURRENT_USER, defaultEnterpriseUser);
  },

  setCurrentUser(user: User): void {
    setStorage(KEYS.CURRENT_USER, user);
  },

  async purgeMockDataAndSyncLive(): Promise<void> {
    // 1. Purge all localStorage mock remnants
    const keysToClean = [
      KEYS.ORG, KEYS.COMPANIES, KEYS.BRANCHES, KEYS.LOCATIONS,
      KEYS.DEPARTMENTS, KEYS.DESIGNATIONS, KEYS.ROLES, KEYS.USERS,
      KEYS.EMPLOYEES, KEYS.ACTIVE_COMPANY, KEYS.CURRENT_USER,
      'workforce_active_legal_entity_id', 'workforce_active_org_id'
    ];
    keysToClean.forEach(k => {
      try {
        const val = localStorage.getItem(k);
        if (val && (val.includes('acme') || val.includes('Acme') || val.includes('c1000000') || val.includes('Alex Rivera') || val.includes('cmp-joy'))) {
          localStorage.removeItem(k);
        }
      } catch (e) {}
    });

    // Reset clean canonical data
    setStorage(KEYS.ORG, defaultOrganization);
    setStorage(KEYS.COMPANIES, defaultCompanies);
    setStorage(KEYS.BRANCHES, defaultBranches);
    setStorage(KEYS.LOCATIONS, defaultLocations);
    setStorage(KEYS.DEPARTMENTS, defaultDepartments);
    setStorage(KEYS.DESIGNATIONS, defaultDesignations);
    setStorage(KEYS.ROLES, defaultRoles);
    setStorage(KEYS.USERS, defaultAllUsers);
    setStorage(KEYS.EMPLOYEES, defaultCanonicalEmployees);
    setStorage(KEYS.ACTIVE_COMPANY, defaultCompany);
    setStorage(KEYS.CURRENT_USER, defaultEnterpriseUser);
    localStorage.setItem('workforce_active_legal_entity_id', 'comp-joy-01');
    localStorage.setItem('workforce_active_org_id', 'org-joy-01');

    // 2. If Supabase is active, clean out legacy acme demo rows and sync clean live records
    if (isSupabaseEnabled) {
      try {
        await supabase.from('employees').delete().ilike('work_email', '%acme.com%');
        await supabase.from('employees').delete().in('company_id', ['comp-01', 'comp-02']);
        await supabase.from('app_users').delete().ilike('email', '%acme.com%');

        // Upsert canonical organization & companies
        await supabase.from('organizations').upsert(defaultOrganization);
        await supabase.from('companies').upsert(defaultCompanies);
        
        // Upsert canonical live employees
        for (const emp of defaultCanonicalEmployees) {
          await supabase.from('employees').upsert(emp);
        }
      } catch (err) {
        console.warn('[API] Live DB sync completed with local fallback:', err);
      }
    }

    hrEventBus.publish('employee.created', defaultCanonicalEmployees[0]);
  },
};

// Auto-run once in browser to ensure fresh live data
if (typeof window !== 'undefined') {
  const LIVE_DATA_VERSION = 'workforce_live_v2.1_norm';
  if (localStorage.getItem('wf_live_synced') !== LIVE_DATA_VERSION) {
    api.purgeMockDataAndSyncLive().then(() => {
      localStorage.setItem('wf_live_synced', LIVE_DATA_VERSION);
    });
  }
}

