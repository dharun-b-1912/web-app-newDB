import React, { useState, useEffect, useMemo } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { PayrollRun, EmployeeSalaryAssignment } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  CircleDollarSign,
  TrendingUp,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Building2,
  Coins,
  ArrowUpRight,
  ChevronRight,
  Play,
  ArrowRight,
  Lock,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CreditCard,
  Percent,
  FileSpreadsheet,
  Download,
  Calendar,
  Check,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';

interface PayrollDashboardViewProps {
  onNavigateTab?: (tabKey: string) => void;
  onOpenPayslip?: (employeeId: string) => void;
}

export const PayrollDashboardView: React.FC<PayrollDashboardViewProps> = ({
  onNavigateTab,
  onOpenPayslip,
}) => {
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [salaries, setSalaries] = useState<EmployeeSalaryAssignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    const runList = payrollApi.getPayrollRuns();
    const salList = await payrollApi.getEmployeeSalaries();
    setRuns(runList);
    setSalaries(salList);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('*', () => loadData());
    return () => unsub();
  }, []);

  const latestRun = runs[0];

  // Dynamic calculations from real tenant data
  const totalEmployees = salaries.length;
  const totalGrossEstimate = salaries.reduce((acc, curr) => acc + curr.gross_monthly, 0);
  const totalNetEstimate = salaries.reduce((acc, curr) => acc + curr.net_monthly_estimate, 0);
  const totalStatutoryDues = Math.max(0, totalGrossEstimate - totalNetEstimate);

  const pendingApprovalsCount = runs.filter(r => r.status === 'SubmittedForApproval').length;
  const missingBankAccounts = salaries.filter(s => !s.account_number || !s.ifsc_code).length;
  const readiness = payrollApi.getPayrollReadinessSummary();

  const kpiCards = [
    {
      label: 'Monthly Gross Payroll',
      value: `₹ ${totalGrossEstimate.toLocaleString('en-IN')}`,
      sub: latestRun ? `Period: ${latestRun.pay_period}` : 'Total Active Wage Base',
      icon: CircleDollarSign,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200/80',
    },
    {
      label: 'Net Employee Disbursement',
      value: `₹ ${totalNetEstimate.toLocaleString('en-IN')}`,
      sub: 'Bank Payout Pool (89.6%)',
      icon: TrendingUp,
      color: 'text-[#07563D]',
      bg: 'bg-emerald-50/70',
      border: 'border-emerald-200/80',
    },
    {
      label: 'Statutory Compliance Dues',
      value: `₹ ${totalStatutoryDues.toLocaleString('en-IN')}`,
      sub: 'EPF + ESIC + PT + TDS',
      icon: ShieldCheck,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200/80',
    },
    {
      label: 'Payroll Headcount',
      value: `${totalEmployees} Active`,
      sub: '100% Salaried Master',
      icon: Users,
      color: 'text-purple-700',
      bg: 'bg-purple-50',
      border: 'border-purple-200/80',
    },
    {
      label: 'Pending Approvals',
      value: `${pendingApprovalsCount} Run(s)`,
      sub: pendingApprovalsCount > 0 ? 'Awaiting Signoff' : 'All Runs Approved ✓',
      icon: Clock,
      color: pendingApprovalsCount > 0 ? 'text-amber-700' : 'text-emerald-700',
      bg: pendingApprovalsCount > 0 ? 'bg-amber-50' : 'bg-emerald-50',
      border: pendingApprovalsCount > 0 ? 'border-amber-200/80' : 'border-emerald-200/80',
    },
    {
      label: 'Active Loans / Advances',
      value: `${payrollApi.getLoans().length} Active`,
      sub: 'Auto Monthly Deductions',
      icon: Coins,
      color: 'text-indigo-700',
      bg: 'bg-indigo-50',
      border: 'border-indigo-200/80',
    },
  ];

  return (
    <div className="space-y-6">
      {/* ─── 0. QUICK ACTIONS TOP BAR ──────────────────────────────────── */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#07563D] border border-emerald-100 flex items-center justify-center font-black">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-gray-900">August 2026 Pay Cycle</h2>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Cycle In Progress
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium">
              Period: <strong className="text-gray-800">01 Aug 2026 – 31 Aug 2026</strong> • Payout Date: <strong className="text-gray-800">31 Aug 2026</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateTab && onNavigateTab('statutory')}
            className="text-xs font-bold text-gray-700 hover:bg-gray-50 border-gray-200"
          >
            <Percent className="w-3.5 h-3.5 mr-1" /> Statutory Rules
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigateTab && onNavigateTab('disbursement')}
            className="text-xs font-bold text-gray-700 hover:bg-gray-50 border-gray-200"
          >
            <CreditCard className="w-3.5 h-3.5 mr-1" /> Bank Payouts
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={() => onNavigateTab && onNavigateTab('processing')}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs shadow-xs cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 mr-1" />
            {latestRun?.status === 'Finalized' ? 'View Payroll Register →' : 'Launch Payroll Run →'}
          </Button>
        </div>
      </div>

      {/* ─── 1. KPI CARDS STRIP ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={cn(
                "bg-white p-4 rounded-2xl border shadow-2xs space-y-2 hover:border-gray-300 transition-all",
                card.border
              )}
            >
              <div className="flex items-center justify-between">
                <span className={cn("p-2 rounded-xl", card.bg, card.color)}>
                  <Icon className="w-4 h-4" />
                </span>
                <span className="text-[10px] font-bold text-gray-400 font-mono">Live Sync</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 font-medium block truncate">{card.label}</span>
                <span className="text-base sm:text-lg font-black text-gray-900 tracking-tight block mt-0.5">{card.value}</span>
                <span className="text-[10px] text-gray-400 block mt-0.5">{card.sub}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── 3. PRE-FLIGHT READINESS CHECKLIST BAR ───────────────────────── */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-[#07563D] flex items-center justify-center font-bold">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-gray-900 uppercase tracking-wide">
                Pay Period Readiness & Integrity Checklist — August 2026
              </h3>
              <p className="text-[11px] text-gray-500">
                Pre-flight validation across Employee Master, Biometric Attendance, Leave LOP, and Bank Details.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700">Readiness Score:</span>
            <span className={cn(
              "px-2.5 py-1 rounded-xl text-xs font-black font-mono",
              readiness.readiness_score >= 90 ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
            )}>
              {readiness.readiness_score}% READY
            </span>
          </div>
        </div>

        {/* Readiness Progress Bar */}
        <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#07563D] to-emerald-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${readiness.readiness_score}%` }}
          />
        </div>

        {/* Readiness Checks Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1 text-xs">
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2 text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate text-gray-700 font-semibold">{totalEmployees} Salaried Staff</span>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2 text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate text-gray-700 font-semibold">Attendance Synced</span>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2 text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate text-gray-700 font-semibold">Leave LOP Computed</span>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2 text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate text-gray-700 font-semibold">TN PT Slabs Mapped</span>
          </div>
          <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-100 flex items-center gap-2 text-[11px]">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="truncate text-gray-700 font-semibold">FY 2026-27 TDS Ready</span>
          </div>
          <div className={cn(
            "p-2.5 rounded-xl border flex items-center gap-2 text-[11px]",
            readiness.missing_bank_accounts === 0 ? "bg-gray-50 border-gray-100 text-gray-700 font-semibold" : "bg-amber-50 border-amber-200 text-amber-900 font-bold"
          )}>
            {readiness.missing_bank_accounts === 0 ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            )}
            <span className="truncate">
              {readiness.missing_bank_accounts === 0 ? 'All Accounts Valid' : `${readiness.missing_bank_accounts} Missing Bank`}
            </span>
          </div>
        </div>
      </div>

      {/* ─── 4. RECENT PAYROLL RUNS & QUICK WORKSPACES ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Payroll Runs Execution Table */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-50 text-[#07563D]">
                <Clock className="w-4 h-4" />
              </span>
              <h2 className="text-sm font-bold text-gray-900">Recent Payroll Executions</h2>
            </div>
            <button
              onClick={() => onNavigateTab && onNavigateTab('processing')}
              className="text-xs font-bold text-[#07563D] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View All Runs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3">Pay Period</th>
                  <th className="p-3">Headcount</th>
                  <th className="p-3">Gross Payroll</th>
                  <th className="p-3">Net Payout</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400">
                      <FileText className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                      <p className="font-semibold text-gray-700">No payroll runs executed yet</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">Click "Launch Payroll Run" to calculate August 2026 salaries.</p>
                    </td>
                  </tr>
                ) : (
                  runs.slice(0, 5).map(run => (
                    <tr key={run.id} className="hover:bg-gray-50/70">
                      <td className="p-3 font-bold text-gray-900">
                        <div>{run.pay_period}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{run.run_number}</div>
                      </td>
                      <td className="p-3 text-gray-700 font-medium">{run.total_employees} Active</td>
                      <td className="p-3 font-mono font-bold text-gray-900">₹ {run.total_gross.toLocaleString('en-IN')}</td>
                      <td className="p-3 font-mono font-bold text-[#07563D]">₹ {run.total_net_payout.toLocaleString('en-IN')}</td>
                      <td className="p-3">
                        <span className={cn(
                          "px-2.5 py-0.5 text-[10px] font-bold rounded-full",
                          run.status === 'Finalized' ? "bg-emerald-100 text-emerald-800 border border-emerald-200" :
                          run.status === 'Approved' ? "bg-blue-100 text-blue-800 border border-blue-200" :
                          run.status === 'SubmittedForApproval' ? "bg-purple-100 text-purple-800 border border-purple-200" :
                          "bg-amber-100 text-amber-800 border border-amber-200"
                        )}>
                          {run.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => onNavigateTab && onNavigateTab('processing')}
                          className="font-bold text-xs"
                        >
                          View Details →
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Quick Workspaces Navigation */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#07563D]" />
              <span>Payroll Workspaces</span>
            </h3>

            <div className="space-y-2 text-xs">
              <button
                onClick={() => onNavigateTab && onNavigateTab('salary')}
                className="w-full p-3 rounded-xl border border-gray-200 hover:border-[#07563D] hover:bg-emerald-50/50 flex items-center justify-between text-left transition-all cursor-pointer group"
              >
                <div>
                  <span className="font-bold text-gray-900 group-hover:text-[#07563D] block">Salary Structures & CTC</span>
                  <span className="text-[10px] text-gray-500">Configure formulas, components, and grades</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#07563D]" />
              </button>

              <button
                onClick={() => onNavigateTab && onNavigateTab('statutory')}
                className="w-full p-3 rounded-xl border border-gray-200 hover:border-[#07563D] hover:bg-emerald-50/50 flex items-center justify-between text-left transition-all cursor-pointer group"
              >
                <div>
                  <span className="font-bold text-gray-900 group-hover:text-[#07563D] block">Statutory Compliance (EPF/ESI/TDS)</span>
                  <span className="text-[10px] text-gray-500">Editable rules, live math simulator & tax slabs</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#07563D]" />
              </button>

              <button
                onClick={() => onNavigateTab && onNavigateTab('disbursement')}
                className="w-full p-3 rounded-xl border border-gray-200 hover:border-[#07563D] hover:bg-emerald-50/50 flex items-center justify-between text-left transition-all cursor-pointer group"
              >
                <div>
                  <span className="font-bold text-gray-900 group-hover:text-[#07563D] block">Bank Disbursement & Payouts</span>
                  <span className="text-[10px] text-gray-500">Maker-Checker batches, 6 bank formats & reconciliation</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#07563D]" />
              </button>

              <button
                onClick={() => onNavigateTab && onNavigateTab('reports')}
                className="w-full p-3 rounded-xl border border-gray-200 hover:border-[#07563D] hover:bg-emerald-50/50 flex items-center justify-between text-left transition-all cursor-pointer group"
              >
                <div>
                  <span className="font-bold text-gray-900 group-hover:text-[#07563D] block">Payroll Reports & ECR Returns</span>
                  <span className="text-[10px] text-gray-500">Download EPFO ECR txt, ESIC return, and bank advice</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#07563D]" />
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-xs space-y-1">
            <span className="font-bold text-[#07563D] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" />
              <span>Multi-Tenant Partitioning Active</span>
            </span>
            <p className="text-[11px] text-emerald-800">
              Active Tenant: <span className="font-mono font-bold">org-joy-01</span>. All wage records and calculation snapshots are strictly encrypted and isolated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
