import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { Modal } from '../../../components/ui/Modal';
import { useToast } from '../../../components/ui/Toast';
import {
  CreditCard,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization } from '../../../types/vendorPortal';

interface VendorPaymentsReconciliationViewProps {
  activeVendor: VendorOrganization;
  activePeriod: string;
  onRefresh: () => void;
}

export const VendorPaymentsReconciliationView: React.FC<VendorPaymentsReconciliationViewProps> = ({
  activeVendor,
  activePeriod,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [payAmount, setPayAmount] = useState(0);
  const [bankRef, setBankRef] = useState('');

  const payments = vendorPortalService.getPayments(activeVendor.id);
  const invoices = vendorPortalService.getInvoices(activeVendor.id);
  const payable = vendorPortalService.getVendorPayableBreakdown(activePeriod, activeVendor.id);
  const pos = vendorPortalService.getPurchaseOrders(activeVendor.id);
  const activePo = pos[0];

  const totalInvoiced = invoices.reduce((s, i) => s + i.total_invoice_amount, 0);
  const totalPaid = payments.reduce((s, p) => s + p.paid_amount, 0);
  const totalOutstanding = totalInvoiced - totalPaid;

  const handleOpenRecordPayment = (invId?: string) => {
    const inv = invoices.find((i) => i.id === invId) || invoices[0];
    if (!inv) {
      showToast('No submitted invoice available to reconcile payment');
      return;
    }
    setSelectedInvoiceId(inv.id);
    setPayAmount(inv.total_invoice_amount);
    setBankRef(`NEFT-${Date.now().toString().slice(-6)}`);
    setIsRecordModalOpen(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    vendorPortalService.recordPayment(selectedInvoiceId, payAmount, bankRef);
    showToast('Payment confirmed and reconciled in general ledger!');
    setIsRecordModalOpen(false);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Payments & Commercial Reconciliation Matrix
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            4-Way Reconciliation across PO Contract Limits, Locked Payroll, Claimed Invoices, and Bank Disbursals.
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => handleOpenRecordPayment()}>
          <CreditCard className="w-4 h-4 mr-1.5" />
          Record Bank Payment Receipt
        </Button>
      </div>

      {/* 4-Way Reconciliation Matrix Banner */}
      <Card className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-0 shadow-lg">
        <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
          <Layers className="w-4 h-4" />
          4-Way Commercial Reconciliation Matrix ({activePeriod})
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-gray-300 uppercase font-semibold">1. PO Budget Limit</span>
            <div className="text-lg font-bold font-mono text-white mt-1">
              ₹{(activePo?.contract_value || 0).toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-300 mt-1 block">Active PO-089</span>
          </div>

          <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-gray-300 uppercase font-semibold">2. Approved Payroll</span>
            <div className="text-lg font-bold font-mono text-white mt-1">
              ₹{payable.net_vendor_payable.toLocaleString()}
            </div>
            <span className="text-[10px] text-indigo-300 mt-1 block">Locked Timesheets</span>
          </div>

          <div className="bg-white/10 p-3.5 rounded-xl border border-white/10">
            <span className="text-[10px] text-gray-300 uppercase font-semibold">3. Submitted Invoice</span>
            <div className="text-lg font-bold font-mono text-white mt-1">
              ₹{totalInvoiced.toLocaleString()}
            </div>
            <span className="text-[10px] text-amber-300 mt-1 block">3-Way Matched</span>
          </div>

          <div className="bg-emerald-500/20 p-3.5 rounded-xl border border-emerald-400/30">
            <span className="text-[10px] text-emerald-200 uppercase font-semibold">4. Disbursed Payments</span>
            <div className="text-lg font-bold font-mono text-emerald-300 mt-1">
              ₹{totalPaid.toLocaleString()}
            </div>
            <span className="text-[10px] text-emerald-200 mt-1 block">
              Outstanding: ₹{totalOutstanding.toLocaleString()}
            </span>
          </div>
        </div>
      </Card>

      {/* Payment Ledger Table */}
      <Card className="overflow-hidden p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-bold text-gray-700 text-xs">Invoice Ref</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs">Client Company</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Invoice Amount</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Paid Amount</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Outstanding</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-center">Status</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((p) => (
              <TableRow key={p.id} className="hover:bg-gray-50/50">
                <TableCell>
                  <div>
                    <div className="font-bold text-xs text-gray-900 font-mono">{p.invoice_number}</div>
                    <div className="text-[11px] text-gray-500 font-mono">{p.po_number}</div>
                  </div>
                </TableCell>

                <TableCell className="text-xs text-gray-800 font-medium">{p.client_company_name}</TableCell>

                <TableCell className="text-right font-mono text-xs font-bold text-gray-900">
                  ₹{p.invoice_amount.toLocaleString()}
                </TableCell>

                <TableCell className="text-right font-mono text-xs font-bold text-emerald-700">
                  ₹{p.paid_amount.toLocaleString()}
                </TableCell>

                <TableCell className="text-right font-mono text-xs font-bold text-rose-600">
                  ₹{p.outstanding_amount.toLocaleString()}
                </TableCell>

                <TableCell className="text-center">
                  <Badge variant={p.payment_status === 'PAID' ? 'success' : 'warning'} size="sm">
                    {p.payment_status}
                  </Badge>
                </TableCell>

                <TableCell className="text-right">
                  {p.payment_status !== 'PAID' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-emerald-700 hover:bg-emerald-50"
                      onClick={() => handleOpenRecordPayment(p.invoice_id)}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                      Record Settlement
                    </Button>
                  )}
                  {p.payment_status === 'PAID' && (
                    <span className="text-[11px] text-gray-400 font-mono">{p.payment_reference}</span>
                  )}
                </TableCell>
              </TableRow>
            ))}

            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-gray-500 text-xs">
                  Zero active invoices currently pending reconciliation.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Bank Payment Settlement"
        maxWidth="md"
      >
        <form onSubmit={handleConfirmPayment} className="space-y-4 p-1">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Invoice</label>
            <select
              value={selectedInvoiceId}
              onChange={(e) => {
                setSelectedInvoiceId(e.target.value);
                const inv = invoices.find((i) => i.id === e.target.value);
                if (inv) setPayAmount(inv.total_invoice_amount);
              }}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none font-mono"
            >
              {invoices.map((inv) => (
                <option key={inv.id} value={inv.id}>
                  {inv.invoice_number} - ₹{inv.total_invoice_amount.toLocaleString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Disbursed Amount (₹) *</label>
            <input
              type="number"
              required
              value={payAmount}
              onChange={(e) => setPayAmount(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none font-mono font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Bank Reference / UTR Number *</label>
            <input
              type="text"
              required
              value={bankRef}
              onChange={(e) => setBankRef(e.target.value)}
              placeholder="e.g. NEFT-HDFC-9918239"
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" type="button" onClick={() => setIsRecordModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Confirm & Reconcile
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
