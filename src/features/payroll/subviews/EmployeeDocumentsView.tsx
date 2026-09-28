import React, { useState, useEffect } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { PayrollRun, EmployeeSalaryAssignment } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { FileText, Download, Printer, Eye, Award, Search, Building2, CheckCircle2, ShieldCheck, CreditCard } from 'lucide-react';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';
import { useToast } from '../../../components/ui/Toast';
import { BatchPayslipExportService } from '../../../services/payroll/batchPayslipExportService';

interface EmployeeDocumentsViewProps {
  initialSubTab?: string;
  onOpenPayslip?: (employeeId: string) => void;
}

export const EmployeeDocumentsView: React.FC<EmployeeDocumentsViewProps> = ({
  initialSubTab,
  onOpenPayslip,
}) => {
  const { showToast } = useToast();
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'payslips');
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [salaries, setSalaries] = useState<EmployeeSalaryAssignment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    const rList = payrollApi.getPayrollRuns();
    const sList = await payrollApi.getEmployeeSalaries();
    setRuns(rList);
    setSalaries(sList);
  };

  useEffect(() => {
    loadData();
    const unsub1 = hrEventBus.subscribe('payroll.*', () => loadData());
    const unsub2 = hrEventBus.subscribe('document.*', () => loadData());
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  const subTabs = [
    { id: 'payslips', label: 'Monthly Payslips', icon: FileText },
    { id: 'form16', label: 'Form 16 Tax Documents', icon: Award },
  ];

  const CANON_ORDER = [
    'CE0017', 'CE0018', 'CE0019', 'CE0020', 'CE0021', 'CE0022',
    'CE0023', 'CE0024', 'CE0025', 'CE0027', 'CE0029', 'CE0030',
    'CE0043', 'CE0044', 'CE0078', 'CE0079', 'CE0080', 'CE0186',
    'CE0381', 'CE0382', 'CE0383'
  ];

  const filteredEmployees = salaries.filter(sal => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        sal.employee_name.toLowerCase().includes(q) ||
        sal.employee_code.toLowerCase().includes(q) ||
        sal.department_name.toLowerCase().includes(q)
      );
    }
    return true;
  }).sort((a, b) => {
    const idxA = CANON_ORDER.indexOf(a.employee_code);
    const idxB = CANON_ORDER.indexOf(b.employee_code);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return (a.employee_code || '').localeCompare(b.employee_code || '');
  });

  const totalGross = filteredEmployees.reduce((acc, curr) => acc + curr.gross_monthly, 0);
  const totalNet = filteredEmployees.reduce((acc, curr) => acc + curr.net_monthly_estimate, 0);

  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);

  const handleToggleSelect = (code: string) => {
    setSelectedCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const handleSelectAll = () => {
    if (selectedCodes.length === filteredEmployees.length) {
      setSelectedCodes([]);
    } else {
      setSelectedCodes(filteredEmployees.map(e => e.employee_code));
    }
  };

  const handleDownloadAllZip = async (targetCodes?: string[]) => {
    try {
      const codes = targetCodes || (selectedCodes.length > 0 ? selectedCodes : filteredEmployees.map(e => e.employee_code));
      if (codes.length === 0) return;
      showToast(`Generating ZIP package for ${codes.length} employee payslips...`);
      await BatchPayslipExportService.downloadAllPayslipsZip(codes, 'August 2026');
      showToast(`✓ Downloaded ZIP archive containing ${codes.length} individual payslips.`);
    } catch (err: any) {
      showToast(`Failed to generate ZIP: ${err.message}`, 'error');
    }
  };

  const handlePrintAllCombinedPdf = (targetCodes?: string[]) => {
    try {
      const codes = targetCodes || (selectedCodes.length > 0 ? selectedCodes : filteredEmployees.map(e => e.employee_code));
      if (codes.length === 0) return;
      showToast(`Opening multi-page consolidated A4 PDF print stream (${codes.length} pages)...`);
      BatchPayslipExportService.printAllPayslipsCombinedPdf(codes, 'August 2026');
    } catch (err: any) {
      showToast(`Failed to open print preview: ${err.message}`, 'error');
    }
  };

  const handleSingleEmployeePdf = (empCode: string) => {
    try {
      BatchPayslipExportService.printAllPayslipsCombinedPdf([empCode], 'August 2026');
    } catch (err: any) {
      showToast(`Failed to generate payslip: ${err.message}`, 'error');
    }
  };

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

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search employee payslip..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#07563D] w-52"
            />
          </div>

          {subTab === 'payslips' && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => handlePrintAllCombinedPdf()}
                className="text-xs font-bold bg-[#07563D] hover:bg-[#064e37] text-white shadow-2xs rounded-xl cursor-pointer"
                title="Consolidated Multi-Page A4 PDF / Direct Print"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                {selectedCodes.length > 0 ? `Print Selected (${selectedCodes.length})` : 'All-in-One PDF / Print All'}
              </Button>

              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleDownloadAllZip()}
                className="text-xs font-bold text-[#07563D] hover:bg-emerald-100/80 bg-emerald-50/80 border border-emerald-200/80 shadow-2xs rounded-xl cursor-pointer"
                title="Download ZIP package with individual employee payslips"
              >
                <Download className="w-3.5 h-3.5 mr-1.5" />
                {selectedCodes.length > 0 ? `Download ZIP (${selectedCodes.length})` : 'Download All (ZIP)'}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Payslips Table */}
      {subTab === 'payslips' && (
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-gray-900">Employee Digital Payslips</h3>
                <Badge variant="emerald">Auto-Generated</Badge>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Self-service digital payslips generated from finalized payroll calculations (August 2026).
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs flex-wrap">
              <div className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 flex items-center gap-2">
                <span className="text-gray-500 font-medium">Headcount:</span>
                <span className="font-bold text-gray-900 font-mono">{filteredEmployees.length} Staff</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                <span className="text-emerald-800 font-medium">Total Net Pay:</span>
                <span className="font-bold text-[#07563D] font-mono">₹{totalNet.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
                <tr>
                  <th className="p-3 w-8">
                    <input
                      type="checkbox"
                      checked={selectedCodes.length === filteredEmployees.length && filteredEmployees.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-[#07563D] focus:ring-[#07563D] cursor-pointer"
                      title="Select All"
                    />
                  </th>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Department & Role</th>
                  <th className="p-3">Gross Earnings</th>
                  <th className="p-3">Net Take-Home Pay</th>
                  <th className="p-3">Payout Mode</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredEmployees.map(sal => {
                  const isChecked = selectedCodes.includes(sal.employee_code);
                  return (
                    <tr key={sal.id} className={cn("transition-colors", isChecked ? "bg-emerald-50/40" : "hover:bg-gray-50/70")}>
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(sal.employee_code)}
                          className="rounded border-gray-300 text-[#07563D] focus:ring-[#07563D] cursor-pointer"
                        />
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-gray-900">{sal.employee_name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{sal.employee_code}</div>
                      </td>
                      <td className="p-3 text-gray-600">
                        <div>{sal.department_name}</div>
                        <div className="text-[10px] text-gray-400 font-medium">{sal.designation}</div>
                      </td>
                      <td className="p-3 font-mono font-semibold text-gray-900">
                        ₹ {sal.gross_monthly.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 font-mono font-bold text-[#07563D]">
                        ₹ {sal.net_monthly_estimate.toLocaleString('en-IN')}
                      </td>
                      <td className="p-3 text-gray-600">
                        <div className="flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-medium text-gray-700">{sal.payment_mode || 'Bank Transfer'}</span>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono block">
                          {sal.bank_name || 'HDFC Bank Ltd'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Generated
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => handleSingleEmployeePdf(sal.employee_code)}
                            className="text-slate-700 hover:bg-slate-100 bg-white border border-slate-200 font-semibold shadow-2xs cursor-pointer px-2"
                            title="Quick Download / Print PDF"
                          >
                            <Printer className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="xs"
                            variant="secondary"
                            onClick={() => onOpenPayslip && onOpenPayslip(sal.employee_code || sal.employee_id)}
                            className="text-[#07563D] hover:bg-emerald-100/80 bg-emerald-50/80 border border-emerald-200/80 font-bold shadow-2xs cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1 text-[#07563D]" /> View Payslip
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

      {/* Form 16 Subtab */}
      {subTab === 'form16' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Form 16 Annual Tax Certificates (FY 2025-26)</h3>
              <p className="text-xs text-gray-500">TRACES digital signed Part A (TDS Withheld) & Part B (Salary Computations)</p>
            </div>
            <Badge variant="emerald">TRACES Active</Badge>
          </div>

          <div className="p-8 text-center text-gray-400 bg-gray-50/50 rounded-2xl border border-gray-100">
            <Award className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            <p className="font-semibold text-gray-700">Annual Form 16 packages are finalized in Q4</p>
            <p className="text-[11px] text-gray-400 mt-0.5">Automated batch generation available upon annual TDS quarterly return filing.</p>
          </div>
        </div>
      )}
    </div>
  );
};
