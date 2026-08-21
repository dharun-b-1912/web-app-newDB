import React, { useState, useEffect } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { LoanRecord, SalaryAdvanceRecord } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { AlertCircle, Coins, CreditCard, Minus, Plus, Search, Check } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';

interface DeductionsViewProps {
  initialSubTab?: string;
}

export const DeductionsView: React.FC<DeductionsViewProps> = ({ initialSubTab }) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'lop');
  const [loans, setLoans] = useState<LoanRecord[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvanceRecord[]>([]);

  // Modal
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [loanEmpName, setLoanEmpName] = useState('Ananya Sen');
  const [loanType, setLoanType] = useState<LoanRecord['loan_type']>('Emergency Advance');
  const [loanPrincipal, setLoanPrincipal] = useState(100000);
  const [loanTenure, setLoanTenure] = useState(12);

  const loadData = () => {
    setLoans(payrollApi.getLoans());
    setAdvances(payrollApi.getSalaryAdvances());
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('*', () => loadData());
    return () => unsub();
  }, []);

  const handleCreateLoan = () => {
    const monthlyEmi = Math.round(loanPrincipal / loanTenure);
    payrollApi.createLoan({
      tenant_id: 'org-joy-01',
      employee_id: 'emp-102',
      employee_name: loanEmpName,
      loan_type: loanType,
      principal_amount: loanPrincipal,
      interest_rate: 0,
      tenure_months: loanTenure,
      monthly_emi: monthlyEmi,
      total_repayable: loanPrincipal,
      amount_recovered: 0,
      balance_amount: loanPrincipal,
      start_period: 'August 2026',
      end_period: 'July 2027',
      status: 'Active',
      approved_by: 'HR & Finance Signoff',
    });

    loadData();
    setIsLoanModalOpen(false);
    showToast(`✓ Created ${loanType} account for ${loanEmpName}. Monthly EMI: ₹${monthlyEmi.toLocaleString('en-IN')}`);
  };

  const subTabs = [
    { id: 'lop', label: 'LOP Salary Deductions', icon: AlertCircle },
    { id: 'loans', label: 'Employee Loans & EMI', icon: Coins },
    { id: 'advance', label: 'Salary Advances', icon: CreditCard },
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

        <Button size="sm" variant="primary" onClick={() => setIsLoanModalOpen(true)} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> New Loan / Advance
        </Button>
      </div>

      {/* 1. LOP Deductions */}
      {subTab === 'lop' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Loss of Pay (LOP) Automated Deductions</h3>
              <p className="text-xs text-gray-500">Calculated directly from unregularized absences and approved unpaid leaves</p>
            </div>
            <Badge variant="amber">Synced with Attendance Engine</Badge>
          </div>

          <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200/80 text-xs space-y-2">
            <span className="font-bold text-gray-900 block">Deterministic LOP Calculation Formula:</span>
            <p className="font-mono text-gray-700">Daily LOP Deduction Rate = (Monthly Gross Salary) ÷ (30 Calendar Working Days)</p>
            <p className="text-gray-500 text-[11px]">LOP amount is automatically deducted before calculating taxable income and net pay.</p>
          </div>
        </div>
      )}

      {/* 2. Loans */}
      {subTab === 'loans' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Active Loan Accounts & Monthly EMI Recoveries</h3>
            <p className="text-xs text-gray-500">Automated payroll deduction schedule</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Loan Type</th>
                  <th className="p-3 font-mono">Principal Amount</th>
                  <th className="p-3 font-mono">Monthly EMI</th>
                  <th className="p-3">Tenure</th>
                  <th className="p-3 font-mono">Outstanding Balance</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-400">
                      <Coins className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="font-semibold text-gray-700">No active employee loans</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Click "New Loan / Advance" to record an advance account.</p>
                    </td>
                  </tr>
                ) : (
                  loans.map(loan => (
                    <tr key={loan.id} className="hover:bg-gray-50/70">
                      <td className="p-3 font-bold text-gray-900">{loan.employee_name}</td>
                      <td className="p-3 text-gray-700">{loan.loan_type}</td>
                      <td className="p-3 font-mono font-bold text-gray-900">₹ {loan.principal_amount.toLocaleString('en-IN')}</td>
                      <td className="p-3 font-mono font-bold text-rose-700">₹ {loan.monthly_emi.toLocaleString('en-IN')}</td>
                      <td className="p-3 text-gray-600">{loan.tenure_months} Months</td>
                      <td className="p-3 font-mono font-bold text-amber-700">₹ {loan.balance_amount.toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <Badge variant="emerald">{loan.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Advances */}
      {subTab === 'advance' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Salary Advances</h3>
            <p className="text-xs text-gray-500">Short-term advances scheduled for full recovery in next payroll</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3 font-mono">Advance Amount</th>
                  <th className="p-3">Recovery Period</th>
                  <th className="p-3">Reason</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {advances.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-400">
                      <CreditCard className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="font-semibold text-gray-700">No pending salary advances</p>
                    </td>
                  </tr>
                ) : (
                  advances.map(adv => (
                    <tr key={adv.id} className="hover:bg-gray-50/70">
                      <td className="p-3 font-bold text-gray-900">{adv.employee_name}</td>
                      <td className="p-3 font-mono font-bold text-rose-700">₹ {adv.advance_amount.toLocaleString('en-IN')}</td>
                      <td className="p-3 font-semibold text-gray-800">{adv.deduction_period}</td>
                      <td className="p-3 text-gray-600">{adv.reason}</td>
                      <td className="p-3">
                        <Badge variant="emerald">{adv.status}</Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Loan / Advance */}
      {isLoanModalOpen && (
        <Modal
          isOpen={isLoanModalOpen}
          onClose={() => setIsLoanModalOpen(false)}
          title="Disburse New Employee Loan / Salary Advance"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Employee Name *</label>
              <input
                type="text"
                value={loanEmpName}
                onChange={e => setLoanEmpName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Loan / Advance Type</label>
                <select
                  value={loanType}
                  onChange={e => setLoanType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                >
                  <option value="Emergency Advance">Emergency Advance</option>
                  <option value="Personal Loan">Personal Loan</option>
                  <option value="Education">Education Assistance</option>
                  <option value="Housing Assistance">Housing Assistance</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Principal Amount (INR) *</label>
                <input
                  type="number"
                  value={loanPrincipal}
                  onChange={e => setLoanPrincipal(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Tenure (Months)</label>
              <input
                type="number"
                value={loanTenure}
                onChange={e => setLoanTenure(Number(e.target.value))}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Estimated Monthly Deduction: ₹{Math.round(loanPrincipal / Math.max(1, loanTenure)).toLocaleString('en-IN')}/mo
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsLoanModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleCreateLoan} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold">
                Disburse & Schedule EMI
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
