// src/features/vendor/components/VendorPurchaseOrdersTab.tsx
// ============================================================================
// Joy PeopleHR — Enterprise B2B Purchase Orders Management Workspace
// Company PO Creation, Approval, Dispatch & Vendor Response (Accept/Reject/Change)
// Seamless Transition to Tax Invoice Generation
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Plus,
  Filter,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Send,
  Download,
  Eye,
  RefreshCw,
  Building,
  DollarSign,
  Calendar,
  Layers,
  FileCheck,
  CheckCircle2,
  Trash2,
  MapPin,
  ArrowRight,
} from 'lucide-react';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
} from '../../../types/vendorPortal';
import { PurchaseOrderService } from '../../../services/vendor/purchaseOrderService';
import { useToast } from '../../../components/ui/Toast';

interface Props {
  organizationId?: string;
  vendorId?: string;
  viewMode?: 'COMPANY' | 'VENDOR';
  onCreateInvoiceFromPo?: (po: PurchaseOrder) => void;
  onNavigateToInvoice?: (poId?: string) => void;
}

export const VendorPurchaseOrdersTab: React.FC<Props> = ({
  organizationId = 'org-joy-main',
  vendorId,
  viewMode = 'COMPANY',
  onCreateInvoiceFromPo,
  onNavigateToInvoice,
}) => {
  const { showToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [pos, setPos] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isResponseModalOpen, setIsResponseModalOpen] = useState(false);
  const [responseAction, setResponseAction] = useState<'ACCEPT' | 'REJECT' | 'REQUEST_CHANGES'>('ACCEPT');
  const [responseNote, setResponseNote] = useState('');
  const [changeCategory, setChangeCategory] = useState('PRICING_QUANTITY');

  // Create PO Form State
  const [newVendorId, setNewVendorId] = useState(vendorId || 'JOY MANPOWER SERVICE');
  const [newPoNumber, setNewPoNumber] = useState(
    `PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [newContractRef, setNewContractRef] = useState('CON-ARJUNA-MANPOWER-2026');
  const [newServicePeriod, setNewServicePeriod] = useState(new Date().toISOString().substring(0, 7));
  const [newDeliveryLocation, setNewDeliveryLocation] = useState('Arjuna Natural Plant Site - Unit 2');
  const [newDepartment, setNewDepartment] = useState('Manpower & Operations');
  const [newCostCenter, setNewCostCenter] = useState('CC-OPS-MFG');
  const [newNotes, setNewNotes] = useState('Authorized Manpower Deployment PO as per master service agreement.');

  const [lineItems, setLineItems] = useState<
    Array<{ description: string; quantity: number; unitPrice: number; taxRatePct: number }>
  >([
    { description: 'Contract Workforce Wages (Workings gross)', quantity: 84.5, unitPrice: 620, taxRatePct: 18 },
    { description: 'Employer PF @ 13% on Wages', quantity: 1, unitPrice: 6810.7, taxRatePct: 18 },
    { description: 'Employer ESI @ 3.25% on Wages', quantity: 1, unitPrice: 1702.68, taxRatePct: 18 },
    { description: 'Agency Service Charge @ 8% on Gross', quantity: 1, unitPrice: 6337.2, taxRatePct: 18 },
    { description: 'Room Allowance (Approved Billable Allowance)', quantity: 93, unitPrice: 50.0, taxRatePct: 18 },
    { description: 'Transport Allowance (Approved Billable Allowance)', quantity: 93, unitPrice: 30.0, taxRatePct: 18 },
  ]);

  // Computed totals for new PO
  const computedSubtotal = useMemo(() => {
    return lineItems.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0);
  }, [lineItems]);
  const computedTax = useMemo(() => computedSubtotal * 0.18, [computedSubtotal]);
  const computedGrandTotal = useMemo(() => computedSubtotal + computedTax, [computedSubtotal, computedTax]);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    const res = await PurchaseOrderService.getPurchaseOrders({
      organizationId: viewMode === 'COMPANY' ? organizationId : undefined,
      vendorId: viewMode === 'VENDOR' ? (vendorId || 'JOY MANPOWER SERVICE') : undefined,
    });

    if (res.success) {
      setPos(res.pos);
    } else {
      setError(res.error || 'Failed to load purchase orders.');
      setPos([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, [organizationId, vendorId, viewMode]);

  // Handle PO Creation (Company)
  const handleCreatePo = async (submitForApproval: boolean) => {
    if (lineItems.length === 0 || !lineItems[0].description) {
      showToast('Please add at least one valid line item.', 'error');
      return;
    }

    const res = await PurchaseOrderService.createPurchaseOrder({
      organizationId,
      vendorId: newVendorId,
      poNumber: newPoNumber,
      contractReference: newContractRef,
      servicePeriod: newServicePeriod,
      deliveryLocation: newDeliveryLocation,
      department: newDepartment,
      costCenter: newCostCenter,
      notes: newNotes,
      submitForApproval,
      items: lineItems,
    });

    if (res.success && res.po) {
      showToast(`Purchase Order ${res.po.poNumber} created & sent to vendor ✓`, 'success');
      setPos([res.po, ...pos]);
      setIsCreateModalOpen(false);
      setNewPoNumber(`PO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`);
    } else {
      showToast(res.error || 'Failed to create PO', 'error');
    }
  };

  // Handle Internal Approval Action (Company)
  const handleCompanyApprovePo = async (po: PurchaseOrder, action: 'APPROVED' | 'REJECTED') => {
    const res = await PurchaseOrderService.approvePurchaseOrder({
      poId: po.id,
      approverName: 'Company Procurement Head',
      approverRole: 'Procurement Head',
      action,
    });

    if (res.success) {
      showToast(`PO ${po.poNumber} marked ${action} and dispatched to vendor ✓`, 'success');
      setPos((prev) =>
        prev.map((p) =>
          p.id === po.id ? { ...p, status: action === 'APPROVED' ? 'SENT_TO_VENDOR' : 'REJECTED' } : p
        )
      );
      if (selectedPo?.id === po.id) {
        setSelectedPo({ ...selectedPo, status: action === 'APPROVED' ? 'SENT_TO_VENDOR' : 'REJECTED' });
      }
    }
  };

  // Handle Vendor Response Action
  const handleVendorSubmitResponse = async () => {
    if (!selectedPo) return;
    const res = await PurchaseOrderService.respondToPurchaseOrder({
      poId: selectedPo.id,
      action: responseAction,
      note: responseNote,
      changeCategory,
    });

    if (res.success && res.po) {
      showToast(
        responseAction === 'ACCEPT'
          ? `Purchase Order ${selectedPo.poNumber} ACCEPTED ✓ You can now generate an invoice.`
          : `Response "${responseAction}" submitted to Company Procurement ✓`,
        'success'
      );
      setPos((prev) =>
        prev.map((p) =>
          p.id === selectedPo.id
            ? { ...p, status: res.po!.status, vendorResponseNote: responseNote }
            : p
        )
      );
      setIsResponseModalOpen(false);
      setSelectedPo({ ...selectedPo, status: res.po.status, vendorResponseNote: responseNote });
    } else {
      showToast(res.error || 'Failed to submit response.', 'error');
    }
  };

  const getStatusBadge = (status: PurchaseOrderStatus) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-700">DRAFT</span>;
      case 'PENDING_APPROVAL':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800">PENDING APPROVAL</span>;
      case 'APPROVED':
      case 'SENT_TO_VENDOR':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-800">SENT TO VENDOR</span>;
      case 'ACCEPTED':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800">ACCEPTED</span>;
      case 'CHANGE_REQUESTED':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-purple-100 text-purple-800">CHANGE REQUESTED</span>;
      case 'REJECTED':
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800">REJECTED</span>;
      default:
        return <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  const filteredPos = pos.filter((po) => {
    const matchSearch =
      po.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (po.vendorName && po.vendorName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchStatus = statusFilter === 'ALL' || po.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Workspace Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                viewMode === 'COMPANY'
                  ? 'bg-blue-50 text-blue-800 border-blue-200'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {viewMode === 'COMPANY' ? 'Company Procurement' : 'Vendor Procurement Desk'}
            </span>
            <span className="text-xs text-gray-400 font-mono">B2B Purchase Orders (PO)</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {viewMode === 'COMPANY' ? 'Purchase Order Management' : 'Received Purchase Orders & Commitments'}
          </h1>
          <p className="text-xs text-gray-500 mt-1 max-w-2xl">
            {viewMode === 'COMPANY'
              ? 'Issue, approve, dispatch, and track commercial purchase orders for vendor workforce operations.'
              : 'Review, acknowledge, accept, or request changes to company purchase orders. Convert accepted orders into proper tax invoices.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchOrders}
            className="p-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition shadow-2xs cursor-pointer"
            title="Refresh PO List"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {viewMode === 'COMPANY' && (
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create &amp; Dispatch PO
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-white rounded-xl border border-gray-200 text-xs shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search PO number or vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-4 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 outline-none focus:bg-white focus:border-[#047857]"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <span className="text-gray-500 font-semibold">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_APPROVAL">Pending Approval</option>
            <option value="SENT_TO_VENDOR">Sent to Vendor</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="CHANGE_REQUESTED">Change Requested</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>
      </div>

      {/* PO Data Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700">
            <thead className="bg-gray-50/80 text-[11px] uppercase font-bold text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-5 py-3.5">PO Number</th>
                <th className="px-4 py-3.5">{viewMode === 'COMPANY' ? 'Vendor Partner' : 'Issuing Company'}</th>
                <th className="px-4 py-3.5">Service Period</th>
                <th className="px-4 py-3.5">PO Date</th>
                <th className="px-4 py-3.5 text-right">Grand Total (₹)</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-400">
                    Loading Purchase Orders...
                  </td>
                </tr>
              ) : filteredPos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <FileText className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                    <p className="text-sm font-semibold text-gray-600">
                      {error ? 'Error loading purchase orders' : 'No purchase orders found'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {error ||
                        (viewMode === 'COMPANY'
                          ? 'Create your first PO using the button above.'
                          : 'Purchase orders issued to your vendor will appear here.')}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredPos.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50/70 transition">
                    <td className="px-5 py-3.5 font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-[#047857]" />
                      <span className="font-mono">{po.poNumber}</span>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-gray-800">{po.vendorName || 'JOY MANPOWER SERVICE'}</td>
                    <td className="px-4 py-3.5 font-mono text-gray-600">{po.servicePeriod}</td>
                    <td className="px-4 py-3.5 text-gray-500">{po.poDate}</td>
                    <td className="px-4 py-3.5 text-right font-bold text-gray-900 font-mono text-sm">
                      ₹{po.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5 text-center">{getStatusBadge(po.status)}</td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPo(po);
                            setIsDetailDrawerOpen(true);
                          }}
                          className="px-2.5 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </button>

                        {/* Company Actions */}
                        {viewMode === 'COMPANY' && po.status === 'PENDING_APPROVAL' && (
                          <button
                            type="button"
                            onClick={() => handleCompanyApprovePo(po, 'APPROVED')}
                            className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#047857] hover:bg-[#065f46] rounded-lg transition flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        )}

                        {/* Vendor Actions: Review & Respond */}
                        {viewMode === 'VENDOR' &&
                          (po.status === 'SENT_TO_VENDOR' || po.status === 'APPROVED') && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedPo(po);
                                setIsResponseModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 text-xs font-semibold text-white bg-[#047857] hover:bg-[#065f46] rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                            >
                              <Send className="w-3.5 h-3.5" />
                              Review PO
                            </button>
                          )}

                        {/* Vendor Invoice Shortcut */}
                        {po.status === 'ACCEPTED' && (onCreateInvoiceFromPo || onNavigateToInvoice) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (onNavigateToInvoice) {
                                onNavigateToInvoice(po.id);
                              } else if (onCreateInvoiceFromPo) {
                                onCreateInvoiceFromPo(po);
                              }
                            }}
                            className="px-2.5 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition flex items-center gap-1 cursor-pointer shadow-2xs"
                          >
                            <FileCheck className="w-3.5 h-3.5 text-[#047857]" />
                            Generate Invoice
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* PO Detail Drawer / Modal */}
      {isDetailDrawerOpen && selectedPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white h-full p-6 overflow-y-auto space-y-6 shadow-2xl border-l border-gray-200 font-sans">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-gray-900 font-mono">{selectedPo.poNumber}</h2>
                  {getStatusBadge(selectedPo.status)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Issued: {selectedPo.poDate} • Service Period: {selectedPo.servicePeriod}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDetailDrawerOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Contextual Action Bar inside drawer */}
            {viewMode === 'VENDOR' && (selectedPo.status === 'SENT_TO_VENDOR' || selectedPo.status === 'APPROVED') && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-emerald-950 block">PO Action Required:</span>
                  <span className="text-[11px] text-emerald-800">
                    Review terms and accept to authorize billing.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsResponseModalOpen(true)}
                  className="px-3.5 py-1.5 bg-[#047857] hover:bg-[#065f46] text-white rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Accept or Request Changes
                </button>
              </div>
            )}

            {viewMode === 'VENDOR' && selectedPo.status === 'ACCEPTED' && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-emerald-950 block">Order Accepted &amp; Active</span>
                  <span className="text-[11px] text-emerald-800">
                    Ready to generate and submit B2B Tax Invoice.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailDrawerOpen(false);
                    if (onNavigateToInvoice) onNavigateToInvoice(selectedPo.id);
                  }}
                  className="px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <FileCheck className="w-3.5 h-3.5" /> Generate Tax Invoice
                </button>
              </div>
            )}

            {/* Commercial Summary */}
            <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-xs font-mono">
              <div>
                <span className="text-gray-400 block font-sans text-[11px]">Contract Reference</span>
                <span className="font-bold text-gray-800">{selectedPo.contractReference || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-sans text-[11px]">Delivery Location</span>
                <span className="font-semibold text-gray-800">{selectedPo.deliveryLocation || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-sans text-[11px]">Taxable Amount</span>
                <span className="font-bold text-gray-800">₹{selectedPo.taxableAmount.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-gray-400 block font-sans text-[11px]">Grand Total</span>
                <span className="font-bold text-emerald-800 text-sm">
                  ₹{selectedPo.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Committed Line Items</h3>
              <div className="border border-gray-200 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500">
                    <tr>
                      <th className="px-4 py-2.5">Description</th>
                      <th className="px-4 py-2.5 text-right">Qty</th>
                      <th className="px-4 py-2.5 text-right">Unit Rate (₹)</th>
                      <th className="px-4 py-2.5 text-right">Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(selectedPo.items || selectedPo.lineItems || []).map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3 font-medium text-gray-900">{item.description}</td>
                        <td className="px-4 py-3 text-right text-gray-700 font-mono">{item.quantity}</td>
                        <td className="px-4 py-3 text-right text-gray-700 font-mono">
                          ₹{item.unitPrice.toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 font-mono">
                          ₹{item.lineTotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {selectedPo.vendorResponseNote && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1 text-xs">
                <span className="font-bold uppercase text-emerald-800">Vendor Response Note</span>
                <p className="text-emerald-950 font-mono">{selectedPo.vendorResponseNote}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Vendor PO Response Modal */}
      {isResponseModalOpen && selectedPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 space-y-4 shadow-2xl border border-gray-200">
            <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Send className="w-4 h-4 text-[#047857]" /> Review &amp; Respond to {selectedPo.poNumber}
            </h3>
            <p className="text-xs text-gray-500">
              Verify the purchase order commercial terms, wage rates, and workforce caps before confirming.
            </p>

            <div className="space-y-3 text-xs">
              <label className="font-bold text-gray-700 block">Response Decision *</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setResponseAction('ACCEPT')}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                    responseAction === 'ACCEPT'
                      ? 'border-[#047857] bg-emerald-50 text-[#047857]'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ✓ Accept Order
                </button>
                <button
                  type="button"
                  onClick={() => setResponseAction('REQUEST_CHANGES')}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                    responseAction === 'REQUEST_CHANGES'
                      ? 'border-purple-600 bg-purple-50 text-purple-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ⚠ Request Changes
                </button>
                <button
                  type="button"
                  onClick={() => setResponseAction('REJECT')}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                    responseAction === 'REJECT'
                      ? 'border-rose-600 bg-rose-50 text-rose-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  ✕ Reject Order
                </button>
              </div>
            </div>

            {responseAction === 'REQUEST_CHANGES' && (
              <div className="space-y-1 text-xs">
                <label className="font-bold text-gray-700">Change Category</label>
                <select
                  value={changeCategory}
                  onChange={(e) => setChangeCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none"
                >
                  <option value="PRICING_QUANTITY">Pricing / Quantity Mismatch</option>
                  <option value="SERVICE_PERIOD">Service Period / Schedule Revision</option>
                  <option value="SCOPE_CLARIFICATION">Scope of Work Clarification</option>
                  <option value="COMMERCIAL_TERMS">Payment Terms / Tax Category</option>
                </select>
              </div>
            )}

            <div className="space-y-1 text-xs">
              <label className="font-bold text-gray-700">
                {responseAction === 'REJECT' ? 'Mandatory Rejection Reason' : 'Response Notes & Acknowledgments'}
              </label>
              <textarea
                rows={3}
                placeholder="Enter response details for Company Procurement..."
                value={responseNote}
                onChange={(e) => setResponseNote(e.target.value)}
                className="w-full p-2.5 border border-gray-200 rounded-xl text-xs text-gray-900 outline-none focus:ring-2 focus:ring-[#047857]/20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsResponseModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleVendorSubmitResponse}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#047857] hover:bg-[#065f46] rounded-xl transition shadow-xs cursor-pointer"
              >
                Submit Response
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Company Create PO Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-2xl p-6 space-y-4 shadow-2xl border border-gray-200 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-gray-100 pb-3">
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                  COMPANY PROCUREMENT DESK
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-1">Issue Commercial Purchase Order</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Target Vendor Partner *</label>
                <select
                  value={newVendorId}
                  onChange={(e) => setNewVendorId(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-xl bg-gray-50 font-bold text-gray-900"
                >
                  <option value="JOY MANPOWER SERVICE">JOY MANPOWER SERVICE (VND-JOY-01)</option>
                  <option value="VND-ARJUNA-01">Arjuna Facility Services</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">PO Number *</label>
                <input
                  type="text"
                  value={newPoNumber}
                  onChange={(e) => setNewPoNumber(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-xl font-mono font-bold text-gray-900"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Service Period *</label>
                <input
                  type="month"
                  value={newServicePeriod}
                  onChange={(e) => setNewServicePeriod(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-xl font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Contract Reference</label>
                <input
                  type="text"
                  value={newContractRef}
                  onChange={(e) => setNewContractRef(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-xl"
                />
              </div>

              <div className="col-span-2">
                <label className="font-bold text-gray-700 block mb-1">Delivery Location / Client Plant Site</label>
                <input
                  type="text"
                  value={newDeliveryLocation}
                  onChange={(e) => setNewDeliveryLocation(e.target.value)}
                  className="w-full p-2 border border-gray-200 rounded-xl"
                />
              </div>
            </div>

            {/* Line Items Editor */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <label className="font-bold text-gray-700">Committed Line Items</label>
                <button
                  type="button"
                  onClick={() =>
                    setLineItems([
                      ...lineItems,
                      { description: 'Additional Workforce Staff', quantity: 1, unitPrice: 500, taxRatePct: 18 },
                    ])
                  }
                  className="text-[11px] font-bold text-[#047857] hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Add Line Item
                </button>
              </div>

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-100 text-[10px] uppercase font-bold text-gray-600">
                    <tr>
                      <th className="p-2">Description</th>
                      <th className="p-2 text-right">Qty</th>
                      <th className="p-2 text-right">Rate (₹)</th>
                      <th className="p-2 text-right">Total (₹)</th>
                      <th className="p-2 text-center w-8"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {lineItems.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-1.5">
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => {
                              const updated = [...lineItems];
                              updated[idx].description = e.target.value;
                              setLineItems(updated);
                            }}
                            className="w-full p-1 border border-gray-200 rounded text-xs"
                          />
                        </td>
                        <td className="p-1.5 text-right">
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const updated = [...lineItems];
                              updated[idx].quantity = Number(e.target.value);
                              setLineItems(updated);
                            }}
                            className="w-16 p-1 border border-gray-200 rounded text-xs text-right font-mono"
                          />
                        </td>
                        <td className="p-1.5 text-right">
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => {
                              const updated = [...lineItems];
                              updated[idx].unitPrice = Number(e.target.value);
                              setLineItems(updated);
                            }}
                            className="w-20 p-1 border border-gray-200 rounded text-xs text-right font-mono"
                          />
                        </td>
                        <td className="p-1.5 text-right font-mono font-bold text-gray-900">
                          ₹{(item.quantity * item.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-1.5 text-center">
                          {lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))}
                              className="text-gray-400 hover:text-rose-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Computed Totals */}
            <div className="bg-gray-50 border border-gray-200 p-3 rounded-xl flex justify-between text-xs font-mono">
              <span className="text-gray-600 font-sans">Total Estimated Commitment (incl. 18% GST):</span>
              <span className="font-bold text-emerald-800 text-sm">
                ₹{computedGrandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleCreatePo(true)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#047857] hover:bg-[#065f46] rounded-xl shadow-xs cursor-pointer"
              >
                Issue &amp; Send PO to Vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
