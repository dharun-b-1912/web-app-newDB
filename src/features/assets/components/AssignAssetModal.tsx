// src/features/assets/components/AssignAssetModal.tsx
// ============================================================================
// Joy PeopleHR — Employee-Wise Asset Allocation Modal
// Real-time Employee Picker, Returnable Flag, Deduction Amount & Expected Return
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import { assetAssignmentService } from '../../../services/asset/assetAssignmentService';
import { api } from '../../../services/api';
import {
  UniversalAsset,
  AssetCondition,
  Employee,
} from '../../../types';
import { UserCheck, ShieldAlert, Calendar, DollarSign } from 'lucide-react';

interface AssignAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  asset: UniversalAsset | null;
}

export const AssignAssetModal: React.FC<AssignAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  asset,
}) => {
  const { showToast } = useToast();

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [assignedDate, setAssignedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [expectedReturnDate, setExpectedReturnDate] = useState<string>('');
  const [isReturnable, setIsReturnable] = useState<boolean>(true);
  const [deductionAmount, setDeductionAmount] = useState<string>('0');
  const [conditionAtAssign, setConditionAtAssign] = useState<AssetCondition>('GOOD');
  const [purpose, setPurpose] = useState<string>('General Operations Handover');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loadingEmps, setLoadingEmps] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      const fetchEmps = async () => {
        setLoadingEmps(true);
        try {
          const emps = await api.getEmployees();
          const list = Array.isArray(emps) ? emps : [];
          setEmployees(list);
          if (list.length > 0 && !selectedEmpId) {
            setSelectedEmpId(list[0].id);
          }
        } catch {
          setEmployees([]);
        } finally {
          setLoadingEmps(false);
        }
      };
      fetchEmps();

      if (asset) {
        setIsReturnable(asset.is_returnable !== false);
        setDeductionAmount(String(asset.deduction_amount || 0));
        setConditionAtAssign(asset.condition || 'GOOD');
      }
    }
  }, [isOpen, asset]);

  if (!asset) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emp = employees.find(e => e.id === selectedEmpId);
    if (!emp) {
      showToast('Please select a valid employee for assignment.', 'error');
      return;
    }

    const empName = `${emp.first_name} ${emp.last_name || ''}`.trim();

    setIsSubmitting(true);
    try {
      await assetAssignmentService.assignAsset({
        assetId: asset.id,
        employeeId: emp.id,
        employeeName: empName,
        assignedDate,
        expectedReturnDate: expectedReturnDate || undefined,
        isReturnable,
        deductionAmount: Number(deductionAmount) || 0,
        conditionAtAssign,
        purpose,
        notes,
      });

      showToast(`Asset "${asset.asset_name}" assigned to ${empName} successfully!`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to record assignment in Supabase.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Assign Asset: ${asset.asset_name}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Asset Summary Pill */}
        <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs flex items-center justify-between">
          <div>
            <span className="text-gray-400 block font-medium">Asset Code & Category</span>
            <span className="font-extrabold text-gray-900 font-mono">
              {asset.asset_code} • {asset.category || 'HARDWARE'}
            </span>
          </div>
          <Badge variant={asset.is_returnable !== false ? 'emerald' : 'amber'}>
            {asset.is_returnable !== false ? 'Returnable' : 'Consumable'}
          </Badge>
        </div>

        {/* Employee Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Assign To Employee *
          </label>
          <select
            required
            value={selectedEmpId}
            onChange={e => setSelectedEmpId(e.target.value)}
            disabled={loadingEmps}
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          >
            {employees.length === 0 && <option value="">Loading workforce roster...</option>}
            {employees.map(emp => {
              const code = emp.employee_code || (emp as any).employee_id || emp.id.slice(0, 6);
              const name = `${emp.first_name} ${emp.last_name || ''}`.trim();
              const dept = (emp as any).department_name || (emp as any).department || '';
              return (
                <option key={emp.id} value={emp.id}>
                  {code} — {name} {dept ? `(${dept})` : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Returnable Status & Deduction Amount */}
        <div className="p-3.5 bg-emerald-50/50 border border-emerald-200/80 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-950">Returnable Item?</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsReturnable(true)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                  isReturnable ? 'bg-[#07563D] text-white shadow-xs' : 'bg-white border text-gray-600'
                }`}
              >
                Yes (Returnable)
              </button>
              <button
                type="button"
                onClick={() => setIsReturnable(false)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                  !isReturnable ? 'bg-amber-600 text-white shadow-xs' : 'bg-white border text-gray-600'
                }`}
              >
                No (Consumable)
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-emerald-200/50 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-950 block">Deduction / Deposit (₹)</span>
              <span className="text-[10px] text-emerald-700">Deducted if lost, damaged, or paid kit.</span>
            </div>
            <div className="w-32 relative">
              <span className="absolute left-2.5 top-2 text-xs text-gray-400 font-bold">₹</span>
              <input
                type="number"
                min="0"
                value={deductionAmount}
                onChange={e => setDeductionAmount(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg pl-6 pr-2.5 py-1.5 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Issue Date & Expected Return Date */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Issue Date *
            </label>
            <input
              type="date"
              required
              value={assignedDate}
              onChange={e => setAssignedDate(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Expected Return Date
            </label>
            <input
              type="date"
              value={expectedReturnDate}
              onChange={e => setExpectedReturnDate(e.target.value)}
              disabled={!isReturnable}
              placeholder="dd-mm-yyyy"
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden disabled:bg-gray-100 disabled:text-gray-400"
            />
          </div>
        </div>

        {/* Handover Condition & Purpose */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Condition at Issue
            </label>
            <select
              value={conditionAtAssign}
              onChange={e => setConditionAtAssign(e.target.value as AssetCondition)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            >
              <option value="NEW">Brand New</option>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good Condition</option>
              <option value="FAIR">Fair / Functional</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Purpose / Usage
            </label>
            <input
              type="text"
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              placeholder="e.g. Plant Shift, Daily Work"
              className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Assignment Remarks
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="e.g. Handover inspection completed with signed gate pass."
            className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          />
        </div>

        {/* Modal Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            disabled={isSubmitting}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
          >
            {isSubmitting ? 'Assigning...' : 'Confirm Assignment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
