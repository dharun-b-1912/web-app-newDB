// src/features/assets/components/AssetExportModal.tsx
// ============================================================================
// Joy PeopleHR — Asset Report Export Modal
// Configures and Triggers Day-Wise & Monthly Excel (.xlsx) Downloads
// ============================================================================

import React, { useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Button } from '../../../components/ui/Button';
import { useToast } from '../../../components/ui/Toast';
import { assetReportService } from '../../../services/asset/assetReportService';
import { AssetAssignment, UniversalAsset, Employee } from '../../../types';
import { FileSpreadsheet, Calendar, Download, CheckCircle2 } from 'lucide-react';

interface AssetExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  assignments: AssetAssignment[];
  assets: UniversalAsset[];
  employees: Employee[];
}

export const AssetExportModal: React.FC<AssetExportModalProps> = ({
  isOpen,
  onClose,
  assignments,
  assets,
  employees,
}) => {
  const { showToast } = useToast();

  const [reportType, setReportType] = useState<'DAY_WISE' | 'MONTHLY'>('DAY_WISE');
  const [startDate, setStartDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await assetReportService.exportExcelReport(assignments, assets, employees, {
        reportType,
        startDate: reportType === 'DAY_WISE' ? startDate : undefined,
        endDate: reportType === 'DAY_WISE' ? endDate : undefined,
        year: selectedYear,
      });

      showToast('Asset Excel report downloaded successfully!', 'success');
      onClose();
    } catch (err: any) {
      showToast(err.message || 'Failed to generate Excel report.', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Export Asset & Deduction Reports" size="md">
      <div className="space-y-5">
        {/* Report Type Selector */}
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
            Select Report Format
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setReportType('DAY_WISE')}
              className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                reportType === 'DAY_WISE'
                  ? 'border-[#07563D] bg-emerald-50/70 ring-2 ring-[#07563D]/20 shadow-xs'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <FileSpreadsheet className={`w-4 h-4 ${reportType === 'DAY_WISE' ? 'text-[#07563D]' : 'text-gray-400'}`} />
                <span className="text-xs font-bold text-gray-900">Day-Wise Audit</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Detailed transaction log with Employee codes, return dates, deduction amounts & condition notes.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setReportType('MONTHLY')}
              className={`p-3.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                reportType === 'MONTHLY'
                  ? 'border-[#07563D] bg-emerald-50/70 ring-2 ring-[#07563D]/20 shadow-xs'
                  : 'border-gray-200 bg-white hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Calendar className={`w-4 h-4 ${reportType === 'MONTHLY' ? 'text-[#07563D]' : 'text-gray-400'}`} />
                <span className="text-xs font-bold text-gray-900">Monthly Ledger</span>
              </div>
              <p className="text-[11px] text-gray-500">
                Month-by-month reconciliation of items allocated, returned, and total deductions recovered.
              </p>
            </button>
          </div>
        </div>

        {/* Filters according to Report Type */}
        {reportType === 'DAY_WISE' ? (
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
            <span className="text-xs font-bold text-gray-700 block">Date Range Filter</span>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="w-full bg-white border border-gray-300 rounded-lg px-3 py-1.5 text-xs font-medium text-gray-900"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
            <span className="text-xs font-bold text-gray-700 block">Select Calendar Year</span>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium text-gray-900"
            >
              <option value={2026}>2026 (Current Financial Year)</option>
              <option value={2025}>2025</option>
              <option value={2024}>2024</option>
            </select>
          </div>
        )}

        {/* Report Features List */}
        <div className="p-3 bg-emerald-50/50 border border-emerald-200/60 rounded-xl text-xs space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-800 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#07563D] shrink-0" />
            <span>Includes Returnable vs Non-Returnable / Consumable tags</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-800 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#07563D] shrink-0" />
            <span>Includes Security Deposits & Payroll Deduction tracking (₹)</span>
          </div>
          <div className="flex items-center gap-2 text-emerald-800 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#07563D] shrink-0" />
            <span>Directly exportable as Microsoft Excel (.xlsx) spreadsheet</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-200">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleExport}
            disabled={isExporting}
            leftIcon={<Download className="w-4 h-4" />}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold"
          >
            {isExporting ? 'Generating Excel...' : 'Download Excel Report'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
