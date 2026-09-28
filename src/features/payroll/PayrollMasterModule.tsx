import React, { useState, useEffect, useMemo } from 'react';
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
import { PayrollStageKey } from './components/PayrollContextBar';
import { PayrollWorkflowStepper } from './components/PayrollWorkflowStepper';
import { PayrollStatusBadge } from './components/PayrollStatusBadge';
import { payrollApi } from '../../services/payrollApi';
import { payrollPeriodService, PayrollPeriod } from '../../services/payroll/payrollPeriodService';
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
} from 'lucide-react';

import { api } from '../../services/api';

import { ClientBillingMasterModule } from '../clientBilling/ClientBillingMasterModule';

interface PayrollMasterModuleProps {
  initialTab?: string;
  onNavigateTab?: (route: string) => void;
}

const resolveTabId = (route?: string): string => {
  if (!route || route === 'payroll' || route === '/payroll') return 'dashboard';
  const clean = route.replace(/^\/?payroll[-/]/, '').replace(/^\//, '').toLowerCase();
  if (clean === 'dashboard') return 'dashboard';
  if (clean === 'billing' || clean === 'client-billing' || clean === 'client-invoice' || clean === 'invoicing') return 'client-billing';
  if (clean === 'epfo' || clean === 'epf' || clean === 'ecr' || clean === 'epf-ecr') return 'epfo';
  if (clean === 'esic' || clean === 'esi' || clean === 'esi-compliance') return 'esi';
  if (clean === 'claims' || clean === 'expense-claims' || clean === 'reimbursements' || clean === 'expenses') return 'claims';
  if (clean === 'salary' || clean === 'structures' || clean === 'components' || clean === 'employee-salary' || clean === 'revisions' || clean === 'salary-structures') return 'salary';
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

export const PayrollMasterModule: React.FC<PayrollMasterModuleProps> = ({ initialTab, onNavigateTab }) => {
  const [activeTab, setActiveTab] = useState<string>(() => resolveTabId(initialTab));
  const [selectedPayslip, setSelectedPayslip] = useState<Payslip | null>(null);
  const [isPayslipModalOpen, setIsPayslipModalOpen] = useState(false);
  const [isAutoModalOpen, setIsAutoModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<TabCategory>('all');
  const [employeeCount, setEmployeeCount] = useState<number>(2);

  const handleSelectTab = (tabId: string) => {
    setActiveTab(tabId);
    if (onNavigateTab) {
      const tabToRouteMap: Record<string, string> = {
        'dashboard': 'payroll-dashboard',
        'client-billing': 'client-billing',
        'salary': 'payroll-salary',
        'claims': 'payroll-claims',
        'processing': 'payroll-processing',
        'earnings': 'payroll-earnings',
        'deductions': 'payroll-deductions',
        'statutory': 'payroll-statutory',
        'documents': 'payroll-documents',
        'disbursement': 'payroll-disbursement',
        'fnf': 'payroll-fnf',
        'reports': 'payroll-reports',
        'settings': 'payroll-settings',
      };
      onNavigateTab(tabToRouteMap[tabId] || `payroll-${tabId}`);
    }
  };

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
    if (slip) {
      setSelectedPayslip(slip);
      setIsPayslipModalOpen(true);
    }
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

  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriod[]>([]);
  const [activePeriod, setActivePeriod] = useState<string>('September 2026');

  useEffect(() => {
    payrollPeriodService.getPayrollPeriods().then((periods) => {
      setPayrollPeriods(periods);
      const todayStr = new Date().toISOString().split('T')[0];
      const cur = periods.find(p => todayStr >= p.start_date && todayStr <= p.end_date) || periods[0];
      if (cur) setActivePeriod(cur.period_name);
    });
  }, []);

  const selectedPeriodObj = useMemo(() => {
    return payrollPeriods.find(p => p.period_name === activePeriod);
  }, [payrollPeriods, activePeriod]);

  const activeCompany = api.getActiveCompany();

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-[1600px] mx-auto min-h-screen pb-20 select-none">
      {/* 1. Compact Enterprise Payroll Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-500 font-medium">
            <span className="font-bold text-[#07563D]">Payroll</span>
            <span>/</span>
            <span className="text-gray-700 font-semibold">{activePeriod}</span>
            <span>•</span>
            <span className="text-gray-600">{(activeCompany as any)?.name || activeCompany?.legal_name || activeCompany?.trade_name || 'Joy Corporate Solutions Pvt Ltd'}</span>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              {activePeriod} Payroll
            </h1>
            <PayrollStatusBadge status={selectedPeriodObj?.status === 'CALCULATED' ? 'CALCULATED' : 'READY'} size="sm" />
          </div>

          <p className="text-xs text-gray-500">
            Monthly payroll cycle ({selectedPeriodObj?.start_date || '01 Sep'} – {selectedPeriodObj?.end_date || '30 Sep'}) • All Direct & Contract Staff
          </p>
        </div>

        {/* Header Right Controls */}
        <div className="flex items-center gap-2.5 flex-wrap shrink-0">
          {/* Cycle Selector */}
          <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-200 text-xs">
            <span className="text-gray-400 font-medium text-[11px]">Cycle:</span>
            <select
              value={activePeriod}
              onChange={(e) => setActivePeriod(e.target.value)}
              className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer text-xs"
            >
              {payrollPeriods.length > 0 ? (
                payrollPeriods.map((p) => (
                  <option key={p.id} value={p.period_name}>
                    {p.period_name} ({p.status === 'CALCULATED' ? 'Locked' : p.status === 'PROCESSING' ? 'In Progress' : 'Open'})
                  </option>
                ))
              ) : (
                <>
                  <option value="September 2026">September 2026 (Active Run)</option>
                  <option value="August 2026">August 2026 (Locked)</option>
                </>
              )}
            </select>
          </div>

          {/* Headcount pill */}
          <span className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200/80 font-mono">
            {employeeCount} Staff
          </span>

          {/* Quick Auto Run Modal trigger */}
          <button
            onClick={() => setIsAutoModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#07563D] border border-emerald-200/80 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="1-Click Automated Full-Cycle Run & Report Generator"
          >
            <Zap className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600 animate-pulse" />
            <span>⚡ 1-Click Auto Run</span>
          </button>
        </div>
      </div>

      {/* 2. Compact 9-Stage Lifecycle Stepper */}
      <PayrollWorkflowStepper
        currentStage={getStageFromTab(activeTab)}
        onNavigateTab={(tabKey) => setActiveTab(tabKey)}
      />

      {/* 3. Sub-View Breadcrumb Navigation (Visible only when viewing non-dashboard submodules) */}
      {activeTab !== 'dashboard' && (
        <div className="flex items-center justify-between gap-2 bg-gray-50/90 px-3 py-2 rounded-xl border border-gray-200/80 text-xs overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSelectTab('dashboard')}
              className="font-bold text-[#07563D] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>← Back to Dashboard</span>
            </button>
            <span className="text-gray-300">|</span>
            <span className="text-gray-500">
              Module: <strong className="text-gray-900">{tabs.find((t) => t.id === activeTab)?.label || activeTab}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTab(t.id)}
                className={cn(
                  'px-2 py-1 rounded-lg text-[11px] font-medium transition-all cursor-pointer',
                  activeTab === t.id
                    ? 'bg-[#07563D] text-white font-bold'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Subview Container */}
      <div className="transition-all duration-200">
        {activeTab === 'dashboard' && (
          <PayrollDashboardView
            onNavigateTab={tabKey => handleSelectTab(tabKey)}
            onOpenPayslip={handleOpenPayslip}
          />
        )}
        {activeTab === 'client-billing' && <ClientBillingMasterModule />}
        {activeTab === 'salary' && (
          <SalaryManagementView
            onOpenPayslip={handleOpenPayslip}
            onNavigateTab={tabKey => handleSelectTab(tabKey)}
          />
        )}
        {activeTab === 'claims' && <ExpenseClaimsView />}
        {activeTab === 'processing' && (
          <PayrollProcessingView
            onOpenPayslip={handleOpenPayslip}
            onNavigateTab={tabKey => handleSelectTab(tabKey)}
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
            onNavigateTab={tabKey => handleSelectTab(tabKey)}
          />
        )}
        {activeTab === 'fnf' && <FnFSettlementView />}
        {activeTab === 'reports' && (
          <PayrollReportsView
            onNavigateTab={tabKey => handleSelectTab(tabKey)}
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
          handleSelectTab('processing');
        }}
        onNavigateTab={tabKey => handleSelectTab(tabKey)}
      />
    </div>
  );
};

