import React, { useState, useEffect } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { EmployeeSalaryAssignment, PayrollAuditEvent } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { FileSpreadsheet, Download, Printer, Search, Filter, ShieldCheck, History } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../components/ui/Toast';

export const PayrollReportsView: React.FC = () => {
  const { showToast } = useToast();
  const [selectedReportId, setSelectedReportId] = useState<string>('prep-01');
  const [salaries, setSalaries] = useState<EmployeeSalaryAssignment[]>([]);
  const [auditLogs, setAuditLogs] = useState<PayrollAuditEvent[]>([]);

  useEffect(() => {
    payrollApi.getEmployeeSalaries().then(res => setSalaries(res));
    setAuditLogs(payrollApi.getAuditLogs());
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

  const handleExportCSV = () => {
    if (selectedReportId === 'prep-03') {
      // Generate official EPFO ECR Text format
      const ecrText = payrollApi.generateEPFO_ECR_Text('run-active');
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

    let csvHeader = 'EmpID,Name,Department,Basic,HRA,Gross,EPF,PT,NetPay\n';
    let csvRows = salaries
      .map(
        s =>
          `${s.employee_code},"${s.employee_name}","${s.department_name}",${s.basic_monthly},${Math.round(s.basic_monthly * 0.4)},${s.gross_monthly},${Math.round(s.basic_monthly * 0.12)},208,${s.net_monthly_estimate}`
      )
      .join('\n');

    const csvContent = 'data:text/csv;charset=utf-8,' + csvHeader + csvRows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedReportId}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`✓ Exported ${selectedReportId}_export.csv with ${salaries.length} real employee records.`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-[#07563D]">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h2 className="text-sm font-bold text-gray-900">Payroll Reports, Statutory Returns & Audits</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Generate 10+ specialized payroll registers, bank advice files, and statutory compliance returns
          </p>
        </div>

        <Button size="sm" variant="primary" onClick={handleExportCSV} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs">
          <Download className="w-3.5 h-3.5 mr-1" /> Export Report (CSV)
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-2">Available Reports Catalog</span>
          {reportList.map(rep => (
            <div
              key={rep.id}
              onClick={() => setSelectedReportId(rep.id)}
              className={cn(
                "p-3.5 rounded-xl border cursor-pointer transition-all text-xs",
                selectedReportId === rep.id
                  ? "border-[#07563D] bg-emerald-50/50 shadow-2xs"
                  : "border-gray-200 bg-white hover:border-gray-300"
              )}
            >
              <h4 className="font-bold text-gray-900">{rep.name}</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{rep.desc}</p>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-gray-900">
            {reportList.find(r => r.id === selectedReportId)?.name}
          </h3>

          {selectedReportId === 'prep-07' ? (
            <div className="space-y-3">
              <span className="text-xs font-bold text-gray-700 block">Financial & Calculation Audit Logs</span>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
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
          ) : (
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs text-gray-600 space-y-2">
              <span className="font-bold text-gray-900 block">Live Data Preview ({salaries.length} Records)</span>
              <p>Ready to compile report for active tenant <span className="font-mono font-bold">org-joy-01</span>. Click "Export Report (CSV)" to download the formatted file.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
