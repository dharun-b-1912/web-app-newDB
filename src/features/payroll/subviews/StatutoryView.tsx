import React, { useState } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { StatutoryConfig } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ShieldCheck, Building, Percent, FileCode, CheckCircle, Download, FileSpreadsheet } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';

interface StatutoryViewProps {
  initialSubTab?: string;
}

export const StatutoryView: React.FC<StatutoryViewProps> = ({ initialSubTab }) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'pf');
  const [config, setConfig] = useState<StatutoryConfig>(() => payrollApi.getStatutoryConfig());

  const subTabs = [
    { id: 'pf', label: 'EPF / PF Rules', icon: ShieldCheck },
    { id: 'esi', label: 'ESIC Medical Rules', icon: Building },
    { id: 'pt', label: 'Professional Tax (PT)', icon: Percent },
    { id: 'tds', label: 'TDS Income Tax Slabs', icon: FileCode },
  ];

  const handleSave = () => {
    payrollApi.saveStatutoryConfig(config);
    showToast('✓ Statutory compliance configuration saved successfully.');
  };

  return (
    <div className="space-y-6">
      {/* Subnav Ribbon */}
      <div className="bg-white p-2.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {subTabs.map(t => {
            const Icon = t.icon;
            const isActive = subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                className={cn(
                  "px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer",
                  isActive ? "bg-[#07563D] text-white shadow-2xs" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <Button size="sm" variant="primary" onClick={handleSave} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs">
          Save Rule Changes
        </Button>
      </div>

      {/* 1. EPF Subtab */}
      {subTab === 'pf' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Employees' Provident Fund (EPF) Rules</h3>
              <p className="text-xs text-gray-500">Statutory rate compliance governed by EPFO (12% Basic Wage Deduction)</p>
            </div>
            <Badge variant="emerald">EPFO Compliant (12%)</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Employee Contribution</span>
              <span className="text-lg font-black text-gray-900 block font-mono">{config.pf_employee_percent}% of Basic</span>
              <span className="text-gray-500 text-[11px] block">Deducted directly from monthly gross</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Employer Contribution</span>
              <span className="text-lg font-black text-gray-900 block font-mono">{config.pf_employer_percent}% of Basic</span>
              <span className="text-gray-500 text-[11px] block">3.67% EPF + 8.33% EPS Pension Fund</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Statutory Wage Ceiling</span>
              <span className="text-lg font-black text-gray-900 block font-mono">₹ {config.pf_wage_ceiling.toLocaleString('en-IN')} / mo</span>
              <span className="text-gray-500 text-[11px] block">Max statutory threshold for basic wage</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. ESIC Subtab */}
      {subTab === 'esi' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Employees' State Insurance (ESIC) Rules</h3>
              <p className="text-xs text-gray-500">Medical insurance scheme applicable for employees with Gross &le; ₹ 21,000/mo</p>
            </div>
            <Badge variant="emerald">ESIC Active</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Employee Share</span>
              <span className="text-lg font-black text-gray-900 block font-mono">{config.esi_employee_percent}% of Gross</span>
              <span className="text-gray-500 text-[11px] block">Deducted from gross salary</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Employer Share</span>
              <span className="text-lg font-black text-gray-900 block font-mono">{config.esi_employer_percent}% of Gross</span>
              <span className="text-gray-500 text-[11px] block">Paid by employer to ESIC corp</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Wage Limit Threshold</span>
              <span className="text-lg font-black text-gray-900 block font-mono">₹ {config.esi_wage_ceiling.toLocaleString('en-IN')} / mo</span>
              <span className="text-gray-500 text-[11px] block">Exempt if Gross &gt; ₹ 21,000</span>
            </div>
          </div>
        </div>
      )}

      {/* 3. Professional Tax Subtab — Tamil Nadu Jurisdictions */}
      {subTab === 'pt' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Tamil Nadu Professional Tax (PT) Matrix</h3>
                <Badge variant="emerald">Local Authority Aware</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Governed by Tamil Nadu Municipal Laws. Evaluated on Half-Yearly Gross Earnings (Period I: Apr-Sep & Period II: Oct-Mar).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium">Default Monthly Deduction:</span>
              <span className="text-sm font-bold font-mono text-[#07563D] bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100">
                ₹{config.pt_monthly_slab}/mo
              </span>
            </div>
          </div>

          {/* Jurisdictional Table */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-gray-700 uppercase tracking-wide">
              Applicable Corporation & Municipality Slabs (FY 2026-27)
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {payrollApi.getTamilNaduPTSlabs().map(juris => (
                <div key={juris.id} className="p-4 rounded-2xl border border-gray-200/80 bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-900 block">{juris.jurisdiction_name}</span>
                      <span className="text-[10px] text-gray-500 font-medium">{juris.local_authority_type} • {juris.half_year_period}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                      Active
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-white text-gray-600 font-semibold border-b border-gray-200">
                        <tr>
                          <th className="p-1.5">Half-Yearly Gross Salary</th>
                          <th className="p-1.5">Half-Year Tax</th>
                          <th className="p-1.5 text-right">Monthly Deduction</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-mono">
                        {juris.slabs.map((slab, sIdx) => (
                          <tr key={sIdx} className="hover:bg-white/80">
                            <td className="p-1.5 text-gray-700">
                              ₹{slab.min_gross_half_year.toLocaleString('en-IN')} {slab.max_gross_half_year ? `to ₹${slab.max_gross_half_year.toLocaleString('en-IN')}` : 'and above'}
                            </td>
                            <td className="p-1.5 font-bold text-gray-900">₹{slab.half_year_tax_amount}</td>
                            <td className="p-1.5 font-bold text-[#07563D] text-right">₹{slab.monthly_deduction_amount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. TDS Subtab — FY 2026-27 & Form 12BB */}
      {subTab === 'tds' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Income Tax (TDS) & Form 12BB Declarations</h3>
                <Badge variant="emerald">FY 2026-27 Framework Active</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                New Tax Regime default (Sec 115BAC) with ₹75,000 Standard Deduction + Employee Form 12BB Investment Declarations.
              </p>
            </div>
          </div>

          {/* Slabs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Nil Tax Slab</span>
              <span className="text-sm font-black text-gray-900 block font-mono">Up to ₹ 3,00,000</span>
              <span className="text-emerald-700 font-bold text-[11px] block">0% Tax Rate</span>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Lower Bracket</span>
              <span className="text-sm font-black text-gray-900 block font-mono">₹ 3,00,001 - ₹ 7,00,000</span>
              <span className="text-blue-700 font-bold text-[11px] block">5% Tax Rate</span>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Middle Bracket</span>
              <span className="text-sm font-black text-gray-900 block font-mono">₹ 7,00,001 - ₹ 12,00,000</span>
              <span className="text-purple-700 font-bold text-[11px] block">10% - 15% Tax Rate</span>
            </div>

            <div className="p-3.5 rounded-xl bg-gray-50/80 border border-gray-200/80 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Higher Bracket</span>
              <span className="text-sm font-black text-gray-900 block font-mono">Above ₹ 15,00,000</span>
              <span className="text-rose-700 font-bold text-[11px] block">30% Maximum Bracket</span>
            </div>
          </div>

          {/* Form 12BB Declarations Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                Employee Form 12BB Tax Declarations (FY 2026-27)
              </div>
              <span className="text-xs text-gray-500 font-medium">Auto-deduct TDS based on regime</span>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-white shadow-2xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                  <tr>
                    <th className="p-2.5">Employee Name</th>
                    <th className="p-2.5">Regime Selected</th>
                    <th className="p-2.5">Sec 80C Declared</th>
                    <th className="p-2.5">Sec 80D Health</th>
                    <th className="p-2.5">HRA Rent (Annual)</th>
                    <th className="p-2.5">Proof Status</th>
                    <th className="p-2.5 text-right">Verification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {payrollApi.getTaxDeclarations().map(decl => (
                    <tr key={decl.id} className="hover:bg-gray-50/70">
                      <td className="p-2.5 font-bold text-gray-900">{decl.employee_name}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-100">
                          {decl.tax_regime}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-gray-800">₹{decl.section_80c_total.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 font-mono text-gray-800">₹{decl.section_80d_medical.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 font-mono text-gray-800">₹{decl.hra_rent_paid_annual.toLocaleString('en-IN')}</td>
                      <td className="p-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100">
                          {decl.proof_status}
                        </span>
                      </td>
                      <td className="p-2.5 text-right font-medium text-gray-500 text-[11px]">
                        {decl.verified_by || 'Verified'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
