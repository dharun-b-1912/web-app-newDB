import React, { useState, useEffect } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { LoanRecord } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { AlertCircle, Coins, CreditCard, Minus, Plus } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

interface DeductionsViewProps {
  initialSubTab?: string;
}

export const DeductionsView: React.FC<DeductionsViewProps> = ({ initialSubTab }) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'lop');
  const [loans, setLoans] = useState<LoanRecord[]>([]);

  useEffect(() => {
    setLoans(payrollApi.getLoans());
  }, []);

  const subTabs = [
    { id: 'lop', label: 'LOP Salary Deductions', icon: AlertCircle },
    { id: 'loans', label: 'Employee Loans & EMI', icon: Coins },
    { id: 'advance', label: 'Salary Advances', icon: CreditCard },
    { id: 'other', label: 'Other Voluntary Deductions', icon: Minus },
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

        <Button size="sm" leftIcon={<Plus className="w-4 h-4" />} onClick={() => showToast('Disburse Loan / Advance modal opened')}>
          New Loan / Advance
        </Button>
      </div>

      {/* 1. LOP Deductions */}
      {subTab === 'lop' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900">Loss of Pay (LOP) Automated Deductions</h3>
              <p className="text-xs text-gray-500">Calculated directly from approved LOP leaves in Leave Master Engine</p>
            </div>
            <Badge variant="amber">Synced with Leave Ledger</Badge>
          </div>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-2">
            <span className="font-bold text-gray-900 block">LOP Calculation Basis Rule:</span>
            <p className="text-gray-600">Daily LOP Rate = (Monthly Gross Salary) / (Total Calendar Working Days in Month)</p>
          </div>
        </div>
      )}

      {/* 2. Loans */}
      {subTab === 'loans' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Active Loan Accounts & Monthly EMI Deductions</span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4">Employee</th>
                <th className="p-4">Loan Type</th>
                <th className="p-4 text-right">Principal</th>
                <th className="p-4 text-right">Monthly EMI</th>
                <th className="p-4 text-center">Tenure Paid</th>
                <th className="p-4 text-right">Outstanding Balance</th>
                <th className="p-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-mono">
              {loans.map(loan => (
                <tr key={loan.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-sans font-extrabold text-gray-900">{loan.employee_name}</td>
                  <td className="p-4 font-sans font-bold text-gray-700">{loan.loan_type}</td>
                  <td className="p-4 text-right font-bold text-gray-800">₹ {loan.principal_amount.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-right font-bold text-rose-700">₹ {loan.monthly_emi.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-center text-gray-600">
                    {loan.paid_tenure_months} / {loan.total_tenure_months} months
                  </td>
                  <td className="p-4 text-right font-black text-gray-900">₹ {loan.outstanding_balance.toLocaleString('en-IN')}</td>
                  <td className="p-4 text-center font-sans"><Badge variant="emerald">{loan.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
