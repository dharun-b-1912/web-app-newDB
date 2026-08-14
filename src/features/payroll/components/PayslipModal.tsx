import React from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { Download, Printer, CircleDollarSign, Building2, CheckCircle2 } from 'lucide-react';
import { Payslip } from '../../../types/payroll';

interface PayslipModalProps {
  payslip: Payslip | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PayslipModal: React.FC<PayslipModalProps> = ({ payslip, isOpen, onClose }) => {
  if (!payslip) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="" size="xl">
      <div className="p-6 bg-white space-y-6 text-gray-900 printable-payslip select-text">
        {/* Company & Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#07563D] text-white flex items-center justify-center font-black text-xl shadow-md">
              W
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-gray-900">WorkForceOS Enterprise Corp</h2>
              <p className="text-xs text-gray-500 font-medium">100 Tech Park Way, Phase II, Software City • TN, India</p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="inline-block px-3 py-1 bg-emerald-50 text-[#07563D] rounded-full text-xs font-black uppercase tracking-wider border border-emerald-100">
              Payslip — {payslip.pay_period}
            </span>
            <span className="block text-[11px] text-gray-400 font-mono mt-1">Generated on: {payslip.generated_date}</span>
          </div>
        </div>

        {/* Employee Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-2xl bg-gray-50 border border-gray-200/80 text-xs">
          <div>
            <span className="text-gray-400 font-bold uppercase text-[10px] block">Employee Name</span>
            <span className="font-extrabold text-gray-900">{payslip.employee_name}</span>
            <span className="block text-[11px] text-gray-500 font-mono">{payslip.employee_id}</span>
          </div>
          <div>
            <span className="text-gray-400 font-bold uppercase text-[10px] block">Department & Role</span>
            <span className="font-bold text-gray-800">{payslip.department_name}</span>
            <span className="block text-[11px] text-gray-500">{payslip.designation}</span>
          </div>
          <div>
            <span className="text-gray-400 font-bold uppercase text-[10px] block">Bank Account & IFSC</span>
            <span className="font-bold font-mono text-gray-800">{payslip.bank_name}</span>
            <span className="block text-[11px] text-gray-500 font-mono">{payslip.account_number}</span>
          </div>
          <div>
            <span className="text-gray-400 font-bold uppercase text-[10px] block">Tax Identifiers</span>
            <span className="font-bold font-mono text-gray-800">PAN: {payslip.pan_number}</span>
            <span className="block text-[11px] text-gray-500 font-mono">UAN: {payslip.pf_uan}</span>
          </div>
        </div>

        {/* Days Metrics */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-2.5 rounded-xl bg-gray-100/70 border border-gray-200">
            <span className="text-[10px] font-bold text-gray-500 uppercase">Working Days</span>
            <span className="block text-sm font-black text-gray-900 font-mono">{payslip.total_working_days}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
            <span className="text-[10px] font-bold text-[#07563D] uppercase">Payable Days</span>
            <span className="block text-sm font-black text-[#07563D] font-mono">{payslip.payable_days}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-100">
            <span className="text-[10px] font-bold text-rose-700 uppercase">LOP Days</span>
            <span className="block text-sm font-black text-rose-700 font-mono">{payslip.lop_days}</span>
          </div>
        </div>

        {/* Earnings & Deductions Tables */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Earnings */}
          <div className="border border-emerald-200/80 rounded-2xl overflow-hidden bg-white">
            <div className="bg-emerald-50 px-4 py-2.5 border-b border-emerald-100 flex justify-between items-center">
              <span className="text-xs font-black text-[#07563D] uppercase tracking-wider">Earnings Component</span>
              <span className="text-xs font-black text-[#07563D]">Amount (₹)</span>
            </div>
            <div className="divide-y divide-gray-100 text-xs">
              {payslip.earnings.map((e, idx) => (
                <div key={idx} className="p-3 flex justify-between">
                  <span className="font-semibold text-gray-700">{e.name}</span>
                  <span className="font-bold font-mono text-gray-900">₹ {e.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            <div className="bg-emerald-50/50 p-3 border-t border-emerald-100 flex justify-between items-center text-xs">
              <span className="font-black text-[#07563D]">Gross Earnings</span>
              <span className="font-black font-mono text-base text-[#07563D]">₹ {payslip.gross_earnings.toLocaleString('en-IN')}</span>
            </div>
          </div>

          {/* Deductions */}
          <div className="border border-rose-200/80 rounded-2xl overflow-hidden bg-white">
            <div className="bg-rose-50 px-4 py-2.5 border-b border-rose-100 flex justify-between items-center">
              <span className="text-xs font-black text-rose-800 uppercase tracking-wider">Deductions Component</span>
              <span className="text-xs font-black text-rose-800">Amount (₹)</span>
            </div>
            <div className="divide-y divide-gray-100 text-xs">
              {payslip.deductions.map((d, idx) => (
                <div key={idx} className="p-3 flex justify-between">
                  <span className="font-semibold text-gray-700">{d.name}</span>
                  <span className="font-bold font-mono text-rose-700">₹ {d.amount.toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>
            <div className="bg-rose-50/50 p-3 border-t border-rose-100 flex justify-between items-center text-xs">
              <span className="font-black text-rose-900">Total Deductions</span>
              <span className="font-black font-mono text-base text-rose-700">₹ {payslip.total_deductions.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Net Take-Home Highlight */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-[#07563D] to-[#0a7352] text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-200 block tracking-wider">Net Monthly Take-Home Pay</span>
            <span className="text-2xl font-black font-mono">₹ {payslip.net_pay.toLocaleString('en-IN')}</span>
          </div>
          <div className="text-xs text-emerald-100/90 font-medium max-w-xs text-right">
            Amount in words: <span className="italic font-bold text-white block mt-0.5">{payslip.net_pay_words}</span>
          </div>
        </div>

        {/* Footer Audit Notice */}
        <div className="pt-4 border-t border-gray-100 text-center text-[10px] text-gray-400 space-y-1">
          <p>This is a computer-generated payslip statement issued by WorkForceOS Payroll Engine. No signature required.</p>
          <p className="font-mono">Verification Hash: SHA256-WFOS-{payslip.id.toUpperCase()}-2026</p>
        </div>

        {/* Actions Bar */}
        <div className="flex items-center justify-end gap-2 pt-2 non-printable">
          <Button variant="outline" size="sm" leftIcon={<Printer className="w-4 h-4" />} onClick={handlePrint}>
            Print Payslip
          </Button>
          <Button size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={() => alert('Downloading PDF Payslip...')}>
            Download PDF
          </Button>
        </div>
      </div>
    </Modal>
  );
};
