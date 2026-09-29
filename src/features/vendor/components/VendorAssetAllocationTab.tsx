// src/features/vendor/components/VendorAssetAllocationTab.tsx
// ============================================================================
// Joy PeopleHR — Enterprise Vendor Worker Asset Allocation & Custody Manager
// Automatic worker fetching, pricing, returnable vs non-returnable classification,
// return inspections, damage penalties, and seamless Invoice / Wage deduction workflow.
// ============================================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  CheckCircle2,
  AlertTriangle,
  ArrowLeftRight,
  Search,
  Filter,
  DollarSign,
  Clock,
  ShieldCheck,
  Receipt,
  Download,
  Trash2,
  Tag,
  AlertCircle,
  FileSpreadsheet,
  Check,
  RotateCcw,
  Sparkles,
  UserCheck,
  Layers,
  ChevronDown,
  Info,
} from 'lucide-react';
import {
  VendorAssetService,
  VendorAssetAllocationRecord,
  STANDARD_ASSET_CATALOG,
  AssetCatalogPreset,
  AssetCategory,
  AssetReturnableType,
  AssetCondition,
  DeductionTarget,
  AutoFetchedWorkerOption,
} from '../../../services/vendor/vendorAssetService';
import { VendorWorkforceService } from '../../../services/vendor/vendorWorkforceService';
import { useToast } from '../../../components/ui/Toast';

function fmtINR(val?: number): string {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return `₹${Math.round(val).toLocaleString('en-IN')}`;
}

interface VendorAssetAllocationTabProps {
  workers?: Array<{ code: string; name: string; role?: string; skill?: string }>;
  organizationId?: string;
  vendorId?: string;
  vendorName?: string;
  selectedSiteId?: string;
  selectedPeriod?: string;
  onNavigateToTab?: (tab: string) => void;
}

export const VendorAssetAllocationTab: React.FC<VendorAssetAllocationTabProps> = ({
  workers = [],
  organizationId = 'org-joy-main',
  vendorId = 'VND-JOY-01',
  vendorName = 'Joy Manpower Services Private Limited',
  selectedSiteId = 'rel-stream-b-joy-che-01',
  selectedPeriod = '2026-09',
  onNavigateToTab,
}) => {
  const { showToast } = useToast();

  // Persistent Allocations State
  const [allocations, setAllocations] = useState<VendorAssetAllocationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Auto-fetched Candidate Workers (Combines workers prop + DB + API)
  const [candidateWorkers, setCandidateWorkers] = useState<AutoFetchedWorkerOption[]>([]);
  const [isWorkersLoading, setIsWorkersLoading] = useState(false);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [returnableFilter, setReturnableFilter] = useState<'ALL' | AssetReturnableType>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | string>('ALL');
  const [deductionFilter, setDeductionFilter] = useState<'ALL' | DeductionTarget>('ALL');

  // Modals State
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [selectedAssetForReturn, setSelectedAssetForReturn] = useState<VendorAssetAllocationRecord | null>(null);

  // Form State: Issue Asset
  const [selectedWorkerCode, setSelectedWorkerCode] = useState('');
  const [workerSearchTerm, setWorkerSearchTerm] = useState('');
  const [isWorkerDropdownOpen, setIsWorkerDropdownOpen] = useState(false);

  const [selectedPresetId, setSelectedPresetId] = useState<string>('CUSTOM');
  const [assetName, setAssetName] = useState('');
  const [category, setCategory] = useState<AssetCategory>('SAFETY_PPE');
  const [returnableType, setReturnableType] = useState<AssetReturnableType>('NON_RETURNABLE');
  const [unitPrice, setUnitPrice] = useState<string>('1200');
  const [quantity, setQuantity] = useState<number>(1);
  const [serialNumber, setSerialNumber] = useState('');
  const [barcode, setBarcode] = useState('');
  const [issuedDate, setIssuedDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [conditionAtIssue, setConditionAtIssue] = useState<AssetCondition>('NEW');
  const [deductionTarget, setDeductionTarget] = useState<DeductionTarget>('WORKER_PAYROLL_DEDUCTION');
  const [deductionAmount, setDeductionAmount] = useState<string>('600');
  const [deductionReason, setDeductionReason] = useState('Subsidized safety gear issuance');

  // Custom Worker Manual Entry State
  const [isCustomWorker, setIsCustomWorker] = useState(false);
  const [customWorkerCode, setCustomWorkerCode] = useState('');
  const [customWorkerName, setCustomWorkerName] = useState('');
  const [customWorkerRole, setCustomWorkerRole] = useState('Contract Specialist');
  const [customWorkerDept, setCustomWorkerDept] = useState('Site Operations');

  // Form State: Return & Condition Inspection
  const [actualReturnDate, setActualReturnDate] = useState(new Date().toISOString().split('T')[0]);
  const [conditionAtReturn, setConditionAtReturn] = useState<AssetCondition>('GOOD');
  const [returnRemarks, setReturnRemarks] = useState('');
  const [assessedDamagePenalty, setAssessedDamagePenalty] = useState<string>('0');
  const [penaltyDeductionTarget, setPenaltyDeductionTarget] = useState<DeductionTarget>('VENDOR_INVOICE_DEDUCTION');

  // Load allocations from persistent store
  const refreshAllocations = () => {
    setIsLoading(true);
    try {
      const data = VendorAssetService.getAllocations({
        organizationId,
        vendorId,
      });
      setAllocations(data);
    } catch (e) {
      console.error('Failed to load asset allocations:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshAllocations();
  }, [organizationId, vendorId, selectedSiteId]);

  // Load candidate workers automatically (Zero-Mock Policy)
  useEffect(() => {
    let isMounted = true;
    setIsWorkersLoading(true);

    const MOCK_CODES = new Set(['20385', '20392', '20398', '20401', '20412', '20420', '20433']);

    VendorAssetService.getAvailableWorkers(vendorId)
      .then((fetched) => {
        if (!isMounted) return;
        // Merge with incoming workers prop while excluding mock IDs
        const map = new Map<string, AutoFetchedWorkerOption>();
        for (const w of fetched) {
          if (!MOCK_CODES.has(w.code)) {
            map.set(w.code, w);
          }
        }
        for (const p of workers) {
          if (p.code && !MOCK_CODES.has(p.code) && !map.has(p.code)) {
            map.set(p.code, {
              code: p.code,
              name: p.name,
              role: p.role || 'Contract Staff',
              department: 'Field Operations',
            });
          }
        }
        const merged = Array.from(map.values());
        setCandidateWorkers(merged);

        if (merged.length > 0) {
          if (!selectedWorkerCode || !merged.some((m) => m.code === selectedWorkerCode)) {
            setSelectedWorkerCode(merged[0].code);
          }
          setIsCustomWorker(false);
        } else {
          // If no workers exist yet in DB, default to custom direct worker entry mode
          setIsCustomWorker(true);
        }
      })
      .catch((err) => console.warn('Could not load candidates:', err))
      .finally(() => {
        if (isMounted) setIsWorkersLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [vendorId, workers]);

  // Preset Selection Handler
  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'CUSTOM') {
      return;
    }
    const preset = STANDARD_ASSET_CATALOG.find((p) => p.id === presetId);
    if (preset) {
      setAssetName(preset.name);
      setCategory(preset.category);
      setReturnableType(preset.returnableType);
      setUnitPrice(preset.defaultPrice.toString());
      setDeductionTarget(preset.defaultDeductionTarget);
      setDeductionAmount(preset.defaultDeductionAmount.toString());
      setDeductionReason(`${preset.name} issuance`);

      // Set default 30-day return date for returnables
      if (preset.returnableType === 'RETURNABLE') {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        setExpectedReturnDate(d.toISOString().split('T')[0]);
      } else {
        setExpectedReturnDate('');
      }
    }
  };

  // Submit Issue Asset Form
  const handleIssueAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetName.trim()) {
      showToast('Please specify an asset name', 'error');
      return;
    }

    let workerCode: string;
    let workerName: string;
    let workerRole: string;
    let workerDepartment: string;

    if (isCustomWorker || candidateWorkers.length === 0) {
      if (!customWorkerName.trim()) {
        showToast('Please enter the worker name', 'error');
        return;
      }
      workerCode = customWorkerCode.trim() || `WRK-${Date.now().toString().slice(-4)}`;
      workerName = customWorkerName.trim();
      workerRole = customWorkerRole.trim() || 'Contract Staff';
      workerDepartment = customWorkerDept.trim() || 'Field Operations';

      // Persist newly entered worker to local store so they exist in directory
      VendorWorkforceService.saveWorkerToLocalStore({
        id: `wrk-${Date.now()}`,
        vendorId: vendorId || 'VND-JOY-01',
        workerCode,
        firstName: workerName.split(' ')[0] || workerName,
        lastName: workerName.split(' ').slice(1).join(' ') || '',
        fullName: workerName,
        phone: '',
        designation: workerRole,
        department: workerDepartment,
        skillLevel: 'Skilled',
        joiningDate: new Date().toISOString().split('T')[0],
        dailyWageRate: 650,
        monthlyBaseSalary: 17000,
        overtimeEligible: true,
        complianceStatus: 'COMPLIANT',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } else {
      const worker = candidateWorkers.find((w) => w.code === selectedWorkerCode);
      workerName = worker?.name || 'Authorized Field Worker';
      workerCode = worker?.code || selectedWorkerCode || 'WRK-EXT';
      workerRole = worker?.role || 'Operations Staff';
      workerDepartment = worker?.department || 'Field Site Operations';
    }

    const parsedPrice = parseFloat(unitPrice) || 0;
    const parsedDedAmt = parseFloat(deductionAmount) || 0;

    try {
      const created = VendorAssetService.issueAsset({
        organizationId,
        vendorId,
        vendorName,
        siteId: selectedSiteId,
        siteName: 'Chennai Manufacturing Plant (CHE-01)',
        workerCode,
        workerName,
        workerRole,
        workerDepartment,
        assetName,
        category,
        serialNumber: serialNumber.trim() || undefined,
        barcode: barcode.trim() || undefined,
        returnableType,
        unitPrice: parsedPrice,
        quantity: quantity > 0 ? quantity : 1,
        issuedDate,
        expectedReturnDate: returnableType === 'RETURNABLE' ? expectedReturnDate : undefined,
        issuedBy: 'Site Operations Lead',
        conditionAtIssue,
        deductionTarget,
        deductionAmount: parsedDedAmt,
        deductionReason,
      });

      refreshAllocations();
      setIsIssueModalOpen(false);

      if (parsedDedAmt > 0 && deductionTarget === 'WORKER_PAYROLL_DEDUCTION') {
        showToast(
          `✓ Asset "${created.assetName}" issued to ${workerName}. Staged ${fmtINR(parsedDedAmt)} deduction in Wage Engine!`,
          'success'
        );
      } else {
        showToast(`✓ Asset "${created.assetName}" successfully issued to ${workerName}`, 'success');
      }

      // Reset form
      setAssetName('');
      setSerialNumber('');
      setBarcode('');
      setSelectedPresetId('CUSTOM');
      setCustomWorkerCode('');
      setCustomWorkerName('');
    } catch (err: any) {
      showToast(`Issuance failed: ${err.message || err}`, 'error');
    }
  };

  // Open Return Inspection Modal
  const handleOpenReturnModal = (asset: VendorAssetAllocationRecord) => {
    setSelectedAssetForReturn(asset);
    setActualReturnDate(new Date().toISOString().split('T')[0]);
    setConditionAtReturn('GOOD');
    setReturnRemarks('');
    setAssessedDamagePenalty('0');
    setPenaltyDeductionTarget('VENDOR_INVOICE_DEDUCTION');
    setIsReturnModalOpen(true);
  };

  // Submit Return Inspection
  const handleReturnSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssetForReturn) return;

    const penalty = parseFloat(assessedDamagePenalty) || 0;

    try {
      const updated = VendorAssetService.processReturn({
        allocationId: selectedAssetForReturn.id,
        actualReturnDate,
        conditionAtReturn,
        returnRemarks,
        assessedDamagePenalty: penalty,
        penaltyDeductionTarget,
      });

      refreshAllocations();
      setIsReturnModalOpen(false);

      if (penalty > 0) {
        showToast(
          `✓ Asset returned with condition [${conditionAtReturn}]. Assessed penalty of ${fmtINR(penalty)} staged for ${
            penaltyDeductionTarget === 'VENDOR_INVOICE_DEDUCTION' ? 'Vendor Invoice Debit Note' : 'Worker Wage Deduction'
          }!`,
          'info'
        );
      } else {
        showToast(`✓ Asset "${updated.assetName}" returned and verified in good condition ✓`, 'success');
      }
    } catch (err: any) {
      showToast(`Failed to process return: ${err.message || err}`, 'error');
    }
  };

  // Push to Payroll Wage Engine Deduction
  const handlePushToWages = (asset: VendorAssetAllocationRecord) => {
    VendorAssetService.pushToControlledPayrollDeductions(asset);
    showToast(
      `✓ Recovery of ${fmtINR(asset.deductionAmount)} for worker ${asset.workerName} staged in Wage Calculation Engine!`,
      'success'
    );
    if (onNavigateToTab) {
      onNavigateToTab('wages');
    }
  };

  // Push to Vendor Invoice Debit Note
  const handlePushToInvoice = (asset: VendorAssetAllocationRecord) => {
    VendorAssetService.stageForInvoice(asset.id);
    refreshAllocations();
    showToast(
      `✓ Debit Note of ${fmtINR(asset.deductionAmount)} staged for Vendor Invoice 3-Way Match settlement!`,
      'success'
    );
    if (onNavigateToTab) {
      onNavigateToTab('invoices');
    }
  };

  // Delete Allocation
  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to remove this asset allocation record?')) {
      VendorAssetService.deleteAllocation(id);
      refreshAllocations();
      showToast('Asset allocation record removed', 'info');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const { blob, fileName } = VendorAssetService.exportToCSV({ organizationId, vendorId });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`✓ Downloaded ${fileName}`, 'success');
  };

  // Summary Metrics
  const metrics = useMemo(() => {
    return VendorAssetService.getSummaryMetrics({ organizationId, vendorId });
  }, [allocations]);

  // Filtered Assets
  const filteredAssets = useMemo(() => {
    return allocations.filter((a) => {
      const q = searchQuery.toLowerCase();
      const matchSearch =
        !q ||
        a.workerName.toLowerCase().includes(q) ||
        a.workerCode.toLowerCase().includes(q) ||
        a.assetName.toLowerCase().includes(q) ||
        (a.serialNumber && a.serialNumber.toLowerCase().includes(q)) ||
        (a.barcode && a.barcode.toLowerCase().includes(q)) ||
        a.category.toLowerCase().includes(q);

      const matchReturnable = returnableFilter === 'ALL' || a.returnableType === returnableFilter;
      const matchStatus = statusFilter === 'ALL' || a.status === statusFilter;
      const matchDeduction = deductionFilter === 'ALL' || a.deductionTarget === deductionFilter;

      return matchSearch && matchReturnable && matchStatus && matchDeduction;
    });
  }, [allocations, searchQuery, returnableFilter, statusFilter, deductionFilter]);

  // Filtered Candidate Workers in Modal
  const modalFilteredWorkers = useMemo(() => {
    const term = workerSearchTerm.toLowerCase();
    if (!term) return candidateWorkers;
    return candidateWorkers.filter(
      (w) =>
        w.name.toLowerCase().includes(term) ||
        w.code.toLowerCase().includes(term) ||
        w.role.toLowerCase().includes(term) ||
        w.department.toLowerCase().includes(term)
    );
  }, [candidateWorkers, workerSearchTerm]);

  return (
    <div className="space-y-6">
      {/* Executive Command Header */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">
                  Vendor Worker Asset Allocation & Custody Register
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Track equipment, uniforms, safety PPE kits, and returnable tools with automatic pricing, inspection condition, and payroll / invoice debit recovery.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-gray-500" />
              <span>Export Custody Register (CSV)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handlePresetSelect('CAT-PPE-02'); // Default to safety boots
                setIsIssueModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Asset to Worker</span>
            </button>
          </div>
        </div>

        {/* 5 Enterprise Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mt-6 pt-5 border-t border-gray-100">
          <div className="bg-gray-50/80 rounded-xl p-3.5 border border-gray-200/70">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>Total Assets</span>
              <Package className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">{metrics.totalAllocated}</div>
            <div className="text-[11px] text-gray-500 mt-0.5 font-medium">
              Gross Value: <span className="font-bold text-gray-700">{fmtINR(metrics.totalAssetValue)}</span>
            </div>
          </div>

          <div className="bg-blue-50/50 rounded-xl p-3.5 border border-blue-200/60">
            <div className="flex items-center justify-between text-blue-700 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>Returnable in Field</span>
              <ArrowLeftRight className="w-3.5 h-3.5 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-blue-900 tracking-tight">{metrics.returnableInField}</div>
            <div className="text-[11px] text-blue-700 mt-0.5 font-medium">Tools, devices & testing gear</div>
          </div>

          <div className="bg-purple-50/50 rounded-xl p-3.5 border border-purple-200/60">
            <div className="flex items-center justify-between text-purple-700 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>Non-Returnable PPE</span>
              <Tag className="w-3.5 h-3.5 text-purple-500" />
            </div>
            <div className="text-2xl font-bold text-purple-900 tracking-tight">{metrics.nonReturnableIssued}</div>
            <div className="text-[11px] text-purple-700 mt-0.5 font-medium">Uniforms, boots & personal kits</div>
          </div>

          <div className="bg-amber-50/50 rounded-xl p-3.5 border border-amber-200/60">
            <div className="flex items-center justify-between text-amber-700 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>Action / Damaged</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-900 tracking-tight">{metrics.overdueOrDamaged}</div>
            <div className="text-[11px] text-amber-700 mt-0.5 font-medium">Penalties / inspections due</div>
          </div>

          <div className="bg-emerald-50/60 rounded-xl p-3.5 border border-emerald-200/70">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-semibold uppercase tracking-wider mb-1">
              <span>Recoveries / Deds</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-900 tracking-tight">{fmtINR(metrics.pendingDeductions)}</div>
            <div className="text-[11px] text-emerald-700 mt-0.5 font-medium">Ready for Wage / Invoice flow</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by worker name, employee ID, asset name, serial barcode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {/* Quick Filter Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Returnable Type Filter */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-xs">
              <button
                type="button"
                onClick={() => setReturnableFilter('ALL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  returnableFilter === 'ALL' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Types
              </button>
              <button
                type="button"
                onClick={() => setReturnableFilter('RETURNABLE')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  returnableFilter === 'RETURNABLE' ? 'bg-white text-blue-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Returnable
              </button>
              <button
                type="button"
                onClick={() => setReturnableFilter('NON_RETURNABLE')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                  returnableFilter === 'NON_RETURNABLE' ? 'bg-white text-purple-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Non-Returnable
              </button>
            </div>

            {/* Status Filter Dropdown */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Custody Statuses</option>
              <option value="ISSUED">Issued (Active in Field)</option>
              <option value="RETURNED_VERIFIED">Returned & Verified</option>
              <option value="DAMAGED">Damaged (Penalty Assessed)</option>
              <option value="LOST">Lost (Replacement Charge)</option>
            </select>

            {/* Deduction Target Filter */}
            <select
              value={deductionFilter}
              onChange={(e) => setDeductionFilter(e.target.value as any)}
              className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-700 outline-none cursor-pointer"
            >
              <option value="ALL">All Recovery Targets</option>
              <option value="WORKER_PAYROLL_DEDUCTION">Worker Wage Recovery</option>
              <option value="VENDOR_INVOICE_DEDUCTION">Vendor Invoice Debit Note</option>
              <option value="CLIENT_REIMBURSABLE_BILLING">Client Reimbursable</option>
              <option value="NO_DEDUCTION">Sponsored (Zero Recovery)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assets Allocation Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                <th className="py-3 px-4">Worker</th>
                <th className="py-3 px-4">Asset Details</th>
                <th className="py-3 px-4">Type & Pricing</th>
                <th className="py-3 px-4">Issuance Timeline</th>
                <th className="py-3 px-4">Custody Status</th>
                <th className="py-3 px-4">Recovery / Deduction</th>
                <th className="py-3 px-4 text-right">Workflow Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-medium">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-gray-500">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 mx-auto mb-3">
                      <Package className="w-6 h-6" />
                    </div>
                    <p className="font-bold text-gray-800 text-sm">No asset allocations found</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      Click &ldquo;Issue Asset to Worker&rdquo; to allocate tools, safety gear, or uniforms with automated pricing and deduction rules.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset) => {
                  const isReturnable = asset.returnableType === 'RETURNABLE';
                  const hasDeduction = asset.deductionAmount > 0;

                  return (
                    <tr key={asset.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* 1. Worker */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center font-bold text-xs shrink-0">
                            {asset.workerName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900 leading-tight">{asset.workerName}</div>
                            <div className="text-[11px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                              <span>ID: {asset.workerCode}</span>
                              <span>•</span>
                              <span>{asset.workerRole || 'Staff'}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Asset Details */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-gray-900">{asset.assetName}</div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5 flex-wrap">
                          <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-700 font-semibold">
                            {asset.category.replace(/_/g, ' ')}
                          </span>
                          {asset.serialNumber && (
                            <span className="font-mono text-gray-600">S/N: {asset.serialNumber}</span>
                          )}
                        </div>
                      </td>

                      {/* 3. Type & Pricing */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              isReturnable
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : 'bg-purple-100 text-purple-800 border border-purple-200'
                            }`}
                          >
                            {isReturnable ? 'Returnable' : 'Non-Returnable'}
                          </span>
                          <span className="text-gray-900 font-bold">{fmtINR(asset.unitPrice)}</span>
                        </div>
                        {asset.quantity > 1 && (
                          <div className="text-[11px] text-gray-400 mt-0.5">
                            Qty: {asset.quantity} (Total {fmtINR(asset.totalValue)})
                          </div>
                        )}
                      </td>

                      {/* 4. Issuance Timeline */}
                      <td className="py-3.5 px-4">
                        <div className="text-gray-800">
                          Issued: <span className="font-semibold">{asset.issuedDate}</span>
                        </div>
                        {isReturnable && (
                          <div className="text-[11px] text-gray-500 mt-0.5">
                            {asset.actualReturnDate ? (
                              <span className="text-emerald-700 font-semibold">
                                Returned: {asset.actualReturnDate}
                              </span>
                            ) : asset.expectedReturnDate ? (
                              <span>Due: {asset.expectedReturnDate}</span>
                            ) : (
                              <span>Open Custody</span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* 5. Custody Status */}
                      <td className="py-3.5 px-4">
                        {asset.status === 'ISSUED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            In Custody
                          </span>
                        )}
                        {asset.status === 'RETURNED_VERIFIED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Returned
                          </span>
                        )}
                        {asset.status === 'DAMAGED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Damaged
                          </span>
                        )}
                        {asset.status === 'LOST' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            Lost / Unreturned
                          </span>
                        )}
                      </td>

                      {/* 6. Recovery / Deduction */}
                      <td className="py-3.5 px-4">
                        {hasDeduction ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-gray-900 flex items-center gap-1">
                              <span className="text-red-700">{fmtINR(asset.deductionAmount)}</span>
                              <span className="text-[10px] text-gray-400 font-normal">
                                ({asset.deductionTarget === 'WORKER_PAYROLL_DEDUCTION' ? 'Wage Ded' : 'Invoice Debit'})
                              </span>
                            </div>
                            <div className="text-[10px]">
                              {asset.deductionStatus === 'PENDING_APPROVAL' && (
                                <span className="text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                  Pending Recovery
                                </span>
                              )}
                              {asset.deductionStatus === 'STAGED_FOR_PAYROLL' && (
                                <span className="text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                  Staged in Wages ✓
                                </span>
                              )}
                              {asset.deductionStatus === 'STAGED_FOR_INVOICE' && (
                                <span className="text-indigo-700 font-semibold bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-200">
                                  Staged in Invoice ✓
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-medium italic">
                            Sponsored / Zero Ded
                          </span>
                        )}
                      </td>

                      {/* 7. Workflow Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isReturnable && asset.status === 'ISSUED' && (
                            <button
                              type="button"
                              onClick={() => handleOpenReturnModal(asset)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-bold border border-emerald-200 transition-all cursor-pointer"
                              title="Inspect and process return"
                            >
                              Return / Inspect
                            </button>
                          )}

                          {hasDeduction &&
                            asset.deductionTarget === 'WORKER_PAYROLL_DEDUCTION' &&
                            asset.deductionStatus !== 'STAGED_FOR_PAYROLL' && (
                              <button
                                type="button"
                                onClick={() => handlePushToWages(asset)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-xs font-bold border border-amber-200 transition-all cursor-pointer"
                                title="Push recovery into Wage Calculation Engine"
                              >
                                <Sparkles className="w-3 h-3 text-amber-600" />
                                <span>Push to Wages</span>
                              </button>
                            )}

                          {hasDeduction &&
                            asset.deductionTarget === 'VENDOR_INVOICE_DEDUCTION' &&
                            asset.deductionStatus !== 'STAGED_FOR_INVOICE' && (
                              <button
                                type="button"
                                onClick={() => handlePushToInvoice(asset)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg text-xs font-bold border border-indigo-200 transition-all cursor-pointer"
                                title="Push debit recovery into Vendor Invoice settlement"
                              >
                                <Receipt className="w-3 h-3 text-indigo-600" />
                                <span>Push to Invoice</span>
                              </button>
                            )}

                          <button
                            type="button"
                            onClick={() => handleDelete(asset.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
                            title="Remove asset allocation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: ISSUE ASSET TO WORKER (With Auto-fetched Candidates & Catalog)   */}
      {/* ========================================================================= */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <form
            onSubmit={handleIssueAssetSubmit}
            className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 my-8"
          >
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Package className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">Issue Asset to Vendor Worker</h3>
                  <p className="text-xs text-gray-500">Auto-fetches workers and auto-populates pricing and deduction rules.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsIssueModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs font-medium">
              {/* 1. Worker Selection (Live Directory or Custom Worker Entry) */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-gray-800 font-bold flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Target Worker (Live Directory / Direct Entry) *</span>
                  </label>
                  <span className="text-[11px] text-emerald-700 font-medium">
                    {candidateWorkers.length > 0 ? `${candidateWorkers.length} live workers available` : 'Direct entry mode'}
                  </span>
                </div>

                {candidateWorkers.length > 0 && (
                  <div className="relative">
                    <select
                      value={isCustomWorker ? '__CUSTOM_ENTRY__' : selectedWorkerCode}
                      onChange={(e) => {
                        if (e.target.value === '__CUSTOM_ENTRY__') {
                          setIsCustomWorker(true);
                        } else {
                          setIsCustomWorker(false);
                          setSelectedWorkerCode(e.target.value);
                        }
                      }}
                      className="w-full p-2.5 bg-gray-50 hover:bg-white focus:bg-white border border-gray-300 rounded-xl font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-xs"
                      required={!isCustomWorker}
                    >
                      {candidateWorkers.map((w) => (
                        <option key={w.code} value={w.code}>
                          {w.name} ({w.code}) — {w.role} [{w.department}]
                        </option>
                      ))}
                      <option value="__CUSTOM_ENTRY__">+ Enter Custom / New Worker Details...</option>
                    </select>
                  </div>
                )}

                {(isCustomWorker || candidateWorkers.length === 0) && (
                  <div className="p-3 bg-amber-50/70 border border-amber-200/80 rounded-xl space-y-2.5 mt-2">
                    <div className="text-[11px] font-bold text-amber-900 flex items-center justify-between">
                      <span>Specify Actual Contract Worker Details:</span>
                      {candidateWorkers.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsCustomWorker(false)}
                          className="text-emerald-700 hover:underline text-[10px] font-semibold"
                        >
                          Select from Directory instead
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-gray-600 font-semibold block mb-0.5">Worker Code / ID *</label>
                        <input
                          type="text"
                          placeholder="e.g. WRK-9401"
                          value={customWorkerCode}
                          onChange={(e) => setCustomWorkerCode(e.target.value)}
                          className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs font-mono"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-600 font-semibold block mb-0.5">Full Name *</label>
                        <input
                          type="text"
                          placeholder="e.g. Ramesh Kumar"
                          value={customWorkerName}
                          onChange={(e) => setCustomWorkerName(e.target.value)}
                          className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs"
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-600 font-semibold block mb-0.5">Designation / Role</label>
                        <input
                          type="text"
                          placeholder="e.g. Senior Electrician"
                          value={customWorkerRole}
                          onChange={(e) => setCustomWorkerRole(e.target.value)}
                          className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-gray-600 font-semibold block mb-0.5">Department</label>
                        <input
                          type="text"
                          placeholder="e.g. Electrical Services"
                          value={customWorkerDept}
                          onChange={(e) => setCustomWorkerDept(e.target.value)}
                          className="w-full p-2 bg-white border border-gray-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Asset Catalog Presets (Auto-fills pricing and returnability) */}
              <div className="space-y-1.5 bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/70">
                <label className="text-emerald-900 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Quick Select from Standard Asset Catalog:</span>
                </label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => handlePresetSelect(e.target.value)}
                  className="w-full p-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-900 outline-none"
                >
                  <option value="CUSTOM">-- Custom Asset Entry (Specify Below) --</option>
                  {STANDARD_ASSET_CATALOG.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} — {fmtINR(item.defaultPrice)} ({item.returnableType === 'RETURNABLE' ? 'Returnable' : 'Non-Returnable'})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Asset Name & Category */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700 font-bold">Asset Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Steel Toe Safety Boots"
                    value={assetName}
                    onChange={(e) => setAssetName(e.target.value)}
                    className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="text-gray-700 font-bold">Asset Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl"
                  >
                    <option value="SAFETY_PPE">Safety & PPE Equipment</option>
                    <option value="UNIFORM">Uniforms & High-Vis Workwear</option>
                    <option value="ID_ACCESS_CARD">ID Badge & RFID Smart Card</option>
                    <option value="TOOL_EQUIPMENT">Tools & Mechanical Equipment</option>
                    <option value="MEASURING_INSTRUMENT">Measuring & Calibration Instruments</option>
                    <option value="COMMUNICATION">Two-Way Radio & Communication</option>
                    <option value="IT_HARDWARE">Hardware & Handheld Terminals</option>
                    <option value="OTHER">Other Consumable / Hardware</option>
                  </select>
                </div>
              </div>

              {/* 4. Returnable vs Non-Returnable Segmented Control */}
              <div className="space-y-1.5">
                <label className="text-gray-800 font-bold">Asset Classification Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReturnableType('RETURNABLE')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      returnableType === 'RETURNABLE'
                        ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-blue-600" />
                      <span>Returnable Asset</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Tools, laptops, walkie-talkies. Return condition inspected.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setReturnableType('NON_RETURNABLE')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      returnableType === 'NON_RETURNABLE'
                        ? 'bg-purple-50 border-purple-400 text-purple-900 shadow-2xs'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-bold flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-purple-600" />
                      <span>Non-Returnable (PPE)</span>
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Uniforms, safety boots. Cost recoverable via wages / invoice.
                    </p>
                  </button>
                </div>
              </div>

              {/* 5. Pricing & Serial Number */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-gray-700 font-bold">Unit Price (₹) *</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                    <input
                      type="number"
                      step="any"
                      placeholder="1200"
                      value={unitPrice}
                      onChange={(e) => setUnitPrice(e.target.value)}
                      className="w-full pl-8 pr-3 py-2.5 border border-gray-200 rounded-xl font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-gray-700 font-bold">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-gray-700 font-bold">Serial / Tag (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. S-994821"
                    value={serialNumber}
                    onChange={(e) => setSerialNumber(e.target.value)}
                    className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl"
                  />
                </div>
              </div>

              {/* 6. Issuance Date & Expected Return (If Returnable) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="text-gray-700 font-bold">Issuance Date</label>
                  <input
                    type="date"
                    value={issuedDate}
                    onChange={(e) => setIssuedDate(e.target.value)}
                    className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl"
                  />
                </div>

                {returnableType === 'RETURNABLE' && (
                  <div>
                    <label className="text-blue-900 font-bold">Expected Return Date</label>
                    <input
                      type="date"
                      value={expectedReturnDate}
                      onChange={(e) => setExpectedReturnDate(e.target.value)}
                      className="w-full mt-1 p-2.5 border border-blue-200 bg-blue-50/30 rounded-xl"
                    />
                  </div>
                )}
              </div>

              {/* 7. Deduction / Recovery Policy Configuration */}
              <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-800 text-xs">Cost Recovery / Deduction Policy</span>
                  <span className="text-[10px] text-gray-500">Links with Invoices & Wage Engine</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-600 text-[11px] font-bold">Deduction Channel</label>
                    <select
                      value={deductionTarget}
                      onChange={(e) => setDeductionTarget(e.target.value as any)}
                      className="w-full mt-1 p-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                    >
                      <option value="WORKER_PAYROLL_DEDUCTION">Deduct from Worker Wages (Wage Engine)</option>
                      <option value="VENDOR_INVOICE_DEDUCTION">Client Debit Note on Vendor Invoice</option>
                      <option value="CLIENT_REIMBURSABLE_BILLING">Bill to Client on Vendor Invoice</option>
                      <option value="NO_DEDUCTION">Company / Vendor Sponsored (Zero Ded)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-600 text-[11px] font-bold">Recovery Amount (₹)</label>
                    <div className="relative mt-1">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input
                        type="number"
                        step="any"
                        placeholder="0"
                        value={deductionAmount}
                        onChange={(e) => setDeductionAmount(e.target.value)}
                        className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-red-700"
                      />
                    </div>
                  </div>
                </div>

                {parseFloat(deductionAmount) > 0 && (
                  <div>
                    <label className="text-gray-600 text-[11px] font-bold">Deduction Ledger Remark</label>
                    <input
                      type="text"
                      placeholder="e.g. Subsidized PPE kit issue"
                      value={deductionReason}
                      onChange={(e) => setDeductionReason(e.target.value)}
                      className="w-full mt-1 p-2 bg-white border border-gray-200 rounded-lg text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsIssueModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl text-xs font-semibold text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#047857] hover:bg-[#065f46] text-white rounded-xl text-xs font-bold shadow-xs cursor-pointer"
              >
                Confirm Asset Issuance
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: RETURN & CONDITION INSPECTION WORKFLOW                          */}
      {/* ========================================================================= */}
      {isReturnModalOpen && selectedAssetForReturn && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleReturnSubmit}
            className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4"
          >
            <div className="flex justify-between items-center border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-bold text-gray-900 text-base">Process Asset Return & Inspection</h3>
                <p className="text-xs text-gray-500">
                  {selectedAssetForReturn.assetName} • Issued to {selectedAssetForReturn.workerName} ({selectedAssetForReturn.workerCode})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs font-medium">
              <div>
                <label className="text-gray-700 font-bold">Actual Return Date *</label>
                <input
                  type="date"
                  value={actualReturnDate}
                  onChange={(e) => setActualReturnDate(e.target.value)}
                  className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="text-gray-700 font-bold">Physical Condition Upon Return *</label>
                <select
                  value={conditionAtReturn}
                  onChange={(e) => setConditionAtReturn(e.target.value as any)}
                  className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl font-semibold"
                >
                  <option value="EXCELLENT">Excellent (Like New)</option>
                  <option value="GOOD">Good (Normal Wear & Tear — Zero Penalty)</option>
                  <option value="FAIR">Fair (Slight Wear — Accepted)</option>
                  <option value="DAMAGED">Damaged (Broken / Inoperable — Requires Penalty)</option>
                  <option value="LOST">Lost / Missing (Full / Partial Replacement Charge)</option>
                </select>
              </div>

              {(conditionAtReturn === 'DAMAGED' || conditionAtReturn === 'LOST') && (
                <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-300 space-y-3">
                  <div className="flex items-center gap-1.5 text-amber-900 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Damage / Replacement Recovery Fee Assessment</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-amber-900 text-[11px] font-bold">Assessed Penalty (₹) *</label>
                      <div className="relative mt-1">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                        <input
                          type="number"
                          step="any"
                          value={assessedDamagePenalty}
                          onChange={(e) => setAssessedDamagePenalty(e.target.value)}
                          className="w-full pl-7 pr-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-red-700"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-amber-900 text-[11px] font-bold">Charge Deduction To</label>
                      <select
                        value={penaltyDeductionTarget}
                        onChange={(e) => setPenaltyDeductionTarget(e.target.value as any)}
                        className="w-full mt-1 p-1.5 bg-white border border-amber-300 rounded-lg text-xs font-semibold"
                      >
                        <option value="VENDOR_INVOICE_DEDUCTION">Client Debit on Vendor Invoice</option>
                        <option value="WORKER_PAYROLL_DEDUCTION">Worker Wage Deduction</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="text-gray-700 font-bold">Return Inspection Remarks</label>
                <textarea
                  rows={2}
                  placeholder="Notes on equipment state, serial match, calibration status..."
                  value={returnRemarks}
                  onChange={(e) => setReturnRemarks(e.target.value)}
                  className="w-full mt-1 p-2.5 border border-gray-200 rounded-xl"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsReturnModalOpen(false)}
                className="px-4 py-2 bg-gray-100 rounded-xl text-xs font-semibold text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#047857] text-white rounded-xl text-xs font-bold shadow-xs hover:bg-[#065f46]"
              >
                Verify & Complete Return
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
