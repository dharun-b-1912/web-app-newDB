import { AssetAssignment, UniversalAsset, AssignmentTargetType, AssetCondition } from '../../types';
import { api } from '../api';
import { hrEventBus } from '../hrEventBus';
import { assetAuditService } from './assetAuditService';

const ASSET_ASSIGNMENTS_KEY = 'workforce_asset_assignments_v1';
const ASSETS_KEY = 'workforce_assets_master_v1';

class AssetAssignmentService {
  private getStore(): AssetAssignment[] {
    try {
      const data = localStorage.getItem(ASSET_ASSIGNMENTS_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private setAssignments(items: AssetAssignment[]): void {
    try {
      localStorage.setItem(ASSET_ASSIGNMENTS_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[AssetAssignmentService] Failed to persist assignments:', e);
    }
  }

  private getAssets(): UniversalAsset[] {
    try {
      const data = localStorage.getItem(ASSETS_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private setAssets(assets: UniversalAsset[]): void {
    try {
      localStorage.setItem(ASSETS_KEY, JSON.stringify(assets));
    } catch (e) {
      console.warn('[AssetAssignmentService] Failed to persist assets:', e);
    }
  }

  // Assign Asset to Employee, Department, Project, Site, Vehicle, or Vendor Worker
  assignAsset(params: {
    assetId: string;
    targetType: AssignmentTargetType;
    targetId: string;
    targetName: string;
    conditionAtAssign?: AssetCondition;
    expectedReturnDate?: string;
    purpose?: string;
    notes?: string;
  }): AssetAssignment {
    const assets = this.getAssets();
    const assetIdx = assets.findIndex(a => a.id === params.assetId);
    if (assetIdx === -1) throw new Error('Asset not found.');

    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();

    const assignmentId = `ast-asgn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newAssignment: AssetAssignment = {
      id: assignmentId,
      asset_id: params.assetId,
      target_type: params.targetType,
      target_id: params.targetId,
      target_name: params.targetName,
      assigned_by_id: currentUser.id || (currentUser as any).employee_id || 'user-admin-01',
      assigned_by_name: currentUser.name || 'Dharun Joy',
      assigned_at: now,
      expected_return_date: params.expectedReturnDate,
      condition_at_assign: params.conditionAtAssign || assets[assetIdx].condition || 'GOOD',
      purpose: params.purpose,
      notes: params.notes,
      status: 'ACTIVE',
    };

    // Update Asset State
    assets[assetIdx].status = 'ASSIGNED';
    assets[assetIdx].custodian_id = params.targetId;
    assets[assetIdx].custodian_name = params.targetName;
    if (params.targetType === 'EMPLOYEE') {
      assets[assetIdx].employee_id = params.targetId;
    }
    assets[assetIdx].assigned_at = now;
    assets[assetIdx].updated_at = now;

    this.setAssets(assets);

    const assignments = this.getStore();
    assignments.unshift(newAssignment);
    this.setAssignments(assignments);

    assetAuditService.recordLog({
      assetId: params.assetId,
      action: 'ASSIGNED',
      details: {
        targetType: params.targetType,
        targetId: params.targetId,
        targetName: params.targetName,
        condition: newAssignment.condition_at_assign,
        purpose: params.purpose,
      },
    });

    hrEventBus.publish('asset.assigned', {
      assetId: params.assetId,
      targetType: params.targetType,
      targetId: params.targetId,
      targetName: params.targetName,
    });

    return newAssignment;
  }

  // Return / Check-in Asset with Condition Inspection
  returnAsset(params: {
    assetId: string;
    conditionAtReturn: AssetCondition;
    notes?: string;
  }): UniversalAsset {
    const assets = this.getAssets();
    const assetIdx = assets.findIndex(a => a.id === params.assetId);
    if (assetIdx === -1) throw new Error('Asset not found.');

    const assignments = this.getStore();
    const asgnIdx = assignments.findIndex(a => a.asset_id === params.assetId && a.status === 'ACTIVE');

    const now = new Date().toISOString();

    if (asgnIdx !== -1) {
      assignments[asgnIdx].status = 'RETURNED';
      assignments[asgnIdx].actual_return_date = now;
      assignments[asgnIdx].condition_at_return = params.conditionAtReturn;
      if (params.notes) assignments[asgnIdx].notes = params.notes;
      this.setAssignments(assignments);
    }

    // Update Asset State
    const previousCustodian = assets[assetIdx].custodian_name;
    assets[assetIdx].status = params.conditionAtReturn === 'DAMAGED' || params.conditionAtReturn === 'CRITICAL' ? 'DAMAGED' : 'AVAILABLE';
    assets[assetIdx].condition = params.conditionAtReturn;
    assets[assetIdx].custodian_id = undefined;
    assets[assetIdx].custodian_name = undefined;
    assets[assetIdx].employee_id = undefined;
    assets[assetIdx].assigned_at = undefined;
    assets[assetIdx].updated_at = now;

    this.setAssets(assets);

    assetAuditService.recordLog({
      assetId: params.assetId,
      action: 'RETURNED',
      details: {
        previousCustodian,
        conditionAtReturn: params.conditionAtReturn,
        notes: params.notes,
      },
    });

    hrEventBus.publish('asset.returned', {
      assetId: params.assetId,
      condition: params.conditionAtReturn,
    });

    return assets[assetIdx];
  }

  getAssignments(assetId?: string): AssetAssignment[] {
    const items = this.getStore();
    if (assetId) {
      return items.filter(a => a.asset_id === assetId);
    }
    return items;
  }
}

export const assetAssignmentService = new AssetAssignmentService();
