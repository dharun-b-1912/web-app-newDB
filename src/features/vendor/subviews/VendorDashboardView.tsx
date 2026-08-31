import React, { useState } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  Users,
  Clock,
  CircleDollarSign,
  FileText,
  ArrowUpRight,
  ShieldCheck,
  AlertTriangle,
  FileCheck2,
  Calendar,
  Sparkles,
  CheckCircle2,
  Bell,
  Building2,
  Activity,
  Layers,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization } from '../../../types/vendorPortal';
import { VendorOnboardingWizardModal } from './VendorOnboardingWizardModal';
import { DocumentIntelligenceOcrModal } from '../components/DocumentIntelligenceOcrModal';

interface VendorDashboardViewProps {
  activeVendor: VendorOrganization;
  activePeriod: string;
  onNavigateTab: (tabId: string) => void;
}

export const VendorDashboardView: React.FC<VendorDashboardViewProps> = ({
  activeVendor,
  activePeriod,
  onNavigateTab,
}) => {
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [isOcrOpen, setIsOcrOpen] = useState(false);

  const vendors = vendorPortalService.getVendors();
  const complianceScores = vendorPortalService.getAllVendorComplianceScores();
  const activeScore = vendorPortalService.getComplianceScore(activeVendor?.id);
  const licenses = vendorPortalService.getLicenses(activeVendor?.id);
  const tasks = vendorPortalService.getComplianceCalendarTasks(activePeriod, activeVendor?.id);
  const returns = vendorPortalService.getStatutoryReturns(activeVendor?.id);
  const employees = vendorPortalService.getEmployees(activeVendor?.id);
  const activeEmployees = employees.filter((e) => e.status === 'ACTIVE');
  const auditLogs = vendorPortalService.getAuditLogs(activeVendor?.id);

  // Aggregates across company
  const compliantVendorsCount = complianceScores.filter(
    (s) => s.risk_tier === 'EXCELLENT' || s.risk_tier === 'GOOD'
  ).length;
  const attentionVendorsCount = complianceScores.filter(
    (s) => s.risk_tier === 'ATTENTION_REQUIRED'
  ).length;
  const highRiskVendorsCount = complianceScores.filter(
    (s) => s.risk_tier === 'HIGH_RISK'
  ).length;
  const expiringLicensesCount = licenses.filter(
    (l) => l.status === 'EXPIRING_SOON' || l.status === 'CRITICAL'
  ).length;
  const overdueTasksCount = tasks.filter((t) => t.status === 'OVERDUE').length;

  return (
    <div className="space-y-6">
      {/* Top Action Callout Banner */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl border border-indigo-500/20 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 font-semibold text-xs border border-indigo-400/30 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" /> Vendor Compliance Intelligence Platform
            </span>
            <span className="text-xs text-slate-400 font-mono">Period: {activePeriod}</span>
          </div>
          <h2 className="text-xl lg:text-2xl font-black text-white tracking-tight">
            Automated Contractor Lifecycle, Statutory Audits & Risk Intelligence
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Monitor contractor risk scores, automated license expiry countdowns (90d to 1d), biometric attendance validation, CLRA Form V certification, and statutory returns.
          </p>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => setIsOcrOpen(true)}
            className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 transition flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-violet-400" /> AI OCR Scanner
          </button>
          <button
            onClick={() => setIsOnboardingOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition flex items-center gap-2"
          >
            <Building2 className="w-4 h-4" /> Add Vendor (4-Step Wizard)
          </button>
        </div>
      </div>

      {/* Enterprise Compliance Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3 hover:border-indigo-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Total Active Vendors
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-gray-900 font-mono">
              {vendors.length}
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Compliant: {compliantVendorsCount}
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('settlement-workspace')}
            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 pt-2 border-t border-gray-100 w-full justify-between"
          >
            <span>Open Settlement Workspace</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3 hover:border-amber-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              High Risk / Attention
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-600 font-mono">
              {attentionVendorsCount + highRiskVendorsCount}
            </span>
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Critical: {highRiskVendorsCount}
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('audit-reports')}
            className="text-[11px] font-bold text-amber-700 hover:text-amber-800 flex items-center gap-1 pt-2 border-t border-gray-100 w-full justify-between"
          >
            <span>View Risk Audit Trail</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3 hover:border-rose-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Expiring Licenses (30D)
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-rose-600 font-mono">
              {expiringLicensesCount}
            </span>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              Radar Active
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('licenses')}
            className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 pt-2 border-t border-gray-100 w-full justify-between"
          >
            <span>Manage Renewals</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3 hover:border-emerald-300 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Statutory Returns & Form V
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-emerald-700 font-mono">
              {returns.filter((r) => r.status === 'VERIFIED').length}
            </span>
            <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full">
              Pending: {returns.filter((r) => r.status === 'PENDING').length}
            </span>
          </div>
          <button
            onClick={() => onNavigateTab('statutory-returns')}
            className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 pt-2 border-t border-gray-100 w-full justify-between"
          >
            <span>Open Form V & Returns</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Realtime Compliance Score & Deadlines Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Composite Compliance Health */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-200/80 shadow-2xs p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-gray-900 tracking-tight">
                  Vendor Compliance Health Score — {activeVendor?.name}
                </h3>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Realtime weighted audit algorithm evaluating Documents, Licenses, Payroll, PF/ESI Remittances, and Statutory Returns.
              </p>
            </div>
            <Badge variant="info" size="md">
              🔵 {activeScore?.overall_score || 76}% Good
            </Badge>
          </div>

          {/* Main Composite Progress */}
          <div className="p-5 rounded-2xl bg-gray-50/80 border border-gray-200/60 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Composite Compliance Index
              </span>
              <span className="text-xs font-semibold text-gray-500">
                Risk Tier: <strong className="text-indigo-600 font-bold">{activeScore?.risk_tier || 'GOOD'}</strong>
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-indigo-900 font-mono">
                {activeScore?.overall_score || 76}%
              </span>
              <span className="text-xs font-semibold text-gray-500">
                Audit Category: <strong className="text-emerald-700 font-bold">Low Risk (Approved for Billing)</strong>
              </span>
            </div>

            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-indigo-600 to-emerald-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${activeScore?.overall_score || 76}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 font-mono">
              <span>0% (High Risk)</span>
              <span>50%</span>
              <span>75%</span>
              <span>100% (Audit-Ready)</span>
            </div>
          </div>

          {/* 5 Weighted Categories Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                <span>1. KYC & Legal Documents (20%)</span>
                <span className="font-mono text-indigo-700">{activeScore?.documents_score || 80}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{ width: `${activeScore?.documents_score || 80}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                <span>2. Statutory Licenses & CLRA (25%)</span>
                <span className="font-mono text-emerald-700">{activeScore?.licenses_score || 50}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-emerald-600 h-2 rounded-full"
                  style={{ width: `${activeScore?.licenses_score || 50}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                <span>3. Monthly Payroll & Wages (25%)</span>
                <span className="font-mono text-blue-700">{activeScore?.payroll_score || 88}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${activeScore?.payroll_score || 88}%` }}
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/60 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                <span>4. PF & ESI Remittances (20%)</span>
                <span className="font-mono text-teal-700">{activeScore?.statutory_score || 95}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-teal-600 h-2 rounded-full"
                  style={{ width: `${activeScore?.statutory_score || 95}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Statutory Deadlines */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-2xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <h4 className="font-bold text-gray-900 text-sm">Statutory Deadlines</h4>
            </div>
            <button
              onClick={() => onNavigateTab('compliance-calendar')}
              className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
            >
              View Calendar →
            </button>
          </div>

          <div className="space-y-3">
            {tasks.slice(0, 4).map((task) => (
              <div
                key={task.id}
                className="p-3 rounded-xl border border-gray-200 bg-gray-50/60 space-y-1.5 text-xs hover:bg-indigo-50/30 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900 leading-tight truncate pr-2">
                    {task.title}
                  </span>
                  <Badge
                    variant={
                      task.status === 'VERIFIED'
                        ? 'emerald'
                        : task.status === 'SUBMITTED'
                        ? 'info'
                        : task.status === 'OVERDUE'
                        ? 'rose'
                        : 'amber'
                    }
                    size="sm"
                  >
                    {task.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-[11px] text-gray-500">
                  <span>Role: {task.assigned_to_role}</span>
                  <span>Due: <strong className="text-gray-700">{task.due_date}</strong></span>
                </div>
              </div>
            ))}
          </div>

          {/* Smart Reminder Pill */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-indigo-950">
              <Bell className="w-3.5 h-3.5 text-indigo-600" /> Smart Reminder Engine Active 🔔
            </div>
            <p className="text-[11px] text-indigo-900/80 leading-relaxed">
              Automated notifications sent at 90d, 60d, 30d, 15d, 7d, and 1d prior to statutory expiry.
            </p>
          </div>
        </div>
      </div>

      {/* Modals */}
      <DocumentIntelligenceOcrModal
        isOpen={isOcrOpen}
        onClose={() => setIsOcrOpen(false)}
        onSaved={() => onNavigateTab('licenses')}
      />

      <VendorOnboardingWizardModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onSuccess={() => onNavigateTab('settlement-workspace')}
      />
    </div>
  );
};
