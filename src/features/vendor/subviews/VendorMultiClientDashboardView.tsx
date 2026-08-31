import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  ShieldCheck,
  ArrowUpRight,
  Plus,
  Clock,
  Ban,
  CheckCircle2,
  Sparkles,
  MapPin,
  FileText,
  Calendar,
  AlertTriangle,
  Layers,
  Lock,
} from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { vendorPortalService } from '../../../services/vendorPortalService';
import { VendorCompanyRelationship, VendorOrganization } from '../../../types/vendorPortal';
import { ConnectNewClientModal } from '../components/ConnectNewClientModal';

interface VendorMultiClientDashboardViewProps {
  activeVendor: VendorOrganization;
  onSelectClientCompany: (relationshipId: string) => void;
}

export const VendorMultiClientDashboardView: React.FC<VendorMultiClientDashboardViewProps> = ({
  activeVendor,
  onSelectClientCompany,
}) => {
  const [relationships, setRelationships] = useState<VendorCompanyRelationship[]>([]);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);

  const loadData = () => {
    setRelationships(vendorPortalService.getVendorCompanyRelationships(activeVendor.id));
  };

  useEffect(() => {
    loadData();
    const handleChanged = () => loadData();
    window.addEventListener('wf-vendor-relationship-changed', handleChanged);
    window.addEventListener('wf-vendor-changed', handleChanged);
    return () => {
      window.removeEventListener('wf-vendor-relationship-changed', handleChanged);
      window.removeEventListener('wf-vendor-changed', handleChanged);
    };
  }, [activeVendor.id]);

  const activeClients = relationships.filter((r) => r.status === 'ACTIVE');
  const pendingClients = relationships.filter((r) => r.status === 'PENDING_APPROVAL');
  const suspendedClients = relationships.filter((r) => r.status === 'SUSPENDED');
  const totalGlobalWorkers = relationships
    .filter((r) => r.status === 'ACTIVE')
    .reduce((sum, r) => sum + r.active_workers_count, 0);

  return (
    <div className="space-y-6">
      {/* Top Banner: Multi-Company Vendor Global Identity */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-3xl border border-indigo-500/20 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-200 font-semibold text-xs border border-indigo-400/30 flex items-center gap-1.5 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-indigo-300" /> Multi-Company Vendor Workspace
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Vendor Code: {activeVendor.code}
            </span>
          </div>
          <h2 className="text-xl lg:text-2xl font-black text-white tracking-tight">
            {activeVendor.name} — Global Client Portfolio
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Manage deployments, biometric timesheets, wage breakdowns, purchase orders, and tax invoices across multiple independent enterprise clients with strict data isolation.
          </p>
        </div>

        <div className="relative z-10 shrink-0">
          <Button
            onClick={() => setIsConnectModalOpen(true)}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-md"
            leftIcon={<Plus className="w-4 h-4" />}
          >
            Connect New Client Company
          </Button>
        </div>
      </div>

      {/* Global Portfolio KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Active Client Workspaces
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-gray-900 font-mono">
              {activeClients.length}
            </span>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Approved & Live
            </span>
          </div>
          <p className="text-[11px] text-gray-500 pt-1 border-t border-gray-100">
            Independent client security boundaries
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Total Deployed Workers
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-100">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-indigo-900 font-mono">
              {totalGlobalWorkers}
            </span>
            <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              Across All Sites
            </span>
          </div>
          <p className="text-[11px] text-gray-500 pt-1 border-t border-gray-100">
            Active on biometric gate passes
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Pending Approvals
            </span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-100">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-amber-600 font-mono">
              {pendingClients.length}
            </span>
            <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
              KYC Under Review
            </span>
          </div>
          <p className="text-[11px] text-gray-500 pt-1 border-t border-gray-100">
            Awaiting client company sign-off
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Suspended / Expired
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-100">
              <Ban className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-black text-rose-600 font-mono">
              {suspendedClients.length}
            </span>
            <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
              Access Blocked
            </span>
          </div>
          <p className="text-[11px] text-gray-500 pt-1 border-t border-gray-100">
            Contract renewal required
          </p>
        </div>
      </div>

      {/* Client Companies Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-gray-900 tracking-tight">
              Select Client Company Workspace
            </h3>
            <p className="text-xs text-gray-500">
              Click on an approved client company to enter its isolated operational workspace.
            </p>
          </div>
          <span className="text-xs font-bold text-gray-500 font-mono">
            {relationships.length} Total Relationships
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {relationships.map((rel) => {
            const isApproved = rel.status === 'ACTIVE';
            const isPending = rel.status === 'PENDING_APPROVAL';

            return (
              <div
                key={rel.id}
                className={`bg-white rounded-2xl border p-5 shadow-2xs transition-all flex flex-col justify-between gap-4 ${
                  isApproved
                    ? 'border-gray-200/90 hover:border-indigo-400 hover:shadow-md'
                    : isPending
                    ? 'border-amber-200 bg-amber-50/20'
                    : 'border-rose-200 bg-rose-50/20 opacity-80'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center border font-bold text-base shrink-0 ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : isPending
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}
                      >
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-500">
                            {rel.relationship_id}
                          </span>
                          <Badge
                            variant={
                              isApproved ? 'emerald' : isPending ? 'amber' : 'rose'
                            }
                            size="sm"
                          >
                            {rel.status === 'ACTIVE'
                              ? 'Active Connection'
                              : rel.status === 'PENDING_APPROVAL'
                              ? 'Pending Approval'
                              : 'Suspended'}
                          </Badge>
                        </div>
                        <h4 className="text-sm font-black text-gray-900 mt-0.5">
                          {rel.company_name}
                        </h4>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">
                        Deployed Workers
                      </span>
                      <p className="font-bold text-gray-900 font-mono">
                        {rel.active_workers_count} Active Staff
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">
                        Compliance Score
                      </span>
                      <p className="font-bold text-emerald-700 font-mono">
                        {rel.compliance_score}% (Audit Ready)
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">
                        Site Location
                      </span>
                      <p className="font-medium text-gray-700 truncate">
                        {rel.site_location}
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      <span className="text-[10px] text-gray-500 uppercase font-bold">
                        Agreement / SOW
                      </span>
                      <p className="font-mono font-bold text-indigo-700 truncate">
                        {rel.sow_number || 'SOW-ACTIVE'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-gray-500">
                    Contact: <strong className="text-gray-700">{rel.primary_hr_contact_name}</strong>
                  </div>

                  {isApproved ? (
                    <Button
                      size="sm"
                      onClick={() => onSelectClientCompany(rel.id)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                      rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}
                    >
                      Open Workspace
                    </Button>
                  ) : isPending ? (
                    <span className="text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" /> Awaiting Client Sign-off
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-rose-700 bg-rose-100 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Access Blocked
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Connect New Client Modal */}
      <ConnectNewClientModal
        isOpen={isConnectModalOpen}
        onClose={() => setIsConnectModalOpen(false)}
        onConnected={loadData}
      />
    </div>
  );
};
