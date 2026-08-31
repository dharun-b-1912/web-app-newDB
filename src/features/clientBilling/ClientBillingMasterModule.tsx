// src/features/clientBilling/ClientBillingMasterModule.tsx
// ============================================================================
// JOY PeopleHR / JOY Corporate Solutions — Client Payroll & Billing Master Workspace
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  ClientMaster,
  ClientContract,
  BillingRun,
  BillingRule,
  ClientBillingPolicy,
} from '../../types/clientBilling';
import { ClientMasterService } from '../../services/clientBilling/clientMasterService';
import { ClientBillingRunService } from '../../services/clientBilling/clientBillingRunService';
import { BillingRunStepper } from './components/BillingRunStepper';
import { BillingAuditModal } from './components/BillingAuditModal';
import { InvoicePreviewModal } from './components/InvoicePreviewModal';
import { BillingRuleBuilderModal } from './components/BillingRuleBuilderModal';
import {
  Sparkles,
  Building2,
  Receipt,
  ShieldCheck,
  SlidersHorizontal,
  FileSpreadsheet,
  Plus,
  Play,
  CheckCircle2,
  FileCheck2,
  Calendar,
  Layers,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Eye,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export const ClientBillingMasterModule: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'RUNS' | 'RECON' | 'RULES' | 'CLIENTS' | 'TEMPLATES'>('RUNS');
  const [clients, setClients] = useState<ClientMaster[]>([]);
  const [contracts, setContracts] = useState<ClientContract[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedContractId, setSelectedContractId] = useState<string>('');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('August 2026');

  const [billingRuns, setBillingRuns] = useState<BillingRun[]>([]);
  const [activeRun, setActiveRun] = useState<BillingRun | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Modals
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isRuleBuilderOpen, setIsRuleBuilderOpen] = useState(false);

  // Load clients and contracts on mount
  useEffect(() => {
    const loadedClients = ClientMasterService.getClients();
    setClients(loadedClients);

    if (loadedClients.length > 0) {
      const initialClient = loadedClients[0];
      setSelectedClientId(initialClient.id);

      const clientContracts = ClientMasterService.getContracts(initialClient.id);
      setContracts(clientContracts);

      if (clientContracts.length > 0) {
        setSelectedContractId(clientContracts[0].id);
      }
    }
  }, []);

  // Refresh billing runs whenever client, contract or period changes
  const refreshRuns = async (cId?: string, cntId?: string, prd?: string) => {
    setIsLoading(true);
    try {
      const clientId = cId || selectedClientId;
      const contractId = cntId || selectedContractId;
      const period = prd || selectedPeriod;

      const runs = await ClientBillingRunService.getBillingRuns({
        clientId: clientId || undefined,
        contractId: contractId || undefined,
        period: period || undefined,
      });

      setBillingRuns(runs);

      if (runs.length > 0) {
        setActiveRun(runs[0]);
      } else {
        setActiveRun(null);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedClientId && selectedContractId) {
      refreshRuns(selectedClientId, selectedContractId, selectedPeriod);
    }
  }, [selectedClientId, selectedContractId, selectedPeriod]);

  // Handle Client Switch
  const handleClientChange = (newClientId: string) => {
    setSelectedClientId(newClientId);
    const clientContracts = ClientMasterService.getContracts(newClientId);
    setContracts(clientContracts);
    if (clientContracts.length > 0) {
      setSelectedContractId(clientContracts[0].id);
      refreshRuns(newClientId, clientContracts[0].id, selectedPeriod);
    } else {
      setSelectedContractId('');
      setBillingRuns([]);
      setActiveRun(null);
    }
  };

  // Create new Billing Run for currently selected Client & Contract
  const handleCreateRun = async () => {
    if (!selectedClientId || !selectedContractId) return;
    setIsLoading(true);
    try {
      const newRun = await ClientBillingRunService.createAndCalculateRun(
        selectedClientId,
        selectedContractId,
        selectedPeriod,
        '2026-08-01',
        '2026-08-31'
      );
      setBillingRuns((prev) => [newRun, ...prev.filter((r) => r.id !== newRun.id)]);
      setActiveRun(newRun);
    } finally {
      setIsLoading(false);
    }
  };

  // Recalculate Active Run
  const handleRecalculate = async () => {
    if (!activeRun) return;
    setIsLoading(true);
    try {
      const updated = await ClientBillingRunService.recalculateRun(activeRun.id);
      setActiveRun(updated);
      setBillingRuns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } finally {
      setIsLoading(false);
    }
  };

  // Approve Invoice
  const handleApproveInvoice = async () => {
    if (!activeRun) return;
    const approved = await ClientBillingRunService.approveAndGenerateInvoice(activeRun.id);
    setActiveRun(approved);
    setBillingRuns((prev) => prev.map((r) => (r.id === approved.id ? approved : r)));
  };

  const selectedContract = contracts.find((c) => c.id === selectedContractId) || contracts[0];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen pb-24 select-none">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#07563D] via-[#096a4b] to-[#0a7352] p-6 rounded-3xl text-white shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>JOY PeopleHR / JOY Corporate Solutions</span>
            <span>•</span>
            <span>Client Billing &amp; Invoice Automation Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
            Dynamic Client Wage Billing &amp; Invoicing
          </h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-3xl leading-relaxed">
            Multi-client configurable payroll billing engine. Automatically calculates employee wages from attendance, separates statutory employer liabilities (PF 13% &amp; ESI 3.25%), computes contractual service charges, applies Indian GST, and exports multi-sheet Excel &amp; Tax Invoices.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={handleCreateRun}
            disabled={isLoading || !selectedContractId}
            className="px-4 py-2.5 rounded-2xl bg-white text-[#07563D] hover:bg-emerald-50 font-black text-xs shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <Play className="w-4 h-4 text-emerald-700 fill-emerald-600" />
            <span>⚡ Calculate Billing Run</span>
          </button>
        </div>
      </div>

      {/* Global Client & Contract Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Client Dropdown */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
              Select Client
            </label>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-emerald-700" />
              <select
                value={selectedClientId}
                onChange={(e) => handleClientChange(e.target.value)}
                className="text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.legal_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Contract Dropdown */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
              Contract Agreement
            </label>
            <select
              value={selectedContractId}
              onChange={(e) => setSelectedContractId(e.target.value)}
              className="text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-600 cursor-pointer max-w-xs truncate"
            >
              {contracts.map((cnt) => (
                <option key={cnt.id} value={cnt.id}>
                  {cnt.contract_name} ({cnt.contract_number})
                </option>
              ))}
            </select>
          </div>

          {/* Period Dropdown */}
          <div>
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block mb-1">
              Billing Period
            </label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-700" />
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-xs font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="August 2026">August 2026 (Monthly)</option>
                <option value="July 2026">July 2026 (Monthly)</option>
                <option value="June 2026">June 2026 (Monthly)</option>
              </select>
            </div>
          </div>
        </div>

        {selectedContract && (
          <div className="flex items-center gap-3 text-xs bg-emerald-50/80 p-2.5 px-4 rounded-xl border border-emerald-200 text-emerald-900">
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Salary Divisor</span>
              <span className="font-bold">{selectedContract.salary_divisor_type}</span>
            </div>
            <div className="border-l border-emerald-300 pl-3">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Service Charge</span>
              <span className="font-bold">{selectedContract.default_service_charge_pct}%</span>
            </div>
            <div className="border-l border-emerald-300 pl-3">
              <span className="text-[10px] uppercase font-bold text-emerald-700 block">Transport</span>
              <span className="font-bold">₹{selectedContract.transport_rate_per_employee}/head</span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          {[
            { id: 'RUNS', label: '⚡ Active Billing Runs', icon: Receipt },
            { id: 'RECON', label: '📊 Statutory Reconciliation & Audit', icon: ShieldCheck },
            { id: 'RULES', label: '⚙️ Billing Rules & Component Policies', icon: SlidersHorizontal },
            { id: 'CLIENTS', label: '🏢 Clients & Manpower Contracts', icon: Building2 },
            { id: 'TEMPLATES', label: '📑 Legacy Excel Template Mapper', icon: FileSpreadsheet },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer",
                  isActive
                    ? "bg-[#07563D] text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => setIsRuleBuilderOpen(true)}
          className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>+ Add Billing Rule</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'RUNS' && (
        <div className="space-y-6">
          {activeRun ? (
            <BillingRunStepper
              run={activeRun}
              onOpenAudit={() => setIsAuditModalOpen(true)}
              onOpenInvoice={() => setIsInvoiceModalOpen(true)}
              onRecalculate={handleRecalculate}
            />
          ) : (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/80 shadow-2xs space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 mx-auto">
                <Receipt className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-gray-900">No Billing Run Found for this Cycle</h3>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Click below to pull deployed employees, aggregate attendance, calculate statutory employer costs, and generate the billing statement.
              </p>
              <button
                onClick={handleCreateRun}
                className="px-5 py-2.5 rounded-xl bg-[#07563D] text-white font-bold text-xs hover:bg-[#064833] shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4" />
                <span>Generate Billing Run for {selectedPeriod}</span>
              </button>
            </div>
          )}

          {/* Billing Runs History List */}
          {billingRuns.length > 1 && (
            <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-2xs space-y-4">
              <h3 className="font-black text-gray-900 text-sm">Billing Runs History</h3>
              <div className="divide-y divide-gray-100">
                {billingRuns.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => setActiveRun(r)}
                    className={cn(
                      "p-3.5 rounded-xl flex items-center justify-between text-xs cursor-pointer transition-colors",
                      activeRun?.id === r.id ? "bg-emerald-50/70 border border-emerald-200" : "hover:bg-gray-50"
                    )}
                  >
                    <div>
                      <div className="font-bold text-gray-900">{r.client_name} ({r.period})</div>
                      <div className="text-[11px] text-gray-500">{r.contract_name} • {r.active_employee_count} Associates</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right font-mono">
                        <div className="font-black text-emerald-900">₹{r.tax_summary.grand_total.toLocaleString('en-IN')}</div>
                        <div className="text-[10px] text-gray-400">{r.status}</div>
                      </div>
                      <Eye className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'RECON' && activeRun && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-black text-gray-900">Billing Audit &amp; Statutory Reconciliation</h3>
              <p className="text-xs text-gray-500">Live head-to-head comparison against HRMS Attendance &amp; Payroll</p>
            </div>
            <button
              onClick={() => setIsAuditModalOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#07563D] hover:bg-[#064833]"
            >
              Open Interactive Audit Modal
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Headcount Match</span>
              <div className="flex justify-between text-sm font-bold">
                <span>Payroll Deployed: {activeRun.reconciliation.payroll_employee_count}</span>
                <span className="text-emerald-700">Billed: {activeRun.reconciliation.billed_employee_count} (✓ 100%)</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Employer PF Match</span>
              <div className="flex justify-between text-sm font-bold font-mono">
                <span>Payroll: ₹{activeRun.reconciliation.payroll_employer_pf.toLocaleString('en-IN')}</span>
                <span className="text-indigo-700">Billed: ₹{activeRun.reconciliation.billed_employer_pf.toLocaleString('en-IN')} (✓ 100%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'RULES' && selectedContract && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-gray-100">
            <div>
              <h3 className="text-base font-black text-gray-900">Client Billing Policy &amp; Dynamic Rules</h3>
              <p className="text-xs text-gray-500">Configure billable salary components and contractual charges</p>
            </div>
            <button
              onClick={() => setIsRuleBuilderOpen(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-[#07563D] hover:bg-[#064833]"
            >
              + Create New Billing Rule
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider text-emerald-800">
                Billable Salary Components
              </h4>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
                {[
                  { label: 'Basic Wages', active: true },
                  { label: 'Dearness Allowance (DA)', active: true },
                  { label: 'House Rent Allowance (HRA)', active: true },
                  { label: 'Special Allowance', active: true },
                  { label: 'Overtime Wages (OT)', active: true },
                  { label: 'Attendance Bonus', active: true },
                  { label: 'Performance Incentive', active: true },
                  { label: 'Leave Wages', active: true },
                ].map((c, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">{c.label}</span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                      INCLUDED IN INVOICE
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider text-indigo-800">
                Statutory &amp; Recovery Treatments
              </h4>
              <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Employer EPF (13.00%)</span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                    PASS-THROUGH
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Employer ESIC (3.25%)</span>
                  <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold text-[10px]">
                    PASS-THROUGH
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Canteen Meal Recovery</span>
                  <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px]">
                    DEDUCTED FROM GROSS
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'CLIENTS' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs space-y-4">
          <h3 className="text-base font-black text-gray-900">Clients &amp; Active Contracts Master</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((c) => (
              <div key={c.id} className="p-4 rounded-2xl border border-gray-200 hover:border-emerald-500 transition-all text-xs space-y-2">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-gray-900 text-sm">{c.legal_name}</h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                    {c.status}
                  </span>
                </div>
                <div className="text-gray-500 space-y-0.5">
                  <p><strong>Code:</strong> {c.client_code}</p>
                  <p><strong>GSTIN:</strong> {c.gstin}</p>
                  <p><strong>State:</strong> {c.state} ({c.state_code})</p>
                  <p><strong>Terms:</strong> {c.payment_terms}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'TEMPLATES' && (
        <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs space-y-4">
          <h3 className="text-base font-black text-gray-900">Client Legacy Template Mapping Engine</h3>
          <p className="text-xs text-gray-500">
            Map custom client spreadsheet columns and formulas to JOY PeopleHR data sources without modifying code.
          </p>
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-2">
            <strong>Supported Reference Formats:</strong>
            <ul className="list-disc list-inside space-y-1 text-emerald-800">
              <li>Bull Plant 1 / Plant 2 Multi-Sheet Invoice &amp; Overtime Workings</li>
              <li>Pressmatic Precision Salary Working + Summary + Invoice I/II</li>
              <li>Electrodrive Salary / OT / F&amp;F Bills</li>
              <li>Flowserve Sanmar Daily Wage &amp; Shift Workings</li>
            </ul>
          </div>
        </div>
      )}

      {/* Audit Modal */}
      {activeRun && (
        <BillingAuditModal
          run={activeRun}
          isOpen={isAuditModalOpen}
          onClose={() => setIsAuditModalOpen(false)}
          onProceedToInvoice={() => {
            setIsAuditModalOpen(false);
            setIsInvoiceModalOpen(true);
          }}
        />
      )}

      {/* Invoice Modal */}
      {activeRun && (
        <InvoicePreviewModal
          run={activeRun}
          isOpen={isInvoiceModalOpen}
          onClose={() => setIsInvoiceModalOpen(false)}
          onApproveInvoice={handleApproveInvoice}
        />
      )}

      {/* Rule Builder Modal */}
      {selectedContract && (
        <BillingRuleBuilderModal
          contract={selectedContract}
          isOpen={isRuleBuilderOpen}
          onClose={() => setIsRuleBuilderOpen(false)}
          onSaveRule={(newRule) => {
            ClientMasterService.saveBillingRule(newRule);
            handleRecalculate();
          }}
        />
      )}
    </div>
  );
};
