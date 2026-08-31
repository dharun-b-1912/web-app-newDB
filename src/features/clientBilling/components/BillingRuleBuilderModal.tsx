// src/features/clientBilling/components/BillingRuleBuilderModal.tsx
// ============================================================================
// JOY PeopleHR / JOY Corporate Solutions — Visual Billing Rule Builder
// ============================================================================

import React, { useState } from 'react';
import {
  BillingRule,
  RuleCalculationMethod,
  ClientContract,
} from '../../../types/clientBilling';
import {
  Percent,
  Calculator,
  Sparkles,
  SlidersHorizontal,
  X,
  Check,
  Building2,
  HelpCircle,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface BillingRuleBuilderModalProps {
  contract: ClientContract;
  isOpen: boolean;
  onClose: () => void;
  onSaveRule: (rule: BillingRule) => void;
}

export const BillingRuleBuilderModal: React.FC<BillingRuleBuilderModalProps> = ({
  contract,
  isOpen,
  onClose,
  onSaveRule,
}) => {
  const [ruleName, setRuleName] = useState('Agency Service Charges');
  const [chargeCategory, setChargeCategory] = useState<BillingRule['charge_category']>('SERVICE_CHARGE');
  const [calcMethod, setCalcMethod] = useState<RuleCalculationMethod>('PERCENTAGE_OF_BILLABLE_WAGES');
  const [rateValue, setRateValue] = useState<number>(contract.default_service_charge_pct || 8.5);
  const [isTaxable, setIsTaxable] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState('2026-04-01');

  if (!isOpen) return null;

  // Live calculation preview based on sample benchmark of ₹12,50,000 gross billable wages with 50 employees
  const sampleWageBase = 1250000;
  const sampleEmployees = 50;
  const sampleDays = 1300;
  const sampleOtHours = 400;

  let computedPreview = 0;
  let formulaText = '';

  if (calcMethod === 'PERCENTAGE_OF_BILLABLE_WAGES') {
    computedPreview = Math.round((sampleWageBase * rateValue) / 100);
    formulaText = `Gross Billable Wages (₹12,50,000) × ${rateValue}%`;
  } else if (calcMethod === 'PERCENTAGE_OF_GROSS') {
    computedPreview = Math.round((sampleWageBase * rateValue) / 100);
    formulaText = `Total Gross Earnings (₹12,50,000) × ${rateValue}%`;
  } else if (calcMethod === 'PER_EMPLOYEE') {
    computedPreview = sampleEmployees * rateValue;
    formulaText = `${sampleEmployees} Active Associates × ₹${rateValue}`;
  } else if (calcMethod === 'PER_DAY') {
    computedPreview = sampleDays * rateValue;
    formulaText = `${sampleDays} Billed Pay Days × ₹${rateValue}`;
  } else if (calcMethod === 'PER_OT_HOUR') {
    computedPreview = sampleOtHours * rateValue;
    formulaText = `${sampleOtHours} Overtime Hours × ₹${rateValue}`;
  } else if (calcMethod === 'FIXED_AMOUNT') {
    computedPreview = rateValue;
    formulaText = `Fixed Monthly Lump Sum: ₹${rateValue}`;
  }

  const handleSave = () => {
    const newRule: BillingRule = {
      id: `rule-${Date.now()}`,
      tenant_id: 'org-joy-01',
      contract_id: contract.id,
      client_id: contract.client_id,
      rule_code: `RULE-${chargeCategory.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
      rule_name: ruleName,
      charge_category: chargeCategory,
      calculation_method: calcMethod,
      rate_value: rateValue,
      is_taxable_under_gst: isTaxable,
      priority: 10,
      effective_from: effectiveFrom,
      is_active: true,
      notes: formulaText,
    };
    onSaveRule(newRule);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-extrabold uppercase text-amber-800 tracking-wider block">
                Rule Engine Studio
              </span>
              <h3 className="font-black text-gray-900 text-base">Visual Contract Billing Rule Builder</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Target Contract */}
          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 text-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Target Contract</span>
              <strong className="text-emerald-950 font-bold">{contract.contract_name}</strong>
            </div>
            <span className="font-mono text-emerald-800 font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-200">
              {contract.contract_number}
            </span>
          </div>

          {/* Rule Title & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Rule Name</label>
              <input
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-emerald-600"
                placeholder="e.g. Agency Service Charge 8%"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Charge Category</label>
              <select
                value={chargeCategory}
                onChange={(e) => setChargeCategory(e.target.value as BillingRule['charge_category'])}
                className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-emerald-600"
              >
                <option value="SERVICE_CHARGE">Service Charge / Management Fee</option>
                <option value="TRANSPORT">Staff Transport Subsidy</option>
                <option value="CANTEEN">Subsidized Canteen / Meals</option>
                <option value="ACCOMMODATION">Accommodation &amp; Living</option>
                <option value="UNIFORM">Safety Uniform &amp; PPE</option>
                <option value="STATUTORY_ADMIN">Statutory Admin Charges</option>
                <option value="REIMBURSEMENT">Direct Reimbursement</option>
              </select>
            </div>
          </div>

          {/* Calculation Method */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">Calculation Method</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { id: 'PERCENTAGE_OF_BILLABLE_WAGES', label: '% of Billable Wages' },
                { id: 'PERCENTAGE_OF_GROSS', label: '% of Gross Wages' },
                { id: 'PER_EMPLOYEE', label: '₹ Per Active Head' },
                { id: 'PER_DAY', label: '₹ Per Pay Day' },
                { id: 'PER_OT_HOUR', label: '₹ Per OT Hour' },
                { id: 'FIXED_AMOUNT', label: 'Fixed Lump Sum' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setCalcMethod(m.id as RuleCalculationMethod)}
                  className={cn(
                    "p-2.5 rounded-xl font-bold border text-left transition-all cursor-pointer",
                    calcMethod === m.id
                      ? "bg-[#07563D] text-white border-[#07563D] shadow-xs"
                      : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                  )}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rate & Effective Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                {calcMethod.startsWith('PERCENTAGE') ? 'Rate Percentage (%)' : 'Amount Value (₹)'}
              </label>
              <input
                type="number"
                step="0.1"
                value={rateValue}
                onChange={(e) => setRateValue(parseFloat(e.target.value) || 0)}
                className="w-full text-xs font-bold font-mono px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">Effective From Date</label>
              <input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="w-full text-xs font-medium px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-emerald-600"
              />
            </div>
          </div>

          {/* Live Dynamic Preview Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-md">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-extrabold uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Live Calculation Simulation
              </span>
              <span className="text-[10px] text-gray-400">Benchmark Model</span>
            </div>

            <div className="text-xs text-gray-300 font-mono mb-2">{formulaText}</div>

            <div className="flex justify-between items-baseline pt-2 border-t border-gray-700">
              <span className="text-xs text-gray-400">Simulated Charge Result:</span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                ₹{computedPreview.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#07563D] hover:bg-[#064833] shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Save Billing Rule</span>
          </button>
        </div>
      </div>
    </div>
  );
};
