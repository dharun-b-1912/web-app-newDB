// src/features/platform/components/billing/InvoicePreviewModal.tsx
// ============================================================
// Joy PeopleHR — Corporate Tax Invoice Document Renderer & Print View
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
  ShieldCheck,
  Receipt,
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

  // Dedicated 100% Isolated A4 Print Function (Zero Browser Headers/Footers, Premium Styling)
  const handlePrint = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=1100');
    if (!printWindow) {
      window.print();
      return;
    }

    const isIntrastate = inv.cgst_amount && inv.cgst_amount > 0;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Joy PeopleHR_Tax_Invoice_${inv.invoice_number}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0; /* Eliminates browser default headers, footers & URL */
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              background: #ffffff;
              color: #0f172a;
              padding: 14mm 16mm;
              font-size: 11px;
              line-height: 1.5;
            }
            .invoice-wrapper {
              border: 1.5px solid #047857;
              border-radius: 12px;
              overflow: hidden;
              background: #ffffff;
            }
            .top-banner {
              background: linear-gradient(135deg, #064e3b 0%, #047857 100%);
              color: #ffffff;
              padding: 18px 24px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .brand-name {
              font-size: 20px;
              font-weight: 800;
              letter-spacing: -0.5px;
            }
            .brand-sub {
              font-size: 10px;
              opacity: 0.9;
              margin-top: 2px;
            }
            .inv-badge-title {
              text-align: right;
            }
            .inv-badge-title h1 {
              font-size: 20px;
              font-weight: 900;
              letter-spacing: 1.5px;
              color: #ffffff;
            }
            .inv-badge-title p {
              font-size: 12px;
              font-weight: 700;
              opacity: 0.95;
              font-family: monospace;
              letter-spacing: 0.5px;
            }

            .meta-grid {
              display: grid;
              grid-template-columns: 1.2fr 1fr;
              gap: 20px;
              padding: 18px 24px;
              border-bottom: 1px solid #e2e8f0;
              background: #f8fafc;
            }
            .section-label {
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              letter-spacing: 0.8px;
              color: #047857;
              margin-bottom: 4px;
            }
            .entity-name {
              font-size: 13px;
              font-weight: 700;
              color: #0f172a;
              margin-bottom: 2px;
            }
            .meta-line {
              font-size: 10.5px;
              color: #475569;
              line-height: 1.4;
            }
            .meta-line strong {
              color: #1e293b;
            }

            .info-cards {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 12px;
              padding: 12px 24px;
              border-bottom: 1px solid #e2e8f0;
              background: #ffffff;
            }
            .info-cell {
              padding: 6px 0;
            }
            .info-cell-label {
              font-size: 9px;
              font-weight: 700;
              text-transform: uppercase;
              color: #64748b;
            }
            .info-cell-value {
              font-size: 11px;
              font-weight: 700;
              color: #0f172a;
              font-family: monospace;
              margin-top: 2px;
            }

            .items-container {
              padding: 16px 24px;
            }
            table.items-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            table.items-table th {
              background: #0f172a;
              color: #ffffff;
              font-size: 9.5px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              padding: 8px 12px;
              text-align: left;
            }
            table.items-table td {
              padding: 10px 12px;
              border-bottom: 1px solid #e2e8f0;
              font-size: 11px;
              color: #1e293b;
            }
            table.items-table tr:nth-child(even) td {
              background: #f8fafc;
            }

            .summary-flex {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding: 16px 24px;
              border-top: 1px solid #e2e8f0;
              background: #ffffff;
            }
            .bank-box {
              max-width: 320px;
              border: 1px solid #cbd5e1;
              border-radius: 8px;
              padding: 12px;
              background: #f8fafc;
            }
            .bank-title {
              font-size: 9px;
              font-weight: 800;
              text-transform: uppercase;
              color: #047857;
              margin-bottom: 4px;
            }
            .status-pill {
              display: inline-block;
              padding: 3px 10px;
              border-radius: 999px;
              font-size: 10px;
              font-weight: 800;
              text-transform: uppercase;
              margin-top: 8px;
              background: #ecfdf5;
              color: #047857;
              border: 1px solid #a7f3d0;
            }

            .calc-table {
              width: 310px;
              border-collapse: collapse;
            }
            .calc-table td {
              padding: 4px 0;
              font-size: 11px;
              color: #475569;
            }
            .calc-table .val {
              text-align: right;
              font-weight: 700;
              font-family: monospace;
              color: #0f172a;
            }
            .grand-total-row td {
              padding-top: 8px;
              border-top: 2px solid #047857;
              font-size: 14px;
              font-weight: 800;
              color: #047857;
            }
            .grand-total-row .val {
              color: #047857;
              font-size: 15px;
            }

            .footer-section {
              padding: 14px 24px;
              background: #f8fafc;
              border-top: 1px solid #e2e8f0;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-size: 9.5px;
              color: #64748b;
            }
            .seal-box {
              text-align: right;
              font-size: 10px;
              color: #0f172a;
            }
          </style>
        </head>
        <body>
          <div class="invoice-wrapper">
            <!-- TOP BRANDED BANNER -->
            <div class="top-banner">
              <div>
                <div class="brand-name">Joy PeopleHR Technologies Pvt Ltd</div>
                <div class="brand-sub">Enterprise SaaS & Workforce Management Platform</div>
              </div>
              <div class="inv-badge-title">
                <h1>TAX INVOICE</h1>
                <p>${inv.invoice_number}</p>
              </div>
            </div>

            <!-- METADATA & PARTIES -->
            <div class="meta-grid">
              <div>
                <div class="section-label">Supplier (Issued By)</div>
                <div class="entity-name">Joy PeopleHR Technologies Pvt Ltd</div>
                <div class="meta-line">WorkForce Tech Park, OMR IT Corridor, Chennai, TN 600096, India</div>
                <div class="meta-line"><strong>GSTIN:</strong> ${inv.platform_gstin || '33AAACW0000A1Z5'} • <strong>PAN:</strong> AAACW0000A</div>
                <div class="meta-line"><strong>Email:</strong> billing@workforceos.in • <strong>Phone:</strong> +91 44 4800 9000</div>
              </div>

              <div>
                <div class="section-label">Billed To (Customer)</div>
                <div class="entity-name">${inv.tenant_name}</div>
                <div class="meta-line">${inv.billing_address || 'Chennai, Tamil Nadu, India'}</div>
                ${inv.tenant_gstin ? `<div class="meta-line"><strong>Customer GSTIN:</strong> ${inv.tenant_gstin}</div>` : '<div class="meta-line"><strong>Customer Type:</strong> Unregistered / Business Tenant</div>'}
                <div class="meta-line"><strong>Place of Supply:</strong> ${inv.place_of_supply || 'Tamil Nadu (33)'}</div>
              </div>
            </div>

            <!-- INVOICE DATES & TERMS STRIP -->
            <div class="info-cards">
              <div class="info-cell">
                <div class="info-cell-label">Issue Date</div>
                <div class="info-cell-value">${inv.issue_date || inv.billing_date}</div>
              </div>
              <div class="info-cell">
                <div class="info-cell-label">Due Date</div>
                <div class="info-cell-value">${inv.due_date}</div>
              </div>
              <div class="info-cell">
                <div class="info-cell-label">Plan Tier</div>
                <div class="info-cell-value" style="color: #6b21a8;">${inv.plan_tier || 'Professional'} Plan</div>
              </div>
              <div class="info-cell">
                <div class="info-cell-label">Payment Status</div>
                <div class="info-cell-value" style="color: #047857;">● ${inv.status.toUpperCase()}</div>
              </div>
            </div>

            <!-- LINE ITEMS TABLE -->
            <div class="items-container">
              <table class="items-table">
                <thead>
                  <tr>
                    <th style="width: 35px;">#</th>
                    <th>Item Description</th>
                    <th style="width: 85px;">SAC Code</th>
                    <th style="width: 50px; text-align: center;">Qty</th>
                    <th style="width: 100px; text-align: right;">Rate (₹)</th>
                    <th style="width: 110px; text-align: right;">Taxable (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  ${(inv.line_items || [])
                    .map(
                      (li, idx) => `
                    <tr>
                      <td style="font-family: monospace; font-weight: bold;">${idx + 1}</td>
                      <td>
                        <strong>${li.description}</strong>
                        <div style="font-size: 9.5px; color: #64748b;">Cloud HR, Payroll & Attendance Subscription Engine</div>
                      </td>
                      <td style="font-family: monospace; color: #475569;">${li.hsn_sac}</td>
                      <td style="text-align: center; font-family: monospace; font-weight: bold;">${li.qty}</td>
                      <td style="text-align: right; font-family: monospace;">₹${li.unit_price.toLocaleString('en-IN')}</td>
                      <td style="text-align: right; font-family: monospace; font-weight: bold;">₹${li.taxable_amount.toLocaleString('en-IN')}</td>
                    </tr>
                  `
                    )
                    .join('')}
                </tbody>
              </table>
            </div>

            <!-- SUMMARY & BANKING -->
            <div class="summary-flex">
              <div class="bank-box">
                <div class="bank-title">Bank & Settlement Details</div>
                <div class="meta-line"><strong>Bank:</strong> HDFC Bank Ltd • Current A/C</div>
                <div class="meta-line"><strong>Account No:</strong> 50200012345678</div>
                <div class="meta-line"><strong>IFSC Code:</strong> HDFC0000240</div>
                <div class="meta-line"><strong>Branch:</strong> OMR IT Corridor, Chennai</div>
                ${inv.transaction_ref ? `<div class="meta-line" style="margin-top: 4px; color: #047857;"><strong>Settlement Ref:</strong> ${inv.transaction_ref}</div>` : ''}
                <div>
                  <span class="status-pill">● ${inv.status.toUpperCase()}</span>
                </div>
              </div>

              <table class="calc-table">
                <tr>
                  <td>Subtotal (Taxable Amount):</td>
                  <td class="val">₹${inv.subtotal.toLocaleString('en-IN')}</td>
                </tr>
                ${
                  isIntrastate
                    ? `
                  <tr>
                    <td>CGST (Central Tax 9%):</td>
                    <td class="val">₹${inv.cgst_amount?.toLocaleString('en-IN')}</td>
                  </tr>
                  <tr>
                    <td>SGST (State Tax 9%):</td>
                    <td class="val">₹${inv.sgst_amount?.toLocaleString('en-IN')}</td>
                  </tr>
                `
                    : `
                  <tr>
                    <td>IGST (Integrated Tax 18%):</td>
                    <td class="val">₹${(inv.igst_amount || inv.gst_amount || 0).toLocaleString('en-IN')}</td>
                  </tr>
                `
                }
                <tr class="grand-total-row">
                  <td>Total Invoice Value:</td>
                  <td class="val">₹${inv.total.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="padding-top: 6px;">Amount Paid:</td>
                  <td class="val" style="color: #047857; padding-top: 6px;">₹${inv.amount_paid.toLocaleString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="font-weight: 700;">Balance Due:</td>
                  <td class="val" style="font-weight: 800; color: ${inv.balance_due === 0 ? '#047857' : '#dc2626'};">₹${inv.balance_due.toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </div>

            <!-- FOOTER DISCLAIMER -->
            <div class="footer-section">
              <div>
                <p>Thank you for choosing Joy PeopleHR. Computer-generated tax invoice under Indian GST Rules.</p>
                <p>For billing queries: billing@workforceos.in • Support: +91 44 4800 9000</p>
              </div>
              <div class="seal-box">
                <p style="font-weight: 700;">For Joy PeopleHR Technologies Pvt Ltd</p>
                <p style="font-size: 8.5px; color: #64748b; margin-top: 2px;">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 450);
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

        {/* Enhanced Corporate Tax Invoice Preview in Modal */}
        <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50 rounded-2xl border border-gray-200">
          <div className="bg-white rounded-2xl border-2 border-[#047857] overflow-hidden shadow-xs text-xs text-gray-800">
            {/* BRANDED TOP BAR */}
            <div className="bg-gradient-to-r from-[#064e3b] to-[#047857] text-white p-5 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold tracking-tight">Joy PeopleHR Technologies Pvt Ltd</h2>
                <p className="text-[11px] text-emerald-100 mt-0.5">Enterprise SaaS & Workforce Management Platform</p>
              </div>
              <div className="text-right">
                <span className="text-lg font-black tracking-widest block">TAX INVOICE</span>
                <span className="font-mono text-xs font-bold text-emerald-100">{inv.invoice_number}</span>
              </div>
            </div>

            {/* TWO COLUMN PARTIES GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-gray-50/70 border-b border-gray-200">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#047857] uppercase tracking-wider block">Supplier (Issued By)</span>
                <strong className="text-sm font-bold text-gray-900 block">Joy PeopleHR Technologies Pvt Ltd</strong>
                <p className="text-gray-600">WorkForce Tech Park, OMR IT Corridor, Chennai, TN 600096, India</p>
                <p className="font-mono text-gray-700"><strong>GSTIN:</strong> {inv.platform_gstin || '33AAACW0000A1Z5'} • <strong>PAN:</strong> AAACW0000A</p>
                <p className="text-gray-500">Email: billing@workforceos.in • Phone: +91 44 4800 9000</p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#047857] uppercase tracking-wider block">Billed To (Customer)</span>
                <strong className="text-sm font-bold text-gray-900 block">{inv.tenant_name}</strong>
                <p className="text-gray-600">{inv.billing_address || 'Chennai, Tamil Nadu, India'}</p>
                {inv.tenant_gstin ? (
                  <p className="font-mono text-gray-700"><strong>Customer GSTIN:</strong> {inv.tenant_gstin}</p>
                ) : (
                  <p className="text-gray-500">Customer Type: Unregistered / Business Tenant</p>
                )}
                <p className="text-gray-700"><strong>Place of Supply:</strong> {inv.place_of_supply || 'Tamil Nadu (33)'}</p>
              </div>
            </div>

            {/* DATES STRIP */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-white border-b border-gray-200 text-xs">
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Issue Date</span>
                <strong className="font-mono text-gray-900">{inv.issue_date || inv.billing_date}</strong>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Due Date</span>
                <strong className="font-mono text-gray-900">{inv.due_date}</strong>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Plan Tier</span>
                <span className="font-bold text-purple-700">{inv.plan_tier || 'Professional'} Plan</span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">Status</span>
                <span className="font-bold text-[#047857]">● {inv.status.toUpperCase()}</span>
              </div>
            </div>

            {/* LINE ITEMS TABLE */}
            <div className="p-5 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-900 text-white uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">SAC Code</th>
                    <th className="py-2.5 px-3 text-center">Qty</th>
                    <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right">Taxable (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {(inv.line_items || []).map((li, idx) => (
                    <tr key={li.id || idx} className="hover:bg-gray-50/50">
                      <td className="py-3 px-3 font-mono font-bold">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <strong className="text-gray-900 block">{li.description}</strong>
                        <span className="text-[10px] text-gray-500">Cloud HR, Payroll & Attendance Subscription Engine</span>
                      </td>
                      <td className="py-3 px-3 font-mono text-gray-600">{li.hsn_sac}</td>
                      <td className="py-3 px-3 text-center font-mono font-bold">{li.qty}</td>
                      <td className="py-3 px-3 text-right font-mono">₹{li.unit_price.toLocaleString('en-IN')}</td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">₹{li.taxable_amount.toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* SUMMARY & BANKING SECTION */}
            <div className="p-5 border-t border-gray-200 bg-white flex flex-col sm:flex-row justify-between gap-6">
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 max-w-sm space-y-1.5 text-xs">
                <span className="text-[10px] font-bold text-[#047857] uppercase tracking-wider block">Bank & Settlement Details</span>
                <p className="text-gray-600"><strong>Bank:</strong> HDFC Bank Ltd • Current A/C</p>
                <p className="text-gray-600"><strong>Account No:</strong> 50200012345678</p>
                <p className="text-gray-600"><strong>IFSC Code:</strong> HDFC0000240</p>
                {inv.transaction_ref && (
                  <p className="font-mono text-[#047857] pt-1"><strong>Settlement Ref:</strong> {inv.transaction_ref}</p>
                )}
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-[#047857] border border-emerald-200 font-bold text-[10px] uppercase">
                    ● {inv.status}
                  </span>
                </div>
              </div>

              <div className="w-80 space-y-2 text-xs">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal (Taxable):</span>
                  <strong className="font-mono text-gray-900">₹{inv.subtotal.toLocaleString('en-IN')}</strong>
                </div>

                {inv.cgst_amount && inv.cgst_amount > 0 ? (
                  <>
                    <div className="flex justify-between text-gray-600">
                      <span>CGST (9%):</span>
                      <strong className="font-mono text-gray-900">₹{inv.cgst_amount.toLocaleString('en-IN')}</strong>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>SGST (9%):</span>
                      <strong className="font-mono text-gray-900">₹{inv.sgst_amount?.toLocaleString('en-IN')}</strong>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-gray-600">
                    <span>IGST (18%):</span>
                    <strong className="font-mono text-gray-900">₹{(inv.igst_amount || inv.gst_amount || 0).toLocaleString('en-IN')}</strong>
                  </div>
                )}

                <div className="flex justify-between border-t-2 border-[#047857] pt-2 text-sm font-bold text-[#047857]">
                  <span>Grand Total:</span>
                  <span className="font-mono text-base">₹{inv.total.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between text-xs text-gray-600">
                  <span>Amount Paid:</span>
                  <strong className="font-mono text-[#047857]">₹{inv.amount_paid.toLocaleString('en-IN')}</strong>
                </div>

                <div className="flex justify-between text-xs font-bold border-t pt-1">
                  <span>Balance Due:</span>
                  <span className={cn('font-mono', inv.balance_due === 0 ? 'text-[#047857]' : 'text-rose-600')}>
                    ₹{inv.balance_due.toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* DISCLAIMER FOOTER */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center text-[10px] text-gray-500">
              <div>
                <p>Thank you for choosing Joy PeopleHR. Computer-generated tax invoice under Indian GST Rules.</p>
                <p>Billing Support: billing@workforceos.in • +91 44 4800 9000</p>
              </div>
              <div className="text-right font-semibold text-gray-700">
                <p>For Joy PeopleHR Technologies Pvt Ltd</p>
                <p className="text-[9px] text-gray-400">Authorized Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
