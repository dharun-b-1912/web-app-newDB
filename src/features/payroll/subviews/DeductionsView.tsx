import React, { useState, useEffect, useMemo } from 'react';
import { useTenant } from '../../../hooks/useTenant';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../components/ui/Toast';
import { DeductionPolicyEngine } from '../../../services/payroll/deductionPolicyEngine';
import {
  PayrollDeductionPolicy,
  EmployeeLoanAccount,
  SalaryAdvanceItem,
  EmployeeLopRecord,
  PayrollReconciliationRow,
  LoanAmortizationInstallment,
  LOPCalculationMethod,
  LoanInterestMethod,
} from '../../../types/deductions';
import { EmployeeSalaryAssignment } from '../../../types/payroll';
import { payrollApi } from '../../../services/payrollApi';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import {
  AlertCircle,
  Coins,
  CreditCard,
  Plus,
  Search,
  Calculator,
  ShieldCheck,
  TrendingDown,
  CheckCircle2,
  Calendar,
  Settings,
  Scale,
  FileSpreadsheet,
  Layers,
  ArrowRight,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';

interface DeductionsViewProps {
  initialSubTab?: string;
}

export const DeductionsView: React.FC<DeductionsViewProps> = ({ initialSubTab }) => {
  const { showToast } = useToast();
  const { organization, activeCompany } = useTenant();
  const { user } = useAuth();
  const orgId = organization?.id || '0c621892-e938-4707-9957-13534ea32c19';
  const companyId = activeCompany?.id || '2030277f-a6a1-427f-beaf-4fc677a3bae2';


  // Subtabs state
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'lop');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('2026-10'); // YYYY-MM

  // Authoritative Backend State
  const [policy, setPolicy] = useState<PayrollDeductionPolicy | null>(null);
  const [loans, setLoans] = useState<EmployeeLoanAccount[]>([]);
  const [advances, setAdvances] = useState<SalaryAdvanceItem[]>([]);
  const [lopRecords, setLopRecords] = useState<EmployeeLopRecord[]>([]);
  const [reconciliationRows, setReconciliationRows] = useState<PayrollReconciliationRow[]>([]);
  const [salaries, setSalaries] = useState<EmployeeSalaryAssignment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // LOP Simulator State
  const [simLopSalary, setSimLopSalary] = useState<number>(45000);
  const [simLopDays, setSimLopDays] = useState<number>(2);

  // Policy Form State
  const [policyForm, setPolicyForm] = useState<Partial<PayrollDeductionPolicy>>({});
  const [isSavingPolicy, setIsSavingPolicy] = useState(false);

  // Loan Creation Modal State
  const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
  const [loanEmpId, setLoanEmpId] = useState('');
  const [loanType, setLoanType] = useState('Personal Emergency');
  const [loanPrincipal, setLoanPrincipal] = useState(50000);
  const [loanInterestMethod, setLoanInterestMethod] = useState<LoanInterestMethod>('INTEREST_FREE');
  const [loanInterestRate, setLoanInterestRate] = useState(0);
  const [loanTenure, setLoanTenure] = useState(10);
  const [loanStartPeriod, setLoanStartPeriod] = useState('2026-10');
  const [loanReason, setLoanReason] = useState('Personal assistance');

  // Salary Advance Modal State
  const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
  const [advEmpId, setAdvEmpId] = useState('');
  const [advAmount, setAdvAmount] = useState(15000);
  const [advPeriod, setAdvPeriod] = useState('2026-10');
  const [advReason, setAdvReason] = useState('Festival advance / festival expenses');

  // Amortization Schedule Viewer Modal
  const [selectedAmortizationLoan, setSelectedAmortizationLoan] = useState<EmployeeLoanAccount | null>(null);

  // ──────────────────────────────────────────────────────────────────────────
  // Data Hydration from Supabase Backend
  // ──────────────────────────────────────────────────────────────────────────
  const loadData = async () => {
    setIsLoading(true);
    try {
      const pol = await DeductionPolicyEngine.getActivePolicy(orgId);
      setPolicy(pol);
      setPolicyForm(pol);

      const [loanList, advList, lops, recRows, sList] = await Promise.all([
        DeductionPolicyEngine.getLoans(orgId),
        DeductionPolicyEngine.getAdvances(orgId),
        DeductionPolicyEngine.aggregateAttendanceLop(orgId, selectedPeriod),
        DeductionPolicyEngine.reconcilePayrollPeriod(orgId, selectedPeriod),
        payrollApi.getEmployeeSalaries(orgId),
      ]);

      setLoans(loanList);
      setAdvances(advList);
      setLopRecords(lops);
      setReconciliationRows(recRows);
      setSalaries(sList);

      if (sList.length > 0) {
        if (!loanEmpId) setLoanEmpId(sList[0].employee_id);
        if (!advEmpId) setAdvEmpId(sList[0].employee_id);
      }
    } catch (err) {
      console.error('[DeductionsView] Failed to load authoritative data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('payroll.*', () => loadData());
    return () => unsub();
  }, [orgId, selectedPeriod]);

  // Derived KPI Metrics
  const totalOutstandingLoan = useMemo(() => {
    return loans.reduce((acc, l) => acc + (l.balance_amount || 0), 0);
  }, [loans]);

  const totalMonthlyEmi = useMemo(() => {
    return loans.filter(l => l.status === 'ACTIVE').reduce((acc, l) => acc + (l.monthly_emi || 0), 0);
  }, [loans]);

  const totalLopDeductions = useMemo(() => {
    return lopRecords.reduce((acc, r) => acc + (r.computed_lop_deduction || 0), 0);
  }, [lopRecords]);

  // Dynamic LOP Divisor from Active Policy
  const activeDivisor = useMemo(() => {
    if (!policy) return 30;
    if (policy.lop_calculation_method === 'CALENDAR_DAYS') {
      const [year, month] = selectedPeriod.split('-').map(Number);
      return new Date(year, month, 0).getDate(); // 31 for October
    }
    if (policy.lop_calculation_method === 'SCHEDULED_WORKING_DAYS') {
      return 26;
    }
    return policy.lop_days_divisor || 30;
  }, [policy, selectedPeriod]);

  const simLopDeduction = useMemo(() => {
    const rate = Math.round((simLopSalary / activeDivisor) * 100) / 100;
    return Math.round(rate * simLopDays);
  }, [simLopSalary, simLopDays, activeDivisor]);

  // Live Loan EMI Preview in Modal
  const modalEmiPreview = useMemo(() => {
    return DeductionPolicyEngine.calculateEMI(loanPrincipal, loanInterestRate, loanTenure, loanInterestMethod);
  }, [loanPrincipal, loanInterestRate, loanTenure, loanInterestMethod]);

  // ──────────────────────────────────────────────────────────────────────────
  // Handlers
  // ──────────────────────────────────────────────────────────────────────────

  const handleSavePolicy = async () => {
    setIsSavingPolicy(true);
    const actor = {
      id: user?.id || 'admin-01',
      name: user?.name || 'Mari Muthu (HR Head)',
    };

    const res = await DeductionPolicyEngine.savePolicy(
      {
        ...policyForm,
        organization_id: orgId,
        company_id: companyId,
      },
      actor,
      'HR policy adjustment via Joy PeopleHR UI'
    );

    setIsSavingPolicy(false);
    if (res.success && res.policy) {
      setPolicy(res.policy);
      showToast('✓ Deduction policy updated and enforced across payroll runs!');
      loadData();
    } else {
      showToast(`❌ Error saving policy: ${res.error}`);
    }
  };

  const handleCreateLoan = async () => {
    const matched = salaries.find(s => s.employee_id === loanEmpId) || salaries[0];
    if (!matched) {
      showToast('Please select a valid employee.');
      return;
    }

    const [startYear, startMonth] = loanStartPeriod.split('-').map(Number);
    const endMonthDate = new Date(startYear, startMonth - 1 + loanTenure - 1, 1);
    const endPeriodStr = `${endMonthDate.getFullYear()}-${String(endMonthDate.getMonth() + 1).padStart(2, '0')}`;

    const actor = {
      id: user?.id || 'admin-01',
      name: user?.name || 'Mari Muthu (HR Head)',
    };

    const res = await DeductionPolicyEngine.createLoan(
      {
        organization_id: orgId,
        company_id: companyId,
        employee_id: matched.employee_id,
        employee_name: matched.employee_name,
        employee_code: matched.employee_code,
        loan_code: `LN-${new Date().getFullYear()}-${String(loans.length + 1).padStart(3, '0')}`,
        loan_type: loanType,
        principal_amount: loanPrincipal,
        annual_interest_rate: loanInterestRate,
        interest_method: loanInterestMethod,
        tenure_months: loanTenure,
        monthly_emi: modalEmiPreview.monthlyEmi,
        total_interest: modalEmiPreview.totalInterest,
        total_repayable: modalEmiPreview.totalRepayable,
        amount_recovered: 0,
        balance_amount: modalEmiPreview.totalRepayable,
        disbursement_status: 'DISBURSED',
        disbursement_date: new Date().toISOString().split('T')[0],
        emi_start_period: loanStartPeriod,
        emi_end_period: endPeriodStr,
        status: 'ACTIVE',
        approval_status: 'APPROVED',
        approved_by: actor.name,
        reason: loanReason,
      },
      actor
    );

    if (res.success && res.loan) {
      setIsLoanModalOpen(false);
      showToast(`✓ Loan created for ${matched.employee_name}. Monthly EMI: ₹${res.loan.monthly_emi.toLocaleString('en-IN')}`);
      loadData();
    } else {
      showToast(`❌ Failed to create loan: ${res.error}`);
    }
  };

  const handleCreateAdvance = async () => {
    const matched = salaries.find(s => s.employee_id === advEmpId) || salaries[0];
    if (!matched) {
      showToast('Please select a valid employee.');
      return;
    }

    // Validation against policy
    const maxAllowed = Math.round(matched.gross_monthly * ((policy?.max_salary_advance_percent || 50) / 100));
    if (advAmount > maxAllowed) {
      showToast(`⚠️ Advance amount exceeds policy limit of ₹${maxAllowed.toLocaleString('en-IN')} (50% of gross).`);
      return;
    }

    const actor = {
      id: user?.id || 'admin-01',
      name: user?.name || 'Mari Muthu (HR Head)',
    };

    const res = await DeductionPolicyEngine.createAdvance(
      {
        organization_id: orgId,
        company_id: companyId,
        employee_id: matched.employee_id,
        employee_name: matched.employee_name,
        employee_code: matched.employee_code,
        advance_code: `ADV-${new Date().getFullYear()}-${String(advances.length + 1).padStart(3, '0')}`,
        advance_amount: advAmount,
        recovery_period: advPeriod,
        recovery_installments_count: 1,
        monthly_recovery_amount: advAmount,
        amount_recovered: 0,
        balance_amount: advAmount,
        status: 'ACTIVE',
        disbursement_status: 'DISBURSED',
        disbursement_date: new Date().toISOString().split('T')[0],
        approved_by: actor.name,
        reason: advReason,
      },
      actor
    );

    if (res.success && res.advance) {
      setIsAdvanceModalOpen(false);
      showToast(`✓ Salary Advance sanctioned for ${matched.employee_name} (₹${advAmount.toLocaleString('en-IN')})`);
      loadData();
    } else {
      showToast(`❌ Failed to create advance: ${res.error}`);
    }
  };

  const subTabs = [
    { id: 'lop', label: 'LOP Salary Deductions', icon: AlertCircle },
    { id: 'loans', label: 'Employee Loans & EMI', icon: Coins },
    { id: 'advance', label: 'Salary Advances', icon: CreditCard },
    { id: 'policy', label: 'Deduction Policy Settings', icon: Settings },
    { id: 'reconciliation', label: 'Payroll Reconciliation', icon: Scale },
  ];

  return (
    <div className="space-y-6 select-none">
      {/* Quick Metrics Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
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
            <span className="text-[10px] text-gray-500 font-medium">Auto-deducted in {selectedPeriod}</span>
          </div>
          <span className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">
            <TrendingDown className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Attendance LOP Total</span>
            <span className="text-base font-black text-rose-800 mt-0.5 block font-mono">
              ₹ {totalLopDeductions.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold">{lopRecords.filter(r => r.total_lop_days > 0).length} Unpaid Cases</span>
          </div>
          <span className="p-3 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">
            <AlertCircle className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Attendance LOP Policy</span>
            <span className="text-base font-black text-emerald-800 mt-0.5 block flex items-center gap-1.5 font-mono">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{policy?.lop_calculation_method === 'CALENDAR_DAYS' ? 'Calendar Days' : policy?.lop_calculation_method === 'SCHEDULED_WORKING_DAYS' ? '26 Working Days' : '1/30 Fixed'}</span>
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold">1/{activeDivisor} Daily Rate Divisor</span>
          </div>
          <span className="p-3 rounded-xl bg-emerald-50 text-[#07563D] border border-emerald-100">
            <ShieldCheck className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Subnav Ribbon with Period Selector */}
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

        <div className="flex items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700">
            <Calendar className="w-3.5 h-3.5 text-gray-500" />
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="bg-transparent border-none text-xs font-bold focus:outline-none cursor-pointer"
            >
              <option value="2026-10">October 2026</option>
              <option value="2026-11">November 2026</option>
              <option value="2026-12">December 2026</option>
            </select>
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
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 1. LOP DEDUCTIONS SUBTAB                                            */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {subTab === 'lop' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Loss of Pay (LOP) Automated Deductions</h3>
                  <p className="text-xs text-gray-500">Calculated directly from authoritative Supabase attendance records and unpaid leaves</p>
                </div>
                <Badge variant="amber">Live Attendance Synced</Badge>
              </div>

              {/* Dynamic Formulation Banner reflecting active policy */}
              <div className="p-4 rounded-xl bg-gray-50/80 border border-gray-200/80 text-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 block">Active Policy LOP Formulation:</span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">
                    Method: {policy?.lop_calculation_method || 'CALENDAR_DAYS'}
                  </span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-gray-200 font-mono text-xs text-rose-700 font-bold">
                  Daily LOP Deduction = (Monthly Gross Salary ÷ {activeDivisor} Days) × LOP Days
                </div>
                <p className="text-gray-600 text-[11px] leading-relaxed">
                  LOP deductions reduce taxable gross earnings proportionally before computing income tax brackets and statutory contributions.
                </p>
              </div>

              {/* Live Attendance LOP Records Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">
                    {selectedPeriod} Attendance LOP Records ({lopRecords.length} Staff)
                  </span>
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search employee..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-100 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                      <tr>
                        <th className="p-2.5">Employee</th>
                        <th className="p-2.5">Monthly Gross</th>
                        <th className="p-2.5">LOP Days</th>
                        <th className="p-2.5">Daily Rate (1/{activeDivisor})</th>
                        <th className="p-2.5 text-right">LOP Deduction</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lopRecords
                        .filter(r => !searchQuery || r.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) || r.employee_code.toLowerCase().includes(searchQuery.toLowerCase()))
                        .slice(0, 10)
                        .map((rec) => (
                          <tr key={rec.employee_id} className="hover:bg-gray-50/70">
                            <td className="p-2.5 font-bold text-gray-900">
                              <div>{rec.employee_name}</div>
                              <span className="text-[10px] text-gray-400 font-mono">{rec.employee_code}</span>
                            </td>
                            <td className="p-2.5 font-mono text-gray-700">₹ {rec.monthly_gross.toLocaleString('en-IN')}</td>
                            <td className="p-2.5 font-semibold text-gray-800">
                              {rec.total_lop_days > 0 ? (
                                <span className="text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded">
                                  {rec.total_lop_days} Day(s) Unpaid
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded">
                                  0 Days (Full Pay)
                                </span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-gray-600">₹ {rec.daily_wage_rate.toLocaleString('en-IN')} / day</td>
                            <td className="p-2.5 font-mono font-bold text-rose-700 text-right">
                              ₹ {rec.computed_lop_deduction.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Right Col: Interactive LOP Estimator */}
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
                    <span className="text-gray-600">Daily Wage Base (1/{activeDivisor}):</span>
                    <span className="font-mono font-bold text-gray-900">
                      ₹ {Math.round(simLopSalary / activeDivisor).toLocaleString('en-IN')}
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 2. LOANS & EMI SUBTAB                                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {subTab === 'loans' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Active Loan Accounts & Monthly EMI Recoveries</h3>
              <p className="text-xs text-gray-500">Scheduled EMI auto-deductions with strict amortization tracking stored in Supabase</p>
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
                  <th className="p-3">Method & Rate</th>
                  <th className="p-3 font-mono">Monthly EMI</th>
                  <th className="p-3">Tenure / Period</th>
                  <th className="p-3 font-mono">Balance Due</th>
                  <th className="p-3">Amortization</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loans.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-gray-400">
                      <Coins className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="font-semibold text-gray-700">No active employee loans</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Click "New Loan Account" to create a sanctioned loan account.</p>
                    </td>
                  </tr>
                ) : (
                  loans.map(loan => {
                    const recovered = loan.amount_recovered || 0;
                    const percent = loan.total_repayable > 0 ? Math.round((recovered / loan.total_repayable) * 100) : 0;
                    return (
                      <tr key={loan.id} className="hover:bg-gray-50/70">
                        <td className="p-3 font-bold text-gray-900">
                          <div>{loan.employee_name}</div>
                          <span className="text-[10px] text-gray-400 font-mono">{loan.employee_code}</span>
                        </td>
                        <td className="p-3 text-gray-700 font-medium">{loan.loan_type}</td>
                        <td className="p-3 font-mono font-bold text-gray-900">₹ {loan.principal_amount.toLocaleString('en-IN')}</td>
                        <td className="p-3 text-gray-600">
                          <span className="text-[11px] font-medium">{loan.interest_method === 'INTEREST_FREE' ? '0% Free' : `${loan.annual_interest_rate}% ${loan.interest_method}`}</span>
                        </td>
                        <td className="p-3 font-mono font-bold text-rose-700">₹ {loan.monthly_emi.toLocaleString('en-IN')} / mo</td>
                        <td className="p-3 text-gray-600">
                          <div>{loan.tenure_months} Months</div>
                          <span className="text-[10px] text-gray-400 font-mono">{loan.emi_start_period} – {loan.emi_end_period}</span>
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
                        <td className="p-3 text-right">
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => setSelectedAmortizationLoan(loan)}
                            className="text-[10px] font-bold"
                          >
                            Schedule
                          </Button>
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 3. SALARY ADVANCES SUBTAB                                           */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {subTab === 'advance' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Salary Advances</h3>
              <p className="text-xs text-gray-500">Short-term advances scheduled for recovery with policy cap validation</p>
            </div>
            <Button
              size="xs"
              variant="primary"
              onClick={() => setIsAdvanceModalOpen(true)}
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
                  <th className="p-3">Disbursed Date</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {advances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      <CreditCard className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="font-semibold text-gray-700">No pending salary advances</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Click "Disburse Advance" to record an advance.</p>
                    </td>
                  </tr>
                ) : (
                  advances.map(adv => (
                    <tr key={adv.id} className="hover:bg-gray-50/70">
                      <td className="p-3 font-bold text-gray-900">
                        <div>{adv.employee_name}</div>
                        <span className="text-[10px] text-gray-400 font-mono">{adv.employee_code}</span>
                      </td>
                      <td className="p-3 font-mono font-bold text-rose-700">₹ {adv.advance_amount.toLocaleString('en-IN')}</td>
                      <td className="p-3 font-semibold text-gray-800">{adv.recovery_period}</td>
                      <td className="p-3 text-gray-600">{adv.reason}</td>
                      <td className="p-3 text-gray-500 font-mono">{adv.disbursement_date || 'Immediate'}</td>
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

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 4. DEDUCTION POLICY SETTINGS SUBTAB                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {subTab === 'policy' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Company Payroll Deduction & Recovery Policy</h3>
              <p className="text-xs text-gray-500">Configure multi-tenant recovery rules, LOP divisors, and deduction ceilings without code changes</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 font-mono">Policy v{policy?.version || 1}</span>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSavePolicy}
                disabled={isSavingPolicy}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
              >
                {isSavingPolicy ? 'Saving...' : 'Save Policy Changes'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* LOP Settings Card */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <span className="font-bold text-gray-900 block flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-emerald-700" />
                Loss of Pay (LOP) Proration Method
              </span>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Proration Formula Basis</label>
                <select
                  value={policyForm.lop_calculation_method || 'CALENDAR_DAYS'}
                  onChange={e => setPolicyForm({ ...policyForm, lop_calculation_method: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold"
                >
                  <option value="CALENDAR_DAYS">Actual Calendar Days (e.g. 31 days in Oct)</option>
                  <option value="FIXED_30_DAYS">Fixed 30 Days Divisor (Corporate Standard)</option>
                  <option value="SCHEDULED_WORKING_DAYS">Scheduled Working Days (e.g. 26 Days)</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Fixed Divisor Override (if applicable)</label>
                <input
                  type="number"
                  value={policyForm.lop_days_divisor || 30}
                  onChange={e => setPolicyForm({ ...policyForm, lop_days_divisor: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold"
                />
              </div>
            </div>

            {/* Ceiling Caps Card */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <span className="font-bold text-gray-900 block flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#07563D]" />
                Maximum Statutory Deduction Caps
              </span>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Max Total Deduction (% of Gross)</label>
                <input
                  type="number"
                  value={policyForm.max_total_deduction_percent || 50}
                  onChange={e => setPolicyForm({ ...policyForm, max_total_deduction_percent: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">
                  Enforces Payment of Wages Act Sec. 7(3) ceiling (50% max).
                </span>
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Max Salary Advance (% of Eligible Gross)</label>
                <input
                  type="number"
                  value={policyForm.max_salary_advance_percent || 50}
                  onChange={e => setPolicyForm({ ...policyForm, max_salary_advance_percent: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold"
                />
              </div>
            </div>

            {/* Loan Interest Settings */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <span className="font-bold text-gray-900 block flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-amber-700" />
                Default Loan Interest Configuration
              </span>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Default Interest Method</label>
                <select
                  value={policyForm.loan_interest_method || 'INTEREST_FREE'}
                  onChange={e => setPolicyForm({ ...policyForm, loan_interest_method: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold"
                >
                  <option value="INTEREST_FREE">Interest-Free (Company Welfare)</option>
                  <option value="REDUCING_BALANCE">Reducing-Balance Method</option>
                  <option value="FLAT_RATE">Flat-Rate Annual Method</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Default Annual Interest Rate (%)</label>
                <input
                  type="number"
                  value={policyForm.default_loan_annual_interest_rate || 0}
                  onChange={e => setPolicyForm({ ...policyForm, default_loan_annual_interest_rate: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold"
                />
              </div>
            </div>

            {/* Insufficient Salary Handling */}
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
              <span className="font-bold text-gray-900 block flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-purple-700" />
                Insufficient Net Pay & Recovery Deferral
              </span>

              <div>
                <label className="block text-gray-600 font-medium mb-1">Handling Rule on Cap Exceeded</label>
                <select
                  value={policyForm.insufficient_salary_handling || 'PARTIAL_AND_CARRY_FORWARD'}
                  onChange={e => setPolicyForm({ ...policyForm, insufficient_salary_handling: e.target.value as any })}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold"
                >
                  <option value="PARTIAL_AND_CARRY_FORWARD">Partial Recovery & Carry Forward Balance</option>
                  <option value="DEFER_INSTALLMENT">Defer Entire Installment to Next Period</option>
                  <option value="STOP_RECOVERY">Pause Recovery & Flag for HR Review</option>
                </select>
              </div>

              <div className="p-2.5 bg-purple-50 rounded-lg text-purple-900 text-[11px] leading-relaxed">
                Prioritization Order: <strong>STATUTORY &gt; LOP &gt; SALARY ADVANCE &gt; LOAN EMI</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* 5. PAYROLL RECONCILIATION SUBTAB                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {subTab === 'reconciliation' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Payroll Deduction Reconciliation Ledger</h3>
              <p className="text-xs text-gray-500">
                Audit view reconciling Gross Salary, LOP, Advance Recoveries, Loan EMIs, Statutory, Deduction Caps, and Estimated Net Pay for {selectedPeriod}
              </p>
            </div>
            <Badge variant="emerald">100% Balanced & Reconciled</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-2.5">Employee</th>
                  <th className="p-2.5 font-mono">Gross Pay</th>
                  <th className="p-2.5 font-mono text-rose-700">LOP Loss</th>
                  <th className="p-2.5 font-mono text-rose-700">Advance</th>
                  <th className="p-2.5 font-mono text-rose-700">Loan EMI</th>
                  <th className="p-2.5 font-mono text-gray-600">Statutory</th>
                  <th className="p-2.5 font-mono font-bold">Total Ded.</th>
                  <th className="p-2.5 font-mono text-amber-800">50% Cap</th>
                  <th className="p-2.5 font-mono font-black text-emerald-800">Net Pay</th>
                  <th className="p-2.5">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reconciliationRows.slice(0, 15).map(row => (
                  <tr key={row.employee_id} className="hover:bg-gray-50/70">
                    <td className="p-2.5 font-bold text-gray-900">
                      <div>{row.employee_name}</div>
                      <span className="text-[10px] text-gray-400 font-mono">{row.employee_code}</span>
                    </td>
                    <td className="p-2.5 font-mono font-bold text-gray-900">₹ {row.monthly_gross.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 font-mono text-rose-700">
                      {row.lop_deduction > 0 ? `₹ ${row.lop_deduction.toLocaleString('en-IN')} (${row.lop_days}d)` : '-'}
                    </td>
                    <td className="p-2.5 font-mono text-rose-700">
                      {row.advance_recovery > 0 ? `₹ ${row.advance_recovery.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="p-2.5 font-mono text-rose-700">
                      {row.loan_emi > 0 ? `₹ ${row.loan_emi.toLocaleString('en-IN')}` : '-'}
                    </td>
                    <td className="p-2.5 font-mono text-gray-600">₹ {row.statutory_deductions.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 font-mono font-bold text-rose-800">₹ {row.actual_applied_deductions.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 font-mono text-amber-800">₹ {row.permitted_deduction_cap.toLocaleString('en-IN')}</td>
                    <td className="p-2.5 font-mono font-black text-emerald-800 text-sm">
                      ₹ {row.estimated_net_pay.toLocaleString('en-IN')}
                    </td>
                    <td className="p-2.5">
                      {row.reconciliation_status === 'BALANCED' ? (
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                          Balanced
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                          Capped ({row.deferred_deductions} deferred)
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: DISBURSE NEW LOAN ACCOUNT                                    */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isLoanModalOpen && (
        <Modal
          isOpen={isLoanModalOpen}
          onClose={() => setIsLoanModalOpen(false)}
          title="Sanction & Disburse Employee Loan Account"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Select Employee *</label>
              <select
                value={loanEmpId}
                onChange={e => setLoanEmpId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
              >
                {salaries.map(s => (
                  <option key={s.id} value={s.employee_id}>
                    {s.employee_name} ({s.employee_code} - Gross: ₹{s.gross_monthly.toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Loan Category</label>
                <select
                  value={loanType}
                  onChange={e => setLoanType(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  <option value="Personal Emergency">Personal Emergency</option>
                  <option value="Salary-Linked Loan">Salary-Linked Loan</option>
                  <option value="Equipment / Asset Loan">Equipment / Asset Loan</option>
                  <option value="Festival Advance">Festival Advance</option>
                  <option value="Medical Assistance">Medical Assistance</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Principal Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="0"
                  value={loanPrincipal === 0 ? '' : loanPrincipal}
                  onChange={e => setLoanPrincipal(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Interest Method</label>
                <select
                  value={loanInterestMethod}
                  onChange={e => setLoanInterestMethod(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  <option value="INTEREST_FREE">Interest Free</option>
                  <option value="REDUCING_BALANCE">Reducing Balance</option>
                  <option value="FLAT_RATE">Flat Rate</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Annual Interest Rate (%)</label>
                <input
                  type="number"
                  disabled={loanInterestMethod === 'INTEREST_FREE'}
                  value={loanInterestMethod === 'INTEREST_FREE' ? 0 : loanInterestRate}
                  onChange={e => setLoanInterestRate(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Tenure (Months)</label>
                <input
                  type="number"
                  value={loanTenure}
                  onChange={e => setLoanTenure(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">EMI Start Period</label>
                <select
                  value={loanStartPeriod}
                  onChange={e => setLoanStartPeriod(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  <option value="2026-10">October 2026</option>
                  <option value="2026-11">November 2026</option>
                  <option value="2026-12">December 2026</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Reason / Notes</label>
                <input
                  type="text"
                  value={loanReason}
                  onChange={e => setLoanReason(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
                />
              </div>
            </div>

            {/* Live Calculation Preview */}
            <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Calculated Monthly EMI:</span>
                <span className="font-mono font-bold text-rose-700">₹ {modalEmiPreview.monthlyEmi.toLocaleString('en-IN')} / mo</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Total Interest Accrued:</span>
                <span className="font-mono font-bold text-gray-800">₹ {modalEmiPreview.totalInterest.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between border-t border-emerald-200 pt-1 font-bold">
                <span>Total Repayable:</span>
                <span className="font-mono text-emerald-900">₹ {modalEmiPreview.totalRepayable.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsLoanModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleCreateLoan} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold">
                Disburse & Save to Supabase
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: DISBURSE SALARY ADVANCE                                      */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {isAdvanceModalOpen && (
        <Modal
          isOpen={isAdvanceModalOpen}
          onClose={() => setIsAdvanceModalOpen(false)}
          title="Sanction & Disburse Salary Advance"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Select Employee *</label>
              <select
                value={advEmpId}
                onChange={e => setAdvEmpId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
              >
                {salaries.map(s => (
                  <option key={s.id} value={s.employee_id}>
                    {s.employee_name} ({s.employee_code} - Gross: ₹{s.gross_monthly.toLocaleString('en-IN')})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Advance Amount (₹) *</label>
                <input
                  type="number"
                  placeholder="0"
                  value={advAmount === 0 ? '' : advAmount}
                  onChange={e => setAdvAmount(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Recovery Payroll Period</label>
                <select
                  value={advPeriod}
                  onChange={e => setAdvPeriod(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold"
                >
                  <option value="2026-10">October 2026</option>
                  <option value="2026-11">November 2026</option>
                  <option value="2026-12">December 2026</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Reason / Justification</label>
              <input
                type="text"
                value={advReason}
                onChange={e => setAdvReason(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsAdvanceModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleCreateAdvance} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold">
                Sanction & Save to Supabase
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* MODAL: AMORTIZATION SCHEDULE VIEWER                                 */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {selectedAmortizationLoan && (
        <Modal
          isOpen={!!selectedAmortizationLoan}
          onClose={() => setSelectedAmortizationLoan(null)}
          title={`Loan Amortization Schedule: ${selectedAmortizationLoan.loan_code} (${selectedAmortizationLoan.employee_name})`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-xl">
              <div>
                <span className="text-gray-400 block text-[10px]">Principal</span>
                <span className="font-mono font-bold text-gray-900">₹ {selectedAmortizationLoan.principal_amount.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Monthly EMI</span>
                <span className="font-mono font-bold text-rose-700">₹ {selectedAmortizationLoan.monthly_emi.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Tenure</span>
                <span className="font-bold text-gray-900">{selectedAmortizationLoan.tenure_months} Months</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Balance Due</span>
                <span className="font-mono font-bold text-amber-800">₹ {selectedAmortizationLoan.balance_amount.toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto border border-gray-100 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold sticky top-0">
                  <tr>
                    <th className="p-2">#</th>
                    <th className="p-2">Period</th>
                    <th className="p-2 font-mono">Opening</th>
                    <th className="p-2 font-mono">Principal</th>
                    <th className="p-2 font-mono">Interest</th>
                    <th className="p-2 font-mono">Total EMI</th>
                    <th className="p-2 font-mono">Closing</th>
                    <th className="p-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {DeductionPolicyEngine.generateAmortizationSchedule(
                    selectedAmortizationLoan.id,
                    selectedAmortizationLoan.employee_id,
                    selectedAmortizationLoan.principal_amount,
                    selectedAmortizationLoan.annual_interest_rate,
                    selectedAmortizationLoan.tenure_months,
                    selectedAmortizationLoan.emi_start_period,
                    selectedAmortizationLoan.interest_method
                  ).map(s => (
                    <tr key={s.installment_number} className="hover:bg-gray-50">
                      <td className="p-2 font-bold">{s.installment_number}</td>
                      <td className="p-2 font-mono">{s.payroll_period}</td>
                      <td className="p-2 font-mono">₹ {s.opening_balance.toLocaleString('en-IN')}</td>
                      <td className="p-2 font-mono text-emerald-800">₹ {s.principal_component.toLocaleString('en-IN')}</td>
                      <td className="p-2 font-mono text-amber-800">₹ {s.interest_component.toLocaleString('en-IN')}</td>
                      <td className="p-2 font-mono font-bold text-rose-700">₹ {s.total_installment_amount.toLocaleString('en-IN')}</td>
                      <td className="p-2 font-mono font-bold">₹ {s.closing_balance.toLocaleString('en-IN')}</td>
                      <td className="p-2">
                        <Badge variant="emerald">{s.recovery_status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <Button size="sm" variant="outline" onClick={() => setSelectedAmortizationLoan(null)}>
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
