// src/features/workspace/components/WorkspacePayslipModal.tsx
// ============================================================================
// Joy PeopleHR — Employee Workspace Payslip Modal
// Production Universal Blue Payslip Template with Live Authoritative Payroll Data
// ============================================================================

import React, { useMemo } from 'react';
import { Button } from '../../../components/ui/Button';
import { X, Receipt, Download, Printer } from 'lucide-react';
import { Employee, User, Company } from '../../../types';
import { PayslipGeneratorService } from '../../../services/payroll/payslipGeneratorService';
import { PayslipDocument } from '../../../components/payroll/PayslipDocument';
import { UniversalPayslipPdfService } from '../../../services/payroll/universalPayslipPdfService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  user: User;
  activeCompany: Company | null;
}

export const WorkspacePayslipModal: React.FC<Props> = ({
  isOpen,
  onClose,
  employee,
  user,
  activeCompany,
}) => {
  const empIdentifier = employee?.employee_code || employee?.id || user.id;

  const { viewModel, validation } = useMemo(() => {
    return PayslipGeneratorService.buildPayslipViewModel(
      empIdentifier,
      'August 2026',
      activeCompany?.id || 'org-main',
      activeCompany
        ? {
            legalName: activeCompany.legal_name,
            displayName: activeCompany.name,
            logoUrl: activeCompany.logo_url || '/logo.png',
          }
        : undefined
    );
  }, [empIdentifier, activeCompany]);

  if (!isOpen) return null;

  const handlePrint = () => {
    UniversalPayslipPdfService.printDocument(viewModel, 'workspace-payslip-document');
  };

  const handleDownload = () => {
    UniversalPayslipPdfService.downloadPdf(viewModel, 'workspace-payslip-document');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center font-bold">
              <Receipt className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <span>Universal Compensation Statement</span>
                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-sans font-bold">
                  {viewModel.payroll.payrollPeriod}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 font-medium">
                {viewModel.company.displayName || viewModel.company.legalName} • Finalized Payroll
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Print A4 Payslip"
            >
              <Printer className="w-4 h-4 text-blue-400" />
            </button>
            <button
              onClick={handleDownload}
              className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Download Payslip"
            >
              <Download className="w-4 h-4 text-emerald-400" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body: Printable Universal Template */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-100/60">
          {!validation.isValid && (
            <div className="mb-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs">
              <strong className="block font-bold">Payroll Reconciliation Notice:</strong>
              {validation.errors.join(' • ')}
            </div>
          )}

          <div className="flex justify-center">
            <PayslipDocument
              model={viewModel}
              mode="screen"
              id="workspace-payslip-document"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-[11px] text-slate-500 font-mono">
            Document ID: {viewModel.metadata.payslipNumber}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={onClose} className="text-xs font-bold">
              Close
            </Button>
            <Button size="sm" variant="primary" onClick={handlePrint} className="bg-[#034078] hover:bg-[#022c54] text-white text-xs font-bold">
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Print A4
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
