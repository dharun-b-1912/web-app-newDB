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
import { ExpenseClaimsView } from './subviews/ExpenseClaimsView';
import { ESIComplianceView } from './subviews/ESIComplianceView';
import { EPFOComplianceView } from './subviews/EPFOComplianceView';
import { PayslipModal } from './components/PayslipModal';
import { AutoPayrollAndReportsModal } from './components/AutoPayrollAndReportsModal';
import { PayrollContextBar, PayrollStageKey } from './components/PayrollContextBar';
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
  Receipt,
  Zap,
  Sparkles,
  Layers,
} from 'lucide-react';

import { api } from '../../services/api';

import { ClientBillingMasterModule } from '../clientBilling/ClientBillingMasterModule';

interface PayrollMasterModuleProps {
  initialTab?: string;
}

const resolveTabId = (route?: string): string => {
  if (!route || route === 'payroll') return 'dashboard';
  const clean = route.replace(/^payroll-/, '');
  if (clean === 'billing' || clean === 'client-billing' || clean === 'client-invoice' || clean === 'invoicing') return 'client-billing';
  if (clean === 'epfo' || clean === 'epf' || clean === 'ecr' || clean === 'epf-ecr') return 'epfo';
  if (clean === 'esic' || clean === 'esi' || clean === 'esi-compliance') return 'esi';
  if (clean === 'claims' || clean === 'expense-claims' || clean === 'reimbursements') return 'claims';
  if (clean === 'salary' || clean === 'structures' || clean === 'components' || clean === 'employee-salary' || clean === 'revisions') return 'salary';
  if (clean === 'runs' || clean === 'processing' || clean === 'calendar' || clean === 'input' || clean === 'preview' || clean === 'approval' || clean === 'finalization') return 'processing';
  if (clean === 'earnings' || clean === 'overtime' || clean === 'incentives' || clean === 'bonus') return 'earnings';
  if (clean === 'deductions' || clean === 'lop' || clean === 'loans' || clean === 'advance') return 'deductions';
  if (clean === 'statutory' || clean === 'pt' || clean === 'tds' || clean === 'lwf' || clean === 'gratuity') return 'statutory';
  if (clean === 'documents' || clean === 'payslips' || clean === 'tax-docs' || clean === 'form16') return 'documents';
  if (clean === 'disbursement' || clean === 'payouts' || clean === 'bank') return 'disbursement';
  if (clean === 'fnf' || clean === 'settlement') return 'fnf';
  if (clean === 'reports') return 'reports';
  if (clean === 'settings') return 'settings';
  return 'dashboard';
};

type TabCategory = 'all' | 'operations' | 'reports' | 'rules';

export const PayrollMasterModule: React.FC<PayrollMasterModuleProps> = ({ initialTab }) => {
  const [activeTab, setActiveTab] = useState<string>(() => resolveTabId(initialTab));
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TabCategory>('all');
  const [employeeCount, setEmployeeCount] = useState<number>(2);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTabId(initialTab));
    }
    let isMounted = true;
    api.getEmployees()
      .then((emps) => {
        if (isMounted && Array.isArray(emps)) {
          setEmployeeCount(emps.length);
        }
      })
      .catch(() => {
        if (isMounted) {
          setEmployeeCount(2);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [initialTab]);

  const tabs = [
    { id: 'dashboard', label: 'Payroll Dashboard', icon: LayoutDashboard, category: 'operations' as TabCategory },
    { id: 'client-billing', label: 'Client Wage Billing & Invoicing', icon: Receipt, category: 'operations' as TabCategory, highlight: true },
    { id: 'processing', label: 'Payroll Processing & Runs', icon: Play, category: 'operations' as TabCategory, highlight: true },
    { id: 'disbursement', label: 'Bank Disbursement', icon: CreditCard, category: 'operations' as TabCategory },
    { id: 'reports', label: 'Reports, Registers & ECR', icon: FileSpreadsheet, category: 'reports' as TabCategory, highlight: true },
    { id: 'documents', label: 'Digital Payslips & Docs', icon: FileText, category: 'reports' as TabCategory },
    { id: 'fnf', label: 'Full & Final (F&F)', icon: UserMinus, category: 'reports' as TabCategory },
    { id: 'salary', label: 'Salary Structures & Staff', icon: Building2, category: 'rules' as TabCategory },
    { id: 'statutory', label: 'Statutory & Tax Rules', icon: ShieldCheck, category: 'rules' as TabCategory },
    { id: 'earnings', label: 'Earnings & Overtime', icon: TrendingUp, category: 'rules' as TabCategory },
    { id: 'deductions', label: 'Deductions, Loans & LOP', icon: Minus, category: 'rules' as TabCategory },
    { id: 'claims', label: 'Expense Claims & Approvals', icon: Receipt, category: 'rules' as TabCategory },
    { id: 'settings', label: 'Payroll Settings', icon: Settings, category: 'rules' as TabCategory },
  ];

  const filteredTabs = selectedCategory === 'all'
    ? tabs
    : tabs.filter(t => t.category === selectedCategory);

  const handleOpenPayslip = (employeeId: string) => {
    const slip = payrollApi.getPayslipForEmployee(employeeId, 'August 2026');
    setSelectedPayslip(slip);
    setIsPayslipModalOpen(true);
  };

  const getStageFromTab = (tab: string): PayrollStageKey => {
    if (tab === 'dashboard') return 'prepare';
    if (tab === 'salary' || tab === 'statutory' || tab === 'earnings' || tab === 'deductions' || tab === 'claims') return 'validate';
    if (tab === 'processing') return 'calculate';
    if (tab === 'disbursement') return 'disburse';
    if (tab === 'documents') return 'publish';
    if (tab === 'reports') return 'report';
    return 'calculate';
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen pb-20 select-none">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-[#07563D] via-[#096a4b] to-[#0a7352] p-6 rounded-3xl text-white shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span>Joy PeopleHR — HR & Payroll SaaS</span>
            <span>•</span>
            <span>Payroll Operating System 2.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">Payroll Command Center</h1>
          <p className="text-xs sm:text-sm text-emerald-100/90 mt-1 max-w-2xl leading-relaxed">
            Multi-tenant enterprise payroll engine supporting direct employees, contract workforce, statutory compliance returns, attendance-linked LOP calculations, and bank payouts.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => setIsAutoModalOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-white text-[#07563D] hover:bg-emerald-50 font-black text-xs shadow-md flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Zap className="w-4 h-4 text-emerald-700 fill-emerald-600 animate-pulse" />
            <span>⚡ 1-Click Auto Run & Reports</span>
          </button>

          <div className="bg-white/10 backdrop-blur-md p-3 rounded-2xl border border-white/15 text-right shrink-0">
            <span className="text-[10px] uppercase font-bold text-emerald-200 block">Active Pay Cycle</span>
            <span className="text-sm font-black font-mono">August 2026 (Monthly)</span>
          </div>
        </div>
      </div>

      {/* Global Universal Payroll Context & Guided Lifecycle Bar */}
      <PayrollContextBar
        currentStage={getStageFromTab(activeTab)}
        employeeCount={employeeCount}
        unitLocation="All Locations"
        payrollGroup="All Direct & Contract Staff"
        onNavigateTab={tabKey => setActiveTab(tabKey)}
      />

      {/* Navigation Filter & Category Tabs Bar */}
      <div className="bg-white/95 backdrop-blur-sm p-2 rounded-2xl border border-gray-200/90 shadow-2xs space-y-2">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2 px-1 flex-wrap">
          {/* Category Switcher */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-bold uppercase text-gray-400 mr-1.5 tracking-wider">Group:</span>
            {[
              { id: 'all', label: 'All Modules' },
              { id: 'operations', label: '⚡ Monthly Cycle' },
              { id: 'reports', label: '📊 Reports & Statutory' },
              { id: 'rules', label: '⚙️ Rules & Setup' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as TabCategory)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer",
                  selectedCategory === cat.id
                    ? "bg-emerald-50 text-[#07563D] border border-emerald-200/80 shadow-2xs"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/60"
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-gray-400 font-medium hidden sm:block">
            {filteredTabs.length} active navigation tabs
          </div>
        </div>

        {/* Tab Pills with Smooth Scroll and Hidden Scrollbar */}
        <div
          className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none scroll-smooth pt-0.5"
          style={{ WebkitOverflowScrolling: 'touch' }}
          onWheel={(e) => {
            if (e.deltaY !== 0) {
              e.currentTarget.scrollLeft += e.deltaY * 0.9;
            }
          }}
        >
          {filteredTabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer select-none shrink-0",
                  isActive
                    ? "bg-[#07563D] text-white shadow-xs"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100/80"
                )}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span>{tab.label}</span>
                {tab.highlight && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Subview Container */}
      <div className="transition-all duration-200">
        {activeTab === 'dashboard' && (
          <PayrollDashboardView
            onNavigateTab={tabKey => setActiveTab(tabKey)}
            onOpenPayslip={handleOpenPayslip}
          />
        )}
        {activeTab === 'client-billing' && <ClientBillingMasterModule />}
        {activeTab === 'salary' && (
          <SalaryManagementView
            onOpenPayslip={handleOpenPayslip}
            onNavigateTab={tabKey => setActiveTab(tabKey)}
          />
        )}
        {activeTab === 'claims' && <ExpenseClaimsView />}
        {activeTab === 'processing' && (
          <PayrollProcessingView
            onOpenPayslip={handleOpenPayslip}
            onNavigateTab={tabKey => setActiveTab(tabKey)}
          />
        )}
        {activeTab === 'earnings' && <EarningsView />}
        {activeTab === 'deductions' && <DeductionsView />}
        {activeTab === 'statutory' && <StatutoryView />}
        {activeTab === 'epfo' && <EPFOComplianceView />}
        {activeTab === 'esi' && <ESIComplianceView />}
        {activeTab === 'documents' && <EmployeeDocumentsView onOpenPayslip={handleOpenPayslip} />}
        {activeTab === 'disbursement' && (
          <BankDisbursementView
            onNavigateTab={tabKey => setActiveTab(tabKey)}
          />
        )}
        {activeTab === 'fnf' && <FnFSettlementView />}
        {activeTab === 'reports' && (
          <PayrollReportsView
            onNavigateTab={tabKey => setActiveTab(tabKey)}
          />
        )}
        {activeTab === 'settings' && <PayrollSettingsView />}
      </div>

      {/* Digital Payslip Modal */}
      <PayslipModal
        payslip={selectedPayslip}
        isOpen={isPayslipModalOpen}
        onClose={() => setIsPayslipModalOpen(false)}
      />

      {/* 1-Click Automated Full-Cycle Run & Report Generator Modal */}
      <AutoPayrollAndReportsModal
        isOpen={isAutoModalOpen}
        onClose={() => setIsAutoModalOpen(false)}
        onRunCompleted={() => {
          setActiveTab('processing');
        }}
        onNavigateTab={tabKey => setActiveTab(tabKey)}
      />
    </div>
  );
};

