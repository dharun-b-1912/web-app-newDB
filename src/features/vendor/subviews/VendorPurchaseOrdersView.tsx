import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import {
  FileText,
  CheckCircle2,
  Check,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization } from '../../../types/vendorPortal';

interface VendorPurchaseOrdersViewProps {
  activeVendor: VendorOrganization;
  onRefresh: () => void;
}

export const VendorPurchaseOrdersView: React.FC<VendorPurchaseOrdersViewProps> = ({
  activeVendor,
  onRefresh,
}) => {
  const { showToast } = useToast();
  const pos = vendorPortalService.getPurchaseOrders(activeVendor.id);

  const handleAcknowledge = (poId: string) => {
    vendorPortalService.acknowledgePurchaseOrder(poId, activeVendor.contact_person);
    showToast('Purchase Order acknowledged and marked ACTIVE!');
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Purchase Orders & Contractual SOWs
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Client-issued commercial purchase orders, budget limits, billing rate cards, and formal vendor acknowledgments.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" size="sm">
            {pos.length} Active POs
          </Badge>
        </div>
      </div>

      {/* PO Cards / Table */}
      <div className="space-y-4">
        {pos.map((po) => {
          const burnPct = po.contract_value > 0 ? (po.consumed_amount / po.contract_value) * 100 : 0;
          return (
            <Card key={po.id} className="p-6 space-y-4 border-gray-200/80 hover:border-indigo-200 transition-all">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-gray-900 font-mono">{po.po_number}</h3>
                      <Badge variant="success" size="sm">
                        {po.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Client: <strong>{po.client_company_name}</strong> • Scope: {po.service_period_label}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {po.status === 'ISSUED' && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleAcknowledge(po.id)}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Acknowledge PO
                    </Button>
                  )}
                  {po.acknowledged_by && (
                    <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ack by {po.acknowledged_by}
                    </span>
                  )}
                </div>
              </div>

              {/* Financial Metrics Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Total Contract Value</span>
                  <div className="text-lg font-bold font-mono text-gray-900 mt-0.5">
                    ₹{po.contract_value.toLocaleString()}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Consumed Amount</span>
                  <div className="text-lg font-bold font-mono text-indigo-700 mt-0.5">
                    ₹{po.consumed_amount.toLocaleString()}
                  </div>
                </div>

                <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100">
                  <span className="text-[10px] text-emerald-800 uppercase font-semibold">Remaining Available Balance</span>
                  <div className="text-lg font-bold font-mono text-emerald-800 mt-0.5">
                    ₹{po.remaining_balance.toLocaleString()}
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <span className="text-[10px] text-gray-500 uppercase font-semibold">Approved Headcount</span>
                  <div className="text-lg font-bold font-mono text-gray-900 mt-0.5">
                    {po.approved_headcount} Manpower
                  </div>
                </div>
              </div>

              {/* Progress Burn Bar */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>PO Consumption Progress</span>
                  <span className="font-mono font-semibold text-gray-700">{burnPct.toFixed(1)}% Consumed</span>
                </div>
                <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      burnPct > 90 ? 'bg-rose-500' : burnPct > 70 ? 'bg-amber-500' : 'bg-indigo-600'
                    }`}
                    style={{ width: `${Math.min(100, burnPct)}%` }}
                  />
                </div>
              </div>

              {/* Rate Details & Terms */}
              <div className="bg-gray-50/80 p-3.5 rounded-xl border border-gray-100 text-xs text-gray-700 space-y-1">
                <div>
                  <strong>Commercial Rate Structure:</strong> {po.rate_details}
                </div>
                <div>
                  <strong>Billing Terms:</strong> {po.terms_conditions}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
