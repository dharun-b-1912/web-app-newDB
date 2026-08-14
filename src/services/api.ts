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
import {
  initialOrganization,
  initialCompanies,
  initialBranches,
  initialLocations,
  initialDepartments,
  initialDesignations,
  initialRoles,
  initialUsers,
  initialEmployees,
  initialApprovals,
  initialActivities,
  initialMetrics,
} from './mockData';

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

// Initialize default storage state if empty
export function initializeStore() {
  if (!localStorage.getItem(KEYS.ORG)) setStorage(KEYS.ORG, initialOrganization);
  if (!localStorage.getItem(KEYS.COMPANIES)) setStorage(KEYS.COMPANIES, initialCompanies);
  if (!localStorage.getItem(KEYS.BRANCHES)) setStorage(KEYS.BRANCHES, initialBranches);
  if (!localStorage.getItem(KEYS.LOCATIONS)) setStorage(KEYS.LOCATIONS, initialLocations);
  if (!localStorage.getItem(KEYS.DEPARTMENTS)) setStorage(KEYS.DEPARTMENTS, initialDepartments);
  if (!localStorage.getItem(KEYS.DESIGNATIONS)) setStorage(KEYS.DESIGNATIONS, initialDesignations);
  if (!localStorage.getItem(KEYS.ROLES)) setStorage(KEYS.ROLES, initialRoles);
  if (!localStorage.getItem(KEYS.USERS)) setStorage(KEYS.USERS, initialUsers);
  if (!localStorage.getItem(KEYS.EMPLOYEES)) setStorage(KEYS.EMPLOYEES, initialEmployees);
  if (!localStorage.getItem(KEYS.APPROVALS)) setStorage(KEYS.APPROVALS, initialApprovals);
  if (!localStorage.getItem(KEYS.ACTIVITIES)) setStorage(KEYS.ACTIVITIES, initialActivities);
  if (!localStorage.getItem(KEYS.METRICS)) setStorage(KEYS.METRICS, initialMetrics);
  if (!localStorage.getItem(KEYS.CURRENT_USER)) setStorage(KEYS.CURRENT_USER, initialUsers[0]);
  if (!localStorage.getItem(KEYS.ACTIVE_COMPANY)) setStorage(KEYS.ACTIVE_COMPANY, initialCompanies[0]);
}

initializeStore();

export const api = {
  // Organization API
  async getOrganization(): Promise<Organization> {
    return getStorage(KEYS.ORG, initialOrganization);
  },
  async updateOrganization(data: Partial<Organization>): Promise<Organization> {
    const current = getStorage(KEYS.ORG, initialOrganization);
    const updated = { ...current, ...data, updated_at: new Date().toISOString() };
    setStorage(KEYS.ORG, updated);
    return updated;
  },

  // Company API
  async getCompanies(): Promise<Company[]> {
    return getStorage(KEYS.COMPANIES, initialCompanies);
  },
  async createCompany(input: Omit<Company, 'id' | 'created_at'>): Promise<Company> {
    const list = getStorage(KEYS.COMPANIES, initialCompanies);
    const newCompany: Company = {
      ...input,
      id: `comp-${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
    };
    const updated = [newCompany, ...list];
    setStorage(KEYS.COMPANIES, updated);
    return newCompany;
  },

  // Branch API
  async getBranches(companyId?: string): Promise<Branch[]> {
    const list = getStorage<Branch[]>(KEYS.BRANCHES, initialBranches);
    if (companyId) return list.filter(b => b.company_id === companyId);
    return list;
  },
  async createBranch(input: Omit<Branch, 'id' | 'created_at'>): Promise<Branch> {
    const list = getStorage<Branch[]>(KEYS.BRANCHES, initialBranches);
    const newBranch: Branch = {
      ...input,
      id: `br-${Date.now().toString(36)}`,
      created_at: new Date().toISOString(),
    };
    setStorage(KEYS.BRANCHES, [newBranch, ...list]);
    return newBranch;
  },

  // Location API
  async getLocations(branchId?: string): Promise<Location[]> {
    const list = getStorage<Location[]>(KEYS.LOCATIONS, initialLocations);
    if (branchId) return list.filter(l => l.branch_id === branchId);
    return list;
  },
  async createLocation(input: Omit<Location, 'id'>): Promise<Location> {
    const list = getStorage<Location[]>(KEYS.LOCATIONS, initialLocations);
    const newLoc: Location = { ...input, id: `loc-${Date.now().toString(36)}` };
    setStorage(KEYS.LOCATIONS, [newLoc, ...list]);
    return newLoc;
  },

  // Department API
  async getDepartments(companyId?: string): Promise<Department[]> {
    const list = getStorage<Department[]>(KEYS.DEPARTMENTS, initialDepartments);
    if (companyId) return list.filter(d => d.company_id === companyId);
    return list;
  },
  async createDepartment(input: Omit<Department, 'id'>): Promise<Department> {
    const list = getStorage<Department[]>(KEYS.DEPARTMENTS, initialDepartments);
    const newDept: Department = { ...input, id: `dept-${Date.now().toString(36)}`, employee_count: 0 };
    setStorage(KEYS.DEPARTMENTS, [newDept, ...list]);
    return newDept;
  },

  // Designation API
  async getDesignations(companyId?: string): Promise<Designation[]> {
    const list = getStorage<Designation[]>(KEYS.DESIGNATIONS, initialDesignations);
    if (companyId) return list.filter(d => d.company_id === companyId);
    return list;
  },
  async createDesignation(input: Omit<Designation, 'id'>): Promise<Designation> {
    const list = getStorage<Designation[]>(KEYS.DESIGNATIONS, initialDesignations);
    const newDesig: Designation = { ...input, id: `desig-${Date.now().toString(36)}` };
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
    let list = getStorage<Employee[]>(KEYS.EMPLOYEES, initialEmployees);
    if (!params) return list;

    const filterObj = typeof params === 'string' ? { companyId: params } : params;

    if (filterObj && filterObj.search) {
      const q = typeof filterObj.search === 'string' ? filterObj.search.toLowerCase() : String(filterObj.search).toLowerCase();
      list = list.filter(
        e =>
          (e.first_name && e.first_name.toLowerCase().includes(q)) ||
          (e.last_name && e.last_name.toLowerCase().includes(q)) ||
          (e.work_email && e.work_email.toLowerCase().includes(q)) ||
          (e.employee_code && e.employee_code.toLowerCase().includes(q)) ||
          (e.department_name && e.department_name.toLowerCase().includes(q)) ||
          (e.designation_title && e.designation_title.toLowerCase().includes(q))
      );
    }
    if (filterObj && filterObj.companyId) {
      list = list.filter(e => e.company_id === filterObj.companyId);
    }
    if (filterObj && filterObj.departmentId && filterObj.departmentId !== 'all') {
      list = list.filter(e => e.department_id === filterObj.departmentId);
    }
    if (filterObj && filterObj.status && filterObj.status !== 'all') {
      list = list.filter(e => e.status === filterObj.status);
    }
    if (filterObj && filterObj.type && filterObj.type !== 'all') {
      list = list.filter(e => e.employment_type === filterObj.type);
    }

    return list;
  },

  async getEmployeeById(id: string): Promise<Employee | null> {
    const list = getStorage<Employee[]>(KEYS.EMPLOYEES, initialEmployees);
    return list.find(e => e.id === id) || null;
  },

  async createEmployee(input: Partial<Employee>): Promise<Employee> {
    const list = getStorage<Employee[]>(KEYS.EMPLOYEES, initialEmployees);
    const org = getStorage<Organization>(KEYS.ORG, initialOrganization);
    const departments = getStorage<Department[]>(KEYS.DEPARTMENTS, initialDepartments);
    const designations = getStorage<Designation[]>(KEYS.DESIGNATIONS, initialDesignations);
    const companies = getStorage<Company[]>(KEYS.COMPANIES, initialCompanies);
    const branches = getStorage<Branch[]>(KEYS.BRANCHES, initialBranches);

    const dept = departments.find(d => d.id === input.department_id);
    const desig = designations.find(d => d.id === input.designation_id);
    const comp = companies.find(c => c.id === input.company_id);
    const branch = branches.find(b => b.id === input.branch_id);

    const newEmp: Employee = {
      id: `emp-${Date.now().toString(36)}`,
      organization_id: org.id,
      company_id: input.company_id || comp?.id || 'comp-01',
      company_name: comp?.legal_name || 'Acme Technologies Pvt Ltd',
      branch_id: input.branch_id || branch?.id || 'br-cbe',
      branch_name: branch?.name || 'Coimbatore Main Campus',
      department_id: input.department_id || 'dept-eng',
      department_name: dept?.name || 'Engineering',
      designation_id: input.designation_id || 'desig-staffeng',
      designation_title: desig?.title || 'Engineer',
      employee_code: input.employee_code || `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      first_name: input.first_name || 'John',
      last_name: input.last_name || 'Doe',
      work_email: input.work_email || 'john.doe@acme.com',
      avatar_url: input.avatar_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
      status: input.status || 'Active',
      employment_type: input.employment_type || 'Full Time',
      profile: input.profile || {},
      employment: input.employment || { doj: new Date().toISOString().split('T')[0] },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const updatedList = [newEmp, ...list];
    setStorage(KEYS.EMPLOYEES, updatedList);

    // Record activity
    const activities = getStorage<ActivityItem[]>(KEYS.ACTIVITIES, initialActivities);
    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      actor_name: `${newEmp.first_name} ${newEmp.last_name}`,
      actor_avatar: newEmp.avatar_url,
      action: 'was added to workforce as',
      entity: `${newEmp.designation_title} (${newEmp.department_name})`,
      timestamp: new Date().toISOString(),
      time_ago: 'Just now',
      type: 'employee',
    };
    setStorage(KEYS.ACTIVITIES, [newAct, ...activities]);

    return newEmp;
  },

  async updateEmployee(id: string, updates: Partial<Employee>): Promise<Employee> {
    const list = getStorage<Employee[]>(KEYS.EMPLOYEES, initialEmployees);
    const index = list.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Employee not found');

    const updated = {
      ...list[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    list[index] = updated;
    setStorage(KEYS.EMPLOYEES, list);
    return updated;
  },

  // Roles & Permissions API
  async getRoles(): Promise<Role[]> {
    return getStorage(KEYS.ROLES, initialRoles);
  },
  async createRole(input: Omit<Role, 'id'>): Promise<Role> {
    const list = getStorage<Role[]>(KEYS.ROLES, initialRoles);
    const newRole: Role = { ...input, id: `role-${Date.now().toString(36)}` };
    setStorage(KEYS.ROLES, [newRole, ...list]);
    return newRole;
  },

  async getUsers(): Promise<User[]> {
    const stored = getStorage<User[]>(KEYS.USERS, initialUsers);
    
    // Reconcile system demo accounts from initialUsers into stored array
    let updated = false;
    const reconciled = [...stored];

    for (const initUser of initialUsers) {
      const idx = reconciled.findIndex(u => u.email.toLowerCase() === initUser.email.toLowerCase());
      if (idx === -1) {
        reconciled.push(initUser);
        updated = true;
      } else {
        // If stored user email matches initUser but roles/name got corrupted, reset to initUser
        const existing = reconciled[idx];
        if (existing.roles?.[0]?.name !== initUser.roles?.[0]?.name) {
          reconciled[idx] = { ...initUser };
          updated = true;
        }
      }
    }

    if (updated) {
      setStorage(KEYS.USERS, reconciled);
    }
    return reconciled;
  },

  async assignUserRole(userId: string, roleId: string): Promise<User> {
    const users = getStorage<User[]>(KEYS.USERS, initialUsers);
    const roles = getStorage<Role[]>(KEYS.ROLES, initialRoles);
    const role = roles.find(r => r.id === roleId);
    if (!role) throw new Error('Role not found');

    const uIdx = users.findIndex(u => u.id === userId);
    if (uIdx === -1) throw new Error('User not found');

    users[uIdx].roles = [role];
    setStorage(KEYS.USERS, users);
    return users[uIdx];
  },

  async assignUserRoles(userId: string, roleIds: string[]): Promise<User> {
    const users = getStorage<User[]>(KEYS.USERS, initialUsers);
    const roles = getStorage<Role[]>(KEYS.ROLES, initialRoles);
    const matchedRoles = roles.filter(r => roleIds.includes(r.id));

    const uIdx = users.findIndex(u => u.id === userId);
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
    return getStorage(KEYS.APPROVALS, initialApprovals);
  },
  async getApprovalRequests(): Promise<any[]> {
    const items = await this.getApprovals();
    return items.map(a => ({
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
    const list = getStorage<ApprovalItem[]>(KEYS.APPROVALS, initialApprovals);
    const idx = list.findIndex(a => a.id === id);
    if (idx === -1) throw new Error('Approval item not found');

    list[idx].status = action;
    setStorage(KEYS.APPROVALS, list);

    // Record activity
    const activities = getStorage<ActivityItem[]>(KEYS.ACTIVITIES, initialActivities);
    const item = list[idx];
    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      actor_name: 'Dharun Joy (Admin)',
      action: `${action.toLowerCase()} request:`,
      entity: `${item.title} for ${item.requested_by_name}`,
      timestamp: new Date().toISOString(),
      time_ago: 'Just now',
      type: 'leave',
    };
    setStorage(KEYS.ACTIVITIES, [newAct, ...activities]);

    return list[idx];
  },

  // Dashboard API
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const employees = getStorage<Employee[]>(KEYS.EMPLOYEES, initialEmployees);
    const approvals = getStorage<ApprovalItem[]>(KEYS.APPROVALS, initialApprovals);
    const pendingCount = approvals.filter(a => a.status === 'Pending').length;

    return {
      total_employees: employees.length,
      employee_growth_pct: 6.4,
      present_today: Math.round(employees.length * 0.92),
      present_pct: 92.0,
      on_leave_today: employees.filter(e => e.status === 'On Leave').length || 2,
      pending_approvals_count: pendingCount,
      open_requisitions: 14,
      payroll_status: 'Attendance Locked - Ready for Calculation',
      next_payroll_date: '31 Aug 2026',
    };
  },

  async getActivities(): Promise<ActivityItem[]> {
    return getStorage(KEYS.ACTIVITIES, initialActivities);
  },

  async getAuditLogs(): Promise<any[]> {
    const list = await this.getActivities();
    return list.map(a => ({
      id: a.id,
      actor_name: a.actor_name,
      action: a.action,
      target: a.entity,
      timestamp: a.time_ago,
    }));
  },

  // Active Company & Current User Session
  getActiveCompany(): Company {
    return getStorage(KEYS.ACTIVE_COMPANY, initialCompanies[0]);
  },
  setActiveCompany(company: Company): void {
    setStorage(KEYS.ACTIVE_COMPANY, company);
  },

  getCurrentUser(): User {
    return getStorage(KEYS.CURRENT_USER, initialUsers[0]);
  },
  setCurrentUser(user: User): void {
    setStorage(KEYS.CURRENT_USER, user);
  },
};
