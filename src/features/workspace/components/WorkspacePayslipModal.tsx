import React from 'react';
import { Button } from '../../../components/ui/Button';
import { X, Receipt, Download, Building2, UserCheck, ShieldCheck } from 'lucide-react';
import { Employee, User, Company } from '../../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  user: User;
  activeCompany: Company | null;
}

export const WorkspacePayslipModal: React.FC<Props> = ({
  isOpen,
  onClose,
  employee,
  user,
  activeCompany,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-gray-900">Latest Compensation Statement</h3>
              <p className="text-[11px] text-gray-500 font-medium">
                {activeCompany?.legal_name || 'Joy Corporate Solutions Pvt Ltd'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Employee Header */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="font-bold text-gray-900 text-sm">{employee ? `${employee.first_name} ${employee.last_name}` : user.name}</p>
              <p className="text-[11px] text-gray-500">{employee?.designation_title || 'Software Engineer'} • {employee?.department_name || 'Engineering'}</p>
            </div>
            <div className="text-right text-[11px]">
              <span className="font-mono font-bold text-gray-700 block">{employee?.employee_code || 'EMP-10001'}</span>
              <span className="text-gray-400">Pay Period: July 2026</span>
            </div>
          </div>

          {/* Pay Breakdown */}
          <div className="space-y-3">
            <h4 className="font-black text-gray-800 uppercase tracking-wider text-[10px]">Earnings & Deductions</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl border border-gray-100 space-y-2">
                <span className="font-bold text-gray-700 block text-xs">Earnings</span>
                <div className="flex justify-between text-gray-600"><span>Basic Salary:</span><strong className="text-gray-900">₹45,000</strong></div>
                <div className="flex justify-between text-gray-600"><span>House Rent (HRA):</span><strong className="text-gray-900">₹18,000</strong></div>
                <div className="flex justify-between text-gray-600"><span>Special Allowance:</span><strong className="text-gray-900">₹12,000</strong></div>
                <div className="flex justify-between text-emerald-800 font-bold pt-2 border-t border-gray-100">
                  <span>Gross Earnings:</span><span>₹75,000</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-gray-100 space-y-2">
                <span className="font-bold text-gray-700 block text-xs">Deductions</span>
                <div className="flex justify-between text-gray-600"><span>Provident Fund (PF):</span><strong className="text-gray-900">₹1,800</strong></div>
                <div className="flex justify-between text-gray-600"><span>Professional Tax (PT):</span><strong className="text-gray-900">₹200</strong></div>
                <div className="flex justify-between text-gray-600"><span>TDS / Income Tax:</span><strong className="text-gray-900">₹3,500</strong></div>
                <div className="flex justify-between text-rose-800 font-bold pt-2 border-t border-gray-100">
                  <span>Total Deductions:</span><span>₹5,500</span>
                </div>
              </div>
            </div>
          </div>

          {/* Net Salary Banner */}
          <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-teal-700 uppercase">Net Salary Transferred</span>
              <p className="text-2xl font-black text-teal-950">₹69,500</p>
            </div>
            <Button size="sm" variant="secondary" onClick={onClose} className="bg-white text-teal-900 border-teal-200 font-bold text-xs">
              <Download className="w-3.5 h-3.5 mr-1" />
              Download PDF
            </Button>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <Button size="md" variant="secondary" onClick={onClose} className="text-xs font-bold">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
