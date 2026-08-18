import { InventoryItem, InventoryTransaction } from '../../types';
import { api } from '../api';
import { hrEventBus } from '../hrEventBus';
import { assetAuditService } from './assetAuditService';

const INVENTORY_ITEMS_KEY = 'workforce_inventory_items_v1';
const INVENTORY_TX_KEY = 'workforce_inventory_transactions_v1';

class InventoryService {
  private getItems(): InventoryItem[] {
    try {
      const data = localStorage.getItem(INVENTORY_ITEMS_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private setItems(items: InventoryItem[]): void {
    try {
      localStorage.setItem(INVENTORY_ITEMS_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('[InventoryService] Failed to persist inventory items:', e);
    }
  }

  private getTxStore(): InventoryTransaction[] {
    try {
      const data = localStorage.getItem(INVENTORY_TX_KEY);
      if (!data) return [];
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  private setTransactions(txs: InventoryTransaction[]): void {
    try {
      localStorage.setItem(INVENTORY_TX_KEY, JSON.stringify(txs));
    } catch (e) {
      console.warn('[InventoryService] Failed to persist inventory transactions:', e);
    }
  }

  createInventoryItem(params: {
    categoryCode: string;
    sku: string;
    itemName: string;
    description?: string;
    unitOfMeasure?: string;
    initialStock?: number;
    reorderLevel?: number;
    maxStockLevel?: number;
    unitCost?: number;
    preferredVendorId?: string;
  }): InventoryItem {
    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();
    const initialQty = params.initialStock || 0;

    const newItem: InventoryItem = {
      id: `inv-itm-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      tenant_id: currentUser.organization_id || 'org-joy-01',
      category_code: params.categoryCode || 'CONSUMABLES',
      sku: params.sku.toUpperCase(),
      item_name: params.itemName,
      description: params.description,
      unit_of_measure: params.unitOfMeasure || 'PCS',
      quantity_on_hand: initialQty,
      quantity_reserved: 0,
      quantity_damaged: 0,
      reorder_level: params.reorderLevel !== undefined ? params.reorderLevel : 10,
      max_stock_level: params.maxStockLevel || 100,
      unit_cost: params.unitCost || 0,
      preferred_vendor_id: params.preferredVendorId,
      is_low_stock: initialQty <= (params.reorderLevel || 10),
      created_at: now,
      updated_at: now,
    };

    const items = this.getItems();
    items.unshift(newItem);
    this.setItems(items);

    if (initialQty > 0) {
      this.recordTransaction({
        inventoryItemId: newItem.id,
        transactionType: 'STOCK_IN',
        quantity: initialQty,
        balanceAfter: initialQty,
        unitCost: newItem.unit_cost,
        notes: 'Initial opening stock ingestion',
      });
    }

    return newItem;
  }

  recordTransaction(params: {
    inventoryItemId: string;
    transactionType: InventoryTransaction['transaction_type'];
    quantity: number;
    balanceAfter?: number;
    unitCost?: number;
    referenceId?: string;
    notes?: string;
  }): InventoryTransaction {
    const items = this.getItems();
    const itemIdx = items.findIndex(i => i.id === params.inventoryItemId);
    if (itemIdx === -1) throw new Error('Inventory item not found.');

    const currentUser = api.getCurrentUser();
    const now = new Date().toISOString();

    let newBalance = items[itemIdx].quantity_on_hand;
    if (params.transactionType === 'STOCK_IN' || params.transactionType === 'RETURN') {
      newBalance += params.quantity;
    } else if (params.transactionType === 'STOCK_OUT' || params.transactionType === 'CONSUMPTION') {
      newBalance = Math.max(0, newBalance - params.quantity);
    } else if (params.transactionType === 'DAMAGE') {
      items[itemIdx].quantity_damaged += params.quantity;
      newBalance = Math.max(0, newBalance - params.quantity);
    } else if (params.transactionType === 'ADJUSTMENT') {
      newBalance = params.quantity;
    }

    items[itemIdx].quantity_on_hand = newBalance;
    const available = newBalance - items[itemIdx].quantity_reserved - items[itemIdx].quantity_damaged;
    items[itemIdx].is_low_stock = available <= items[itemIdx].reorder_level;
    items[itemIdx].updated_at = now;
    this.setItems(items);

    const tx: InventoryTransaction = {
      id: `inv-tx-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      inventory_item_id: params.inventoryItemId,
      transaction_type: params.transactionType,
      quantity: params.quantity,
      balance_after: newBalance,
      unit_cost: params.unitCost || items[itemIdx].unit_cost,
      reference_id: params.referenceId,
      actor_id: currentUser.id || (currentUser as any).employee_id || 'user-admin-01',
      actor_name: currentUser.name || 'Dharun Joy',
      notes: params.notes,
      created_at: now,
    };

    const txs = this.getTxStore();
    txs.unshift(tx);
    this.setTransactions(txs);

    if (items[itemIdx].is_low_stock) {
      hrEventBus.publish('inventory.low_stock', {
        sku: items[itemIdx].sku,
        itemName: items[itemIdx].item_name,
        available,
        reorderLevel: items[itemIdx].reorder_level,
      });
    }

    return tx;
  }

  getInventoryItems(categoryCode?: string): InventoryItem[] {
    const items = this.getItems();
    return items.filter(i => (categoryCode && categoryCode !== 'ALL' ? i.category_code === categoryCode : true));
  }

  getTransactions(itemId?: string): InventoryTransaction[] {
    const txs = this.getTxStore();
    if (itemId) {
      return txs.filter(t => t.inventory_item_id === itemId);
    }
    return txs;
  }
}

export const inventoryService = new InventoryService();
