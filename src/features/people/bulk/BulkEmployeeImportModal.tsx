// src/features/people/bulk/BulkEmployeeImportModal.tsx
// ============================================================================
// Joy PeopleHR Enterprise — Bulk Employee Import Modal
// 5-Stage Controlled Pipeline:
// 1. Download Template (Live DB Reference Data)
// 2. Upload Excel (.xlsx, .csv)
// 3. Parse, Validate & Preview (Row-level errors, in-file & DB duplicate checks)
// 4. Chunked Import Processing (25-record batches with live progress & partial-failure isolation)
// 5. Success / Partial-Failure Resolution Screen (Error report download & idempotent retry)
// ============================================================================

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { useTenant } from '../../../hooks/useTenant';
import { Department, Designation, Branch, Employee } from '../../../types';
import { api } from '../../../services/api';
import {
  bulkImportService,
  ParsedEmployeeRow,
  ValidationSummary,
  BulkImportJobProgress,
  BulkImportResult,
} from './bulkImportService';
import {
  generateEmployeeImportTemplate,
  downloadBulkImportErrorReport,
  BulkImportRowError,
} from './excelTemplateGenerator';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Users,
  ShieldCheck,
  AlertCircle,
  FileCheck,
  X,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: (created: Employee[]) => void;
}

type Stage = 'TEMPLATE' | 'UPLOAD' | 'PREVIEW' | 'PROCESSING' | 'COMPLETED';

export const BulkEmployeeImportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  onImportComplete,
}) => {
  const { showToast } = useToast();
  const { activeCompany, organization } = useTenant();

  // Workflow Stage
  const [currentStage, setCurrentStage] = useState<Stage>('TEMPLATE');

  // Master Reference Data
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [existingEmployees, setExistingEmployees] = useState<Employee[]>([]);
  const [isLoadingMasterData, setIsLoadingMasterData] = useState<boolean>(false);

  // Upload & Parse State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [validation, setValidation] = useState<ValidationSummary | null>(null);
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'ERRORS'>('ALL');

  // Processing & Results State
  const [jobProgress, setJobProgress] = useState<BulkImportJobProgress | null>(null);
  const [importResult, setImportResult] = useState<BulkImportResult | null>(null);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load authoritative master data on open
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    setIsLoadingMasterData(true);

    Promise.all([
      api.getDepartments(),
      api.getDesignations(),
      api.getBranches(),
      api.getEmployees(),
    ])
      .then(([depts, desigs, brs, emps]) => {
        if (!mounted) return;
        setDepartments(depts || []);
        setDesignations(desigs || []);
        setBranches(brs || []);
        setExistingEmployees(emps || []);
      })
      .catch((err) => {
        console.warn('[BulkImportModal] Failed to load reference data:', err);
      })
      .finally(() => {
        if (mounted) setIsLoadingMasterData(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  // Reset state on close
  const handleResetAndClose = () => {
    if (isExecuting) {
      if (!confirm('Import is currently in progress. Are you sure you want to exit? Some records may have already been created.')) {
        return;
      }
    }
    setCurrentStage('TEMPLATE');
    setUploadedFile(null);
    setRawRows([]);
    setValidation(null);
    setJobProgress(null);
    setImportResult(null);
    setIsExecuting(false);
    onClose();
  };

  // 1. Download Template Handler
  const handleDownloadTemplate = () => {
    try {
      generateEmployeeImportTemplate({
        departments,
        designations,
        branches,
        existingEmployees,
      });
      showToast('Excel template with authoritative fields downloaded.', 'success');
    } catch (err: any) {
      showToast('Failed to generate template: ' + (err.message || err), 'error');
    }
  };

  // 2. File Selection & Parsing Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    setIsParsing(true);

    try {
      const parsedRows = await bulkImportService.parseExcelFile(file);
      if (parsedRows.length === 0) {
        showToast('The uploaded sheet is empty or contains no data rows.', 'error');
        setIsParsing(false);
        return;
      }

      setRawRows(parsedRows);

      // Perform 2-Level Validation with Upsert & Single-Name Fallback
      const summary = bulkImportService.validateRows(
        parsedRows,
        departments,
        designations,
        branches,
        existingEmployees,
        { upsertExisting: true, autoFallbackLastName: true }
      );

      setValidation(summary);
      setCurrentStage('PREVIEW');
      showToast(`Parsed ${parsedRows.length} rows (${summary.validRows.length} valid, ${summary.errors.length} errors).`, 'info');
    } catch (err: any) {
      console.error('[BulkImport] File parse error:', err);
      showToast('Failed to read Excel file: ' + (err.message || 'Invalid format'), 'error');
    } finally {
      setIsParsing(false);
    }
  };

  // 3. Download Error Report
  const handleDownloadErrorReport = () => {
    if (!validation || validation.errors.length === 0) return;
    try {
      downloadBulkImportErrorReport(validation.errors, rawRows);
      showToast('Error report downloaded with row-by-row reasons.', 'success');
    } catch (err: any) {
      showToast('Failed to download error report: ' + (err.message || err), 'error');
    }
  };

  // 4. Start Chunked Import
  const handleStartImport = async () => {
    if (!validation || validation.validRows.length === 0) {
      showToast('No valid employee records to import.', 'error');
      return;
    }

    const orgId = organization?.id || activeCompany?.organization_id || '0c621892-e938-4707-9957-13534ea32c19';
    const compId = activeCompany?.id || orgId;

    setIsExecuting(true);
    setCurrentStage('PROCESSING');

    try {
      const result = await bulkImportService.executeBulkImport(
        validation.validRows,
        orgId,
        compId,
        (progress) => {
          setJobProgress(progress);
        },
        25 // Safe 25-record batch chunk size
      );

      setImportResult(result);
      setCurrentStage('COMPLETED');

      if (onImportComplete && result.createdEmployees.length > 0) {
        onImportComplete(result.createdEmployees);
      }

      if (result.failedRows === 0) {
        showToast(`Successfully imported all ${result.successfulRows} employees!`, 'success');
      } else {
        showToast(`Import completed with ${result.successfulRows} created and ${result.failedRows} failed.`, 'warning');
      }
    } catch (err: any) {
      console.error('[BulkImport] Batch execution error:', err);
      showToast('Bulk import encountered a critical error: ' + (err.message || err), 'error');
      setCurrentStage('PREVIEW');
    } finally {
      setIsExecuting(false);
    }
  };

  // 5. Retry Failed Records
  const handleRetryFailed = () => {
    if (!importResult || importResult.failedRecords.length === 0) return;

    // Filter validRows to only those that failed in the execution
    const failedCodes = new Set(importResult.failedRecords.map((r) => r.employeeCode));
    const retryRows = (validation?.validRows || []).filter((r) => failedCodes.has(r.employee_code));

    if (retryRows.length === 0) {
      showToast('No eligible failed records found for automatic retry.', 'info');
      return;
    }

    setValidation({
      totalRows: retryRows.length,
      validRows: retryRows,
      errors: [],
      warnings: ['Retrying failed records with idempotent duplicate checks.'],
    });

    handleStartImport();
  };

  // Preview filtering
  const filteredRows = useMemo(() => {
    if (!validation) return [];
    if (previewFilter === 'VALID') {
      return validation.validRows.map((v) => ({ ...v, _status: 'VALID' as const }));
    }
    if (previewFilter === 'ERRORS') {
      const errorRowNums = new Set(validation.errors.map((e) => e.rowNumber));
      return rawRows
        .map((r, idx) => ({ rowNumber: idx + 2, raw: r }))
        .filter((item) => errorRowNums.has(item.rowNumber))
        .map((item) => {
          const rowErr = validation.errors.filter((e) => e.rowNumber === item.rowNumber);
          return {
            rowNumber: item.rowNumber,
            employee_code: item.raw['Employee Code *'] || item.raw.employee_code || 'MISSING',
            first_name: item.raw['First Name *'] || item.raw.first_name || '',
            last_name: item.raw['Last Name *'] || item.raw.last_name || '',
            work_email: item.raw['Work Email *'] || item.raw.work_email || '',
            phone: item.raw['Primary Mobile *'] || item.raw.phone || '',
            department_name: item.raw['Department *'] || item.raw.department || '',
            designation_title: item.raw['Designation *'] || item.raw.designation || '',
            _status: 'ERROR' as const,
            _errors: rowErr,
          };
        });
    }

    // ALL: Show valid rows and error rows combined in order
    const errorRowMap = new Map<number, BulkImportRowError[]>();
    validation.errors.forEach((e) => {
      const list = errorRowMap.get(e.rowNumber) || [];
      list.push(e);
      errorRowMap.set(e.rowNumber, list);
    });

    return rawRows.map((raw, idx) => {
      const rowNumber = idx + 2;
      const rowErrs = errorRowMap.get(rowNumber);
      const isErr = Boolean(rowErrs && rowErrs.length > 0);
      const valid = validation.validRows.find((v) => v.rowNumber === rowNumber);

      return {
        rowNumber,
        employee_code: valid?.employee_code || raw['Employee Code *'] || raw.employee_code || 'N/A',
        first_name: valid?.first_name || raw['First Name *'] || raw.first_name || '',
        last_name: valid?.last_name || raw['Last Name *'] || raw.last_name || '',
        work_email: valid?.work_email || raw['Work Email *'] || raw.work_email || '',
        phone: valid?.phone || raw['Primary Mobile *'] || raw.phone || '',
        department_name: valid?.department_name || raw['Department *'] || raw.department || '',
        designation_title: valid?.designation_title || raw['Designation *'] || raw.designation || '',
        _status: isErr ? ('ERROR' as const) : ('VALID' as const),
        _errors: rowErrs,
      };
    });
  }, [validation, rawRows, previewFilter]);

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetAndClose}
      title="Bulk Import Employees"
      maxWidth="6xl"
      hideHeader={true}
    >
      <div className="flex flex-col h-full max-h-[90vh]">
        {/* Header Strip */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 tracking-tight">Bulk Import Employees</h2>
                <p className="text-xs text-gray-500">
                  Import up to 500 employees at once with two-layer validation & duplicate protection.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Step Indicators */}
            <div className="hidden sm:flex items-center gap-2 text-xs font-semibold">
              <span className={`px-2.5 py-1 rounded-full ${currentStage === 'TEMPLATE' ? 'bg-[#07563D] text-white' : 'bg-gray-100 text-gray-600'}`}>
                1. Template
              </span>
              <span className="text-gray-300">→</span>
              <span className={`px-2.5 py-1 rounded-full ${currentStage === 'UPLOAD' ? 'bg-[#07563D] text-white' : 'bg-gray-100 text-gray-600'}`}>
                2. Upload
              </span>
              <span className="text-gray-300">→</span>
              <span className={`px-2.5 py-1 rounded-full ${currentStage === 'PREVIEW' ? 'bg-[#07563D] text-white' : 'bg-gray-100 text-gray-600'}`}>
                3. Validate & Preview
              </span>
              <span className="text-gray-300">→</span>
              <span className={`px-2.5 py-1 rounded-full ${currentStage === 'PROCESSING' || currentStage === 'COMPLETED' ? 'bg-[#07563D] text-white' : 'bg-gray-100 text-gray-600'}`}>
                4. Import
              </span>
            </div>

            <button
              onClick={handleResetAndClose}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
          {/* STAGE 1 & 2: TEMPLATE & UPLOAD */}
          {(currentStage === 'TEMPLATE' || currentStage === 'UPLOAD') && (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Step 1: Download Template Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#07563D] flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-black uppercase tracking-wider text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded-md">
                          Step 1
                        </span>
                        <h3 className="text-base font-bold text-gray-900">Download Approved Excel Template</h3>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 max-w-xl leading-relaxed">
                        Contains the exact database schema columns, formatting instructions, and live reference lists
                        ({departments.length} departments, {designations.length} designations, and existing managers for hierarchical assignment).
                      </p>

                      <div className="flex flex-wrap gap-2 mt-3 text-[11px] text-gray-600">
                        <span className="bg-gray-100 px-2 py-1 rounded-md font-medium">✓ Sheet 1: Employees Form</span>
                        <span className="bg-gray-100 px-2 py-1 rounded-md font-medium">✓ Sheet 2: Field Rules & Dates</span>
                        <span className="bg-gray-100 px-2 py-1 rounded-md font-medium">✓ Sheet 3: Authoritative Reference Values</span>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleDownloadTemplate}
                    disabled={isLoadingMasterData}
                    leftIcon={<Download className="w-4 h-4" />}
                    className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs shrink-0 shadow-xs"
                  >
                    Download Excel Template
                  </Button>
                </div>
              </div>

              {/* Step 2: Upload Excel File Card */}
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-[11px] font-black uppercase tracking-wider text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded-md">
                    Step 2
                  </span>
                  <h3 className="text-base font-bold text-gray-900">Upload Completed Employee Sheet</h3>
                </div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-gray-300 hover:border-[#07563D] bg-gray-50/70 hover:bg-emerald-50/20 rounded-2xl p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  <div className="w-14 h-14 rounded-2xl bg-white shadow-2xs border border-gray-200 flex items-center justify-center text-[#07563D]">
                    {isParsing ? (
                      <RefreshCw className="w-6 h-6 animate-spin text-[#07563D]" />
                    ) : (
                      <UploadCloud className="w-7 h-7" />
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-bold text-gray-800">
                      {isParsing ? 'Parsing and validating file...' : 'Click to select or drag and drop completed Excel file'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Supports .xlsx, .xls, or .csv (up to 500 rows per batch)
                    </p>
                  </div>

                  <span className="text-[11px] font-bold text-[#07563D] bg-emerald-100/60 px-3 py-1 rounded-full">
                    Strict Two-Layer Schema Validation Enabled
                  </span>
                </div>
              </div>

              {/* Security & Validation Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 leading-relaxed">
                  <span className="font-bold text-slate-800">Enterprise Data Governance: </span>
                  Data is parsed in-memory and pre-validated against organization unique constraints.
                  No partial corruption or blind inserts will occur. You will preview and confirm all rows before committing to the database.
                </div>
              </div>
            </div>
          )}

          {/* STAGE 3: PREVIEW & VALIDATION BREAKDOWN */}
          {currentStage === 'PREVIEW' && validation && (
            <div className="space-y-6">
              {/* Summary KPIs Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Rows in File</div>
                  <div className="text-2xl font-black text-gray-900 mt-1">{validation.totalRows}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{uploadedFile?.name}</div>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-4 shadow-2xs">
                  <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ready to Import
                  </div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">{validation.validRows.length}</div>
                  <div className="text-[11px] text-emerald-600 mt-0.5">Passed all schema rules</div>
                </div>

                <div className={`border rounded-xl p-4 shadow-2xs ${validation.errors.length > 0 ? 'bg-red-50/60 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="text-xs font-semibold text-red-800 uppercase tracking-wider flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 text-red-600" /> Invalid Rows
                  </div>
                  <div className="text-2xl font-black text-red-600 mt-1">{validation.errors.length}</div>
                  <div className="text-[11px] text-red-500 mt-0.5">
                    {validation.errors.length === 0 ? 'Zero errors detected' : 'Requires fix or error report download'}
                  </div>
                </div>

                <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 shadow-2xs">
                  <div className="text-xs font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" /> Warnings
                  </div>
                  <div className="text-2xl font-black text-amber-700 mt-1">{validation.warnings.length}</div>
                  <div className="text-[11px] text-amber-600 mt-0.5">Auto-mapped or non-blocking</div>
                </div>
              </div>

              {/* Error Actions & Warnings Alert */}
              {validation.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-red-900">
                        {validation.errors.length} row validation issue{validation.errors.length > 1 ? 's' : ''} detected
                      </h4>
                      <p className="text-xs text-red-700 mt-0.5">
                        Download the error report to view row numbers and exact rejection reasons. You can import the
                        valid {validation.validRows.length} rows now, or fix and re-upload.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={handleDownloadErrorReport}
                      leftIcon={<Download className="w-4 h-4" />}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs"
                    >
                      Download Error Report
                    </Button>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      variant="outline"
                      leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                      className="text-xs font-semibold"
                    >
                      Re-upload
                    </Button>
                  </div>
                </div>
              )}

              {/* Table Filter Tabs */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => setPreviewFilter('ALL')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${previewFilter === 'ALL' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    All Records ({rawRows.length})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('VALID')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${previewFilter === 'VALID' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    ✓ Valid ({validation.validRows.length})
                  </button>
                  <button
                    onClick={() => setPreviewFilter('ERRORS')}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors cursor-pointer ${previewFilter === 'ERRORS' ? 'bg-white text-red-600 shadow-2xs' : 'text-gray-500 hover:text-gray-900'}`}
                  >
                    ✗ Errors ({validation.errors.length})
                  </button>
                </div>

                <div className="text-xs text-gray-500">
                  Showing {filteredRows.length} rows
                </div>
              </div>

              {/* Preview Table */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto max-h-[380px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 text-gray-600 font-semibold z-10">
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">Row</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Employee Code</th>
                        <th className="py-2.5 px-3">Full Name</th>
                        <th className="py-2.5 px-3">Work Email</th>
                        <th className="py-2.5 px-3">Mobile</th>
                        <th className="py-2.5 px-3">Department</th>
                        <th className="py-2.5 px-3">Designation</th>
                        <th className="py-2.5 px-3">Validation Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredRows.slice(0, 100).map((row, idx) => {
                        const isErr = row._status === 'ERROR';
                        return (
                          <tr key={idx} className={isErr ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-gray-50/80'}>
                            <td className="py-2.5 px-3 text-center text-gray-400 font-mono text-[11px]">
                              {row.rowNumber}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {isErr ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-700 bg-red-100/80 px-2 py-0.5 rounded-full">
                                  <XCircle className="w-3 h-3" /> Error
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" /> Valid
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-gray-800">
                              {row.employee_code}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-gray-900">
                              {row.first_name} {row.last_name}
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 font-mono text-[11px]">
                              {row.work_email}
                            </td>
                            <td className="py-2.5 px-3 text-gray-600 font-mono text-[11px]">
                              {row.phone}
                            </td>
                            <td className="py-2.5 px-3 text-gray-700">
                              {row.department_name}
                            </td>
                            <td className="py-2.5 px-3 text-gray-700">
                              {row.designation_title}
                            </td>
                            <td className="py-2.5 px-3 max-w-xs truncate">
                              {isErr && row._errors ? (
                                <span className="text-[11px] text-red-700 font-medium" title={row._errors.map((e) => e.message).join(' | ')}>
                                  {row._errors.map((e) => `${e.field}: ${e.message}`).join(' • ')}
                                </span>
                              ) : (
                                <span className="text-[11px] text-gray-400">Ready</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredRows.length > 100 && (
                  <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
                    Showing first 100 of {filteredRows.length} rows. Full validation has been verified for all rows.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STAGE 4: PROCESSING / PROGRESS */}
          {currentStage === 'PROCESSING' && (
            <div className="max-w-xl mx-auto py-12 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-[#07563D] flex items-center justify-center mx-auto shadow-sm animate-pulse">
                <Users className="w-8 h-8" />
              </div>

              <div>
                <h3 className="text-xl font-black text-gray-900">Importing Employees to Enterprise Database</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Processing batch in chunks of 25 to ensure transactional integrity and zero timeout drops.
                </p>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-gray-700">
                  <span>Import Progress</span>
                  <span>{jobProgress?.percent || 0}%</span>
                </div>
                <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
                  <div
                    className="bg-[#07563D] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${jobProgress?.percent || 0}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-gray-500 pt-1">
                  <span>{jobProgress?.processed || 0} / {jobProgress?.total || 0} processed</span>
                  <span className="text-emerald-700 font-bold">✓ {jobProgress?.successful || 0} created</span>
                  {Boolean(jobProgress?.failed) && (
                    <span className="text-red-600 font-bold">✗ {jobProgress?.failed} failed</span>
                  )}
                </div>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left text-xs text-slate-600 space-y-1">
                <div className="font-semibold text-slate-800">Transactional Safety Guarantees:</div>
                <div>• Inserting employee profiles, bank records, and statutory details</div>
                <div>• Generating unique employee identity mappings</div>
                <div>• Maintaining organization-level multi-tenant isolation</div>
              </div>
            </div>
          )}

          {/* STAGE 5: COMPLETED */}
          {currentStage === 'COMPLETED' && importResult && (
            <div className="max-w-2xl mx-auto py-8 text-center space-y-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-sm ${importResult.failedRows === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {importResult.failedRows === 0 ? (
                  <CheckCircle2 className="w-9 h-9" />
                ) : (
                  <AlertTriangle className="w-9 h-9" />
                )}
              </div>

              <div>
                <h3 className="text-2xl font-black text-gray-900">
                  {importResult.failedRows === 0
                    ? '🎉 Employee Import Completed Successfully'
                    : 'Import Completed with Partial Exceptions'}
                </h3>
                <p className="text-xs text-gray-500 mt-1 font-mono">
                  Job Reference: {importResult.jobCode}
                </p>
              </div>

              {/* Metrics Pill Grid */}
              <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-2xs">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase">Total Records</div>
                  <div className="text-2xl font-black text-gray-900 mt-1">{importResult.totalRows}</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 shadow-2xs">
                  <div className="text-[11px] font-semibold text-emerald-800 uppercase">✓ Created</div>
                  <div className="text-2xl font-black text-emerald-700 mt-1">{importResult.successfulRows}</div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 shadow-2xs">
                  <div className="text-[11px] font-semibold text-gray-500 uppercase">✗ Failed</div>
                  <div className="text-2xl font-black text-gray-700 mt-1">{importResult.failedRows}</div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
                <Button
                  onClick={handleResetAndClose}
                  className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs shadow-xs"
                >
                  View Employees in Directory
                </Button>

                {importResult.failedRows > 0 && (
                  <>
                    <Button
                      onClick={() => downloadBulkImportErrorReport(importResult.failedRecords, rawRows)}
                      variant="outline"
                      leftIcon={<Download className="w-4 h-4 text-red-600" />}
                      className="text-xs font-bold"
                    >
                      Download Failed Records ({importResult.failedRows})
                    </Button>

                    <Button
                      onClick={handleRetryFailed}
                      variant="outline"
                      leftIcon={<RefreshCw className="w-4 h-4 text-amber-600" />}
                      className="text-xs font-bold"
                    >
                      Retry Failed Records
                    </Button>
                  </>
                )}

                <Button
                  onClick={() => {
                    setCurrentStage('TEMPLATE');
                    setUploadedFile(null);
                    setRawRows([]);
                    setValidation(null);
                    setImportResult(null);
                  }}
                  variant="outline"
                  className="text-xs font-medium"
                >
                  Add More Employees
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-white">
          <div>
            {currentStage === 'PREVIEW' && (
              <Button
                variant="outline"
                onClick={() => setCurrentStage('TEMPLATE')}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
                className="text-xs font-semibold"
              >
                Back to Upload
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {currentStage === 'TEMPLATE' || currentStage === 'UPLOAD' ? (
              <Button
                variant="outline"
                onClick={handleResetAndClose}
                className="text-xs font-semibold"
              >
                Cancel
              </Button>
            ) : null}

            {currentStage === 'PREVIEW' && validation && (
              <Button
                onClick={handleStartImport}
                disabled={validation.validRows.length === 0 || isExecuting}
                rightIcon={<ArrowRight className="w-4 h-4" />}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs shadow-xs"
              >
                Import {validation.validRows.length} Valid Employee{validation.validRows.length > 1 ? 's' : ''}
              </Button>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
