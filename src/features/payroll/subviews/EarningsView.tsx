import React, { useState, useEffect } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { EarningRecord } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { TrendingUp, Gift, Coins, Receipt, Plus, Search } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

interface EarningsViewProps {
  initialSubTab?: string;
}

export const EarningsView: React.FC<EarningsViewProps> = ({ initialSubTab }) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'overtime');
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);

  useEffect(() => {
    setEarnings(payrollApi.getEarnings());
  }, []);

  const subTabs = [
    { id: 'overtime', label: 'Overtime Earnings', icon: TrendingUp },
    { id: 'incentives', label: 'Sales & Tech Incentives', icon: Coins },
    { id: 'bonus', label: 'Annual & Performance Bonus', icon: Gift },
    { id: 'reimbursements', label: 'Expense Reimbursements', icon: Receipt },
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

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Add Earning modal opened')}>
          Add Earning Record
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <span className="text-xs font-black text-gray-900 uppercase tracking-wider">
            Variable Earning Disbursements ({earnings.length} Records)
          </span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Employee</th>
              <th className="p-4">Earning Category</th>
              <th className="p-4">Pay Period</th>
              <th className="p-4 text-right">Amount (₹)</th>
              <th className="p-4">Description / Justification</th>
              <th className="p-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {earnings.map(earn => (
              <tr key={earn.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-extrabold text-gray-900">{earn.employee_name}</td>
                <td className="p-4 font-bold text-gray-800">{earn.type}</td>
                <td className="p-4 font-mono text-gray-600">{earn.period}</td>
                <td className="p-4 text-right font-mono font-black text-[#07563D]">
                  + ₹ {earn.amount.toLocaleString('en-IN')}
                </td>
                <td className="p-4 text-gray-600 max-w-xs truncate">{earn.description}</td>
                <td className="p-4 text-center">
                  <Badge variant="emerald">{earn.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
