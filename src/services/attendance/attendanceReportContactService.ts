// src/services/attendance/attendanceReportContactService.ts
// ============================================================================
// Joy PeopleHR Enterprise — Multi-Tenant Attendance Report Recipient & Directory Engine
// Dynamically discovers genuine organization contacts per active tenant context
// Strictly zero hardcoded emails, names, or single-tenant defaults
// ============================================================================

import { api } from '../api';
import { supabase } from '../../lib/supabase';
import { Employee, User } from '../../types';

export interface RecipientContact {
  id: string;
  name: string;
  code: string;
  email: string;
  phone?: string;
  department: string;
  designation: string;
  isHr: boolean;
  isManager: boolean;
  isCurrentUser: boolean;
  avatarUrl?: string;
  category: 'HR_TEAM' | 'MANAGEMENT' | 'EMPLOYEE';
}

class AttendanceReportContactService {
  private dbContactsCache: RecipientContact[] = [];

  constructor() {
    this.refreshContactsFromDb().catch(() => {});
  }

  /**
   * Refreshes contacts directly from Supabase PostgreSQL database for the active tenant.
   */
  async refreshContactsFromDb(): Promise<RecipientContact[]> {
    try {
      const activeComp = api.getActiveCompany();
      const orgId = activeComp?.organization_id;
      const compId = activeComp?.id;

      let query = supabase
        .from('employees')
        .select('id, organization_id, company_id, employee_code, first_name, last_name, display_name, work_email, personal_email, phone, employment_status')
        .is('deleted_at', null);

      if (compId) {
        query = query.eq('company_id', compId);
      } else if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data, error } = await query;

      if (!error && data) {
        const mapped: RecipientContact[] = [];
        data.forEach((emp: any) => {
          const email = (emp.work_email || emp.personal_email || '').trim().toLowerCase();
          if (!email || !email.includes('@')) return;

          const isHr =
            /^(hr|people|talent|admin|operations)@/i.test(email) ||
            /hr|human\s*resources|people|talent/i.test(emp.first_name || '') ||
            /hr|human\s*resources|people|talent/i.test(emp.last_name || '');

          const name = emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee';
          const phone = emp.phone || '';

          mapped.push({
            id: emp.id,
            name,
            code: emp.employee_code || 'EMP',
            email,
            phone,
            department: 'General',
            designation: isHr ? 'HR & People Operations' : 'Staff',
            isHr,
            isManager: isHr,
            isCurrentUser: false,
            category: isHr ? 'HR_TEAM' : 'EMPLOYEE',
          });
        });

        if (mapped.length > 0) {
          this.dbContactsCache = mapped;
        }
      }
    } catch (e) {
      console.warn('[ContactService] Error loading DB employees:', e);
    }
    return this.getOrganizationContacts();
  }

  /**
   * Retrieves verified organization employee contacts from active company context.
   * Scoped dynamically per tenant.
   */
  getOrganizationContacts(): RecipientContact[] {
    const contactsMap = new Map<string, RecipientContact>();

    // Seed cached DB contacts
    this.dbContactsCache.forEach((c) => {
      contactsMap.set(c.email.toLowerCase(), c);
    });

    // 1. Current logged-in user if available
    let currentUser: User | null = null;
    try {
      currentUser = api.getCurrentUser();
    } catch { }

    // 2. Fetch real organization employees from memory sync for active company
    let employees: Employee[] = [];
    try {
      const activeComp = api.getActiveCompany();
      employees = api.getEmployeesSync ? api.getEmployeesSync(activeComp?.id) : [];
      if (!employees || employees.length === 0) {
        employees = api.getEmployees ? (api.getEmployees() as any) : [];
      }
    } catch {
      employees = [];
    }

    if (Array.isArray(employees)) {
      employees.forEach(emp => {
        const email = (emp.work_email || emp.personal_email || '').trim().toLowerCase();
        if (!email || !email.includes('@')) return;

        const dept = (emp.department_name || emp.department || 'General').trim();
        const desig = (emp.designation_title || emp.designation || 'Staff').trim();
        const fullName =
          emp.display_name ||
          `${emp.first_name || ''} ${emp.last_name || ''}`.trim() ||
          emp.employee_code ||
          'Employee';

        const isHr =
          /hr|people|human\s*resources|talent|recruitment/i.test(dept) ||
          /hr|people|human\s*resources|talent/i.test(desig) ||
          /^(hr|people|talent|admin)@/i.test(email);

        const isManager =
          /head|manager|lead|director|supervisor|chief|officer|vp|president/i.test(desig) ||
          /head|manager|lead|director/i.test(dept);

        let category: RecipientContact['category'] = 'EMPLOYEE';
        if (isHr) category = 'HR_TEAM';
        else if (isManager) category = 'MANAGEMENT';

        contactsMap.set(email.toLowerCase(), {
          id: emp.id,
          name: fullName,
          code: emp.employee_code || 'EMP',
          email,
          phone: emp.phone || (emp as any).personal_phone || '',
          department: dept,
          designation: desig,
          isHr,
          isManager,
          isCurrentUser: currentUser?.email?.toLowerCase() === email.toLowerCase(),
          avatarUrl: emp.avatar_url,
          category,
        });
      });
    }

    // Sort: HR first, then Managers, then alphabetical by Name
    return Array.from(contactsMap.values()).sort((a, b) => {
      if (a.isHr && !b.isHr) return -1;
      if (!a.isHr && b.isHr) return 1;
      if (a.isManager && !b.isManager) return -1;
      if (!a.isManager && b.isManager) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Returns automatically detected primary HR email addresses dynamically per tenant.
   * Completely avoids any hardcoded client email addresses.
   */
  getAutoDetectedHrEmails(): string[] {
    const contacts = this.getOrganizationContacts();
    const hrList = contacts.filter(c => c.isHr || c.category === 'HR_TEAM');
    const emails = Array.from(new Set(hrList.map(c => c.email.trim().toLowerCase()).filter(Boolean)));

    // If no explicit HR department tag found, check company official email or leadership contacts
    if (emails.length === 0) {
      const activeComp = api.getActiveCompany() as any;
      if (activeComp?.email && typeof activeComp.email === 'string' && activeComp.email.includes('@')) {
        emails.push(activeComp.email.trim().toLowerCase());
      }
      const managers = contacts.filter(c => c.isManager);
      if (managers.length > 0) {
        emails.push(...managers.slice(0, 3).map(m => m.email.trim().toLowerCase()));
      }
    }

    return Array.from(new Set(emails));
  }

  /**
   * Search contacts across name, email, department, designation, employee code.
   */
  searchContacts(query: string, categoryFilter: 'ALL' | 'HR' | 'MANAGEMENT' | 'EMPLOYEE' = 'ALL'): RecipientContact[] {
    const all = this.getOrganizationContacts();
    const q = query.trim().toLowerCase();

    return all.filter(c => {
      if (categoryFilter === 'HR' && !c.isHr) return false;
      if (categoryFilter === 'MANAGEMENT' && !c.isManager) return false;
      if (categoryFilter === 'EMPLOYEE' && c.isHr) return false;

      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q) ||
        c.designation.toLowerCase().includes(q)
      );
    });
  }
}

export const attendanceReportContactService = new AttendanceReportContactService();
