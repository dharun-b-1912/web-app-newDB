// src/features/clientBilling/components/BillingRunStepper.tsx
// ============================================================================
// JOY PeopleHR / JOY Corporate Solutions — 4-Step Executive Calculation Stepper
// ============================================================================

import React, { useState } from 'react';
import {
  BillingRun,
  BillingEmployeeResult,
  CalculationExplainerItem,
} from '../../../types/clientBilling';
import {
  Users,
  ShieldCheck,
  Percent,
  Receipt,
  HelpCircle,
  X,
  FileSpreadsheet,
  ArrowRight,
  TrendingUp,
  MinusCircle,
  Building2,
  Clock,
  Briefcase,
  Search,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface BillingRunStepperProps {
  run: BillingRun;
  onOpenAudit: () => void;
  onOpenInvoice: () => void;
  onRecalculate: () => void;
}

export const BillingRunStepper: React.FC<BillingRunStepperProps> = ({
  run,
  onOpenAudit,
  onOpenInvoice,
  onRecalculate,
}) => {
  const [activeExplainer, setActiveExplainer] = useState<CalculationExplainerItem | null>(null);
  const [drilldownCategory, setDrilldownCategory] = useState<'ALL' | 'WAGES' | 'PF' | 'ESI' | 'CANTEEN' | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);

  const filteredEmployees = run.employee_results.filter((emp) => {
    const q = searchTerm.toLowerCase();
    return (
      emp.employee_name.toLowerCase().includes(q) ||
      emp.employee_code.toLowerCase().includes(q) ||
      emp.designation.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* 4-Step Executive Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* STEP 1: EMPLOYEE PAYROLL */}
        <div
          onClick={() => setDrilldownCategory('WAGES')}
          className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-2xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-8 -mt-8 opacity-60 pointer-events-none group-hover:scale-110 transition-all" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
              STEP 1 • PAYROLL BASE
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveExplainer(run.explainability?.gross_earnings_explainer);
              }}
              className="text-gray-400 hover:text-emerald-700 transition-colors p-1"
              title="Explain Calculation"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <Users className="w-5 h-5 text-emerald-600" />
            <h3 className="font-bold text-gray-900 text-sm">Employee Direct Wages</h3>
          </div>

          <div className="mt-3 space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Deployed Associates:</span>
              <span className="font-bold text-gray-900">{run.active_employee_count} staff</span>
            </div>
            <div className="flex justify-between">
              <span>Total Paid Days:</span>
              <span className="font-bold text-gray-900">{run.total_payable_days} days</span>
            </div>
            <div className="flex justify-between">
              <span>Gross Billable Wages:</span>
              <span className="font-mono font-bold text-emerald-800 text-sm">{formatINR(run.total_gross_billable_wages)}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-semibold text-emerald-700 group-hover:text-emerald-800">
            <span>View {run.active_employee_count} Employee Breakdown</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* STEP 2: STATUTORY COST */}
        <div
          onClick={() => setDrilldownCategory('PF')}
          className="bg-white rounded-2xl p-5 border border-indigo-100 shadow-2xs hover:shadow-md hover:border-indigo-300 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full -mr-8 -mt-8 opacity-60 pointer-events-none group-hover:scale-110 transition-all" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full">
              STEP 2 • STATUTORY COST
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveExplainer(run.explainability?.employer_pf_explainer);
              }}
              className="text-gray-400 hover:text-indigo-700 transition-colors p-1"
              title="Explain Calculation"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-gray-900 text-sm">Employer Contributions</h3>
          </div>

          <div className="mt-3 space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Employer PF (13.0%):</span>
              <span className="font-mono font-bold text-gray-900">{formatINR(run.total_employer_pf)}</span>
            </div>
            <div className="flex justify-between">
              <span>Employer ESI (3.25%):</span>
              <span className="font-mono font-bold text-gray-900">{formatINR(run.total_employer_esi)}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Statutory Pass-Through:</span>
              <span className="font-mono font-bold text-indigo-800 text-sm">{formatINR(run.total_employer_statutory)}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-semibold text-indigo-700 group-hover:text-indigo-800">
            <span>Inspect PF/ESI Compliance</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* STEP 3: CONTRACT CHARGES */}
        <div
          onClick={() => setActiveExplainer(run.explainability?.service_charge_explainer)}
          className="bg-white rounded-2xl p-5 border border-amber-100 shadow-2xs hover:shadow-md hover:border-amber-300 transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-8 -mt-8 opacity-60 pointer-events-none group-hover:scale-110 transition-all" />
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
              STEP 3 • CONTRACT CHARGES
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setActiveExplainer(run.explainability?.service_charge_explainer);
              }}
              className="text-gray-400 hover:text-amber-700 transition-colors p-1"
              title="Explain Calculation"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 mb-1">
            <Percent className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-gray-900 text-sm">Service &amp; Ops Charges</h3>
          </div>

          <div className="mt-3 space-y-1.5 text-xs text-gray-600">
            <div className="flex justify-between">
              <span>Service Charge:</span>
              <span className="font-mono font-bold text-gray-900">{formatINR(run.total_service_charges)}</span>
            </div>
            <div className="flex justify-between">
              <span>Staff Transport:</span>
              <span className="font-mono font-bold text-gray-900">{formatINR(run.total_transport_charges)}</span>
            </div>
            <div className="flex justify-between">
              <span>Canteen Recovery:</span>
              <span className="font-mono font-bold text-rose-600">-{formatINR(run.total_canteen_recoveries)}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] font-semibold text-amber-700 group-hover:text-amber-800">
            <span>View Contract Formulas</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* STEP 4: TAX & GRAND TOTAL */}
        <div
          onClick={onOpenInvoice}
          className="bg-gradient-to-br from-[#07563D] to-[#043828] text-white rounded-2xl p-5 shadow-md hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300 bg-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-xs">
              STEP 4 • GST &amp; GRAND TOTAL
            </span>
            <Receipt className="w-4 h-4 text-emerald-200" />
          </div>

          <div className="mb-1">
            <span className="text-[11px] uppercase font-bold text-emerald-200 block">Final Payable Invoice</span>
            <h3 className="font-black text-2xl font-mono tracking-tight text-white mt-1">
              {formatINR(run.tax_summary?.grand_total || 0)}
            </h3>
          </div>

          <div className="mt-3 space-y-1 text-xs text-emerald-100/90 border-t border-white/15 pt-2">
            <div className="flex justify-between">
              <span>Taxable Value:</span>
              <span className="font-mono font-bold">{formatINR(run.taxable_amount)}</span>
            </div>
            <div className="flex justify-between">
              <span>GST ({run.tax_summary.supply_type === 'INTRASTATE' ? '9%+9%' : '18%'}):</span>
              <span className="font-mono font-bold">{formatINR(run.tax_summary.total_tax_amount)}</span>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-[11px] font-bold text-emerald-300 group-hover:text-white transition-colors">
            <span>Preview &amp; Export Invoice</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-gray-900 text-sm">{run.client_name}</h4>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                {run.status}
              </span>
            </div>
            <p className="text-xs text-gray-500">
              Contract: <span className="font-semibold text-gray-700">{run.contract_name}</span> ({run.contract_number}) • Period: <span className="font-semibold text-gray-700">{run.period}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            onClick={onRecalculate}
            disabled={run.status === 'APPROVED'}
            className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-all cursor-pointer disabled:opacity-50"
          >
            🔄 Recalculate
          </button>

          <button
            onClick={onOpenAudit}
            className="px-4 py-2 rounded-xl text-xs font-bold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            <span>Run Billing Audit</span>
          </button>

          <button
            onClick={onOpenInvoice}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#07563D] hover:bg-[#064833] shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>{run.status === 'APPROVED' ? 'View Invoice' : 'Generate & Approve Invoice'}</span>
          </button>
        </div>
      </div>

      {/* "How Was This Calculated?" Side Drawer Modal */}
      {activeExplainer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-md bg-white h-full shadow-2xl p-6 flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
                    <HelpCircle className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-sm">Calculation Explainability</h3>
                    <span className="text-[11px] text-gray-500">Transparent Formula Trace</span>
                  </div>
                </div>
                <button
                  onClick={() => setActiveExplainer(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-5 space-y-5">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block mb-1">
                    Metric Title
                  </label>
                  <h4 className="text-base font-black text-[#07563D]">{activeExplainer.title}</h4>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200/80">
                  <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block mb-1.5">
                    Logical Formula
                  </label>
                  <code className="text-xs font-mono font-bold text-gray-800 block bg-white p-2.5 rounded-lg border border-gray-200">
                    {activeExplainer.formula}
                  </code>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-gray-400 tracking-wider block mb-2">
                    Evaluation Inputs
                  </label>
                  <div className="space-y-2">
                    {activeExplainer.inputs.map((inp, i) => (
                      <div key={i} className="flex justify-between items-center text-xs p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                        <span className="text-gray-600 font-medium">{inp.label}</span>
                        <span className="font-mono font-bold text-gray-900">{inp.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                  <label className="text-[10px] font-extrabold uppercase text-emerald-700 tracking-wider block mb-1">
                    Calculated Result
                  </label>
                  <div className="text-xl font-black font-mono text-emerald-900">{activeExplainer.result}</div>
                  {activeExplainer.notes && (
                    <p className="text-xs text-emerald-800 mt-2 leading-relaxed">{activeExplainer.notes}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100">
              <button
                onClick={() => setActiveExplainer(null)}
                className="w-full py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-black transition-colors"
              >
                Close Trace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee-Level Drill-down Modal */}
      {drilldownCategory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Employee-Level Line Item Breakdown ({run.active_employee_count} Associates)
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Client: <span className="font-semibold text-gray-700">{run.client_name}</span> • Period:{' '}
                  <span className="font-semibold text-gray-700">{run.period}</span>
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search associate..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3 py-1.5 text-xs rounded-xl border border-gray-300 focus:outline-none focus:border-emerald-600 w-48"
                  />
                </div>
                <button
                  onClick={() => setDrilldownCategory(null)}
                  className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-y-auto p-6">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] bg-gray-50">
                    <th className="py-2.5 px-3">Emp Code</th>
                    <th className="py-2.5 px-3">Associate Name</th>
                    <th className="py-2.5 px-3">Wage Type</th>
                    <th className="py-2.5 px-3 text-right">Pay Days</th>
                    <th className="py-2.5 px-3 text-right">OT Hrs</th>
                    <th className="py-2.5 px-3 text-right">Basic</th>
                    <th className="py-2.5 px-3 text-right">Gross Wages</th>
                    <th className="py-2.5 px-3 text-right">Employer PF</th>
                    <th className="py-2.5 px-3 text-right">Employer ESI</th>
                    <th className="py-2.5 px-3 text-right font-black text-emerald-800">Total Billed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredEmployees.map((emp) => (
                    <tr key={emp.employee_id} className="hover:bg-emerald-50/40 transition-colors">
                      <td className="py-2 px-3 font-mono font-semibold text-gray-700">{emp.employee_code}</td>
                      <td className="py-2 px-3">
                        <div className="font-bold text-gray-900">{emp.employee_name}</div>
                        <div className="text-[10px] text-gray-400">{emp.designation}</div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 font-medium text-gray-600">
                          {emp.deployment_wage_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-mono">{emp.payable_days}</td>
                      <td className="py-2 px-3 text-right font-mono">{emp.ot_hours}</td>
                      <td className="py-2 px-3 text-right font-mono font-medium">{formatINR(emp.basic_earned)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">{formatINR(emp.gross_billable_wages)}</td>
                      <td className="py-2 px-3 text-right font-mono text-indigo-700">{formatINR(emp.total_employer_pf_cost)}</td>
                      <td className="py-2 px-3 text-right font-mono text-indigo-700">{formatINR(emp.employer_esi_3_25)}</td>
                      <td className="py-2 px-3 text-right font-mono font-black text-emerald-900">{formatINR(emp.employee_total_billing)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-900 bg-gray-50 font-black text-gray-900">
                    <td colSpan={3} className="py-3 px-3">
                      TOTALS ({filteredEmployees.length} ASSOCIATES)
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {filteredEmployees.reduce((s, e) => s + e.payable_days, 0)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {filteredEmployees.reduce((s, e) => s + e.ot_hours, 0)}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {formatINR(filteredEmployees.reduce((s, e) => s + e.basic_earned, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono">
                      {formatINR(filteredEmployees.reduce((s, e) => s + e.gross_billable_wages, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-indigo-800">
                      {formatINR(filteredEmployees.reduce((s, e) => s + e.total_employer_pf_cost, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-indigo-800">
                      {formatINR(filteredEmployees.reduce((s, e) => s + e.employer_esi_3_25, 0))}
                    </td>
                    <td className="py-3 px-3 text-right font-mono text-emerald-950">
                      {formatINR(filteredEmployees.reduce((s, e) => s + e.employee_total_billing, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center">
              <span className="text-xs text-gray-500 font-medium">
                Click any calculation card in the stepper for immediate formula trace.
              </span>
              <button
                onClick={() => setDrilldownCategory(null)}
                className="px-5 py-2 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-black transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
