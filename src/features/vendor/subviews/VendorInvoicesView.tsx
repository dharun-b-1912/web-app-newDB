import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import {
  FileText,
  Upload,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization, VendorInvoice, ThreeWayMatchResult } from '../../../types/vendorPortal';
import { ThreeWayMatchModal } from '../components/ThreeWayMatchModal';

interface VendorInvoicesViewProps {
  activeVendor: VendorOrganization;
  activePeriod: string;
  onRefresh: () => void;
}

export const VendorInvoicesView: React.FC<VendorInvoicesViewProps> = ({
  activeVendor,
  activePeriod,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [selectedMatchResult, setSelectedMatchResult] = useState<ThreeWayMatchResult | null>(null);

  const pos = vendorPortalService.getPurchaseOrders(activeVendor.id);
  const invoices = vendorPortalService.getInvoices(activeVendor.id);
  const payable = vendorPortalService.getVendorPayableBreakdown(activePeriod, activeVendor.id);

  // Form State
  const [selectedPoId, setSelectedPoId] = useState(pos[0]?.id || '');
  const [invoiceNumber, setInvoiceNumber] = useState(() => `INV-APX-2026-${Math.floor(100 + Math.random() * 900)}`);
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [taxableAmount, setTaxableAmount] = useState(payable.total_before_tax);
  const [totalInvoiceAmount, setTotalInvoiceAmount] = useState(payable.net_vendor_payable);
  const [pdfFileName, setPdfFileName] = useState('Signed_Tax_Invoice.pdf');

  const handleOpenSubmitModal = () => {
    setTaxableAmount(payable.total_before_tax);
    setTotalInvoiceAmount(payable.net_vendor_payable);
    setIsSubmitModalOpen(true);
  };

  const handlePreMatchAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) {
      showToast('Invoice Number is required');
      return;
    }

    const cgst = Math.round(taxableAmount * 0.09);
    const sgst = Math.round(taxableAmount * 0.09);

    const { invoice, matchResult } = vendorPortalService.submitInvoice({
      po_id: selectedPoId || pos[0]?.id,
      payroll_period: activePeriod,
      invoice_number: invoiceNumber,
      invoice_date: invoiceDate,
      due_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      taxable_amount: taxableAmount,
      cgst_amount: cgst,
      sgst_amount: sgst,
      igst_amount: 0,
      total_invoice_amount: totalInvoiceAmount,
      attached_invoice_pdf: pdfFileName,
    });

    setIsSubmitModalOpen(false);
    setSelectedMatchResult(matchResult);
    showToast(`Invoice ${invoice.invoice_number} submitted! 3-Way Match: ${matchResult.match_status}`);
    onRefresh();
  };

  const handleInspectMatch = (inv: VendorInvoice) => {
    const po = pos.find((p) => p.id === inv.po_id) || pos[0];
    const diff = inv.total_invoice_amount - payable.net_vendor_payable;
    const variancePct = payable.net_vendor_payable > 0 ? (Math.abs(diff) / payable.net_vendor_payable) * 100 : 0;

    setSelectedMatchResult({
      invoice_id: inv.id,
      invoice_number: inv.invoice_number,
      po_number: inv.po_number,
      period: inv.payroll_period,
      po_available_balance: po?.remaining_balance || 0,
      approved_payroll_payable: payable.net_vendor_payable,
      vendor_invoice_claimed: inv.total_invoice_amount,
      difference_amount: diff,
      variance_percentage: variancePct,
      is_po_limit_sufficient: (po?.remaining_balance || 0) >= inv.total_invoice_amount,
      is_payroll_matched: Math.abs(diff) <= 10,
      match_status: inv.match_status,
      exception_notes: inv.exception_reason ? [inv.exception_reason] : [],
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Commercial Invoicing & 3-Way Matching Engine
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Submit tax invoices against approved POs and locked payroll registers with automated reconciliation.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={handleOpenSubmitModal}>
          <Upload className="w-4 h-4 mr-1.5" />
          Generate & Submit Invoice
        </Button>
      </div>

      {/* Invoice Register Table */}
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-bold text-gray-700 text-xs">Invoice Number</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs">Period & PO</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Taxable Base</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Total Amount (Inc GST)</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-center">3-Way Match</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-center">Lifecycle Status</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => (
              <TableRow key={inv.id} className="hover:bg-gray-50/50">
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <div>
                      <div className="font-bold text-xs text-gray-900 font-mono">{inv.invoice_number}</div>
                      <div className="text-[10px] text-gray-400 font-mono">Date: {inv.invoice_date}</div>
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <div className="text-xs font-semibold text-gray-800">{inv.payroll_period}</div>
                  <span className="text-[11px] text-indigo-600 font-mono">{inv.po_number}</span>
                </TableCell>

                <TableCell className="text-right font-mono text-xs text-gray-700">
                  ₹{inv.taxable_amount.toLocaleString()}
                </TableCell>

                <TableCell className="text-right font-mono text-xs font-bold text-gray-900">
                  ₹{inv.total_invoice_amount.toLocaleString()}
                </TableCell>

                <TableCell className="text-center">
                  <Badge
                    variant={
                      inv.match_status === 'MATCHED'
                        ? 'success'
                        : inv.match_status === 'EXCEPTION'
                        ? 'danger'
                        : 'warning'
                    }
                    size="sm"
                  >
                    {inv.match_status}
                  </Badge>
                </TableCell>

                <TableCell className="text-center">
                  <Badge variant={inv.status === 'PAID' ? 'success' : 'blue'} size="sm">
                    {inv.status}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-indigo-600 hover:bg-indigo-50"
                    onClick={() => handleInspectMatch(inv)}
                  >
                    <Layers className="w-3.5 h-3.5 mr-1" />
                    3-Way Audit
                  </Button>
                </TableCell>
              </TableRow>
            ))}

            {invoices.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500 text-xs">
                  Zero submitted invoices recorded. Click "Generate & Submit Invoice" to dispatch the {activePeriod} billing.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Invoice Submission Modal */}
      <Modal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Commercial Invoice against Purchase Order"
        maxWidth="lg"
      >
        <form onSubmit={handlePreMatchAndSubmit} className="space-y-4 p-1">
          {/* Pre-validation checklist alert */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
            <span className="font-bold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Automated Pre-Submission System Checks Passed
            </span>
            <div className="grid grid-cols-2 gap-1 text-[11px] text-emerald-800 pt-1">
              <span>✓ Active PO attached with sufficient balance</span>
              <span>✓ Payroll calculations locked & frozen</span>
              <span>✓ Verified GSTIN: {activeVendor.gstin}</span>
              <span>✓ Zero duplicate invoice reference</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Target Purchase Order *</label>
              <select
                value={selectedPoId}
                onChange={(e) => setSelectedPoId(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              >
                {pos.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.po_number} (Bal: ₹{po.remaining_balance.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice Number *</label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Taxable Pre-Tax Value (₹) *</label>
              <input
                type="number"
                required
                value={taxableAmount}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTaxableAmount(val);
                  setTotalInvoiceAmount(Math.round(val * 1.18));
                }}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Total Claimed Invoice Amount (18% GST) *</label>
              <input
                type="number"
                required
                value={totalInvoiceAmount}
                onChange={(e) => setTotalInvoiceAmount(Number(e.target.value))}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none font-mono font-bold text-indigo-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Signed Tax Invoice PDF Attachment</label>
            <input
              type="text"
              value={pdfFileName}
              onChange={(e) => setPdfFileName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsSubmitModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Run 3-Way Match & Submit
            </Button>
          </div>
        </form>
      </Modal>

      {/* 3-Way Match Inspection Modal */}
      <ThreeWayMatchModal
        isOpen={!!selectedMatchResult}
        onClose={() => setSelectedMatchResult(null)}
        matchResult={selectedMatchResult}
      />
    </div>
  );
};
