// src/services/asset/assetAssignmentService.ts
// ============================================================================
// Joy PeopleHR — Asset Custody & Allocation Ledger Service
// Pure Supabase Backend — Zero localStorage, Returnable & Deduction Tracking
// ============================================================================

import { AssetAssignment, UniversalAsset, AssignmentTargetType, AssetCondition } from '../../types';
import { supabaseAdmin, supabase, isSupabaseEnabled } from '../../lib/supabase';
import { assetService } from './assetService';
import { hrEventBus } from '../hrEventBus';
import { api } from '../api';

function resolveTargetOrg(explicitOrgId?: string): string {
  if (explicitOrgId && explicitOrgId.trim()) return explicitOrgId.trim();
  const activeComp = typeof api !== 'undefined' && api.getActiveCompany ? api.getActiveCompany() : null;
  if (activeComp?.organization_id) return activeComp.organization_id;
  try {
    const user = api.getCurrentUser?.();
    if (user?.organization_id) return user.organization_id;
  } catch (_) {}
  return '';
}

class AssetAssignmentService {
  private _assignmentsByOrg: Map<string, AssetAssignment[]> = new Map();
  private _inFlightByOrg: Map<string, Promise<AssetAssignment[]>> = new Map();

  constructor() {
    // Eager loading removed to prevent cross-tenant data leakage during early bundle evaluation
  }

  /**
   * Fetch all assignment records live from Supabase PostgreSQL strictly isolated by organization
   */
  async fetchAssignmentsFromDb(orgId?: string, force = false): Promise<AssetAssignment[]> {
    const targetOrg = resolveTargetOrg(orgId);
    if (!targetOrg) {
      return [];
    }

    const inFlight = this._inFlightByOrg.get(targetOrg);
    if (inFlight && !force) return inFlight;

    const fetchPromise = (async () => {
      try {
        const client = isSupabaseEnabled ? supabaseAdmin : supabase;
        const query = client
          .from('asset_assignments')
          .select('*')
          .eq('organization_id', targetOrg)
          .order('created_at', { ascending: false });

        const { data, error } = await query;

        if (error) {
          console.warn('[AssetAssignmentService] Supabase fetch warning:', error.message);
          return this._assignmentsByOrg.get(targetOrg) || [];
        }

        const mapped: AssetAssignment[] = (data || []).map((row: any) => {
          let parsedCondition: any = {};
          if (row.condition_on_assignment) {
            try {
              if (row.condition_on_assignment.startsWith('{')) {
                parsedCondition = JSON.parse(row.condition_on_assignment);
              } else {
                parsedCondition = { condition: row.condition_on_assignment };
              }
            } catch (_) {
              parsedCondition = { condition: row.condition_on_assignment };
            }
          }

          let parsedReturn: any = {};
          if (row.condition_on_return) {
            try {
              if (row.condition_on_return.startsWith('{')) {
                parsedReturn = JSON.parse(row.condition_on_return);
              } else {
                parsedReturn = { return_condition: row.condition_on_return };
              }
            } catch (_) {
              parsedReturn = { return_condition: row.condition_on_return };
            }
          }

          return {
            id: row.id,
            asset_id: row.asset_id,
            employee_id: row.employee_id,
            target_type: 'EMPLOYEE',
            target_id: row.employee_id,
            target_name: parsedCondition.target_name || parsedCondition.employee_name || 'Assigned Employee',
            assigned_by_id: parsedCondition.assigned_by_id || 'admin',
            assigned_by_name: parsedCondition.assigned_by_name || 'HR Admin',
            assigned_at: row.assigned_date || row.created_at,
            expected_return_date: parsedCondition.expected_return_date,
            actual_return_date: row.returned_date,
            condition_at_assign: parsedCondition.condition || 'GOOD',
            condition_at_return: parsedReturn.return_condition,
            purpose: parsedCondition.purpose || 'Job Assignment',
            notes: parsedCondition.notes || '',
            status: row.status === 'RETURNED' ? 'RETURNED' : 'ACTIVE',
            is_returnable: parsedCondition.is_returnable !== false,
            deduction_amount: Number(parsedCondition.deduction_amount) || 0,
            deduction_status: parsedReturn.deduction_status || (parsedCondition.deduction_amount ? 'DEPOSIT_HELD' : 'NO_DEDUCTION'),
          };
        });

        this._assignmentsByOrg.set(targetOrg, mapped);
        return mapped;
      } catch (err: any) {
        console.error('[AssetAssignmentService] Database error:', err.message);
        return this._assignmentsByOrg.get(targetOrg) || [];
      } finally {
        this._inFlightByOrg.delete(targetOrg);
      }
    })();

    this._inFlightByOrg.set(targetOrg, fetchPromise);
    return fetchPromise;
  }

  /**
   * Synchronous getter for immediate UI view
   */
  getAssignments(assetId?: string, orgId?: string): AssetAssignment[] {
    const targetOrg = resolveTargetOrg(orgId);
    if (!targetOrg) return [];
    const orgAssignments = this._assignmentsByOrg.get(targetOrg) || [];
    if (assetId) {
      return orgAssignments.filter(a => a.asset_id === assetId);
    }
    return orgAssignments;
  }

  getActiveAssignment(assetId: string, orgId?: string): AssetAssignment | null {
    const targetOrg = resolveTargetOrg(orgId);
    if (!targetOrg) return null;
    const orgAssignments = this._assignmentsByOrg.get(targetOrg) || [];
    return orgAssignments.find(a => a.asset_id === assetId && (!a.actual_return_date || a.actual_return_date === '')) || null;
  }

  /**
   * Assign asset to an employee and persist to Supabase
   */
  async assignAsset(params: {
    assetId: string;
    employeeId: string;
    employeeName: string;
    organizationId?: string;
    conditionAtAssign?: AssetCondition;
    assignedDate?: string;
    expectedReturnDate?: string;
    isReturnable?: boolean;
    deductionAmount?: number;
    purpose?: string;
    notes?: string;
  }): Promise<AssetAssignment> {
    const client = isSupabaseEnabled ? supabaseAdmin : supabase;
    const now = new Date().toISOString();
    const assignedDate = params.assignedDate || now.split('T')[0];

    const activeComp = typeof api !== 'undefined' && api.getActiveCompany ? api.getActiveCompany() : null;
    const orgId = resolveTargetOrg(params.organizationId || activeComp?.organization_id);
    if (!orgId) {
      throw new Error('Tenant organization context is required to assign an asset.');
    }

    // Pack extended metadata into condition_on_assignment TEXT JSON
    const metaPayload = JSON.stringify({
      condition: params.conditionAtAssign || 'GOOD',
      employee_name: params.employeeName,
      target_name: params.employeeName,
      is_returnable: params.isReturnable !== false,
      deduction_amount: Number(params.deductionAmount) || 0,
      expected_return_date: params.expectedReturnDate || null,
      purpose: params.purpose || 'General Handover',
      notes: params.notes || '',
      assigned_by_name: 'HR Admin',
    });

    const dbPayload = {
      organization_id: orgId,
      asset_id: params.assetId,
      employee_id: params.employeeId,
      assigned_date: assignedDate,
      condition_on_assignment: metaPayload,
      status: 'ACTIVE',
    };

    const { data, error } = await client
      .from('asset_assignments')
      .insert([dbPayload])
      .select('*')
      .single();

    if (error) {
      console.error('[AssetAssignmentService] Failed to assign asset in Supabase:', error);
      throw new Error(`Failed to record assignment in database: ${error.message}`);
    }

    // Update Asset status in Supabase
    await assetService.updateAssetStatus(params.assetId, 'ASSIGNED', orgId);

    const createdAssignment: AssetAssignment = {
      id: data.id,
      asset_id: params.assetId,
      employee_id: params.employeeId,
      target_type: 'EMPLOYEE',
      target_id: params.employeeId,
      target_name: params.employeeName,
      assigned_by_id: 'admin',
      assigned_by_name: 'HR Admin',
      assigned_at: assignedDate,
      expected_return_date: params.expectedReturnDate,
      condition_at_assign: params.conditionAtAssign || 'GOOD',
      purpose: params.purpose,
      notes: params.notes,
      status: 'ACTIVE',
      is_returnable: params.isReturnable !== false,
      deduction_amount: Number(params.deductionAmount) || 0,
      deduction_status: params.deductionAmount ? 'DEPOSIT_HELD' : 'NO_DEDUCTION',
    };

    const orgAssignments = this._assignmentsByOrg.get(orgId) || [];
    orgAssignments.unshift(createdAssignment);
    this._assignmentsByOrg.set(orgId, orgAssignments);
    hrEventBus.emit('asset.assigned', createdAssignment);
    return createdAssignment;
  }

  /**
   * Return asset from employee, record condition, process deduction/clearance, and update Supabase
   */
  async returnAsset(params: {
    assignmentId: string;
    assetId: string;
    organizationId?: string;
    returnDate?: string;
    conditionAtReturn: AssetCondition;
    deductionStatus?: 'NO_DEDUCTION' | 'DEDUCTED_PAYROLL' | 'DEPOSIT_HELD' | 'WAIVED' | 'REFUNDED';
    deductionCharged?: number;
    remarks?: string;
  }): Promise<void> {
    const client = isSupabaseEnabled ? supabaseAdmin : supabase;
    const returnDate = params.returnDate || new Date().toISOString().split('T')[0];
    const activeComp = typeof api !== 'undefined' && api.getActiveCompany ? api.getActiveCompany() : null;
    const orgId = resolveTargetOrg(params.organizationId || activeComp?.organization_id);

    const returnMetaPayload = JSON.stringify({
      return_condition: params.conditionAtReturn,
      deduction_status: params.deductionStatus || 'NO_DEDUCTION',
      deduction_charged: Number(params.deductionCharged) || 0,
      remarks: params.remarks || '',
      returned_at: new Date().toISOString(),
    });

    let query = client
      .from('asset_assignments')
      .update({
        returned_date: returnDate,
        condition_on_return: returnMetaPayload,
        status: 'RETURNED',
      })
      .eq('id', params.assignmentId);

    if (orgId) {
      query = query.eq('organization_id', orgId);
    }

    const { error } = await query;

    if (error) {
      console.error('[AssetAssignmentService] Failed to return asset in Supabase:', error);
      throw new Error(`Failed to update return in database: ${error.message}`);
    }

    // Set asset back to AVAILABLE (or DAMAGED if critical damage)
    const newAssetStatus = params.conditionAtReturn === 'DAMAGED' || params.conditionAtReturn === 'CRITICAL' ? 'UNDER_MAINTENANCE' : 'AVAILABLE';
    await assetService.updateAssetStatus(params.assetId, newAssetStatus, orgId);

    if (orgId) {
      const orgAssignments = this._assignmentsByOrg.get(orgId) || [];
      const asgn = orgAssignments.find(a => a.id === params.assignmentId);
      if (asgn) {
        asgn.status = 'RETURNED';
        asgn.actual_return_date = returnDate;
        asgn.condition_at_return = params.conditionAtReturn;
        asgn.deduction_status = params.deductionStatus || 'NO_DEDUCTION';
        hrEventBus.emit('asset.returned', asgn);
      }
    }
  }
}

export const assetAssignmentService = new AssetAssignmentService();
