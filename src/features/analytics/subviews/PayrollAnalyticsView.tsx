import React from 'react';
import { Badge } from '../../../components/ui/Badge';
import { CircleDollarSign, BarChart3 } from 'lucide-react';

export const PayrollAnalyticsView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-[#07563D]" />
            <span>Payroll, Compensation & Salary Band Analytics</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">Gross-to-net payroll variance, statutory EPF/ESIC deductions, salary revisions, and compensation bands</p>
        </div>
        <Badge variant="emerald">Finance & HR Authorized Access</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <h3 className="text-sm font-black text-gray-900">Salary Band Distribution</h3>
          <div className="space-y-2 text-xs font-mono">
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex justify-between">
              <span>₹3.5L - ₹6.0L LPA (Junior / Associate)</span>
              <span className="font-bold text-gray-900">112 Employees (26.2%)</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex justify-between">
              <span>₹6.0L - ₹12.0L LPA (Mid-level Lead)</span>
              <span className="font-bold text-gray-900">208 Employees (48.6%)</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex justify-between">
              <span>₹12.0L - ₹24.0L LPA (Senior Manager / Architect)</span>
              <span className="font-bold text-gray-900">86 Employees (20.1%)</span>
            </div>
            <div className="p-3 rounded-xl bg-gray-50 border border-gray-100 flex justify-between">
              <span>₹24.0L+ LPA (Director / Executive)</span>
              <span className="font-bold text-gray-900">22 Employees (5.1%)</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <h3 className="text-sm font-black text-gray-900">Payroll Variance & Revision Analytics</h3>
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 space-y-2 text-xs">
            <div className="flex justify-between items-center font-bold text-emerald-900 font-mono">
              <span>Q3 Annual Appraisal Revision Variance</span>
              <Badge variant="emerald">+9.4% Average Hike</Badge>
            </div>
            <p className="text-emerald-800 text-[11px]">342 Employees revised on July 1, 2026. Total annual budget impact: ₹53.6L.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
