import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Users,
  MapPin,
  Clock,
  CircleDollarSign,
  ShieldCheck,
  Calculator,
  FileText,
  Upload,
  Layers,
  FileSpreadsheet,
  History,
  CreditCard,
  Sparkles,
  Building2,
} from 'lucide-react';
import { vendorPortalService } from '../../services/vendorPortalService';
import { VendorOrganization } from '../../types/vendorPortal';
import { VendorHeader } from './components/VendorHeader';
import { VendorSettlementWorkspaceView } from './subviews/VendorSettlementWorkspaceView';
import { VendorDashboardView } from './subviews/VendorDashboardView';
import { VendorEmployeesView } from './subviews/VendorEmployeesView';
import { VendorAssignmentsView } from './subviews/VendorAssignmentsView';
import { VendorAttendanceView } from './subviews/VendorAttendanceView';
import { VendorWageBreakdownView } from './subviews/VendorWageBreakdownView';
import { VendorPayrollVerificationView } from './subviews/VendorPayrollVerificationView';
import { VendorPayableEngineView } from './subviews/VendorPayableEngineView';
import { VendorPurchaseOrdersView } from './subviews/VendorPurchaseOrdersView';
import { VendorInvoicesView } from './subviews/VendorInvoicesView';
import { VendorStatutoryComplianceView } from './subviews/VendorStatutoryComplianceView';
import { VendorPayslipsView } from './subviews/VendorPayslipsView';
import { VendorPaymentsReconciliationView } from './subviews/VendorPaymentsReconciliationView';
import { VendorAuditReportsView } from './subviews/VendorAuditReportsView';
import { VendorLicensesView } from './subviews/VendorLicensesView';
import { VendorComplianceCalendarView } from './subviews/VendorComplianceCalendarView';
import { VendorStatutoryReturnsView } from './subviews/VendorStatutoryReturnsView';
import { VendorOnboardingWizardModal } from './subviews/VendorOnboardingWizardModal';
import { VendorMultiClientDashboardView } from './subviews/VendorMultiClientDashboardView';

interface VendorMasterModuleProps {
  initialTab?: string;
  onNavigateSubPath?: (path: string) => void;
}

const resolveTabId = (route?: string): string => {
  if (!route || route === 'vendor' || route === 'vendor-portal') return 'settlement-workspace';
  const clean = route.replace(/^vendor-/, '');
  if (clean === 'clients' || clean === 'multi-client' || clean === 'multi-client-hub') return 'multi-client-hub';
  if (clean === 'dashboard') return 'dashboard';
  if (clean === 'licenses' || clean === 'license') return 'licenses';
  if (clean === 'calendar' || clean === 'compliance-calendar') return 'compliance-calendar';
  if (clean === 'returns' || clean === 'statutory-returns' || clean === 'form-v') return 'statutory-returns';
  if (clean === 'workforce' || clean === 'employees') return 'employees';
  if (clean === 'assignments') return 'assignments';
  if (clean === 'attendance') return 'attendance';
  if (clean === 'wages' || clean === 'wage-breakdown') return 'wage-breakdown';
  if (clean === 'payroll' || clean === 'payroll-verification') return 'payroll-verification';
  if (clean === 'payable' || clean === 'vendor-payable') return 'vendor-payable';
  if (clean === 'po' || clean === 'purchase-orders') return 'purchase-orders';
  if (clean === 'invoices' || clean === 'invoice') return 'invoices';
  if (clean === 'compliance' || clean === 'statutory') return 'compliance';
  if (clean === 'payslips') return 'payslips';
  if (clean === 'payments' || clean === 'reconciliation') return 'payments';
  if (clean === 'audit' || clean === 'reports' || clean === 'audit-reports') return 'audit-reports';
  return 'settlement-workspace';
};

export const VendorMasterModule: React.FC<VendorMasterModuleProps> = ({
  initialTab,
  onNavigateSubPath,
}) => {
  const [activeTab, setActiveTab] = useState<string>(() => resolveTabId(initialTab));
  const [activePeriod, setActivePeriod] = useState<string>('2026-08');
  const [allVendors, setAllVendors] = useState<VendorOrganization[]>(() => vendorPortalService.getVendors());
  const [activeVendor, setActiveVendor] = useState<VendorOrganization>(() => vendorPortalService.getActiveVendor());
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(resolveTabId(initialTab));
    }
  }, [initialTab]);

  const handleRefresh = () => {
    setAllVendors(vendorPortalService.getVendors());
    setActiveVendor(vendorPortalService.getActiveVendor());
    setRefreshKey((prev) => prev + 1);
  };

  const handleSelectVendor = (vendorId: string) => {
    vendorPortalService.setActiveVendorId(vendorId);
    setActiveVendor(vendorPortalService.getActiveVendor());
    setRefreshKey((prev) => prev + 1);
  };

  const handleNavigateTab = (tabId: string) => {
    setActiveTab(tabId);
    if (onNavigateSubPath) {
      onNavigateSubPath(`vendor-${tabId}`);
    }
  };

  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);

  const tabs = [
    { id: 'multi-client-hub', label: 'Client Workspaces', icon: Building2, badge: 'Multi-Tenant' },
    { id: 'settlement-workspace', label: 'Settlement Workspace', icon: Sparkles, badge: 'Master' },
    { id: 'dashboard', label: 'Dashboard & Risk', icon: LayoutDashboard },
    { id: 'licenses', label: 'Licenses & Expiry Hub', icon: ShieldCheck, badge: 'Smart 🔔' },
    { id: 'compliance-calendar', label: 'Compliance Calendar', icon: Clock },
    { id: 'statutory-returns', label: 'Form V & Returns', icon: FileSpreadsheet },
    { id: 'employees', label: 'Workforce', icon: Users },
    { id: 'assignments', label: 'Deployments', icon: MapPin },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    { id: 'wage-breakdown', label: 'Wage Breakdown', icon: Calculator },
    { id: 'payroll-verification', label: 'Payroll Verification', icon: ShieldCheck },
    { id: 'vendor-payable', label: 'Vendor Payable', icon: CircleDollarSign },
    { id: 'purchase-orders', label: 'Purchase Orders', icon: FileText },
    { id: 'invoices', label: 'Invoices & 3-Way Match', icon: Upload },
    { id: 'compliance', label: 'Statutory (PF/ESI)', icon: Layers },
    { id: 'payslips', label: 'Payslips', icon: FileSpreadsheet },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'audit-reports', label: 'Audit & Reports', icon: History },
  ];

  return (
    <div key={refreshKey} className="p-6 space-y-6 max-w-[1700px] mx-auto min-h-screen pb-24 select-none">
      {/* Top Vendor Context & Switcher Banner */}
      <VendorHeader
        activePeriod={activePeriod}
        onChangePeriod={(p) => {
          setActivePeriod(p);
          handleRefresh();
        }}
        onRefresh={handleRefresh}
        activeVendor={activeVendor}
        onSelectVendor={handleSelectVendor}
        allVendors={allVendors}
      />

      {/* Horizontal Sub-Navigation Tab Bar */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-1.5 flex items-center gap-1 overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleNavigateTab(tab.id)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-indigo-400/40 text-white' : 'bg-indigo-50 text-indigo-700'
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Subview Container */}
      <div className="transition-all duration-200">
        {activeTab === 'multi-client-hub' && (
          <VendorMultiClientDashboardView
            activeVendor={activeVendor}
            onSelectClientCompany={(relId) => {
              vendorPortalService.setActiveRelationshipId(relId);
              handleNavigateTab('settlement-workspace');
            }}
          />
        )}
        {activeTab === 'settlement-workspace' && (
          <VendorSettlementWorkspaceView
            activeVendor={activeVendor}
            activePeriod={activePeriod}
            onNavigateTab={handleNavigateTab}
          />
        )}
        {activeTab === 'dashboard' && (
          <VendorDashboardView
            activeVendor={activeVendor}
            activePeriod={activePeriod}
            onNavigateTab={handleNavigateTab}
          />
        )}
        {activeTab === 'licenses' && (
          <VendorLicensesView />
        )}
        {activeTab === 'compliance-calendar' && (
          <VendorComplianceCalendarView />
        )}
        {activeTab === 'statutory-returns' && (
          <VendorStatutoryReturnsView />
        )}
        {activeTab === 'employees' && (
          <VendorEmployeesView activeVendor={activeVendor} onRefresh={handleRefresh} />
        )}
        {activeTab === 'assignments' && (
          <VendorAssignmentsView activeVendor={activeVendor} />
        )}
        {activeTab === 'attendance' && (
          <VendorAttendanceView
            activeVendor={activeVendor}
            activePeriod={activePeriod}
            onRefresh={handleRefresh}
          />
        )}
        {activeTab === 'wage-breakdown' && (
          <VendorWageBreakdownView activeVendor={activeVendor} activePeriod={activePeriod} />
        )}
        {activeTab === 'payroll-verification' && (
          <VendorPayrollVerificationView
            activeVendor={activeVendor}
            activePeriod={activePeriod}
            onRefresh={handleRefresh}
          />
        )}
        {activeTab === 'vendor-payable' && (
          <VendorPayableEngineView activeVendor={activeVendor} activePeriod={activePeriod} />
        )}
        {activeTab === 'purchase-orders' && (
          <VendorPurchaseOrdersView activeVendor={activeVendor} onRefresh={handleRefresh} />
        )}
        {activeTab === 'invoices' && (
          <VendorInvoicesView
            activeVendor={activeVendor}
            activePeriod={activePeriod}
            onRefresh={handleRefresh}
          />
        )}
        {activeTab === 'compliance' && (
          <VendorStatutoryComplianceView activeVendor={activeVendor} activePeriod={activePeriod} />
        )}
        {activeTab === 'payslips' && (
          <VendorPayslipsView activeVendor={activeVendor} activePeriod={activePeriod} />
        )}
        {activeTab === 'payments' && (
          <VendorPaymentsReconciliationView
            activeVendor={activeVendor}
            activePeriod={activePeriod}
            onRefresh={handleRefresh}
          />
        )}
        {activeTab === 'audit-reports' && (
          <VendorAuditReportsView activeVendor={activeVendor} activePeriod={activePeriod} />
        )}
      </div>

      {/* Global Onboarding Modal */}
      <VendorOnboardingWizardModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
        onSuccess={() => {
          handleRefresh();
          handleNavigateTab('licenses');
        }}
      />
    </div>
  );
};
