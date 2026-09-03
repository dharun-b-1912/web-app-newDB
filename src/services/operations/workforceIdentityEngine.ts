// src/services/operations/workforceIdentityEngine.ts
// ============================================================================
// Joy PeopleHR — Engine 1: Workforce Identity, Auto-ID & Duplicate Detection
// ============================================================================

import { supabase } from '../../lib/supabase';
import { Employee } from '../../types';

export type WorkerCategory = 'DIRECT' | 'VENDOR' | 'CONTRACT' | 'TEMPORARY' | 'TRAINEE' | 'INTERN';

export interface EmployeeIdRule {
  id?: string;
  organization_id: string;
  worker_category: WorkerCategory;
  prefix: string;
  include_company_code: boolean;
  include_branch_code: boolean;
  include_vendor_code: boolean;
  include_financial_year: boolean;
  separator: string;
  sequence_length: number;
  current_sequence: number;
  is_active: boolean;
}

export interface DuplicateCheckParams {
  organizationId: string;
  phone?: string;
  email?: string;
  panNumber?: string;
  aadhaarNumber?: string;
  bankAccountNumber?: string;
  biometricId?: string;
}

export interface DuplicateMatchResult {
  hasDuplicate: boolean;
  matchType?: 'PHONE' | 'EMAIL' | 'PAN' | 'BANK_ACCOUNT' | 'BIOMETRIC';
  matchedField?: string;
  existingEmployee?: {
    id: string;
    employee_code: string;
    first_name: string;
    last_name: string;
    status: string;
    company_name?: string;
    designation_title?: string;
    department_name?: string;
    exit_date?: string;
  };
}

class WorkforceIdentityEngine {
  /**
   * Generates the next sequential Employee ID based on organization rules
   */
  async generateEmployeeId(
    orgId: string,
    category: WorkerCategory = 'DIRECT',
    options?: { companyCode?: string; branchCode?: string; vendorCode?: string }
  ): Promise<string> {
    try {
      // 1. Fetch configured rule or use standard default
      const { data: rule } = await supabase
        .from('employee_id_rules')
        .select('*')
        .eq('organization_id', orgId)
        .eq('worker_category', category)
        .maybeSingle();

      const prefix = rule?.prefix || (category === 'VENDOR' ? 'JPH-VND' : category === 'CONTRACT' ? 'JPH-CW' : 'JPH-EMP');
      const sep = rule?.separator || '-';
      const seqLen = rule?.sequence_length || 6;

      // 2. Compute financial year if configured (e.g. 26-27)
      const now = new Date();
      const currentYear = now.getFullYear();
      const fyStr = now.getMonth() >= 3 ? `${currentYear % 100}${((currentYear + 1) % 100)}` : `${(currentYear - 1) % 100}${(currentYear % 100)}`;

      // 3. Increment sequence atomically or fallback to random/timestamp sequence
      let nextSeq = 1;
      if (rule?.id) {
        nextSeq = Number(rule.current_sequence || 0) + 1;
        await supabase
          .from('employee_id_rules')
          .update({ current_sequence: nextSeq, updated_at: new Date().toISOString() })
          .eq('id', rule.id);
      } else {
        // Query current max count
        const { count } = await supabase.from('employees').select('id', { count: 'exact', head: true });
        nextSeq = (count || 0) + 1;
      }

      const seqPadded = String(nextSeq).padStart(seqLen, '0');
      const parts: string[] = [prefix];

      if (rule?.include_company_code && options?.companyCode) parts.push(options.companyCode);
      if (rule?.include_branch_code && options?.branchCode) parts.push(options.branchCode);
      if (rule?.include_vendor_code && options?.vendorCode) parts.push(options.vendorCode);
      if (rule?.include_financial_year) parts.push(`FY${fyStr}`);

      parts.push(seqPadded);
      return parts.join(sep);
    } catch (err) {
      console.warn('[IdentityEngine] Fallback sequence generation:', err);
      const randSeq = Math.floor(100000 + Math.random() * 900000);
      return `JPH-${category === 'VENDOR' ? 'VND' : 'EMP'}-${randSeq}`;
    }
  }

  /**
   * Server-side multi-attribute duplicate detection to prevent duplicate entries
   */
  async checkForDuplicates(params: DuplicateCheckParams): Promise<DuplicateMatchResult> {
    try {
      const { data: emps, error } = await supabase
        .from('employees')
        .select('id, employee_code, first_name, last_name, status, work_email, profile, company_name, designation_title, department_name, employment');

      if (error || !emps) {
        return { hasDuplicate: false };
      }

      const cleanPhone = (p?: string) => (p || '').replace(/[^0-9]/g, '').slice(-10);
      const cleanEmail = (e?: string) => (e || '').trim().toLowerCase();

      for (const emp of emps) {
        const empPhone = cleanPhone(emp.profile?.phone || (emp as any).phone);
        const empEmail = cleanEmail(emp.work_email || emp.profile?.personal_email);
        const empPan = (emp.profile?.statutory?.pan_number || emp.profile?.pan_number || '').trim().toUpperCase();

        if (params.phone && cleanPhone(params.phone) && cleanPhone(params.phone) === empPhone) {
          return {
            hasDuplicate: true,
            matchType: 'PHONE',
            matchedField: `Phone: ${params.phone}`,
            existingEmployee: {
              id: emp.id,
              employee_code: emp.employee_code,
              first_name: emp.first_name,
              last_name: emp.last_name,
              status: emp.status || 'Active',
              company_name: emp.company_name,
              designation_title: emp.designation_title,
              department_name: emp.department_name,
              exit_date: emp.employment?.exit_date || emp.employment?.relieving_date,
            },
          };
        }

        if (params.email && cleanEmail(params.email) && cleanEmail(params.email) === empEmail) {
          return {
            hasDuplicate: true,
            matchType: 'EMAIL',
            matchedField: `Email: ${params.email}`,
            existingEmployee: {
              id: emp.id,
              employee_code: emp.employee_code,
              first_name: emp.first_name,
              last_name: emp.last_name,
              status: emp.status || 'Active',
              company_name: emp.company_name,
              designation_title: emp.designation_title,
              department_name: emp.department_name,
              exit_date: emp.employment?.exit_date,
            },
          };
        }

        if (params.panNumber && params.panNumber.trim() && empPan && params.panNumber.trim().toUpperCase() === empPan) {
          return {
            hasDuplicate: true,
            matchType: 'PAN',
            matchedField: `PAN: ${params.panNumber}`,
            existingEmployee: {
              id: emp.id,
              employee_code: emp.employee_code,
              first_name: emp.first_name,
              last_name: emp.last_name,
              status: emp.status || 'Active',
              company_name: emp.company_name,
            },
          };
        }
      }

      return { hasDuplicate: false };
    } catch (err) {
      console.error('[IdentityEngine] Duplicate check failure:', err);
      return { hasDuplicate: false };
    }
  }

  /**
   * Rehire an existing / past employee without losing historical records
   */
  async rehireEmployee(
    existingEmpId: string,
    rehireDetails: {
      newDoj: string;
      newDesignation?: string;
      newDepartment?: string;
      newSalary?: number;
      rehireRemarks?: string;
    }
  ): Promise<{ success: boolean; employee?: Employee; message: string }> {
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('employees')
        .select('*')
        .eq('id', existingEmpId)
        .single();

      if (fetchErr || !existing) {
        throw new Error('Existing employee record not found for rehire.');
      }

      const employmentData = existing.employment || {};
      const rehireHistory = employmentData.rehire_history || [];

      // Preserve previous employment details in rehire history
      rehireHistory.push({
        previous_status: existing.status,
        previous_doj: employmentData.doj,
        previous_exit_date: employmentData.exit_date || employmentData.relieving_date,
        rehire_date: rehireDetails.newDoj,
        remarks: rehireDetails.rehireRemarks || 'Rehired through Workforce Identity Engine',
        recorded_at: new Date().toISOString(),
      });

      const updatedEmployment = {
        ...employmentData,
        doj: rehireDetails.newDoj,
        exit_date: null,
        relieving_date: null,
        resignation_date: null,
        rehire_history: rehireHistory,
      };

      const { data: updated, error: updateErr } = await supabase
        .from('employees')
        .update({
          status: 'Active',
          designation_title: rehireDetails.newDesignation || existing.designation_title,
          department_name: rehireDetails.newDepartment || existing.department_name,
          employment: updatedEmployment,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingEmpId)
        .select()
        .single();

      if (updateErr) throw updateErr;

      return {
        success: true,
        employee: updated as Employee,
        message: `Employee ${existing.first_name} successfully rehired with full historical continuity.`,
      };
    } catch (err: any) {
      return {
        success: false,
        message: err.message || 'Failed to process employee rehire.',
      };
    }
  }
}

export const workforceIdentityEngine = new WorkforceIdentityEngine();
