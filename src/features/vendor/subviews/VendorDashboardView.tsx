import React, { useMemo } from 'react';
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
  CheckCircle2,
  Building2,
  Activity,
  Briefcase,
  Layers,
  FileSpreadsheet,
  CheckCircle,
  CreditCard,
  ChevronRight,
} from 'lucide-react';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorOrganization } from '../../../types/vendorPortal';
import { useVendorPortalContext } from '../portal/VendorPortalContext';

export interface VendorDashboardViewProps {
  activeVendor?: VendorOrganization;
  activePeriod?: string;
  onNavigateTab?: (tabId: string) => void;
}

export const VendorDashboardView: React.FC<VendorDashboardViewProps> = ({
  activeVendor,
  activePeriod,
  onNavigateTab,
}) => {
  let ctxVendor: VendorOrganization | null = null;
  let ctxUser: any = null;
  let ctxPeriod = '2026-08';
  let ctxNavigate: ((tabId: string) => void) | undefined = onNavigateTab;
  let ctxRelationship: any = null;
  let ctxRelationships: any[] = [];

  try {
    const ctx = useVendorPortalContext();
    ctxVendor = ctx.vendor;
    ctxUser = ctx.vendorUser;
    ctxPeriod = ctx.activePeriod;
    ctxRelationship = ctx.activeRelationship;
    ctxRelationships = ctx.relationships;
    if (!ctxNavigate && ctx.onNavigate) {
      ctxNavigate = ctx.onNavigate;
    }
  } catch {
    // Standalone / test view usage
  }

  const effectiveVendor = activeVendor || ctxVendor || vendorPortalService.getActiveVendor();
  const effectivePeriod = activePeriod || ctxPeriod || '2026-08';
  const handleNavigate = (tab: string) => {
    if (ctxNavigate) ctxNavigate(tab);
    else if (onNavigateTab) onNavigateTab(tab);
  };

  const vendorId = effectiveVendor?.id;

  // Real authoritative data fetching
  const relationships = ctxRelationships.length > 0
    ? ctxRelationships
    : (vendorId ? vendorPortalService.getVendorCompanyRelationships(vendorId) : []);
  const activeRelationships = relationships.filter((r) => r.status === 'ACTIVE');

  const allEmployees = vendorId ? vendorPortalService.getEmployees(vendorId) : [];
  const employees = ctxRelationship && ctxRelationship.id !== 'all'
    ? allEmployees.filter((e) => !e.current_client_id || e.current_client_id === ctxRelationship.company_id || e.current_client_id === ctxRelationship.id)
    : allEmployees;

  const activeEmployees = employees.filter((e) => e.status === 'ACTIVE');
  const pendingHrEmployees = employees.filter((e) => e.status === 'PENDING_COMPANY_APPROVAL');

  const allPos = vendorId ? vendorPortalService.getPurchaseOrders(vendorId) : [];
  const purchaseOrders = ctxRelationship && ctxRelationship.id !== 'all'
    ? allPos.filter((po) => !po.client_company_id || po.client_company_id === ctxRelationship.company_id || po.client_company_id === ctxRelationship.id)
    : allPos;
  const openPurchaseOrders = purchaseOrders.filter((po) => po.status === 'ACTIVE' || po.status === 'ISSUED' || po.status === 'VENDOR_ACKNOWLEDGED');

  const allInvoices = vendorId ? vendorPortalService.getInvoices(vendorId) : [];
  const invoices = ctxRelationship && ctxRelationship.id !== 'all'
    ? allInvoices.filter((inv) => !inv.client_company_id || inv.client_company_id === ctxRelationship.company_id || inv.client_company_id === ctxRelationship.id)
    : allInvoices;
  const openInvoices = invoices.filter((inv) => ['SUBMITTED', 'VALIDATION', 'COMPANY_REVIEW', 'FINANCE_REVIEW'].includes(inv.status));
  const pendingMatches = invoices.filter((inv) => inv.match_status === 'MISMATCHED' || inv.match_status === 'EXCEPTION' || !inv.match_status);

  const payments = vendorId ? vendorPortalService.getPayments(vendorId) : [];
  const licenses = vendorId ? vendorPortalService.getLicenses(vendorId) : [];
  const expiringLicenses = licenses.filter((l) => l.status === 'EXPIRING_SOON' || l.status === 'CRITICAL');

  const activeScore = vendorPortalService.getComplianceScore(vendorId);
  const tasks = vendorPortalService.getComplianceCalendarTasks(effectivePeriod, vendorId);
  const overdueTasks = tasks.filter((t) => t.status === 'OVERDUE');
  const returns = vendorId ? vendorPortalService.getStatutoryReturns(vendorId) : [];
  const formVs = vendorId ? vendorPortalService.getFormVs(vendorId) : [];

  // Commercial aggregations
  const totalPayable = useMemo(() => {
    return invoices
      .filter((inv) => inv.status === 'APPROVED' || inv.status === 'FINANCE_REVIEW' || inv.status === 'PAYMENT_PROCESSING')
      .reduce((sum, inv) => sum + (inv.total_invoice_amount || 0), 0);
  }, [invoices]);

  return (
    <div className="space-y-6">
      {/* 1. Welcoming Header & Subtitle */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">
          Good morning, {ctxUser?.full_name || 'Vendor Admin'}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Manage your authorized client workforce, deployments, attendance, invoices and settlements.
        </p>
      </div>

      {/* 2. Compact Vendor Operations Summary Banner (Enterprise styling, no marketing hero) */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
              VENDOR OPERATIONS
            </span>
            <span className="text-xs text-gray-400 font-mono">
              Period: {effectivePeriod}
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            {effectiveVendor?.name || 'Vendor Organization'}
          </h2>
          <div className="flex items-center gap-2 flex-wrap text-xs text-gray-600 font-medium">
            <span className="font-semibold text-gray-900">{activeEmployees.length}</span> Active Workers
            <span className="text-gray-300">&bull;</span>
            <span className="font-semibold text-gray-900">{employees.length}</span> Active Deployments
            <span className="text-gray-300">&bull;</span>
            <span className="font-semibold text-gray-900">{activeRelationships.length}</span> Active Client Contract{activeRelationships.length !== 1 ? 's' : ''}
            <span className="text-gray-300">&bull;</span>
            <span className={`font-semibold ${expiringLicenses.length > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
              {expiringLicenses.length}
            </span> Critical Compliance Issues
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleNavigate('clients')}
            className="text-xs font-bold rounded-xl border-gray-200 hover:bg-gray-50 text-gray-700"
          >
            <Building2 className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
            View Client Workspaces
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => handleNavigate('workforce')}
            className="text-xs font-bold rounded-xl bg-[#07563D] hover:bg-[#064e37] text-white"
          >
            <Users className="w-3.5 h-3.5 mr-1.5" />
            Assigned Workforce
          </Button>
        </div>
      </div>

      {/* 3. KEY OPERATIONS Grid (6 Cards per Spec 6) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Active Workers */}
        <button
          type="button"
          onClick={() => handleNavigate('workforce')}
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs text-left hover:border-emerald-300 hover:shadow-xs transition group cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-emerald-700 mb-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Active Workers</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-gray-900 font-mono">{activeEmployees.length}</div>
          <div className="text-[10px] text-gray-400 mt-1 truncate">Contract staff on site</div>
        </button>

        {/* Active Deployments */}
        <button
          type="button"
          onClick={() => handleNavigate('deployments')}
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs text-left hover:border-emerald-300 hover:shadow-xs transition group cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-emerald-700 mb-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Deployments</span>
            <Layers className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-gray-900 font-mono">{employees.length}</div>
          <div className="text-[10px] text-gray-400 mt-1 truncate">Active site rosters</div>
        </button>

        {/* Pending HR Reviews */}
        <button
          type="button"
          onClick={() => handleNavigate('workforce')}
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs text-left hover:border-amber-300 hover:shadow-xs transition group cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-amber-700 mb-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Pending HR</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">{pendingHrEmployees.length}</div>
          <div className="text-[10px] text-gray-400 mt-1 truncate">Awaiting authorization</div>
        </button>

        {/* Open Invoices */}
        <button
          type="button"
          onClick={() => handleNavigate('invoices')}
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs text-left hover:border-blue-300 hover:shadow-xs transition group cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-blue-700 mb-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Open Invoices</span>
            <FileText className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-900 font-mono">{openInvoices.length}</div>
          <div className="text-[10px] text-gray-400 mt-1 truncate">Under client review</div>
        </button>

        {/* Pending 3-Way Matches */}
        <button
          type="button"
          onClick={() => handleNavigate('settlement')}
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs text-left hover:border-purple-300 hover:shadow-xs transition group cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-purple-700 mb-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">3-Way Match</span>
            <Activity className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-purple-900 font-mono">{pendingMatches.length}</div>
          <div className="text-[10px] text-gray-400 mt-1 truncate">Awaiting match check</div>
        </button>

        {/* Outstanding Payable */}
        <button
          type="button"
          onClick={() => handleNavigate('settlement')}
          className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-2xs text-left hover:border-emerald-300 hover:shadow-xs transition group cursor-pointer"
        >
          <div className="flex items-center justify-between text-gray-400 group-hover:text-emerald-700 mb-2">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Payables</span>
            <CircleDollarSign className="w-4 h-4 text-[#07563D]" />
          </div>
          <div className="text-lg font-black text-[#07563D] font-mono truncate">
            ₹{(totalPayable / 100000).toFixed(1)}L
          </div>
          <div className="text-[10px] text-gray-400 mt-1 truncate">Approved commercial due</div>
        </button>
      </div>

      {/* 4. Three Dedicated Operational Hubs: WORKFORCE | COMMERCIALS | COMPLIANCE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ===================================================================== */}
        {/* 4A. WORKFORCE HUB */}
        {/* ===================================================================== */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-[#07563D] flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">Workforce Operations</h3>
                  <p className="text-[11px] text-gray-400">Assigned workers & site rosters</p>
                </div>
              </div>
              <Badge variant="emerald" size="sm">
                {activeEmployees.length} Active
              </Badge>
            </div>

            {/* Sub-metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Recent Deployments</div>
                <div className="text-lg font-black text-gray-900 font-mono mt-0.5">{employees.length}</div>
                <div className="text-[10px] text-gray-400">All shifts covered</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Biometric Sync</div>
                <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">100%</div>
                <div className="text-[10px] text-gray-400">No punch gaps</div>
              </div>
            </div>

            {/* Recent Deployments Mini List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-700">Recent Assigned Personnel</div>
              {employees.slice(0, 3).map((emp) => (
                <div
                  key={emp.id}
                  className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition flex items-center justify-between text-xs"
                >
                  <div className="truncate pr-2">
                    <div className="font-bold text-gray-900 truncate">{emp.display_name}</div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {emp.designation} &bull; {emp.work_location || 'Main Facility'}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-[10px] shrink-0 border border-emerald-200">
                    {emp.status}
                  </span>
                </div>
              ))}
              {employees.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-400">
                  No assigned workers in current client context.
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleNavigate('workforce')}
            className="w-full text-xs font-bold text-[#07563D] hover:text-emerald-800 pt-3 border-t border-gray-100 flex items-center justify-between transition cursor-pointer"
          >
            <span>Manage Workforce Directory</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* ===================================================================== */}
        {/* 4B. COMMERCIALS HUB */}
        {/* ===================================================================== */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">Commercial Operations</h3>
                  <p className="text-[11px] text-gray-400">POs, Invoices & Settlement</p>
                </div>
              </div>
              <Badge variant="info" size="sm">
                {openPurchaseOrders.length} Open POs
              </Badge>
            </div>

            {/* Sub-metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Invoices Awaiting Match</div>
                <div className="text-lg font-black text-blue-900 font-mono mt-0.5">{pendingMatches.length}</div>
                <div className="text-[10px] text-gray-400">3-Way Verification</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Recent Payments</div>
                <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">{payments.length}</div>
                <div className="text-[10px] text-gray-400">UTR Disbursed</div>
              </div>
            </div>

            {/* Recent Invoices / POs Mini List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-700">Active Purchase Orders</div>
              {openPurchaseOrders.slice(0, 3).map((po) => (
                <div
                  key={po.id}
                  className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition flex items-center justify-between text-xs"
                >
                  <div className="truncate pr-2">
                    <div className="font-bold text-gray-900 font-mono truncate">{po.po_number}</div>
                    <div className="text-[10px] text-gray-500 truncate">
                      {po.client_company_name} &bull; ₹{po.contract_value.toLocaleString('en-IN')}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold text-[10px] shrink-0 border border-blue-200">
                    {po.status}
                  </span>
                </div>
              ))}
              {openPurchaseOrders.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-400">
                  No active purchase orders found.
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleNavigate('invoices')}
            className="w-full text-xs font-bold text-blue-700 hover:text-blue-900 pt-3 border-t border-gray-100 flex items-center justify-between transition cursor-pointer"
          >
            <span>Open Invoices & Commercials</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* ===================================================================== */}
        {/* 4C. COMPLIANCE HUB */}
        {/* ===================================================================== */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs p-5 space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-800 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-gray-900">Compliance & Statutory</h3>
                  <p className="text-[11px] text-gray-400">Licences, Form V & Remittances</p>
                </div>
              </div>
              <Badge variant="emerald" size="sm">
                Score: {activeScore?.overall_score || 88}%
              </Badge>
            </div>

            {/* Sub-metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Licences Expiring</div>
                <div className={`text-lg font-black font-mono mt-0.5 ${expiringLicenses.length > 0 ? 'text-amber-600' : 'text-emerald-700'}`}>
                  {expiringLicenses.length}
                </div>
                <div className="text-[10px] text-gray-400">30d - 90d window</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                <div className="text-[10px] font-bold text-gray-500 uppercase">Form V & Returns</div>
                <div className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                  {returns.filter((r) => r.status === 'VERIFIED').length}
                </div>
                <div className="text-[10px] text-gray-400">Statutory verified</div>
              </div>
            </div>

            {/* Upcoming Deadlines Mini List */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-gray-700">Upcoming Statutory Tasks</div>
              {tasks.slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="p-2.5 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-gray-50 transition flex items-center justify-between text-xs"
                >
                  <div className="truncate pr-2">
                    <div className="font-bold text-gray-900 truncate">{task.title}</div>
                    <div className="text-[10px] text-gray-500 truncate">
                      Due: {task.due_date} &bull; {task.assigned_to_role}
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md font-bold text-[10px] shrink-0 border ${
                      task.status === 'VERIFIED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : task.status === 'OVERDUE'
                        ? 'bg-rose-50 text-rose-800 border-rose-200'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              ))}
              {tasks.length === 0 && (
                <div className="text-center py-4 text-xs text-gray-400">
                  All compliance tasks up to date.
                </div>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleNavigate('licenses')}
            className="w-full text-xs font-bold text-emerald-800 hover:text-emerald-950 pt-3 border-t border-gray-100 flex items-center justify-between transition cursor-pointer"
          >
            <span>Open Compliance Hub & Licences</span>
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
