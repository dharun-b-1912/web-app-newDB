// src/features/assets/components/RegisterAssetModal.tsx
// ============================================================================
// Joy PeopleHR — Universal Asset Registration Modal
// Modular, Easy-to-Use: Supports Manufacturing, Factory, PPE, Uniforms, Tools & IT
// Returnable vs Consumable Switch & Deduction / Security Deposit Amount
// ============================================================================

import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { assetService, MODULAR_CATEGORIES } from '../../../services/asset/assetService';
import { AssetCondition } from '../../../types';
import {
  Package,
  Wrench,
  Shield,
  Cpu,
  Laptop,
  Truck,
  Key,
  Layers,
  FileCode,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Calendar,
  RotateCcw,
} from 'lucide-react';

interface RegisterAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RegisterAssetModal: React.FC<RegisterAssetModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast();

  const [categoryCode, setCategoryCode] = useState<string>('TOOLS_HARDWARE');
  const [assetName, setAssetName] = useState<string>('');
  const [assetCode, setAssetCode] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<string>('');
  const [isReturnable, setIsReturnable] = useState<boolean>(true);
  const [deductionAmount, setDeductionAmount] = useState<string>('0');
  const [purchaseCost, setPurchaseCost] = useState<string>('1500');
  const [purchaseDate, setPurchaseDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [condition, setCondition] = useState<AssetCondition>('NEW');
  const [description, setDescription] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim()) {
      showToast('Please enter an asset name or title.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await assetService.createAsset({
        assetName: assetName.trim(),
        categoryCode,
        assetCode: assetCode.trim() || undefined,
        serialNumber: serialNumber.trim() || undefined,
        purchaseCost: Number(purchaseCost) || 0,
        purchaseDate,
        isReturnable,
        deductionAmount: Number(deductionAmount) || 0,
        description: description.trim(),
      });

      showToast(`Asset "${assetName}" registered in inventory successfully!`, 'success');
      onSuccess();
      onClose();
      // Reset form
      setAssetName('');
      setAssetCode('');
      setSerialNumber('');
      setIsReturnable(true);
      setDeductionAmount('0');
      setPurchaseCost('1500');
      setDescription('');
    } catch (err: any) {
      showToast(err.message || 'Failed to register asset in Supabase.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Register Organization Asset" size="lg">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category Selection */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Asset Category & Niche *
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MODULAR_CATEGORIES.map(cat => {
              const isSelected = categoryCode === cat.code;
              return (
                <button
                  type="button"
                  key={cat.code}
                  onClick={() => {
                    setCategoryCode(cat.code);
                    if (cat.code === 'SAFETY_UNIFORMS') {
                      setIsReturnable(false);
                      setDeductionAmount('500');
                    } else if (cat.code === 'TOOLS_HARDWARE') {
                      setIsReturnable(true);
                      setDeductionAmount('1200');
                    } else if (cat.code === 'IT_HARDWARE') {
                      setIsReturnable(true);
                      setDeductionAmount('0');
                    }
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-[#07563D] bg-emerald-50/60 ring-2 ring-[#07563D]/20 shadow-xs'
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className={`text-xs font-bold ${isSelected ? 'text-[#07563D]' : 'text-gray-800'}`}>
                    {cat.name}
                  </span>
                  <span className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">
                    {cat.dbCategory}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Asset Title / Name */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Asset Title / Model Name *
          </label>
          <input
            type="text"
            required
            value={assetName}
            onChange={e => setAssetName(e.target.value)}
            placeholder="e.g. DeWalt 18V Hammer Drill, Factory Uniform Set (L), Dell Latitude 5420, Forklift 2-Ton"
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          />
        </div>

        {/* Asset Code & Serial Identifier */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Asset Code (Auto or Custom)
            </label>
            <input
              type="text"
              value={assetCode}
              onChange={e => setAssetCode(e.target.value)}
              placeholder="e.g. AST-0024 (Leave blank for auto)"
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Serial / Tag / Batch Number
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={e => setSerialNumber(e.target.value)}
              placeholder="e.g. SN-889920 or BATCH-2026-A"
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>
        </div>

        {/* Returnable vs Consumable & Deduction Configuration Card */}
        <div className="p-4 bg-emerald-50/50 border border-emerald-200/80 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-emerald-950 block">Returnable vs Consumable Asset</span>
              <span className="text-[11px] text-emerald-700 block">
                {isReturnable
                  ? 'Returnable item — must be surrendered upon resignation, project end, or role transfer.'
                  : 'Non-Returnable / Consumable — permanently issued (uniform, shoes, personal PPE).'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsReturnable(true)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isReturnable
                    ? 'bg-[#07563D] text-white shadow-xs'
                    : 'bg-white border border-gray-300 text-gray-600'
                }`}
              >
                Returnable
              </button>
              <button
                type="button"
                onClick={() => setIsReturnable(false)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  !isReturnable
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-white border border-gray-300 text-gray-600'
                }`}
              >
                Consumable
              </button>
            </div>
          </div>

          {/* Deduction Amount / Security Deposit */}
          <div className="pt-3 border-t border-emerald-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div>
              <label className="block text-xs font-bold text-emerald-950 uppercase tracking-wider mb-1">
                Default Deduction / Deposit (₹)
              </label>
              <p className="text-[11px] text-emerald-700">
                Amount deducted if damaged/lost or issued as paid gear.
              </p>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-bold">₹</span>
              <input
                type="number"
                min="0"
                value={deductionAmount}
                onChange={e => setDeductionAmount(e.target.value)}
                placeholder="0"
                className="w-full bg-white border border-gray-300 rounded-xl pl-8 pr-3.5 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Purchase Cost & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Purchase Cost (₹)
            </label>
            <input
              type="number"
              min="0"
              value={purchaseCost}
              onChange={e => setPurchaseCost(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              value={purchaseDate}
              onChange={e => setPurchaseDate(e.target.value)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
              Initial Condition
            </label>
            <select
              value={condition}
              onChange={e => setCondition(e.target.value as AssetCondition)}
              className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
            >
              <option value="NEW">Brand New</option>
              <option value="EXCELLENT">Excellent</option>
              <option value="GOOD">Good / Serviceable</option>
              <option value="FAIR">Fair / Functional</option>
            </select>
          </div>
        </div>

        {/* Description / Notes */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
            Description & Specifications (Optional)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Size XL, includes safety goggles and protective gloves, calibration valid until Dec 2026."
            className="w-full bg-white border border-gray-300 rounded-xl px-3.5 py-2 text-xs font-medium text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          />
        </div>

        {/* Modal Actions */}
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
            {isSubmitting ? 'Registering...' : 'Register Asset in Supabase'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
