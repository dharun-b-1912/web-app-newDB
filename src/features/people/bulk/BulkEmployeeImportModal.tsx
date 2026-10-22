// src/features/people/bulk/BulkEmployeeImportModal.tsx
// ============================================================================
// Joy PeopleHR Enterprise — Authoritative Bulk Employee Import Modal
// 5-Stage Guided Enterprise Pipeline:
// 1. UPLOAD: Drag & Drop any Excel/CSV spreadsheet + Clean Template Download
// 2. MAPPING: Intelligent Column Auto-Detection with manual override (Zero Reference Data Required)
// 3. CONFIRMATION & REVIEW: Full verification hub before adding to Employee Management:
//    - Readiness KPIs (Ready, Updates, Needs Action)
//    - Interactive Candidate Table with row selection
//    - Inline cell editing with dynamic live re-validation
//    - Explicit Pre-Addition Confirmation Gate with mandatory approval checkbox
// 4. PROCESSING: Safe chunked execution (25-record batches) with live progress
// 5. COMPLETED: Comprehensive summary report with direct navigation to Employee Management
// ============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { useTenant } from '../../../hooks/useTenant';
import { Employee, Department, Designation, Branch } from '../../../types';
import { api } from '../../../services/api';
import {
  bulkImportService,
  CANONICAL_IMPORT_FIELDS,
  CandidateEmployeeRow,
  BulkImportJobProgress,
  BulkImportResult,
} from './bulkImportService';
import {
  generateEmployeeImportTemplate,
  downloadBulkImportErrorReport,
  exportEmployeeMasterData,
  exportOnboardingHeaderTemplate,
  BulkImportRowError,
} from './excelTemplateGenerator';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  Users,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  Search,
  Check,
  Edit2,
  HelpCircle,
  Sparkles,
  ChevronRight,
  Layers,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (created: Employee[]) => void;
}

type Stage = 'UPLOAD' | 'MAPPING' | 'CONFIRMATION' | 'PROCESSING' | 'COMPLETED';

export const BulkEmployeeImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const { showToast } = useToast();
  const { activeCompany, organization } = useTenant();

  // Wizard Stage
  const [currentStage, setCurrentStage] = useState<Stage>('UPLOAD');

  // Master Data (for duplicate checking and manager resolution)
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [existingEmployees, setExistingEmployees] = useState<Employee[]>([]);

  // Stage 1: Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);

  // Stage 2: Column Mapping State
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

  // Stage 3: Confirmation & Review State
  const [candidates, setCandidates] = useState<CandidateEmployeeRow[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'READY' | 'NEEDS_ACTION' | 'UPDATE'>('ALL');
  const [viewMode, setViewMode] = useState<'CORE' | 'STATUTORY' | 'COMP_ADDRESS' | 'ALL'>('CORE');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null);
  const [editingValue, setEditingValue] = useState<string>('');
  const [isConfirmedByHR, setIsConfirmedByHR] = useState<boolean>(false);

  // Stage 4: Processing State
  const [jobProgress, setJobProgress] = useState<BulkImportJobProgress | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  // Stage 5: Completed State
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing employees for collision detection
  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    Promise.all([
      api.getDepartments().catch(() => []),
      api.getDesignations().catch(() => []),
      api.getBranches().catch(() => []),
      api.getEmployees().catch(() => []),
    ]).then(([depts, desigs, brs, emps]) => {
      if (!mounted) return;
      setDepartments(depts || []);
      setDesignations(desigs || []);
      setBranches(brs || []);
      setExistingEmployees(emps || []);
    });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Reset State on Close
  const handleResetAndClose = () => {
    if (isExecuting) {
      if (!confirm('Import is currently in progress. Exiting now may leave partial records. Are you sure you want to exit?')) {
        return;
      }
    }
    setCurrentStage('UPLOAD');
    setUploadedFile(null);
    setFileHeaders([]);
    setRawRows([]);
    setColumnMapping({});
    setCandidates([]);
    setSearchQuery('');
    setStatusFilter('ALL');
    setEditingCell(null);
    setIsConfirmedByHR(false);
    setJobProgress(null);
    setImportResult(null);
    setIsExecuting(false);
    onClose();
  };

  // 1. Template Download Handler (Clean Headers + Example Row + Pre-defined Options)
  const handleDownloadTemplate = () => {
    try {
      exportOnboardingHeaderTemplate({
        departments,
        designations,
        branches,
        existingEmployees,
      });
      showToast('Downloaded Onboarding Template with clean headers, example row & pre-defined options guide.', 'success');
    } catch (err: any) {
      showToast('Failed to download template: ' + (err.message || err), 'error');
    }
  };

  // 2. File Selection & Parsing Handler
  const handleFileSelected = async (file: File) => {
    if (!file) return;
    setUploadedFile(file);
    setIsParsing(true);

    try {
      const { headers, rawRows: rows } = await bulkImportService.extractSheetData(file);
      if (rows.length === 0) {
        showToast('The uploaded sheet is empty or contains no data rows.', 'error');
        setIsParsing(false);
        return;
      }

      setFileHeaders(headers);
      setRawRows(rows);

      // Auto-detect column mapping
      const autoMapping = bulkImportService.autoDetectColumnMapping(headers);
      setColumnMapping(autoMapping);

      // Check if all required canonical fields are mapped
      const requiredFields = CANONICAL_IMPORT_FIELDS.filter((f) => f.required);
      const allRequiredMapped = requiredFields.every((f) => Boolean(autoMapping[f.key]));

      if (allRequiredMapped) {
        // Build candidates directly and move to review stage
        const summary = bulkImportService.buildCandidateRows(rows, autoMapping, existingEmployees);
        setCandidates(summary.candidates);
        setCurrentStage('CONFIRMATION');
        showToast(`Auto-mapped all required columns! Loaded ${summary.total} candidate records.`, 'success');
      } else {
        // Move to mapping stage to let user map unmapped required fields
        setCurrentStage('MAPPING');
        showToast(`Uploaded ${rows.length} rows. Please review column mappings.`, 'info');
      }
    } catch (err: any) {
      console.error('[BulkImport] File reading error:', err);
      showToast('Failed to read file: ' + (err.message || 'Invalid format'), 'error');
    } finally {
      setIsParsing(false);
    }
  };

  // 3. Mapping Update & Proceed to Review Handler
  const handleProceedToReview = () => {
    const requiredFields = CANONICAL_IMPORT_FIELDS.filter((f) => f.required);
    const missing = requiredFields.filter((f) => !columnMapping[f.key]);

    if (missing.length > 0) {
      showToast(`Please map the required field(s): ${missing.map((m) => m.label).join(', ')}`, 'warning');
      return;
    }

    const summary = bulkImportService.buildCandidateRows(rawRows, columnMapping, existingEmployees);
    setCandidates(summary.candidates);
    setIsConfirmedByHR(false);
    setCurrentStage('CONFIRMATION');
    showToast(`Validation complete: ${summary.readyCount} ready to add, ${summary.needsActionCount} need action.`, 'info');
  };

  // 4. Inline Editing in Confirmation Grid
  const handleStartCellEdit = (id: string, field: string, currentValue: string) => {
    setEditingCell({ id, field });
    setEditingValue(currentValue || '');
  };

  const handleSaveCellEdit = (id: string, field: string) => {
    setCandidates((prev) => {
      const targetIndex = prev.findIndex((c) => c.id === id);
      if (targetIndex === -1) return prev;

      const target = { ...prev[targetIndex], [field]: editingValue };
      const revalidated = bulkImportService.revalidateCandidate(target, prev, existingEmployees);

      const next = [...prev];
      next[targetIndex] = revalidated;
      return next;
    });

    setEditingCell(null);
    setEditingValue('');
    showToast('Record updated and re-validated.', 'info');
  };

  // Toggle selection for all or single candidate
  const handleToggleSelectAll = (checked: boolean) => {
    setCandidates((prev) =>
      prev.map((c) => (c.status !== 'NEEDS_ACTION' ? { ...c, selected: checked } : c))
    );
  };

  const handleToggleCandidate = (id: string) => {
    setCandidates((prev) =>
      prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c))
    );
  };

  // 5. Pre-Addition Confirmation & Execution
  const handleConfirmAndAddEmployees = async () => {
    const selectedReadyCandidates = candidates.filter(
      (c) => c.selected && c.status !== 'NEEDS_ACTION'
    );

    if (selectedReadyCandidates.length === 0) {
      showToast('No valid employee records selected to add.', 'error');
      return;
    }

    if (!isConfirmedByHR) {
      showToast('Please confirm the pre-addition checklist before proceeding.', 'warning');
      return;
    }

    const orgId = organization?.id || activeCompany?.organization_id || '0c621892-e938-4707-9957-13534ea32c19';
    const compId = activeCompany?.id || orgId;

    setIsExecuting(true);
    setCurrentStage('PROCESSING');

    try {
      const result = await bulkImportService.executeImportCandidates(
        candidates,
        orgId,
        compId,
        (progress) => {
          setJobProgress(progress);
        },
        25,
        existingEmployees
      );

      setImportResult(result);
      setCurrentStage('COMPLETED');

      if (onImportComplete && result.createdEmployees.length > 0) {
        onImportComplete(result.createdEmployees);
      }

      if (result.failedRows === 0) {
        showToast(`Successfully added all ${result.successfulRows} employees to Employee Management!`, 'success');
      } else {
        showToast(`Import completed: ${result.successfulRows} added, ${result.failedRows} failed.`, 'warning');
      }
    } catch (err: any) {
      console.error('[BulkImport] Batch execution error:', err);
      showToast('Execution error: ' + (err.message || err), 'error');
      setCurrentStage('CONFIRMATION');
    } finally {
      setIsExecuting(false);
    }
  };

  // Download error report if any rows need action
  const handleDownloadErrors = () => {
    const errorRows: BulkImportRowError[] = [];
    candidates.forEach((c) => {
      c.issues
        .filter((i) => i.severity === 'error')
        .forEach((issue) => {
          errorRows.push({
            rowNumber: c.rowNumber,
            employeeCode: c.employee_code,
            field: issue.field,
            value: (c as any)[issue.field],
            message: issue.message,
          });
        });
    });

    if (errorRows.length === 0) {
      showToast('No error records to export.', 'info');
      return;
    }

    downloadBulkImportErrorReport(errorRows, rawRows);
    showToast('Error report downloaded.', 'success');
  };

  // Metrics Calculations
  const totalCount = candidates.length;
  const readyCount = candidates.filter((c) => c.status === 'READY').length;
  const updateCount = candidates.filter((c) => c.status === 'UPDATE').length;
  const needsActionCount = candidates.filter((c) => c.status === 'NEEDS_ACTION').length;
  const selectedCount = candidates.filter((c) => c.selected && c.status !== 'NEEDS_ACTION').length;

  // Filtered Candidates in Review Table
  const filteredCandidates = useMemo(() => {
    return candidates.filter((c) => {
      if (statusFilter === 'READY' && c.status !== 'READY') return false;
      if (statusFilter === 'UPDATE' && c.status !== 'UPDATE') return false;
      if (statusFilter === 'NEEDS_ACTION' && c.status !== 'NEEDS_ACTION') return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const code = c.employee_code.toLowerCase();
        const name = c.display_name.toLowerCase();
        const email = c.work_email.toLowerCase();
        const dept = c.department_name.toLowerCase();
        const desig = c.designation_title.toLowerCase();

        return (
          code.includes(query) ||
          name.includes(query) ||
          email.includes(query) ||
          dept.includes(query) ||
          desig.includes(query)
        );
      }

      return true;
    });
  }, [candidates, statusFilter, searchQuery]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title="Bulk Import Employees"
      maxWidth="6xl"
      hideHeader={true}
    >
      <div className="flex flex-col h-[85vh] max-h-[850px] bg-gray-50/50 rounded-2xl overflow-hidden">
        {/* Top Header Strip with Breadcrumb Steps */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-[#07563D] text-white flex items-center justify-center shadow-sm">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-gray-900 tracking-tight">
                    Bulk Employee Import
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#07563D] border border-emerald-200">
                    Zero Reference Dependency
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Upload any spreadsheet, map columns dynamically, and confirm candidate readiness before adding to Employee Management.
                </p>
              </div>
            </div>

            {/* Stepper Pills */}
            <div className="hidden md:flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl text-xs font-semibold">
              <span
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  currentStage === 'UPLOAD'
                    ? 'bg-white text-[#07563D] shadow-sm font-bold'
                    : 'text-gray-500'
                }`}
              >
                1. Upload
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  currentStage === 'MAPPING'
                    ? 'bg-white text-[#07563D] shadow-sm font-bold'
                    : 'text-gray-500'
                }`}
              >
                2. Map Columns
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  currentStage === 'CONFIRMATION'
                    ? 'bg-white text-[#07563D] shadow-sm font-bold'
                    : 'text-gray-500'
                }`}
              >
                3. Review & Confirm
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
              <span
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all ${
                  currentStage === 'PROCESSING' || currentStage === 'COMPLETED'
                    ? 'bg-white text-[#07563D] shadow-sm font-bold'
                    : 'text-gray-500'
                }`}
              >
                4. Import
              </span>
            </div>

            <button
              onClick={handleResetAndClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ============================================================== */}
          {/* STAGE 1: UPLOAD                                               */}
          {/* ============================================================== */}
          {currentStage === 'UPLOAD' && (
            <div className="max-w-3xl mx-auto py-6 space-y-6">
              {/* Feature highlight */}
              <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex items-start gap-3.5">
                <Sparkles className="w-5 h-5 text-[#07563D] flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-gray-900">
                    Smart Zero-Reference Spreadsheet Ingestion
                  </h4>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                    You can upload spreadsheets exported from any HRMS (Excel <code className="bg-emerald-100 text-[#07563D] px-1 py-0.2 rounded font-mono">.xlsx</code>, <code className="bg-emerald-100 text-[#07563D] px-1 py-0.2 rounded font-mono">.xls</code>, or <code className="bg-emerald-100 text-[#07563D] px-1 py-0.2 rounded font-mono">.csv</code>).
                    Department names, designations, and work locations are accepted directly as entered without requiring foreign key IDs.
                  </p>
                </div>
              </div>

              {/* Drag and drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileSelected(file);
                }}
                className="border-2 border-dashed border-gray-300 hover:border-[#07563D] bg-white hover:bg-emerald-50/20 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group shadow-sm hover:shadow-md"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelected(file);
                  }}
                />

                <div className="w-16 h-16 rounded-2xl bg-emerald-50 group-hover:bg-emerald-100 text-[#07563D] flex items-center justify-center mb-4 transition-colors">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <h3 className="text-base font-bold text-gray-900 mb-1">
                  Choose an Excel or CSV file to upload
                </h3>
                <p className="text-xs text-gray-500 max-w-sm mb-4">
                  Drag and drop your spreadsheet here, or click to browse from your computer.
                </p>

                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-100 group-hover:bg-[#07563D] group-hover:text-white text-xs font-bold text-gray-700 transition-all">
                  <FileSpreadsheet className="w-4 h-4" /> Browse Files
                </div>
              </div>

              {/* Download Clean Template & Export Live Workforce Helpers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-gray-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center shrink-0">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">
                        Onboarding Template & Guides
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Clean headers + Example row + Manager mapping + Pre-defined options
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDownloadTemplate}
                    className="text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 border-gray-300 hover:bg-emerald-50 hover:text-[#07563D]"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Template
                  </Button>
                </div>

                <div className="bg-white border border-gray-200 rounded-2xl p-4 flex items-center justify-between shadow-xs hover:border-gray-300 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">
                        Export Workforce Data
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        {existingEmployees.length} live records for bulk editing
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      try {
                        exportEmployeeMasterData(existingEmployees);
                        showToast(`Exported ${existingEmployees.length} records with full onboarding headers.`, 'success');
                      } catch (err: any) {
                        showToast('Export failed: ' + (err.message || err), 'error');
                      }
                    }}
                    className="text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0 border-gray-300 hover:bg-blue-50 hover:text-blue-700"
                  >
                    <Download className="w-3.5 h-3.5" /> Export ({existingEmployees.length})
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STAGE 2: COLUMN MAPPING                                       */}
          {/* ============================================================== */}
          {currentStage === 'MAPPING' && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      Map Spreadsheet Columns
                    </h3>
                    <p className="text-xs text-gray-500">
                      Match the columns from <span className="font-semibold text-gray-800">{uploadedFile?.name}</span> to Joy PeopleHR employee fields.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-[#07563D] border border-emerald-200">
                      {Object.keys(columnMapping).filter((k) => columnMapping[k]).length} of {CANONICAL_IMPORT_FIELDS.length} Fields Mapped
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] font-bold border-b border-gray-200">
                      <tr>
                        <th className="py-3 px-4">PeopleHR Field</th>
                        <th className="py-3 px-4">Your Spreadsheet Column</th>
                        <th className="py-3 px-4">Sample Value (Row 1)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {CANONICAL_IMPORT_FIELDS.map((field) => {
                        const selectedHeader = columnMapping[field.key] || '';
                        const sampleVal = selectedHeader && rawRows[0] ? rawRows[0][selectedHeader] : '';

                        return (
                          <tr key={field.key} className="hover:bg-gray-50/60 transition-colors">
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-gray-900">{field.label}</span>
                                {field.required ? (
                                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-rose-50 text-rose-600 border border-rose-200">
                                    Required
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                    Optional
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 mt-0.5">{field.description}</p>
                            </td>

                            <td className="py-3 px-4">
                              <select
                                value={selectedHeader}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setColumnMapping((prev) => ({
                                    ...prev,
                                    [field.key]: val,
                                  }));
                                }}
                                className={`w-full text-xs font-semibold rounded-lg p-2 border focus:outline-none focus:ring-2 focus:ring-[#07563D] ${
                                  selectedHeader
                                    ? 'bg-emerald-50/40 border-emerald-300 text-gray-900'
                                    : field.required
                                    ? 'bg-rose-50/30 border-rose-300 text-rose-700'
                                    : 'bg-white border-gray-200 text-gray-700'
                                }`}
                              >
                                <option value="">-- Do Not Map / Skip --</option>
                                {fileHeaders.map((header) => (
                                  <option key={header} value={header}>
                                    {header}
                                  </option>
                                ))}
                              </select>
                            </td>

                            <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                              {sampleVal ? (
                                <span className="px-2 py-1 rounded bg-gray-100 text-gray-800">
                                  {String(sampleVal).slice(0, 35)}
                                </span>
                              ) : (
                                <span className="text-gray-400 italic">No sample data</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="mt-6 flex items-center justify-between pt-4 border-t border-gray-200">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentStage('UPLOAD')}
                    className="text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back to Upload
                  </Button>

                  <Button
                    size="sm"
                    onClick={handleProceedToReview}
                    className="bg-gradient-to-r from-emerald-600 to-[#07563D] hover:from-emerald-700 hover:to-[#05432f] text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                  >
                    Continue to Pre-Addition Review <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STAGE 3: CONFIRMATION & REVIEW (CORE USER REQUIREMENT)        */}
          {/* ============================================================== */}
          {currentStage === 'CONFIRMATION' && (
            <div className="space-y-5">
              {/* Top Pre-Flight KPI Readiness Cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-gray-900">{totalCount}</div>
                    <div className="text-[11px] font-semibold text-gray-500">Total Uploaded</div>
                  </div>
                </div>

                <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-emerald-700">{readyCount}</div>
                    <div className="text-[11px] font-semibold text-gray-500">Ready to Add</div>
                  </div>
                </div>

                <div className="bg-white border border-blue-200 rounded-2xl p-4 shadow-sm flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                    <FileCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xl font-black text-blue-700">{updateCount}</div>
                    <div className="text-[11px] font-semibold text-gray-500">Existing (Will Update)</div>
                  </div>
                </div>

                <div className={`bg-white border rounded-2xl p-4 shadow-sm flex items-center gap-3 ${
                  needsActionCount > 0 ? 'border-rose-300 bg-rose-50/10' : 'border-gray-200'
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                    needsActionCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <div className={`text-xl font-black ${needsActionCount > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                      {needsActionCount}
                    </div>
                    <div className="text-[11px] font-semibold text-gray-500">Needs Action</div>
                  </div>
                </div>
              </div>

              {/* Filter & Search Toolbar */}
              <div className="bg-white border border-gray-200 rounded-2xl p-3.5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full md:w-auto">
                  <div className="flex bg-gray-100 p-1 rounded-xl text-xs font-bold text-gray-600">
                    <button
                      onClick={() => setStatusFilter('ALL')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        statusFilter === 'ALL' ? 'bg-white text-gray-900 shadow-sm' : 'hover:text-gray-900'
                      }`}
                    >
                      All ({totalCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('READY')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        statusFilter === 'READY' ? 'bg-white text-emerald-700 shadow-sm' : 'hover:text-gray-900'
                      }`}
                    >
                      Ready ({readyCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('UPDATE')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        statusFilter === 'UPDATE' ? 'bg-white text-blue-700 shadow-sm' : 'hover:text-gray-900'
                      }`}
                    >
                      Updates ({updateCount})
                    </button>
                    <button
                      onClick={() => setStatusFilter('NEEDS_ACTION')}
                      className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                        statusFilter === 'NEEDS_ACTION' ? 'bg-white text-rose-600 shadow-sm' : 'hover:text-gray-900'
                      }`}
                    >
                      Needs Action ({needsActionCount})
                    </button>
                  </div>

                  {needsActionCount > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleDownloadErrors}
                      className="text-xs text-rose-600 border-rose-200 hover:bg-rose-50 flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> Error Log
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search code, name, email, dept..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#07563D] font-medium"
                    />
                  </div>

                  <span className="text-xs font-bold text-gray-600 whitespace-nowrap">
                    {selectedCount} of {totalCount} selected
                  </span>
                </div>
              </div>

              {/* Interactive Candidate Verification Grid with Multi-View Onboarding Inspector */}
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {/* Onboarding View Selector Bar */}
                <div className="flex flex-wrap items-center justify-between border-b border-gray-200 px-4 py-2.5 bg-gray-50/80 gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-gray-600">
                    <span className="text-[11px] text-gray-400 uppercase tracking-wider font-extrabold mr-1">Onboarding View:</span>
                    <button
                      onClick={() => setViewMode('CORE')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        viewMode === 'CORE'
                          ? 'bg-[#07563D] text-white shadow-2xs font-bold'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      Identity & Job
                    </button>
                    <button
                      onClick={() => setViewMode('STATUTORY')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        viewMode === 'STATUTORY'
                          ? 'bg-[#07563D] text-white shadow-2xs font-bold'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      Statutory & Bank
                    </button>
                    <button
                      onClick={() => setViewMode('COMP_ADDRESS')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        viewMode === 'COMP_ADDRESS'
                          ? 'bg-[#07563D] text-white shadow-2xs font-bold'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      Comp & Address
                    </button>
                    <button
                      onClick={() => setViewMode('ALL')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        viewMode === 'ALL'
                          ? 'bg-[#07563D] text-white shadow-2xs font-bold'
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      All 47 Headers →
                    </button>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDownloadTemplate}
                    className="text-xs text-gray-600 hover:text-[#07563D] flex items-center gap-1.5 font-bold cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Template Spec
                  </Button>
                </div>

                <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse whitespace-nowrap">
                    <thead className="bg-gray-50 text-gray-600 uppercase tracking-wider text-[10px] font-black border-b border-gray-200 sticky top-0 z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={selectedCount === readyCount + updateCount && selectedCount > 0}
                            onChange={(e) => handleToggleSelectAll(e.target.checked)}
                            className="rounded border-gray-300 text-[#07563D] focus:ring-[#07563D] cursor-pointer"
                          />
                        </th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Emp Code</th>

                        {/* View Mode Column Headers */}
                        {viewMode === 'CORE' && (
                          <>
                            <th className="py-2.5 px-3">First Name</th>
                            <th className="py-2.5 px-3">Last Name</th>
                            <th className="py-2.5 px-3">Work Email</th>
                            <th className="py-2.5 px-3">Mobile Phone</th>
                            <th className="py-2.5 px-3">Gender</th>
                            <th className="py-2.5 px-3">DOB</th>
                            <th className="py-2.5 px-3">Department</th>
                            <th className="py-2.5 px-3">Designation</th>
                            <th className="py-2.5 px-3">Work Location</th>
                            <th className="py-2.5 px-3">DOJ</th>
                          </>
                        )}

                        {viewMode === 'STATUTORY' && (
                          <>
                            <th className="py-2.5 px-3">Employee Name</th>
                            <th className="py-2.5 px-3">PAN Number</th>
                            <th className="py-2.5 px-3">UAN Number</th>
                            <th className="py-2.5 px-3">PF Number</th>
                            <th className="py-2.5 px-3">PF Applicable</th>
                            <th className="py-2.5 px-3">ESIC Number</th>
                            <th className="py-2.5 px-3">ESI Applicable</th>
                            <th className="py-2.5 px-3">Aadhaar Number</th>
                            <th className="py-2.5 px-3">Bank Name</th>
                            <th className="py-2.5 px-3">Account Number</th>
                            <th className="py-2.5 px-3">IFSC Code</th>
                            <th className="py-2.5 px-3">Account Type</th>
                          </>
                        )}

                        {viewMode === 'COMP_ADDRESS' && (
                          <>
                            <th className="py-2.5 px-3">Employee Name</th>
                            <th className="py-2.5 px-3">Annual CTC</th>
                            <th className="py-2.5 px-3">Monthly Gross</th>
                            <th className="py-2.5 px-3">Tax Regime</th>
                            <th className="py-2.5 px-3">Current Address</th>
                            <th className="py-2.5 px-3">City</th>
                            <th className="py-2.5 px-3">State</th>
                            <th className="py-2.5 px-3">Emergency Contact</th>
                            <th className="py-2.5 px-3">Emergency Phone</th>
                            <th className="py-2.5 px-3">Relationship</th>
                          </>
                        )}

                        {viewMode === 'ALL' && (
                          <>
                            <th className="py-2.5 px-3">First Name</th>
                            <th className="py-2.5 px-3">Last Name</th>
                            <th className="py-2.5 px-3">Work Email</th>
                            <th className="py-2.5 px-3">Personal Email</th>
                            <th className="py-2.5 px-3">Mobile</th>
                            <th className="py-2.5 px-3">Alternate Phone</th>
                            <th className="py-2.5 px-3">Gender</th>
                            <th className="py-2.5 px-3">DOB</th>
                            <th className="py-2.5 px-3">Marital Status</th>
                            <th className="py-2.5 px-3">Blood Group</th>
                            <th className="py-2.5 px-3">DOJ</th>
                            <th className="py-2.5 px-3">Department</th>
                            <th className="py-2.5 px-3">Designation</th>
                            <th className="py-2.5 px-3">Location</th>
                            <th className="py-2.5 px-3">Work Mode</th>
                            <th className="py-2.5 px-3">Type</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3">Manager Code</th>
                            <th className="py-2.5 px-3">Annual CTC</th>
                            <th className="py-2.5 px-3">Monthly Gross</th>
                            <th className="py-2.5 px-3">Bank Name</th>
                            <th className="py-2.5 px-3">Account Number</th>
                            <th className="py-2.5 px-3">IFSC Code</th>
                            <th className="py-2.5 px-3">PAN Number</th>
                            <th className="py-2.5 px-3">UAN Number</th>
                            <th className="py-2.5 px-3">Aadhaar</th>
                            <th className="py-2.5 px-3">Address</th>
                            <th className="py-2.5 px-3">Emergency Name</th>
                            <th className="py-2.5 px-3">Emergency Phone</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredCandidates.length === 0 ? (
                        <tr>
                          <td colSpan={25} className="py-10 text-center text-gray-400 font-medium">
                            No candidate records found matching the active filters.
                          </td>
                        </tr>
                      ) : (
                        filteredCandidates.map((candidate) => {
                          const hasErrors = candidate.status === 'NEEDS_ACTION';
                          const isUpdate = candidate.status === 'UPDATE';

                          // Helper for cell editing
                          const renderEditableCell = (field: string, val: any, widthClass: string = 'w-28') => {
                            const isEditing = editingCell?.id === candidate.id && editingCell.field === field;
                            const displayVal = val !== undefined && val !== null ? String(val) : '';

                            if (isEditing) {
                              return (
                                <input
                                  autoFocus
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) => setEditingValue(e.target.value)}
                                  onBlur={() => handleSaveCellEdit(candidate.id, field)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleSaveCellEdit(candidate.id, field)}
                                  className={`${widthClass} px-1.5 py-0.5 bg-white border border-[#07563D] rounded text-xs font-semibold`}
                                />
                              );
                            }

                            return (
                              <span
                                className="cursor-pointer hover:underline flex items-center gap-1 group"
                                onClick={() => handleStartCellEdit(candidate.id, field, displayVal)}
                              >
                                {displayVal || <span className="text-gray-300 italic">—</span>}
                                <Edit2 className="w-2.5 h-2.5 text-gray-400 opacity-0 group-hover:opacity-100" />
                              </span>
                            );
                          };

                          return (
                            <tr
                              key={candidate.id}
                              className={`transition-colors ${
                                hasErrors
                                  ? 'bg-rose-50/30 hover:bg-rose-50/50'
                                  : isUpdate
                                  ? 'bg-blue-50/20 hover:bg-blue-50/40'
                                  : 'hover:bg-gray-50/80'
                              }`}
                            >
                              {/* Selection Checkbox */}
                              <td className="py-2 px-3 text-center">
                                <input
                                  type="checkbox"
                                  disabled={hasErrors}
                                  checked={candidate.selected}
                                  onChange={() => handleToggleCandidate(candidate.id)}
                                  className="rounded border-gray-300 text-[#07563D] focus:ring-[#07563D] disabled:opacity-30 cursor-pointer"
                                />
                              </td>

                              {/* Status Badge */}
                              <td className="py-2 px-3 whitespace-nowrap">
                                {candidate.status === 'READY' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-[#07563D] border border-emerald-200">
                                    <CheckCircle2 className="w-3 h-3" /> Ready
                                  </span>
                                )}
                                {candidate.status === 'UPDATE' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                    <FileCheck className="w-3 h-3" /> Update
                                  </span>
                                )}
                                {candidate.status === 'NEEDS_ACTION' && (
                                  <span
                                    title={candidate.issues.map((i) => i.message).join('; ')}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200 cursor-help"
                                  >
                                    <AlertTriangle className="w-3 h-3" /> Needs Action
                                  </span>
                                )}
                              </td>

                              {/* Employee Code */}
                              <td className="py-2 px-3 font-mono font-bold text-gray-800">
                                {renderEditableCell('employee_code', candidate.employee_code, 'w-24')}
                              </td>

                              {/* View Mode: CORE */}
                              {viewMode === 'CORE' && (
                                <>
                                  <td className="py-2 px-3 font-semibold text-gray-900">{renderEditableCell('first_name', candidate.first_name, 'w-28')}</td>
                                  <td className="py-2 px-3 text-gray-700">{renderEditableCell('last_name', candidate.last_name, 'w-24')}</td>
                                  <td className="py-2 px-3 text-gray-700">{renderEditableCell('work_email', candidate.work_email, 'w-44')}</td>
                                  <td className="py-2 px-3 font-mono text-gray-700">{renderEditableCell('phone', candidate.phone, 'w-28')}</td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.gender}</td>
                                  <td className="py-2 px-3 font-mono text-gray-600">{candidate.dob}</td>
                                  <td className="py-2 px-3 font-medium text-gray-800">{renderEditableCell('department_name', candidate.department_name, 'w-32')}</td>
                                  <td className="py-2 px-3 font-medium text-gray-800">{renderEditableCell('designation_title', candidate.designation_title, 'w-32')}</td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.branch_name}</td>
                                  <td className="py-2 px-3 font-mono text-gray-600">{candidate.doj}</td>
                                </>
                              )}

                              {/* View Mode: STATUTORY & BANK */}
                              {viewMode === 'STATUTORY' && (
                                <>
                                  <td className="py-2 px-3 font-semibold text-gray-900">{candidate.display_name}</td>
                                  <td className="py-2 px-3 font-mono text-gray-800">{renderEditableCell('pan', candidate.pan, 'w-28')}</td>
                                  <td className="py-2 px-3 font-mono text-gray-800">{renderEditableCell('uan', candidate.uan, 'w-32')}</td>
                                  <td className="py-2 px-3 font-mono text-gray-600">{renderEditableCell('pf_number', candidate.pf_number, 'w-36')}</td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.pf_applicable ? 'Yes' : 'No'}</td>
                                  <td className="py-2 px-3 font-mono text-gray-600">{renderEditableCell('esi', candidate.esi, 'w-32')}</td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.esi_applicable ? 'Yes' : 'No'}</td>
                                  <td className="py-2 px-3 font-mono text-gray-600">{renderEditableCell('aadhaar_number', candidate.aadhaar_number, 'w-32')}</td>
                                  <td className="py-2 px-3 text-gray-800 font-medium">{renderEditableCell('bank_name', candidate.bank_name, 'w-28')}</td>
                                  <td className="py-2 px-3 font-mono text-gray-800">{renderEditableCell('account_number', candidate.account_number, 'w-32')}</td>
                                  <td className="py-2 px-3 font-mono text-gray-800">{renderEditableCell('ifsc', candidate.ifsc, 'w-28')}</td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.account_type || 'SALARY'}</td>
                                </>
                              )}

                              {/* View Mode: COMPENSATION & ADDRESS */}
                              {viewMode === 'COMP_ADDRESS' && (
                                <>
                                  <td className="py-2 px-3 font-semibold text-gray-900">{candidate.display_name}</td>
                                  <td className="py-2 px-3 font-mono font-bold text-emerald-800 text-right">
                                    {candidate.annual_ctc ? `₹${candidate.annual_ctc.toLocaleString('en-IN')}` : '—'}
                                  </td>
                                  <td className="py-2 px-3 font-mono text-gray-800 text-right">
                                    {candidate.monthly_gross ? `₹${candidate.monthly_gross.toLocaleString('en-IN')}` : '—'}
                                  </td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.tax_regime || 'New Regime'}</td>
                                  <td className="py-2 px-3 text-gray-600 max-w-xs truncate">{renderEditableCell('current_address', candidate.current_address, 'w-48')}</td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.city || 'Coimbatore'}</td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.state || 'Tamil Nadu'}</td>
                                  <td className="py-2 px-3 text-gray-800">{renderEditableCell('emergency_name', candidate.emergency_name, 'w-28')}</td>
                                  <td className="py-2 px-3 font-mono text-gray-700">{renderEditableCell('emergency_phone', candidate.emergency_phone, 'w-28')}</td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.emergency_relation || 'Family'}</td>
                                </>
                              )}

                              {/* View Mode: ALL 47 HEADERS */}
                              {viewMode === 'ALL' && (
                                <>
                                  <td className="py-2 px-3 font-semibold text-gray-900">{renderEditableCell('first_name', candidate.first_name, 'w-24')}</td>
                                  <td className="py-2 px-3 text-gray-700">{renderEditableCell('last_name', candidate.last_name, 'w-24')}</td>
                                  <td className="py-2 px-3 text-gray-700">{renderEditableCell('work_email', candidate.work_email, 'w-40')}</td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.personal_email || '—'}</td>
                                  <td className="py-2 px-3 font-mono text-gray-700">{renderEditableCell('phone', candidate.phone, 'w-28')}</td>
                                  <td className="py-2 px-3 font-mono text-gray-600">{candidate.alternate_phone || '—'}</td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.gender}</td>
                                  <td className="py-2 px-3 font-mono text-gray-600">{candidate.dob}</td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.marital_status || 'Single'}</td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.blood_group || '—'}</td>
                                  <td className="py-2 px-3 font-mono text-gray-600">{candidate.doj}</td>
                                  <td className="py-2 px-3 text-gray-800">{candidate.department_name}</td>
                                  <td className="py-2 px-3 text-gray-800">{candidate.designation_title}</td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.branch_name}</td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.work_mode || 'Hybrid'}</td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.employment_type}</td>
                                  <td className="py-2 px-3 text-gray-600">{candidate.employment_status}</td>
                                  <td className="py-2 px-3 font-mono text-gray-600">{candidate.reporting_manager_code || '—'}</td>
                                  <td className="py-2 px-3 font-mono font-bold text-gray-800">{candidate.annual_ctc ? `₹${candidate.annual_ctc}` : '—'}</td>
                                  <td className="py-2 px-3 font-mono text-gray-800">{candidate.monthly_gross ? `₹${candidate.monthly_gross}` : '—'}</td>
                                  <td className="py-2 px-3 text-gray-700">{candidate.bank_name || '—'}</td>
                                  <td className="py-2 px-3 font-mono text-gray-700">{candidate.account_number || '—'}</td>
                                  <td className="py-2 px-3 font-mono text-gray-700">{candidate.ifsc || '—'}</td>
                                  <td className="py-2 px-3 font-mono text-gray-700">{candidate.pan || '—'}</td>
                                  <td className="py-2 px-3 font-mono text-gray-700">{candidate.uan || '—'}</td>
                                  <td className="py-2 px-3 font-mono text-gray-700">{candidate.aadhaar_number || '—'}</td>
                                  <td className="py-2 px-3 text-gray-600 max-w-xs truncate">{candidate.current_address || '—'}</td>
                                  <td className="py-2 px-3 text-gray-700">{candidate.emergency_name || '—'}</td>
                                  <td className="py-2 px-3 font-mono text-gray-700">{candidate.emergency_phone || '—'}</td>
                                </>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Inline Editing Tip */}
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex items-center justify-between text-[11px] text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <Edit2 className="w-3 h-3 text-gray-400" />
                    <strong>Inline Edit:</strong> Click on any cell with an issue to edit details directly. Press Enter or click outside to re-validate.
                  </span>
                  <span>Showing {filteredCandidates.length} of {totalCount} records</span>
                </div>
              </div>

              {/* Explicit Pre-Addition Confirmation Card (MANDATORY REQUIREMENT) */}
              <div className="bg-emerald-50/80 border-2 border-emerald-300 rounded-2xl p-4 shadow-sm flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-[#07563D] text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-gray-900 tracking-tight">
                    Pre-Addition Verification & Confirmation Checklist
                  </h4>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    Before committing these candidate records to Employee Management, please review all identification codes, official emails, mobile numbers, and organizational assignments.
                  </p>

                  <label className="flex items-start gap-2.5 mt-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={isConfirmedByHR}
                      onChange={(e) => setIsConfirmedByHR(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#07563D] focus:ring-[#07563D] cursor-pointer"
                    />
                    <span className="text-xs font-bold text-gray-900 group-hover:text-[#07563D] transition-colors leading-tight">
                      I confirm that all employee records are verified, checked, and approved to be added to Employee Management.
                    </span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentStage('MAPPING')}
                  className="text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Column Mapping
                </Button>

                <div className="flex items-center gap-3">
                  <Button
                    size="md"
                    disabled={!isConfirmedByHR || selectedCount === 0}
                    onClick={handleConfirmAndAddEmployees}
                    className={`text-xs font-bold flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer ${
                      isConfirmedByHR && selectedCount > 0
                        ? 'bg-gradient-to-r from-emerald-600 to-[#07563D] hover:from-emerald-700 hover:to-[#05432f] text-white hover:shadow-lg'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                    }`}
                  >
                    <Check className="w-4 h-4" />
                    Confirm & Add {selectedCount} Employees to System
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STAGE 4: PROCESSING (SAFE BATCHES OF 25)                     */}
          {/* ============================================================== */}
          {currentStage === 'PROCESSING' && (
            <div className="max-w-xl mx-auto py-16 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#07563D] mx-auto flex items-center justify-center animate-pulse">
                <Users className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-base font-black text-gray-900">
                  Adding Employees to System...
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Processing verified records in isolated batches of 25 to ensure database integrity.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-[#07563D] h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${jobProgress?.percent || 5}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs font-semibold text-gray-600 px-1">
                  <span>Processed: {jobProgress?.processed || 0} / {jobProgress?.total || selectedCount}</span>
                  <span>{jobProgress?.percent || 0}% Complete</span>
                </div>
              </div>

              <div className="flex items-center justify-center gap-6 text-xs font-bold text-gray-700 pt-2">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="w-4 h-4" /> {jobProgress?.successful || 0} Successful
                </span>
                <span className="flex items-center gap-1.5 text-rose-600">
                  <XCircle className="w-4 h-4" /> {jobProgress?.failed || 0} Failed
                </span>
              </div>
            </div>
          )}

          {/* ============================================================== */}
          {/* STAGE 5: COMPLETED SUMMARY                                    */}
          {/* ============================================================== */}
          {currentStage === 'COMPLETED' && importResult && (
            <div className="max-w-2xl mx-auto py-10 space-y-6 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-[#07563D] mx-auto flex items-center justify-center shadow-sm">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h3 className="text-lg font-black text-gray-900">
                  Bulk Import Completed Successfully!
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  All confirmed candidate employee records have been added to Employee Management.
                </p>
              </div>

              {/* Metrics cards */}
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className="text-2xl font-black text-gray-900">{importResult.totalRows}</div>
                  <div className="text-[11px] font-semibold text-gray-500">Total Confirmed</div>
                </div>
                <div className="bg-white border border-emerald-200 rounded-2xl p-4 shadow-sm">
                  <div className="text-2xl font-black text-emerald-700">{importResult.successfulRows}</div>
                  <div className="text-[11px] font-semibold text-gray-500">Added to System</div>
                </div>
                <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                  <div className={`text-2xl font-black ${importResult.failedRows > 0 ? 'text-rose-600' : 'text-gray-900'}`}>
                    {importResult.failedRows}
                  </div>
                  <div className="text-[11px] font-semibold text-gray-500">Failed Records</div>
                </div>
              </div>

              {/* Navigation CTAs */}
              <div className="pt-4 flex items-center justify-center gap-3">
                <Button
                  size="md"
                  onClick={handleResetAndClose}
                  className="bg-gradient-to-r from-emerald-600 to-[#07563D] hover:from-emerald-700 hover:to-[#05432f] text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md cursor-pointer flex items-center gap-2"
                >
                  <Users className="w-4 h-4" /> Go to Employee Management
                </Button>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setCurrentStage('UPLOAD');
                    setUploadedFile(null);
                    setRawRows([]);
                    setCandidates([]);
                  }}
                  className="text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer"
                >
                  Import Another File
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
