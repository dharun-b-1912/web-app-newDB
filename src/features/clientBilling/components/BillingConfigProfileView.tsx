// src/features/clientBilling/components/BillingConfigProfileView.tsx
// ============================================================================
// JOY PeopleHR — Billing Configuration Profiles & Charge Category Engine
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  ClientContract,
  ChargeCategoryMaster,
  BillingRule,
} from '../../../types/clientBilling';
import { ChargeCategoryService } from '../../../services/clientBilling/chargeCategoryService';
import { ClientMasterService } from '../../../services/clientBilling/clientMasterService';
import {
  SlidersHorizontal,
  Plus,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Percent,
  Coins,
  History,
  Lock,
  Trash2,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface BillingConfigProfileViewProps {
  contract: ClientContract;
  clientName: string;
  onOpenRuleBuilder: () => void;
}

export const BillingConfigProfileView: React.FC<BillingConfigProfileViewProps> = ({
  contract,
  clientName,
  onOpenRuleBuilder,
}) => {
  const [categories, setCategories] = useState<ChargeCategoryMaster[]>([]);
  const [activeCategory, setActiveCategory] = useState<ChargeCategoryMaster | null>(null);
  const [rules, setRules] = useState<BillingRule[]>([]);

  const loadRules = () => {
    const list = ClientMasterService.getBillingRules(contract.id);
    setRules(list);
  };

  useEffect(() => {
    const list = ChargeCategoryService.getMasterCategories();
    setCategories(list);
    if (list.length > 0) {
      setActiveCategory(list[0]);
    }
    loadRules();
  }, [contract.id]);

  const handleDeleteRule = (ruleId: string) => {
    ClientMasterService.deleteBillingRule(ruleId);
    loadRules();
  };

  return (
    <div className="space-y-6 select-none">
      {/* Configuration Header Card */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 rounded-3xl text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Master Billing Configuration Profile &amp; Rules</span>
          </div>
          <h2 className="text-xl font-black mt-1">{contract.contract_name}</h2>
          <p className="text-xs text-emerald-200/80">
            Client: {clientName} • Number: <span className="font-mono">{contract.contract_number}</span>
          </p>
        </div>

        <button
          onClick={onOpenRuleBuilder}
          className="px-4 py-2 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 font-bold text-xs shadow-md flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
        >
          <Plus className="w-4 h-4 text-emerald-700" />
          <span>+ Add Charge Category / Rule</span>
        </button>
      </div>

      {/* Contract Core Profile Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-3xl bg-white border border-gray-200 shadow-2xs space-y-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Salary Divisor Type</span>
          <div className="text-sm font-black text-gray-900">{contract.salary_divisor_type}</div>
          <p className="text-[11px] text-gray-500">Working days divisor basis</p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-gray-200 shadow-2xs space-y-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Default Service Charge</span>
          <div className="text-sm font-black text-emerald-700 font-mono">{contract.default_service_charge_pct}%</div>
          <p className="text-[11px] text-gray-500">% of gross billable wages</p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-gray-200 shadow-2xs space-y-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Transport Rate</span>
          <div className="text-sm font-black text-indigo-700 font-mono">₹{contract.transport_rate_per_employee}/head</div>
          <p className="text-[11px] text-gray-500">Per active deployed associate</p>
        </div>

        <div className="p-4 rounded-3xl bg-white border border-gray-200 shadow-2xs space-y-1.5">
          <span className="text-[10px] font-bold text-gray-400 uppercase">Canteen Amenity Rate</span>
          <div className="text-sm font-black text-teal-700 font-mono">₹{contract.canteen_rate_per_employee}/head</div>
          <p className="text-[11px] text-gray-500">Subsidized monthly meal rate</p>
        </div>
      </div>

      {/* Active Contract Rules */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-black text-gray-900">Active Contract Billing Rules</h3>
            <p className="text-[11px] text-gray-500">Live rules evaluated during monthly invoice calculations</p>
          </div>
          <button
            onClick={onOpenRuleBuilder}
            className="px-3 py-1.5 rounded-xl bg-[#07563D] text-white text-xs font-bold hover:bg-[#064833] inline-flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Rule</span>
          </button>
        </div>

        {rules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rules.map((rule) => {
              const isPct = rule.calculation_method.startsWith('PERCENTAGE');
              return (
                <div
                  key={rule.id}
                  className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 space-y-2 text-xs relative group hover:border-emerald-400 transition-all shadow-2xs"
                >
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-bold text-gray-900 text-xs leading-snug">{rule.rule_name}</h4>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                      {rule.charge_category}
                    </span>
                  </div>
                  <div className="space-y-1 text-gray-600 text-[11px]">
                    <div className="flex justify-between">
                      <span>Method:</span>
                      <span className="font-semibold text-gray-800">{rule.calculation_method.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="flex justify-between font-mono">
                      <span>Rate:</span>
                      <span className="font-bold text-emerald-800">
                        {isPct ? `${rule.rate_value}%` : `₹${rule.rate_value}`}
                      </span>
                    </div>
                    {rule.notes && (
                      <p className="text-[10px] text-gray-500 font-mono pt-1 border-t border-emerald-100/60 leading-tight">
                        {rule.notes}
                      </p>
                    )}
                  </div>
                  <div className="pt-2 flex justify-end">
                    <button
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-gray-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                      title="Delete Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300 space-y-2">
            <p className="font-bold text-gray-700 text-xs">No Dynamic Billing Rules Configured</p>
            <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
              Click "+ Add Rule" to configure service charges, PF/ESI pass-throughs, or allowances.
            </p>
            <button
              onClick={onOpenRuleBuilder}
              className="px-3 py-1.5 rounded-xl bg-[#07563D] text-white text-xs font-bold hover:bg-[#064833] inline-flex items-center gap-1.5 cursor-pointer mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Rule</span>
            </button>
          </div>
        )}
      </div>

      {/* Charge Category Master Catalog */}
      <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-gray-100">
          <div>
            <h3 className="text-sm font-black text-gray-900">Configurable Charge Category Master</h3>
            <p className="text-[11px] text-gray-500">Manage calculation methodologies, rates, and tax classifications</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-800">
            {categories.length} Registered Categories
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div
              key={cat.id}
              className="p-4 rounded-2xl border border-gray-200 hover:border-emerald-500 transition-all space-y-2.5 text-xs bg-gray-50/50"
            >
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-900 text-xs">{cat.category_name}</h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  {cat.charge_type.replace(/_/g, ' ')}
                </span>
              </div>

              <div className="space-y-1 text-gray-600 text-[11px]">
                <div className="flex justify-between font-mono">
                  <span>Default Rate:</span>
                  <span className="font-bold text-gray-900">
                    {cat.charge_type.startsWith('PERCENTAGE') ? `${cat.default_rate}%` : `₹${cat.default_rate}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Tax Treatment:</span>
                  <span className="font-bold text-gray-800">{cat.tax_treatment}</span>
                </div>
                <p className="text-[10px] text-gray-400 pt-1 leading-relaxed">{cat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
