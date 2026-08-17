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
} from '../types';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

// Standard Default Types & Records
const defaultOrganization: Organization = {
  id: 'org-acme-01',
  name: 'Acme Global Enterprise',
  industry: 'Software & Technology Services',
  default_currency: 'USD',
  timezone: 'Asia/Kolkata',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2026-08-11T00:00:00Z',
};

const defaultCompany: Company = {
  id: 'comp-01',
  organization_id: 'org-acme-01',
  legal_name: 'Acme Technologies Pvt Ltd',
  trade_name: 'AcmeTech India',
  statutory_registration_no: 'CIN-U72200TZ2020PTC034120',
  tax_id: 'PAN-AAACA1234F',
  country: 'India',
  city: 'Coimbatore',
  created_at: '2024-01-15T00:00:00Z',
};

const defaultRoles: Role[] = [
  { id: 'role-001', organization_id: 'org-acme-01', name: 'Super Admin', description: 'Root Platform Administrator with global access', permissions: [] },
  { id: 'role-001b', organization_id: 'org-acme-01', name: 'Assistant Admin', description: 'Assistant Platform Administrator with delegated operations & customer support access', permissions: [] },
  { id: 'role-001c', organization_id: 'org-acme-01', name: 'Billing Admin', description: 'FinOps & SaaS Invoicing Administrator', permissions: [] },
  { id: 'role-001d', organization_id: 'org-acme-01', name: 'Security Officer', description: 'Compliance, Session Security & Audit Officer', permissions: [] },
  { id: 'role-002', organization_id: 'org-acme-01', name: 'Company Admin', description: 'Enterprise Organization Admin', permissions: [] },
  { id: 'role-003', organization_id: 'org-acme-01', name: 'HR Head', description: 'Head of Human Resources & People Operations', permissions: [] },
  { id: 'role-004', organization_id: 'org-acme-01', name: 'Team Lead', description: 'Department Supervisor / Team Lead', permissions: [] },
  { id: 'role-005', organization_id: 'org-acme-01', name: 'Employee', description: 'Standard Employee with Employee Self Service access', permissions: [] },
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
    return getStorage(KEYS.ORG, defaultOrganization);
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
    return getStorage(KEYS.COMPANIES, [defaultCompany]);
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
        if (data && !error) return data;
      } catch (err) {
        console.warn('[API] Failed to fetch branches from Supabase:', err);
      }
    }
    const list = getStorage<Branch[]>(KEYS.BRANCHES, []);
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
        await supabase.from('branches').insert(newBranch);
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
        if (data && !error) return data;
      } catch (err) {
        console.warn('[API] Failed to fetch locations from Supabase:', err);
      }
    }
    const list = getStorage<Location[]>(KEYS.LOCATIONS, []);
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
    const list = getStorage<Location[]>(KEYS.LOCATIONS, []);
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
        if (data && !error) return data;
      } catch (err) {
        console.warn('[API] Failed to fetch departments from Supabase:', err);
      }
    }
    const list = getStorage<Department[]>(KEYS.DEPARTMENTS, []);
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
    const list = getStorage<Department[]>(KEYS.DEPARTMENTS, []);
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
        if (data && !error) return data;
      } catch (err) {
        console.warn('[API] Failed to fetch designations from Supabase:', err);
      }
    }
    const list = getStorage<Designation[]>(KEYS.DESIGNATIONS, []);
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
    const list = getStorage<Designation[]>(KEYS.DESIGNATIONS, []);
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
  } | string): Promise<Employee[]> {
    if (isSupabaseEnabled) {
      try {
        let q = supabase.from('employees').select('*');
        const filterObj = typeof params === 'string' ? { companyId: params } : params;
        if (filterObj?.companyId) q = q.eq('company_id', filterObj.companyId);
        if (filterObj?.departmentId && filterObj.departmentId !== 'all') q = q.eq('department_id', filterObj.departmentId);
        if (filterObj?.status && filterObj.status !== 'all') q = q.eq('status', filterObj.status);
        const { data, error } = await q;
        if (data && !error && data.length > 0) return data;
      } catch (err) {
        console.warn('[API] Failed to fetch employees from Supabase:', err);
      }
    }
    let list = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
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
          (e.designation_title && e.designation_title.toLowerCase().includes(q))
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
    return list;
  },

  async getEmployeeById(id: string): Promise<Employee | undefined> {
    const list = await this.getEmployees();
    return list.find((e) => e.id === id);
  },

  async createEmployee(input: any): Promise<Employee> {
    const newEmp: Employee = {
      organization_id: input.organization_id || 'org-acme-01',
      employee_code: input.employee_code || `EMP-${Math.floor(100 + Math.random() * 900)}`,
      status: input.status || 'Active',
      employment_type: input.employment_type || 'Full Time',
      ...input,
      id: input.id || `emp-${Date.now().toString(36)}`,
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
    const list = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
    setStorage(KEYS.EMPLOYEES, [newEmp, ...list]);
    return newEmp;
  },

  async updateEmployee(id: string, data: Partial<Employee>): Promise<Employee> {
    const list = getStorage<Employee[]>(KEYS.EMPLOYEES, []);
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
    return updated;
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
    return getStorage<User[]>(KEYS.USERS, defaultPlatformUsers);
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

  // Active Company & Current User Session
  getActiveCompany(): Company {
    return getStorage(KEYS.ACTIVE_COMPANY, defaultCompany);
  },

  setActiveCompany(company: Company): void {
    setStorage(KEYS.ACTIVE_COMPANY, company);
  },

  getCurrentUser(): User {
    return getStorage(KEYS.CURRENT_USER, defaultPlatformUsers[0]);
  },

  setCurrentUser(user: User): void {
    setStorage(KEYS.CURRENT_USER, user);
  },
};
