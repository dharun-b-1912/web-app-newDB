import React from 'react';
import { essApi } from '../../../services/essApi';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { CircleDollarSign, Download, Lock, Eye } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';

export const EssPayrollView: React.FC = () => {
  const { showToast } = useToast();
  const payslips = essApi.getPayslips();
  const profile = essApi.getProfile();

  const handleDownloadPdf = (month: string) => {
    showToast(`Downloading Verified Digital Payslip PDF (${month})...`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <CircleDollarSign className="w-5 h-5 text-[#07563D]" />
            <span>My Compensation, Payslips & Tax Documents</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">View salary structure breakdown, download verified digital payslip PDFs, Form 16 tax statements and reimbursement status</p>
        </div>

        <Badge variant="emerald">Confidential Personal Financial Data</Badge>
      </div>

      {/* Salary Overview & Bank Masked Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900">Current Monthly Salary Structure</h3>
          <div className="space-y-2 text-xs font-mono">
            <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="font-sans font-bold text-gray-700">Gross Base Salary</span>
              <span className="font-black text-gray-900">₹1,50,000 / month</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-gray-50 border border-gray-100">
              <span className="font-sans font-bold text-gray-700">Statutory Deductions (EPF & Tax)</span>
              <span className="font-bold text-rose-700">- ₹18,000 / month</span>
            </div>
            <div className="flex justify-between p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
              <span className="font-sans font-bold text-emerald-900">Net Take-Home Disbursed</span>
              <span className="font-black text-[#07563D]">₹1,32,000 / month</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
          <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#07563D]" />
            <span>Disbursement Bank Account (Masked)</span>
          </h3>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1 text-xs font-mono">
            <span className="font-sans font-bold text-gray-900 block">{profile.bank_name}</span>
            <span className="text-gray-600 block">Account Number: <strong>{profile.account_number_masked}</strong></span>
            <p className="text-[11px] text-gray-400 font-sans pt-1">To change bank account details, submit a verified Bank Information Request in My Requests.</p>
          </div>
        </div>
      </div>

      {/* Payslips Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">Monthly Digital Payslips Ledger</h3>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4 font-mono">Month & Year</th>
              <th className="p-4 font-mono text-right">Gross Earnings</th>
              <th className="p-4 font-mono text-right">Deductions</th>
              <th className="p-4 font-mono text-right">Net Take-Home</th>
              <th className="p-4 font-mono">Issue Date</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs font-mono">
            {payslips.map(ps => (
              <tr key={ps.id} className="hover:bg-gray-50/60 transition-colors">
                <td className="p-4 font-sans font-extrabold text-gray-900">{ps.month_year}</td>
                <td className="p-4 text-right text-gray-800">₹ {ps.gross_salary.toLocaleString('en-IN')}</td>
                <td className="p-4 text-right text-rose-700">- ₹ {ps.deductions.toLocaleString('en-IN')}</td>
                <td className="p-4 text-right font-black text-[#07563D]">₹ {ps.net_salary.toLocaleString('en-IN')}</td>
                <td className="p-4 text-gray-600">{ps.issue_date}</td>
                <td className="p-4 text-center font-sans"><Badge variant="emerald">Disbursed</Badge></td>
                <td className="p-4 text-right font-sans">
                  <Button size="sm" variant="outline" leftIcon={<Download className="w-3.5 h-3.5" />} onClick={() => handleDownloadPdf(ps.month_year)}>
                    Download PDF
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
