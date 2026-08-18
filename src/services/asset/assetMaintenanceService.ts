import { AssetMaintenanceRecord, UniversalAsset } from '../../types';
import { api } from '../api';
import { hrEventBus } from '../hrEventBus';
import { assetAuditService } from './assetAuditService';

const MAINTENANCE_RECORDS_KEY = 'workforce_asset_maintenance_v1';
const ASSETS_KEY = 'workforce_assets_master_v1';

class AssetMaintenanceService {
  private getRecords(): AssetMaintenanceRecord[] {
    try {
      const data = localStorage.getItem(MAINTENANCE_RECORDS_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private setRecords(records: AssetMaintenanceRecord[]): void {
    try {
      localStorage.setItem(MAINTENANCE_RECORDS_KEY, JSON.stringify(records));
    } catch (e) {
      console.warn('[AssetMaintenanceService] Failed to persist records:', e);
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
      console.warn('[AssetMaintenanceService] Failed to persist assets:', e);
    }
  }

  scheduleMaintenance(params: {
    assetId: string;
    maintenanceType: AssetMaintenanceRecord['maintenance_type'];
    title: string;
    description?: string;
    scheduledDate: string;
    technicianName?: string;
    vendorName?: string;
    cost?: number;
  }): AssetMaintenanceRecord {
    const assets = this.getAssets();
    const asset = assets.find(a => a.id === params.assetId);
    const now = new Date().toISOString();

    const newRecord: AssetMaintenanceRecord = {
      id: `ast-mnt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      asset_id: params.assetId,
      asset_name: asset?.asset_name || 'Asset',
      maintenance_type: params.maintenanceType,
      title: params.title,
      description: params.description,
      status: 'SCHEDULED',
      scheduled_date: params.scheduledDate,
      technician_name: params.technicianName,
      vendor_name: params.vendorName,
      cost: params.cost || 0,
      created_at: now,
    };

    const records = this.getRecords();
    records.unshift(newRecord);
    this.setRecords(records);

    hrEventBus.publish('maintenance.scheduled', {
      assetId: params.assetId,
      title: params.title,
      scheduledDate: params.scheduledDate,
    });

    return newRecord;
  }

  completeMaintenance(params: {
    recordId: string;
    performedDate?: string;
    notes?: string;
    cost?: number;
    meterReading?: number;
  }): AssetMaintenanceRecord {
    const records = this.getRecords();
    const idx = records.findIndex(r => r.id === params.recordId);
    if (idx === -1) throw new Error('Maintenance record not found.');

    const now = new Date().toISOString();
    records[idx].status = 'COMPLETED';
    records[idx].performed_date = params.performedDate || now;
    if (params.notes) records[idx].notes = params.notes;
    if (params.cost !== undefined) records[idx].cost = params.cost;
    if (params.meterReading !== undefined) records[idx].meter_reading_at_service = params.meterReading;

    this.setRecords(records);

    // Update Asset Status to AVAILABLE if was UNDER_MAINTENANCE
    const assets = this.getAssets();
    const assetIdx = assets.findIndex(a => a.id === records[idx].asset_id);
    if (assetIdx !== -1 && assets[assetIdx].status === 'UNDER_MAINTENANCE') {
      assets[assetIdx].status = 'AVAILABLE';
      assets[assetIdx].updated_at = now;
      this.setAssets(assets);
    }

    assetAuditService.recordLog({
      assetId: records[idx].asset_id,
      action: 'MAINTENANCE_COMPLETED',
      details: {
        title: records[idx].title,
        cost: records[idx].cost,
        technician: records[idx].technician_name,
      },
    });

    hrEventBus.publish('asset.maintenance_completed', {
      assetId: records[idx].asset_id,
      title: records[idx].title,
    });

    return records[idx];
  }

  getMaintenanceRecords(assetId?: string): AssetMaintenanceRecord[] {
    const records = this.getRecords();
    if (assetId) {
      return records.filter(r => r.asset_id === assetId);
    }
    return records;
  }
}

export const assetMaintenanceService = new AssetMaintenanceService();
