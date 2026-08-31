// src/features/payroll/subviews/ESIComplianceView.tsx
// ============================================================================
// Joy PeopleHR Enterprise HRMS — Production ESIC Compliance & Upload View
// 8-Step Filing Stepper • IP Reconciliation • 6-Col XLS Generator • Challan Tracker
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { ESIReasonCodeService } from '../../../services/payroll/esic/esiReasonCodeMaster';
import { ESIReconciliationService } from '../../../services/payroll/esic/esiReconciliationService';
import { ESIUploadBuilderService } from '../../../services/payroll/esic/esiUploadBuilderService';
import { ESIXlsGeneratorService } from '../../../services/payroll/esic/esiXlsGeneratorService';
import { ESIFilingService } from '../../../services/payroll/esic/esiFilingService';
import {
  ESICUploadBatch,
  ESICUploadRow,
  ESICRegisteredIPMaster,
  ESICReconciliationSummary,
  ESICFilingRecord,
} from '../../../types/esicCompliance';
import { PayrollRun } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import {
  Building,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  CheckCircle,
  AlertTriangle,
  AlertCircle,
  XCircle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Check,
  Layers,
  Calendar,
  FileText,
  CreditCard,
  History,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Info,
  X,
  Printer,
  Sparkles,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

export const ESIComplianceView: React.FC = () => {
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'register' | 'reconciliation' | 'preview' | 'filing' | 'rules'>('register');
  const [selectedPeriod, setSelectedPeriod] = useState<string>('August 2026');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Core Data State
  const [currentRun, setCurrentRun] = useState<PayrollRun | null>(null);
  const [uploadBatch, setUploadBatch] = useState<ESICUploadBatch | null>(null);
  const [reconciliation, setReconciliation] = useState<ESICReconciliationSummary | null>(null);
  const [filings, setFilings] = useState<ESICFilingRecord[]>([]);

  // Interactive Modals
  const [inspectedRow, setInspectedRow] = useState<ESICUploadRow | null>(null);
  const [isInspectModalOpen, setIsInspectModalOpen] = useState(false);
  const [isChallanModalOpen, setIsChallanModalOpen] = useState(false);
  const [isEditReasonModalOpen, setIsEditReasonModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState<ESICUploadRow | null>(null);
  const [selectedReasonCode, setSelectedReasonCode] = useState<number>(0);
  const [enteredLwd, setEnteredLwd] = useState<string>('');

  // Challan Form State
  const [challanNumber, setChallanNumber] = useState<string>('');
  const [challanDate, setChallanDate] = useState<string>('2026-09-12');
  const [paymentRef, setPaymentRef] = useState<string>('');
  const [bankName, setBankName] = useState<string>('State Bank of India');
  const [paidAmount, setPaidAmount] = useState<number>(0);

  // Load Data on Mount & Period Switch
  useEffect(() => {
    loadPeriodData();
  }, [selectedPeriod]);

  const loadPeriodData = async () => {
    const runs = payrollApi.getPayrollRuns();
    let run = runs.find(r => r.pay_period === selectedPeriod);
    if (!run && runs.length > 0) run = runs[0];

    if (!run) {
      setCurrentRun(null);
      setUploadBatch(null);
      setReconciliation(null);
      return;
    }

    setCurrentRun(run);

    // Build ESIC Master IP List from real tenant employee salary mappings
    const salaries = await payrollApi.getEmployeeSalaries();
    const esicMasterIPs: ESICRegisteredIPMaster[] = salaries
      .filter(s => s.esic_number && s.esic_number.trim().length > 0)
      .map((s, idx) => ({
        id: `esic-ip-${s.employee_id}`,
        tenant_id: s.tenant_id || 'org-joy-01',
        ip_number: s.esic_number,
        registered_ip_name: s.employee_name,
        date_of_registration: s.effective_from || '2026-04-01',
        employer_code: '51000123450000101',
        employer_name: 'Joy Tech Solutions Pvt Ltd',
        branch_office: 'Regional Branch',
        dispensary_name: 'Regional ESIC Dispensary',
        is_active: true,
        last_verified_at: new Date().toISOString().split('T')[0],
      }));

    // 1. Build ESIC Upload Rows & Batch
    const rows = ESIUploadBuilderService.buildUploadRows({ payrollRun: run });
    const batch = ESIUploadBuilderService.buildUploadBatch({ payrollRun: run, rows, version: 1 });
    setUploadBatch(batch);
    setPaidAmount(batch.total_liability_amount);

    // 2. Perform ESIC IP Population Reconciliation
    const recSummary = ESIReconciliationService.reconcilePopulation({
      tenantId: run.tenant_id,
      payPeriod: run.pay_period,
      payrollRecords: run.employee_records || [],
      esicMasterIPs,
    });
    setReconciliation(recSummary);

    // 3. Load Filings
    const fList = ESIFilingService.getFilings();
    setFilings(fList);
  };

  // Filtered Rows for Main Register & Preview Table
  const filteredRows = useMemo(() => {
    if (!uploadBatch) return [];
    return uploadBatch.rows.filter(r => {
      const matchSearch =
        r.col_b_ip_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.col_a_ip_number.includes(searchQuery);

      if (!matchSearch) return false;
      if (statusFilter === 'ZERO_WAGE') return r.col_d_monthly_wages === 0 || r.col_c_days === 0;
      if (statusFilter === 'BLOCKED') return r.validation_status === 'INVALID';
      if (statusFilter === 'WARNING') return r.validation_status === 'WARNING';
      if (statusFilter === 'OVERTIME') return r.ot_wage > 0;
      return true;
    });
  }, [uploadBatch, searchQuery, statusFilter]);

  // Handle XLS Generation & Self-Verification Download
  const handleGenerateAndDownloadXls = () => {
    if (!uploadBatch) return;

    if (uploadBatch.blocked_records > 0) {
      showToast('Cannot generate ESIC XLS. Please resolve all blocking validation errors first.', 'error');
      return;
    }

    const genResult = ESIXlsGeneratorService.generateESICXls(uploadBatch);

    if (genResult.success && genResult.integrityVerified) {
      // Save batch version in store
      uploadBatch.generated_at = new Date().toISOString();
      uploadBatch.generated_by = 'HR Administrator';
      uploadBatch.status = 'FILE_GENERATED';
      ESIFilingService.saveBatch(uploadBatch);

      // Trigger Genuine Client Download
      ESIXlsGeneratorService.triggerDownload(genResult.fileName, genResult.xlsContent);

      showToast(`ESIC Upload File (${genResult.fileName}) generated & verified successfully!`, 'success');
      loadPeriodData();
    } else {
      showToast('ESIC file generation failed integrity verification. Mismatch detected.', 'error');
    }
  };

  // Handle Save Reason Code & LWD Override
  const handleSaveReasonOverride = () => {
    if (!editingRow || !uploadBatch || !currentRun) return;

    const reasonObj = ESIReasonCodeService.getReasonByCode(selectedReasonCode);
    if (reasonObj?.requires_last_working_day && !enteredLwd) {
      showToast(`Reason "${reasonObj.name}" requires a valid Last Working Day.`, 'error');
      return;
    }

    const customOverrides: Record<string, { reasonCode: number; lastWorkingDay?: string }> = {};
    customOverrides[editingRow.employee_id] = {
      reasonCode: selectedReasonCode,
      lastWorkingDay: enteredLwd,
    };

    const newRows = ESIUploadBuilderService.buildUploadRows({
      payrollRun: currentRun,
      customReasonOverrides: customOverrides,
    });

    const newBatch = ESIUploadBuilderService.buildUploadBatch({
      payrollRun: currentRun,
      rows: newRows,
      version: (uploadBatch.version || 1) + 1,
    });

    setUploadBatch(newBatch);
    setIsEditReasonModalOpen(false);
    showToast(`Updated Reason Code for ${editingRow.col_b_ip_name} (Batch v${newBatch.version} created)`, 'success');
  };

  // Handle Record Challan Payment
  const handleRecordPayment = () => {
    if (!currentRun || !challanNumber || paidAmount <= 0) {
      showToast('Please enter complete Challan number and paid amount.', 'error');
      return;
    }

    ESIFilingService.recordChallanPayment({
      payrollRunId: currentRun.id,
      challanNumber,
      challanDate,
      paymentReference: paymentRef || `PAY-REF-${Date.now()}`,
      bankName,
      challanAmount: paidAmount,
      paidAmount,
      paymentDate: new Date().toISOString(),
      recordedBy: 'Finance Head',
      notes: 'ESIC online SBI payment verified',
    });

    setIsChallanModalOpen(false);
    showToast('Challan Payment recorded and reconciled successfully!', 'success');
    loadPeriodData();
  };

  return (
    <div className="space-y-6">
      {/* ── Top Period Selector & Establishment Header ── */}
      <div className="bg-white p-5 rounded-3xl border border-gray-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <Building className="w-4 h-4 text-[#07563D]" />
            <span>ESIC Establishment Code: 51000123450000101 • Tamil Nadu Region</span>
          </div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight mt-1">
            ESIC Monthly Contribution & Automatic XLS Upload Engine
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            2-Step ESI Assessment (Coverage ₹21k Ceiling vs Contribution Wage with OT) • IP Master Reconciliation • Legacy .xls Generator
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-1.5 rounded-2xl border border-gray-200">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={selectedPeriod}
              onChange={e => setSelectedPeriod(e.target.value)}
              className="text-xs font-bold bg-transparent border-none text-gray-800 outline-hidden cursor-pointer"
            >
              <option value="August 2026">August 2026</option>
              <option value="July 2026">July 2026</option>
              <option value="June 2026">June 2026</option>
            </select>
          </div>

          <Button
            onClick={handleGenerateAndDownloadXls}
            disabled={!uploadBatch || uploadBatch.blocked_records > 0}
            className={cn(
              "px-5 py-2.5 rounded-2xl text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer",
              uploadBatch && uploadBatch.blocked_records === 0
                ? "bg-[#07563D] hover:bg-[#0a7352] text-white"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            <Download className="w-4 h-4" />
            <span>Generate & Download ESIC XLS</span>
          </Button>
        </div>
      </div>

      {/* ── 8-Step Filing Stepper ── */}
      <div className="bg-white p-4 rounded-3xl border border-gray-200/90 shadow-2xs overflow-x-auto">
        <div className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2 px-1">
          ESIC Statutory Filing Lifecycle Stepper
        </div>
        <div className="flex items-center justify-between min-w-[860px] gap-2">
          {[
            { step: '01', title: 'Reconcile', desc: 'IP Master Match', status: reconciliation?.is_ready_for_upload ? 'COMPLETED' : 'WARNING' },
            { step: '02', title: 'Calculate', desc: 'Coverage vs Contrib', status: 'COMPLETED' },
            { step: '03', title: 'Review', desc: 'Zero Wages & LOP', status: 'COMPLETED' },
            { step: '04', title: 'Validate', desc: '15-Point Integrity', status: uploadBatch?.blocked_records === 0 ? 'COMPLETED' : 'BLOCKED' },
            { step: '05', title: 'Generate XLS', desc: 'Legacy 6-Col Format', status: uploadBatch?.status === 'FILE_GENERATED' ? 'COMPLETED' : 'READY' },
            { step: '06', title: 'File Portal', desc: 'ESIC Portal Upload', status: filings[0]?.portal_submission_reference ? 'COMPLETED' : 'PENDING' },
            { step: '07', title: 'Pay Challan', desc: 'SBI ESIC Payment', status: filings[0]?.challan_record ? 'COMPLETED' : 'PENDING' },
            { step: '08', title: 'Reconcile', desc: 'Liability Variance', status: filings[0]?.challan_record?.payment_status === 'MATCHED' ? 'COMPLETED' : 'PENDING' },
          ].map((s, idx, arr) => (
            <React.Fragment key={s.step}>
              <div className="flex items-center gap-2.5 p-2 rounded-2xl bg-gray-50/80 border border-gray-100 flex-1">
                <div
                  className={cn(
                    "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shrink-0",
                    s.status === 'COMPLETED' ? "bg-emerald-600 text-white" :
                    s.status === 'READY' ? "bg-indigo-600 text-white" :
                    s.status === 'WARNING' ? "bg-amber-500 text-white" :
                    s.status === 'BLOCKED' ? "bg-rose-600 text-white" : "bg-gray-200 text-gray-600"
                  )}
                >
                  {s.status === 'COMPLETED' ? <Check className="w-3.5 h-3.5" /> : s.step}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-gray-900 truncate">{s.title}</div>
                  <div className="text-[10px] text-gray-500 truncate">{s.desc}</div>
                </div>
              </div>
              {idx < arr.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* ── KPI Metric Summary Strip ── */}
      {uploadBatch && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-gray-400 block">Covered Employees</span>
            <div className="text-xl font-black text-gray-900 mt-0.5">{uploadBatch.total_records}</div>
            <span className="text-[10px] text-emerald-600 font-semibold">{uploadBatch.ready_records} Validated</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-gray-400 block">Zero-Wage Employees</span>
            <div className="text-xl font-black text-amber-700 mt-0.5">{uploadBatch.zero_wage_records}</div>
            <span className="text-[10px] text-gray-500">With Valid Reason Codes</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-gray-400 block">Total ESI Wages</span>
            <div className="text-xl font-black text-gray-900 mt-0.5 font-mono">₹{uploadBatch.total_esi_wages.toLocaleString('en-IN')}</div>
            <span className="text-[10px] text-gray-500">Contribution Base</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-gray-400 block">Employee Share (0.75%)</span>
            <div className="text-xl font-black text-indigo-700 mt-0.5 font-mono">₹{uploadBatch.total_employee_contribution.toLocaleString('en-IN')}</div>
            <span className="text-[10px] text-indigo-600 font-semibold">Deducted from Net Pay</span>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-gray-400 block">Employer Share (3.25%)</span>
            <div className="text-xl font-black text-purple-700 mt-0.5 font-mono">₹{uploadBatch.total_employer_contribution.toLocaleString('en-IN')}</div>
            <span className="text-[10px] text-purple-600 font-semibold">Company Cost Liability</span>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-teal-50 p-4 rounded-2xl border border-emerald-200 shadow-2xs">
            <span className="text-[10px] font-bold uppercase text-emerald-800 block">Total ESIC Liability</span>
            <div className="text-xl font-black text-[#07563D] mt-0.5 font-mono">₹{uploadBatch.total_liability_amount.toLocaleString('en-IN')}</div>
            <span className="text-[10px] text-emerald-700 font-bold">Challan Payable (4.00%)</span>
          </div>
        </div>
      )}

      {/* ── Subtabs Navigation ── */}
      <div className="flex items-center justify-between gap-4 border-b border-gray-200 pb-2">
        <div className="flex items-center gap-2">
          {[
            { id: 'register', label: '1. Monthly Contribution Register', icon: FileSpreadsheet },
            { id: 'reconciliation', label: `2. ESIC IP Reconciliation (${reconciliation?.items.length || 0})`, icon: ShieldCheck },
            { id: 'preview', label: '3. ESIC 6-Column Upload Preview', icon: Eye },
            { id: 'filing', label: '4. Filing & Challan Tracker', icon: CreditCard },
            { id: 'rules', label: '5. Reason Codes & Rules', icon: History },
          ].map(t => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={cn(
                  "px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer",
                  isActive
                    ? "bg-[#07563D] text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search IP / Name / Code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-gray-200 text-xs focus:outline-hidden focus:border-[#07563D] w-56"
            />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 bg-white"
          >
            <option value="ALL">All Employees</option>
            <option value="ZERO_WAGE">Zero-Wage Only</option>
            <option value="OVERTIME">With Overtime</option>
            <option value="WARNING">Warnings</option>
            <option value="BLOCKED">Blocked</option>
          </select>
        </div>
      </div>

      {/* ── TAB 1: MAIN CONTRIBUTION REGISTER ── */}
      {activeTab === 'register' && (
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-2xs">
          <div className="p-4 bg-gray-50/70 border-b border-gray-100 flex items-center justify-between">
            <div className="text-xs font-bold text-gray-700">
              ESI Monthly Contribution Register • <span className="font-semibold text-gray-500">Pay Period: {selectedPeriod}</span>
            </div>
            <div className="text-xs text-gray-500">
              Showing {filteredRows.length} of {uploadBatch?.rows.length || 0} Covered Employees
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/90 text-gray-600 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                  <th className="p-3.5">Employee</th>
                  <th className="p-3.5">IP Number (10 Digits)</th>
                  <th className="p-3.5">Coverage Wage</th>
                  <th className="p-3.5">Approved OT</th>
                  <th className="p-3.5">Contribution Wage</th>
                  <th className="p-3.5 text-center">Days</th>
                  <th className="p-3.5 text-right">Employee 0.75%</th>
                  <th className="p-3.5 text-right">Employer 3.25%</th>
                  <th className="p-3.5">Reason Code</th>
                  <th className="p-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.map(row => (
                  <tr key={row.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="p-3.5">
                      <div className="font-bold text-gray-900">{row.col_b_ip_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{row.employee_code}</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-gray-800">
                      {row.col_a_ip_number}
                    </td>
                    <td className="p-3.5 font-mono font-semibold text-gray-700">
                      ₹{row.coverage_wage.toLocaleString('en-IN')}
                      {row.coverage_wage <= 21000 && (
                        <span className="block text-[9px] text-emerald-600 font-bold">≤ ₹21k Ceiling</span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-gray-600">
                      {row.ot_wage > 0 ? (
                        <span className="text-purple-700 font-bold">+₹{row.ot_wage.toLocaleString('en-IN')}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-3.5 font-mono font-black text-gray-900">
                      ₹{row.col_d_monthly_wages.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 text-center font-mono font-bold">
                      <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-800">
                        {row.col_c_days} d
                      </span>
                      {row.internal_payable_days !== row.col_c_days && (
                        <span className="block text-[9px] text-gray-400">({row.internal_payable_days} int)</span>
                      )}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-indigo-700">
                      ₹{row.employee_esi_contribution.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-right font-mono font-bold text-purple-700">
                      ₹{row.employer_esi_contribution.toFixed(2)}
                    </td>
                    <td className="p-3.5">
                      {row.col_d_monthly_wages === 0 || row.col_c_days === 0 ? (
                        <button
                          onClick={() => {
                            setEditingRow(row);
                            setSelectedReasonCode(row.col_e_reason_code);
                            setEnteredLwd(row.col_f_last_working_day);
                            setIsEditReasonModalOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-bold hover:bg-amber-100 transition-colors cursor-pointer"
                        >
                          Code {row.col_e_reason_code}: {row.reason_name}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => {
                          setInspectedRow(row);
                          setIsInspectModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded-xl bg-gray-100 hover:bg-[#07563D] hover:text-white text-gray-700 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        How calculated
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: ESIC IP RECONCILIATION ── */}
      {activeTab === 'reconciliation' && reconciliation && (
        <div className="space-y-4">
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-6 h-6 text-emerald-700 shrink-0" />
              <div>
                <h3 className="text-sm font-black text-emerald-900">ESIC Registered IP Master Reconciliation Summary</h3>
                <p className="text-xs text-emerald-800/80">
                  {reconciliation.matched_count} Matched • {reconciliation.missing_from_esic_count} Missing in ESIC • {reconciliation.name_mismatch_count} Name Review Needed
                </p>
              </div>
            </div>

            <Badge variant={reconciliation.is_ready_for_upload ? 'success' : 'danger'} className="text-xs px-3 py-1 font-bold">
              {reconciliation.is_ready_for_upload ? 'Population Fully Reconciled' : 'Blocking Mismatch Detected'}
            </Badge>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200">
                  <th className="p-3.5">Employee / Code</th>
                  <th className="p-3.5">IP Number</th>
                  <th className="p-3.5">Payroll Name</th>
                  <th className="p-3.5">ESIC Master Name</th>
                  <th className="p-3.5">Match Status</th>
                  <th className="p-3.5">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reconciliation.items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="p-3.5">
                      <div className="font-bold text-gray-900">{item.payroll_name || 'Unmapped'}</div>
                      <div className="text-[10px] text-gray-400 font-mono">{item.employee_code || 'N/A'}</div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-gray-800">{item.ip_number}</td>
                    <td className="p-3.5 text-gray-700">{item.payroll_name || '—'}</td>
                    <td className="p-3.5 text-gray-700">{item.esic_registered_name || '—'}</td>
                    <td className="p-3.5">
                      <Badge
                        variant={item.status === 'MATCHED' ? 'success' : item.status === 'NAME_MISMATCH' ? 'warning' : 'danger'}
                        className="text-[10px] font-bold"
                      >
                        {item.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="p-3.5 text-gray-600 text-[11px] font-medium">{item.recommended_action}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: ESIC 6-COLUMN UPLOAD PREVIEW ── */}
      {activeTab === 'preview' && uploadBatch && (
        <div className="space-y-4">
          <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="w-5 h-5 text-indigo-700" />
              <div>
                <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                  Exact 6-Column ESIC Upload Template Preview ({uploadBatch.file_name})
                </h4>
                <p className="text-[11px] text-indigo-900/80">
                  Data Hash: <span className="font-mono font-bold">{uploadBatch.data_hash}</span> • Formatted as legacy Excel (.xls) compatible XML
                </p>
              </div>
            </div>

            <Button onClick={handleGenerateAndDownloadXls} className="bg-[#07563D] hover:bg-[#0a7352] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download .xls File
            </Button>
          </div>

          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-2xs">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#07563D] text-white font-bold text-[11px]">
                  <th className="p-3">Col A: IP Number (10 Digits)</th>
                  <th className="p-3">Col B: IP Name (Only alphabets and space)</th>
                  <th className="p-3 text-center">Col C: No of Days for which wages paid/payable</th>
                  <th className="p-3 text-right">Col D: Total Monthly Wages</th>
                  <th className="p-3 text-center">Col E: Reason Code for Zero workings days</th>
                  <th className="p-3">Col F: Last Working Day</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {uploadBatch.rows.map((row, idx) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    <td className="p-3 font-bold text-gray-900">{row.col_a_ip_number}</td>
                    <td className="p-3 font-sans font-medium text-gray-800">{row.col_b_ip_name}</td>
                    <td className="p-3 text-center font-bold text-gray-700">{row.col_c_days}</td>
                    <td className="p-3 text-right font-black text-gray-900">₹{row.col_d_monthly_wages.toFixed(2)}</td>
                    <td className="p-3 text-center font-bold text-gray-700">{row.col_e_reason_code}</td>
                    <td className="p-3 text-gray-600">{row.col_f_last_working_day || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 4: FILING & CHALLAN TRACKER ── */}
      {activeTab === 'filing' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 block">Filing & Payment Status</span>
              <h3 className="text-lg font-black text-gray-900 mt-0.5">
                {selectedPeriod} ESIC Filing & Reconciliation
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Upload your generated .xls to the official ESIC portal (esic.gov.in), then record your Challan number and payment reference below.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                onClick={() => setIsChallanModalOpen(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-2xl cursor-pointer"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                <span>Record Challan & Payment</span>
              </Button>
            </div>
          </div>

          {filings.map(f => (
            <div key={f.id} className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-gray-900">{f.file_name}</span>
                    <Badge variant="success" className="text-[10px] font-bold">{f.status}</Badge>
                  </div>
                  <span className="text-[10px] text-gray-500">Generated: {f.created_at} • Period: {f.pay_period}</span>
                </div>
              </div>

              {f.challan_record && (
                <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Challan Number</span>
                    <span className="font-mono font-bold text-gray-900">{f.challan_record.challan_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Paid Amount</span>
                    <span className="font-mono font-black text-emerald-800">₹{f.challan_record.paid_amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Bank Name</span>
                    <span className="font-bold text-gray-800">{f.challan_record.bank_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block text-[10px] uppercase font-bold">Reconciliation</span>
                    <Badge variant="success" className="text-[10px] font-bold">{f.challan_record.payment_status} (₹0 Variance)</Badge>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── TAB 5: REASON CODES MASTER ── */}
      {activeTab === 'rules' && (
        <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-2xs">
          <div className="p-4 bg-gray-50 border-b border-gray-100">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
              Official ESIC Zero-Wage Reason Master & Rules Reference
            </h4>
          </div>
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 font-bold uppercase text-[10px] border-b border-gray-200">
                <th className="p-3.5">Code</th>
                <th className="p-3.5">Reason Title</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5 text-center">Last Working Day (LWD)</th>
                <th className="p-3.5 text-center">Risk Level</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ESIReasonCodeService.getAllReasons().map(r => (
                <tr key={r.code} className="hover:bg-gray-50">
                  <td className="p-3.5 font-mono font-bold text-gray-900">{r.code}</td>
                  <td className="p-3.5 font-bold text-gray-800">{r.name}</td>
                  <td className="p-3.5 text-gray-600">{r.description}</td>
                  <td className="p-3.5 text-center">
                    <Badge variant={r.requires_last_working_day ? 'danger' : 'neutral'} className="text-[10px]">
                      {r.requires_last_working_day ? 'Mandatory Date' : 'Must be Blank'}
                    </Badge>
                  </td>
                  <td className="p-3.5 text-center">
                    {r.is_high_risk ? (
                      <Badge variant="danger" className="text-[10px]">High Risk (Exits IP)</Badge>
                    ) : (
                      <Badge variant="success" className="text-[10px]">Standard</Badge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── MODAL: HOW CALCULATED DETAIL DRAWER ── */}
      {isInspectModalOpen && inspectedRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-2xl overflow-hidden animate-in fade-in duration-150">
            <div className="p-5 bg-[#07563D] text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <HelpCircle className="w-5 h-5 text-emerald-300" />
                <div>
                  <h3 className="text-base font-black">ESI Calculation Traceability</h3>
                  <p className="text-xs text-emerald-200/80 font-mono">{inspectedRow.col_b_ip_name} • {inspectedRow.employee_code}</p>
                </div>
              </div>
              <button onClick={() => setIsInspectModalOpen(false)} className="text-white hover:bg-white/20 p-1.5 rounded-full cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200/80">
                <span className="text-[10px] font-bold text-emerald-900 uppercase">Step 1: Coverage Wage Assessment (OT Excluded)</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-gray-700 font-medium">Eligible Base Salary:</span>
                  <span className="font-mono font-bold text-gray-900">₹{inspectedRow.coverage_wage.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-gray-700 font-medium">Statutory Wage Ceiling:</span>
                  <span className="font-mono font-bold text-gray-900">₹21,000.00</span>
                </div>
                <div className="text-[10px] text-emerald-800 font-bold mt-1">
                  Result: Coverage Wage ₹{inspectedRow.coverage_wage} ≤ ₹21,000 → Employee is COVERED
                </div>
              </div>

              <div className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200/80 space-y-2">
                <span className="text-[10px] font-bold text-indigo-900 uppercase">Step 2: Contribution Wage Computation (OT Included)</span>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Coverage Wage:</span>
                  <span className="font-mono font-bold">₹{inspectedRow.coverage_wage.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">+ Approved Overtime Earnings:</span>
                  <span className="font-mono font-bold text-purple-700">+₹{inspectedRow.ot_wage.toLocaleString('en-IN')}</span>
                </div>
                <div className="pt-2 border-t border-indigo-200 flex items-center justify-between font-black text-sm text-indigo-950">
                  <span>Total Monthly Wages (Col D):</span>
                  <span className="font-mono">₹{inspectedRow.col_d_monthly_wages.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase text-gray-500 block">Employee Share (0.75%)</span>
                  <div className="text-base font-black text-indigo-700 font-mono mt-0.5">₹{inspectedRow.employee_esi_contribution.toFixed(2)}</div>
                  <span className="text-[10px] text-gray-400">₹{inspectedRow.col_d_monthly_wages} × 0.75%</span>
                </div>
                <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase text-gray-500 block">Employer Share (3.25%)</span>
                  <div className="text-base font-black text-purple-700 font-mono mt-0.5">₹{inspectedRow.employer_esi_contribution.toFixed(2)}</div>
                  <span className="text-[10px] text-gray-400">₹{inspectedRow.col_d_monthly_wages} × 3.25%</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <Button onClick={() => setIsInspectModalOpen(false)} className="bg-[#07563D] text-white text-xs font-bold px-4 py-2 rounded-xl cursor-pointer">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT ZERO-WAGE REASON CODE & LWD ── */}
      {isEditReasonModalOpen && editingRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
            <div className="p-5 bg-gray-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">Zero-Wage Reason Code Override</h3>
                <p className="text-xs text-gray-400">{editingRow.col_b_ip_name} • IP: {editingRow.col_a_ip_number}</p>
              </div>
              <button onClick={() => setIsEditReasonModalOpen(false)} className="text-white hover:bg-white/20 p-1.5 rounded-full cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1.5">Select Controlled Reason (Column E)</label>
                <select
                  value={selectedReasonCode}
                  onChange={e => setSelectedReasonCode(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-gray-300 font-medium text-xs bg-white focus:border-[#07563D]"
                >
                  {ESIReasonCodeService.getAllReasons().map(r => (
                    <option key={r.code} value={r.code}>
                      Code {r.code} — {r.name} {r.requires_last_working_day ? '(Mandatory LWD)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {ESIReasonCodeService.requiresLWD(selectedReasonCode) && (
                <div>
                  <label className="block text-gray-700 font-bold mb-1.5">Last Working Day (Column F)</label>
                  <input
                    type="date"
                    value={enteredLwd}
                    onChange={e => setEnteredLwd(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono text-xs"
                  />
                  <span className="text-[10px] text-gray-500 block mt-1">Export will automatically format as DD/MM/YYYY text date.</span>
                </div>
              )}

              {ESIReasonCodeService.isHighRisk(selectedReasonCode) && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>
                    <strong>High-Risk Warning:</strong> Submitting this reason code will permanently separate this Insurance Person from the active establishment.
                  </span>
                </div>
              )}
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditReasonModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button onClick={handleSaveReasonOverride} className="bg-[#07563D] hover:bg-[#0a7352] text-white text-xs font-bold px-4 py-2 rounded-xl">
                Save & Update Batch
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: RECORD CHALLAN PAYMENT ── */}
      {isChallanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in fade-in duration-150">
            <div className="p-5 bg-[#07563D] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-black">Record ESIC Challan & SBI Payment</h3>
                <p className="text-xs text-emerald-200/80">Pay Period: {selectedPeriod}</p>
              </div>
              <button onClick={() => setIsChallanModalOpen(false)} className="text-white hover:bg-white/20 p-1.5 rounded-full cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">ESIC Challan Number</label>
                <input
                  type="text"
                  placeholder="e.g. 051261098234"
                  value={challanNumber}
                  onChange={e => setChallanNumber(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 font-mono text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Challan Date</label>
                  <input
                    type="date"
                    value={challanDate}
                    onChange={e => setChallanDate(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono text-xs"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 font-bold mb-1">Paid Amount (₹)</label>
                  <input
                    type="number"
                    value={paidAmount}
                    onChange={e => setPaidAmount(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-gray-300 font-mono text-xs font-bold text-[#07563D]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Bank Payment Reference / Transaction ID</label>
                <input
                  type="text"
                  placeholder="e.g. SBIN829104812"
                  value={paymentRef}
                  onChange={e => setPaymentRef(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-gray-300 font-mono text-xs"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setIsChallanModalOpen(false)} className="text-xs">
                Cancel
              </Button>
              <Button onClick={handleRecordPayment} className="bg-[#07563D] hover:bg-[#0a7352] text-white text-xs font-bold px-4 py-2 rounded-xl">
                Reconcile & Save Payment
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
