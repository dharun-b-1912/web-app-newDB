import React, { useState } from 'react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { CreditCard, FileText, Download, Eye, EyeOff, CheckCircle2, ChevronRight, Plus } from 'lucide-react';

interface Props {
  latestPayslip: {
    period: string;
    grossPay: number;
    netPay: number;
    deductions: number;
    publishedDate: string;
    paymentStatus: string;
  } | null;
  documents: { id: string; name: string; category: string; verificationStatus: string; uploadedAt: string }[];
  onViewPayslip: () => void;
  onViewDocuments: () => void;
}

export const WorkspacePayrollAndDocs: React.FC<Props> = ({
  latestPayslip,
  documents,
  onViewPayslip,
  onViewDocuments,
}) => {
  const [showSalary, setShowSalary] = useState(false);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left: Latest Payslip & Salary Card (6 Cols) */}
      <div className="lg:col-span-6 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center font-bold">
                <CreditCard className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                Latest Payslip Summary
              </h3>
            </div>
            <span className="text-[10px] font-bold text-gray-400">Monthly Compensation</span>
          </div>

          {latestPayslip ? (
            <div className="p-4 rounded-xl bg-gradient-to-br from-teal-50/50 to-emerald-50/20 border border-teal-100/70 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-teal-900 uppercase tracking-wide">Pay Period</span>
                  <p className="text-sm font-black text-gray-900">{latestPayslip.period}</p>
                </div>
                <button
                  onClick={() => setShowSalary(!showSalary)}
                  className="p-1.5 rounded-lg bg-white border border-teal-200/60 text-teal-700 hover:bg-teal-50 text-xs flex items-center gap-1 font-bold cursor-pointer"
                >
                  {showSalary ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{showSalary ? 'Hide' : 'Reveal'}</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 py-2 border-y border-teal-100/80 text-center">
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase block">Gross Pay</span>
                  <span className="text-xs font-bold text-gray-700">
                    {showSalary ? formatCurrency(latestPayslip.grossPay) : '₹ ••••••'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-gray-400 uppercase block">Deductions</span>
                  <span className="text-xs font-bold text-rose-600">
                    {showSalary ? formatCurrency(latestPayslip.deductions) : '₹ ••••••'}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-bold text-teal-900 uppercase block">Net Pay</span>
                  <span className="text-sm font-black text-[#07563D]">
                    {showSalary ? formatCurrency(latestPayslip.netPay) : '₹ ••••••'}
                  </span>
                </div>
              </div>

              <div className="text-[10px] text-teal-800 font-medium flex items-center justify-between">
                <span>Status: {latestPayslip.paymentStatus}</span>
                <span>Published: {latestPayslip.publishedDate}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">No payslips have been published yet.</p>
          )}
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewPayslip}
            leftIcon={<FileText className="w-3.5 h-3.5" />}
            className="text-xs font-bold"
          >
            View Official Payslip
          </Button>
        </div>
      </div>

      {/* Right: My Documents & KYC Repository (6 Cols) */}
      <div className="lg:col-span-6 bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                <FileText className="w-3.5 h-3.5" />
              </div>
              <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                My Documents & KYC ({documents.length})
              </h3>
            </div>
            <button
              onClick={onViewDocuments}
              className="text-[10px] font-bold text-[#07563D] hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {documents.slice(0, 3).map((doc) => (
              <div
                key={doc.id}
                className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs hover:bg-white hover:border-indigo-200 transition-all"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold shrink-0">
                    <FileText className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate leading-tight">{doc.name}</p>
                    <p className="text-[10px] text-gray-400 truncate">{doc.category} Document</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                  <CheckCircle2 className="w-3 h-3" /> Verified
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={onViewDocuments}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            className="text-xs font-bold"
          >
            Upload / Manage Documents
          </Button>
        </div>
      </div>
    </div>
  );
};
