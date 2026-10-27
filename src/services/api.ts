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
import { supabase, supabaseAdmin, isSupabaseEnabled, ensureSupabaseSession, isSupabaseCircuitOpen } from '../lib/supabase';
const dbClient = (supabaseAdmin || supabase);
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
    name: 'Joy Corporate Solutions',
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
    name: 'Carenow',
    code: 'JCS-CN',
    branch_type: 'OFFICE',
    country: 'India',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    address: 'Coimbatore',
    postal_code: '641004',
    timezone: 'Asia/Kolkata',
    status: 'Active',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'e666748e-8e0f-4d24-ae6a-e1cf85822a0f',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    name: 'Joy Office',
    code: 'OFZ-CBE',
    branch_type: 'HEADQUARTERS',
    country: 'India',
    city: 'Coimbatore',
    state: 'Tamil Nadu',
    address: 'Coimbatore',
    postal_code: '641004',
    timezone: 'Asia/Kolkata',
    status: 'Active',
    created_at: '2024-01-01T00:00:00Z',
  },
];

export const DEFAULT_DEPARTMENTS: Department[] = [
  {
    id: '0cdef8b4-014c-4487-895c-cf264824a0da',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    name: 'Development',
    code: 'IT',
    description: 'Software Product Engineering, Web and Mobile App Development',
    status: 'Active',
    employee_count: 14,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '70d63528-7aa9-4630-adcc-b7a6194250cd',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    name: 'Human Resource',
    code: 'HR',
    description: 'People Operations, Talent Acquisition, Statutory & Payroll',
    status: 'Active',
    employee_count: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '2a5f0b0b-7262-4894-9a5e-51ea09694bbf',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    name: 'DIGITAL MARKETING',
    code: 'DM',
    description: 'Digital Marketing & Growth Operations',
    status: 'Active',
    employee_count: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'a9b05628-b029-46be-81b7-6599cd5b99c0',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    name: 'MANAGEMENT',
    code: 'MGT',
    description: 'Executive Management & Leadership',
    status: 'Active',
    employee_count: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '3dcc60e5-c876-4df6-9ed4-0ab1c21ed006',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    name: 'ACCOUNTS',
    code: 'ACC',
    description: 'Finance & Accounts',
    status: 'Active',
    employee_count: 0,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'ed963bc8-95e3-493c-a42b-055d6b2fef0d',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    name: 'OPERATIONS',
    code: 'OPE',
    description: 'Business Operations',
    status: 'Active',
    employee_count: 0,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'ae57c63a-e064-48f2-a6ee-da079754a526',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    name: 'FIELD OPERATIONS',
    code: 'FOPE',
    description: 'Field Logistics and Operations',
    status: 'Active',
    employee_count: 0,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '55fb965b-92f7-4c74-b40a-ec1c1492b2b6',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    name: 'HR & ADMIN',
    code: 'HRA',
    description: 'Human Resources & General Administration',
    status: 'Active',
    employee_count: 0,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: '3843634d-4155-4d34-8b6a-37681dea4cdc',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    name: 'SOFTWARE',
    code: 'SD',
    description: 'Software Engineering & Solutions',
    status: 'Active',
    employee_count: 0,
    created_at: '2024-01-01T00:00:00Z',
  },
];

export const DEFAULT_DESIGNATIONS: Designation[] = [
  {
    id: 'bf08ad15-a4db-4b0c-a758-0ab628fb9a6c',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    title: 'Manager',
    code: 'DESG-MGR',
    grade: 'L4 - Lead / Manager',
  },
  {
    id: '554ed503-858a-4126-9607-ef65c6b77e7f',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    title: 'General Manager',
    code: 'DESG-GM',
    grade: 'L5 - Leadership',
  },
  {
    id: '28e07b7c-0e39-4146-8663-aa192752fc16',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    title: 'Lead / Supervisor',
    code: 'DESG-LEAD',
    grade: 'L4 - Lead / Manager',
  },
  {
    id: '9dde4946-8e75-4058-a32f-e6df9d4fdcde',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    title: 'HR Operations Specialist',
    code: 'DESG-HROPS',
    grade: 'L3 - Mid Level',
  },
  {
    id: '995acb28-db78-42e8-a5c2-7005bbb673b8',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    title: 'Software Engineer',
    code: 'DESG-SE',
    grade: 'L3 - Mid Level',
  },
  {
    id: 'fd2762cd-b1bb-402e-a7ee-81a80aa0eab7',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    title: 'Developer',
    code: 'DESG-DEVEL',
    grade: 'L3 - Mid Level',
  },
  {
    id: 'd1000000-0000-4000-8000-000000000001',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    title: 'Senior Software Engineer',
    code: 'DES-01',
    grade: 'L4 - Senior',
  },
  {
    id: '0dfa6748-c76b-4867-a9f4-59eaf6804a44',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    title: 'Executive',
    code: 'DESG-EXECU',
    grade: 'L2 - Junior',
  },
  {
    id: '2c03e78b-be67-416a-849b-bb5b1a0abfb6',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    title: 'ANALYST',
    code: 'DESG-ANALY',
    grade: 'L3 - Mid Level',
  },
  {
    id: 'a2b42949-06d0-45c9-9c0d-641702f9549d',
    company_id: '2030277f-a6a1-427f-beaf-4fc677a3bae2',
    title: 'Staff',
    code: 'DESG-STAFF',
    grade: 'L1 - Entry',
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
    const PURGE_TOKEN = 'wf_strict_zero_seed_v18_purge_21_workers_plant_structures';
    const shouldFullPurge = localStorage.getItem('wf_zero_seed_token') !== PURGE_TOKEN;
    if (shouldFullPurge) {
      localStorage.setItem('wf_zero_seed_token', PURGE_TOKEN);
    }

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
        k.startsWith('workforce_shifts') ||
        k.startsWith('workforce_rosters') ||
        k.startsWith('joy_shifts') ||
        k.startsWith('joy_rosters') ||
        (shouldFullPurge && (
          k.startsWith('workforceos_attendance_daily_v2') ||
          k.startsWith('workforceos_attendance_regularizations_v2') ||
          k.startsWith('workforce_payroll_runs') ||
          k.startsWith('workforce_payroll_salaries') ||
          k.startsWith('workforce_payroll_canteen') ||
          k.startsWith('workforce_payroll_advances') ||
          k.startsWith('joy_redis_') ||
          k.startsWith('upstash_redis_') ||
          k === 'workforce_departments' ||
          k === 'workforce_designations' ||
          k === 'workforce_employees'
        ))
      ) {
        localStorage.removeItem(k);
      }
    }

    // Always sanitize salary structures in localStorage to remove mock plant structures
    for (const k of allKeys) {
      if (k.startsWith('workforce_payroll_structures')) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter(
                (s: any) =>
                  s?.id !== 'str-daily-wage-plant' &&
                  s?.code !== 'STR-DAILY-PLANT' &&
                  !String(s?.name || '').toLowerCase().includes('21 worker')
              );
              localStorage.setItem(k, JSON.stringify(cleaned));
            }
          }
        } catch (_) {}
      }

      // Always sanitize employee salary assignments to remove mock worker assignments
      if (k.startsWith('workforce_payroll_salaries')) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const cleaned = parsed.filter(
                (s: any) =>
                  !String(s?.id || '').startsWith('sal-ce') &&
                  !String(s?.employee_code || '').toUpperCase().startsWith('CE0') &&
                  s?.salary_structure_id !== 'str-daily-wage-plant'
              );
              localStorage.setItem(k, JSON.stringify(cleaned));
            }
          }
        } catch (_) {}
      }
    }

    // Always sanitize workforce_employees in localStorage to remove any CE0* and resolve authentic departments
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
        }).map((e: any) => {
          const dId = String(e?.department_id || e?.employment?.department_id || '').toLowerCase().trim();
          const matchedDept = DEFAULT_DEPARTMENTS.find((d) => String(d.id).toLowerCase().trim() === dId);
          if (matchedDept && (!e.department_name || !e.department)) {
            e.department_name = matchedDept.name.trim();
            e.department = matchedDept.name.trim();
            if (e.employment) {
              e.employment.department_name = matchedDept.name.trim();
              e.employment.department_id = matchedDept.id;
            }
          }
          const desId = String(e?.designation_id || e?.employment?.designation_id || '').toLowerCase().trim();
          const matchedDesig = DEFAULT_DESIGNATIONS.find((dg) => String(dg.id).toLowerCase().trim() === desId);
          if (matchedDesig && (!e.designation_title || !e.designation)) {
            e.designation_title = matchedDesig.title.trim();
            e.designation = matchedDesig.title.trim();
            if (e.employment) {
              e.employment.designation_title = matchedDesig.title.trim();
              e.employment.designation_id = matchedDesig.id;
            }
          }
          return e;
        });
        localStorage.setItem('workforce_employees', JSON.stringify(cleanEmps));
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
  const rawMgrId = emp.reporting_manager_id !== undefined ? emp.reporting_manager_id : emp.employment?.reporting_manager_id;
  if (rawMgrId && isValidUUID(rawMgrId)) {
    clean.reporting_manager_id = rawMgrId;
  } else if (rawMgrId === null || rawMgrId === '') {
    clean.reporting_manager_id = null;
  }
  if (emp.user_id && isValidUUID(emp.user_id)) clean.user_id = emp.user_id;

  clean.employee_code = String(emp.employee_code || (emp.identity?.employee_code) || `WF-${Math.floor(1000 + Math.random() * 9000)}`).trim();
  if (emp.first_name) clean.first_name = String(emp.first_name).trim();
  if (emp.middle_name) clean.middle_name = String(emp.middle_name).trim();
  if (emp.last_name) clean.last_name = String(emp.last_name).trim();
  clean.display_name = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee';

  const rawWorkEmail = emp.work_email !== undefined ? emp.work_email : emp.profile?.work_email;
  if (rawWorkEmail !== undefined && rawWorkEmail !== null) clean.work_email = String(rawWorkEmail).trim();

  const rawPersonalEmail = emp.personal_email !== undefined ? emp.personal_email : emp.profile?.personal_email;
  if (rawPersonalEmail !== undefined) clean.personal_email = rawPersonalEmail ? String(rawPersonalEmail).trim() : null;

  const rawPhone = emp.phone !== undefined ? emp.phone : (emp.primary_mobile !== undefined ? emp.primary_mobile : emp.profile?.phone);
  if (rawPhone !== undefined) clean.phone = rawPhone ? String(rawPhone).trim() : null;

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

// ============================================================================
// Persistent Extended Employee Registry
// Guarantees Employment Sourcing, Compensation (CTC), Shift & Policy Settings
// never vanish upon Supabase employee re-fetch.
// ============================================================================
export const STORAGE_KEY_EXTENDED_EMPLOYEES = 'joy_peoplehr_extended_employee_registry_v1';

export function getExtendedEmployeeRegistry(): Record<string, any> {
  return getStorage<Record<string, any>>(STORAGE_KEY_EXTENDED_EMPLOYEES, {});
}

export function saveExtendedEmployeeRecord(empId: string, data: any) {
  if (!empId) return;
  const current = getExtendedEmployeeRegistry();
  current[empId] = {
    ...(current[empId] || {}),
    ...data,
    updated_at: new Date().toISOString(),
  };
  setStorage(STORAGE_KEY_EXTENDED_EMPLOYEES, current);
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
        const dbPayload: Record<string, any> = {
          id: updated.id,
          name: updated.name,
          display_name: updated.name,
          slug: updated.slug,
          industry: updated.industry,
          status: updated.status,
          plan: updated.plan,
          currency: updated.default_currency || 'INR',
          timezone: updated.timezone || 'Asia/Kolkata',
          updated_at: updated.updated_at,
        };
        const { error } = await supabase.from('organizations').upsert(dbPayload);
        if (error) console.warn('[API] Organization update notice:', error);
      } catch (err) {
        console.warn('[API] Failed to update organization on Supabase:', err);
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
  async getLocations(branchOrCompanyId?: string): Promise<Location[]> {
    const locMap = new Map<string, Location>();

    // 1. Populate from registered branches so all office branches are selectable work locations
    try {
      const branches = await this.getBranches(branchOrCompanyId);
      (branches || []).forEach((b) => {
        locMap.set(b.id, {
          id: b.id,
          branch_id: b.id,
          name: b.name,
          city: b.city,
          state: b.state,
          address: b.address || `${b.city || 'Coimbatore'}, ${b.state || 'Tamil Nadu'}`,
          latitude: 11.0168,
          longitude: 76.9558,
          geofence_radius_meters: 200,
          is_geofencing_enabled: true,
          is_active: b.status !== 'Inactive',
          created_at: b.created_at || '2024-01-01T00:00:00Z',
        } as Location);
      });
    } catch (_) {}

    // 2. Fetch specific work_locations from Supabase if configured
    if (isSupabaseEnabled) {
      try {
        let q = supabase.from('work_locations').select('*');
        if (branchOrCompanyId && isValidUUID(branchOrCompanyId)) {
          q = q.eq('branch_id', branchOrCompanyId);
        }
        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          data.forEach((l: any) => {
            locMap.set(l.id, {
              ...l,
              address: l.address_line1 || l.address,
              is_active: l.is_active ?? true,
            });
          });
        }
      } catch (err) {
        console.warn('[API] Work locations Supabase notice:', err);
      }
    }

    // 3. Include default fallback locations
    DEFAULT_LOCATIONS.forEach((l) => {
      if (!locMap.has(l.id)) locMap.set(l.id, l);
    });

    const result = Array.from(locMap.values());
    setStorage(KEYS.LOCATIONS, result);
    return result;
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
        let q = supabase.from('departments').select('*').order('name', { ascending: true });
        if (companyId && companyId !== 'all' && isValidUUID(companyId)) {
          q = q.eq('company_id', companyId);
        }
        const { data, error } = await q;
        if (!error && data && data.length > 0) {
          setStorage(KEYS.DEPARTMENTS, data);
          return data;
        } else if (companyId) {
          // If company filter returned empty, fetch all active organization departments
          const { data: allDepts } = await supabase.from('departments').select('*').order('name', { ascending: true });
          if (allDepts && allDepts.length > 0) {
            setStorage(KEYS.DEPARTMENTS, allDepts);
            return allDepts;
          }
        }
      } catch (err) {
        console.error('[API] Failed to fetch departments from Supabase:', err);
      }
    }
    const storedV2 = typeof window !== 'undefined' ? localStorage.getItem('workforceos_departments_v2') : null;
    if (storedV2) {
      try {
        const parsed = JSON.parse(storedV2);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (_) {}
    }
    const list = getStorage<Department[]>(KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
    if (!list || list.length === 0) {
      setStorage(KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
      return DEFAULT_DEPARTMENTS;
    }
    return list;
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
    let resultList: Designation[] = [];
    if (isSupabaseEnabled) {
      try {
        let q = supabase.from('designations').select('*').order('title', { ascending: true });
        if (companyId && isValidUUID(companyId)) {
          q = q.eq('company_id', companyId);
        }
        const { data, error } = await q;

        if (!error && data && data.length > 0) {
          resultList = data;
        } else {
          // Fallback to all designations in organization if company-level filter has no entries
          const { data: allDesigs } = await supabase.from('designations').select('*').order('title', { ascending: true });
          if (allDesigs && allDesigs.length > 0) {
            resultList = allDesigs;
          }
        }
      } catch (err) {
        console.warn('[API] Failed to fetch designations from Supabase:', err);
      }
    }

    const cachedList = getStorage<Designation[]>(KEYS.DESIGNATIONS, DEFAULT_DESIGNATIONS);
    const combinedMap = new Map<string, Designation>();
    (resultList.length > 0 ? resultList : cachedList).forEach((d) => combinedMap.set(d.id, d));
    cachedList.forEach((d) => {
      if (!combinedMap.has(d.id)) combinedMap.set(d.id, d);
    });

    const merged = Array.from(combinedMap.values()).sort((a, b) => a.title.localeCompare(b.title));
    setStorage(KEYS.DESIGNATIONS, merged);
    return companyId && isValidUUID(companyId) ? merged.filter((d) => d.company_id === companyId) : merged;
  },

  async createDesignation(input: Partial<Designation> & { title: string }): Promise<Designation> {
    const rawCode = input.code || input.title.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'DESIG';
    const id = ensureUUID((input as any).id);
    const orgId = (input as any).organization_id || (typeof window !== 'undefined' ? localStorage.getItem('workforce_active_org_id') : null) || '0c621892-e938-4707-9957-13534ea32c19';
    const compId = input.company_id && isValidUUID(input.company_id) ? input.company_id : (api.getActiveCompany()?.id && isValidUUID(api.getActiveCompany()?.id) ? api.getActiveCompany()!.id : '2030277f-a6a1-427f-beaf-4fc677a3bae2');

    const newDesig: Designation = {
      id,
      title: input.title.trim(),
      code: rawCode,
      grade: input.grade || 'L3 - Mid Level',
      company_id: compId,
    };

    if (isSupabaseEnabled) {
      try {
        await ensureSupabaseSession();
        const payload: Record<string, any> = {
          id: newDesig.id,
          company_id: compId,
          title: newDesig.title,
          code: newDesig.code,
          grade: newDesig.grade,
        };
        if (isValidUUID(orgId)) {
          payload.organization_id = orgId;
        }

        let { data, error } = await supabase.from('designations').upsert(payload, { onConflict: 'id' }).select().single();
        if (error && (error.message?.includes('organization_id') || error.code === 'PGRST204')) {
          delete payload.organization_id;
          const retry = await supabase.from('designations').upsert(payload, { onConflict: 'id' }).select().single();
          data = retry.data;
          error = retry.error;
        }

        if (error) {
          console.warn('[API] Designation upsert to Supabase notice:', error.message || error);
        } else if (data) {
          const merged = { ...newDesig, ...data };
          const list = getStorage<Designation[]>(KEYS.DESIGNATIONS, []);
          const updated = [merged, ...list.filter((d) => d.id !== merged.id && d.title.toLowerCase() !== merged.title.toLowerCase())];
          setStorage(KEYS.DESIGNATIONS, updated);
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('designation:created', { detail: merged }));
          }
          try {
            hrEventBus.emit('designation.created', merged);
          } catch (_) {}
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
    try {
      hrEventBus.emit('designation.created', newDesig);
    } catch (_) {}

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

    // Authoritatively resolve department and designation from master dictionaries
    const syncDeptMap = new Map<string, string>();
    DEFAULT_DEPARTMENTS.forEach((d) => syncDeptMap.set(String(d.id).toLowerCase().trim(), d.name.trim()));
    const storedDepts = getStorage<Department[]>(KEYS.DEPARTMENTS, []);
    (storedDepts || []).forEach((d: any) => {
      if (d?.id && d?.name) syncDeptMap.set(String(d.id).toLowerCase().trim(), String(d.name).trim());
    });

    const syncDesigMap = new Map<string, string>();
    DEFAULT_DESIGNATIONS.forEach((d) => syncDesigMap.set(String(d.id).toLowerCase().trim(), d.title.trim()));
    const storedDesigs = getStorage<Designation[]>(KEYS.DESIGNATIONS, []);
    (storedDesigs || []).forEach((d: any) => {
      if (d?.id && d?.title) syncDesigMap.set(String(d.id).toLowerCase().trim(), String(d.title).trim());
    });

    list.forEach((e: any) => {
      const existingDept = (e.department_name || e.department || e.employment?.department_name || '').toString().trim();
      if (!existingDept) {
        const dId = String(e.department_id || e.employment?.department_id || '').toLowerCase().trim();
        if (dId && syncDeptMap.has(dId)) {
          const resolvedName = syncDeptMap.get(dId)!;
          e.department_name = resolvedName;
          e.department = resolvedName;
          if (e.employment) e.employment.department_name = resolvedName;
        }
      } else {
        e.department_name = existingDept;
        e.department = existingDept;
        if (e.employment) e.employment.department_name = existingDept;
      }

      const existingDesig = (e.designation_title || e.designation || e.employment?.designation_title || '').toString().trim();
      if (!existingDesig) {
        const desId = String(e.designation_id || e.employment?.designation_id || '').toLowerCase().trim();
        if (desId && syncDesigMap.has(desId)) {
          const resolvedTitle = syncDesigMap.get(desId)!;
          e.designation_title = resolvedTitle;
          e.designation = resolvedTitle;
          if (e.employment) e.employment.designation_title = resolvedTitle;
        }
      } else {
        e.designation_title = existingDesig;
        e.designation = existingDesig;
        if (e.employment) e.employment.designation_title = existingDesig;
      }

      const calculatedFullName = `${e.first_name || ''} ${e.last_name || ''}`.trim();
      if (calculatedFullName) {
        e.display_name = calculatedFullName;
      }

      // Real Reporting Manager and Team Lead two-name resolution
      const rawMgrId = e.reporting_manager_id || e.employment?.reporting_manager_id;
      let mgrName = '';
      if (rawMgrId) {
        const mgr = list.find((m: any) => m.id === rawMgrId);
        if (mgr) {
          mgrName = `${mgr.display_name || `${mgr.first_name || ''} ${mgr.last_name || ''}`.trim()}`.trim();
        }
      }
      if (!mgrName && (e.reporting_manager_name || e.employment?.reporting_manager_name)) {
        mgrName = String(e.reporting_manager_name || e.employment?.reporting_manager_name).trim();
      }

      const rawTlId = e.team_lead_id || e.employment?.team_lead_id;
      let tlName = '';
      if (rawTlId) {
        const tl = list.find((m: any) => m.id === rawTlId);
        if (tl) {
          tlName = `${tl.display_name || `${tl.first_name || ''} ${tl.last_name || ''}`.trim()}`.trim();
        }
      }
      if (!tlName && (e.team_lead_name || e.employment?.team_lead_name)) {
        tlName = String(e.team_lead_name || e.employment?.team_lead_name).trim();
      }

      let combinedReporting = '';
      if (mgrName && tlName && mgrName.toLowerCase() !== tlName.toLowerCase()) {
        combinedReporting = `${mgrName} (Manager) / ${tlName} (TL)`;
      } else if (mgrName) {
        combinedReporting = mgrName;
      } else if (tlName) {
        combinedReporting = `${tlName} (Supervisor)`;
      }

      if (combinedReporting) {
        e.reporting_manager_name = combinedReporting;
        e.manager_name = combinedReporting;
        e.reports_to_name = combinedReporting;
        if (e.employment) {
          e.employment.reporting_manager_name = combinedReporting;
          e.employment.manager_name = combinedReporting;
          e.employment.reports_to_name = combinedReporting;
          if (rawMgrId) e.employment.reporting_manager_id = rawMgrId;
          if (rawTlId) e.employment.team_lead_id = rawTlId;
          if (tlName) e.employment.team_lead_name = tlName;
        }
      }
    });

    return filterEmployeesLocalHelper(list, params);
  },

  _empCache: null as { data: Employee[]; timestamp: number } | null,
  _empInFlight: null as Promise<Employee[]> | null,
  _empCacheMap: new Map<string, { data: Employee[]; timestamp: number }>(),
  _empInFlightMap: new Map<string, Promise<Employee[]>>(),

  clearEmployeeCache(): void {
    this._empCache = null;
    this._empInFlight = null;
    this._empCacheMap.clear();
    this._empInFlightMap.clear();
  },

  async getEmployees(params?: {
    search?: string;
    departmentId?: string;
    companyId?: string;
    status?: string;
    type?: string;
    source?: string;
    vendorId?: string;
    skipEnrichment?: boolean;
  } | string): Promise<Employee[]> {
    const isUnfiltered = !params || (typeof params === 'object' && Object.keys(params).filter(k => k !== 'skipEnrichment').length === 0);
    const filterObj = typeof params === 'string' ? { companyId: params } : params;
    const skipEnrichment = filterObj?.skipEnrichment === true;
    const now = Date.now();
    const cacheKey = typeof params === 'string' ? `comp:${params}` : JSON.stringify(params || {});

    // Serve from fresh 3-second memory cache to protect browser socket limit
    const existingCache = this._empCacheMap.get(cacheKey);
    if (existingCache && now - existingCache.timestamp < 3000) {
      return existingCache.data;
    }

    if (this._empInFlightMap.has(cacheKey)) {
      return this._empInFlightMap.get(cacheKey)!;
    }

    const fetchPromise = (async () => {
      if (isSupabaseEnabled && !isSupabaseCircuitOpen()) {
        try {
          await ensureSupabaseSession();
          let q = (supabaseAdmin || supabase).from('employees').select('*');
          const targetOrg = typeof window !== 'undefined' ? (localStorage.getItem('workforce_active_org_id') || '0c621892-e938-4707-9957-13534ea32c19') : '0c621892-e938-4707-9957-13534ea32c19';
          if (isValidUUID(targetOrg)) {
            q = q.eq('organization_id', targetOrg);
          }

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

          // No AbortController here — the _empInFlight singleton prevents duplicate fetches,
          // and abort signals cause false AbortErrors from React Strict Mode's double-invoke cleanup.
          const { data, error } = await q;

          if (!error && data !== null) {
            // Authoritative remote response: return empty array if no employees in database
            if (data.length === 0) {
              if (isUnfiltered && !skipEnrichment) {
                this._empCache = { data: [], timestamp: Date.now() };
              }
              return [];
            }

            // Concurrently fetch real Bank Accounts, Statutory, Departments, Designations and Managers
            const empIds = data.map((e: any) => e.id);
            if (empIds.length > 0 && !skipEnrichment) {
              try {
                const enrichAbort = new AbortController();
                const enrichTimer = setTimeout(() => enrichAbort.abort(), 12000);
                const mgrIds = [...new Set(data.map((e: any) => e.reporting_manager_id).filter((id: any) => Boolean(id) && isValidUUID(id)))];

                const [
                  bRes,
                  sRes,
                  deptRes,
                  desigRes,
                  extraMgrRes,
                  shiftAssignRes,
                  shiftsRes,
                  salAssignRes,
                  structuresRes,
                  branchesRes,
                  workLocRes,
                  locAssignRes,
                ] = await Promise.all([
                  Promise.resolve(dbClient.from('employee_bank_details').select('*').in('employee_id', empIds).abortSignal(enrichAbort.signal)).catch(() => ({ data: [] } as any)),
                  Promise.resolve(dbClient.from('employee_statutory_details').select('*').in('employee_id', empIds).abortSignal(enrichAbort.signal)).catch(() => ({ data: [] } as any)),
                  Promise.resolve(dbClient.from('departments').select('id, name, code, head_employee_id').abortSignal(enrichAbort.signal)).catch(() => ({ data: [] } as any)),
                  Promise.resolve(dbClient.from('designations').select('id, title, code').abortSignal(enrichAbort.signal)).catch(() => ({ data: [] } as any)),
                  mgrIds.length > 0
                    ? Promise.resolve(dbClient.from('employees').select('id, first_name, last_name, display_name, employee_code').in('id', mgrIds).abortSignal(enrichAbort.signal)).catch(() => ({ data: [] } as any))
                    : Promise.resolve({ data: [] } as any),
                  Promise.resolve(dbClient.from('employee_shift_assignments').select('*').in('employee_id', empIds).abortSignal(enrichAbort.signal)).catch(() => ({ data: [] } as any)),
                  Promise.resolve(dbClient.from('shifts').select('*').abortSignal(enrichAbort.signal)).catch(() => ({ data: [] } as any)),
                  Promise.resolve(dbClient.from('employee_salary_assignments').select('*').in('employee_id', empIds).abortSignal(enrichAbort.signal)).catch(() => ({ data: [] } as any)),
                  Promise.resolve(dbClient.from('salary_structures').select('*').abortSignal(enrichAbort.signal)).catch(() => ({ data: [] } as any)),
                  Promise.resolve(dbClient.from('branches').select('id, name, branch_code').abortSignal(enrichAbort.signal)).catch(() => ({ data: [] } as any)),
                  Promise.resolve(dbClient.from('work_locations').select('id, name, branch_id').abortSignal(enrichAbort.signal)).catch(() => ({ data: [] } as any)),
                  Promise.resolve(dbClient.from('employee_work_location_assignments').select('employee_id, work_location_id, is_primary').in('employee_id', empIds).abortSignal(enrichAbort.signal)).catch(() => ({ data: [] } as any)),
                ]);
                clearTimeout(enrichTimer);

                const branchMap = new Map<string, string>();
                DEFAULT_BRANCHES.forEach((b) => {
                  if (b?.id && b?.name) branchMap.set(String(b.id).toLowerCase().trim(), String(b.name).trim());
                });
                (branchesRes?.data || []).forEach((b: any) => {
                  if (b?.id && b?.name) branchMap.set(String(b.id).toLowerCase().trim(), String(b.name).trim());
                });

                const locMap = new Map<string, string>();
                (workLocRes?.data || []).forEach((l: any) => {
                  if (l?.id && l?.name) locMap.set(String(l.id).toLowerCase().trim(), String(l.name).trim());
                });

                const empLocMap = new Map<string, string>();
                (locAssignRes?.data || []).forEach((la: any) => {
                  if (la?.employee_id && la?.work_location_id) {
                    const locName = locMap.get(String(la.work_location_id).toLowerCase().trim());
                    if (locName) {
                      if (la.is_primary || !empLocMap.has(la.employee_id)) {
                        empLocMap.set(la.employee_id, locName);
                      }
                    }
                  }
                });

                const bankMap = new Map<string, any>((bRes?.data || []).map((b: any) => [b.employee_id, b]));
                const statMap = new Map<string, any>((sRes?.data || []).map((s: any) => [s.employee_id, s]));
                const salaryMap = new Map<string, any>((salAssignRes?.data || []).map((s: any) => [s.employee_id, s]));
                const structureMap = new Map<string, any>();
                (structuresRes?.data || []).forEach((st: any) => {
                  if (st.id) structureMap.set(st.id, st);
                  if (st.code) structureMap.set(st.code, st);
                });
                const shiftAssignMap = new Map<string, any>((shiftAssignRes?.data || []).map((sa: any) => [sa.employee_id, sa]));
                const shiftLookup = new Map<string, any>();
                (shiftsRes?.data || []).forEach((s: any) => {
                  if (s.id) shiftLookup.set(String(s.id).toLowerCase(), s);
                  if (s.code) shiftLookup.set(String(s.code).toLowerCase(), s);
                });
                const cachedEmployees = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
                const cachedMap = new Map<string, any>((cachedEmployees || []).map((ce: any) => [ce.id, ce]));
                const deptMap = new Map<string, string>();
                const deptHeadMap = new Map<string, string>();
                DEFAULT_DEPARTMENTS.forEach((d) => {
                  if (d?.id && d?.name) deptMap.set(String(d.id).toLowerCase().trim(), String(d.name).trim());
                });
                (deptRes?.data || []).forEach((d: any) => {
                  if (d?.id && d?.name) deptMap.set(String(d.id).toLowerCase().trim(), String(d.name).trim());
                  if (d?.id && d?.head_employee_id) deptHeadMap.set(String(d.id).toLowerCase().trim(), String(d.head_employee_id).trim());
                });

                const desigMap = new Map<string, string>();
                DEFAULT_DESIGNATIONS.forEach((d) => {
                  if (d?.id && d?.title) desigMap.set(String(d.id).toLowerCase().trim(), String(d.title).trim());
                });
                (desigRes?.data || []).forEach((d: any) => {
                  if (d?.id && d?.title) desigMap.set(String(d.id).toLowerCase().trim(), String(d.title).trim());
                });

                const empLookup = new Map<string, any>(data.map((e: any) => [e.id, e]));
                (extraMgrRes?.data || []).forEach((m: any) => {
                  if (!empLookup.has(m.id)) empLookup.set(m.id, m);
                });

                data.forEach((e: any) => {
                  const cachedEmp = cachedMap.get(e.id);
                  const extRegistry = getExtendedEmployeeRegistry();
                  const ext = extRegistry[e.id] || cachedEmp?.employment || {};

                  const b = bankMap.get(e.id);
                  if (b) {
                    e.bank = {
                      bank_name: b.bank_name || '',
                      account_number: b.account_number || '',
                      ifsc: b.ifsc_code || '',
                      ifsc_code: b.ifsc_code || '',
                      account_type: b.account_type || 'SALARY',
                      account_holder_name: b.account_holder_name || '',
                    };
                  }
                  const s = statMap.get(e.id);
                  if (s) {
                    e.statutory = {
                      pan: s.pan_number || null,
                      pan_number: s.pan_number || null,
                      aadhaar_number: s.aadhaar_number || null,
                      aadhaar_masked: s.aadhaar_number || null,
                      uan: s.uan_number || null,
                      uan_number: s.uan_number || null,
                      pf_number: s.pf_number || null,
                      esi_number: s.esi_number || null,
                      tax_regime: s.tax_regime || 'NEW',
                      pf_applicable: s.pf_applicable !== undefined ? Boolean(s.pf_applicable) : (s.is_pf_eligible !== undefined ? Boolean(s.is_pf_eligible) : Boolean(s.pf_number || s.uan_number)),
                      is_pf_eligible: s.is_pf_eligible !== undefined ? Boolean(s.is_pf_eligible) : (s.pf_applicable !== undefined ? Boolean(s.pf_applicable) : Boolean(s.pf_number || s.uan_number)),
                      esi_applicable: s.esi_applicable !== undefined ? Boolean(s.esi_applicable) : (s.is_esi_eligible !== undefined ? Boolean(s.is_esi_eligible) : Boolean(s.esi_number)),
                      is_esi_eligible: s.is_esi_eligible !== undefined ? Boolean(s.is_esi_eligible) : (s.esi_applicable !== undefined ? Boolean(s.esi_applicable) : Boolean(s.esi_number)),
                      pt_applicable: s.pt_applicable !== undefined ? Boolean(s.pt_applicable) : (s.is_pt_eligible !== undefined ? Boolean(s.is_pt_eligible) : true),
                      is_pt_eligible: s.is_pt_eligible !== undefined ? Boolean(s.is_pt_eligible) : (s.pt_applicable !== undefined ? Boolean(s.pt_applicable) : true),
                      tds_applicable: s.tds_applicable !== undefined ? Boolean(s.tds_applicable) : (s.is_tds_eligible !== undefined ? Boolean(s.is_tds_eligible) : true),
                      lwf_applicable: s.lwf_applicable !== undefined ? Boolean(s.lwf_applicable) : (s.is_lwf_eligible !== undefined ? Boolean(s.is_lwf_eligible) : false),
                      is_lwf_eligible: s.is_lwf_eligible !== undefined ? Boolean(s.is_lwf_eligible) : (s.lwf_applicable !== undefined ? Boolean(s.lwf_applicable) : false),
                    };
                  } else {
                    e.statutory = {
                      pan: null,
                      pan_number: null,
                      aadhaar_number: null,
                      aadhaar_masked: null,
                      uan: null,
                      uan_number: null,
                      pf_number: null,
                      esi_number: null,
                      tax_regime: 'NEW',
                      pf_applicable: false,
                      is_pf_eligible: false,
                      esi_applicable: false,
                      is_esi_eligible: false,
                      pt_applicable: true,
                      is_pt_eligible: true,
                      tds_applicable: true,
                      lwf_applicable: false,
                      is_lwf_eligible: false,
                    };
                  }

                  const rawStat = (e.employment_status || e.status || 'ACTIVE').toUpperCase();
                  e.status =
                    rawStat === 'PROBATION'
                      ? 'Probation'
                      : rawStat === 'NOTICE_PERIOD'
                      ? 'Notice Period'
                      : rawStat === 'TERMINATED'
                      ? 'Terminated'
                      : rawStat === 'RESIGNED'
                      ? 'Resigned'
                      : (rawStat === 'SUSPENDED' || rawStat === 'INACTIVE' || rawStat === 'DISABLED' || rawStat === 'ARCHIVED')
                      ? 'Inactive'
                      : 'Active';
                  e.employment_status = e.employment_status || rawStat;

                  // Authoritative Full Name resolution: always prefer full first_name + last_name
                  const calculatedFullName = `${e.first_name || ''} ${e.last_name || ''}`.trim();
                  if (calculatedFullName) {
                    e.display_name = calculatedFullName;
                  }

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

                  // Real Reporting Manager and Team Lead two-name resolution
                  const rawMgrId = e.reporting_manager_id || e.employment?.reporting_manager_id;
                  let mgrName = '';
                  if (rawMgrId) {
                    const mgr = empLookup.get(rawMgrId);
                    if (mgr) {
                      mgrName = `${mgr.display_name || `${mgr.first_name || ''} ${mgr.last_name || ''}`.trim()}`.trim();
                    }
                  }
                  if (!mgrName && (e.reporting_manager_name || e.employment?.reporting_manager_name)) {
                    mgrName = String(e.reporting_manager_name || e.employment?.reporting_manager_name).trim();
                  }

                  const extRec = getExtendedEmployeeRegistry()[e.id] || {};
                  const rawTlId = e.team_lead_id || e.employment?.team_lead_id || extRec.team_lead_id || extRec.employment?.team_lead_id;
                  let tlName = '';
                  if (rawTlId) {
                    const tl = empLookup.get(rawTlId);
                    if (tl) {
                      tlName = `${tl.display_name || `${tl.first_name || ''} ${tl.last_name || ''}`.trim()}`.trim();
                    }
                  }
                  if (!tlName && (e.team_lead_name || extRec.team_lead_name || extRec.employment?.team_lead_name)) {
                    tlName = String(e.team_lead_name || extRec.team_lead_name || extRec.employment?.team_lead_name).trim();
                  }

                  // If department has a head that is different from manager, and no other TL is assigned
                  const currentDeptId = String(e.department_id || e.employment?.department_id || '').toLowerCase().trim();
                  if (!tlName && currentDeptId && deptHeadMap.has(currentDeptId)) {
                    const headId = deptHeadMap.get(currentDeptId);
                    if (headId && headId !== rawMgrId && empLookup.has(headId)) {
                      const headEmp = empLookup.get(headId);
                      tlName = `${headEmp.display_name || `${headEmp.first_name || ''} ${headEmp.last_name || ''}`.trim()}`.trim();
                    }
                  }

                  let combinedReporting = '';
                  if (mgrName && tlName && mgrName.toLowerCase() !== tlName.toLowerCase()) {
                    combinedReporting = `${mgrName} (Manager) / ${tlName} (TL)`;
                  } else if (mgrName) {
                    combinedReporting = mgrName;
                  } else if (tlName) {
                    combinedReporting = `${tlName} (Supervisor)`;
                  }

                  if (combinedReporting) {
                    e.reporting_manager_name = combinedReporting;
                    e.manager_name = combinedReporting;
                    e.reports_to_name = combinedReporting;
                    e.employment.reporting_manager_name = combinedReporting;
                    e.employment.manager_name = combinedReporting;
                    e.employment.reports_to_name = combinedReporting;
                  } else {
                    e.reporting_manager_name = null;
                    e.manager_name = null;
                    e.reports_to_name = null;
                    e.employment.reporting_manager_name = null;
                    e.employment.manager_name = null;
                    e.employment.reports_to_name = null;
                  }
                  if (rawMgrId) {
                    e.reporting_manager_id = rawMgrId;
                    e.employment.reporting_manager_id = rawMgrId;
                  }
                  if (rawTlId) {
                    e.team_lead_id = rawTlId;
                    e.employment.team_lead_id = rawTlId;
                    e.team_lead_name = tlName;
                    e.employment.team_lead_name = tlName;
                  }

                  // Real Department from Supabase - resolve from deptMap FIRST if department_id is present
                  const dId = String(e.department_id || e.employment?.department_id || '').toLowerCase().trim();
                  if (dId && deptMap.has(dId)) {
                    e.department_name = deptMap.get(dId)!;
                    e.department = e.department_name;
                  } else {
                    const existingDept = (e.department_name || e.department || e.employment?.department_name || '').toString().trim();
                    if (existingDept) {
                      e.department_name = existingDept;
                      e.department = existingDept;
                    }
                  }
                  if (e.employment) {
                    e.employment.department_name = e.department_name;
                    e.employment.department_id = e.department_id;
                  }

                  // Real Designation from Supabase - resolve from desigMap FIRST if designation_id is present
                  const desId = String(e.designation_id || e.employment?.designation_id || '').toLowerCase().trim();
                  if (desId && desigMap.has(desId)) {
                    e.designation_title = desigMap.get(desId)!;
                    e.designation = e.designation_title;
                  } else {
                    const existingDesig = (e.designation_title || e.designation || e.employment?.designation_title || '').toString().trim();
                    if (existingDesig) {
                      e.designation_title = existingDesig;
                      e.designation = existingDesig;
                    }
                  }
                  if (e.employment) {
                    e.employment.designation_title = e.designation_title;
                    e.employment.designation_id = e.designation_id;
                  }

                  // Real Branch resolution from Supabase
                  const rawBranchId = String(e.branch_id || e.employment?.branch_id || '').toLowerCase().trim();
                  if (rawBranchId && branchMap.has(rawBranchId)) {
                    e.branch_name = branchMap.get(rawBranchId)!;
                  } else {
                    const existingBranch = (e.branch_name || e.employment?.branch_name || '').toString().trim();
                    e.branch_name = existingBranch || '';
                  }

                  // Real Work Location / Campus resolution from Supabase assignments
                  const assignedLoc = empLocMap.get(e.id);
                  if (assignedLoc) {
                    e.work_location = assignedLoc;
                    e.work_location_name = assignedLoc;
                  } else if (ext.work_location || ext.work_location_name) {
                    e.work_location = String(ext.work_location || ext.work_location_name).trim();
                    e.work_location_name = e.work_location;
                  } else {
                    const existingLoc = (e.work_location || e.work_location_name || '').toString().trim();
                    e.work_location = existingLoc || '';
                    e.work_location_name = e.work_location;
                  }

                  e.location = e.work_location || e.branch_name || '';
                  e.company_name = e.company_name || 'Joy Corporate Solutions Pvt Ltd';

                  // Shift & Attendance Policy resolution (preserve cached client assignments \u0026 Supabase DB assignments)
                  const sa = shiftAssignMap.get(e.id);
                  const resolvedShiftId = sa?.shift_id || e.shift_id || e.employment?.shift_id || cachedEmp?.shift_id || cachedEmp?.employment?.shift_id;
                  const shiftRecord = resolvedShiftId ? shiftLookup.get(String(resolvedShiftId).toLowerCase()) : null;
                  const resolvedShiftName = shiftRecord?.name || e.shift_name || e.employment?.shift_name || cachedEmp?.shift_name || cachedEmp?.employment?.shift_name;
                  const resolvedShiftCode = shiftRecord?.code || e.shift_code || e.employment?.shift_code || cachedEmp?.shift_code;
                  const resolvedStartTime = shiftRecord?.start_time ? shiftRecord.start_time.slice(0, 5) : (e.start_time || e.employment?.start_time);
                  const resolvedEndTime = shiftRecord?.end_time ? shiftRecord.end_time.slice(0, 5) : (e.end_time || e.employment?.end_time);

                  const resolvedPolicyId = e.attendance_policy_id || e.employment?.attendance_policy_id || cachedEmp?.attendance_policy_id || cachedEmp?.employment?.attendance_policy_id;
                  const resolvedLeavePolicyId = e.leave_policy_id || e.employment?.leave_policy_id || cachedEmp?.leave_policy_id || cachedEmp?.employment?.leave_policy_id;

                  if (resolvedShiftId) {
                    e.shift_id = resolvedShiftId;
                    e.employment.shift_id = resolvedShiftId;
                  }
                  if (resolvedShiftCode) {
                    e.shift_code = resolvedShiftCode;
                    e.employment.shift_code = resolvedShiftCode;
                  }
                  if (resolvedShiftName) {
                    e.shift_name = resolvedShiftName;
                    e.employment.shift_name = resolvedShiftName;
                  }
                  if (resolvedStartTime) {
                    e.shift_start_time = resolvedStartTime;
                    e.start_time = resolvedStartTime;
                    e.employment.start_time = resolvedStartTime;
                  }
                  if (resolvedEndTime) {
                    e.shift_end_time = resolvedEndTime;
                    e.end_time = resolvedEndTime;
                    e.employment.end_time = resolvedEndTime;
                  }
                  if (resolvedPolicyId) {
                    e.attendance_policy_id = resolvedPolicyId;
                    e.employment.attendance_policy_id = resolvedPolicyId;
                  }
                  if (resolvedLeavePolicyId) {
                    e.leave_policy_id = resolvedLeavePolicyId;
                    e.employment.leave_policy_id = resolvedLeavePolicyId;
                  }

                  // Fallback for bank/statutory from cachedEmp if not in Supabase join
                  if (!e.bank && cachedEmp?.bank) e.bank = cachedEmp.bank;
                  if (!e.statutory && cachedEmp?.statutory) e.statutory = cachedEmp.statutory;

                  // Sourcing Channel: default to 'DIRECT' unless explicitly set to vendor/contract
                  const resolvedSource = ext.employment_source || cachedEmp?.employment_source || (e.employment_type === 'CONTRACT' ? 'CONTRACT' : 'DIRECT');
                  e.employment_source = resolvedSource;

                  // Real Compensation & CTC from Supabase employee_salary_assignments
                  const sal = salaryMap.get(e.id);
                  const matchedStructure = sal?.salary_structure_id ? structureMap.get(sal.salary_structure_id) : null;
                  const realAnnualCtc = sal ? Number(sal.annual_ctc || 0) : (ext.annual_ctc !== undefined ? Number(ext.annual_ctc) : (cachedEmp?.annual_ctc !== undefined ? Number(cachedEmp.annual_ctc) : 0));
                  const realMonthlyGross = sal ? Number(sal.monthly_gross || sal.gross_monthly || 0) : (ext.monthly_ctc !== undefined ? Number(ext.monthly_ctc) : (cachedEmp?.monthly_ctc !== undefined ? Number(cachedEmp.monthly_ctc) : (realAnnualCtc > 0 ? Math.round(realAnnualCtc / 12) : 0)));

                  e.annual_ctc = realAnnualCtc;
                  e.monthly_ctc = realMonthlyGross || (realAnnualCtc > 0 ? Math.round(realAnnualCtc / 12) : 0);
                  e.monthly_gross = e.monthly_ctc;
                  e.ctc = realAnnualCtc;
                  e.salary_structure_code = matchedStructure?.code || ext.salary_structure_code || cachedEmp?.salary_structure_code || 'CORP_STD_01';
                  e.salary_structure_name = matchedStructure?.name || ext.salary_structure_name || cachedEmp?.salary_structure_name || 'Corporate Standard CTC Structure';
                  e.salary_structure_id = sal?.salary_structure_id || matchedStructure?.id;
                  e.salary_effective_from = sal?.effective_from || ext.salary_effective_from || e.doj || '2026-04-01';
                  e.compensation_basis = ext.compensation_basis || cachedEmp?.compensation_basis || 'CTC_INCLUSIVE';
                  if (sal) {
                    e.salary_assignment = sal;
                  }

                  // Work assignments & policies
                  e.work_mode = ext.work_mode || cachedEmp?.work_mode || 'Hybrid';
                  e.job_level = ext.job_level || cachedEmp?.job_level || 'Mid Level';
                  e.grade = ext.grade || cachedEmp?.grade || 'G3';
                  e.probation_period_months = ext.probation_period_months ?? cachedEmp?.probation_period_months ?? 6;
                  e.notice_period_days = ext.notice_period_days ?? cachedEmp?.notice_period_days ?? 60;
                  e.location_id = ext.location_id || cachedEmp?.location_id || e.branch_id;
                  if (!e.work_location) {
                    const extLoc = (ext.work_location || ext.work_location_name || '').toString().trim();
                    if (extLoc) {
                      e.work_location = extLoc;
                      e.work_location_name = extLoc;
                    }
                  }

                  if (ext.vendor_id && resolvedSource === 'VENDOR') {
                    e.vendor_id = ext.vendor_id;
                    e.vendor_name = ext.vendor_name;
                    e.vendor_employee_code = ext.vendor_employee_code;
                  } else {
                    e.vendor_id = null;
                    e.vendor_name = null;
                    e.vendor_employee_code = null;
                  }

                  // Populate e.employment object for all consumer views
                  e.employment = {
                    ...(e.employment || {}),
                    ...(ext.employment || {}),
                    doj: e.doj || '2026-09-01',
                    employment_type: e.employment_type || 'FULL_TIME',
                    employment_source: e.employment_source,
                    reporting_manager_id: e.reporting_manager_id,
                    department_id: e.department_id,
                    department_name: e.department_name,
                    designation_id: e.designation_id,
                    designation_title: e.designation_title,
                    branch_id: e.branch_id,
                    branch_name: e.branch_name,
                    location_id: e.location_id,
                    work_location: e.work_location,
                    work_location_name: e.work_location_name,
                    work_mode: e.work_mode,
                    job_level: e.job_level,
                    grade: e.grade,
                    probation_period_months: e.probation_period_months,
                    notice_period_days: e.notice_period_days,
                    shift_id: e.shift_id,
                    shift_name: e.shift_name,
                    attendance_policy_id: e.attendance_policy_id,
                    leave_policy_id: e.leave_policy_id,
                    annual_ctc: e.annual_ctc,
                    monthly_ctc: e.monthly_ctc,
                    monthly_gross: e.monthly_gross,
                    ctc: e.annual_ctc,
                    salary_structure_code: e.salary_structure_code,
                    salary_structure_name: e.salary_structure_name,
                    salary_structure_id: e.salary_structure_id,
                    salary_effective_from: e.salary_effective_from,
                    compensation_basis: e.compensation_basis,
                    vendor_id: e.vendor_id,
                    vendor_name: e.vendor_name,
                    vendor_employee_code: e.vendor_employee_code,
                  };
                });
              } catch (_) {}
            }

            const dbIds = new Set(data.map((e: any) => e.id));
            const cachedEmployees = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
            const localOnly = cachedEmployees.filter(
              (ce) => !dbIds.has(ce.id) && isValidUUID(ce.id)
            );
            const allUnified = [...data, ...localOnly];

            const combined = allUnified.filter((e: any) =>
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
            // Suppress noise if circuit is open or project is paused/restarting
            if (!isSupabaseCircuitOpen()) {
              const errMsg = String(error?.message || error?.name || error || '');
              if (!errMsg.toLowerCase().includes('abort')) {
                console.warn('[API] Supabase getEmployees error:', error.message || error);
              }
            }
            const fallback = api.getEmployeesSync(params);
            if (fallback && fallback.length > 0) return fallback;
            return [];
          }
        } catch (err: any) {
          const isAbort = err?.name === 'AbortError' || (err instanceof DOMException && err.code === DOMException.ABORT_ERR);
          if (!isAbort && !isSupabaseCircuitOpen()) {
            console.warn('[API] Supabase getEmployees fetch notice:', err);
          }
          const cached = api._empCache?.data;
          if (cached && cached.length > 0) return cached;
          const fallback = api.getEmployeesSync(params);
          if (fallback && fallback.length > 0) return fallback;
          return [];
        }
      }

      const syncResult = api.getEmployeesSync(params);
      if (isUnfiltered) {
        api._empCache = { data: syncResult, timestamp: Date.now() };
      }
      return syncResult;
    })();

    this._empInFlightMap.set(cacheKey, fetchPromise);
    if (isUnfiltered) {
      this._empInFlight = fetchPromise;
    }

    try {
      const res = await fetchPromise;
      if (res && res.length > 0) {
        this._empCacheMap.set(cacheKey, { data: res, timestamp: Date.now() });
      }
      return res;
    } finally {
      this._empInFlightMap.delete(cacheKey);
      if (isUnfiltered) {
        this._empInFlight = null;
      }
    }
  },

  async getEmployeeById(idOrCode: string): Promise<Employee | undefined> {
    if (!idOrCode) return undefined;
    const cleanKey = String(idOrCode).trim();
    const isUuid = isValidUUID(cleanKey);

    const cachedList = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
    const cachedEmp = cachedList.find(
      (e) => (e.id && e.id.toLowerCase() === cleanKey.toLowerCase()) ||
             (e.employee_code && e.employee_code.toLowerCase() === cleanKey.toLowerCase())
    );

    if (isSupabaseEnabled) {
      try {
        let empRow: any = null;
        if (isUuid) {
          const { data } = await dbClient.from('employees').select('*').eq('id', cleanKey).maybeSingle();
          empRow = data;
        } else {
          const { data } = await dbClient.from('employees').select('*').ilike('employee_code', cleanKey).maybeSingle();
          empRow = data;
        }

        if (empRow) {
          const resolvedUuid = empRow.id;
          const [bankRes, statRes, emgRes, salRes, docRes, profRes, addrRes, shiftRes] = await Promise.all([
            dbClient.from('employee_bank_details').select('*').eq('employee_id', resolvedUuid).maybeSingle(),
            dbClient.from('employee_statutory_details').select('*').eq('employee_id', resolvedUuid).maybeSingle(),
            dbClient.from('employee_emergency_contacts').select('*').eq('employee_id', resolvedUuid).order('is_primary', { ascending: false }),
            dbClient.from('employee_salary_assignments').select('*').eq('employee_id', resolvedUuid).order('effective_from', { ascending: false }).limit(1).maybeSingle(),
            dbClient.from('employee_documents').select('*').eq('employee_id', resolvedUuid),
            Promise.resolve(dbClient.from('employee_profiles').select('*').eq('employee_id', resolvedUuid).maybeSingle()).catch(() => ({ data: null })),
            Promise.resolve(dbClient.from('employee_addresses').select('*').eq('employee_id', resolvedUuid)).catch(() => ({ data: null })),
            Promise.resolve(dbClient.from('employee_shift_assignments').select('*').eq('employee_id', resolvedUuid).maybeSingle()).catch(() => ({ data: null })),
          ]);

          const empRes = { data: empRow, error: null };

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
              pan: statRes.data.pan_number || null,
              pan_number: statRes.data.pan_number || null,
              aadhaar_number: statRes.data.aadhaar_number || null,
              aadhaar_masked: statRes.data.aadhaar_number || null,
              uan: statRes.data.uan_number || null,
              uan_number: statRes.data.uan_number || null,
              pf_number: statRes.data.pf_number || null,
              esi_number: statRes.data.esi_number || null,
              tax_regime: statRes.data.tax_regime || 'NEW',
              pf_applicable: statRes.data.pf_applicable !== undefined ? statRes.data.pf_applicable : (statRes.data.is_pf_eligible ?? Boolean(statRes.data.pf_number || statRes.data.uan_number)),
              esi_applicable: statRes.data.esi_applicable !== undefined ? statRes.data.esi_applicable : (statRes.data.is_esi_eligible ?? Boolean(statRes.data.esi_number)),
              pt_applicable: statRes.data.pt_applicable !== undefined ? statRes.data.pt_applicable : (statRes.data.is_pt_eligible ?? true),
              tds_applicable: statRes.data.tds_applicable !== undefined ? statRes.data.tds_applicable : (statRes.data.is_tds_eligible ?? true),
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
            emp.annual_ctc = Number(salRes.data.annual_ctc) || 0;
            emp.monthly_gross = Number(salRes.data.gross_monthly || salRes.data.monthly_gross) || (emp.annual_ctc > 0 ? Math.round(emp.annual_ctc / 12) : 0);
            emp.monthly_ctc = emp.monthly_gross;
            emp.ctc = emp.annual_ctc;
            emp.salary_structure_id = salRes.data.salary_structure_id;
            emp.salary_effective_from = salRes.data.effective_from;

            if (salRes.data.salary_structure_id && isValidUUID(salRes.data.salary_structure_id)) {
              try {
                const { data: stData } = await supabase.from('salary_structures').select('name, code').eq('id', salRes.data.salary_structure_id).maybeSingle();
                if (stData) {
                  emp.salary_structure_name = stData.name;
                  emp.salary_structure_code = stData.code;
                }
              } catch (_) {}
            }

            if (emp.employment) {
              emp.employment.annual_ctc = emp.annual_ctc;
              emp.employment.monthly_ctc = emp.monthly_ctc;
              emp.employment.monthly_gross = emp.monthly_gross;
              emp.employment.ctc = emp.annual_ctc;
              emp.employment.salary_structure_id = salRes.data.salary_structure_id;
              emp.employment.salary_structure_name = emp.salary_structure_name;
              emp.employment.salary_structure_code = emp.salary_structure_code;
              emp.employment.salary_effective_from = salRes.data.effective_from;
            }
          }

          // Hydrate Documents
          if (docRes?.data && docRes.data.length > 0) {
            emp.documents = docRes.data;
          }

          // Authoritative Department & Designation name resolution
          const dId = String(emp.department_id || emp.employment?.department_id || '').toLowerCase().trim();
          if (dId) {
            const cachedDepts = getStorage<Department[]>(KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
            const foundDept = cachedDepts.find((d) => String(d.id).toLowerCase().trim() === dId);
            if (foundDept) {
              emp.department_name = foundDept.name;
              emp.department = foundDept.name;
              if (emp.employment) emp.employment.department_name = foundDept.name;
            }
          }
          const desId = String(emp.designation_id || emp.employment?.designation_id || '').toLowerCase().trim();
          if (desId) {
            const cachedDesigs = getStorage<Designation[]>(KEYS.DESIGNATIONS, DEFAULT_DESIGNATIONS);
            const foundDesig = cachedDesigs.find((d) => String(d.id).toLowerCase().trim() === desId);
            if (foundDesig) {
              emp.designation_title = foundDesig.title;
              emp.designation = foundDesig.title;
              if (emp.employment) emp.employment.designation_title = foundDesig.title;
            }
          }

          // Hydrate Shift Assignment & Attendance Policy
          const resolvedShiftId = empRes.data.shift_id || empRes.data.employment?.shift_id || shiftRes?.data?.shift_id || cachedEmp?.shift_id || cachedEmp?.employment?.shift_id;
          const resolvedShiftName = empRes.data.shift_name || empRes.data.employment?.shift_name || cachedEmp?.shift_name || cachedEmp?.employment?.shift_name;
          const resolvedPolicyId = empRes.data.attendance_policy_id || empRes.data.employment?.attendance_policy_id || cachedEmp?.attendance_policy_id || cachedEmp?.employment?.attendance_policy_id;
          const resolvedLeavePolicyId = empRes.data.leave_policy_id || empRes.data.employment?.leave_policy_id || cachedEmp?.leave_policy_id || cachedEmp?.employment?.leave_policy_id;

          if (resolvedShiftId) {
            emp.shift_id = resolvedShiftId;
            emp.employment = emp.employment || {};
            emp.employment.shift_id = resolvedShiftId;
          }
          if (resolvedShiftName) {
            emp.shift_name = resolvedShiftName;
            emp.employment = emp.employment || {};
            emp.employment.shift_name = resolvedShiftName;
          }
          if (resolvedPolicyId) {
            emp.attendance_policy_id = resolvedPolicyId;
            emp.employment = emp.employment || {};
            emp.employment.attendance_policy_id = resolvedPolicyId;
          }
          if (resolvedLeavePolicyId) {
            emp.leave_policy_id = resolvedLeavePolicyId;
            emp.employment = emp.employment || {};
            emp.employment.leave_policy_id = resolvedLeavePolicyId;
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
        }
      } catch (err) {
        console.error('[API] Supabase getEmployeeById error:', err);
      }
    }

    if (cachedEmp) return cachedEmp;

    const list = await this.getEmployees();
    return list.find((e) => (e.id && e.id.toLowerCase() === cleanKey.toLowerCase()) || (e.employee_code && e.employee_code.toLowerCase() === cleanKey.toLowerCase()));
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

      const candidateWorkEmail = formData.work_email?.trim();
      const candidatePersonalEmail = formData.personal_email?.trim();
      const resolvedEmail = candidateWorkEmail || candidatePersonalEmail || existing.work_email || existing.personal_email;

      if (resolvedEmail) {
        employeePatch.work_email = resolvedEmail;
        mergedProfile.work_email = resolvedEmail;
      }
      if (candidatePersonalEmail) {
        employeePatch.personal_email = candidatePersonalEmail;
        mergedProfile.personal_email = candidatePersonalEmail;
      } else if (existing.personal_email) {
        employeePatch.personal_email = existing.personal_email;
      }

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
    } else if (stepNumber === 2) {
      // Step 2: Contact & Addresses
      if (formData.personal_email !== undefined && formData.personal_email.trim() !== '') {
        mergedProfile.personal_email = formData.personal_email.trim();
        employeePatch.personal_email = formData.personal_email.trim();
      } else if (existing.personal_email) {
        employeePatch.personal_email = existing.personal_email;
      }
      if (existing.work_email && !employeePatch.work_email) {
        employeePatch.work_email = existing.work_email;
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
      if (formData.location_id) {
        employeePatch.location_id = formData.location_id;
        mergedEmployment.location_id = formData.location_id;
      }
      if (formData.work_location || formData.work_location_name) {
        const wLoc = formData.work_location || formData.work_location_name;
        employeePatch.work_location = wLoc;
        employeePatch.work_location_name = wLoc;
        mergedEmployment.work_location = wLoc;
        mergedEmployment.work_location_name = wLoc;
      }

      mergedEmployment.work_mode = formData.work_mode;
      mergedEmployment.job_level = formData.job_level;
      mergedEmployment.grade = formData.grade;
      mergedEmployment.probation_period_months = formData.probation_months;
      mergedEmployment.notice_period_days = formData.notice_period_days;
      if (formData.shift_id) {
        employeePatch.shift_id = formData.shift_id;
        mergedEmployment.shift_id = formData.shift_id;
      }
      if (formData.shift_name) {
        employeePatch.shift_name = formData.shift_name;
        mergedEmployment.shift_name = formData.shift_name;
      }
      if (formData.attendance_policy_id) {
        employeePatch.attendance_policy_id = formData.attendance_policy_id;
        mergedEmployment.attendance_policy_id = formData.attendance_policy_id;
      }
      if (formData.leave_policy_id) {
        employeePatch.leave_policy_id = formData.leave_policy_id;
        mergedEmployment.leave_policy_id = formData.leave_policy_id;
      }
      mergedEmployment.salary_structure_code = formData.salary_structure_code;
      mergedEmployment.annual_ctc = formData.annual_ctc;
      mergedEmployment.monthly_ctc = formData.monthly_ctc;
      mergedEmployment.compensation_basis = formData.compensation_basis || 'CTC_INCLUSIVE';
      mergedEmployment.pf_applicable = formData.pf_applicable !== false;
      mergedEmployment.esi_applicable = formData.esi_applicable === true;
      mergedEmployment.pt_applicable = formData.pt_applicable !== false;
      mergedEmployment.tds_applicable = formData.tds_applicable !== false;
      mergedEmployment.lwf_applicable = formData.lwf_applicable === true;

      // Keep statutory details synchronized on employee in memory and jsonb
      const statPatch = (existing as any).statutory || {};
      statPatch.pf_applicable = formData.pf_applicable !== false;
      statPatch.is_pf_eligible = formData.pf_applicable !== false;
      statPatch.esi_applicable = formData.esi_applicable === true;
      statPatch.is_esi_eligible = formData.esi_applicable === true;
      statPatch.pt_applicable = formData.pt_applicable !== false;
      statPatch.is_pt_eligible = formData.pt_applicable !== false;
      statPatch.tds_applicable = formData.tds_applicable !== false;
      statPatch.is_tds_eligible = formData.tds_applicable !== false;
      statPatch.lwf_applicable = formData.lwf_applicable === true;
      statPatch.is_lwf_eligible = formData.lwf_applicable === true;
      (employeePatch as any).statutory = statPatch;

      // Upsert into employee_shift_assignments (safely without onConflict constraint error)
      const isAuthShift = await hasAuthenticatedSession();
      if (isAuthShift && isValidUUID(employeeId) && formData.shift_id) {
        try {
          const rawShiftId = String(formData.shift_id).trim();
          let shiftUUID: string | null = isValidUUID(rawShiftId) ? rawShiftId : null;
          if (!shiftUUID) {
            const { data: matchedShift } = await supabase
              .from('shifts')
              .select('id')
              .or(`code.ilike.${rawShiftId},name.ilike.%${rawShiftId}%`)
              .limit(1)
              .maybeSingle();
            if (matchedShift?.id) {
              shiftUUID = matchedShift.id;
            } else {
              const knownShifts: Record<string, string> = {
                'gen-09': 'f847c561-4bbb-4b9f-a2dd-003162897eef',
                'gen-10': 'f5ff5d00-8489-459b-8d8e-d930ecffef22',
                'shift-gen-09': 'f847c561-4bbb-4b9f-a2dd-003162897eef',
                'shift-gen-10': 'f5ff5d00-8489-459b-8d8e-d930ecffef22',
              };
              const lower = String(rawShiftId).toLowerCase();
              for (const [k, v] of Object.entries(knownShifts)) {
                if (lower.includes(k)) {
                  shiftUUID = v;
                  break;
                }
              }
            }
          }
          if (shiftUUID) {
            const { data: existingShift } = await supabase
              .from('employee_shift_assignments')
              .select('id')
              .eq('employee_id', employeeId)
              .maybeSingle();

            if (existingShift?.id) {
              await supabase
                .from('employee_shift_assignments')
                .update({
                  shift_id: shiftUUID,
                  effective_from: formData.doj || '2026-01-01',
                  valid_from: formData.doj || '2026-01-01',
                })
                .eq('id', existingShift.id);
            } else {
              await supabase
                .from('employee_shift_assignments')
                .insert({
                  organization_id: isValidUUID(orgId) ? orgId : '0c621892-e938-4707-9957-13534ea32c19',
                  company_id: isValidUUID(compId) ? compId : '2030277f-a6a1-427f-beaf-4fc677a3bae2',
                  employee_id: employeeId,
                  shift_id: shiftUUID,
                  effective_from: formData.doj || '2026-01-01',
                  valid_from: formData.doj || '2026-01-01',
                  weekly_offs: [0, 6],
                });
            }
          }
        } catch (shErr) {
          console.warn('[API] Step 3 shift assignment notice:', shErr);
        }
      }

      // Upsert into employee_salary_assignments (resilient select-then-update/insert)
      const isAuth = await hasAuthenticatedSession();
      if (isAuth && (formData.annual_ctc !== undefined || formData.monthly_ctc !== undefined)) {
        try {
          const annCtc = Number(formData.annual_ctc) || 0;
          const monGross = Number(formData.monthly_ctc) || (annCtc > 0 ? Math.round(annCtc / 12) : 0);

          let structureId = formData.salary_structure_id;
          if (!structureId || !isValidUUID(structureId)) {
            const rawCode = formData.salary_structure_code || 'CORP_STD_01';
            const { data: stRow } = await supabase.from('salary_structures').select('id').ilike('code', rawCode).limit(1).maybeSingle();
            structureId = stRow?.id;
            if (!structureId) {
              const { data: firstSt } = await supabase.from('salary_structures').select('id').limit(1).maybeSingle();
              structureId = firstSt?.id || null;
            }
          }

          const { data: existingSal } = await supabase
            .from('employee_salary_assignments')
            .select('id')
            .eq('employee_id', employeeId)
            .limit(1)
            .maybeSingle();

          if (existingSal?.id) {
            await dbClient
              .from('employee_salary_assignments')
              .update({
                annual_ctc: annCtc,
                monthly_gross: monGross,
                salary_structure_id: structureId,
                effective_from: formData.salary_effective_from || formData.doj || new Date().toISOString().split('T')[0],
                is_active: true,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingSal.id);
          } else {
            await dbClient
              .from('employee_salary_assignments')
              .insert({
                organization_id: isValidUUID(orgId) ? orgId : '0c621892-e938-4707-9957-13534ea32c19',
                employee_id: employeeId,
                salary_structure_id: structureId,
                annual_ctc: annCtc,
                monthly_gross: monGross,
                effective_from: formData.salary_effective_from || formData.doj || new Date().toISOString().split('T')[0],
                is_active: true,
              });
          }
        } catch (salErr) {
          console.warn('[API] Step 3 salary assignment notice:', salErr);
        }
      }

      // Upsert/Update statutory flags
      if (isAuth && (formData.pf_applicable !== undefined || formData.esi_applicable !== undefined || formData.pt_applicable !== undefined || formData.lwf_applicable !== undefined)) {
        try {
          const { data: existingStat } = await dbClient
            .from('employee_statutory_details')
            .select('id')
            .eq('employee_id', employeeId)
            .limit(1)
            .maybeSingle();

          const statOrgId = isValidUUID(orgId) ? orgId : '0c621892-e938-4707-9957-13534ea32c19';
          if (existingStat?.id) {
            await dbClient
              .from('employee_statutory_details')
              .update({
                is_pf_eligible: formData.pf_applicable !== false,
                is_esi_eligible: formData.esi_applicable === true,
                is_pt_eligible: formData.pt_applicable !== false,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingStat.id);
          } else {
            await dbClient
              .from('employee_statutory_details')
              .insert({
                organization_id: statOrgId,
                employee_id: employeeId,
                is_pf_eligible: formData.pf_applicable !== false,
                is_esi_eligible: formData.esi_applicable === true,
                is_pt_eligible: formData.pt_applicable !== false,
              });
          }
        } catch (statErr) {
          console.warn('[API] Step 3 statutory flags notice:', statErr);
        }
      }

      // Notify Payroll subsystem in real time
      hrEventBus.emit('payroll.salary.updated', {
        assignment: {
          employee_id: employeeId,
          annual_ctc: Number(formData.annual_ctc) || 0,
          monthly_gross: Number(formData.monthly_ctc) || 0,
          gross_monthly: Number(formData.monthly_ctc) || 0,
          pf_applicable: formData.pf_applicable !== false,
          esi_applicable: formData.esi_applicable === true,
          pt_applicable: formData.pt_applicable !== false,
          lwf_applicable: formData.lwf_applicable === true,
        },
        tenantId: orgId,
      });

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
        employeePatch.reporting_manager_id = formData.reporting_manager_id || null;
        mergedEmployment.reporting_manager_id = formData.reporting_manager_id || null;
        mergedEmployment.reporting_manager_name = formData.reporting_manager_name || null;
      } else {
        employeePatch.reporting_manager_id = null;
        mergedEmployment.reporting_manager_id = null;
        mergedEmployment.reporting_manager_name = null;
      }
      if (formData.team_lead_id || formData.team_lead_name) {
        employeePatch.team_lead_id = formData.team_lead_id || null;
        mergedEmployment.team_lead_id = formData.team_lead_id || null;
        mergedEmployment.team_lead_name = formData.team_lead_name || null;
      } else {
        employeePatch.team_lead_id = null;
        mergedEmployment.team_lead_id = null;
        mergedEmployment.team_lead_name = null;
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
      if (formData.bank_name || formData.account_number || formData.ifsc) {
        const bankData = {
          bank_name: formData.bank_name || '',
          account_number: formData.account_number || '',
          ifsc: formData.ifsc || formData.ifsc_code || '',
          ifsc_code: formData.ifsc || formData.ifsc_code || '',
          account_type: (formData.account_type || 'SALARY').toUpperCase(),
          account_holder_name: formData.account_holder_name || `${employeePatch.first_name || existing.first_name || ''} ${employeePatch.last_name || existing.last_name || ''}`.trim(),
        };
        mergedProfile.bank_account = bankData;
        (employeePatch as any).bank = bankData;
      }

      if (formData.pan || formData.uan || formData.pf_number || formData.esi_number || formData.aadhaar || formData.aadhaar_number || formData.tax_regime || formData.tds_applicable !== undefined) {
        const cleanPan = (formData.pan || formData.pan_number || '').toString().trim() || null;
        const cleanAadhaar = (formData.aadhaar_number || formData.aadhaar || formData.aadhaar_masked || '').toString().trim() || null;
        const cleanUan = (formData.uan || formData.uan_number || '').toString().trim() || null;
        const cleanPf = (formData.pf_number || '').toString().trim() || null;
        const cleanEsi = (formData.esi_number || formData.esi || '').toString().trim() || null;

        const statData = {
          pan: cleanPan,
          pan_number: cleanPan,
          aadhaar_number: cleanAadhaar,
          aadhaar_masked: cleanAadhaar,
          uan: cleanUan,
          uan_number: cleanUan,
          pf_number: cleanPf,
          esi_number: cleanEsi,
          tax_regime: (formData.tax_regime || 'NEW').toUpperCase(),
          pf_applicable: formData.pf_applicable !== false,
          is_pf_eligible: formData.pf_applicable !== false,
          esi_applicable: formData.esi_applicable === true,
          is_esi_eligible: formData.esi_applicable === true,
          pt_applicable: formData.pt_applicable !== false,
          is_pt_eligible: formData.pt_applicable !== false,
          tds_applicable: formData.tds_applicable !== false,
          is_tds_eligible: formData.tds_applicable !== false,
        };
        mergedProfile.statutory = statData;
        (employeePatch as any).statutory = statData;
      }

      // Upsert bank details
      if (isAuth && (formData.bank_name || formData.account_number || formData.ifsc)) {
        try {
          const { data: exBank } = await dbClient
            .from('employee_bank_details')
            .select('id')
            .eq('employee_id', employeeId)
            .limit(1)
            .maybeSingle();

          const bankPayload: any = {
            organization_id: isValidUUID(orgId) ? orgId : '0c621892-e938-4707-9957-13534ea32c19',
            employee_id: employeeId,
            bank_name: formData.bank_name || '',
            account_number: formData.account_number || '',
            ifsc_code: formData.ifsc || formData.ifsc_code || '',
            account_type: (formData.account_type || 'SALARY').toUpperCase(),
            account_holder_name: formData.account_holder_name || `${employeePatch.first_name || existing.first_name || ''} ${employeePatch.last_name || existing.last_name || ''}`.trim(),
            is_verified: true,
            updated_at: new Date().toISOString(),
          };

          if (exBank?.id) {
            await dbClient.from('employee_bank_details').update(bankPayload).eq('id', exBank.id);
          } else {
            await dbClient.from('employee_bank_details').insert(bankPayload);
          }
        } catch (bErr) {
          console.warn('[API] Bank details upsert notice:', bErr);
        }
      }

      // Upsert statutory details
      if (isAuth && (formData.pan || formData.uan || formData.pf_number || formData.esi_number || formData.aadhaar || formData.aadhaar_number || formData.tds_applicable !== undefined)) {
        try {
          const { data: exStat } = await dbClient
            .from('employee_statutory_details')
            .select('id')
            .eq('employee_id', employeeId)
            .limit(1)
            .maybeSingle();

          const cleanPan = (formData.pan || formData.pan_number || '').toString().trim() || null;
          const cleanAadhaar = (formData.aadhaar_number || formData.aadhaar || formData.aadhaar_masked || '').toString().trim() || null;
          const cleanUan = (formData.uan || formData.uan_number || '').toString().trim() || null;
          const cleanPf = (formData.pf_number || '').toString().trim() || null;
          const cleanEsi = (formData.esi_number || formData.esi || '').toString().trim() || null;

          const statPayload: any = {
            organization_id: isValidUUID(orgId) ? orgId : '0c621892-e938-4707-9957-13534ea32c19',
            employee_id: employeeId,
            pan_number: cleanPan,
            aadhaar_number: cleanAadhaar,
            uan_number: cleanUan,
            pf_number: cleanPf,
            esi_number: cleanEsi,
            is_pf_eligible: formData.pf_applicable !== false,
            is_esi_eligible: formData.esi_applicable === true,
            is_pt_eligible: formData.pt_applicable !== false,
            updated_at: new Date().toISOString(),
          };

          if (exStat?.id) {
            await dbClient.from('employee_statutory_details').update(statPayload).eq('id', exStat.id);
          } else {
            await dbClient.from('employee_statutory_details').insert(statPayload);
          }
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

    // Authoritatively save extended attributes into persistent registry
    saveExtendedEmployeeRecord(employeeId, {
      employment_source: employeePatch.employment_source || mergedEmployment.employment_source || existing.employment_source || 'DIRECT',
      vendor_id: employeePatch.vendor_id || mergedEmployment.vendor_id || null,
      vendor_name: employeePatch.vendor_name || mergedEmployment.vendor_name || null,
      vendor_employee_code: employeePatch.vendor_employee_code || mergedEmployment.vendor_employee_code || null,
      department_id: employeePatch.department_id || mergedEmployment.department_id,
      department_name: employeePatch.department_name || mergedEmployment.department_name,
      designation_id: employeePatch.designation_id || mergedEmployment.designation_id,
      designation_title: employeePatch.designation_title || mergedEmployment.designation_title,
      branch_id: employeePatch.branch_id || mergedEmployment.branch_id,
      location_id: employeePatch.location_id || mergedEmployment.location_id || employeePatch.branch_id,
      work_location: employeePatch.work_location || mergedEmployment.work_location,
      work_location_name: employeePatch.work_location_name || mergedEmployment.work_location_name,
      work_mode: mergedEmployment.work_mode,
      job_level: mergedEmployment.job_level,
      grade: mergedEmployment.grade,
      probation_period_months: mergedEmployment.probation_period_months,
      notice_period_days: mergedEmployment.notice_period_days,
      shift_id: employeePatch.shift_id || mergedEmployment.shift_id,
      shift_name: employeePatch.shift_name || mergedEmployment.shift_name,
      attendance_policy_id: employeePatch.attendance_policy_id || mergedEmployment.attendance_policy_id,
      leave_policy_id: employeePatch.leave_policy_id || mergedEmployment.leave_policy_id,
      annual_ctc: mergedEmployment.annual_ctc !== undefined ? Number(mergedEmployment.annual_ctc) : undefined,
      monthly_ctc: mergedEmployment.monthly_ctc !== undefined ? Number(mergedEmployment.monthly_ctc) : undefined,
      salary_structure_code: mergedEmployment.salary_structure_code,
      compensation_basis: mergedEmployment.compensation_basis,
      pf_applicable: formData.pf_applicable !== undefined ? formData.pf_applicable : existing.pf_applicable,
      esi_applicable: formData.esi_applicable !== undefined ? formData.esi_applicable : existing.esi_applicable,
      pt_applicable: formData.pt_applicable !== undefined ? formData.pt_applicable : existing.pt_applicable,
      tds_applicable: formData.tds_applicable !== undefined ? formData.tds_applicable : existing.tds_applicable,
      reporting_manager_id: employeePatch.reporting_manager_id !== undefined ? employeePatch.reporting_manager_id : (mergedEmployment.reporting_manager_id || existing.reporting_manager_id || null),
      reporting_manager_name: employeePatch.reporting_manager_name !== undefined ? employeePatch.reporting_manager_name : (mergedEmployment.reporting_manager_name || existing.reporting_manager_name || null),
      team_lead_id: employeePatch.team_lead_id !== undefined ? employeePatch.team_lead_id : (mergedEmployment.team_lead_id || existing.team_lead_id || null),
      team_lead_name: employeePatch.team_lead_name !== undefined ? employeePatch.team_lead_name : (mergedEmployment.team_lead_name || existing.team_lead_name || null),
      employment: mergedEmployment,
      profile: mergedProfile,
    });

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

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('employee:updated', { detail: { id: employeeId, employee: finalEmp } }));
    }
    return finalEmp;
  },

  async createEmployee(input: any): Promise<Employee> {
    const list = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
    
    // Preserve exact employee code (e.g. JCS-017, JCS-020). Auto-generate WF-100X ONLY if completely empty!
    let generatedCode = (input.employee_code || '').toString().trim();
    if (!generatedCode) {
      const existingCodes = list
        .map(e => e.employee_code)
        .filter(c => /^WF-\d+$/.test(c))
        .map(c => parseInt(c.replace('WF-', ''), 10));
      const maxCode = existingCodes.length > 0 ? Math.max(...existingCodes) : 1000;
      generatedCode = `WF-${maxCode + 1}`;
    }

    const source = input.employment_source || (input.employment?.employment_source) || 'DIRECT';

    // Work email: preserve user provided work or personal email.
    const userProvidedEmail = (input.work_email || input.personal_email || (input.profile?.personal_email) || '').toString().trim();
    const finalEmail = userProvidedEmail || `${generatedCode.toLowerCase().replace(/[^a-z0-9]/g, '')}@noemail.joypeoplehr.local`;

    const newEmp: Employee = {
      id: ensureUUID(input.id),
      organization_id: input.organization_id || 'org-joy-01',
      company_id: input.company_id || 'comp-joy-01',
      company_name: input.company_name || 'Joy Corporate Solutions Pvt Ltd',
      department_id: input.department_id || 'dept-eng',
      department_name: input.department_name || 'Operations',
      designation_id: input.designation_id || 'desig-sr-eng',
      designation_title: input.designation_title || 'Staff',
      employee_code: generatedCode,
      first_name: input.first_name || 'New',
      last_name: input.last_name || 'Employee',
      display_name: `${input.first_name || 'New'} ${input.last_name || 'Employee'}`.trim(),
      work_email: finalEmail,
      avatar_url: input.avatar_url || '',
      status: input.status || 'Active',
      employment_type: input.employment_type || 'Full Time',
      employment_source: source,
      vendor_id: input.vendor_id,
      vendor_name: input.vendor_name,
      vendor_employee_code: input.vendor_employee_code,
      annual_ctc: Number(input.annual_ctc || input.employment?.annual_ctc || input.ctc || 0) || undefined,
      monthly_ctc: Number(input.monthly_ctc || input.employment?.monthly_ctc || input.monthly_gross || input.employment?.monthly_gross || 0) || undefined,
      ctc: Number(input.ctc || input.annual_ctc || input.employment?.annual_ctc || 0) || undefined,
      profile: {
        first_name: input.first_name,
        middle_name: input.middle_name,
        last_name: input.last_name,
        preferred_name: input.preferred_name,
        personal_email: input.personal_email,
        phone: input.primary_mobile || input.phone,
        alternate_phone: input.alternate_phone,
        date_of_birth: input.date_of_birth || input.dob,
        gender: input.gender,
        marital_status: input.marital_status || 'Single',
        blood_group: input.blood_group,
        current_address: input.current_address,
        permanent_address: input.permanent_address,
        emergency_contacts: input.emergency_contacts,
        family_members: input.family_members,
        address: input.current_address?.line1 || (typeof input.current_address === 'string' ? input.current_address : undefined),
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
        work_mode: input.work_mode || input.employment?.work_mode || 'Hybrid',
        reporting_manager_id: input.reporting_manager_id,
        reporting_manager_name: input.reporting_manager_name,
        team_lead_id: input.team_lead_id,
        team_lead_name: input.team_lead_name,
        probation_period_months: input.probation_period_months || 6,
        notice_period_days: input.notice_period_days || 60,
        confirmation_status: input.confirmation_status || 'Pending',
        annual_ctc: Number(input.annual_ctc || input.employment?.annual_ctc || input.ctc || 0) || undefined,
        monthly_gross: Number(input.monthly_gross || input.monthly_ctc || input.employment?.monthly_gross || 0) || undefined,
        tax_regime: input.tax_regime || input.employment?.tax_regime || 'NEW',
        ...(input.employment || {}),
      },
      bank: input.bank || (input.bank_name || input.account_number ? {
        bank_name: input.bank_name || 'HDFC Bank',
        account_number: input.account_number || '',
        ifsc: input.ifsc || input.ifsc_code || '',
        account_holder_name: input.account_holder_name || `${input.first_name || ''} ${input.last_name || ''}`.trim(),
        account_type: input.account_type || 'SALARY',
      } : undefined),
      statutory: (() => {
        const s = (input.statutory || input || {}) as any;
        const cleanPan = (s.pan || s.pan_number || '').toString().trim() || null;
        const cleanUan = (s.uan || s.uan_number || '').toString().trim() || null;
        const cleanPf = (s.pf_number || s.pf_no || '').toString().trim() || null;
        const cleanEsi = (s.esi_number || s.esi || s.esic_number || s.esic || '').toString().trim() || null;
        const cleanAadhaar = (s.aadhaar_number || s.aadhaar || s.aadhaar_masked || '').toString().trim() || null;

        const isPf = s.pf_applicable !== undefined
          ? Boolean(s.pf_applicable)
          : s.is_pf_eligible !== undefined
            ? Boolean(s.is_pf_eligible)
            : Boolean(cleanPf || cleanUan);

        const isEsi = s.esi_applicable !== undefined
          ? Boolean(s.esi_applicable)
          : s.is_esi_eligible !== undefined
            ? Boolean(s.is_esi_eligible)
            : Boolean(cleanEsi);

        const isPt = s.pt_applicable !== undefined
          ? Boolean(s.pt_applicable)
          : s.is_pt_eligible !== undefined
            ? Boolean(s.is_pt_eligible)
            : true;

        return {
          pan: cleanPan,
          pan_number: cleanPan,
          uan: cleanUan,
          uan_number: cleanUan,
          pf_number: cleanPf,
          esi_number: cleanEsi,
          aadhaar_number: cleanAadhaar,
          aadhaar_masked: cleanAadhaar,
          pf_applicable: isPf,
          is_pf_eligible: isPf,
          esi_applicable: isEsi,
          is_esi_eligible: isEsi,
          pt_applicable: isPt,
          is_pt_eligible: isPt,
          tax_regime: s.tax_regime || 'NEW',
        };
      })(),
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

        // 3. Resolve department dynamically (by UUID or by Name, or create dynamically)
        const enteredDeptName = (input.department_name || newEmp.department_name || '').toString().trim();
        let validDeptId: string | null = null;
        let finalDeptName = enteredDeptName;

        try {
          // If a UUID was provided, test if it exists
          if (newEmp.department_id && isValidUUID(newEmp.department_id)) {
            const { data: matchedDept } = await supabase
              .from('departments')
              .select('id, name')
              .eq('id', newEmp.department_id)
              .maybeSingle();
            if (matchedDept) {
              validDeptId = matchedDept.id;
              finalDeptName = enteredDeptName || matchedDept.name;
            }
          }

          // If not resolved by ID, match by Name (case-insensitive)
          if (!validDeptId && finalDeptName) {
            const { data: matchedByName } = await supabase
              .from('departments')
              .select('id, name')
              .ilike('name', finalDeptName)
              .maybeSingle();

            if (matchedByName) {
              validDeptId = matchedByName.id;
              finalDeptName = matchedByName.name;
            } else {
              // Dynamically insert into departments table so user-typed departments exist in DB!
              const newDeptUUID = ensureUUID();
              const deptCode = finalDeptName.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, '') || 'DEPT';
              try {
                const { data: createdDept } = await supabase
                  .from('departments')
                  .insert({
                    id: newDeptUUID,
                    organization_id: validOrgId,
                    company_id: validCompanyId,
                    name: finalDeptName,
                    code: deptCode,
                    is_active: true,
                  })
                  .select()
                  .maybeSingle();

                validDeptId = createdDept?.id || newDeptUUID;
              } catch (deptCreateErr) {
                console.warn('[API] Department auto-creation notice:', deptCreateErr);
                validDeptId = newDeptUUID;
              }
            }
          }

          // Fallback if no department was entered at all
          if (!validDeptId) {
            const { data: firstDept } = await supabase
              .from('departments')
              .select('id, name')
              .limit(1)
              .maybeSingle();
            if (firstDept) {
              validDeptId = firstDept.id;
              finalDeptName = finalDeptName || firstDept.name;
            }
          }
        } catch (e) {
          console.warn('[API] Department dynamic resolution notice:', e);
        }

        // 4. Resolve designation dynamically (by UUID or by Title, or create dynamically)
        const enteredDesigTitle = (input.designation_title || newEmp.designation_title || '').toString().trim();
        let validDesigId: string | null = null;
        let finalDesigTitle = enteredDesigTitle;

        try {
          if (newEmp.designation_id && isValidUUID(newEmp.designation_id)) {
            const { data: matchedDesig } = await supabase
              .from('designations')
              .select('id, title')
              .eq('id', newEmp.designation_id)
              .maybeSingle();
            if (matchedDesig) {
              validDesigId = matchedDesig.id;
              finalDesigTitle = enteredDesigTitle || matchedDesig.title;
            }
          }

          if (!validDesigId && finalDesigTitle) {
            const { data: matchedByName } = await supabase
              .from('designations')
              .select('id, title')
              .ilike('title', finalDesigTitle)
              .maybeSingle();

            if (matchedByName) {
              validDesigId = matchedByName.id;
              finalDesigTitle = matchedByName.title;
            } else {
              // Dynamically insert into designations table
              const newDesigUUID = ensureUUID();
              const desigCode = 'DESG-' + finalDesigTitle.slice(0, 5).toUpperCase().replace(/[^A-Z]/g, '');
              try {
                const desigPayload: any = {
                  id: newDesigUUID,
                  company_id: validCompanyId,
                  title: finalDesigTitle,
                  code: desigCode,
                };
                if (isValidUUID(validOrgId)) desigPayload.organization_id = validOrgId;

                const { data: createdDesig } = await supabase
                  .from('designations')
                  .insert(desigPayload)
                  .select()
                  .maybeSingle();

                validDesigId = createdDesig?.id || newDesigUUID;
              } catch (desigCreateErr) {
                console.warn('[API] Designation auto-creation notice:', desigCreateErr);
                validDesigId = newDesigUUID;
              }
            }
          }

          if (!validDesigId) {
            const { data: firstDesig } = await supabase
              .from('designations')
              .select('id, title')
              .limit(1)
              .maybeSingle();
            if (firstDesig) {
              validDesigId = firstDesig.id;
              finalDesigTitle = finalDesigTitle || firstDesig.title;
            }
          }
        } catch (e) {
          console.warn('[API] Designation dynamic resolution notice:', e);
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
        newEmp.department_name = finalDeptName;
        newEmp.department = finalDeptName;
        newEmp.designation_id = validDesigId;
        newEmp.designation_title = finalDesigTitle;
        newEmp.designation = finalDesigTitle;
        if (newEmp.employment) {
          newEmp.employment.department_id = validDeptId;
          newEmp.employment.department_name = finalDeptName;
          newEmp.employment.designation_id = validDesigId;
          newEmp.employment.designation_title = finalDesigTitle;
        }
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
              await dbClient.from('employee_bank_details').upsert({
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

          // 4. Upsert Statutory Details (Ensuring PAN, Aadhaar, UAN, PF Number, ESIC Number are stored; null/nil if omitted)
          const s = (newEmp.statutory || input.statutory || input || {}) as any;
          try {
            const statId = ensureUUID(s.id || (newEmp.id ? 'c0000000-0000-0000-0000-' + newEmp.id.replace(/-/g, '').slice(0, 12) : null));
            const cleanPan = (s.pan || s.pan_number || '').toString().trim() || null;
            const cleanAadhaar = (s.aadhaar_number || s.aadhaar || s.aadhaar_masked || '').toString().trim() || null;
            const cleanUan = (s.uan || s.uan_number || '').toString().trim() || null;
            const cleanPf = (s.pf_number || s.pf_no || '').toString().trim() || null;
            const cleanEsi = (s.esi_number || s.esi || s.esic_number || s.esic || '').toString().trim() || null;

            await dbClient.from('employee_statutory_details').upsert({
              id: statId,
              organization_id: newEmp.organization_id,
              employee_id: newEmp.id,
              pan_number: cleanPan,
              aadhaar_number: cleanAadhaar,
              uan_number: cleanUan,
              pf_number: cleanPf,
              esi_number: cleanEsi,
              is_pf_eligible: s.is_pf_eligible !== undefined ? Boolean(s.is_pf_eligible) : Boolean(cleanPf || cleanUan),
              is_esi_eligible: s.is_esi_eligible !== undefined ? Boolean(s.is_esi_eligible) : Boolean(cleanEsi),
              is_pt_eligible: s.is_pt_eligible !== undefined ? Boolean(s.is_pt_eligible) : true,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'employee_id' });
          } catch (e) {
            console.warn('[API] Statutory upsert warning:', e);
          }

          // 5. Insert Employee Salary Assignment if provided
          const initAnnualCtc = Number(input.annual_ctc || input.employment?.annual_ctc || input.ctc || 0);
          if (initAnnualCtc > 0 || input.monthly_ctc || input.employment?.monthly_ctc) {
            try {
              const monGross = Number(input.monthly_ctc || input.employment?.monthly_ctc) || Math.round(initAnnualCtc / 12);
              const rawStructCode = input.salary_structure_code || input.employment?.salary_structure_code || 'CORP_STD_01';
              let structId = input.salary_structure_id || input.employment?.salary_structure_id;
              if (!structId || !isValidUUID(structId)) {
                const { data: stRow } = await dbClient.from('salary_structures').select('id').ilike('code', rawStructCode).limit(1).maybeSingle();
                structId = stRow?.id;
              }
              if (!structId) {
                const { data: firstSt } = await dbClient.from('salary_structures').select('id').limit(1).maybeSingle();
                structId = firstSt?.id || null;
              }

              await dbClient.from('employee_salary_assignments').insert({
                organization_id: newEmp.organization_id,
                employee_id: newEmp.id,
                salary_structure_id: structId,
                annual_ctc: initAnnualCtc,
                monthly_gross: monGross,
                effective_from: input.salary_effective_from || input.employment?.salary_effective_from || newEmp.employment.doj || new Date().toISOString().split('T')[0],
                is_active: true,
              });
            } catch (salErr) {
              console.warn('[API] createEmployee salary assignment notice:', salErr);
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
      const phoneNum = newEmp.profile?.phone || input.primary_mobile || input.phone || '';
      if (phoneNum || newEmp.work_email) {
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
      }
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
          tempPassword: 'joypeoplehr',
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
          companyName: newEmp.company_name || 'Joy Corporate Solutions',
          designation: newEmp.designation_title || 'Team Member',
          organizationId: newEmp.organization_id || '0c621892-e938-4707-9957-13534ea32c19',
          employeeId: newEmp.id,
          workEmail: targetEmail || newEmp.work_email || (newEmp as any).email || input.work_email || input.email,
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
    let resolvedEmploymentStatus: string | undefined;

    const firstName = data.first_name !== undefined ? data.first_name : (existing.first_name || '');
    const lastName = data.last_name !== undefined ? data.last_name : (existing.last_name || '');
    const displayName = data.display_name || `${firstName} ${lastName}`.trim();
    const targetPhone = data.phone !== undefined ? data.phone : (data.primary_mobile !== undefined ? data.primary_mobile : data.profile?.phone);
    const candidatePersonal = (data.personal_email || data.profile?.personal_email || '').toString().trim();
    const targetPersonalEmail = candidatePersonal || existing.personal_email || (existing.profile as any)?.personal_email;
    const candidateWork = (data.work_email || data.profile?.work_email || '').toString().trim();
    const targetWorkEmail = candidateWork || existing.work_email || (targetPersonalEmail || undefined);
    const targetMgrId = data.reporting_manager_id !== undefined ? data.reporting_manager_id : data.employment?.reporting_manager_id;

    // Resolve department_id & department_name
    let resolvedDeptId: string | null = null;
    let resolvedDeptName: string = (data.department_name || data.employment?.department_name || (data as any).department || '').toString().trim();
    const candidateDeptId = data.department_id || data.employment?.department_id;
    if (candidateDeptId && isValidUUID(candidateDeptId)) {
      resolvedDeptId = candidateDeptId;
    }

    // Resolve designation_id & designation_title
    let resolvedDesigId: string | null = null;
    let resolvedDesigTitle: string = (data.designation_title || data.employment?.designation_title || (data as any).designation || '').toString().trim();
    const candidateDesigId = data.designation_id || data.employment?.designation_id;
    if (candidateDesigId && isValidUUID(candidateDesigId)) {
      resolvedDesigId = candidateDesigId;
    }

    if (isSupabaseEnabled) {
      try {
        logger.db('EMPLOYEE_UPDATE_SENT', {
          correlationId,
          table: 'employees',
          employeeId: id,
          operation: 'UPDATE',
        });

        // Resolve Department UUID from database/cache if needed
        if (!resolvedDeptId && resolvedDeptName) {
          const cachedDepts = getStorage<Department[]>(KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
          const found = cachedDepts.find((d) => d.name.trim().toLowerCase() === resolvedDeptName.toLowerCase());
          if (found && isValidUUID(found.id)) {
            resolvedDeptId = found.id;
            resolvedDeptName = found.name;
          } else {
            try {
              const { data: dbDept } = await supabase.from('departments').select('id, name').ilike('name', resolvedDeptName).maybeSingle();
              if (dbDept && isValidUUID(dbDept.id)) {
                resolvedDeptId = dbDept.id;
                resolvedDeptName = dbDept.name;
              } else {
                const targetOrgId = isValidUUID(existing.organization_id) ? existing.organization_id : '0c621892-e938-4707-9957-13534ea32c19';
                const targetCompId = isValidUUID(existing.company_id) ? existing.company_id : '2030277f-a6a1-427f-beaf-4fc677a3bae2';
                const { data: newDept } = await supabase.from('departments').insert({
                  name: resolvedDeptName,
                  code: resolvedDeptName.slice(0, 4).toUpperCase(),
                  organization_id: targetOrgId,
                  company_id: targetCompId,
                  status: 'Active',
                }).select('id, name').maybeSingle();
                if (newDept && isValidUUID(newDept.id)) {
                  resolvedDeptId = newDept.id;
                  resolvedDeptName = newDept.name;
                }
              }
            } catch (_) {}
          }
        } else if (resolvedDeptId && !resolvedDeptName) {
          const cachedDepts = getStorage<Department[]>(KEYS.DEPARTMENTS, DEFAULT_DEPARTMENTS);
          const found = cachedDepts.find((d) => String(d.id).toLowerCase().trim() === String(resolvedDeptId).toLowerCase().trim());
          if (found) resolvedDeptName = found.name;
        }

        // Resolve Designation UUID from database/cache if needed
        if (!resolvedDesigId && resolvedDesigTitle) {
          const cachedDesigs = getStorage<Designation[]>(KEYS.DESIGNATIONS, DEFAULT_DESIGNATIONS);
          const found = cachedDesigs.find((d) => d.title.trim().toLowerCase() === resolvedDesigTitle.toLowerCase());
          if (found && isValidUUID(found.id)) {
            resolvedDesigId = found.id;
            resolvedDesigTitle = found.title;
          } else {
            try {
              const { data: dbDesig } = await supabase.from('designations').select('id, title').ilike('title', resolvedDesigTitle).maybeSingle();
              if (dbDesig && isValidUUID(dbDesig.id)) {
                resolvedDesigId = dbDesig.id;
                resolvedDesigTitle = dbDesig.title;
              } else {
                const targetOrgId = isValidUUID(existing.organization_id) ? existing.organization_id : '0c621892-e938-4707-9957-13534ea32c19';
                const targetCompId = isValidUUID(existing.company_id) ? existing.company_id : '2030277f-a6a1-427f-beaf-4fc677a3bae2';
                const { data: newDesig } = await supabase.from('designations').insert({
                  title: resolvedDesigTitle,
                  code: resolvedDesigTitle.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6) || 'DESIG',
                  organization_id: targetOrgId,
                  company_id: targetCompId,
                  status: 'Active',
                }).select('id, title').maybeSingle();
                if (newDesig && isValidUUID(newDesig.id)) {
                  resolvedDesigId = newDesig.id;
                  resolvedDesigTitle = newDesig.title;
                }
              }
            } catch (_) {}
          }
        } else if (resolvedDesigId && !resolvedDesigTitle) {
          const cachedDesigs = getStorage<Designation[]>(KEYS.DESIGNATIONS, DEFAULT_DESIGNATIONS);
          const found = cachedDesigs.find((d) => String(d.id).toLowerCase().trim() === String(resolvedDesigId).toLowerCase().trim());
          if (found) resolvedDesigTitle = found.title;
        }

        // Construct targeted patch for employees table
        const directPatch: Record<string, any> = {
          updated_at: new Date().toISOString(),
        };

        if (firstName) directPatch.first_name = firstName;
        if (lastName) directPatch.last_name = lastName;
        if (displayName) directPatch.display_name = displayName;
        if (data.middle_name !== undefined) directPatch.middle_name = data.middle_name ? String(data.middle_name).trim() : null;
        if (targetWorkEmail) directPatch.work_email = targetWorkEmail;
        if (targetPersonalEmail !== undefined) directPatch.personal_email = targetPersonalEmail || null;
        if (targetPhone !== undefined) directPatch.phone = targetPhone || null;
        if (data.avatar_url !== undefined) directPatch.avatar_url = data.avatar_url || null;

        const anyData = data as any;
        const candidateDob = anyData.dob || anyData.profile?.dob || data.profile?.date_of_birth;
        if (candidateDob) {
          directPatch.dob = candidateDob;
        }
        if (anyData.doj || data.employment?.doj) {
          directPatch.doj = anyData.doj || data.employment?.doj;
        }
        if (anyData.confirmation_date !== undefined || data.employment?.confirmation_date !== undefined) {
          directPatch.confirmation_date = anyData.confirmation_date || data.employment?.confirmation_date || null;
        }

        if (anyData.gender || data.profile?.gender) {
          const rawGender = String(anyData.gender || data.profile?.gender || 'MALE').toUpperCase().replace(/[\s-]/g, '_');
          if (rawGender.includes('FEMALE')) directPatch.gender = 'FEMALE';
          else if (rawGender.includes('NON_BINARY')) directPatch.gender = 'NON_BINARY';
          else if (rawGender.includes('PREFER')) directPatch.gender = 'PREFER_NOT_TO_SAY';
          else directPatch.gender = 'MALE';
        }

        if (data.employment_type || data.employment?.employment_type) {
          const rawType = String(data.employment_type || data.employment?.employment_type || 'FULL_TIME').toUpperCase().replace(/[\s-]/g, '_');
          if (rawType.includes('PART')) directPatch.employment_type = 'PART_TIME';
          else if (rawType.includes('CONTRACT')) directPatch.employment_type = 'CONTRACT';
          else if (rawType.includes('INTERN')) directPatch.employment_type = 'INTERN';
          else directPatch.employment_type = 'FULL_TIME';
        }

        if (data.status || (data as any).employment_status) {
          const rawStatus = String(data.status || (data as any).employment_status || 'ACTIVE').toUpperCase().replace(/[\s-]/g, '_');
          if (rawStatus.includes('PROBATION')) directPatch.employment_status = 'PROBATION';
          else if (rawStatus.includes('NOTICE')) directPatch.employment_status = 'NOTICE_PERIOD';
          else if (rawStatus.includes('SUSPEND') || rawStatus.includes('INACTIVE') || rawStatus.includes('DISABLE') || rawStatus.includes('ARCHIV')) directPatch.employment_status = 'SUSPENDED';
          else if (rawStatus.includes('TERMINAT')) directPatch.employment_status = 'TERMINATED';
          else if (rawStatus.includes('RESIGN')) directPatch.employment_status = 'RESIGNED';
          else directPatch.employment_status = 'ACTIVE';
          resolvedEmploymentStatus = directPatch.employment_status;
        }

        if (resolvedDeptId) directPatch.department_id = resolvedDeptId;
        if (resolvedDesigId) directPatch.designation_id = resolvedDesigId;

        const rawBranchId = data.branch_id || data.employment?.branch_id;
        if (rawBranchId && isValidUUID(rawBranchId)) directPatch.branch_id = rawBranchId;

        if (targetMgrId !== undefined) {
          directPatch.reporting_manager_id = (targetMgrId && isValidUUID(targetMgrId)) ? targetMgrId : null;
        }

        const isAuth = await hasAuthenticatedSession();
        if (isAuth) {
          const { data: updateData, error: updateErr } = await dbClient
            .from('employees')
            .update(directPatch)
            .eq('id', id)
            .select('*')
            .maybeSingle();

          if (updateErr) {
            console.warn('[API] Direct Supabase employee update notice:', updateErr.message || updateErr);
          } else if (updateData) {
            canonicalRecord = updateData as Employee;
            logger.db('EMPLOYEE_UPDATE_SUCCESS', {
              correlationId,
              table: 'employees',
              employeeId: id,
              operation: 'UPDATE',
              status: 'SUCCESS',
              rows: 1,
            });

            // Keep user_profiles synced if email or name updated
            if (targetWorkEmail) {
              try {
                await supabase.from('user_profiles').update({
                  email: targetWorkEmail,
                  full_name: displayName,
                  phone: targetPhone || undefined,
                  updated_at: new Date().toISOString(),
                }).eq('employee_id', id);
              } catch (_) {}
            }
          }
        }

        // Upsert Bank Details if provided
        if (isAuth && ((data as any).bank || (data as any).bank_name || (data as any).account_number || (data as any).ifsc)) {
          const b = (data as any).bank || data;
          try {
            const { data: exBank } = await dbClient
              .from('employee_bank_details')
              .select('id')
              .eq('employee_id', id)
              .limit(1)
              .maybeSingle();

            const bankPayload: any = {
              organization_id: isValidUUID(canonicalRecord?.organization_id || existing.organization_id) ? (canonicalRecord?.organization_id || existing.organization_id) : '0c621892-e938-4707-9957-13534ea32c19',
              employee_id: id,
              bank_name: b.bank_name || '',
              account_number: b.account_number || '',
              ifsc_code: b.ifsc || b.ifsc_code || '',
              account_type: (b.account_type || 'SALARY').toUpperCase(),
              account_holder_name: b.account_holder_name || `${existing.first_name || ''} ${existing.last_name || ''}`.trim(),
              is_verified: true,
              updated_at: new Date().toISOString(),
            };

            if (exBank?.id) {
              await dbClient.from('employee_bank_details').update(bankPayload).eq('id', exBank.id);
            } else {
              await dbClient.from('employee_bank_details').insert(bankPayload);
            }
          } catch (e) {
            console.warn('[API] Bank update warning:', e);
          }
        }

        // Upsert Statutory Details if provided
        if (isAuth && ((data as any).statutory || (data as any).pan || (data as any).uan || (data as any).pan_number || (data as any).uan_number || (data as any).pf_number || (data as any).esi_number || (data as any).aadhaar_number || (data as any).pf_applicable !== undefined || (data as any).esi_applicable !== undefined || (data as any).tds_applicable !== undefined)) {
          const s = (data as any).statutory || data;
          try {
            const { data: exStat } = await dbClient
              .from('employee_statutory_details')
              .select('id')
              .eq('employee_id', id)
              .limit(1)
              .maybeSingle();

            const cleanPan = (s.pan || s.pan_number || '').toString().trim() || null;
            const cleanAadhaar = (s.aadhaar_number || s.aadhaar || s.aadhaar_masked || '').toString().trim() || null;
            const cleanUan = (s.uan || s.uan_number || '').toString().trim() || null;
            const cleanPf = (s.pf_number || s.pf_no || '').toString().trim() || null;
            const cleanEsi = (s.esi_number || s.esi || s.esic_number || s.esic || '').toString().trim() || null;

            const statPayload: any = {
              employee_id: id,
              organization_id: isValidUUID(canonicalRecord?.organization_id || existing.organization_id) ? (canonicalRecord?.organization_id || existing.organization_id) : '0c621892-e938-4707-9957-13534ea32c19',
              pan_number: cleanPan,
              aadhaar_number: cleanAadhaar,
              uan_number: cleanUan,
              pf_number: cleanPf,
              esi_number: cleanEsi,
              is_pf_eligible: s.pf_applicable !== undefined ? Boolean(s.pf_applicable) : (s.is_pf_eligible !== undefined ? Boolean(s.is_pf_eligible) : Boolean(cleanPf || cleanUan)),
              is_esi_eligible: s.esi_applicable !== undefined ? Boolean(s.esi_applicable) : (s.is_esi_eligible !== undefined ? Boolean(s.is_esi_eligible) : Boolean(cleanEsi)),
              is_pt_eligible: s.pt_applicable !== undefined ? Boolean(s.pt_applicable) : (s.is_pt_eligible !== undefined ? Boolean(s.is_pt_eligible) : true),
              updated_at: new Date().toISOString(),
            };

            if (exStat?.id) {
              await dbClient.from('employee_statutory_details').update(statPayload).eq('id', exStat.id);
            } else {
              await dbClient.from('employee_statutory_details').insert(statPayload);
            }
          } catch (e) {
            console.warn('[API] Statutory update warning:', e);
          }
        }

        // Upsert Employee Profile Details (blood_group, marital_status, nationality)
        if (isAuth && (data.profile || (data as any).blood_group || (data as any).marital_status)) {
          const prof = data.profile || (data as any);
          try {
            await supabase.from('employee_profiles').upsert({
              employee_id: id,
              organization_id: isValidUUID(canonicalRecord?.organization_id || existing.organization_id) ? (canonicalRecord?.organization_id || existing.organization_id) : '0c621892-e938-4707-9957-13534ea32c19',
              blood_group: prof.blood_group || null,
              marital_status: prof.marital_status || null,
              nationality: prof.nationality || 'Indian',
              updated_at: new Date().toISOString(),
            }, { onConflict: 'employee_id' });
          } catch (e) {
            console.warn('[API] Profile update warning:', e);
          }
        }

        // Upsert Shift Assignment if provided (safely without onConflict error)
        if (isAuth && isValidUUID(id) && (data.shift_id || data.employment?.shift_id)) {
          const targetShiftId = String(data.shift_id || data.employment?.shift_id).trim();
          let shiftUUID: string | null = isValidUUID(targetShiftId) ? targetShiftId : null;
          if (!shiftUUID) {
            const { data: matchedShift } = await supabase
              .from('shifts')
              .select('id')
              .or(`code.ilike.${targetShiftId},name.ilike.%${targetShiftId}%`)
              .limit(1)
              .maybeSingle();
            if (matchedShift?.id) {
              shiftUUID = matchedShift.id;
            } else {
              const knownShifts: Record<string, string> = {
                'gen-09': 'f847c561-4bbb-4b9f-a2dd-003162897eef',
                'gen-10': 'f5ff5d00-8489-459b-8d8e-d930ecffef22',
                'shift-gen-09': 'f847c561-4bbb-4b9f-a2dd-003162897eef',
                'shift-gen-10': 'f5ff5d00-8489-459b-8d8e-d930ecffef22',
              };
              const lower = String(targetShiftId).toLowerCase();
              for (const [k, v] of Object.entries(knownShifts)) {
                if (lower.includes(k)) {
                  shiftUUID = v;
                  break;
                }
              }
            }
          }
          if (shiftUUID) {
            try {
              const { data: existingShift } = await supabase
                .from('employee_shift_assignments')
                .select('id')
                .eq('employee_id', id)
                .maybeSingle();

              const sOrgId = isValidUUID(canonicalRecord?.organization_id || existing.organization_id) ? (canonicalRecord?.organization_id || existing.organization_id) : '0c621892-e938-4707-9957-13534ea32c19';
              const sCompId = isValidUUID(canonicalRecord?.company_id || existing.company_id) ? (canonicalRecord?.company_id || existing.company_id) : '2030277f-a6a1-427f-beaf-4fc677a3bae2';
              const sDate = existing.doj || '2026-01-01';

              if (existingShift?.id) {
                await supabase
                  .from('employee_shift_assignments')
                  .update({
                    shift_id: shiftUUID,
                    effective_from: sDate,
                    valid_from: sDate,
                  })
                  .eq('id', existingShift.id);
              } else {
                await supabase
                  .from('employee_shift_assignments')
                  .insert({
                    organization_id: sOrgId,
                    company_id: sCompId,
                    employee_id: id,
                    shift_id: shiftUUID,
                    effective_from: sDate,
                    valid_from: sDate,
                    weekly_offs: [0, 6],
                  });
              }
            } catch (shErr) {
              console.warn('[API] Shift assignment update notice:', shErr);
            }
          }

          // Upsert/Update Employee Salary Assignment if provided
          const candidateAnnualCtc = (data as any).annual_ctc !== undefined ? (data as any).annual_ctc : data.employment?.annual_ctc;
          const candidateMonthlyCtc = (data as any).monthly_ctc !== undefined ? (data as any).monthly_ctc : data.employment?.monthly_ctc;
          if (isAuth && (candidateAnnualCtc !== undefined || candidateMonthlyCtc !== undefined)) {
            try {
              const annCtc = Number(candidateAnnualCtc) || 0;
              const monGross = Number(candidateMonthlyCtc) || (annCtc > 0 ? Math.round(annCtc / 12) : 0);
              const rawStructCode = (data as any).salary_structure_code || data.employment?.salary_structure_code || 'CORP_STD_01';
              let structId = (data as any).salary_structure_id || data.employment?.salary_structure_id;
              if (!structId || !isValidUUID(structId)) {
                const { data: stRow } = await dbClient.from('salary_structures').select('id').ilike('code', rawStructCode).limit(1).maybeSingle();
                structId = stRow?.id;
              }
              if (!structId) {
                const { data: firstSt } = await dbClient.from('salary_structures').select('id').limit(1).maybeSingle();
                structId = firstSt?.id || null;
              }

              const { data: existingSal } = await dbClient
                .from('employee_salary_assignments')
                .select('id')
                .eq('employee_id', id)
                .limit(1)
                .maybeSingle();

              const sOrgId = isValidUUID(canonicalRecord?.organization_id || existing.organization_id) ? (canonicalRecord?.organization_id || existing.organization_id) : '0c621892-e938-4707-9957-13534ea32c19';
              const effDate = (data as any).salary_effective_from || data.employment?.salary_effective_from || data.employment?.doj || existing.doj || new Date().toISOString().split('T')[0];

              if (existingSal?.id) {
                await dbClient
                  .from('employee_salary_assignments')
                  .update({
                    annual_ctc: annCtc,
                    monthly_gross: monGross,
                    salary_structure_id: structId,
                    effective_from: effDate,
                    is_active: true,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existingSal.id);
              } else {
                await dbClient
                  .from('employee_salary_assignments')
                  .insert({
                    organization_id: sOrgId,
                    employee_id: id,
                    salary_structure_id: structId,
                    annual_ctc: annCtc,
                    monthly_gross: monGross,
                    effective_from: effDate,
                    is_active: true,
                  });
              }
            } catch (salErr) {
              console.warn('[API] updateEmployee salary assignment notice:', salErr);
            }
          }

          // Upsert/Update Employee Statutory Details if provided
          const candidatePf = (data as any).pf_applicable !== undefined ? (data as any).pf_applicable : (data.statutory?.pf_applicable !== undefined ? data.statutory.pf_applicable : data.statutory?.is_pf_eligible);
          const candidateEsi = (data as any).esi_applicable !== undefined ? (data as any).esi_applicable : (data.statutory?.esi_applicable !== undefined ? data.statutory.esi_applicable : data.statutory?.is_esi_eligible);
          const candidatePt = (data as any).pt_applicable !== undefined ? (data as any).pt_applicable : (data.statutory?.pt_applicable !== undefined ? data.statutory.pt_applicable : data.statutory?.is_pt_eligible);
          const candidateLwf = (data as any).lwf_applicable !== undefined ? (data as any).lwf_applicable : (data.statutory?.lwf_applicable !== undefined ? data.statutory.lwf_applicable : (data.statutory as any)?.is_lwf_eligible);

          if (isAuth && (candidatePf !== undefined || candidateEsi !== undefined || candidatePt !== undefined)) {
            try {
              const { data: existingStat } = await dbClient
                .from('employee_statutory_details')
                .select('id')
                .eq('employee_id', id)
                .limit(1)
                .maybeSingle();

              const sOrgId = isValidUUID(canonicalRecord?.organization_id || existing.organization_id) ? (canonicalRecord?.organization_id || existing.organization_id) : '0c621892-e938-4707-9957-13534ea32c19';
              if (existingStat?.id) {
                await dbClient
                  .from('employee_statutory_details')
                  .update({
                    is_pf_eligible: candidatePf !== false,
                    is_esi_eligible: candidateEsi === true,
                    is_pt_eligible: candidatePt !== false,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existingStat.id);
              } else {
                await dbClient
                  .from('employee_statutory_details')
                  .insert({
                    organization_id: sOrgId,
                    employee_id: id,
                    is_pf_eligible: candidatePf !== false,
                    is_esi_eligible: candidateEsi === true,
                    is_pt_eligible: candidatePt !== false,
                  });
              }
            } catch (statErr) {
              console.warn('[API] updateEmployee statutory details notice:', statErr);
            }
          }

          if (candidateAnnualCtc !== undefined || candidateMonthlyCtc !== undefined || candidatePf !== undefined || candidateEsi !== undefined) {
            hrEventBus.emit('payroll.salary.updated', {
              assignment: {
                employee_id: id,
                annual_ctc: Number(candidateAnnualCtc) || 0,
                monthly_gross: Number(candidateMonthlyCtc) || 0,
                gross_monthly: Number(candidateMonthlyCtc) || 0,
                pf_applicable: candidatePf !== false,
                esi_applicable: candidateEsi === true,
                pt_applicable: candidatePt !== false,
                lwf_applicable: candidateLwf === true,
              },
              tenantId: canonicalRecord?.organization_id || existing.organization_id,
            });
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
    const targetMgrName = data.reporting_manager_name || (data.employment as any)?.reporting_manager_name || (canonicalRecord as any)?.reporting_manager_name || (existing as any).reporting_manager_name || '';

    const updated: Employee = { 
      ...existing, 
      ...(canonicalRecord || {}),
      ...data, 
      first_name: firstName,
      last_name: lastName,
      display_name: displayName,
      department_id: resolvedDeptId || (canonicalRecord as any)?.department_id || existing.department_id,
      department_name: resolvedDeptName || (canonicalRecord as any)?.department_name || existing.department_name || 'General',
      department: resolvedDeptName || (canonicalRecord as any)?.department_name || existing.department_name || (existing as any).department || 'General',
      designation_id: resolvedDesigId || (canonicalRecord as any)?.designation_id || existing.designation_id,
      designation_title: resolvedDesigTitle || (canonicalRecord as any)?.designation_title || existing.designation_title || 'Staff',
      designation: resolvedDesigTitle || (canonicalRecord as any)?.designation_title || existing.designation_title || (existing as any).designation || 'Staff',
      phone: targetPhone !== undefined ? targetPhone : (canonicalRecord?.phone || existing.phone),
      primary_mobile: targetPhone !== undefined ? targetPhone : (canonicalRecord?.phone || existing.phone),
      personal_email: targetPersonalEmail !== undefined ? targetPersonalEmail : (canonicalRecord?.personal_email || existing.personal_email),
      work_email: targetWorkEmail !== undefined ? targetWorkEmail : (canonicalRecord?.work_email || existing.work_email),
      reporting_manager_id: targetMgrId !== undefined ? targetMgrId : (canonicalRecord?.reporting_manager_id || existing.reporting_manager_id),
      reporting_manager_name: targetMgrName,
      shift_id: (data as any).shift_id || data.employment?.shift_id || (canonicalRecord as any)?.shift_id || canonicalRecord?.employment?.shift_id || (existing as any).shift_id || existing.employment?.shift_id,
      shift_name: (data as any).shift_name || data.employment?.shift_name || (canonicalRecord as any)?.shift_name || canonicalRecord?.employment?.shift_name || (existing as any).shift_name || existing.employment?.shift_name,
      profile: { 
        ...(existing.profile || {}), 
        ...(canonicalRecord?.profile || {}),
        ...(data.profile || {}),
        phone: targetPhone !== undefined ? targetPhone : (canonicalRecord?.phone || existing.phone),
        personal_email: targetPersonalEmail !== undefined ? targetPersonalEmail : (canonicalRecord?.personal_email || existing.personal_email),
      } as EmployeeProfile,
      employment: { 
        ...(existing.employment || {}), 
        ...(canonicalRecord?.employment || {}),
        ...(data.employment || {}),
        department_id: resolvedDeptId || (canonicalRecord as any)?.department_id || existing.department_id,
        department_name: resolvedDeptName || (canonicalRecord as any)?.department_name || existing.department_name || 'General',
        designation_id: resolvedDesigId || (canonicalRecord as any)?.designation_id || existing.designation_id,
        designation_title: resolvedDesigTitle || (canonicalRecord as any)?.designation_title || existing.designation_title || 'Staff',
        shift_id: (data as any).shift_id || data.employment?.shift_id || (canonicalRecord as any)?.shift_id || canonicalRecord?.employment?.shift_id || (existing as any).shift_id || existing.employment?.shift_id,
        shift_name: (data as any).shift_name || data.employment?.shift_name || (canonicalRecord as any)?.shift_name || canonicalRecord?.employment?.shift_name || (existing as any).shift_name || existing.employment?.shift_name,
        reporting_manager_id: targetMgrId !== undefined ? targetMgrId : (canonicalRecord?.reporting_manager_id || existing.reporting_manager_id),
        reporting_manager_name: targetMgrName,
        team_lead_id: (data as any).team_lead_id || data.employment?.team_lead_id || (canonicalRecord as any)?.team_lead_id || canonicalRecord?.employment?.team_lead_id || (existing as any).team_lead_id || existing.employment?.team_lead_id,
        team_lead_name: (data as any).team_lead_name || data.employment?.team_lead_name || (canonicalRecord as any)?.team_lead_name || canonicalRecord?.employment?.team_lead_name || (existing as any).team_lead_name || existing.employment?.team_lead_name,
      } as EmploymentDetails,
      bank: (data as any).bank || (canonicalRecord as any)?.bank || (existing as any).bank,
      statutory: (data as any).statutory || (canonicalRecord as any)?.statutory || (existing as any).statutory,
      emergency_contacts: (canonicalRecord as any)?.emergency_contacts || (existing as any).emergency_contacts,
      status: data.status || (resolvedEmploymentStatus === 'SUSPENDED' ? 'Inactive' : (resolvedEmploymentStatus === 'ACTIVE' ? 'Active' : (canonicalRecord?.status || existing.status || 'Active'))),
      employment_status: resolvedEmploymentStatus || (canonicalRecord as any)?.employment_status || existing.employment_status || 'ACTIVE',
      updated_at: new Date().toISOString() 
    } as any as Employee;

    if (idx !== -1) {
      list[idx] = updated;
    } else {
      list.unshift(updated);
    }
    setStorage(KEYS.EMPLOYEES, list);
    this._empCache = null;
    this._empCacheMap.clear();

    try {
      hrEventBus.emit('employee.updated', { employee: updated, employeeId: id, id, ...updated });
    } catch (_) {}

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

    saveExtendedEmployeeRecord(id, {
      employment_source: updated.employment_source || (data as any).employment_source || 'DIRECT',
      vendor_id: updated.vendor_id || (data as any).vendor_id || null,
      vendor_name: updated.vendor_name || (data as any).vendor_name || null,
      vendor_employee_code: updated.vendor_employee_code || (data as any).vendor_employee_code || null,
      department_id: updated.department_id,
      department_name: updated.department_name,
      designation_id: updated.designation_id,
      designation_title: updated.designation_title,
      branch_id: updated.branch_id,
      location_id: (data as any).location_id || (data.employment as any)?.location_id || updated.branch_id,
      work_location: (data as any).work_location || (data.employment as any)?.work_location || (data as any).work_location_name,
      work_location_name: (data as any).work_location_name || (data.employment as any)?.work_location_name || (data as any).work_location,
      work_mode: (data as any).work_mode || (data.employment as any)?.work_mode,
      job_level: (data as any).job_level || (data.employment as any)?.job_level,
      grade: (data as any).grade || (data.employment as any)?.grade,
      probation_period_months: (data as any).probation_period_months || (data.employment as any)?.probation_period_months,
      notice_period_days: (data as any).notice_period_days || (data.employment as any)?.notice_period_days,
      shift_id: updated.shift_id,
      shift_name: updated.shift_name,
      attendance_policy_id: (data as any).attendance_policy_id || (data.employment as any)?.attendance_policy_id,
      leave_policy_id: (data as any).leave_policy_id || (data.employment as any)?.leave_policy_id,
      annual_ctc: (data as any).annual_ctc || (data.employment as any)?.annual_ctc,
      monthly_ctc: (data as any).monthly_ctc || (data.employment as any)?.monthly_ctc,
      salary_structure_code: (data as any).salary_structure_code || (data.employment as any)?.salary_structure_code,
      compensation_basis: (data as any).compensation_basis || (data.employment as any)?.compensation_basis,
      reporting_manager_id: targetMgrId !== undefined ? targetMgrId : (updated.employment?.reporting_manager_id || null),
      reporting_manager_name: targetMgrName || updated.employment?.reporting_manager_name || null,
      team_lead_id: updated.employment?.team_lead_id || (data as any).team_lead_id || null,
      team_lead_name: updated.employment?.team_lead_name || (data as any).team_lead_name || null,
      employment: updated.employment,
      profile: updated.profile,
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('employee:updated', { detail: { id, employee: updated } }));
    }

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
    if (typeof localStorage !== 'undefined' && localStorage.getItem('workforce_logged_out') === 'true') {
      return null;
    }
    const isPlatformRoute = typeof window !== 'undefined' && (
      window.location.pathname.startsWith('/platform') ||
      window.location.pathname === '/superadmin' ||
      window.location.pathname.startsWith('/super-admin') ||
      window.location.pathname.startsWith('/platform-login')
    );
    if (isPlatformRoute) {
      const plat = getStorage<User | null>('workforce_platform_user', null);
      if (plat) return plat;
    }
    const u = getStorage<User | null>(KEYS.CURRENT_USER, null);
    if (u) return u;
    return null;
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
