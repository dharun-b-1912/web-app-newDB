// src/features/clientBilling/components/InvoicePreviewModal.tsx
// ============================================================================
// JOY PeopleHR / JOY Corporate Solutions — Official Tax Invoice & Approval Modal
// ============================================================================

import React, { useState } from 'react';
import { BillingRun } from '../../../types/clientBilling';
import { BillingExportEngine } from '../../../services/clientBilling/billingExportEngine';
import { ClientMasterService } from '../../../services/clientBilling/clientMasterService';
import {
  Receipt,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  Lock,
  X,
  Building2,
  Calendar,
  Layers,
  FileText,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

interface InvoicePreviewModalProps {
  run: BillingRun;
  isOpen: boolean;
  onClose: () => void;
  onApproveInvoice: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  run,
  isOpen,
  onClose,
  onApproveInvoice,
}) => {
  const [activeTab, setActiveTab] = useState<'INVOICE' | 'REGISTER' | 'STATUTORY'>('INVOICE');
  const [isApproving, setIsApproving] = useState(false);

  if (!isOpen) return null;

  const client = ClientMasterService.getClientById(run.client_id);
  const formatINR = (val: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(val);

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await onApproveInvoice();
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Header & Actions */}
        <div className="p-5 border-b border-gray-100 bg-gray-50/90 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-800 shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-gray-900 text-base">
                  {run.status === 'APPROVED' ? `Tax Invoice — ${run.invoice_number}` : `Draft Invoice Preview — ${run.run_number}`}
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {run.status}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Client: <span className="font-semibold text-gray-700">{run.client_name}</span> • Period:{' '}
                <span className="font-semibold text-gray-700">{run.period}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            <button
              onClick={() => BillingExportEngine.exportComprehensiveExcel(run)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Multi-Sheet Excel</span>
            </button>

            <button
              onClick={() => BillingExportEngine.printOrExportPDF(run)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-gray-600" />
              <span>Print / PDF</span>
            </button>

            {run.status !== 'APPROVED' && (
              <button
                onClick={handleApprove}
                disabled={isApproving || !run.validation.is_valid}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#07563D] hover:bg-[#064833] shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>{isApproving ? 'Locking Snapshot...' : 'Approve & Lock Invoice'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-200/60"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="bg-white border-b border-gray-200 px-6 pt-2 flex items-center gap-4">
          <button
            onClick={() => setActiveTab('INVOICE')}
            className={cn(
              "pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer",
              activeTab === 'INVOICE'
                ? "border-[#07563D] text-[#07563D]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Official Tax Invoice</span>
          </button>

          <button
            onClick={() => setActiveTab('REGISTER')}
            className={cn(
              "pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer",
              activeTab === 'REGISTER'
                ? "border-[#07563D] text-[#07563D]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Employee Wage Register ({run.active_employee_count})</span>
          </button>

          <button
            onClick={() => setActiveTab('STATUTORY')}
            className={cn(
              "pb-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer",
              activeTab === 'STATUTORY'
                ? "border-[#07563D] text-[#07563D]"
                : "border-transparent text-gray-500 hover:text-gray-800"
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Statutory Contribution Working</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {activeTab === 'INVOICE' && (
            <div className="bg-white p-8 rounded-2xl border border-gray-200 shadow-xs max-w-4xl mx-auto space-y-6">
              {/* Invoice Header */}
              <div className="border-b-2 border-[#07563D] pb-5 flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-black text-[#07563D]">JOY CORPORATE SOLUTIONS PVT LTD</h2>
                  <p className="text-xs text-gray-500 mt-1 max-w-md leading-relaxed">
                    Industrial Manpower Supply, Compliance Engineering &amp; Contract Staffing<br />
                    Plot 12, SIDCO Industrial Estate, Coimbatore, Tamil Nadu - 641021<br />
                    <strong>GSTIN:</strong> 33AAACJ9988H1Z4 | <strong>PAN:</strong> AAACJ9988H | <strong>State Code:</strong> 33
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black tracking-tight text-gray-900 block">TAX INVOICE</span>
                  <div className="mt-1 text-xs text-gray-600 space-y-0.5 font-medium">
                    <div><strong>Invoice No:</strong> <span className="font-mono font-bold text-gray-900">{run.invoice_number || run.run_number}</span></div>
                    <div><strong>Date:</strong> {run.invoice_date || new Date().toISOString().split('T')[0]}</div>
                    <div><strong>Billing Period:</strong> {run.period}</div>
                  </div>
                </div>
              </div>

              {/* Client & Contract Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80">
                  <span className="text-[10px] font-extrabold uppercase text-[#07563D] tracking-wider block mb-1">
                    Billed To (Client):
                  </span>
                  <h4 className="font-bold text-gray-900 text-sm">{run.client_name}</h4>
                  <div className="text-gray-600 mt-1 space-y-0.5">
                    <p>{client?.billing_address || 'Industrial Estate Road'}</p>
                    <p>{client?.city || 'Coimbatore'}, {client?.state || 'Tamil Nadu'} - {client?.pincode || '641001'}</p>
                    <p><strong>GSTIN:</strong> <span className="font-mono font-bold">{client?.gstin || '33AAACE1234F1Z5'}</span> | <strong>State Code:</strong> {client?.state_code || '33'}</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80">
                  <span className="text-[10px] font-extrabold uppercase text-[#07563D] tracking-wider block mb-1">
                    Contract &amp; Deployment Scope:
                  </span>
                  <h4 className="font-bold text-gray-900">{run.contract_name}</h4>
                  <div className="text-gray-600 mt-1 space-y-0.5">
                    <p><strong>Contract No:</strong> {run.contract_number}</p>
                    <p><strong>Workforce Deployed:</strong> {run.active_employee_count} Associates ({run.total_payable_days} Paid Days)</p>
                    <p><strong>Payment Terms:</strong> {client?.payment_terms || '30 Days Net'}</p>
                  </div>
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#07563D] text-white">
                    <tr className="text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-2.5 px-3 text-center" style={{ width: '40px' }}>#</th>
                      <th className="py-2.5 px-3">Description of Services / Particulars</th>
                      <th className="py-2.5 px-3 text-center" style={{ width: '80px' }}>SAC</th>
                      <th className="py-2.5 px-3 text-center" style={{ width: '60px' }}>Qty</th>
                      <th className="py-2.5 px-3 text-right" style={{ width: '140px' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {run.line_items.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/80">
                        <td className="py-2.5 px-3 text-center font-mono text-gray-500">{item.sequence}</td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-gray-900">{item.description}</div>
                          {item.calculation_basis_text && (
                            <div className="text-[10px] text-gray-500">{item.calculation_basis_text}</div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono">{item.sac_code}</td>
                        <td className="py-2.5 px-3 text-center">{item.quantity || 1}</td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-900">
                          {formatINR(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals & Tax Summary */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-2">
                <div className="flex-1 space-y-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <span className="text-[10px] font-extrabold uppercase text-emerald-800 tracking-wider block mb-0.5">
                      Amount in Words:
                    </span>
                    <p className="font-bold text-emerald-950 leading-relaxed">{run.tax_summary.amount_in_words}</p>
                  </div>

                  <div className="p-3 rounded-xl border border-dashed border-gray-300 text-[11px] text-gray-600 space-y-0.5">
                    <strong>Bank Remittance Account Details:</strong>
                    <div>Beneficiary: JOY Corporate Solutions Pvt Ltd</div>
                    <div>HDFC Bank Ltd • A/C No: 50200088991122 • IFSC: HDFC0001234</div>
                  </div>
                </div>

                <div className="w-full sm:w-80 border border-gray-200 rounded-xl overflow-hidden text-xs">
                  <div className="p-3 bg-gray-50 flex justify-between border-b border-gray-200">
                    <span className="font-bold text-gray-700">Taxable Value:</span>
                    <span className="font-mono font-bold text-gray-900">{formatINR(run.taxable_amount)}</span>
                  </div>

                  {run.tax_summary.supply_type === 'INTRASTATE' ? (
                    <>
                      <div className="p-2.5 px-3 flex justify-between border-b border-gray-100 text-gray-600">
                        <span>CGST @ {run.tax_summary.cgst_rate_pct}%:</span>
                        <span className="font-mono">{formatINR(run.tax_summary.cgst_amount)}</span>
                      </div>
                      <div className="p-2.5 px-3 flex justify-between border-b border-gray-100 text-gray-600">
                        <span>SGST @ {run.tax_summary.sgst_rate_pct}%:</span>
                        <span className="font-mono">{formatINR(run.tax_summary.sgst_amount)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="p-2.5 px-3 flex justify-between border-b border-gray-100 text-gray-600">
                      <span>IGST @ {run.tax_summary.igst_rate_pct}%:</span>
                      <span className="font-mono">{formatINR(run.tax_summary.igst_amount)}</span>
                    </div>
                  )}

                  <div className="p-2.5 px-3 flex justify-between border-b border-gray-100 text-gray-600">
                    <span>Round Off:</span>
                    <span className="font-mono">{formatINR(run.tax_summary.round_off_amount)}</span>
                  </div>

                  <div className="p-3.5 bg-[#07563D] text-white flex justify-between items-center">
                    <span className="font-black text-sm uppercase tracking-wider">Grand Total:</span>
                    <span className="font-black text-base font-mono">{formatINR(run.tax_summary.grand_total)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'REGISTER' && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Emp Code</th>
                    <th className="py-2.5 px-3">Name</th>
                    <th className="py-2.5 px-3 text-right">Pay Days</th>
                    <th className="py-2.5 px-3 text-right">Basic</th>
                    <th className="py-2.5 px-3 text-right">Gross</th>
                    <th className="py-2.5 px-3 text-right">Emp PF</th>
                    <th className="py-2.5 px-3 text-right">Emp ESI</th>
                    <th className="py-2.5 px-3 text-right">Canteen</th>
                    <th className="py-2.5 px-3 text-right">Net Pay</th>
                    <th className="py-2.5 px-3 text-right">Employer PF</th>
                    <th className="py-2.5 px-3 text-right">Employer ESI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {run.employee_results.map((emp) => (
                    <tr key={emp.employee_id} className="hover:bg-emerald-50/30">
                      <td className="py-2 px-3 font-mono text-gray-700">{emp.employee_code}</td>
                      <td className="py-2 px-3 font-bold text-gray-900">{emp.employee_name}</td>
                      <td className="py-2 px-3 text-right font-mono">{emp.payable_days}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatINR(emp.basic_earned)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">{formatINR(emp.gross_billable_wages)}</td>
                      <td className="py-2 px-3 text-right font-mono text-gray-600">{formatINR(emp.employee_pf)}</td>
                      <td className="py-2 px-3 text-right font-mono text-gray-600">{formatINR(emp.employee_esi)}</td>
                      <td className="py-2 px-3 text-right font-mono text-rose-600">{formatINR(emp.canteen_deduction)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">{formatINR(emp.net_employee_payable)}</td>
                      <td className="py-2 px-3 text-right font-mono text-indigo-700 font-bold">{formatINR(emp.total_employer_pf_cost)}</td>
                      <td className="py-2 px-3 text-right font-mono text-indigo-700 font-bold">{formatINR(emp.employer_esi_3_25)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'STATUTORY' && (
            <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4">
              <h4 className="font-bold text-gray-900 text-sm">Statutory Employer Contribution Breakup</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200">
                  <h5 className="font-black text-indigo-900 text-xs mb-2">EPFO (13.00% Pass-Through)</h5>
                  <div className="space-y-1 text-xs text-gray-700">
                    <div className="flex justify-between">
                      <span>Employer EPF (3.67%):</span>
                      <span className="font-mono font-bold">{formatINR(run.employee_results.reduce((s, e) => s + e.employer_epf_3_67, 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Employer EPS (8.33%):</span>
                      <span className="font-mono font-bold">{formatINR(run.employee_results.reduce((s, e) => s + e.employer_eps_8_33, 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>EDLI (0.50%):</span>
                      <span className="font-mono font-bold">{formatINR(run.employee_results.reduce((s, e) => s + e.employer_edli_0_5, 0))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Admin Charges (0.50%):</span>
                      <span className="font-mono font-bold">{formatINR(run.employee_results.reduce((s, e) => s + e.employer_pf_admin_0_5, 0))}</span>
                    </div>
                    <div className="border-t border-indigo-200 pt-1.5 flex justify-between font-black text-indigo-900">
                      <span>Total Employer PF:</span>
                      <span className="font-mono">{formatINR(run.total_employer_pf)}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-indigo-50/50 border border-indigo-200">
                  <h5 className="font-black text-indigo-900 text-xs mb-2">ESIC (3.25% Pass-Through)</h5>
                  <div className="space-y-1 text-xs text-gray-700">
                    <div className="flex justify-between">
                      <span>Eligible Workforce Headcount:</span>
                      <span className="font-bold text-gray-900">{run.active_employee_count} Associates</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Statutory Rate:</span>
                      <span className="font-bold">3.25% of Gross Wages</span>
                    </div>
                    <div className="border-t border-indigo-200 pt-1.5 flex justify-between font-black text-indigo-900">
                      <span>Total Employer ESI:</span>
                      <span className="font-mono">{formatINR(run.total_employer_esi)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
