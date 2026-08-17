// src/features/platform/components/billing/InvoicePreviewModal.tsx
// ============================================================
// WorkForceOS — Corporate Tax Invoice Document Renderer & Print View
// ============================================================

import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  Mail,
  Send,
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  RotateCcw,
  X,
  Sparkles,
  QrCode,
  DollarSign,
  AlertTriangle,
} from 'lucide-react';
import { DetailedInvoice, platformBillingService } from '../../../../services/platform/platformBillingService';
import { Button } from '../../../../components/ui/Button';
import { useToast } from '../../../../components/ui/Toast';
import { cn } from '../../../../lib/utils';

export interface InvoicePreviewModalProps {
  isOpen: boolean;
  invoice: DetailedInvoice;
  onClose: () => void;
  onRecordPayment: (invoice: DetailedInvoice) => void;
  onIssueCreditNote: (invoice: DetailedInvoice) => void;
  onIssueRefund: (invoice: DetailedInvoice) => void;
  onRefreshData?: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  isOpen,
  invoice: inv,
  onClose,
  onRecordPayment,
  onIssueCreditNote,
  onIssueRefund,
  onRefreshData,
}) => {
  const { showToast } = useToast();
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isSendingWhatsApp, setIsSendingWhatsApp] = useState(false);

  if (!isOpen) return null;

  // Dedicated 100% Isolated A4 Print Function
  const handlePrint = () => {
    const printContent = document.getElementById('invoice-print-document');
    if (!printContent) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank', 'width=850,height=1000');
    if (!printWindow) {
      window.print();
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Tax Invoice - ${inv.invoice_number}</title>
          <style>
            @page { size: A4 portrait; margin: 15mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { background: #ffffff; color: #111827; padding: 20px; font-size: 12px; line-height: 1.5; }
            .header-flex { display: flex; justify-content: space-between; border-bottom: 2px solid #047857; padding-bottom: 20px; margin-bottom: 20px; }
            .company-title { font-size: 18px; font-weight: bold; color: #047857; }
            .inv-title { font-size: 22px; font-weight: 900; color: #047857; letter-spacing: 1px; text-align: right; }
            .meta-text { color: #4b5563; font-size: 11px; }
            .bill-to { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
            th { background: #f3f4f6; border-bottom: 2px solid #d1d5db; padding: 8px 10px; text-align: left; text-transform: uppercase; font-size: 10px; font-weight: bold; color: #374151; }
            td { padding: 10px; border-bottom: 1px solid #e5e7eb; }
            .totals-table { width: 300px; margin-left: auto; font-size: 12px; }
            .totals-table td { padding: 6px 0; }
            .grand-total { font-size: 16px; font-weight: bold; color: #047857; border-top: 2px solid #047857; padding-top: 8px !important; }
            .paid-badge { display: inline-block; background: #ecfdf5; color: #047857; border: 1px solid #a7f3d0; padding: 4px 10px; border-radius: 9999px; font-weight: bold; font-size: 11px; }
            .footer-notes { border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 20px; color: #6b7280; font-size: 10px; }
          </style>
        </head>
        <body>
          <div class="header-flex">
            <div>
              <div class="company-title">WorkForceOS Technologies Pvt Ltd</div>
              <p class="meta-text">WorkForce Tech Park, OMR IT Corridor, Chennai, TN 600096</p>
              <p class="meta-text">GSTIN: ${inv.platform_gstin || '33AAACW0000A1Z5'} • PAN: AAACW0000A</p>
              <p class="meta-text">Email: billing@workforceos.in • Phone: +91 44 4800 9000</p>
            </div>
            <div>
              <div class="inv-title">TAX INVOICE</div>
              <p style="font-weight: bold; font-size: 14px; text-align: right;">${inv.invoice_number}</p>
              <p class="meta-text" style="text-align: right;">Issue Date: <strong>${inv.issue_date || inv.billing_date}</strong></p>
              <p class="meta-text" style="text-align: right;">Due Date: <strong>${inv.due_date}</strong></p>
              <p class="meta-text" style="text-align: right;">Place of Supply: <strong>${inv.place_of_supply || 'Tamil Nadu (33)'}</strong></p>
            </div>
          </div>

          <div class="bill-to">
            <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #6b7280;">Billed To (Customer)</div>
            <strong style="font-size: 14px; color: #111827;">${inv.tenant_name}</strong>
            <p class="meta-text">${inv.billing_address || 'Chennai, Tamil Nadu, India'}</p>
            ${inv.tenant_gstin ? `<p class="meta-text"><strong>GSTIN:</strong> ${inv.tenant_gstin}</p>` : ''}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>Description</th>
                <th style="width: 80px;">HSN/SAC</th>
                <th style="text-align: center; width: 50px;">Qty</th>
                <th style="text-align: right; width: 90px;">Rate (₹)</th>
                <th style="text-align: right; width: 100px;">Taxable (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${(inv.line_items || [])
                .map(
                  (li, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${li.description}</strong></td>
                  <td>${li.hsn_sac}</td>
                  <td style="text-align: center;">${li.qty}</td>
                  <td style="text-align: right;">₹${li.unit_price.toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-weight: bold;">₹${li.taxable_amount.toLocaleString('en-IN')}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 10px;">
            <div style="max-width: 350px;">
              <div style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #6b7280; margin-bottom: 4px;">Bank & Settlement Details</div>
              <p class="meta-text">HDFC Bank Ltd • A/C: 50200012345678 • IFSC: HDFC0000240</p>
              ${inv.transaction_ref ? `<p class="meta-text" style="color: #047857; margin-top: 4px;"><strong>Payment Ref:</strong> ${inv.transaction_ref}</p>` : ''}
              <div style="margin-top: 8px;">
                <span class="paid-badge">● ${inv.status.toUpperCase()}</span>
              </div>
            </div>

            <table class="totals-table">
              <tr>
                <td>Subtotal (Taxable):</td>
                <td style="text-align: right; font-weight: bold;">₹${inv.subtotal.toLocaleString('en-IN')}</td>
              </tr>
              ${
                inv.cgst_amount && inv.cgst_amount > 0
                  ? `
                <tr>
                  <td>CGST (9%):</td>
                  <td style="text-align: right;">₹${inv.cgst_amount.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td>SGST (9%):</td>
                  <td style="text-align: right;">₹${inv.sgst_amount?.toLocaleString('en-IN')}</td>
                </tr>
              `
                  : `
                <tr>
                  <td>IGST (18%):</td>
                  <td style="text-align: right;">₹${(inv.igst_amount || inv.gst_amount || 0).toLocaleString('en-IN')}</td>
                </tr>
              `
              }
              <tr class="grand-total">
                <td>Grand Total:</td>
                <td style="text-align: right;">₹${inv.total.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td>Amount Paid:</td>
                <td style="text-align: right; color: #047857; font-weight: bold;">₹${inv.amount_paid.toLocaleString('en-IN')}</td>
              </tr>
              <tr>
                <td style="font-weight: bold;">Balance Due:</td>
                <td style="text-align: right; font-weight: bold; color: ${inv.balance_due === 0 ? '#047857' : '#dc2626'};">₹${inv.balance_due.toLocaleString('en-IN')}</td>
              </tr>
            </table>
          </div>

          <div class="footer-notes">
            <p>Thank you for choosing WorkForceOS. Computer-generated tax invoice. No signature required.</p>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 400);
  };

  const handleDownloadPdf = () => {
    handlePrint();
  };

  const handleSendEmail = async () => {
    setIsSendingEmail(true);
    try {
      await platformBillingService.deliverEmail(inv.id, 'billing@joycorporate.com');
      showToast(`Invoice ${inv.invoice_number} sent via email!`, 'success');
      onRefreshData?.();
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleSendWhatsApp = async () => {
    setIsSendingWhatsApp(true);
    try {
      await platformBillingService.deliverWhatsApp(inv.id, '+91 98765 43210');
      showToast(`Invoice ${inv.invoice_number} sent via WhatsApp Cloud API!`, 'success');
      onRefreshData?.();
    } finally {
      setIsSendingWhatsApp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl space-y-6 max-h-[95vh] flex flex-col">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-4">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-gray-900">{inv.invoice_number}</h3>
            <span
              className={cn(
                'text-[10px] font-bold px-2.5 py-0.5 rounded-full border',
                inv.status === 'Paid'
                  ? 'bg-emerald-50 text-[#047857] border-emerald-200'
                  : inv.status === 'Partially Paid'
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              )}
            >
              ● {inv.status}
            </span>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="h-8 text-xs font-bold">
              <Printer className="w-3.5 h-3.5 mr-1" /> Print / A4
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="h-8 text-xs font-bold">
              <Download className="w-3.5 h-3.5 mr-1" /> Download PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleSendEmail} disabled={isSendingEmail} className="h-8 text-xs font-bold">
              <Mail className="w-3.5 h-3.5 mr-1" /> {isSendingEmail ? 'Sending...' : 'Email'}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSendWhatsApp} disabled={isSendingWhatsApp} className="h-8 text-xs font-bold text-emerald-700 border-emerald-300">
              <Send className="w-3.5 h-3.5 mr-1" /> WhatsApp
            </Button>

            {inv.balance_due > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => onRecordPayment(inv)}
                className="h-8 bg-[#047857] hover:bg-[#036246] text-white font-bold text-xs"
              >
                <DollarSign className="w-3.5 h-3.5 mr-1" /> Record Payment
              </Button>
            )}

            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 cursor-pointer ml-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Invoice Content */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 rounded-2xl border border-gray-200">
          <div id="invoice-print-document" className="bg-white p-8 rounded-xl shadow-xs border border-gray-100 space-y-6 text-xs text-gray-800">
            {/* INVOICE HEADER */}
            <div className="flex flex-col sm:flex-row justify-between gap-6 border-b pb-6">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#047857] text-white font-bold flex items-center justify-center text-sm">
                    W
                  </div>
                  <strong className="text-base font-bold text-gray-900">WorkForceOS Technologies Pvt Ltd</strong>
                </div>
                <p className="text-gray-500">WorkForce Tech Park, OMR IT Corridor, Chennai, TN 600096</p>
                <p className="font-mono text-gray-600">GSTIN: {inv.platform_gstin || '33AAACW0000A1Z5'} • PAN: AAACW0000A</p>
                <p className="text-gray-500">Email: billing@workforceos.in • Phone: +91 44 4800 9000</p>
              </div>

              <div className="text-right space-y-1 font-mono">
                <span className="text-xl font-extrabold text-[#047857] tracking-wider block">TAX INVOICE</span>
                <div className="font-bold text-gray-900 text-sm">{inv.invoice_number}</div>
                <div className="text-gray-600">Issue Date: <strong>{inv.issue_date || inv.billing_date}</strong></div>
                <div className="text-gray-600">Due Date: <strong>{inv.due_date}</strong></div>
                <div className="text-gray-600">Place of Supply: <strong>{inv.place_of_supply || 'Tamil Nadu (33)'}</strong></div>
              </div>
            </div>

            {/* BILL TO CUSTOMER */}
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Billed To (Customer)</span>
              <strong className="text-sm font-bold text-gray-900 block">{inv.tenant_name}</strong>
              <p className="text-gray-600">{inv.billing_address || 'Chennai, Tamil Nadu, India'}</p>
              {inv.tenant_gstin && <p className="font-mono text-gray-700">GSTIN: {inv.tenant_gstin}</p>}
            </div>

            {/* LINE ITEMS TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-100 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">#</th>
                    <th className="py-2 px-3">Description</th>
                    <th className="py-2 px-3">HSN/SAC</th>
                    <th className="py-2 px-3 text-center">Qty</th>
                    <th className="py-2 px-3 text-right">Rate (₹)</th>
                    <th className="py-2 px-3 text-right">Taxable (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {(inv.line_items || []).map((li, idx) => (
                    <tr key={li.id || idx}>
                      <td className="py-3 px-3 font-mono">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <strong className="text-gray-900 block">{li.description}</strong>
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-600">{li.hsn_sac}</td>
                      <td className="py-3 px-3 text-center font-mono">{li.qty}</td>
                      <td className="py-3 px-3 text-right font-mono">₹{li.unit_price.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold">₹{li.taxable_amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SUMMARY & TAX TOTALS */}
            <div className="flex flex-col sm:flex-row justify-between gap-6 border-t pt-4">
              <div className="space-y-2 max-w-sm">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Payment Instructions & Terms</span>
                <p className="text-gray-600 leading-relaxed">
                  Bank: HDFC Bank Ltd • A/C: 50200012345678 • IFSC: HDFC0000240. Computer-generated tax invoice.
                </p>
                {inv.transaction_ref && (
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 font-mono text-[11px] text-[#047857]">
                    Settled Ref: <strong>{inv.transaction_ref}</strong>
                  </div>
                )}
              </div>

              <div className="space-y-1.5 w-72 text-xs font-medium">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal (Taxable):</span>
                  <strong className="font-mono text-gray-900">₹{inv.subtotal.toLocaleString('en-IN')}</strong>
                </div>

                {inv.cgst_amount && inv.cgst_amount > 0 ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600">CGST (9%):</span>
                      <strong className="font-mono text-gray-900">₹{inv.cgst_amount.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">SGST (9%):</span>
                      <strong className="font-mono text-gray-900">₹{inv.sgst_amount?.toLocaleString('en-IN')}</strong>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-gray-600">IGST (18%):</span>
                    <strong className="font-mono text-gray-900">₹{(inv.igst_amount || inv.gst_amount || 0).toLocaleString('en-IN')}</strong>
                  </div>
                )}

                <div className="flex justify-between border-t border-gray-200 pt-2 text-sm font-bold">
                  <span className="text-gray-900">Total Invoice Amount:</span>
                  <span className="font-mono text-gray-900">₹{inv.total.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Amount Paid:</span>
                  <strong className="font-mono text-emerald-700">₹{inv.amount_paid.toLocaleString('en-IN')}</strong>
                </div>
                <div className="flex justify-between text-xs font-bold border-t pt-1">
                  <span className="text-gray-900">Balance Due:</span>
                  <span className={cn('font-mono', inv.balance_due === 0 ? 'text-[#047857]' : 'text-rose-600')}>
                    ₹{inv.balance_due.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
