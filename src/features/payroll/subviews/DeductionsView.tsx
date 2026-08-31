import React, { useState, useEffect, useMemo } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { LoanRecord, SalaryAdvanceRecord, EmployeeSalaryAssignment } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import {
  AlertCircle,
  Coins,
  CreditCard,
  Minus,
  Plus,
  Search,
  Check,
  Calculator,
  ShieldCheck,
  TrendingDown,
  Clock,
  CheckCircle2,
  Calendar,
  AlertTriangle,
} from 'lucide-react';
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
  const [salaries, setSalaries] = useState<EmployeeSalaryAssignment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // LOP Simulator State
  const [simLopSalary, setSimLopSalary] = useState<number>(45000);
  const [simLopDays, setSimLopDays] = useState<number>(2);

  // Modal State
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [loanEmpName, setLoanEmpName] = useState('Ananya Sen');
  const [loanType, setLoanType] = useState<LoanRecord['loan_type']>('Emergency Advance');
  const [loanPrincipal, setLoanPrincipal] = useState(100000);
  const [loanTenure, setLoanTenure] = useState(12);

  const loadData = async () => {
    setLoans(payrollApi.getLoans());
    setAdvances(payrollApi.getSalaryAdvances());
    const sList = await payrollApi.getEmployeeSalaries();
    setSalaries(sList);
    if (sList.length > 0 && !loanEmpName) {
      setLoanEmpName(sList[0].employee_name);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('*', () => loadData());
    return () => unsub();
  }, []);

  const totalOutstandingLoan = useMemo(() => {
    return loans.reduce((acc, l) => acc + (l.balance_amount || 0), 0);
  }, [loans]);

  const totalMonthlyEmi = useMemo(() => {
    return loans.reduce((acc, l) => acc + (l.monthly_emi || 0), 0);
  }, [loans]);

  const simLopDeduction = useMemo(() => {
    return Math.round((simLopSalary / 30) * simLopDays);
  }, [simLopSalary, simLopDays]);

  const handleCreateLoan = () => {
    const monthlyEmi = Math.round(loanPrincipal / Math.max(1, loanTenure));
    const matched = salaries.find(s => s.employee_name === loanEmpName) || salaries[0];

    payrollApi.createLoan({
      tenant_id: 'org-joy-01',
      employee_id: matched?.employee_id || 'emp-102',
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
    <div className="space-y-6 select-none">
      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Active Loan Pool</span>
            <span className="text-base font-black text-gray-900 mt-0.5 block font-mono">
              ₹ {totalOutstandingLoan.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-amber-700 font-semibold">{loans.length} Active Accounts</span>
          </div>
          <span className="p-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-100">
            <Coins className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Monthly EMI Recoveries</span>
            <span className="text-base font-black text-rose-700 mt-0.5 block font-mono">
              ₹ {totalMonthlyEmi.toLocaleString('en-IN')} / mo
            </span>
            <span className="text-[10px] text-gray-500 font-medium">Auto-deducted in August 2026 run</span>
          </div>
          <span className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">
            <TrendingDown className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Attendance LOP Link</span>
            <span className="text-base font-black text-emerald-800 mt-0.5 block flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Deterministic</span>
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold">1/30 Gross daily deduction policy</span>
          </div>
          <span className="p-3 rounded-xl bg-emerald-50 text-[#07563D] border border-emerald-100">
            <ShieldCheck className="w-5 h-5" />
          </span>
        </div>
      </div>

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

        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsLoanModalOpen(true)}
          className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 mr-1" /> New Loan / Advance
        </Button>
      </div>

      {/* 1. LOP Deductions */}
      {subTab === 'lop' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Loss of Pay (LOP) Automated Deductions</h3>
                  <p className="text-xs text-gray-500">Calculated directly from unregularized absences and approved unpaid leaves</p>
                </div>
                <Badge variant="amber">Live Attendance Synced</Badge>
              </div>

              <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200/80 text-xs space-y-2.5">
                <span className="font-bold text-gray-900 block">Deterministic LOP Formulation:</span>
                <div className="p-3 bg-white rounded-lg border border-gray-200 font-mono text-xs text-rose-700 font-bold">
                  Daily LOP Deduction = (Monthly Gross Salary ÷ 30 Days) × LOP Days
                </div>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  LOP deductions reduce taxable gross earnings proportionally before computing income tax brackets and statutory contributions.
                </p>
              </div>

              {/* Sample LOP Ledger */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                  Current Cycle Attendance LOP Records
                </span>
                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                      <tr>
                        <th className="p-2.5">Employee</th>
                        <th className="p-2.5">Monthly Gross</th>
                        <th className="p-2.5">LOP Days</th>
                        <th className="p-2.5">Daily Rate</th>
                        <th className="p-2.5 text-right">LOP Deduction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {salaries.slice(0, 5).map((sal, idx) => {
                        const lopD = idx === 1 ? 1 : idx === 3 ? 2 : 0;
                        const dRate = Math.round(sal.gross_monthly / 30);
                        const lopAmt = dRate * lopD;
                        return (
                          <tr key={sal.id} className="hover:bg-gray-50/70">
                            <td className="p-2.5 font-bold text-gray-900">
                              <div>{sal.employee_name}</div>
                              <span className="text-[10px] text-gray-400 font-mono">{sal.employee_code}</span>
                            </td>
                            <td className="p-2.5 font-mono text-gray-700">₹ {sal.gross_monthly.toLocaleString('en-IN')}</td>
                            <td className="p-2.5 font-semibold text-gray-800">
                              {lopD > 0 ? (
                                <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded">
                                  {lopD} Day(s) Unpaid
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                                  0 Days (Full Pay)
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-gray-600">₹ {dRate.toLocaleString('en-IN')} / day</td>
                            <td className="p-2.5 font-mono font-bold text-rose-700 text-right">
                              ₹ {lopAmt.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: LOP Calculator */}
          <div>
            <div className="bg-gradient-to-b from-white to-rose-50/30 p-5 rounded-2xl border border-rose-200/80 shadow-2xs space-y-4">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <Calculator className="w-4 h-4" />
                <span>Interactive LOP Impact Estimator</span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Monthly Gross (₹)</label>
                  <input
                    type="number"
                    value={simLopSalary}
                    onChange={e => setSimLopSalary(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold focus:ring-1 focus:ring-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-1">Number of Unpaid LOP Days</label>
                  <input
                    type="number"
                    value={simLopDays}
                    onChange={e => setSimLopDays(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-mono text-xs font-bold focus:ring-1 focus:ring-rose-600"
                  />
                </div>

                <div className="p-3 bg-rose-100/70 rounded-xl border border-rose-200 space-y-1.5 pt-3 mt-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">Daily Wage Base (1/30):</span>
                    <span className="font-mono font-bold text-gray-900">
                      ₹ {Math.round(simLopSalary / 30).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1.5 border-t border-rose-200">
                    <span className="font-black text-rose-950">Calculated LOP Loss:</span>
                    <span className="font-mono font-black text-base text-rose-700">
                      ₹ {simLopDeduction.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Loans */}
      {subTab === 'loans' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Active Loan Accounts & Monthly EMI Recoveries</h3>
              <p className="text-xs text-gray-500">Scheduled EMI auto-deductions with strict amortization tracking</p>
            </div>

            <Button
              size="xs"
              variant="primary"
              onClick={() => setIsLoanModalOpen(true)}
              className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> New Loan Account
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Loan Type</th>
                  <th className="p-3 font-mono">Principal</th>
                  <th className="p-3 font-mono">Monthly EMI</th>
                  <th className="p-3">Tenure / Period</th>
                  <th className="p-3 font-mono">Balance Due</th>
                  <th className="p-3">Amortization</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-gray-400">
                      <Coins className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="font-semibold text-gray-700">No active employee loans</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Click "New Loan / Advance" to record an advance account.</p>
                    </td>
                  </tr>
                ) : (
                  loans.map(loan => {
                    const recovered = loan.amount_recovered || 0;
                    const percent = loan.total_repayable > 0 ? Math.round((recovered / loan.total_repayable) * 100) : 0;
                    return (
                      <tr key={loan.id} className="hover:bg-gray-50/70">
                        <td className="p-3 font-bold text-gray-900">{loan.employee_name}</td>
                        <td className="p-3 text-gray-700 font-medium">{loan.loan_type}</td>
                        <td className="p-3 font-mono font-bold text-gray-900">₹ {loan.principal_amount.toLocaleString('en-IN')}</td>
                        <td className="p-3 font-mono font-bold text-rose-700">₹ {loan.monthly_emi.toLocaleString('en-IN')} / mo</td>
                        <td className="p-3 text-gray-600">
                          <div>{loan.tenure_months} Months</div>
                          <span className="text-[10px] text-gray-400 font-mono">{loan.start_period} – {loan.end_period}</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-800">₹ {loan.balance_amount.toLocaleString('en-IN')}</td>
                        <td className="p-3 min-w-[120px]">
                          <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
                            <span>{percent}% Repaid</span>
                          </div>
                          <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                            <div className="bg-[#07563D] h-full rounded-full" style={{ width: `${percent}%` }} />
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge variant="emerald">{loan.status}</Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Advances */}
      {subTab === 'advance' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Salary Advances</h3>
              <p className="text-xs text-gray-500">Short-term advances scheduled for full single-cycle recovery</p>
            </div>
            <Button
              size="xs"
              variant="primary"
              onClick={() => setIsLoanModalOpen(true)}
              className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
            >
              <Plus className="w-3.5 h-3.5 mr-1" /> Disburse Advance
            </Button>
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
              <select
                value={loanEmpName}
                onChange={e => setLoanEmpName(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
              >
                {salaries.map(s => (
                  <option key={s.id} value={s.employee_name}>
                    {s.employee_name} ({s.employee_code} - {s.department_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Loan / Advance Type</label>
                <select
                  value={loanType}
                  onChange={e => setLoanType(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
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
                  placeholder="0"
                  value={loanPrincipal === 0 ? '' : loanPrincipal}
                  onChange={e => setLoanPrincipal(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold placeholder:text-gray-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Tenure (Months)</label>
              <input
                type="number"
                placeholder="0"
                value={loanTenure === 0 ? '' : loanTenure}
                onChange={e => setLoanTenure(e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold placeholder:text-gray-400"
              />
              <span className="text-[10px] text-gray-400 mt-1 block font-mono">
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
