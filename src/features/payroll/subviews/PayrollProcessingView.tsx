import React, { useState, useEffect } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { PayrollRun, EmployeePayrollInput } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
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
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

interface PayrollProcessingViewProps {
  initialSubTab?: string;
  onOpenPayslip?: (employeeId: string) => void;
}

export const PayrollProcessingView: React.FC<PayrollProcessingViewProps> = ({
  initialSubTab,
  onOpenPayslip,
}) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'runs');
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [selectedRun, setSelectedRun] = useState<PayrollRun | null>(null);
  const [previewItems, setPreviewItems] = useState<EmployeePayrollInput[]>([]);

  useEffect(() => {
    const list = payrollApi.getPayrollRuns();
    setRuns(list);
    if (list.length > 0) {
      setSelectedRun(list[0]);
      setPreviewItems(payrollApi.computePayrollInputsForRun(list[0].id));
    }
  }, []);

  const handleCreateRun = () => {
    const newRun = payrollApi.createPayrollRun('August', 2026);
    setRuns(payrollApi.getPayrollRuns());
    setSelectedRun(newRun);
    setPreviewItems(payrollApi.computePayrollInputsForRun(newRun.id));
    showToast('Created August 2026 Payroll Draft Run');
  };

  const handleApproveRun = (runId: string) => {
    payrollApi.updatePayrollRunStatus(runId, 'Approved', 'Anand Viswanathan (HR Head)');
    setRuns(payrollApi.getPayrollRuns());
    showToast('Payroll Run Approved Successfully');
  };

  const handleFinalizeRun = (runId: string) => {
    payrollApi.updatePayrollRunStatus(runId, 'Finalized');
    setRuns(payrollApi.getPayrollRuns());
    showToast('Payroll Run Finalized & Locked! Payslips generated.');
  };

  const subTabs = [
    { id: 'runs', label: 'Payroll Runs & Processing', icon: Play },
    { id: 'preview', label: 'Payroll Preview & Calculation', icon: Eye },
    { id: 'inputs', label: 'Attendance & LOP Inputs', icon: FileText },
    { id: 'calendar', label: 'Payroll Calendar & Cutoffs', icon: Calendar },
    { id: 'history', label: 'Historical Executions', icon: Clock },
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

        <Button size="sm" leftIcon={<Play className="w-4 h-4" />} onClick={handleCreateRun}>
          Start August 2026 Run
        </Button>
      </div>

      {/* 1. Payroll Runs Subtab */}
      {subTab === 'runs' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {runs.map(run => (
              <div key={run.id} className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                      {run.run_code}
                    </span>
                    <h3 className="text-lg font-black text-gray-900 mt-1">{run.pay_period}</h3>
                    <span className="text-xs text-gray-500 font-medium">Headcount: {run.total_employees} Employees</span>
                  </div>
                  <Badge variant={run.status === 'Finalized' || run.status === 'Paid' ? 'emerald' : 'amber'}>
                    {run.status}
                  </Badge>
                </div>

                <div className="space-y-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Gross Payroll:</span>
                    <span className="font-bold font-mono text-gray-900">₹ {run.total_gross_pay.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Net Disbursement:</span>
                    <span className="font-black font-mono text-[#07563D]">₹ {run.total_net_pay.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500 font-medium">Statutory Withholding:</span>
                    <span className="font-bold font-mono text-amber-700">₹ {run.total_statutory_deductions.toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                    onClick={() => {
                      setSelectedRun(run);
                      setPreviewItems(payrollApi.computePayrollInputsForRun(run.id));
                      setSubTab('preview');
                    }}
                  >
                    Preview Run
                  </Button>

                  {run.status === 'Draft' && (
                    <Button size="sm" className="flex-1" onClick={() => handleApproveRun(run.id)}>
                      Approve
                    </Button>
                  )}

                  {run.status === 'Approved' && (
                    <Button size="sm" className="flex-1 bg-emerald-800" leftIcon={<Lock className="w-3.5 h-3.5" />} onClick={() => handleFinalizeRun(run.id)}>
                      Finalize & Lock
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. Payroll Preview Subtab */}
      {subTab === 'preview' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <div>
              <span className="text-xs font-black text-gray-900 uppercase tracking-wider">
                Itemized Employee Payroll Computation — {selectedRun?.pay_period || 'August 2026'}
              </span>
              <p className="text-[11px] text-gray-500">Live formula calculation including Basic, HRA, LOP deductions, EPF, and TDS</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" leftIcon={<Download className="w-4 h-4" />} onClick={() => showToast('Exporting Bank Advice CSV')}>
                Bank Advice CSV
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1200px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                  <th className="p-3.5">Employee</th>
                  <th className="p-3.5 text-center">Days (Wrk/Pay/LOP)</th>
                  <th className="p-3.5 text-right">Basic Salary</th>
                  <th className="p-3.5 text-right">HRA</th>
                  <th className="p-3.5 text-right">Gross Pay</th>
                  <th className="p-3.5 text-right text-rose-700">LOP Deduct</th>
                  <th className="p-3.5 text-right text-rose-700">EPF Deduct</th>
                  <th className="p-3.5 text-right text-rose-700">TDS Tax</th>
                  <th className="p-3.5 text-right text-emerald-800">Net Take-Home</th>
                  <th className="p-3.5 text-center">Payslip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-mono">
                {previewItems.map(item => (
                  <tr key={item.employee_id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-3.5 font-sans font-extrabold text-gray-900">
                      {item.employee_name}
                      <span className="block text-[11px] text-gray-400 font-normal">{item.department_name} • {item.designation}</span>
                    </td>
                    <td className="p-3.5 text-center text-gray-600">
                      <span className="font-bold text-gray-800">{item.total_working_days}</span> /{' '}
                      <span className="text-emerald-700 font-bold">{item.days_present + item.leave_paid_days}</span> /{' '}
                      <span className="text-rose-600 font-bold">{item.lop_days}</span>
                    </td>
                    <td className="p-3.5 text-right font-bold text-gray-700">₹ {item.basic_pay.toLocaleString('en-IN')}</td>
                    <td className="p-3.5 text-right text-gray-600">₹ {item.hra.toLocaleString('en-IN')}</td>
                    <td className="p-3.5 text-right font-bold text-gray-900">₹ {item.gross_earnings.toLocaleString('en-IN')}</td>
                    <td className="p-3.5 text-right text-rose-600">₹ {item.lop_deduction.toLocaleString('en-IN')}</td>
                    <td className="p-3.5 text-right text-rose-600">₹ {item.pf_employee.toLocaleString('en-IN')}</td>
                    <td className="p-3.5 text-right text-rose-600">₹ {item.tds_income_tax.toLocaleString('en-IN')}</td>
                    <td className="p-3.5 text-right font-black text-[#07563D] text-sm">₹ {item.net_pay.toLocaleString('en-IN')}</td>
                    <td className="p-3.5 text-center font-sans">
                      <button
                        onClick={() => onOpenPayslip?.(item.employee_id)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-50 text-[#07563D] hover:bg-emerald-100 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        View Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. Inputs Subtab */}
      {subTab === 'inputs' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-gray-900">Attendance & LOP Input Audit Checklist</h3>
              <p className="text-xs text-gray-500">Inputs fetched directly from Attendance Module and Leave Master Ledger</p>
            </div>
            <Badge variant="emerald">Attendance Synced (12 Aug 2026)</Badge>
          </div>
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 text-xs text-emerald-900 space-y-1">
            <span className="font-bold block">✓ Zero Calculation Duplication Safeguard Active</span>
            <p>Leave and Attendance modules operate as the sole source of truth for LOP days. Payroll reads finalized days directly.</p>
          </div>
        </div>
      )}

      {/* 4. Calendar Subtab */}
      {subTab === 'calendar' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900">Monthly Payroll Processing Schedule & Cutoffs</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <span className="font-bold text-gray-400 block uppercase text-[10px]">Attendance Cutoff</span>
              <span className="text-sm font-black text-gray-900 mt-1 block">25th of every month</span>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <span className="font-bold text-gray-400 block uppercase text-[10px]">Input Freeze</span>
              <span className="text-sm font-black text-gray-900 mt-1 block">27th of every month</span>
            </div>
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
              <span className="font-bold text-gray-400 block uppercase text-[10px]">HR Approval</span>
              <span className="text-sm font-black text-gray-900 mt-1 block">29th of every month</span>
            </div>
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="font-bold text-[#07563D] block uppercase text-[10px]">Bank Salary Disbursement</span>
              <span className="text-sm font-black text-[#07563D] mt-1 block">Last Working Day</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
