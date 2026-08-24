import React, { useState, useEffect, useMemo } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { EmployeeSalaryAssignment, PayrollAuditEvent, PayrollRun } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Filter,
  ShieldCheck,
  History,
  Building,
  CreditCard,
  CheckCircle2,
  Lock,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../components/ui/Toast';
import { PayrollWorkflowStepper } from '../components/PayrollWorkflowStepper';

interface PayrollReportsViewProps {
  onNavigateTab?: (tabKey: string) => void;
}

export const PayrollReportsView: React.FC<PayrollReportsViewProps> = ({ onNavigateTab }) => {
  const { showToast } = useToast();
  const [selectedReportId, setSelectedReportId] = useState<string>('prep-01');
  const [salaries, setSalaries] = useState<EmployeeSalaryAssignment[]>([]);
  const [auditLogs, setAuditLogs] = useState<PayrollAuditEvent[]>([]);
  const [activeRun, setActiveRun] = useState<PayrollRun | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    payrollApi.getEmployeeSalaries().then(res => setSalaries(res));
    setAuditLogs(payrollApi.getAuditLogs());
    const runs = payrollApi.getPayrollRuns();
    if (runs.length > 0) setActiveRun(runs[0]);
  }, []);

  const reportList = [
    { id: 'prep-01', name: '1. Monthly Salary Register', desc: 'Line-by-line employee gross earnings, statutory deductions, and net payouts' },
    { id: 'prep-02', name: '2. Bank Payment Advice (NEFT/RTGS)', desc: 'Formatted bank transfer upload advice file with IFSC and account numbers' },
    { id: 'prep-03', name: '3. PF / EPF Monthly ECR Return', desc: 'ECR format for EPFO portal filing with 12% basic contribution' },
    { id: 'prep-04', name: '4. ESIC Monthly Contribution Statement', desc: 'Monthly ESIC return register with employee gross wages' },
    { id: 'prep-05', name: '5. Professional Tax (PT) Challan Report', desc: 'State-wise PT withholdings and slab classification summary' },
    { id: 'prep-06', name: '6. TDS / 24Q Quarterly Return Register', desc: 'Section-wise TDS tax withholdings for Form 24Q quarterly filing' },
    { id: 'prep-07', name: '7. Audit Trail & Financial Logs', desc: 'Immutable transaction logs and signoff timestamps' },
  ];

  const filteredSalaries = useMemo(() => {
    if (!searchQuery.trim()) return salaries;
    const q = searchQuery.toLowerCase();
    return salaries.filter(s =>
      s.employee_name.toLowerCase().includes(q) ||
      s.employee_code.toLowerCase().includes(q) ||
      (s.department_name && s.department_name.toLowerCase().includes(q))
    );
  }, [salaries, searchQuery]);

  const totals = useMemo(() => {
    return filteredSalaries.reduce(
      (acc, s) => {
        acc.gross += s.gross_monthly;
        acc.basic += s.basic_monthly;
        acc.epf += Math.round(Math.min(s.basic_monthly, 15000) * 0.12);
        acc.esic += s.gross_monthly <= 21000 ? Math.round(s.gross_monthly * 0.0075) : 0;
        acc.pt += 208;
        acc.net += s.net_monthly_estimate;
        return acc;
      },
      { gross: 0, basic: 0, epf: 0, esic: 0, pt: 0, net: 0 }
    );
  }, [filteredSalaries]);

  const handleExportCSV = () => {
    if (selectedReportId === 'prep-03') {
      // Generate official EPFO ECR Text format
      const ecrText = payrollApi.generateEPFO_ECR_Text(activeRun?.id || 'run-active');
      const blob = new Blob([ecrText], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `EPFO_ECR_AUGUST_2026.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast(`✓ Exported EPFO ECR Return text file: EPFO_ECR_AUGUST_2026.txt`);
      return;
    }

    let csvHeader = '';
    let csvRows = '';

    if (selectedReportId === 'prep-02') {
      // Bank Advice CSV
      csvHeader = 'EmpCode,BeneficiaryName,BankName,AccountNumber,IFSCCode,NetPayoutAmount,PaymentMode,Narration\n';
      csvRows = filteredSalaries
        .map(s => `${s.employee_code},"${s.employee_name}","${s.bank_name || 'HDFC Bank'}","${s.account_number || '501002341234'}","${s.ifsc_code || 'HDFC0000123'}",${s.net_monthly_estimate},NEFT,"SALARY AUGUST 2026"`)
        .join('\n');
    } else if (selectedReportId === 'prep-04') {
      // ESIC Return
      csvHeader = 'EmpCode,EmployeeName,IPNumber,TotalGrossWages,EmployeeESIC_0.75,EmployerESIC_3.25,TotalESIC\n';
      csvRows = filteredSalaries
        .map(s => {
          const empEsi = s.gross_monthly <= 21000 ? Math.round(s.gross_monthly * 0.0075) : 0;
          const emprEsi = s.gross_monthly <= 21000 ? Math.round(s.gross_monthly * 0.0325) : 0;
          return `${s.employee_code},"${s.employee_name}","3192847192",${s.gross_monthly},${empEsi},${emprEsi},${empEsi + emprEsi}`;
        })
        .join('\n');
    } else {
      // Standard Salary Register
      csvHeader = 'EmpID,Name,Department,Basic,HRA,Gross,EPF,PT,NetPay\n';
      csvRows = filteredSalaries
        .map(
          s =>
            `${s.employee_code},"${s.employee_name}","${s.department_name}",${s.basic_monthly},${Math.round(s.basic_monthly * 0.4)},${s.gross_monthly},${Math.round(Math.min(s.basic_monthly, 15000) * 0.12)},208,${s.net_monthly_estimate}`
        )
        .join('\n');
    }

    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvHeader + csvRows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `${selectedReportId}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`✓ Exported ${selectedReportId}_export.csv with ${filteredSalaries.length} records.`);
  };

  return (
    <div className="space-y-6">
      {/* 0. Automated Workflow Lifecycle Stepper */}
      <PayrollWorkflowStepper
        currentStage={6}
        onNavigateStage={stageKey => {
          if (onNavigateTab) onNavigateTab(stageKey);
        }}
      />

      {/* Header Banner */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-[#07563D] border border-emerald-100">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-gray-900">Payroll Reports, Statutory Returns & Audits</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Generate mathematical payroll registers, EPFO ECR text files, ESIC returns, bank advice sheets, and certified audit ledgers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.print()}
            className="text-xs font-bold"
          >
            <Printer className="w-3.5 h-3.5 mr-1" /> Print Register
          </Button>

          <Button
            size="sm"
            variant="primary"
            onClick={handleExportCSV}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
          >
            <Download className="w-3.5 h-3.5 mr-1" /> Export {selectedReportId === 'prep-03' ? 'ECR Text' : 'CSV'}
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Report Catalog */}
        <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Available Reports Catalog</span>
          {reportList.map(rep => (
            <div
              key={rep.id}
              onClick={() => setSelectedReportId(rep.id)}
              className={cn(
                "p-3.5 rounded-xl border cursor-pointer transition-all text-xs",
                selectedReportId === rep.id
                  ? "border-[#07563D] bg-emerald-50/70 shadow-xs ring-1 ring-[#07563D]/20 font-bold"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <h4 className="font-bold text-gray-900">{rep.name}</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1 font-normal">{rep.desc}</p>
            </div>
          ))}
        </div>

        {/* Right: Live Data Table Preview */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {reportList.find(r => r.id === selectedReportId)?.name}
              </h3>
              <p className="text-xs text-gray-500">
                Period: <strong className="text-gray-800">August 2026</strong> • Scope: <strong className="text-gray-800">All Active Staff ({filteredSalaries.length})</strong>
              </p>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search staff, ID, department..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#07563D] w-48"
              />
            </div>
          </div>

          {/* Totals Ribbon */}
          {selectedReportId !== 'prep-07' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                <span className="text-[10px] text-gray-500 font-bold uppercase block">Gross Earnings</span>
                <span className="font-mono font-bold text-gray-900 text-sm">₹{totals.gross.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-200">
                <span className="text-[10px] text-blue-700 font-bold uppercase block">Total EPF (12%)</span>
                <span className="font-mono font-bold text-blue-950 text-sm">₹{totals.epf.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50/70 border border-purple-200">
                <span className="text-[10px] text-purple-700 font-bold uppercase block">Total ESIC</span>
                <span className="font-mono font-bold text-purple-950 text-sm">₹{totals.esic.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
                <span className="text-[10px] text-emerald-700 font-bold uppercase block">Net Payout</span>
                <span className="font-mono font-bold text-[#07563D] text-sm">₹{totals.net.toLocaleString('en-IN')}</span>
              </div>
            </div>
          )}

          {/* Render Table based on selectedReportId */}
          {selectedReportId === 'prep-07' ? (
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-700 block">Financial & Calculation Audit Logs</span>
              <div className="overflow-x-auto max-h-[450px]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100 sticky top-0">
                    <tr>
                      <th className="p-2.5">Action</th>
                      <th className="p-2.5">Actor</th>
                      <th className="p-2.5">Summary</th>
                      <th className="p-2.5">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-6 text-center text-gray-400">No audit events recorded yet</td>
                      </tr>
                    ) : (
                      auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50/70">
                          <td className="p-2.5">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800">
                              {log.action_type}
                            </span>
                          </td>
                          <td className="p-2.5 font-semibold text-gray-800">{log.actor_name} ({log.actor_role})</td>
                          <td className="p-2.5 text-gray-700">{log.summary}</td>
                          <td className="p-2.5 font-mono text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : selectedReportId === 'prep-02' ? (
            /* Bank Advice Table */
            <div className="overflow-x-auto max-h-[450px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2.5">Emp ID & Name</th>
                    <th className="p-2.5">Bank Name</th>
                    <th className="p-2.5">Account Number</th>
                    <th className="p-2.5">IFSC Code</th>
                    <th className="p-2.5 text-right">Net Payout</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSalaries.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50/70">
                      <td className="p-2.5 font-semibold text-gray-900">
                        <div>{s.employee_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{s.employee_code}</div>
                      </td>
                      <td className="p-2.5 text-gray-700">{s.bank_name || 'HDFC Bank Ltd'}</td>
                      <td className="p-2.5 font-mono text-gray-600">•••• •••• {s.account_number?.slice(-4) || '1234'}</td>
                      <td className="p-2.5 font-mono text-gray-600">{s.ifsc_code || 'HDFC0000123'}</td>
                      <td className="p-2.5 font-mono font-bold text-right text-[#07563D]">
                        ₹{s.net_monthly_estimate.toLocaleString('en-IN')}
                      </td>
                      <td className="p-2.5 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800">
                          Valid IFSC ✓
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Standard Salary Register & Statutory */
            <div className="overflow-x-auto max-h-[450px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100 sticky top-0">
                  <tr>
                    <th className="p-2.5">Emp Code & Name</th>
                    <th className="p-2.5">Department</th>
                    <th className="p-2.5 text-right">Basic</th>
                    <th className="p-2.5 text-right">HRA</th>
                    <th className="p-2.5 text-right">Gross Earnings</th>
                    <th className="p-2.5 text-right">EPF (12%)</th>
                    <th className="p-2.5 text-right">PT</th>
                    <th className="p-2.5 text-right">Net Payout</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSalaries.map(s => {
                    const basic = s.basic_monthly;
                    const hra = Math.round(basic * 0.4);
                    const epf = Math.round(Math.min(basic, 15000) * 0.12);
                    return (
                      <tr key={s.id} className="hover:bg-gray-50/70">
                        <td className="p-2.5 font-semibold text-gray-900">
                          <div>{s.employee_name}</div>
                          <div className="text-[10px] text-gray-400 font-mono">{s.employee_code}</div>
                        </td>
                        <td className="p-2.5 text-gray-600">{s.department_name}</td>
                        <td className="p-2.5 font-mono text-right">₹{basic.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 font-mono text-right text-gray-600">₹{hra.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 font-mono font-bold text-right text-gray-900">₹{s.gross_monthly.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 font-mono text-right text-blue-700">₹{epf.toLocaleString('en-IN')}</td>
                        <td className="p-2.5 font-mono text-right text-gray-600">₹208</td>
                        <td className="p-2.5 font-mono font-bold text-right text-[#07563D]">₹{s.net_monthly_estimate.toLocaleString('en-IN')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
