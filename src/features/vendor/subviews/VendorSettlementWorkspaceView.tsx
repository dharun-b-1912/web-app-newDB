import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { useToast } from '../../../components/ui/Toast';
import {
  Users,
  Clock,
  Calculator,
  ShieldCheck,
  CircleDollarSign,
  FileText,
  Receipt,
  CreditCard,
  Sparkles,
  ChevronRight,
  ArrowUpRight,
  FileCheck2,
  Calendar,
  Building2,
  HelpCircle,
  FileSpreadsheet,
  CheckCircle2,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization } from '../../../types/vendorPortal';
import { CalculationModal } from '../components/CalculationModal';
import { ThreeWayMatchModal } from '../components/ThreeWayMatchModal';
import { DocumentIntelligenceOcrModal } from '../components/DocumentIntelligenceOcrModal';
import { VendorOnboardingWizardModal } from './VendorOnboardingWizardModal';
import { CompanyWorkspaceSwitcher } from '../components/CompanyWorkspaceSwitcher';
import { ConnectNewClientModal } from '../components/ConnectNewClientModal';

interface VendorSettlementWorkspaceViewProps {
  activeVendor: VendorOrganization;
  activePeriod: string;
  onNavigateTab: (tabId: string) => void;
}

export const VendorSettlementWorkspaceView: React.FC<VendorSettlementWorkspaceViewProps> = ({
  activeVendor,
  activePeriod,
  onNavigateTab,
}) => {
  const { showToast } = useToast();
  const [calcModalData, setCalcModalData] = useState<any | null>(null);
  const [matchModalOpen, setMatchModalOpen] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const activeRelationship = vendorPortalService.getActiveRelationship();
  const employees = vendorPortalService.getEmployees(activeVendor?.id);
  const attendance = vendorPortalService.getMonthlyAttendance(activePeriod, activeVendor?.id);
  const wageBreakdowns = vendorPortalService.getEmployeeWageBreakdowns(activePeriod, activeVendor?.id);
  const payable = vendorPortalService.getVendorPayableBreakdown(activePeriod, activeVendor?.id);
  const pos = vendorPortalService.getPurchaseOrders(activeVendor?.id);
  const invoices = vendorPortalService.getInvoices(activeVendor?.id);
  const challans = vendorPortalService.getStatutoryChallans(activePeriod, activeVendor?.id);
  const activePo = pos[0];
  const activeInvoice = invoices.find((i) => i.payroll_period === activePeriod);
  const status = vendorPortalService.getPayrollVerificationStatus(activePeriod, activeVendor?.id);

  // Settlement 8-Stage Operational Flow with contextual HRMS & Payroll icons
  const stages = [
    {
      id: 'workforce',
      step: 1,
      title: 'Contract Workforce',
      icon: Users,
      summary: `${employees.length} Active Workers`,
      status: employees.length > 0 ? 'VERIFIED' : 'PENDING',
      detail: `Deployed at ${activeRelationship?.company_name || 'Client Site'}`,
      tab: 'employees',
    },
    {
      id: 'attendance',
      step: 2,
      title: 'Biometric Attendance & OT',
      icon: Clock,
      summary: `${attendance.reduce((s, a) => s + a.present_days, 0)} Work Days`,
      status: 'LOCKED',
      detail: `${attendance.reduce((s, a) => s + a.ot_hours, 0)} OT Hours reconciled`,
      tab: 'attendance',
    },
    {
      id: 'payroll',
      step: 3,
      title: 'Wage Verification & PF/ESI',
      icon: Calculator,
      summary: `₹${wageBreakdowns.reduce((s, w) => s + w.gross_payable, 0).toLocaleString()} Gross Pay`,
      status: 'APPROVED',
      detail: `Net Wages: ₹${wageBreakdowns.reduce((s, w) => s + w.net_salary, 0).toLocaleString()}`,
      tab: 'payroll-verification',
    },
    {
      id: 'statutory',
      step: 4,
      title: 'Statutory Remittances',
      icon: FileCheck2,
      summary: `PF/ESI: ₹${payable.statutory_subtotal.toLocaleString()}`,
      status: 'COMPLIANT',
      detail: `${challans.length} Electronic ECR & TRRN receipts`,
      tab: 'compliance',
    },
    {
      id: 'payable',
      step: 5,
      title: 'Vendor Payable Engine',
      icon: CircleDollarSign,
      summary: `₹${payable.net_vendor_payable.toLocaleString()} Total Due`,
      status: 'CONFIRMED',
      detail: `${payable.service_charge_percentage}% Fee + 18% GST Computed`,
      tab: 'vendor-payable',
    },
    {
      id: 'po',
      step: 6,
      title: 'Purchase Order Matching',
      icon: FileText,
      summary: activePo ? `${activePo.po_number}` : 'PO Ready',
      status: activePo?.remaining_balance && activePo.remaining_balance >= payable.net_vendor_payable ? 'AVAILABLE' : 'INSUFFICIENT',
      detail: `Available PO: ₹${(activePo?.remaining_balance || 0).toLocaleString()}`,
      tab: 'purchase-orders',
    },
    {
      id: 'invoice',
      step: 7,
      title: 'Invoice & 3-Way Match',
      icon: Receipt,
      summary: activeInvoice ? `${activeInvoice.invoice_number} (Matched)` : 'Match Pending',
      status: activeInvoice?.match_status === 'MATCHED' || activeInvoice?.status === 'APPROVED' ? 'MATCHED' : 'READY',
      detail: 'Zero variance verification against PO & Attendance',
      tab: 'invoices',
    },
    {
      id: 'disbursement',
      step: 8,
      title: 'Bank Disbursement & UTR',
      icon: CreditCard,
      summary: activeInvoice?.status === 'PAID' ? 'Disbursed' : 'Awaiting Settlement',
      status: activeInvoice?.status === 'PAID' ? 'PAID' : 'PENDING',
      detail: 'Direct NEFT/RTGS bank reconciliation',
      tab: 'payments',
    },
  ];

  const handleOpenPayableFormula = () => {
    setCalcModalData({
      title: 'Monthly Vendor Commercial Settlement Formula',
      category: 'Commercial Settlement',
      explanation: 'Calculates what the client company owes the manpower contractor based on gross employee wages, statutory employer contributions, agreed service fees, and GST.',
      formula: 'Wage Subtotal + Statutory Employer Cost + (Wage Subtotal × Service Charge %) + 18% GST - Recoveries',
      inputs: [
        { label: 'Employee Gross Wages (Payable)', value: payable.total_gross_wages, source: 'Attendance-Driven Payroll' },
        { label: 'Approved Overtime Wages', value: payable.total_ot_wages, source: 'Biometric OT Logs' },
        { label: 'Attendance Bonus & Allowances', value: payable.total_allowances_incentives, source: 'Client Policy' },
        { label: 'Employer PF (13% Contribution & Admin)', value: payable.total_employer_pf, source: 'Statutory Engine' },
        { label: 'Employer ESI (3.25% Contribution)', value: payable.total_employer_esi, source: 'ESIC Norms' },
        { label: `Contractor Service Charge (${payable.service_charge_percentage}%)`, value: payable.service_charge_amount, source: 'Commercial Agreement' },
        { label: 'Other Contractual Operational Charges', value: payable.other_contractual_charges, source: 'Fixed SOW Fee' },
        { label: '18% GST on Taxable Value', value: payable.gst_amount, source: `GSTIN: ${activeVendor?.gstin || '33AAACA1234F1Z8'}` },
      ],
      result: payable.net_vendor_payable,
    });
  };

  const handleAdvanceWorkflow = () => {
    if (status === 'PENDING_VENDOR_REVIEW') {
      vendorPortalService.updatePayrollVerificationStatus(activePeriod, 'VENDOR_VERIFIED', 'Vendor officially confirmed monthly timesheet and wage totals.');
      showToast('Payroll verified and submitted to Client HR!');
    } else if (status === 'VENDOR_VERIFIED') {
      vendorPortalService.updatePayrollVerificationStatus(activePeriod, 'CLIENT_APPROVED', 'Client HR approved timesheet and statutory breakdown.');
      showToast('Client HR approved payroll! Vendor payable locked.');
    } else if (status === 'CLIENT_APPROVED') {
      vendorPortalService.updatePayrollVerificationStatus(activePeriod, 'FROZEN', 'Payroll frozen for invoice dispatch.');
      showToast('Payroll frozen and locked for invoice generation!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Hero */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-7 text-white shadow-xl relative overflow-hidden border border-indigo-500/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Workspace Switcher & Context Subheader */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-5 mb-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              Active Security Boundary:
            </span>
            <CompanyWorkspaceSwitcher onOpenConnectModal={() => setIsConnectModalOpen(true)} />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateTab('multi-client-hub')}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition flex items-center gap-1.5 border border-white/15"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-300" /> View All Client Portfolios
            </button>
          </div>
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-indigo-500/30 border border-indigo-400/30 rounded-full text-indigo-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-300" />
                Working With: {activeRelationship?.company_name || 'Client Company'}
              </span>
              <span className="text-slate-400 text-xs font-mono">{activePeriod}</span>
            </div>
            
            <h2 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-white">
              {activeVendor?.name}
            </h2>
            <p className="text-slate-300 text-xs max-w-2xl leading-relaxed">
              Managing contract workforce, biometric attendance, wage verification, and 3-way match invoices isolated exclusively for <strong className="text-white font-bold">{activeRelationship?.company_name}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="bg-white/10 backdrop-blur-md border border-white/15 p-4 rounded-2xl flex items-center gap-4">
              <div>
                <span className="text-[10px] uppercase font-semibold text-indigo-200 block">Total Net Payable</span>
                <span className="text-2xl font-black font-mono text-white">
                  ₹{payable.net_vendor_payable.toLocaleString()}
                </span>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <button
                onClick={handleOpenPayableFormula}
                className="px-3 py-2 bg-indigo-500 hover:bg-indigo-600 shadow-md text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5"
              >
                <Calculator className="w-3.5 h-3.5" /> Formula
              </button>
            </div>
          </div>
        </div>

        {/* Quick Launch Buttons on Hero */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsOcrOpen(true)}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition flex items-center gap-1.5 font-semibold"
            >
              <Sparkles className="w-3.5 h-3.5 text-violet-400" /> AI OCR Scanner
            </button>
            <button
              onClick={() => onNavigateTab('licenses')}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition flex items-center gap-1.5 font-semibold"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Licenses & Expiry Hub
            </button>
            <button
              onClick={() => onNavigateTab('compliance-calendar')}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition flex items-center gap-1.5 font-semibold"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" /> Compliance Calendar
            </button>
            <button
              onClick={() => onNavigateTab('statutory-returns')}
              className="px-3 py-1.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 transition flex items-center gap-1.5 font-semibold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" /> Form V & Returns
            </button>
          </div>

          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold shadow-md transition flex items-center gap-1.5"
          >
            <Building2 className="w-3.5 h-3.5" /> 4-Step Vendor Onboarding
          </button>
        </div>
      </div>

      {/* 8-Stage Settlement Lifecycle Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight">
              8-Stage Monthly Settlement Flow ({activePeriod})
            </h3>
            <p className="text-xs text-gray-500">
              Click any stage to drill down directly into its operational data records
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleAdvanceWorkflow}>
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-indigo-600" />
              Advance Lifecycle Stage
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stages.map((stage) => {
            const Icon = stage.icon;
            const isCompleted = ['VERIFIED', 'LOCKED', 'APPROVED', 'COMPLIANT', 'CONFIRMED', 'AVAILABLE', 'MATCHED', 'PAID'].includes(stage.status);
            return (
              <div
                key={stage.id}
                onClick={() => onNavigateTab(stage.tab)}
                className="group bg-white rounded-2xl border border-gray-200/80 p-5 shadow-xs hover:shadow-md hover:border-indigo-400 transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 group-hover:bg-indigo-600 text-indigo-700 group-hover:text-white transition-colors flex items-center justify-center border border-indigo-100 flex-shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                        Stage {stage.step}
                      </div>
                      <span className="font-bold text-xs text-gray-900 group-hover:text-indigo-600 transition-colors block">
                        {stage.title}
                      </span>
                    </div>
                  </div>

                  <Badge
                    variant={isCompleted ? 'success' : 'warning'}
                    size="sm"
                  >
                    {stage.status}
                  </Badge>
                </div>

                <div className="space-y-1 my-2">
                  <div className="text-xs font-bold text-gray-900 font-mono">
                    {stage.summary}
                  </div>
                  <p className="text-[11px] text-gray-500 leading-tight">
                    {stage.detail}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-indigo-600 font-semibold mt-2">
                  <span>Open {stage.title}</span>
                  <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Settlement Financial Summary Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div>
            <h4 className="font-bold text-gray-900 text-base">Commercial Cost Breakdown & Tax Rollup</h4>
            <p className="text-xs text-gray-500">Live aggregated rollup for {activePeriod} across {employees.length} contract staff</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleOpenPayableFormula}>
            <Calculator className="w-3.5 h-3.5 mr-1 text-indigo-600" />
            Inspect Formulas
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
          {/* Box 1: Direct Wages */}
          <div className="space-y-2.5 bg-gray-50 p-4 rounded-xl border border-gray-200/60">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-indigo-600" />
              1. Direct Wage Subtotal
            </span>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Gross Payable Wages:</span>
              <strong className="font-mono text-gray-900">₹{payable.total_gross_wages.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Overtime Compensation:</span>
              <strong className="font-mono text-gray-900">₹{payable.total_ot_wages.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Incentives & Allowances:</span>
              <strong className="font-mono text-gray-900">₹{payable.total_allowances_incentives.toLocaleString()}</strong>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between text-xs font-bold text-gray-900">
              <span>Wage Subtotal:</span>
              <span className="font-mono text-indigo-700 font-bold">₹{payable.wage_subtotal.toLocaleString()}</span>
            </div>
          </div>

          {/* Box 2: Statutory & Margin */}
          <div className="space-y-2.5 bg-gray-50 p-4 rounded-xl border border-gray-200/60">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              2. Employer Statutory & Service
            </span>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Employer PF (13%):</span>
              <strong className="font-mono text-gray-900">₹{payable.total_employer_pf.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Employer ESI (3.25%):</span>
              <strong className="font-mono text-gray-900">₹{payable.total_employer_esi.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Service Fee ({payable.service_charge_percentage}%):</span>
              <strong className="font-mono text-gray-900">₹{payable.service_charge_amount.toLocaleString()}</strong>
            </div>
            <div className="pt-2 border-t border-gray-200 flex justify-between text-xs font-bold text-gray-900">
              <span>Pre-Tax Total:</span>
              <span className="font-mono text-indigo-700 font-bold">₹{payable.total_before_tax.toLocaleString()}</span>
            </div>
          </div>

          {/* Box 3: Invoice Net Payable */}
          <div className="space-y-2.5 bg-indigo-50/60 p-4 rounded-xl border border-indigo-200">
            <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider block flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-indigo-700" />
              3. Invoice Net Payable
            </span>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Taxable Base Value:</span>
              <strong className="font-mono text-gray-900">₹{payable.total_before_tax.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>GST (18% Applicable):</span>
              <strong className="font-mono text-gray-900">₹{payable.gst_amount.toLocaleString()}</strong>
            </div>
            <div className="flex justify-between text-xs text-gray-600">
              <span>Adjustments / Recoveries:</span>
              <strong className="font-mono text-emerald-600">₹{payable.previous_recoveries}</strong>
            </div>
            <div className="pt-2 border-t border-indigo-200 flex justify-between text-sm font-bold text-indigo-900">
              <span>Final Payable:</span>
              <span className="font-mono text-indigo-800 text-base font-black">₹{payable.net_vendor_payable.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Formula Modal */}
      {calcModalData && (
        <CalculationModal
          isOpen={!!calcModalData}
          onClose={() => setCalcModalData(null)}
          data={calcModalData}
        />
      )}

      {/* 3-Way Match Modal */}
      {matchModalOpen && (
        <ThreeWayMatchModal
          isOpen={matchModalOpen}
          onClose={() => setMatchModalOpen(false)}
          matchResult={{
            invoice_id: activeInvoice?.id || 'inv-draft-01',
            invoice_number: activeInvoice?.invoice_number || `INV-${activePeriod}-001`,
            po_number: activePo?.po_number || 'PO-JCS-2026-VND-089',
            period: activePeriod,
            po_available_balance: activePo?.remaining_balance || 500000,
            approved_payroll_payable: payable.net_vendor_payable,
            vendor_invoice_claimed: activeInvoice?.total_invoice_amount || payable.net_vendor_payable,
            difference_amount: activeInvoice?.variance_amount || 0,
            variance_percentage: 0,
            is_po_limit_sufficient: (activePo?.remaining_balance || 500000) >= payable.net_vendor_payable,
            is_payroll_matched: true,
            match_status: activeInvoice ? activeInvoice.match_status : 'MATCHED',
            exception_notes: activeInvoice?.exception_reason ? [activeInvoice.exception_reason] : [],
          }}
        />
      )}

      {/* AI OCR Scanner Modal */}
      <DocumentIntelligenceOcrModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onSaved={() => onNavigateTab('licenses')}
      />

      {/* Onboarding Wizard Modal */}
      <VendorOnboardingWizardModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSuccess={() => onNavigateTab('licenses')}
      />
    </div>
  );
};
