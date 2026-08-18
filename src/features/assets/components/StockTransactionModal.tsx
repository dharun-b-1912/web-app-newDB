import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { inventoryService } from '../../../services/asset/inventoryService';
import { InventoryItem, InventoryTransaction } from '../../../types';
import { Package, ArrowDownRight, ArrowUpRight, RotateCcw } from 'lucide-react';

interface StockTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  item: InventoryItem | null;
}

export const StockTransactionModal: React.FC<StockTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  item,
}) => {
  const { showToast } = useToast();

  const [transactionType, setTransactionType] = useState<InventoryTransaction['transaction_type']>('STOCK_IN');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(item?.unit_cost || 0);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  if (!item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) {
      showToast('Quantity must be greater than 0.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      inventoryService.recordTransaction({
        inventoryItemId: item.id,
        transactionType,
        quantity,
        unitCost: unitCost || item.unit_cost,
        notes,
      });

      showToast(`Stock transaction (${transactionType}) processed for ${item.item_name}.`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to record stock transaction.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Inventory Stock Operation: ${item.item_name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs flex items-center justify-between">
          <div>
            <span className="text-gray-400 block font-medium">SKU & Current Available Stock</span>
            <span className="font-extrabold text-gray-900 font-mono">
              {item.sku} • {item.quantity_on_hand} {item.unit_of_measure} on hand
            </span>
          </div>
          <Badge variant={item.is_low_stock ? 'danger' : 'emerald'}>
            {item.is_low_stock ? 'LOW STOCK' : 'IN STOCK'}
          </Badge>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Operation Type *
          </label>
          <select
            value={transactionType}
            onChange={e => setTransactionType(e.target.value as any)}
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          >
            <option value="STOCK_IN">Stock In (Inbound Receipt / Replenishment)</option>
            <option value="STOCK_OUT">Stock Out (Issue to Production / Team)</option>
            <option value="CONSUMPTION">Consumption (Department Usage)</option>
            <option value="DAMAGE">Damaged / Defective Stock Write-off</option>
            <option value="ADJUSTMENT">Physical Audit Stock Adjustment</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Quantity ({item.unit_of_measure}) *
            </label>
            <input
              type="number"
              min={1}
              required
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value) || 0)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Unit Cost (USD)
            </label>
            <input
              type="number"
              min={0}
              value={unitCost}
              onChange={e => setUnitCost(parseFloat(e.target.value) || 0)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Reference / PO / Reason Notes
          </label>
          <input
            type="text"
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. PO-8920 Inbound shipment or Weekly floor consumption"
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold"
          >
            {isSubmitting ? 'Processing...' : 'Record Transaction'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
