import { AssetTransfer, UniversalAsset } from '../../types';
import { api } from '../api';
import { hrEventBus } from '../hrEventBus';
import { assetAuditService } from './assetAuditService';

function getTargetOrg(orgId?: string): string {
  if (orgId && orgId.trim()) return orgId.trim();
  const activeComp = typeof api !== 'undefined' && api.getActiveCompany ? api.getActiveCompany() : null;
  if (activeComp?.organization_id) return activeComp.organization_id;
  try {
    const user = api.getCurrentUser?.();
    if (user?.organization_id) return user.organization_id;
  } catch (_) {}
  return 'default';
}

class AssetTransferService {
  private getStore(orgId?: string): AssetTransfer[] {
    try {
      const key = `workforce_asset_transfers_${getTargetOrg(orgId)}_v1`;
      const data = localStorage.getItem(key);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private setTransfers(items: AssetTransfer[], orgId?: string): void {
    try {
      const key = `workforce_asset_transfers_${getTargetOrg(orgId)}_v1`;
      localStorage.setItem(key, JSON.stringify(items));
    } catch (e) {
      console.warn('[AssetTransferService] Failed to persist transfers:', e);
    }
  }

  private getAssets(orgId?: string): UniversalAsset[] {
    try {
      const key = `workforce_assets_master_${getTargetOrg(orgId)}_v1`;
      const data = localStorage.getItem(key);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private setAssets(assets: UniversalAsset[], orgId?: string): void {
    try {
      const key = `workforce_assets_master_${getTargetOrg(orgId)}_v1`;
      localStorage.setItem(key, JSON.stringify(assets));
    } catch (e) {
      console.warn('[AssetTransferService] Failed to persist assets:', e);
    }
  }

  requestTransfer(params: {
    assetId: string;
    sourceTargetType: string;
    sourceTargetId: string;
    sourceTargetName: string;
    destinationTargetType: string;
    destinationTargetId: string;
    destinationTargetName: string;
    dispatchNotes?: string;
  }): AssetTransfer {
    const assets = this.getAssets();
    const assetIdx = assets.findIndex(a => a.id === params.assetId);
    if (assetIdx === -1) throw new Error('Asset not found.');

    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();

    const transferId = `ast-trf-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newTransfer: AssetTransfer = {
      id: transferId,
      asset_id: params.assetId,
      source_target_type: params.sourceTargetType,
      source_target_id: params.sourceTargetId,
      source_target_name: params.sourceTargetName,
      destination_target_type: params.destinationTargetType,
      destination_target_id: params.destinationTargetId,
      destination_target_name: params.destinationTargetName,
      status: 'DISPATCHED',
      requested_by: currentUser.name || 'Dharun Joy',
      dispatch_notes: params.dispatchNotes,
      requested_at: now,
    };

    assets[assetIdx].status = 'TRANSFER_PENDING';
    assets[assetIdx].updated_at = now;
    this.setAssets(assets);

    const transfers = this.getStore();
    transfers.unshift(newTransfer);
    this.setTransfers(transfers);

    assetAuditService.recordLog({
      assetId: params.assetId,
      action: 'TRANSFERRED',
      details: {
        from: params.sourceTargetName,
        to: params.destinationTargetName,
        notes: params.dispatchNotes,
      },
    });

    hrEventBus.publish('asset.transferred', {
      assetId: params.assetId,
      from: params.sourceTargetName,
      to: params.destinationTargetName,
    });

    return newTransfer;
  }

  completeTransfer(transferId: string, receiptNotes?: string): AssetTransfer {
    const transfers = this.getStore();
    const trfIdx = transfers.findIndex(t => t.id === transferId);
    if (trfIdx === -1) throw new Error('Transfer record not found.');

    const assets = this.getAssets();
    const assetIdx = assets.findIndex(a => a.id === transfers[trfIdx].asset_id);
    const now = new Date().toISOString();

    transfers[trfIdx].status = 'RECEIVED';
    transfers[trfIdx].receipt_notes = receiptNotes;
    transfers[trfIdx].completed_at = now;
    this.setTransfers(transfers);

    if (assetIdx !== -1) {
      assets[assetIdx].status = 'AVAILABLE';
      assets[assetIdx].custodian_name = transfers[trfIdx].destination_target_name;
      assets[assetIdx].custodian_id = transfers[trfIdx].destination_target_id;
      assets[assetIdx].updated_at = now;
      this.setAssets(assets);
    }

    return transfers[trfIdx];
  }

  getTransfers(assetId?: string): AssetTransfer[] {
    const items = this.getStore();
    if (assetId) {
      return items.filter(t => t.asset_id === assetId);
    }
    return items;
  }
}

export const assetTransferService = new AssetTransferService();
