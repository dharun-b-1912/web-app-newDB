// src/features/clientBilling/components/BillingRuleBuilderModal.tsx
// ============================================================================
// JOY PeopleHR / JOY Corporate Solutions — Visual Billing Rule Builder
// Fully configurable with 1-click presets for Arjuna Naturals & Indian Contracts
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  BillingRule,
  RuleCalculationMethod,
  ClientContract,
} from '../../../types/clientBilling';
import { ClientMasterService } from '../../../services/clientBilling/clientMasterService';
import {
  Percent,
  Calculator,
  Sparkles,
  SlidersHorizontal,
  X,
  Check,
  Building2,
  HelpCircle,
  Zap,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface BillingRuleBuilderModalProps {
  contract?: ClientContract | null;
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
  const [availableContracts, setAvailableContracts] = useState<ClientContract[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string>(contract?.id || '');

  const [ruleName, setRuleName] = useState('Agency Service Charges @ 8% on Gross');
  const [chargeCategory, setChargeCategory] = useState<BillingRule['charge_category']>('SERVICE_CHARGE');
  const [calcMethod, setCalcMethod] = useState<RuleCalculationMethod>('PERCENTAGE_OF_GROSS');
  const [rateValue, setRateValue] = useState<number>(contract?.default_service_charge_pct || 8.0);
  const [baseField, setBaseField] = useState<
    'GROSS_BILLABLE_WAGES' | 'BASIC_WAGES' | 'TOTAL_EARNINGS' | 'EMPLOYEE_COUNT' | 'PAYABLE_DAYS' | 'OT_HOURS'
  >('GROSS_BILLABLE_WAGES');
  const [isTaxable, setIsTaxable] = useState(true);
  const [effectiveFrom, setEffectiveFrom] = useState('2026-07-01');

  // Simulation Model: 'ARJUNA_ACTUALS' (Gross ₹79,215, Wages ₹52,390, Allowance Days 93) vs 'GENERAL'
  const [simulationModel, setSimulationModel] = useState<'ARJUNA_ACTUALS' | 'GENERAL'>('ARJUNA_ACTUALS');

  useEffect(() => {
    if (isOpen) {
      const allContracts = ClientMasterService.getContracts();
      setAvailableContracts(allContracts);
      if (contract?.id) {
        setSelectedContractId(contract.id);
      } else if (allContracts.length > 0) {
        setSelectedContractId(allContracts[0].id);
      }
    }
  }, [isOpen, contract]);

  if (!isOpen) return null;

  const targetContract = availableContracts.find((c) => c.id === selectedContractId) || contract;

  // Preset quick fill
  const applyPreset = (preset: {
    name: string;
    cat: BillingRule['charge_category'];
    method: RuleCalculationMethod;
    base: 'GROSS_BILLABLE_WAGES' | 'BASIC_WAGES' | 'TOTAL_EARNINGS' | 'EMPLOYEE_COUNT' | 'PAYABLE_DAYS' | 'OT_HOURS';
    rate: number;
    effective: string;
  }) => {
    setRuleName(preset.name);
    setChargeCategory(preset.cat);
    setCalcMethod(preset.method);
    setBaseField(preset.base);
    setRateValue(preset.rate);
    setEffectiveFrom(preset.effective);
  };

  // Simulation calculation
  let computedPreview = 0;
  let formulaText = '';

  if (simulationModel === 'ARJUNA_ACTUALS') {
    const arjunaGross = 79215; // Total Gross Wages
    const arjunaWagesBase = 52390; // Regular Wages Base for PF/ESI
    const arjunaAllowanceDays = 93; // Working Days for Allowance
    const arjunaPayDays = 84.5;
    const arjunaStaff = 23;
    const arjunaOtHours = 346;

    if (calcMethod === 'PERCENTAGE_OF_GROSS') {
      const exact = (arjunaGross * rateValue) / 100;
      computedPreview = Math.round(exact * 100) / 100;
      formulaText = `Total Gross Earnings (₹${arjunaGross.toLocaleString('en-IN')}) × ${rateValue}% = ₹${computedPreview.toFixed(2)} (₹${Math.round(computedPreview).toLocaleString('en-IN')} rounded)`;
    } else if (calcMethod === 'PERCENTAGE_OF_BILLABLE_WAGES') {
      const exact = (arjunaWagesBase * rateValue) / 100;
      computedPreview = Math.round(exact * 100) / 100;
      formulaText = `Regular Wages Base (₹${arjunaWagesBase.toLocaleString('en-IN')}) × ${rateValue}% = ₹${computedPreview.toFixed(2)} (₹${Math.round(computedPreview).toLocaleString('en-IN')} rounded)`;
    } else if (calcMethod === 'PER_DAY') {
      computedPreview = arjunaAllowanceDays * rateValue;
      formulaText = `${arjunaAllowanceDays} Allowance Working Days × ₹${rateValue} = ₹${computedPreview.toLocaleString('en-IN')}`;
    } else if (calcMethod === 'PER_EMPLOYEE') {
      computedPreview = arjunaStaff * rateValue;
      formulaText = `${arjunaStaff} Active Associates × ₹${rateValue} = ₹${computedPreview.toLocaleString('en-IN')}`;
    } else if (calcMethod === 'PER_OT_HOUR') {
      computedPreview = arjunaOtHours * rateValue;
      formulaText = `${arjunaOtHours} Overtime Hours × ₹${rateValue} = ₹${computedPreview.toLocaleString('en-IN')}`;
    } else if (calcMethod === 'FIXED_AMOUNT') {
      computedPreview = rateValue;
      formulaText = `Fixed Monthly Lump Sum = ₹${rateValue.toLocaleString('en-IN')}`;
    }
  } else {
    // General Benchmark Model
    const sampleWageBase = 1250000;
    const sampleEmployees = 50;
    const sampleDays = 1300;
    const sampleOtHours = 400;

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
  }

  const handleSave = () => {
    const newRule: BillingRule = {
      id: `rule-${Date.now()}`,
      tenant_id: targetContract?.tenant_id || 'org-arjuna-natural',
      contract_id: targetContract?.id || 'cnt-arjuna-2026-07',
      client_id: targetContract?.client_id || 'comp-arjuna-01',
      rule_code: `RULE-${chargeCategory.slice(0, 3)}-${Date.now().toString().slice(-4)}`,
      rule_name: ruleName,
      charge_category: chargeCategory,
      calculation_method: calcMethod,
      base_field: baseField,
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
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Target Contract Selector */}
          <div className="bg-emerald-50/70 p-3.5 rounded-xl border border-emerald-200 text-xs space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-emerald-800 block">Target Contract</span>
              <span className="font-mono text-emerald-800 font-bold bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                {targetContract?.contract_number || 'DEFAULT-GLOBAL'}
              </span>
            </div>
            {availableContracts.length > 0 ? (
              <select
                value={selectedContractId}
                onChange={(e) => setSelectedContractId(e.target.value)}
                className="w-full text-xs font-bold text-emerald-950 bg-white border border-emerald-300 rounded-lg p-2 focus:outline-none focus:border-emerald-600"
              >
                {availableContracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.contract_name} ({c.contract_number})
                  </option>
                ))}
              </select>
            ) : (
              <strong className="text-emerald-950 font-bold block">
                {targetContract?.contract_name || 'All Active Contracts / General Rule'}
              </strong>
            )}
          </div>

          {/* Quick-Preset Chips */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600 mb-2">
              <Zap className="w-3.5 h-3.5 text-amber-600" />
              <span>1-Click Presets (ARJUNA NATURALS JULY'26 INVOICE):</span>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    name: 'Service Charges @ 8% on Gross',
                    cat: 'SERVICE_CHARGE',
                    method: 'PERCENTAGE_OF_GROSS',
                    base: 'GROSS_BILLABLE_WAGES',
                    rate: 8.0,
                    effective: '2026-07-01',
                  })
                }
                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-900 font-bold cursor-pointer transition-colors"
              >
                ⚡ Service Charge (8% Gross = ₹6,337)
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    name: 'ADD Room Allowance @ 50',
                    cat: 'ACCOMMODATION',
                    method: 'PER_DAY',
                    base: 'PAYABLE_DAYS',
                    rate: 50.0,
                    effective: '2026-07-01',
                  })
                }
                className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 font-bold cursor-pointer transition-colors"
              >
                🏠 Room Allowance (₹50/d = ₹4,650)
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    name: 'ADD Transport Allowance @ 30',
                    cat: 'TRANSPORT',
                    method: 'PER_DAY',
                    base: 'PAYABLE_DAYS',
                    rate: 30.0,
                    effective: '2026-07-01',
                  })
                }
                className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-900 font-bold cursor-pointer transition-colors"
              >
                🚌 Transport Allowance (₹30/d = ₹2,790)
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    name: 'P.F.Employer Contribution @ 13% Rs. 52390',
                    cat: 'STATUTORY_ADMIN',
                    method: 'PERCENTAGE_OF_BILLABLE_WAGES',
                    base: 'BASIC_WAGES',
                    rate: 13.0,
                    effective: '2026-07-01',
                  })
                }
                className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-900 font-bold cursor-pointer transition-colors"
              >
                🛡️ PF Employer (13% = ₹6,811)
              </button>

              <button
                type="button"
                onClick={() =>
                  applyPreset({
                    name: 'E.S.I Employer Contribution @ 3.25% Rs. 52390',
                    cat: 'STATUTORY_ADMIN',
                    method: 'PERCENTAGE_OF_BILLABLE_WAGES',
                    base: 'BASIC_WAGES',
                    rate: 3.25,
                    effective: '2026-07-01',
                  })
                }
                className="px-2.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-900 font-bold cursor-pointer transition-colors"
              >
                🏥 ESI Employer (3.25% = ₹1,703)
              </button>
            </div>
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
                placeholder="e.g. Service Charges @ 8% on Gross"
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
                <option value="ACCOMMODATION">Accommodation &amp; Living</option>
                <option value="STATUTORY_ADMIN">Statutory Admin Charges</option>
                <option value="CANTEEN">Subsidized Canteen / Meals</option>
                <option value="UNIFORM">Safety Uniform &amp; PPE</option>
                <option value="REIMBURSEMENT">Direct Reimbursement</option>
              </select>
            </div>
          </div>

          {/* Calculation Method */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-2">Calculation Method</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {[
                { id: 'PERCENTAGE_OF_GROSS', label: '% of Gross Wages' },
                { id: 'PERCENTAGE_OF_BILLABLE_WAGES', label: '% of Billable Wages' },
                { id: 'PER_DAY', label: '₹ Per Pay Day' },
                { id: 'PER_EMPLOYEE', label: '₹ Per Active Head' },
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

          {/* Declared Source Base Definition */}
          <div>
            <label className="text-xs font-bold text-gray-700 block mb-1">
              Source Base Definition (Declared Base)
            </label>
            <select
              value={baseField}
              onChange={(e) => setBaseField(e.target.value as any)}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:border-emerald-600 bg-white text-gray-800"
            >
              <option value="GROSS_BILLABLE_WAGES">
                Contract Gross Wages (₹79,215 — Workings!K27: ₹52,390 wages + ₹26,825 OT)
              </option>
              <option value="BASIC_WAGES">
                Regular / Statutory Base (₹52,390 — Workings!G27 for PF @ 13% & ESI @ 3.25%)
              </option>
              <option value="PAYABLE_DAYS">
                Allowance Working Days (93 W Days — Allowance!G27 for Room & Transport)
              </option>
              <option value="OT_HOURS">
                Overtime Hours (346 OT hrs — Workings!I27)
              </option>
              <option value="EMPLOYEE_COUNT">
                Active Headcount (23 Deployed Associates)
              </option>
            </select>
          </div>

          {/* Rate & Effective Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                {calcMethod.startsWith('PERCENTAGE') ? 'Rate Percentage (%)' : 'Amount Value (₹)'}
              </label>
              <input
                type="number"
                step="0.01"
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
          <div className="p-4 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 text-white shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold uppercase text-emerald-400 tracking-wider flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                Live Calculation Simulation
              </span>

              {/* Simulation Basis Switcher */}
              <div className="flex bg-gray-800 border border-gray-700 rounded-lg p-0.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setSimulationModel('ARJUNA_ACTUALS')}
                  className={cn(
                    "px-2 py-0.5 rounded font-bold transition-all cursor-pointer",
                    simulationModel === 'ARJUNA_ACTUALS' ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"
                  )}
                >
                  Arjuna July'26 Actuals
                </button>
                <button
                  type="button"
                  onClick={() => setSimulationModel('GENERAL')}
                  className={cn(
                    "px-2 py-0.5 rounded font-bold transition-all cursor-pointer",
                    simulationModel === 'GENERAL' ? "bg-emerald-600 text-white" : "text-gray-400 hover:text-white"
                  )}
                >
                  Benchmark (12.5L)
                </button>
              </div>
            </div>

            <div className="text-xs text-gray-300 font-mono">{formulaText}</div>

            <div className="flex justify-between items-baseline pt-2 border-t border-gray-700">
              <span className="text-xs text-gray-400">Simulated Charge Result:</span>
              <span className="text-2xl font-black font-mono text-emerald-400">
                ₹{computedPreview.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 cursor-pointer"
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
