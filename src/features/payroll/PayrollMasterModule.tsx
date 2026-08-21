import React, { useState, useEffect } from 'react';
import { PayrollDashboardView } from './subviews/PayrollDashboardView';
import { SalaryManagementView } from './subviews/SalaryManagementView';
import { PayrollProcessingView } from './subviews/PayrollProcessingView';
import { EarningsView } from './subviews/EarningsView';
import { DeductionsView } from './subviews/DeductionsView';
import { StatutoryView } from './subviews/StatutoryView';
import { EmployeeDocumentsView } from './subviews/EmployeeDocumentsView';
import { BankDisbursementView } from './subviews/BankDisbursementView';
import { FnFSettlementView } from './subviews/FnFSettlementView';
import { PayrollReportsView } from './subviews/PayrollReportsView';
import { PayrollSettingsView } from './subviews/PayrollSettingsView';
import { PayslipModal } from './components/PayslipModal';
import { payrollApi } from '../../services/payrollApi';
import { Payslip } from '../../types/payroll';
import { cn } from '../../lib/utils';

import {
  LayoutDashboard,
  Building2,
  Play,
  TrendingUp,
  Minus,
  ShieldCheck,
  FileText,
  UserMinus,
  FileSpreadsheet,
  Settings,
  CreditCard,
} from 'lucide-react';

interface PayrollMasterModuleProps {
  initialTab?: string;
}

const resolveTabId = (route?: string): string => {
  if (!route || route === 'payroll') return 'dashboard';
  const clean = route.replace(/^payroll-/, '');
  if (clean === 'salary' || clean === 'structures' || clean === 'components' || clean === 'employee-salary' || clean === 'revisions') return 'salary';
  if (clean === 'runs' || clean === 'processing' || clean === 'calendar' || clean === 'input' || clean === 'preview' || clean === 'approval' || clean === 'finalization') return 'processing';
  if (clean === 'earnings' || clean === 'overtime' || clean === 'incentives' || clean === 'bonus' || clean === 'reimbursements') return 'earnings';
  if (clean === 'deductions' || clean === 'lop' || clean === 'loans' || clean === 'advance') return 'deductions';
  if (clean === 'statutory' || clean === 'pf' || clean === 'esi' || clean === 'pt' || clean === 'tds' || clean === 'lwf' || clean === 'gratuity') return 'statutory';
  if (clean === 'documents' || clean === 'payslips' || clean === 'tax-docs' || clean === 'form16') return 'documents';
  if (clean === 'disbursement' || clean === 'payouts' || clean === 'bank') return 'disbursement';
  if (clean === 'fnf' || clean === 'settlement') return 'fnf';
  if (clean === 'reports') return 'reports';
  if (clean === 'settings') return 'settings';
  return 'dashboard';
};

export const PayrollMasterModule: React.FC<PayrollMasterModuleProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<string>(() => resolveTabId(initialTab));
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTabId(initialTab));
    }
  }, [initialTab]);

  const tabs = [
    { id: 'dashboard', label: 'Payroll Dashboard', icon: LayoutDashboard },
    { id: 'salary', label: 'Salary Management', icon: Building2 },
    { id: 'processing', label: 'Payroll Processing', icon: Play },
    { id: 'earnings', label: 'Earnings', icon: TrendingUp },
    { id: 'deductions', label: 'Deductions & LOP', icon: Minus },
    { id: 'statutory', label: 'Statutory Compliance', icon: ShieldCheck },
    { id: 'documents', label: 'Payslips & Tax Docs', icon: FileText },
    { id: 'disbursement', label: 'Bank Disbursement', icon: CreditCard },
    { id: 'fnf', label: 'Full & Final (F&F)', icon: UserMinus },
    { id: 'reports', label: 'Payroll Reports', icon: FileSpreadsheet },
    { id: 'settings', label: 'Payroll Settings', icon: Settings },
  ];

  const handleOpenPayslip = (employeeId: string) => {
    const slip = payrollApi.getPayslipForEmployee(employeeId, 'August 2026');
    setSelectedPayslip(slip);
    setIsPayslipModalOpen(true);
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen pb-20 select-none">
      {/* Banner */}
      <div className="bg-gradient-to-r from-[#07563D] to-[#0a7352] p-6 rounded-3xl text-white shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <span>WorkForceOS Enterprise Suite</span>
            <span>•</span>
            <span>Payroll Engine v4.0</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight mt-1">Payroll Master Module</h1>
          <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl">
            Centralized salary computation, statutory EPF/ESIC/TDS deductions, LOP calculations, digital payslips, Form 16, and F&F exit settlement engine.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/10 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Active Pay Cycle</span>
            <span className="text-sm font-black font-mono">August 2026 (Monthly)</span>
          </div>
        </div>
      </div>

      {/* Top Module Subtabs Navigation */}
      <div className="bg-white p-2 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-1.5 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer",
                isActive ? "bg-[#07563D] text-white shadow-xs" : "text-gray-600 hover:bg-gray-100"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Subview Container */}
      <div className="transition-all duration-200">
        {activeTab === 'dashboard' && (
          <PayrollDashboardView
            onNavigateTab={tabKey => setActiveTab(tabKey)}
            onOpenPayslip={handleOpenPayslip}
          />
        )}
        {activeTab === 'salary' && <SalaryManagementView onOpenPayslip={handleOpenPayslip} />}
        {activeTab === 'processing' && <PayrollProcessingView onOpenPayslip={handleOpenPayslip} />}
        {activeTab === 'earnings' && <EarningsView />}
        {activeTab === 'deductions' && <DeductionsView />}
        {activeTab === 'statutory' && <StatutoryView />}
        {activeTab === 'documents' && <EmployeeDocumentsView onOpenPayslip={handleOpenPayslip} />}
        {activeTab === 'disbursement' && <BankDisbursementView />}
        {activeTab === 'fnf' && <FnFSettlementView />}
        {activeTab === 'reports' && <PayrollReportsView />}
        {activeTab === 'settings' && <PayrollSettingsView />}
      </div>

      {/* Digital Payslip Modal */}
      <PayslipModal
        payslip={selectedPayslip}
        isOpen={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
      />
    </div>
  );
};
