import React, { useState } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { FileText, Download, Printer, Eye, Award } from 'lucide-react';

interface EmployeeDocumentsViewProps {
  initialSubTab?: string;
  onOpenPayslip?: (employeeId: string) => void;
}

export const EmployeeDocumentsView: React.FC<EmployeeDocumentsViewProps> = ({
  initialSubTab,
  onOpenPayslip,
}) => {
  const [subTab, setSubTab] = useState<string>(initialSubTab || 'payslips');

  const subTabs = [
    { id: 'payslips', label: 'Monthly Payslips', icon: FileText },
    { id: 'tax-docs', label: 'Tax Computation Sheets', icon: FileText },
    { id: 'form16', label: 'Form 16 (Part A & B)', icon: Award },
    { id: 'certificates', label: 'Salary Certificates', icon: Download },
  ];

  const mockPayslips = [
    { period: 'July 2026', empName: 'Rajesh Kumar', empId: 'emp-101', net: '₹ 1,76,500', date: '31 Jul 2026' },
    { period: 'June 2026', empName: 'Rajesh Kumar', empId: 'emp-101', net: '₹ 1,76,500', date: '30 Jun 2026' },
    { period: 'May 2026', empName: 'Rajesh Kumar', empId: 'emp-101', net: '₹ 1,76,500', date: '31 May 2026' },
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
      </div>

      {/* Payslips Table */}
      {subTab === 'payslips' && (
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <span className="text-xs font-black text-gray-900 uppercase tracking-wider">Employee Monthly Payslips</span>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
                <th className="p-4">Pay Period</th>
                <th className="p-4">Employee</th>
                <th className="p-4 text-right">Net Take-Home Pay</th>
                <th className="p-4 font-mono">Disbursed Date</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {mockPayslips.map((ps, idx) => (
                <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4 font-extrabold text-gray-900">{ps.period}</td>
                  <td className="p-4 font-bold text-gray-800">{ps.empName}</td>
                  <td className="p-4 text-right font-mono font-black text-[#07563D]">{ps.net}</td>
                  <td className="p-4 font-mono text-gray-600">{ps.date}</td>
                  <td className="p-4 text-center"><Badge variant="emerald">Paid</Badge></td>
                  <td className="p-4 text-right">
                    <Button size="sm" variant="outline" leftIcon={<Eye className="w-3.5 h-3.5" />} onClick={() => onOpenPayslip?.(ps.empId)}>
                      View Digital Slip
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form 16 Subtab */}
      {subTab === 'form16' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-black text-gray-900">Form 16 Annual Tax Certificates (FY 2025-26)</h3>
              <p className="text-xs text-gray-500">TRACES digital signed Part A (TDS Withheld) & Part B (Salary Computations)</p>
            </div>
            <Button size="sm" leftIcon={<Download className="w-4 h-4" />}>
              Download Zip (All Employees)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
