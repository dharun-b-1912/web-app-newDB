import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { CircleDollarSign, Receipt, CreditCard, TrendingUp } from 'lucide-react';

export const FinanceDashboardView: React.FC = () => {
  const financeMetrics = [
    { label: 'Gross Payroll Spend', val: '₹570.0L', sub: 'Monthly Gross Base' },
    { label: 'Employer PF & ESIC', val: '₹48.2L', sub: 'Statutory Contribution' },
    { label: 'Net Payroll Disbursed', val: '₹485.4L', sub: 'Direct Bank Remittance' },
    { label: 'Overtime Spend', val: '₹4.25L', sub: '3.5% of Total Payroll' },
    { label: 'Travel & Expenses', val: '₹3.17L', sub: 'Reimbursed Expenses' },
    { label: 'Cost Per Employee', val: '₹1,36,800', sub: 'Total Known Cost / Staff' },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-[#07563D]" />
            <span>Finance & Workforce Cost Dashboard</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Gross/net payroll, employer statutory deductions, overtime spend, reimbursements, and cost-per-employee</p>
        </div>
        <Badge variant="emerald">Finance Domain Active</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {financeMetrics.map((m, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs">
            <span className="text-[11px] font-bold text-gray-500 block truncate">{m.label}</span>
            <span className="text-base font-black text-gray-900 font-mono tracking-tight block mt-1">{m.val}</span>
            <span className="text-[10px] text-emerald-700 font-semibold block mt-0.5">{m.sub}</span>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <h3 className="text-sm font-black text-gray-900">Cost-per-Employee Calculation Formula</h3>
        <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono space-y-1">
          <p className="font-bold text-gray-800">Cost per Employee = (Gross Payroll + Employer Statutory + Overtime + Travel & Reimbursements) / Active Headcount</p>
          <p className="text-gray-500 text-[11px]">₹1,36,800 = (₹5,70,00,000 + ₹48,20,00,00 + ₹4,25,000 + ₹3,17,000) / 416 Employees</p>
        </div>
      </div>
    </div>
  );
};
