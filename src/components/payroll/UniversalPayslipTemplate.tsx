// src/components/payroll/UniversalPayslipTemplate.tsx
// ============================================================================
// Joy PeopleHR — Universal Authoritative Payslip Container Component
// Delegates directly to Canonical PayslipDocument for 100% Structural & Visual Parity
// Zero Duplicate Templates Across Web, PDF, and Print
// ============================================================================

import React from 'react';
import { PayslipDocumentModel } from '../../types/payslipViewModel';
import { PayslipDocument } from './PayslipDocument';
import { Printer, Download } from 'lucide-react';

interface UniversalPayslipTemplateProps {
  documentModel: PayslipDocumentModel;
  onPrint?: () => void;
  onDownloadPdf?: () => void;
  showActions?: boolean;
}

export const UniversalPayslipTemplate: React.FC<UniversalPayslipTemplateProps> = ({
  documentModel: doc,
  onPrint,
  onDownloadPdf,
  showActions = true,
}) => {
  return (
    <div className="universal-payslip-wrapper select-none">
      {/* Interactive Action Toolbar (Hidden on print) */}
      {showActions && (
        <div className="no-print mb-4 flex items-center justify-between gap-3 bg-slate-900 text-white p-3.5 rounded-2xl shadow-lg border border-slate-800">
          <div className="flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse shadow-xs" />
            <div>
              <div className="text-xs font-black uppercase tracking-wider text-emerald-300">
                Authoritative Payslip Document • A4 Print &amp; PDF Optimized
              </div>
              <div className="text-xs text-slate-300">
                {doc.company.displayName || doc.company.legalName} • {doc.payroll.payrollPeriod} •{' '}
                <span className="font-mono font-bold text-white">{doc.employee.employeeCode}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                type="button"
                onClick={onPrint}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition cursor-pointer shadow-xs"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                Print A4
              </button>
            )}
            {onDownloadPdf && (
              <button
                type="button"
                onClick={onDownloadPdf}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402d] text-white font-black text-xs transition cursor-pointer shadow-md"
              >
                <Download className="w-4 h-4 text-white" />
                Download PDF
              </button>
            )}
          </div>
        </div>
      )}

      {/* Canonical A4 Payslip Document */}
      <div className="flex justify-center overflow-x-auto">
        <PayslipDocument
          model={doc}
          mode="screen"
          id={`payslip-doc-${doc.employee.employeeCode}`}
        />
      </div>
    </div>
  );
};
