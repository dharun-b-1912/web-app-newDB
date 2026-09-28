// src/features/clientBilling/components/WageMappingView.tsx
// ============================================================================
// JOY PeopleHR — Wage Component Master & Dynamic Mapping Interface
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  WageComponentMaster,
  WageComponentMapping,
} from '../../../types/clientBilling';
import { WageComponentMappingService } from '../../../services/clientBilling/wageComponentMappingService';
import {
  Sparkles,
  Layers,
  ArrowRight,
  CheckCircle2,
  SlidersHorizontal,
  RefreshCw,
  Plus,
  Info,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface WageMappingViewProps {
  clientId: string;
  contractId: string;
  clientName: string;
  contractName: string;
}

export const WageMappingView: React.FC<WageMappingViewProps> = ({
  clientId,
  contractId,
  clientName,
  contractName,
}) => {
  const [mappings, setMappings] = useState<WageComponentMapping[]>([]);
  const [masterComponents, setMasterComponents] = useState<WageComponentMaster[]>([]);
  const [selectedCompCode, setSelectedCompCode] = useState<string>('BASIC');
  const [sampleValues, setSampleValues] = useState<Record<string, number>>({
    BASIC: 14500,
    DA: 3200,
    HRA: 4100,
    SPL_ALLOW: 1500,
    OT_WAGES: 1254,
    ATT_BONUS: 1000,
    INCENTIVE: 500,
    CANTEEN_REC: 650,
    UNIFORM_REC: 200,
  });

  useEffect(() => {
    const masters = WageComponentMappingService.getMasterComponents();
    setMasterComponents(masters);
    const contractMaps = WageComponentMappingService.getContractMappings(clientId, contractId);
    setMappings(contractMaps);
  }, [clientId, contractId]);

  const handleToggleBillable = (compCode: string, currentVal: boolean) => {
    const updated = WageComponentMappingService.updateMappingRule(clientId, contractId, compCode, {
      is_included_in_billable_basis: !currentVal,
      transformation_rule: !currentVal ? 'INCLUDED_IN_BILLABLE_BASE' : 'SEPARATE_LINE_ITEM',
    });
    setMappings(updated);
  };

  const handleRuleChange = (compCode: string, newRule: any) => {
    const updated = WageComponentMappingService.updateMappingRule(clientId, contractId, compCode, {
      transformation_rule: newRule,
      is_included_in_billable_basis: newRule === 'INCLUDED_IN_BILLABLE_BASE',
    });
    setMappings(updated);
  };

  const simulation = WageComponentMappingService.calculateSimulatedWageBasis(mappings, sampleValues);

  return (
    <div className="space-y-6 select-none">
      {/* Header Summary */}
      <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 p-6 rounded-3xl text-white shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Payroll Source → Invoice Wage Mapping Engine</span>
          </div>
          <h2 className="text-xl font-black mt-1">{clientName}</h2>
          <p className="text-xs text-emerald-200/80">Contract: {contractName}</p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 p-3 px-5 rounded-2xl border border-white/10">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-300 block">Simulated Billable Base</span>
            <span className="text-lg font-black text-white font-mono">₹{simulation.billableWageBasis.toLocaleString('en-IN')}</span>
          </div>
          <div className="border-l border-white/20 pl-3">
            <span className="text-[10px] uppercase font-bold text-teal-300 block">Total Gross Wages</span>
            <span className="text-lg font-black text-white font-mono">₹{simulation.grossEarnings.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Mapping Matrix & Simulation Sandbox */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mapping Matrix Table (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-gray-100">
            <div>
              <h3 className="text-sm font-black text-gray-900">Wage Component Mapping Matrix</h3>
              <p className="text-[11px] text-gray-500">Define how HRMS earnings & recoveries transform into invoice line items</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {mappings.length} Configured Components
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 uppercase text-[10px] font-bold border-b border-gray-200">
                  <th className="py-2.5 px-3">Payroll Source Field</th>
                  <th className="py-2.5 px-3">Transformation Rule</th>
                  <th className="py-2.5 px-3 text-center">In Billable Base?</th>
                  <th className="py-2.5 px-3">Invoice Line Name</th>
                  <th className="py-2.5 px-3 text-right">Sample (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mappings.map((map) => (
                  <tr key={map.component_code} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-3 px-3">
                      <div className="font-bold text-gray-900">{map.component_name}</div>
                      <div className="text-[10px] font-mono text-gray-400">src: {map.source_payroll_field}</div>
                    </td>
                    <td className="py-3 px-3">
                      <select
                        value={map.transformation_rule}
                        onChange={(e) => handleRuleChange(map.component_code, e.target.value)}
                        className="text-[11px] font-semibold bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-600 cursor-pointer"
                      >
                        <option value="INCLUDED_IN_BILLABLE_BASE">Include in Billable Base</option>
                        <option value="SEPARATE_LINE_ITEM">Separate Line Item</option>
                        <option value="DEDUCTED_FROM_INVOICE">Deduct from Invoice</option>
                      </select>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleToggleBillable(map.component_code, map.is_included_in_billable_basis)}
                        className={cn(
                          "px-2.5 py-1 rounded-md text-[10px] font-extrabold cursor-pointer transition-all",
                          map.is_included_in_billable_basis
                            ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        )}
                      >
                        {map.is_included_in_billable_basis ? 'YES (INCLUDED)' : 'NO (EXCLUDED)'}
                      </button>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-medium text-gray-800">{map.destination_invoice_field}</span>
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                      ₹{(sampleValues[map.component_code] ?? map.sample_value ?? 0).toLocaleString('en-IN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Calculation Simulator (1 col) */}
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs space-y-4">
          <div className="pb-2 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-gray-900 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Live Simulation Sandbox</span>
            </h3>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
              Single Associate
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-2xl bg-gray-50 border border-gray-200/80 space-y-2">
              <div className="text-[10px] uppercase font-bold text-gray-400">Billable Wage Breakdown</div>
              {simulation.breakdown.filter((b) => b.isBillable).map((b) => (
                <div key={b.code} className="flex justify-between items-center text-[11px]">
                  <span className="text-gray-700">{b.name}</span>
                  <span className="font-mono font-bold text-emerald-800">₹{b.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
              <div className="pt-2 border-t border-gray-200 flex justify-between font-bold text-gray-900">
                <span>Calculated Wage Basis:</span>
                <span className="font-mono text-emerald-700">₹{simulation.billableWageBasis.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1.5 text-xs text-indigo-900">
              <div className="text-[10px] uppercase font-bold text-indigo-700">Contract Agency Markup (8.5%)</div>
              <div className="flex justify-between font-bold font-mono">
                <span>Service Charge:</span>
                <span>₹{Math.round(simulation.billableWageBasis * 0.085).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 space-y-1.5 text-xs text-emerald-900">
              <div className="text-[10px] uppercase font-bold text-emerald-700">GST Summary (18%)</div>
              <div className="flex justify-between font-bold font-mono">
                <span>Taxable Total:</span>
                <span>₹{(simulation.billableWageBasis + Math.round(simulation.billableWageBasis * 0.085)).toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between font-mono text-[11px] text-emerald-800">
                <span>GST (9% CGST + 9% SGST):</span>
                <span>₹{Math.round((simulation.billableWageBasis + Math.round(simulation.billableWageBasis * 0.085)) * 0.18).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
