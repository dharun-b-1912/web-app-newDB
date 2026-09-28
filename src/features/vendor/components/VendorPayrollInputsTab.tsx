// src/features/vendor/components/VendorPayrollInputsTab.tsx
// ============================================================================
// Joy PeopleHR — Configurable Vendor Payroll Rules & Input Management Component
// Versioned formula engine with calculation explanation modal and salary previews
// ============================================================================

import React, { useState } from 'react';
import { DollarSign, Code, Info, Play, Plus, Calculator } from 'lucide-react';
import { VendorPayrollInputService, VendorPayrollRule, WorkerPayrollInputRecord } from '../../../services/vendor/vendorPayrollInputService';

export interface VendorPayrollInputsTabProps {
  vendorId?: string;
  viewMode?: 'COMPANY' | 'VENDOR';
}

export const VendorPayrollInputsTab: React.FC<VendorPayrollInputsTabProps> = ({ vendorId, viewMode }) => {
  const [selectedPeriod, setSelectedPeriod] = useState('2026-09');
  const [activeSubTab, setActiveSubTab] = useState<'records' | 'rules'>('records');

  // Sample Rule evaluation modal state
  const [explanationModalRule, setExplanationModalRule] = useState<VendorPayrollRule | null>(null);

  const [rules] = useState<VendorPayrollRule[]>([
    {
      id: 'rule-01',
      ruleCode: 'OT_2X',
      ruleName: 'Standard Overtime Rate (2.0x)',
      ruleType: 'EARNING',
      formulaExpression: 'hourly_rate * ot_hours * 2.0',
      effectiveFrom: '2026-01-01',
      version: 1,
      isActive: true,
      roundingMode: 'NEAREST',
      description: 'Calculates overtime pay at double the hourly rate as per Code on Wages',
    },
    {
      id: 'rule-02',
      ruleCode: 'NIGHT_ALLOW',
      ruleName: 'Night Shift Allowance',
      ruleType: 'EARNING',
      formulaExpression: 'night_shifts_count * 150',
      effectiveFrom: '2026-01-01',
      version: 1,
      isActive: true,
      roundingMode: 'NEAREST',
      description: '₹150 allowance per night shift worked',
    },
    {
      id: 'rule-03',
      ruleCode: 'CANTEEN_REC',
      ruleName: 'Canteen Recovery',
      ruleType: 'DEDUCTION',
      formulaExpression: 'canteen_days * 40',
      effectiveFrom: '2026-01-01',
      version: 1,
      isActive: true,
      roundingMode: 'NEAREST',
      description: '₹40 per day recovery for subsidized food',
    },
  ]);

  // Zero-mock policy: Monthly payroll inputs start empty and compute dynamically from locked attendance
  const [payrollRecords] = useState<WorkerPayrollInputRecord[]>([]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-5 bg-white rounded-2xl border border-gray-100 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-emerald-600" />
            Configurable Vendor Payroll Inputs & Formula Engine
          </h2>
          <p className="text-sm text-gray-500 mt-1">Manage attendance-linked earnings, overtime, allowances, deductions, and versioned formula rules.</p>
        </div>

        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none"
          />
          <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveSubTab('records')}
              className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'records' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
            >
              Payroll Inputs
            </button>
            <button
              onClick={() => setActiveSubTab('rules')}
              className={`px-3 py-1.5 rounded-lg transition-all ${activeSubTab === 'rules' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'}`}
            >
              Formula Rules ({rules.length})
            </button>
          </div>
        </div>
      </div>

      {activeSubTab === 'records' ? (
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Monthly Payroll Input Records ({selectedPeriod})</h3>
            <span className="text-xs text-gray-500">Source: Attendance-linked calculation engine</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-gray-50/70 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                  <th className="py-3 px-4">Worker</th>
                  <th className="py-3 px-4 text-right">Base Wages</th>
                  <th className="py-3 px-4 text-right">Overtime</th>
                  <th className="py-3 px-4 text-right">Allowances</th>
                  <th className="py-3 px-4 text-right text-emerald-700">Gross Wage</th>
                  <th className="py-3 px-4 text-right text-red-600">Deductions</th>
                  <th className="py-3 px-4 text-right font-bold text-gray-900">Net Payable</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payrollRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-500">
                      <DollarSign className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-50" />
                      <p className="font-semibold text-gray-700">No payroll input records for this cycle</p>
                      <p className="text-xs text-gray-400 mt-1">Records are computed automatically once approved attendance and overtime data are locked.</p>
                    </td>
                  </tr>
                ) : (
                  payrollRecords.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/50">
                      <td className="py-3.5 px-4 font-semibold text-gray-900">{r.workerName}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-gray-700">₹{r.baseWages.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-indigo-600">₹{r.overtimePay.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-gray-600">₹{(r.nightAllowance + r.attendanceBonus + r.otherAllowances).toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-emerald-700">₹{r.totalGross.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono text-red-600">₹{r.totalDeductions.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-gray-900">₹{r.netPayable.toLocaleString()}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {r.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-bold text-gray-900 text-sm">Versioned Payroll Formula Rules</h3>
            <button className="px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm">
              <Plus className="w-3.5 h-3.5" /> Add Formula Rule
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {rules.map((rule) => (
              <div key={rule.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold font-mono ${rule.ruleType === 'EARNING' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                      {rule.ruleType}
                    </span>
                    <h4 className="font-bold text-gray-900 mt-1.5">{rule.ruleName}</h4>
                    <p className="text-xs text-gray-500">{rule.description}</p>
                  </div>
                  <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded">v{rule.version}.0</span>
                </div>

                <div className="bg-gray-900 text-emerald-400 font-mono text-xs p-3 rounded-xl flex items-center justify-between">
                  <span>{rule.formulaExpression}</span>
                  <Code className="w-4 h-4 text-gray-500" />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 pt-1 border-t border-gray-100">
                  <span>Effective: {rule.effectiveFrom}</span>
                  <button
                    onClick={() => setExplanationModalRule(rule)}
                    className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <Calculator className="w-3.5 h-3.5" /> Test & Preview Formula
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formula Explanation Preview Modal */}
      {explanationModalRule && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-indigo-600" /> Test Formula Rule: {explanationModalRule.ruleCode}
              </h3>
              <button onClick={() => setExplanationModalRule(null)} className="text-gray-400 hover:text-gray-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200">
                <div className="text-xs text-gray-500 font-semibold">Formula Expression</div>
                <div className="font-mono text-indigo-700 font-bold mt-0.5">{explanationModalRule.formulaExpression}</div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
                <div className="text-xs font-semibold text-indigo-900">Sample Execution Preview</div>
                <div className="text-xs text-indigo-800">
                  Inputs: <span className="font-mono">hourly_rate = ₹81.25</span>, <span className="font-mono">ot_hours = 10</span>
                </div>
                <div className="font-mono text-sm font-bold text-indigo-950">
                  Result: ₹{VendorPayrollInputService.evaluateRule(explanationModalRule, { hourly_rate: 81.25, ot_hours: 10, canteen_days: 22, night_shifts_count: 3 }).calculatedResult}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button onClick={() => setExplanationModalRule(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold text-gray-700">
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
