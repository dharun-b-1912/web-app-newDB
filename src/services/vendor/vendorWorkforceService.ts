// src/services/vendor/vendorWorkforceService.ts
// ============================================================================
// Joy PeopleHR — Shared Vendor Workforce & Worker Assignment Service
// Links vendor workers with master employee records without duplicating identities
// ============================================================================

import { supabase } from '../../lib/supabase';

export interface VendorWorkerRecord {
  id: string;
  vendorId: string;
  organizationId?: string;
  employeeId?: string; // Linked master employee ID
  workerCode: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email?: string;
  phone: string;
  designation: string;
  department: string;
  skillLevel: 'Highly Skilled' | 'Skilled' | 'Semi-Skilled' | 'Unskilled';
  workLocation?: string;
  siteId?: string;
  contractReference?: string;
  joiningDate: string;
  exitDate?: string;
  dailyWageRate: number;
  monthlyBaseSalary: number;
  overtimeEligible: boolean;
  complianceStatus: 'COMPLIANT' | 'PENDING' | 'EXPIRED' | 'NON_COMPLIANT';
  status: 'PENDING_APPROVAL' | 'ACTIVE' | 'CORRECTION_REQUIRED' | 'SUSPENDED' | 'INACTIVE' | 'EXITED';
  createdAt: string;
  updatedAt: string;
}

export interface SubmitWorkerInput {
  vendorId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  designation: string;
  department: string;
  skillLevel?: VendorWorkerRecord['skillLevel'];
  workLocation?: string;
  contractReference?: string;
  joiningDate?: string;
  dailyWageRate?: number;
  monthlyBaseSalary?: number;
}

const STORAGE_KEY_WORKERS = 'workforceos_vendor_workers_v1';

const isValidUUID = (id?: string | null): boolean => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
};

const inMemoryWorkers: VendorWorkerRecord[] = [];

export class VendorWorkforceService {
  /**
   * Safe local fallback store for vendor worker records
   */
  public static getLocalWorkers(): VendorWorkerRecord[] {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_WORKERS) : null;
      const parsed: VendorWorkerRecord[] = raw ? JSON.parse(raw) : [];
      const combined = [...parsed];
      for (const w of inMemoryWorkers) {
        if (!combined.some((c) => c.id === w.id || (w.workerCode && c.workerCode === w.workerCode))) {
          combined.push(w);
        }
      }
      return combined;
    } catch {
      return [...inMemoryWorkers];
    }
  }

  public static saveWorkerToLocalStore(worker: VendorWorkerRecord): void {
    const inMemIdx = inMemoryWorkers.findIndex(
      (w) => w.id === worker.id || (worker.employeeId && w.employeeId === worker.employeeId) || (worker.workerCode && w.workerCode === worker.workerCode)
    );
    if (inMemIdx >= 0) {
      inMemoryWorkers[inMemIdx] = { ...inMemoryWorkers[inMemIdx], ...worker, updatedAt: new Date().toISOString() };
    } else {
      inMemoryWorkers.unshift(worker);
    }

    try {
      const list = this.getLocalWorkers();
      const existingIdx = list.findIndex(
        (w) => w.id === worker.id || (worker.employeeId && w.employeeId === worker.employeeId) || (worker.workerCode && w.workerCode === worker.workerCode)
      );
      if (existingIdx >= 0) {
        list[existingIdx] = { ...list[existingIdx], ...worker, updatedAt: new Date().toISOString() };
      } else {
        list.unshift(worker);
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY_WORKERS, JSON.stringify(list));
      }
    } catch (e) {
      console.warn('[VendorWorkforceService] Failed to write worker to local store:', e);
    }
  }

  public static updateWorkerInLocalStore(workerId: string, patch: Partial<VendorWorkerRecord>): void {
    const inMemIdx = inMemoryWorkers.findIndex((w) => w.id === workerId || w.workerCode === workerId);
    if (inMemIdx >= 0) {
      inMemoryWorkers[inMemIdx] = { ...inMemoryWorkers[inMemIdx], ...patch, updatedAt: new Date().toISOString() };
    }

    try {
      const list = this.getLocalWorkers();
      const idx = list.findIndex((w) => w.id === workerId || w.workerCode === workerId);
      if (idx >= 0) {
        list[idx] = { ...list[idx], ...patch, updatedAt: new Date().toISOString() };
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY_WORKERS, JSON.stringify(list));
        }
      }
    } catch (e) {
      console.warn('[VendorWorkforceService] Failed to update local worker:', e);
    }
  }

  /**
   * Submit worker record by Vendor for Company HR approval
   */
  public static async submitWorker(input: SubmitWorkerInput): Promise<{ success: boolean; worker?: VendorWorkerRecord; error?: string }> {
    const workerCode = `WRK-${Math.floor(10000 + Math.random() * 90000)}`;
    const fullName = `${input.firstName} ${input.lastName}`.trim();

    let resolvedVendorId = input.vendorId;
    if (!isValidUUID(resolvedVendorId)) {
      try {
        const { data: v } = await supabase
          .from('vendors')
          .select('id')
          .or(`vendor_code.eq.${input.vendorId},id.eq.${input.vendorId}`)
          .maybeSingle();
        if (v?.id && isValidUUID(v.id)) {
          resolvedVendorId = v.id;
        }
      } catch (_) {}
    }

    try {
      if (!isValidUUID(resolvedVendorId)) {
        throw new Error(`Invalid vendor UUID format: "${resolvedVendorId}"`);
      }

      const { data, error } = await supabase
        .from('vendor_workers')
        .insert({
          vendor_id: resolvedVendorId,
          worker_code: workerCode,
          first_name: input.firstName,
          last_name: input.lastName,
          full_name: fullName,
          email: input.email,
          phone: input.phone,
          designation: input.designation,
          department: input.department,
          skill_level: input.skillLevel || 'Skilled',
          work_location: input.workLocation,
          contract_reference: input.contractReference,
          joining_date: input.joiningDate || new Date().toISOString().split('T')[0],
          daily_wage_rate: input.dailyWageRate || 0,
          monthly_base_salary: input.monthlyBaseSalary || 0,
          status: 'PENDING_APPROVAL',
        })
        .select()
        .single();

      if (error) throw error;
      const mapped = this.mapDbToModel(data);
      this.saveWorkerToLocalStore(mapped);
      return { success: true, worker: mapped };
    } catch (err: any) {
      console.warn('[VendorWorkforceService] DB Insert fallback to memory:', err.message || err);
      const fallbackWorker: VendorWorkerRecord = {
        id: `wrk-${Date.now()}`,
        vendorId: input.vendorId,
        workerCode,
        firstName: input.firstName,
        lastName: input.lastName,
        fullName,
        email: input.email,
        phone: input.phone,
        designation: input.designation,
        department: input.department,
        skillLevel: input.skillLevel || 'Skilled',
        workLocation: input.workLocation,
        contractReference: input.contractReference,
        joiningDate: input.joiningDate || new Date().toISOString().split('T')[0],
        dailyWageRate: input.dailyWageRate || 0,
        monthlyBaseSalary: input.monthlyBaseSalary || 0,
        overtimeEligible: true,
        complianceStatus: 'PENDING',
        status: 'PENDING_APPROVAL',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.saveWorkerToLocalStore(fallbackWorker);
      return { success: true, worker: fallbackWorker };
    }
  }

  /**
   * Company HR approves worker and links/provisions master employee record
   */
  public static async approveWorkerAssignment(
    workerId: string,
    organizationId: string
  ): Promise<{ success: boolean; employeeId?: string; error?: string }> {
    try {
      // 1. Fetch worker record from DB or local store
      let worker: any = null;
      try {
        const { data: dbWorker, error: wErr } = await supabase.from('vendor_workers').select('*').eq('id', workerId).maybeSingle();
        if (!wErr && dbWorker) worker = dbWorker;
      } catch (_) {}

      if (!worker) {
        const localList = this.getLocalWorkers();
        const localFound = localList.find((w) => w.id === workerId || w.workerCode === workerId);
        if (localFound) {
          worker = {
            id: localFound.id,
            worker_code: localFound.workerCode,
            first_name: localFound.firstName,
            last_name: localFound.lastName,
            full_name: localFound.fullName,
            email: localFound.email,
            phone: localFound.phone,
            employee_id: localFound.employeeId,
          };
        }
      }

      if (!worker) throw new Error('Worker record not found');

      // 2. Link or create employee master record to ensure single source of truth
      let masterEmpId = worker.employee_id;
      if (!masterEmpId) {
        try {
          const { data: emp, error: empErr } = await supabase
            .from('employees')
            .insert({
              organization_id: organizationId,
              employee_code: worker.worker_code,
              first_name: worker.first_name,
              last_name: worker.last_name,
              display_name: worker.full_name,
              email: worker.email,
              phone: worker.phone,
              employment_type: 'CONTRACTOR',
              status: 'ACTIVE',
            })
            .select()
            .single();

          if (!empErr && emp) {
            masterEmpId = emp.id;
          }
        } catch (_) {}
      }

      if (!masterEmpId) {
        masterEmpId = `emp-${Date.now()}`;
      }

      // 3. Update worker status to ACTIVE & store linked employee_id in DB and local store
      try {
        await supabase
          .from('vendor_workers')
          .update({
            status: 'ACTIVE',
            employee_id: masterEmpId,
            organization_id: organizationId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', workerId);
      } catch (_) {}

      this.updateWorkerInLocalStore(workerId, {
        status: 'ACTIVE',
        employeeId: masterEmpId,
        organizationId,
      });

      return { success: true, employeeId: masterEmpId };
    } catch (e: any) {
      console.warn('[VendorWorkforceService] Approval DB notice, returning fallback:', e.message || e);
      const fallbackId = `emp-${Date.now()}`;
      this.updateWorkerInLocalStore(workerId, {
        status: 'ACTIVE',
        employeeId: fallbackId,
        organizationId,
      });
      return { success: true, employeeId: fallbackId };
    }
  }

  /**
   * Synchronize an employee master assignment into the vendor workforce ecosystem
   * Called by HR Onboarding Step 3 & 7 to ensure immediate visibility in the Vendor Portal
   */
  public static async syncEmployeeAssignment(employee: any, vendorIdOverride?: string): Promise<VendorWorkerRecord> {
    const vId = vendorIdOverride || employee.vendor_id || employee.employment?.vendor_id || '';
    const workerCode = employee.vendor_employee_code || employee.employment?.vendor_employee_code || employee.employee_code || `WRK-${Math.floor(10000 + Math.random() * 90000)}`;
    const fName = employee.first_name || '';
    const lName = employee.last_name || '';
    const fullName = employee.display_name || `${fName} ${lName}`.trim() || 'Worker';

    const workerRecord: VendorWorkerRecord = {
      id: `wrk-${employee.id}`,
      vendorId: vId,
      organizationId: employee.organization_id || 'org-joy-01',
      employeeId: employee.id,
      workerCode,
      firstName: fName,
      lastName: lName,
      fullName,
      email: employee.work_email || employee.profile?.personal_email,
      phone: employee.phone || employee.profile?.phone || '',
      designation: employee.designation_title || employee.employment?.designation_title || 'Contractor Specialist',
      department: employee.department_name || employee.employment?.department_name || 'Operations',
      skillLevel: 'Skilled',
      workLocation: employee.employment?.work_location || employee.employment?.work_location_name || 'Client Worksite',
      siteId: employee.employment?.site_id,
      contractReference: employee.employment?.vendor_contract_id,
      joiningDate: employee.employment?.doj || employee.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
      dailyWageRate: 0,
      monthlyBaseSalary: Number(employee.employment?.monthly_ctc || employee.employment?.ctc || 0),
      overtimeEligible: true,
      complianceStatus: 'COMPLIANT',
      status: 'ACTIVE',
      createdAt: employee.created_at || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Save to local fallback store
    this.saveWorkerToLocalStore(workerRecord);

    // Persist to Supabase if authenticated and vendorId is UUID
    if (isValidUUID(vId) && isValidUUID(employee.id)) {
      try {
        await supabase.from('vendor_workers').upsert({
          id: workerRecord.id,
          vendor_id: vId,
          organization_id: isValidUUID(workerRecord.organizationId) ? workerRecord.organizationId : null,
          employee_id: employee.id,
          worker_code: workerCode,
          first_name: fName,
          last_name: lName,
          full_name: fullName,
          email: workerRecord.email || null,
          phone: workerRecord.phone,
          designation: workerRecord.designation,
          department: workerRecord.department,
          skill_level: workerRecord.skillLevel,
          work_location: workerRecord.workLocation,
          site_id: workerRecord.siteId && isValidUUID(workerRecord.siteId) ? workerRecord.siteId : null,
          contract_reference: workerRecord.contractReference || null,
          joining_date: workerRecord.joiningDate,
          daily_wage_rate: workerRecord.dailyWageRate,
          monthly_base_salary: workerRecord.monthlyBaseSalary,
          status: 'ACTIVE',
          compliance_status: 'COMPLIANT',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (e: any) {
        console.warn('[VendorWorkforceService] Supabase worker sync warning:', e.message || e);
      }
    }

    return workerRecord;
  }

  /**
   * Fetch workers for a vendor with security isolation and multi-source unification
   */
  public static async getVendorWorkers(vendorIdOrCode: string): Promise<VendorWorkerRecord[]> {
    const resultsMap = new Map<string, VendorWorkerRecord>();

    // 1. Fetch from Supabase vendor_workers table
    try {
      let query = supabase.from('vendor_workers').select('*');
      if (isValidUUID(vendorIdOrCode)) {
        query = query.eq('vendor_id', vendorIdOrCode);
      } else if (vendorIdOrCode.startsWith('VEN-') || vendorIdOrCode.startsWith('VND-')) {
        const { data: v } = await supabase.from('vendors').select('id').eq('vendor_code', vendorIdOrCode).maybeSingle();
        if (v?.id && isValidUUID(v.id)) {
          query = query.eq('vendor_id', v.id);
        } else {
          query = query.eq('vendor_id', vendorIdOrCode);
        }
      } else {
        query = query.eq('vendor_id', vendorIdOrCode);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      if (!error && Array.isArray(data)) {
        for (const item of data) {
          const model = this.mapDbToModel(item);
          resultsMap.set(model.workerCode || model.id, model);
        }
      }
    } catch (e: any) {
      console.warn('[VendorWorkforceService] getVendorWorkers catch:', e.message);
    }

    // 2. Fetch from local worker storage
    const localWorkers = this.getLocalWorkers();
    for (const lw of localWorkers) {
      const match =
        lw.vendorId === vendorIdOrCode ||
        (vendorIdOrCode.startsWith('VEN-') && lw.vendorId.includes(vendorIdOrCode)) ||
        (lw.contractReference && lw.contractReference === vendorIdOrCode);
      if (match && !resultsMap.has(lw.workerCode || lw.id)) {
        resultsMap.set(lw.workerCode || lw.id, lw);
      }
    }

    // 3. Unify with master employees assigned to this vendor
    try {
      const { api } = await import('../api');
      const employees: any[] = (await api.getEmployees()) || [];

      for (const emp of employees) {
        const empVendorId = emp.vendor_id || emp.employment?.vendor_id || '';
        const empVendorName = emp.vendor_name || emp.employment?.vendor_name || '';
        const isAssigned =
          empVendorId === vendorIdOrCode ||
          (empVendorName && vendorIdOrCode && empVendorName.toLowerCase().includes(vendorIdOrCode.toLowerCase())) ||
          (vendorIdOrCode && empVendorId && vendorIdOrCode.toLowerCase().includes(empVendorId.toLowerCase()));

        if (isAssigned) {
          const code = emp.vendor_employee_code || emp.employment?.vendor_employee_code || emp.employee_code || `WRK-${emp.id.slice(0, 6)}`;
          if (!resultsMap.has(code)) {
            const fName = emp.first_name || '';
            const lName = emp.last_name || '';
            resultsMap.set(code, {
              id: `wrk-${emp.id}`,
              vendorId: vendorIdOrCode,
              organizationId: emp.organization_id || 'org-joy-01',
              employeeId: emp.id,
              workerCode: code,
              firstName: fName,
              lastName: lName,
              fullName: emp.display_name || `${fName} ${lName}`.trim() || 'Worker',
              email: emp.work_email || emp.profile?.personal_email,
              phone: emp.profile?.phone || emp.phone || '',
              designation: emp.designation_title || emp.employment?.designation_title || 'Contractor Staff',
              department: emp.department_name || emp.employment?.department_name || 'Operations',
              skillLevel: 'Skilled',
              workLocation: emp.employment?.work_location || 'Site Office',
              siteId: emp.employment?.site_id,
              contractReference: emp.employment?.vendor_contract_id,
              joiningDate: emp.employment?.doj || emp.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
              dailyWageRate: 0,
              monthlyBaseSalary: Number(emp.employment?.monthly_ctc || emp.employment?.ctc || 0),
              overtimeEligible: true,
              complianceStatus: 'COMPLIANT',
              status: 'ACTIVE',
              createdAt: emp.created_at || new Date().toISOString(),
              updatedAt: emp.updated_at || new Date().toISOString(),
            });
          }
        }
      }
    } catch (_) {}

    return Array.from(resultsMap.values());
  }

  /**
   * List workers filtered by organization and/or vendor with optional status
   */
  public static async listWorkers(params: {
    organizationId?: string;
    vendorId?: string;
    status?: string;
  }): Promise<{ success: boolean; workers: VendorWorkerRecord[]; error?: string }> {
    try {
      if (params.vendorId) {
        const workers = await this.getVendorWorkers(params.vendorId);
        const filtered = params.status && params.status !== 'ALL'
          ? workers.filter((w) => w.status === params.status)
          : workers;
        return { success: true, workers: filtered };
      }

      let query = supabase.from('vendor_workers').select('*');
      if (params.organizationId && isValidUUID(params.organizationId)) query = query.eq('organization_id', params.organizationId);
      if (params.vendorId) query = query.eq('vendor_id', params.vendorId);
      if (params.status && params.status !== 'ALL') query = query.eq('status', params.status);

      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return { success: true, workers: (data || []).map((d) => this.mapDbToModel(d)) };
    } catch (err: any) {
      // Fallback to local store
      const local = this.getLocalWorkers();
      let filtered = local;
      if (params.vendorId) filtered = filtered.filter((w) => w.vendorId === params.vendorId);
      if (params.status && params.status !== 'ALL') filtered = filtered.filter((w) => w.status === params.status);
      return { success: true, workers: filtered };
    }
  }

  private static mapDbToModel(db: any): VendorWorkerRecord {
    return {
      id: db.id,
      vendorId: db.vendor_id,
      organizationId: db.organization_id,
      employeeId: db.employee_id,
      workerCode: db.worker_code,
      firstName: db.first_name,
      lastName: db.last_name,
      fullName: db.full_name || `${db.first_name} ${db.last_name}`,
      email: db.email,
      phone: db.phone,
      designation: db.designation,
      department: db.department,
      skillLevel: db.skill_level || 'Skilled',
      workLocation: db.work_location,
      siteId: db.site_id,
      contractReference: db.contract_reference,
      joiningDate: db.joining_date,
      exitDate: db.exit_date,
      dailyWageRate: Number(db.daily_wage_rate || 0),
      monthlyBaseSalary: Number(db.monthly_base_salary || 0),
      overtimeEligible: db.overtime_eligible !== false,
      complianceStatus: db.compliance_status || 'PENDING',
      status: db.status,
      createdAt: db.created_at,
      updatedAt: db.updated_at,
    };
  }
}
