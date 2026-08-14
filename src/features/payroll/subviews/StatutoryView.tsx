import React, { useState } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { StatutoryConfig } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { ShieldCheck, Building, Percent, FileCode, CheckCircle } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

interface StatutoryViewProps {
  initialSubTab?: string;
}

export const StatutoryView: React.FC<StatutoryViewProps> = ({ initialSubTab }) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'pf');
  const config = payrollApi.getStatutoryConfig();

  const subTabs = [
    { id: 'pf', label: 'PF / EPF Rules', icon: ShieldCheck },
    { id: 'esi', label: 'ESI / ESIC Rules', icon: Building },
    { id: 'pt', label: 'Professional Tax (PT)', icon: Percent },
    { id: 'tds', label: 'TDS Income Tax Slabs', icon: FileCode },
    { id: 'lwf', label: 'LWF & Gratuity', icon: CheckCircle },
  ];

  return (
    <div className="space-y-6">
      {/* Subnav Ribbon */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {subTabs.map(t => {
            const Icon = t.icon;
            const isActive = subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  isActive ? 'bg-[#07563D] text-white shadow-2xs' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        <Button size="sm" onClick={() => showToast('Statutory rules updated successfully')}>
          Save Rule Changes
        </Button>
      </div>

      {/* 1. EPF Subtab */}
      {subTab === 'pf' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-black text-gray-900">Employees' Provident Fund (EPF) Rules</h3>
              <p className="text-xs text-gray-500">Statutory rate compliance governed by EPFO (12% Basic Deduction)</p>
            </div>
            <Badge variant="emerald">EPFO Compliant (12%)</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Employee Share</span>
              <span className="text-lg font-black text-gray-900 block font-mono">{config.pf.employee_rate}% of Basic</span>
              <span className="text-gray-500 text-[11px] block">Deducted from gross salary</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Employer Share</span>
              <span className="text-lg font-black text-gray-900 block font-mono">{config.pf.employer_rate}% of Basic</span>
              <span className="text-gray-500 text-[11px] block">3.67% EPF + 8.33% EPS</span>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Statutory Wage Ceiling</span>
              <span className="text-lg font-black text-gray-900 block font-mono">₹ {config.pf.wage_ceiling.toLocaleString('en-IN')} / mo</span>
              <span className="text-gray-500 text-[11px] block">Max ₹ 1,800 monthly cap if restricted</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. ESIC Subtab */}
      {subTab === 'esi' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
          <div className="flex justify-between items-center border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-base font-black text-gray-900">Employees' State Insurance (ESIC) Rules</h3>
              <p className="text-xs text-gray-500">Medical insurance scheme applicable for employees with Gross &le; ₹ 21,000/mo</p>
            </div>
            <Badge variant="emerald">ESIC Rates Active</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Employee Share</span>
              <span className="text-lg font-black text-gray-900 block font-mono">{config.esi.employee_rate}% of Gross</span>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Employer Share</span>
              <span className="text-lg font-black text-gray-900 block font-mono">{config.esi.employer_rate}% of Gross</span>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
              <span className="text-gray-400 font-bold uppercase text-[10px]">Wage Eligibility Threshold</span>
              <span className="text-lg font-black text-gray-900 block font-mono">Gross &le; ₹ {config.esi.wage_ceiling.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
