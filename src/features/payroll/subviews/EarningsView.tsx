import React, { useState, useEffect } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { ReimbursementClaim } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { TrendingUp, Gift, Coins, Receipt, Plus, Search, Check, Clock } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';

interface EarningsViewProps {
  initialSubTab?: string;
}

export const EarningsView: React.FC<EarningsViewProps> = ({ initialSubTab }) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'overtime');
  const [reimbursements, setReimbursements] = useState<ReimbursementClaim[]>([]);

  const loadData = () => {
    setReimbursements(payrollApi.getReimbursements());
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('*', () => loadData());
    return () => unsub();
  }, []);

  const subTabs = [
    { id: 'overtime', label: 'Overtime Earnings', icon: TrendingUp },
    { id: 'incentives', label: 'Incentives & Bonuses', icon: Coins },
    { id: 'reimbursements', label: 'Expense Claims & Reimbursements', icon: Receipt },
  ];

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
      </div>

      {/* 1. Overtime Earnings */}
      {subTab === 'overtime' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Overtime Earnings & Multipliers</h3>
              <p className="text-xs text-gray-500">Calculated directly from approved Overtime requests in Attendance module</p>
            </div>
            <Badge variant="emerald">Live Attendance Linked</Badge>
          </div>

          <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200/80 text-xs space-y-2">
            <span className="font-bold text-gray-900 block">Overtime Pay Rate Formulation:</span>
            <p className="font-mono text-gray-700">Hourly OT Rate = ((Monthly Gross Salary ÷ 30) ÷ 8 Hours) × 1.5 Multiplier</p>
            <p className="text-gray-500 text-[11px]">Computed dynamically per employee and aggregated into the current payroll run.</p>
          </div>
        </div>
      )}

      {/* 2. Incentives & Bonuses */}
      {subTab === 'incentives' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Incentive & Bonus Allocations</h3>
            <p className="text-xs text-gray-500">Performance bonuses and variable incentives</p>
          </div>

          <div className="p-8 text-center text-gray-400 bg-gray-50/50 rounded-2xl border border-gray-100">
            <Coins className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="font-semibold text-gray-700">No variable bonuses configured for this cycle</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Approved incentives will automatically appear here before payroll calculation.</p>
          </div>
        </div>
      )}

      {/* 3. Reimbursements */}
      {subTab === 'reimbursements' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Approved Expense Claims & Reimbursements</h3>
            <p className="text-xs text-gray-500">Reimbursements verified by finance for inclusion in active payroll</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Category</th>
                  <th className="p-3 font-mono">Claimed Amount</th>
                  <th className="p-3 font-mono">Approved Amount</th>
                  <th className="p-3">Receipt / Ref</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reimbursements.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      <Receipt className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="font-semibold text-gray-700">No reimbursement claims submitted</p>
                    </td>
                  </tr>
                ) : (
                  reimbursements.map(claim => (
                    <tr key={claim.id} className="hover:bg-gray-50/70">
                      <td className="p-3 font-bold text-gray-900">{claim.employee_name}</td>
                      <td className="p-3 text-gray-700">{claim.category}</td>
                      <td className="p-3 font-mono text-gray-600">₹ {claim.amount.toLocaleString('en-IN')}</td>
                      <td className="p-3 font-mono font-bold text-[#07563D]">₹ {claim.approved_amount.toLocaleString('en-IN')}</td>
                      <td className="p-3 font-mono text-gray-500">{claim.receipt_number}</td>
                      <td className="p-3">
                        <Badge variant="emerald">{claim.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
