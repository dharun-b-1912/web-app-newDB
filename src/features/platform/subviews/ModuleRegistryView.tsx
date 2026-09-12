// src/features/platform/subviews/ModuleRegistryView.tsx
// ============================================================================
// Joy PeopleHR — Platform Portal: Module Registry & Feature Lifecycle Control
// Authoritative Multi-Tenant Control Plane for Module Statuses
// ============================================================================

import React, { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import { Modal } from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { useToast } from '../../../components/ui/Toast';
import {
  Layers,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Sparkles,
  History,
  ShieldCheck,
  Globe,
  Smartphone,
  Eye,
  Edit,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import {
  moduleRegistryService,
} from '../../../services/platform/moduleRegistryService';
import {
  ModuleRegistryItem,
  ModuleLifecycleStatus,
  ModuleStatusAuditEntry,
} from '../../../types/moduleRegistry';
import { useAuth } from '../../../hooks/useAuth';

export const ModuleRegistryView: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [modules, setModules] = useState<ModuleRegistryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditLogs, setAuditLogs] = useState<ModuleStatusAuditEntry[]>([]);

  // Edit status modal
  const [selectedModule, setSelectedModule] = useState<ModuleRegistryItem | null>(null);
  const [newStatus, setNewStatus] = useState<ModuleLifecycleStatus>('LIVE');
  const [statusReason, setStatusReason] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const loadData = () => {
    const list = moduleRegistryService.getAllModules();
    setModules(list);
    setAuditLogs(moduleRegistryService.getAuditLogs());
  };

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener('platform:module_status_changed', handleUpdate);
    return () => window.removeEventListener('platform:module_status_changed', handleUpdate);
  }, []);

  const handleOpenEdit = (mod: ModuleRegistryItem) => {
    setSelectedModule(mod);
    setNewStatus(mod.status);
    setStatusReason('');
    setIsEditModalOpen(true);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModule) return;

    try {
      await moduleRegistryService.updateModuleStatus(
        selectedModule.module_key,
        newStatus,
        {
          id: user?.id || 'admin-super',
          name: user?.name || 'Platform Super Admin',
        },
        statusReason || `Status changed from ${selectedModule.status} to ${newStatus}`
      );
      showToast(`Module "${selectedModule.module_name}" set to ${newStatus}`, 'success');
      setIsEditModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Error updating module status', 'error');
    }
  };

  const filteredModules = modules.filter((m) => {
    const matchesSearch =
      m.module_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.module_key.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter;
    const matchesCategory = categoryFilter === 'ALL' || m.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: ModuleLifecycleStatus) => {
    switch (status) {
      case 'LIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 text-[10px] font-black uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            LIVE
          </span>
        );
      case 'BETA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 border border-indigo-200 text-[10px] font-black uppercase tracking-wider">
            <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
            BETA
          </span>
        );
      case 'DEVELOPMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-black uppercase tracking-wider">
            DEVELOPMENT
          </span>
        );
      case 'PAUSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider">
            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
            PAUSED
          </span>
        );
      case 'HIDDEN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 border border-gray-300 text-[10px] font-bold uppercase tracking-wider">
            <Lock className="w-2.5 h-2.5 text-gray-500" />
            HIDDEN
          </span>
        );
      case 'DEPRECATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-50 text-red-800 border border-red-200 text-[10px] font-bold uppercase tracking-wider">
            DEPRECATED
          </span>
        );
    }
  };

  const getCertBadge = (cert: string) => {
    if (cert === 'LAUNCH_CERTIFIED') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Certified
        </span>
      );
    }
    if (cert === 'IN_PROGRESS') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700">
          <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
          In Progress
        </span>
      );
    }
    return (
      <span className="text-[11px] font-medium text-gray-400">
        Post-Launch
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Product Management Control Plane</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Module Registry & Lifecycle Governance
          </h1>
          <p className="text-xs text-gray-500 mt-0.5 max-w-2xl">
            Control production visibility, route accessibility, and release scopes across all 24 Joy PeopleHR platform domains.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAuditModalOpen(true)}
            className="text-xs gap-1.5 rounded-xl border-gray-200 shadow-2xs"
          >
            <History className="w-3.5 h-3.5 text-gray-500" />
            Audit Logs ({auditLogs.length})
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 rounded-2xl border-gray-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search modules by name, key, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D] bg-gray-50/50"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs p-2 rounded-xl border border-gray-200 bg-white focus:ring-[#07563D] font-medium text-gray-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="LIVE">LIVE Only</option>
              <option value="PAUSED">PAUSED Only</option>
              <option value="BETA">BETA Only</option>
              <option value="DEVELOPMENT">DEVELOPMENT</option>
              <option value="HIDDEN">HIDDEN</option>
            </select>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs p-2 rounded-xl border border-gray-200 bg-white focus:ring-[#07563D] font-medium text-gray-700"
            >
              <option value="ALL">All Categories</option>
              <option value="CORE_HR">Core HR</option>
              <option value="ATTENDANCE_LEAVE">Attendance & Leave</option>
              <option value="PAYROLL_FINANCE">Payroll & Finance</option>
              <option value="VENDOR_ECOSYSTEM">Vendor Ecosystem</option>
              <option value="PERFORMANCE_GROWTH">Performance</option>
              <option value="LEARNING_DEVELOPMENT">Learning & LMS</option>
              <option value="ANALYTICS_INTELLIGENCE">Analytics</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Module Grid / Table */}
      <Card className="rounded-3xl border-gray-200/80 shadow-2xs overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/80">
              <TableHead className="font-bold text-gray-700 text-xs">Module & Domain</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs">Current Status</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-center">Launch Scope</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-center">Navigation</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs text-center">Route Access</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs">Certification</TableHead>
              <TableHead className="font-bold text-gray-700 text-xs">Channels</TableHead>
              <TableHead className="text-right font-bold text-gray-700 text-xs">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredModules.map((mod) => (
              <TableRow key={mod.module_key} className="hover:bg-gray-50/50 transition-colors">
                <TableCell>
                  <div className="font-bold text-xs text-gray-900 flex items-center gap-2">
                    <span className="font-mono text-[11px] text-gray-400">[{mod.module_key}]</span>
                    {mod.module_name}
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 flex items-center gap-2">
                    <span className="font-semibold text-gray-600">{mod.category}</span>
                    <span>•</span>
                    <span className="text-gray-400">{mod.planned_phase}</span>
                    {mod.dependencies.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="text-amber-700 font-mono text-[10px]">
                          Depends: {mod.dependencies.join(', ')}
                        </span>
                      </>
                    )}
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(mod.status)}</TableCell>
                <TableCell className="text-center">
                  {mod.launch_scope ? (
                    <Badge variant="emerald" size="sm" className="text-[10px] font-black">
                      SEP 26
                    </Badge>
                  ) : (
                    <Badge variant="neutral" size="sm" className="text-[10px] text-gray-400">
                      POST-LAUNCH
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {mod.navigation_visible ? (
                    <span className="text-emerald-600 font-bold text-xs">Visible</span>
                  ) : (
                    <span className="text-gray-400 font-medium text-xs">Hidden</span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  {mod.route_accessible ? (
                    <span className="text-emerald-600 font-bold text-xs">Active</span>
                  ) : (
                    <span className="text-amber-600 font-bold text-xs">Guarded</span>
                  )}
                </TableCell>
                <TableCell>{getCertBadge(mod.certification_status)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Globe className={`w-3.5 h-3.5 ${mod.web_enabled ? 'text-emerald-700' : 'text-gray-300'}`} />
                    <Smartphone className={`w-3.5 h-3.5 ${mod.mobile_enabled ? 'text-emerald-700' : 'text-gray-300'}`} />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenEdit(mod)}
                    className="text-xs text-[#07563D] hover:bg-emerald-50 gap-1 rounded-lg"
                  >
                    <Edit className="w-3 h-3" />
                    Configure
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* Modal: Edit Module Status */}
      {selectedModule && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Configure Lifecycle Status: ${selectedModule.module_name}`}
          description={`Update deployment status and access barriers for [${selectedModule.module_key}]`}
        >
          <form onSubmit={handleSaveStatus} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Target Lifecycle Status
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ModuleLifecycleStatus)}
                className="w-full bg-white border border-gray-200 text-gray-900 text-xs rounded-xl p-2.5 focus:ring-[#07563D] focus:border-[#07563D] font-bold"
              >
                <option value="LIVE">LIVE — Production Enabled (Included in Launch Scope)</option>
                <option value="BETA">BETA — Controlled Preview for Authorized Tenants</option>
                <option value="DEVELOPMENT">DEVELOPMENT — Active Internal Development Only</option>
                <option value="PAUSED">PAUSED — Code Preserved, Hidden from Production</option>
                <option value="HIDDEN">HIDDEN — Intentionally Invisible</option>
                <option value="DEPRECATED">DEPRECATED — Read-only Legacy Archive</option>
              </select>
            </div>

            {newStatus === 'LIVE' && selectedModule.status === 'PAUSED' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Launch Scope Confirmation Required
                </div>
                <p className="text-[11px] leading-relaxed">
                  Enabling this module LIVE will make it immediately visible to all authorized customer organizations. Ensure all backend contracts and UI workflows are 100% launch-certified.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Audit Reason / Change Rationale
              </label>
              <textarea
                rows={3}
                placeholder="State the technical or business justification for changing this module status..."
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                required
                className="w-full p-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" className="bg-[#07563D] hover:bg-[#0b7a57] text-white">
                Save & Apply Status
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: Audit Log Trail */}
      <Modal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        title="Module Lifecycle Audit Trail"
        description="Immutable record of all platform module status transitions"
      >
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-400">
              No status modifications recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {auditLogs.map((log) => (
                <div key={log.id} className="p-3.5 rounded-xl bg-gray-50 border border-gray-200/70 text-xs space-y-1">
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-gray-900">{log.module_name}</span>
                    <span className="text-[10px] font-mono text-gray-400">
                      {new Date(log.changed_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 font-mono">
                      {log.previous_status}
                    </span>
                    <span>→</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold font-mono">
                      {log.new_status}
                    </span>
                    <span className="text-gray-400">• By {log.changed_by}</span>
                  </div>
                  <p className="text-[11px] text-gray-600 italic mt-1">"{log.reason}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
