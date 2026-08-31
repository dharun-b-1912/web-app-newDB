import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  Calculator,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization } from '../../../types/vendorPortal';
import { CalculationModal } from '../components/CalculationModal';

interface VendorPayableEngineViewProps {
  activeVendor: VendorOrganization;
  activePeriod: string;
}

export const VendorPayableEngineView: React.FC<VendorPayableEngineViewProps> = ({
  activeVendor,
  activePeriod,
}) => {
  const [calcModalData, setCalcModalData] = useState<any | null>(null);

  const payable = vendorPortalService.getVendorPayableBreakdown(activePeriod, activeVendor.id);

  const handleOpenFormulaModal = (itemKey: string) => {
    if (itemKey === 'SERVICE_CHARGE') {
      setCalcModalData({
        title: `Vendor Commercial Service Charge (${payable.service_charge_percentage}%)`,
        category: 'Contractual Commercials',
        explanation: 'Contracted agency commission calculated as agreed percentage over direct gross wage costs.',
        formula: 'Direct Wage Subtotal × Service Charge Percentage (8.5%)',
        inputs: [
          { label: 'Total Direct Wage Subtotal', value: payable.wage_subtotal, source: 'Approved Payroll Wage Register' },
          { label: 'Contracted Service Rate', value: `${payable.service_charge_percentage}%`, source: 'Vendor Master SOW' },
        ],
        result: payable.service_charge_amount,
      });
    } else if (itemKey === 'GST') {
      setCalcModalData({
        title: 'Goods and Services Tax (GST 18%)',
        category: 'Statutory Taxation',
        explanation: 'Statutory GST levied across total pre-tax commercial invoice value (CGST 9% + SGST 9%).',
        formula: 'Total Before Tax Value × 18% GST',
        inputs: [
          { label: 'Pre-Tax Commercial Subtotal', value: payable.total_before_tax, source: 'Wages + Statutory + Service Charges' },
          { label: 'GST Rate', value: '18% (9% CGST + 9% SGST)', source: 'Indian GST Schedule for Staffing Services' },
        ],
        result: payable.gst_amount,
      });
    } else {
      setCalcModalData({
        title: 'Total Net Vendor Payable Formulation',
        category: 'Net Disbursement',
        explanation: 'Final commercial settlement owed by client company to contractor for service period.',
        formula: 'Wage Subtotal + Statutory Employer Costs + Service Charges + GST - Recoveries',
        inputs: [
          { label: 'Wage Subtotal (Gross + OT + Allowances)', value: payable.wage_subtotal },
          { label: 'Employer Statutory (PF 13% + ESI 3.25%)', value: payable.statutory_subtotal },
          { label: 'Commercials (Service Fee + Contract Charges)', value: payable.commercials_subtotal },
          { label: '18% GST', value: payable.gst_amount },
          { label: 'Adjustments & Recoveries', value: payable.previous_recoveries },
        ],
        result: payable.net_vendor_payable,
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            Vendor Payable Calculation Engine
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Period: <strong className="text-indigo-600 font-mono">{activePeriod}</strong> • Contractual formula roll-up across wages, employer compliance, service commission, and GST.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleOpenFormulaModal('ALL')}>
            <Calculator className="w-3.5 h-3.5 mr-1.5" />
            Inspect Master Formula
          </Button>
        </div>
      </div>

      {/* Main Commercial Formula Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Step 1: Direct Wage Cost */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center">
                1
              </span>
              <h4 className="font-bold text-gray-900 text-sm">Direct Wage Cost</h4>
            </div>
            <Badge variant="blue" size="sm">
              {payable.headcount} Workers
            </Badge>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Employee Gross Wages:</span>
              <strong className="font-mono text-gray-900">₹{payable.total_gross_wages.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Approved Overtime Wages:</span>
              <strong className="font-mono text-gray-900">₹{payable.total_ot_wages.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Attendance Bonus & Allowances:</span>
              <strong className="font-mono text-gray-900">₹{payable.total_allowances_incentives.toLocaleString()}</strong>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-700">Wage Subtotal:</span>
            <span className="font-mono text-base font-bold text-blue-700">
              ₹{payable.wage_subtotal.toLocaleString()}
            </span>
          </div>
        </Card>

        {/* Step 2: Statutory Employer Cost */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 font-bold text-xs flex items-center justify-center">
                2
              </span>
              <h4 className="font-bold text-gray-900 text-sm">Statutory Employer Cost</h4>
            </div>
            <Badge variant="outline" size="sm">
              Mandatory
            </Badge>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Employer PF (13% Contribution):</span>
              <strong className="font-mono text-gray-900">₹{payable.total_employer_pf.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Employer ESI (3.25% Contribution):</span>
              <strong className="font-mono text-gray-900">₹{payable.total_employer_esi.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Labour Welfare Fund (LWF):</span>
              <strong className="font-mono text-gray-900">₹{payable.total_employer_lwf.toLocaleString()}</strong>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-700">Statutory Subtotal:</span>
            <span className="font-mono text-base font-bold text-indigo-700">
              ₹{payable.statutory_subtotal.toLocaleString()}
            </span>
          </div>
        </Card>

        {/* Step 3: Vendor Commercials */}
        <Card className="p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-50 text-amber-700 font-bold text-xs flex items-center justify-center">
                3
              </span>
              <h4 className="font-bold text-gray-900 text-sm">Vendor Commercials</h4>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-amber-700 hover:bg-amber-50 p-1 h-auto text-xs"
              onClick={() => handleOpenFormulaModal('SERVICE_CHARGE')}
            >
              <Calculator className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-600">
              <span>Service Charge ({payable.service_charge_percentage}%):</span>
              <strong className="font-mono text-gray-900">₹{payable.service_charge_amount.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Fixed Contract Operational Fee:</span>
              <strong className="font-mono text-gray-900">₹{payable.other_contractual_charges.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Penalties / Deductions:</span>
              <strong className="font-mono text-gray-900">₹0</strong>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
            <span className="text-xs font-bold text-gray-700">Commercials Subtotal:</span>
            <span className="font-mono text-base font-bold text-amber-700">
              ₹{payable.commercials_subtotal.toLocaleString()}
            </span>
          </div>
        </Card>
      </div>

      {/* Invoice Rollup Card */}
      <Card className="p-6 bg-gradient-to-br from-indigo-50/70 to-blue-50/70 border-indigo-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-indigo-200 gap-4">
          <div>
            <h3 className="font-bold text-indigo-950 text-base">
              Final Vendor Payable & Tax Invoicing Rollup
            </h3>
            <p className="text-xs text-indigo-700">
              Validated against SOW agreement with Joy Corporate Solutions Pvt Ltd
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-indigo-800 bg-white/80 border border-indigo-200 hover:bg-white"
            onClick={() => handleOpenFormulaModal('GST')}
          >
            <Calculator className="w-3.5 h-3.5 mr-1" />
            GST Breakdown
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 pt-5">
          <div>
            <span className="text-xs text-gray-500 block uppercase">Total Before Tax</span>
            <div className="text-xl font-bold font-mono text-gray-900 mt-1">
              ₹{payable.total_before_tax.toLocaleString()}
            </div>
          </div>

          <div>
            <span className="text-xs text-gray-500 block uppercase">18% GST (CGST + SGST)</span>
            <div className="text-xl font-bold font-mono text-gray-900 mt-1">
              +₹{payable.gst_amount.toLocaleString()}
            </div>
          </div>

          <div>
            <span className="text-xs text-gray-500 block uppercase">Previous Recovery</span>
            <div className="text-xl font-bold font-mono text-emerald-600 mt-1">
              -₹{payable.previous_recoveries}
            </div>
          </div>

          <div className="bg-indigo-600 text-white p-4 rounded-xl shadow-md">
            <span className="text-[10px] uppercase font-semibold text-indigo-200 block">Final Net Payable</span>
            <div className="text-2xl font-extrabold font-mono mt-0.5">
              ₹{payable.net_vendor_payable.toLocaleString()}
            </div>
          </div>
        </div>
      </Card>

      {/* Formula Modal */}
      {calcModalData && (
        <CalculationModal
          isOpen={!!calcModalData}
          onClose={() => setCalcModalData(null)}
          {...calcModalData}
        />
      )}
    </div>
  );
};
