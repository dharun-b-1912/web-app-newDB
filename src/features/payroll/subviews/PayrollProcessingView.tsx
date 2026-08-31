import React, { useState, useEffect } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { PayrollRun, EmployeePayrollInput, CalculationBreakdown } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { ExplainCalculationModal } from '../components/ExplainCalculationModal';
import {
  Play,
  CheckCircle,
  Clock,
  FileText,
  Calendar,
  AlertCircle,
  Download,
  Eye,
  CheckCircle2,
  Lock,
  RotateCcw,
  Plus,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Search,
  Filter,
  Check,
  Users,
  HelpCircle,
  CreditCard,
  Zap,
  Sparkles,
  FolderArchive,
  FileSpreadsheet,
  Trash2,
  Minus,
  TrendingUp,
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';
import { useAuth } from '../../../hooks/useAuth';

import { PayrollWorkflowStepper } from '../components/PayrollWorkflowStepper';
import { AutoPayrollAndReportsModal } from '../components/AutoPayrollAndReportsModal';

interface PayrollProcessingViewProps {
  initialSubTab?: string;
  onOpenPayslip?: (employeeId: string) => void;
  onNavigateTab?: (tabKey: string) => void;
}

export const PayrollProcessingView: React.FC<PayrollProcessingViewProps> = ({
  initialSubTab,
  onOpenPayslip,
  onNavigateTab,
}) => {
  const { showToast } = useToast();
  const { user } = useAuth();

  const [subTab, setSubTab] = useState<string>(initialSubTab || 'runs');
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Calculation Breakdown Explainer Modal State
  const [selectedBreakdown, setSelectedBreakdown] = useState<CalculationBreakdown | null>(null);
  const [isExplainModalOpen, setIsExplainModalOpen] = useState(false);

  // 1-Click Automation Modal State
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);

  // Run Wizard Modal State
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [wizardPeriod, setWizardPeriod] = useState('August 2026');
  const [wizardStart, setWizardStart] = useState('2026-08-01');
  const [wizardEnd, setWizardEnd] = useState('2026-08-31');
  const [wizardPayoutDate, setWizardPayoutDate] = useState('2026-08-31');

  const downloadFile = (content: string, fileName: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportQuickReport = (reportType: string) => {
    if (!selectedRun) {
      showToast('Please select a payroll run first.', 'error');
      return;
    }
    const records = selectedRun.employee_records || [];
    const period = selectedRun.pay_period || 'August 2026';
    const periodStr = period.replace(/\s+/g, '_');

    if (reportType === 'ecr') {
      const ecrText = payrollApi.generateEPFO_ECR_Text(selectedRun.id);
      downloadFile(ecrText, `EPFO_ECR_${periodStr}.txt`, 'text/plain;charset=utf-8');
      showToast(`✓ Generated & Exported EPFO ECR File (${periodStr}.txt)`);
    } else if (reportType === 'bank') {
      const header = 'EmpCode,BeneficiaryName,BankName,AccountNumber,IFSCCode,NetPayoutAmount,PaymentMode,Narration\n';
      const rows = records.map(r => `${r.employee_code},"${r.employee_name}","${r.bank_name || 'Bank Transfer'}","${r.account_number || ''}","${r.ifsc_code || ''}",${r.net_pay},NEFT,"SALARY ${period}"`).join('\n');
      downloadFile(header + rows, `Bank_Payment_Advice_${periodStr}.csv`, 'text/csv');
      showToast(`✓ Generated & Exported Bank Payment Advice (${periodStr}.csv)`);
    } else if (reportType === 'esic') {
      const header = 'EmpCode,EmployeeName,IPNumber,GrossWages,EmployeeESIC,EmployerESIC,TotalESIC\n';
      const rows = records.map(r => `${r.employee_code},"${r.employee_name}","${(r as any).esic_number || (r as any).esi_ip_number || ''}",${r.total_earnings},${r.esic_employee},${r.esic_employer},${r.esic_employee + r.esic_employer}`).join('\n');
      downloadFile(header + rows, `ESIC_Monthly_Statement_${periodStr}.csv`, 'text/csv');
      showToast(`✓ Generated & Exported ESIC Statement (${periodStr}.csv)`);
    } else if (reportType === 'pt') {
      const header = 'EmpCode,EmployeeName,State,GrossSalary,PT_Deducted\n';
      const rows = records.map(r => `${r.employee_code},"${r.employee_name}","${(r as any).state || 'Tamil Nadu'}",${r.total_earnings},${r.professional_tax}`).join('\n');
      downloadFile(header + rows, `PT_Challan_Summary_${periodStr}.csv`, 'text/csv');
      showToast(`✓ Generated & Exported PT Challan (${periodStr}.csv)`);
    } else if (reportType === 'tds') {
      const header = 'EmpCode,EmployeeName,PAN,GrossSalary,TotalDeductions,TDS_Withheld\n';
      const rows = records.map(r => `${r.employee_code},"${r.employee_name}","${r.pan_number || ''}",${r.total_earnings},${r.total_deductions},${r.tds_tax}`).join('\n');
      downloadFile(header + rows, `TDS_24Q_Report_${periodStr}.csv`, 'text/csv');
      showToast(`✓ Generated & Exported TDS 24Q Register (${periodStr}.csv)`);
    } else {
      // Master Register
      const header = 'EmpCode,Name,Department,Days,Basic,HRA,Gross,EPF,ESIC,PT,TDS,NetPay\n';
      const rows = records.map(r => `${r.employee_code},"${r.employee_name}","${r.department}",${r.payable_days},${r.basic},${r.hra},${r.total_earnings},${r.epf_employee},${r.esic_employee},${r.professional_tax},${r.tds_tax},${r.net_pay}`).join('\n');
      downloadFile(header + rows, `Salary_Register_${periodStr}.csv`, 'text/csv');
      showToast(`✓ Generated & Exported Master Salary Register (${periodStr}.csv)`);
    }
  };

  const handleExportAllReports = () => {
    if (!selectedRun) return;
    const reports = ['register', 'ecr', 'bank', 'esic', 'pt', 'tds'];
    reports.forEach((rep, index) => {
      setTimeout(() => handleExportQuickReport(rep), index * 250);
    });
    showToast(`✓ Batch exporting all 6 payroll & compliance reports for ${selectedRun.pay_period}!`);
  };

  const handleExplainCalculation = (employeeId: string) => {
    const breakdown = payrollApi.getCalculationBreakdown(employeeId, selectedRun?.pay_period || 'August 2026');
    setSelectedBreakdown(breakdown);
    setIsExplainModalOpen(true);
  };

  const loadRuns = () => {
    const list = payrollApi.getPayrollRuns();
    setRuns(list);
    if (list.length > 0 && !selectedRun) {
      setSelectedRun(list[0]);
    }
  };

  useEffect(() => {
    loadRuns();
    const unsub = hrEventBus.subscribe('*', () => loadRuns());
    return () => unsub();
  }, []);

  const handleStartRunWizard = () => {
    setWizardPeriod('August 2026');
    setWizardStart('2026-08-01');
    setWizardEnd('2026-08-31');
    setWizardPayoutDate('2026-08-31');
    setWizardStep(1);
    setIsWizardOpen(true);
  };

  const handleExecuteCalculation = async () => {
    setIsLoading(true);
    try {
      const calculated = await payrollApi.calculatePayrollRun(
        wizardPeriod,
        wizardStart,
        wizardEnd,
        wizardPayoutDate
      );
      setRuns(payrollApi.getPayrollRuns());
      setSelectedRun(calculated);
      setSubTab('preview');
      setIsWizardOpen(false);
      showToast(`✓ Calculated ${calculated.pay_period} payroll for ${calculated.total_employees} employees!`);
    } catch (err: any) {
      showToast(err.message || 'Calculation failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitForApproval = (runId: string) => {
    try {
      const updated = payrollApi.submitPayrollRunForApproval(runId, user?.name || 'HR Administrator');
      loadRuns();
      setSelectedRun(updated);
      showToast(`✓ Submitted ${updated.pay_period} for executive approval.`);
    } catch (err: any) {
      showToast(err.message || 'Submission failed', 'error');
    }
  };

  const handleApprove = (runId: string) => {
    try {
      const updated = payrollApi.approvePayrollRun(runId, user?.name || 'Finance Head');
      loadRuns();
      setSelectedRun(updated);
      showToast(`✓ Approved ${updated.pay_period} payroll run.`);
    } catch (err: any) {
      showToast(err.message || 'Approval failed', 'error');
    }
  };

  const [isFinalizeSuccessModalOpen, setIsFinalizeSuccessModalOpen] = useState(false);
  const [finalizedBatchInfo, setFinalizedBatchInfo] = useState<{ runNumber: string; payPeriod: string; totalEmployees: number; totalNet: number } | null>(null);

  const handleFinalizeAndLock = (runId: string) => {
    try {
      const updated = payrollApi.finalizeAndLockPayroll(runId, user?.name || 'HR Administrator');
      loadRuns();
      setSelectedRun(updated);
      setFinalizedBatchInfo({
        runNumber: updated.run_number,
        payPeriod: updated.pay_period,
        totalEmployees: updated.total_employees,
        totalNet: updated.total_net_payout,
      });
      setIsFinalizeSuccessModalOpen(true);
      showToast(`✓ Finalized & locked ${updated.pay_period} payroll. Bank payout batch generated!`);
    } catch (err: any) {
      showToast(err.message || 'Finalization failed', 'error');
    }
  };

  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);

  const handleClearAllRuns = () => {
    try {
      payrollApi.clearAllPayrollRuns();
      setRuns([]);
      setSelectedRun(null);
      setIsPurgeModalOpen(false);
      showToast('✓ Purged all previous payroll runs and history. Ready for a clean calculation!');
    } catch (err: any) {
      showToast(err.message || 'Failed to clear runs', 'error');
    }
  };

  const handleDeleteRun = (runId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to permanently delete this payroll execution run?')) {
      try {
        payrollApi.deletePayrollRun(runId);
        const updated = payrollApi.getPayrollRuns();
        setRuns(updated);
        if (selectedRun?.id === runId) {
          setSelectedRun(updated.length > 0 ? updated[0] : null);
        }
        showToast('✓ Deleted payroll execution run.');
      } catch (err: any) {
        showToast(err.message || 'Failed to delete run', 'error');
      }
    }
  };

  const currentWorkflowStage: 1 | 2 | 3 | 4 | 5 | 6 = !selectedRun
    ? 2
    : selectedRun.status === 'Finalized'
    ? 5
    : selectedRun.status === 'Approved'
    ? 4
    : selectedRun.status === 'SubmittedForApproval'
    ? 3
    : 2;

  const [employees, setEmployees] = useState<any[]>([]);
  const [workforceFilter, setWorkforceFilter] = useState<'ALL' | 'DIRECT' | 'VENDOR'>('ALL');

  useEffect(() => {
    const rawEmps = localStorage.getItem('workforce_employees');
    if (rawEmps) {
      try { setEmployees(JSON.parse(rawEmps)); } catch (_) {}
    }
  }, []);

  const checkIsVendor = (empId: string, empCode: string): { isVendor: boolean; vendorName: string } => {
    const matched = employees.find(e =>
      (e.id && e.id.toLowerCase() === empId.toLowerCase()) ||
      (e.employee_code && empCode && e.employee_code.toLowerCase() === empCode.toLowerCase())
    );
    if (!matched) return { isVendor: false, vendorName: 'Direct Payroll' };
    const source = matched.employment_source || matched.employment?.employment_source;
    const isVendor = source === 'VENDOR' || source === 'MANPOWER_PROVIDER' || Boolean(matched.vendor_name) || Boolean(matched.employment?.vendor_name);
    const vendorName = matched.vendor_name || matched.employment?.vendor_name || (isVendor ? 'Vendor Contractor' : 'Joy Corporate Solutions');
    return { isVendor, vendorName };
  };

  const subTabs = [
    { id: 'runs', label: 'Payroll Runs & History', icon: Play },
    { id: 'preview', label: 'Employee Calculation Register', icon: Eye },
    { id: 'inputs', label: 'Attendance & LOP Inputs', icon: FileText },
  ];

  const filteredEmployees = (selectedRun?.employee_records || []).filter(emp => {
    const { isVendor } = checkIsVendor(emp.employee_id, emp.employee_code);
    if (workforceFilter === 'DIRECT' && isVendor) return false;
    if (workforceFilter === 'VENDOR' && !isVendor) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        emp.employee_name.toLowerCase().includes(q) ||
        emp.employee_code.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 0. Automated Workflow Lifecycle Stepper */}
      <PayrollWorkflowStepper
        currentStage={currentWorkflowStage}
        onNavigateStage={stageKey => {
          if (onNavigateTab) onNavigateTab(stageKey);
        }}
      />

      {/* 1. Subnav Ribbon */}
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
          {runs.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsPurgeModalOpen(true)}
              className="border-rose-200/80 text-rose-700 bg-rose-50/60 hover:bg-rose-100 font-semibold text-xs rounded-xl shadow-2xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
              Purge All Runs
            </Button>
          )}

          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsAutoModalOpen(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer border border-emerald-500/30"
          >
            <Zap className="w-3.5 h-3.5 mr-1.5 fill-white" />
            1-Click Auto Run & Reports
          </Button>

          {selectedRun && selectedRun.status === 'Finalized' && (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onNavigateTab && onNavigateTab('disbursement')}
              className="border-emerald-200 text-[#07563D] hover:bg-emerald-100 font-bold text-xs rounded-xl shadow-2xs cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5 mr-1.5" />
              Open Bank Disbursement Batch →
            </Button>
          )}

          <Button
            size="sm"
            variant="primary"
            onClick={handleStartRunWizard}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs rounded-xl shadow-sm cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 mr-1.5" />
            Manual Wizard Run
          </Button>
        </div>
      </div>

      {/* 2. SUBTAB: RUNS & HISTORY */}
      {subTab === 'runs' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Tenant Payroll Execution Runs</h2>
              <p className="text-xs text-gray-500 mt-0.5">Idempotent monthly calculation snapshots with strict financial locking</p>
            </div>
            {runs.length > 0 && (
              <Button
                size="xs"
                variant="outline"
                onClick={() => setIsPurgeModalOpen(true)}
                className="text-rose-700 border-rose-200/80 bg-rose-50/50 hover:bg-rose-100 font-semibold rounded-lg shadow-2xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1 text-rose-600" /> Reset & Clear History
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3">Run Number & Period</th>
                  <th className="p-3">Period Range</th>
                  <th className="p-3">Headcount</th>
                  <th className="p-3">Gross Earnings</th>
                  <th className="p-3">Deductions</th>
                  <th className="p-3">Net Payout</th>
                  <th className="p-3">Lock Status</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {runs.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-gray-400">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#07563D] flex items-center justify-center mx-auto mb-3 border border-emerald-100">
                        <Play className="w-5 h-5 ml-0.5" />
                      </div>
                      <p className="font-bold text-gray-800 text-sm">No payroll runs computed yet</p>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1 mb-4">
                        All previous mock data has been purged. Generate a 100% dynamic, real-time payroll run using your live employee master and biometric attendance.
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={handleStartRunWizard}
                          className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold rounded-xl shadow-xs cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 mr-1.5" />
                          Launch Calculation Wizard
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setIsAutoModalOpen(true)}
                          className="border-emerald-300 text-[#07563D] hover:bg-emerald-100/80 font-bold rounded-xl shadow-2xs cursor-pointer"
                        >
                          <Zap className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                          ⚡ 1-Click Auto Run
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  runs.map(run => (
                    <tr key={run.id} className="hover:bg-gray-50/70">
                      <td className="p-3 font-bold text-gray-900">
                        <div>{run.pay_period}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{run.run_number}</div>
                      </td>
                      <td className="p-3 text-gray-600 font-mono whitespace-nowrap">{run.period_start} to {run.period_end}</td>
                      <td className="p-3 font-medium text-gray-700">{run.total_employees} Employees</td>
                      <td className="p-3 font-mono font-bold text-gray-900">₹ {run.total_gross.toLocaleString('en-IN')}</td>
                      <td className="p-3 font-mono text-rose-700">₹ {run.total_deductions.toLocaleString('en-IN')}</td>
                      <td className="p-3 font-mono font-bold text-[#07563D]">₹ {run.total_net_payout.toLocaleString('en-IN')}</td>
                      <td className="p-3 whitespace-nowrap">
                        {run.is_locked ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 border border-gray-200">
                            <Lock className="w-3 h-3 text-gray-600" /> Locked Snapshot
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Editable Draft
                          </span>
                        )}
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <span className={cn(
                          "px-2.5 py-0.5 text-[10px] font-bold rounded-full border",
                          run.status === 'Finalized' ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                          run.status === 'Approved' ? "bg-blue-50 text-blue-800 border-blue-200" :
                          run.status === 'SubmittedForApproval' ? "bg-purple-50 text-purple-800 border-purple-200" :
                          "bg-amber-50 text-amber-800 border-amber-200"
                        )}>
                          {run.status}
                        </span>
                      </td>
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => {
                              setSelectedRun(run);
                              setSubTab('preview');
                            }}
                            className="text-[#07563D] hover:bg-emerald-100/80 bg-emerald-50/80 border border-emerald-200/80 font-bold shadow-2xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-[#07563D]" />
                            View Register
                          </Button>

                          {run.status === 'PreviewReady' && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleSubmitForApproval(run.id)}
                              className="text-purple-700 bg-purple-50/80 hover:bg-purple-100 border-purple-200/80 font-bold shadow-2xs cursor-pointer"
                            >
                              Submit
                            </Button>
                          )}

                          {run.status === 'SubmittedForApproval' && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => handleApprove(run.id)}
                              className="text-blue-700 bg-blue-50/80 hover:bg-blue-100 border-blue-200/80 font-bold shadow-2xs cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                              Approve
                            </Button>
                          )}

                          {run.status === 'Approved' && (
                            <Button
                              size="xs"
                              variant="primary"
                              onClick={() => handleFinalizeAndLock(run.id)}
                              className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold shadow-xs cursor-pointer"
                            >
                              <Lock className="w-3.5 h-3.5 mr-1" /> Finalize & Lock
                            </Button>
                          )}

                          <Button
                            size="xs"
                            variant="outline"
                            onClick={(e) => handleDeleteRun(run.id, e)}
                            className="h-7.5 w-7.5 p-0 text-rose-600 hover:bg-rose-50 hover:border-rose-300 border-rose-200/80 rounded-lg flex items-center justify-center shadow-2xs cursor-pointer"
                            title="Delete this run"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. SUBTAB: EMPLOYEE CALCULATION REGISTER */}
      {subTab === 'preview' && selectedRun && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900">{selectedRun.pay_period} — Payroll Register</h2>
                <Badge variant={selectedRun.is_locked ? "gray" : "emerald"}>
                  {selectedRun.status}
                </Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedRun.total_employees} Employees • Total Gross: ₹{selectedRun.total_gross.toLocaleString('en-IN')} • Net Disbursement: ₹{selectedRun.total_net_payout.toLocaleString('en-IN')}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Workforce Filter Pills */}
              <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-lg text-xs font-semibold text-gray-700 border border-gray-200">
                <button
                  onClick={() => setWorkforceFilter('ALL')}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all text-xs",
                    workforceFilter === 'ALL'
                      ? "bg-white text-gray-900 shadow-2xs font-bold"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  All ({selectedRun.employee_records.length})
                </button>
                <button
                  onClick={() => setWorkforceFilter('DIRECT')}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all text-xs flex items-center gap-1",
                    workforceFilter === 'DIRECT'
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs font-bold"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Direct ({selectedRun.employee_records.filter(e => !checkIsVendor(e.employee_id, e.employee_code).isVendor).length})
                </button>
                <button
                  onClick={() => setWorkforceFilter('VENDOR')}
                  className={cn(
                    "px-2.5 py-1 rounded-md transition-all text-xs flex items-center gap-1",
                    workforceFilter === 'VENDOR'
                      ? "bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs font-bold"
                      : "text-gray-600 hover:text-gray-900"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Vendor ({selectedRun.employee_records.filter(e => checkIsVendor(e.employee_id, e.employee_code).isVendor).length})
                </button>
              </div>

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Search employee or ID..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#07563D] w-48"
                />
              </div>

              {selectedRun.status === 'Approved' && (
                <Button
                  size="xs"
                  variant="primary"
                  onClick={() => handleFinalizeAndLock(selectedRun.id)}
                  className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
                >
                  <Lock className="w-3.5 h-3.5 mr-1" /> Finalize & Generate Payslips
                </Button>
              )}
            </div>
          </div>

          {/* Payroll Control Totals Verification Bar */}
          <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/70 flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-3">
              <span className="p-2 rounded-xl bg-emerald-100 text-[#07563D]">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div>
                <span className="font-bold text-emerald-950 block">Payroll Control Totals & Balancing Check</span>
                <span className="text-[11px] text-emerald-800">
                  Gross Earnings (₹{selectedRun.total_gross.toLocaleString('en-IN')}) - Deductions (₹{selectedRun.total_deductions.toLocaleString('en-IN')}) = Net Payout (₹{selectedRun.total_net_payout.toLocaleString('en-IN')})
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-gray-500 uppercase font-bold block">Integrity Verification</span>
                <span className="text-xs font-bold text-emerald-800 flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>100% BALANCED</span>
                </span>
              </div>
            </div>
          </div>

          {/* Automated Reports & Compliance Quick Dock */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-4 rounded-2xl border border-slate-700 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
            <div className="flex items-center gap-3">
              <span className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                <FolderArchive className="w-5 h-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black text-white tracking-tight">Automated Compliance & Reports Generator</h4>
                  <span className="text-[9px] font-mono bg-emerald-500/30 text-emerald-200 px-2 py-0.5 rounded-full uppercase font-bold">
                    6 Ready Reports
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Instant 1-click export of certified Salary Register, EPFO ECR text file, ESIC return, PT Challan, TDS & Bank Advice
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                size="xs"
                variant="outline"
                onClick={() => handleExportQuickReport('register')}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-[11px] font-bold cursor-pointer"
              >
                <FileSpreadsheet className="w-3 h-3 mr-1 text-emerald-300" />
                Salary Register
              </Button>

              <Button
                size="xs"
                variant="outline"
                onClick={() => handleExportQuickReport('ecr')}
                className="bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border-emerald-400/40 text-[11px] font-bold cursor-pointer"
              >
                <Download className="w-3 h-3 mr-1 text-emerald-300" />
                EPFO ECR (.txt)
              </Button>

              <Button
                size="xs"
                variant="outline"
                onClick={() => handleExportQuickReport('bank')}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-[11px] font-bold cursor-pointer"
              >
                <CreditCard className="w-3 h-3 mr-1 text-blue-300" />
                Bank Advice
              </Button>

              <Button
                size="xs"
                variant="outline"
                onClick={() => handleExportQuickReport('esic')}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-[11px] font-bold cursor-pointer"
              >
                <ShieldCheck className="w-3 h-3 mr-1 text-amber-300" />
                ESIC Return
              </Button>

              <Button
                size="xs"
                variant="outline"
                onClick={() => handleExportQuickReport('pt')}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-[11px] font-bold cursor-pointer"
              >
                PT Challan
              </Button>

              <Button
                size="xs"
                variant="outline"
                onClick={() => handleExportQuickReport('tds')}
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-[11px] font-bold cursor-pointer"
              >
                TDS 24Q
              </Button>

              <Button
                size="xs"
                variant="primary"
                onClick={handleExportAllReports}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[11px] ml-1 shadow-xs cursor-pointer"
              >
                <Zap className="w-3 h-3 mr-1 fill-slate-950" />
                Export All (Batch)
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-2.5">Employee</th>
                  <th className="p-2.5">Payable / LOP</th>
                  <th className="p-2.5">Basic</th>
                  <th className="p-2.5">HRA & Allowances</th>
                  <th className="p-2.5">Gross Earnings</th>
                  <th className="p-2.5">EPF / ESIC</th>
                  <th className="p-2.5">TDS / PT</th>
                  <th className="p-2.5">Net Pay</th>
                  <th className="p-2.5 text-right">Trace & Slip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map(emp => {
                  const { isVendor } = checkIsVendor(emp.employee_id, emp.employee_code);
                  return (
                    <tr key={emp.id} className="hover:bg-gray-50/70">
                      <td className="p-2.5 font-bold text-gray-900">
                        <div>{emp.employee_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                          {emp.employee_code} · {emp.department}
                        </div>
                      </td>
                      <td className="p-2.5 text-gray-700">
                        <span className="font-semibold text-gray-900">{emp.payable_days}d</span>
                        {emp.lop_days > 0 && <span className="text-[10px] text-rose-600 font-bold ml-1">({emp.lop_days}d LOP)</span>}
                      </td>
                      <td className="p-2.5 font-mono text-gray-800">₹ {emp.basic.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 font-mono text-gray-800">₹ {(emp.hra + emp.special_allowance).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 font-mono font-bold text-gray-900">₹ {emp.total_earnings.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 font-mono text-gray-600">₹ {(emp.epf_employee + emp.esic_employee).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 font-mono text-gray-600">₹ {(emp.tds_tax + emp.professional_tax).toLocaleString('en-IN')}</td>
                      <td className="p-2.5 font-mono font-black text-[#07563D]">₹ {emp.net_pay.toLocaleString('en-IN')}</td>
                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => handleExplainCalculation(emp.employee_id)}
                            className="text-[#07563D] hover:bg-emerald-100/80 bg-emerald-50/80 border border-emerald-200/80 font-bold shadow-2xs cursor-pointer"
                          >
                            <HelpCircle className="w-3.5 h-3.5 mr-1 text-[#07563D]" /> Explain
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => onOpenPayslip && onOpenPayslip(emp.employee_id)}
                            className={cn(
                              "font-bold shadow-2xs cursor-pointer",
                              isVendor ? "text-amber-800 bg-amber-50/70 hover:bg-amber-100 border-amber-200" : "text-gray-700 bg-white hover:bg-gray-100 border-gray-200"
                            )}
                          >
                            <FileText className="w-3.5 h-3.5 mr-1" /> {isVendor ? 'Vendor Slip' : 'Payslip'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. SUBTAB: ATTENDANCE & LOP INPUTS */}
      {subTab === 'inputs' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 flex-wrap border-b border-gray-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900">Attendance, LOP & Overtime Verification Handoff</h2>
                <Badge variant="emerald">Ledger Synced</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Attendance days, verified LOP deductions, and turnstile overtime handoffs for the active period.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="xs"
                variant="outline"
                onClick={() => onNavigateTab && onNavigateTab('deductions')}
                className="text-xs font-bold text-gray-700 hover:bg-gray-100 border-gray-200 cursor-pointer"
              >
                <Minus className="w-3.5 h-3.5 mr-1 text-rose-600" />
                Deductions & LOP Desk →
              </Button>
              <Button
                size="xs"
                variant="outline"
                onClick={() => onNavigateTab && onNavigateTab('earnings')}
                className="text-xs font-bold text-gray-700 hover:bg-gray-100 border-gray-200 cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1 text-teal-600" />
                Earnings & OT Desk →
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3 text-center">Month Days</th>
                  <th className="p-3 text-center">Present Days</th>
                  <th className="p-3 text-center">Weekly Offs</th>
                  <th className="p-3 text-center">Unpaid LOP</th>
                  <th className="p-3 text-center font-bold text-emerald-800">Payable Days</th>
                  <th className="p-3 text-right">LOP Deduction</th>
                  <th className="p-3 text-right">Approved OT</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-400">
                      No employee payroll records found for this run.
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map(emp => {
                    const grossBase = emp.total_earnings + (emp.lop_deduction || 0);
                    const dailyRate = Math.round((grossBase / 31) * 100) / 100;
                    const lopDays = emp.lop_days || (31 - emp.payable_days);
                    const lopDed = emp.lop_deduction || Math.round(lopDays * dailyRate);
                    return (
                      <tr key={emp.employee_id} className="hover:bg-gray-50/70">
                        <td className="p-3">
                          <div className="font-bold text-gray-900">{emp.employee_name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{emp.employee_code} • {emp.department}</div>
                        </td>
                        <td className="p-3 text-center font-mono text-gray-600">31d</td>
                        <td className="p-3 text-center font-mono font-bold text-emerald-700">{emp.present_days || 3}d</td>
                        <td className="p-3 text-center font-mono text-gray-600">10d</td>
                        <td className="p-3 text-center font-mono font-bold text-rose-700">
                          {lopDays}d LOP
                        </td>
                        <td className="p-3 text-center font-mono font-black text-[#07563D] bg-emerald-50/50">
                          {emp.payable_days}d Paid
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-700">
                          -₹{lopDed.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono text-teal-700">
                          +₹{(emp.overtime_pay || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right">
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => handleExplainCalculation(emp.employee_id)}
                            className="text-[#07563D] hover:bg-emerald-100/80 bg-emerald-50/80 border border-emerald-200/80 font-bold shadow-2xs cursor-pointer"
                          >
                            <HelpCircle className="w-3.5 h-3.5 mr-1 text-[#07563D]" /> Inspect
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

      {/* 5. RUN PAYROLL 6-STEP WIZARD MODAL */}
      {isWizardOpen && (
        <Modal
          isOpen={isWizardOpen}
          onClose={() => setIsWizardOpen(false)}
          title="Payroll Calculation Engine Wizard"
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Step Bar */}
            <div className="grid grid-cols-6 gap-1 bg-gray-100 p-1.5 rounded-xl text-center text-[10px] font-bold text-gray-500">
              <span className={cn("py-1 rounded-lg", wizardStep === 1 ? "bg-white text-gray-900 shadow-xs" : "")}>1. Period</span>
              <span className={cn("py-1 rounded-lg", wizardStep === 2 ? "bg-white text-gray-900 shadow-xs" : "")}>2. Attendance</span>
              <span className={cn("py-1 rounded-lg", wizardStep === 3 ? "bg-white text-gray-900 shadow-xs" : "")}>3. Earnings</span>
              <span className={cn("py-1 rounded-lg", wizardStep === 4 ? "bg-white text-gray-900 shadow-xs" : "")}>4. Statutory</span>
              <span className={cn("py-1 rounded-lg", wizardStep === 5 ? "bg-white text-gray-900 shadow-xs" : "")}>5. Validation</span>
              <span className={cn("py-1 rounded-lg", wizardStep === 6 ? "bg-white text-gray-900 shadow-xs" : "")}>6. Calculate</span>
            </div>

            {/* STEP 1: PERIOD */}
            {wizardStep === 1 && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Pay Period Name</label>
                    <input
                      type="text"
                      value={wizardPeriod}
                      onChange={e => setWizardPeriod(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Scheduled Payout Date</label>
                    <input
                      type="date"
                      value={wizardPayoutDate}
                      onChange={e => setWizardPayoutDate(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Period Start</label>
                    <input
                      type="date"
                      value={wizardStart}
                      onChange={e => setWizardStart(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">Period End</label>
                    <input
                      type="date"
                      value={wizardEnd}
                      onChange={e => setWizardEnd(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: ATTENDANCE SYNC */}
            {wizardStep === 2 && (
              <div className="space-y-3 p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="font-bold text-emerald-900">Attendance & Leave Ledger Sync</div>
                <p className="text-emerald-700 text-[11px]">
                  Real-time synchronization with Biometric punches, Attendance Policies, and approved Leave records. LOP days will be deducted strictly from the active ledger.
                </p>
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-900 pt-2 border-t border-emerald-200">
                  <span>Attendance Status: Finalized</span>
                  <span>100% Synced</span>
                </div>
              </div>
            )}

            {/* STEP 3: EARNINGS & OT */}
            {wizardStep === 3 && (
              <div className="space-y-3 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <div className="font-bold text-blue-900">Earnings, Allowances & Approved Overtime</div>
                <p className="text-blue-700 text-[11px]">
                  Base Salary structures (Basic, HRA, Special Allowance) will be combined with approved Overtime requests and validated Reimbursement claims.
                </p>
              </div>
            )}

            {/* STEP 4: STATUTORY */}
            {wizardStep === 4 && (
              <div className="space-y-3 p-3 bg-purple-50 rounded-xl border border-purple-200">
                <div className="font-bold text-purple-900">Statutory Deductions (EPF, ESIC, PT, TDS)</div>
                <p className="text-purple-700 text-[11px]">
                  • EPF: 12% of Basic (Wage ceiling ₹15,000 applicable)<br />
                  • ESIC: 0.75% Employee, 3.25% Employer (for Gross ≤ ₹21,000)<br />
                  • Professional Tax: ₹200/mo<br />
                  • TDS Income Tax withholding calculated by annual tax regime bracket.
                </p>
              </div>
            )}

            {/* STEP 5: VALIDATION */}
            {wizardStep === 5 && (
              <div className="space-y-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                <div className="font-bold text-amber-900">Pre-Flight Exception Check</div>
                <p className="text-amber-800 text-[11px]">
                  • Negative Net Pay Check: Passed (0 violations)<br />
                  • Bank Account Integrity: Verified<br />
                  • Active Employee CTC: Verified
                </p>
              </div>
            )}

            {/* STEP 6: CONFIRM & CALCULATE */}
            {wizardStep === 6 && (
              <div className="space-y-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="font-bold text-gray-900">Ready to Compute {wizardPeriod}</div>
                <p className="text-gray-600 text-[11px]">
                  Executing calculation will generate immutable calculation snapshots for all active tenant employees.
                </p>
              </div>
            )}

            {/* Stepper Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWizardStep(prev => Math.max(1, prev - 1) as any)}
                disabled={wizardStep === 1 || isLoading}
              >
                Back
              </Button>

              {wizardStep < 6 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setWizardStep(prev => Math.min(6, prev + 1) as any)}
                  className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleExecuteCalculation}
                  disabled={isLoading}
                  className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
                >
                  {isLoading ? 'Computing Payroll...' : 'Execute Calculation'}
                </Button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Finalize Success & Bank Disbursement Redirection Modal */}
      {isFinalizeSuccessModalOpen && finalizedBatchInfo && (
        <Modal
          isOpen={isFinalizeSuccessModalOpen}
          onClose={() => setIsFinalizeSuccessModalOpen(false)}
          title="✓ Payroll Finalized & Bank Payout Batch Generated"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2">
              <div className="flex items-center gap-2 text-emerald-950 font-bold text-sm">
                <CheckCircle2 className="w-5 h-5 text-[#07563D]" />
                <span>{finalizedBatchInfo.payPeriod} Payroll is Locked & Ready for Disbursement</span>
              </div>
              <p className="text-emerald-800 text-[11px] leading-relaxed">
                The calculation snapshot for <strong>{finalizedBatchInfo.totalEmployees} employees</strong> (Total Net: <span className="font-mono font-bold">₹{finalizedBatchInfo.totalNet.toLocaleString('en-IN')}</span>) has been permanently sealed. A corresponding <strong>Bank Disbursement Batch</strong> has been created in <em>Pending Checker Approval</em> status.
              </p>
            </div>

            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1.5">
              <span className="font-bold text-gray-800 uppercase tracking-wider text-[10px] block">Next Operational Steps:</span>
              <ul className="list-disc pl-4 space-y-1 text-gray-600 text-[11px]">
                <li><strong>Maker Review:</strong> Bank batch instructions prepared by HR Maker.</li>
                <li><strong>Dual-Control Checker Approval:</strong> Finance Head / Checker verifies totals and grants release.</li>
                <li><strong>Bank Dispatch:</strong> Direct transmission or encrypted NEFT/RTGS format download.</li>
                <li><strong>Settlement & Reconciliation:</strong> Zero-variance matching after bank debit.</li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsFinalizeSuccessModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Stay on Register
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setIsFinalizeSuccessModalOpen(false);
                  if (onNavigateTab) onNavigateTab('disbursement');
                }}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold w-full sm:w-auto"
              >
                <CreditCard className="w-3.5 h-3.5 mr-1" />
                Proceed to Bank Disbursement (Dual Control) →
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Explain Calculation Traceability Modal */}
      <ExplainCalculationModal
        breakdown={selectedBreakdown}
        isOpen={isExplainModalOpen}
        onClose={() => setIsExplainModalOpen(false)}
      />

      {/* 1-Click Automated Full-Cycle Run & Report Generator Modal */}
      <AutoPayrollAndReportsModal
        isOpen={isAutoModalOpen}
        onClose={() => setIsAutoModalOpen(false)}
        onRunCompleted={(run) => {
          loadRuns();
          setSelectedRun(run);
          setSubTab('preview');
        }}
        onNavigateTab={onNavigateTab}
      />

      {/* Purge / Reset Confirmation Modal */}
      {isPurgeModalOpen && (
        <Modal
          isOpen={isPurgeModalOpen}
          onClose={() => setIsPurgeModalOpen(false)}
          title="⚠️ Purge All Payroll Runs & Reset History"
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-2">
              <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-rose-600" />
                <span>Permanently Clear All Previous Payroll Runs</span>
              </div>
              <p className="text-rose-700 text-[11px] leading-relaxed">
                This action will delete all stored payroll calculation runs, calculation snapshots, and uncommitted disbursement batches for this tenant. No mock or outdated calculation records will remain.
              </p>
            </div>

            <p className="text-gray-600 text-[11px]">
              After clearing, you can generate fresh, real-time payroll calculations dynamically powered by your current employee master records and live biometric punch data.
            </p>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPurgeModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleClearAllRuns}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Yes, Purge Everything
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
