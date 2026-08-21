import React, { useState, useEffect } from 'react';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import {
  CheckCircle2,
  ShieldCheck,
  Clock,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Layers,
  ArrowRight,
  UserCheck,
  AlertTriangle,
  Play,
  Search,
  Filter,
  Check,
  X,
  SlidersHorizontal,
  FileText,
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { getActiveOrgId } from '../../../services/attendance/biometricCommandService';
import { hrEventBus } from '../../../services/hrEventBus';

export interface ApprovalPolicyItem {
  id: string;
  code: string;
  name: string;
  module: string;
  description: string;
  sequence: string[];
  escalationHours: number;
  reminderHours: number;
  autoEscalate: boolean;
  status: 'Active' | 'Draft' | 'Paused';
  scope: string;
  updated_at: string;
}

const STORAGE_KEY = 'workforce_approval_engine_policies_v1';

const DEFAULT_POLICIES: ApprovalPolicyItem[] = [
  {
    id: 'pol-app-001',
    code: 'POL-ATT',
    name: 'Attendance & Regularization Approval',
    module: 'Attendance & Time',
    description: 'Handles mispunch claims, late arrival justifications, and manual punch overrides.',
    sequence: ['Reporting Manager', 'Department Head', 'HR Admin'],
    escalationHours: 24,
    reminderHours: 12,
    autoEscalate: true,
    status: 'Active',
    scope: 'Organization Wide',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pol-app-002',
    code: 'POL-LEAVE',
    name: 'Leave Management Policy',
    module: 'Leave & Absence',
    description: 'Sequential review for casual, sick, privilege, and comp-off leave requests.',
    sequence: ['Reporting Manager', 'Department Head'],
    escalationHours: 24,
    reminderHours: 8,
    autoEscalate: true,
    status: 'Active',
    scope: 'Organization Wide',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pol-app-003',
    code: 'POL-TRV',
    name: 'Travel & Expense Policy',
    module: 'Travel & Claims',
    description: 'Multi-tier financial verification and reimbursement approval workflow.',
    sequence: ['Reporting Manager', 'Department Head', 'Finance Head'],
    escalationHours: 48,
    reminderHours: 24,
    autoEscalate: true,
    status: 'Active',
    scope: 'Organization Wide',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pol-app-004',
    code: 'POL-PAY',
    name: 'Payroll Revision Policy',
    module: 'Payroll & Compensation',
    description: 'Executive tier signoff for compensation revisions and salary restructuring.',
    sequence: ['HR Head', 'Finance Head', 'CEO / Managing Director'],
    escalationHours: 72,
    reminderHours: 24,
    autoEscalate: false,
    status: 'Active',
    scope: 'Executive & Management',
    updated_at: new Date().toISOString(),
  },
];

export const ApprovalConfigView: React.FC = () => {
  const { showToast } = useToast();

  const getStorageKey = () => `${STORAGE_KEY}_${getActiveOrgId()}`;

  const loadPolicies = (): ApprovalPolicyItem[] => {
    if (typeof window === 'undefined') return DEFAULT_POLICIES;
    try {
      const raw = localStorage.getItem(getStorageKey());
      if (raw) return JSON.parse(raw);
      localStorage.setItem(getStorageKey(), JSON.stringify(DEFAULT_POLICIES));
      return DEFAULT_POLICIES;
    } catch (_) {
      return DEFAULT_POLICIES;
    }
  };

  const [policies, setPolicies] = useState<ApprovalPolicyItem[]>(loadPolicies);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');

  // Modal State for Create & Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);

  // Form Fields
  const [formCode, setFormCode] = useState('');
  const [formName, setFormName] = useState('');
  const [formModule, setFormModule] = useState('Attendance & Time');
  const [formDesc, setFormDesc] = useState('');
  const [formSequence, setFormSequence] = useState<string[]>(['Reporting Manager', 'Department Head']);
  const [formEscalationHours, setFormEscalationHours] = useState(24);
  const [formReminderHours, setFormReminderHours] = useState(12);
  const [formAutoEscalate, setFormAutoEscalate] = useState(true);
  const [formStatus, setFormStatus] = useState<'Active' | 'Draft' | 'Paused'>('Active');
  const [formScope, setFormScope] = useState('Organization Wide');

  // New Approver Tier input
  const [newTierRole, setNewTierRole] = useState('Reporting Manager');

  const saveToStorage = (updated: ApprovalPolicyItem[]) => {
    setPolicies(updated);
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(updated));
    } catch (_) {}
  };

  const handleOpenCreateModal = () => {
    setEditingPolicyId(null);
    setFormCode(`POL-${Math.floor(100 + Math.random() * 900)}`);
    setFormName('Custom Approval & Escalation Policy');
    setFormModule('Attendance & Time');
    setFormDesc('Configured approval tier sequence and escalation SLA timers.');
    setFormSequence(['Reporting Manager', 'HR Administrator']);
    setFormEscalationHours(24);
    setFormReminderHours(12);
    setFormAutoEscalate(true);
    setFormStatus('Active');
    setFormScope('Organization Wide');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p: ApprovalPolicyItem) => {
    setEditingPolicyId(p.id);
    setFormCode(p.code);
    setFormName(p.name);
    setFormModule(p.module);
    setFormDesc(p.description);
    setFormSequence([...p.sequence]);
    setFormEscalationHours(p.escalationHours);
    setFormReminderHours(p.reminderHours);
    setFormAutoEscalate(p.autoEscalate);
    setFormStatus(p.status);
    setFormScope(p.scope);
    setIsModalOpen(true);
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formCode.trim()) {
      showToast('Please enter Policy Code and Name', 'error');
      return;
    }

    if (formSequence.length === 0) {
      showToast('At least one approver tier is required in the sequence.', 'error');
      return;
    }

    if (editingPolicyId) {
      // Update existing
      const updated = policies.map(p => {
        if (p.id === editingPolicyId) {
          return {
            ...p,
            code: formCode,
            name: formName,
            module: formModule,
            description: formDesc,
            sequence: formSequence,
            escalationHours: formEscalationHours,
            reminderHours: formReminderHours,
            autoEscalate: formAutoEscalate,
            status: formStatus,
            scope: formScope,
            updated_at: new Date().toISOString(),
          };
        }
        return p;
      });
      saveToStorage(updated);
      showToast(`✓ Approval Policy ${formCode} updated successfully.`);
    } else {
      // Create new
      const newItem: ApprovalPolicyItem = {
        id: `pol-app-${Date.now()}`,
        code: formCode,
        name: formName,
        module: formModule,
        description: formDesc,
        sequence: formSequence,
        escalationHours: formEscalationHours,
        reminderHours: formReminderHours,
        autoEscalate: formAutoEscalate,
        status: formStatus,
        scope: formScope,
        updated_at: new Date().toISOString(),
      };
      const updated = [newItem, ...policies];
      saveToStorage(updated);
      showToast(`✓ New Approval Policy ${formCode} created successfully.`);
    }

    setIsModalOpen(false);
  };

  const handleDuplicate = (p: ApprovalPolicyItem) => {
    const duplicated: ApprovalPolicyItem = {
      ...p,
      id: `pol-app-${Date.now()}`,
      code: `${p.code}-COPY`,
      name: `${p.name} (Copy)`,
      status: 'Draft',
      updated_at: new Date().toISOString(),
    };
    const updated = [duplicated, ...policies];
    saveToStorage(updated);
    showToast(`✓ Duplicated ${p.code} into new Draft policy ${duplicated.code}`);
  };

  const handleDelete = (p: ApprovalPolicyItem) => {
    const updated = policies.filter(item => item.id !== p.id);
    saveToStorage(updated);
    showToast(`✓ Approval Policy ${p.code} removed.`);
  };

  const handleAddTier = () => {
    if (!newTierRole) return;
    setFormSequence(prev => [...prev, newTierRole]);
  };

  const handleRemoveTier = (idx: number) => {
    setFormSequence(prev => prev.filter((_, i) => i !== idx));
  };

  const filteredPolicies = policies.filter(p => {
    if (selectedModule !== 'ALL' && p.module !== selectedModule) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q) ||
        p.module.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-emerald-50 text-[#07563D]">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-black text-gray-900 tracking-tight">
              Unified Approval Engine & Escalation Policies
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800 rounded-full">
              Multi-Tier Routing
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Dynamic approver resolution, multi-tier sequence rules, temporary delegation, and SLA escalations
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="primary"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={handleOpenCreateModal}
            className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs"
          >
            Create Approval Policy
          </Button>
        </div>
      </div>

      {/* 2. Filter Strip */}
      <div className="flex items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-gray-200/80 shadow-xs flex-wrap text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <span className="text-gray-500 font-semibold">Module:</span>
          <select
            value={selectedModule}
            onChange={e => setSelectedModule(e.target.value)}
            className="px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold focus:outline-none"
          >
            <option value="ALL">All Modules</option>
            <option value="Attendance & Time">Attendance & Time</option>
            <option value="Leave & Absence">Leave & Absence</option>
            <option value="Travel & Claims">Travel & Claims</option>
            <option value="Payroll & Compensation">Payroll & Compensation</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search approval policy..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          />
        </div>
      </div>

      {/* 3. Policy Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPolicies.map(p => (
          <div
            key={p.id}
            className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4 hover:border-gray-400 hover:shadow-xs transition-all relative group flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#07563D] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {p.code}
                  </span>
                  <h3 className="text-base font-extrabold text-gray-900 mt-1">{p.name}</h3>
                  <span className="text-[11px] text-gray-400 font-medium">{p.module} • {p.scope}</span>
                </div>
                <Badge variant={p.status === 'Active' ? 'emerald' : p.status === 'Draft' ? 'amber' : 'gray'}>
                  {p.status}
                </Badge>
              </div>

              <p className="text-xs text-gray-600 line-clamp-2">{p.description}</p>

              <div className="space-y-2 text-xs">
                <span className="text-gray-400 font-bold uppercase text-[10px] block tracking-wide">Sequential Approver Chain</span>
                <div className="p-3 rounded-xl bg-gray-50/80 border border-gray-200/60">
                  <div className="flex items-center flex-wrap gap-2">
                    {p.sequence.map((role, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-lg border border-gray-200 text-gray-800 text-[11px] font-semibold shadow-2xs">
                          <span className="w-4 h-4 rounded-full bg-emerald-100 text-[#07563D] font-bold text-[9px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <span className="whitespace-nowrap">{role}</span>
                        </span>
                        {idx < p.sequence.length - 1 && (
                          <ArrowRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 text-[11px] pt-1 flex-wrap">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200/60 font-medium">
                    <Clock className="w-3 h-3 text-amber-600" />
                    <span>SLA: {p.escalationHours}h Escalation</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200/60 font-medium">
                    <span>🔔 {p.reminderHours}h Reminder</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs mt-2">
              <span className="text-[11px] text-gray-400 font-medium">
                Updated {new Date(p.updated_at).toLocaleDateString()}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(p)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-[#07563D] hover:bg-emerald-100 border border-emerald-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDuplicate(p)}
                  title="Clone Policy"
                  className="p-1.5 rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-gray-200 text-xs transition-all shadow-2xs cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(p)}
                  title="Delete Policy"
                  className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border border-rose-200 text-xs transition-all shadow-2xs cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 4. CREATE / EDIT APPROVAL POLICY MODAL */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingPolicyId ? `Edit Approval Policy: ${formCode}` : 'Create Unified Approval & Escalation Policy'}
          size="lg"
        >
          <form onSubmit={handleSavePolicy} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Policy Code *</label>
                <input
                  type="text"
                  value={formCode}
                  onChange={e => setFormCode(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg font-mono text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Policy Name *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Target Functional Module</label>
                <select
                  value={formModule}
                  onChange={e => setFormModule(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                >
                  <option value="Attendance & Time">Attendance & Time (Regularization/Mispunches)</option>
                  <option value="Leave & Absence">Leave & Absence</option>
                  <option value="Travel & Claims">Travel & Claims</option>
                  <option value="Payroll & Compensation">Payroll & Compensation</option>
                  <option value="Shift & Scheduling">Shift & Scheduling</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Policy Status</label>
                <select
                  value={formStatus}
                  onChange={e => setFormStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                >
                  <option value="Active">Active</option>
                  <option value="Draft">Draft</option>
                  <option value="Paused">Paused</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 font-bold mb-1">Description</label>
              <textarea
                rows={2}
                value={formDesc}
                onChange={e => setFormDesc(e.target.value)}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs"
              />
            </div>

            {/* Sequential Approver Chain Builder */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-3">
              <label className="block text-gray-800 font-bold">Sequential Approver Hierarchy (Step by Step)</label>
              
              <div className="space-y-2">
                {formSequence.map((role, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-50 text-[#07563D] font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-bold text-gray-800">{role}</span>
                    </div>
                    {formSequence.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveTier(idx)}
                        className="text-gray-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1">
                <select
                  value={newTierRole}
                  onChange={e => setNewTierRole(e.target.value)}
                  className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold"
                >
                  <option value="Reporting Manager">Reporting Manager (Direct Supervisor)</option>
                  <option value="Department Head">Department Head</option>
                  <option value="Functional Lead">Functional Lead</option>
                  <option value="HR Administrator">HR Administrator</option>
                  <option value="Finance Head">Finance Head</option>
                  <option value="CEO / Managing Director">CEO / Managing Director</option>
                </select>
                <Button type="button" size="xs" variant="outline" onClick={handleAddTier}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Approver Tier
                </Button>
              </div>
            </div>

            {/* Escalation SLA & Timers */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Escalation SLA (Hours)</label>
                <input
                  type="number"
                  value={formEscalationHours}
                  onChange={e => setFormEscalationHours(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
                <span className="text-[10px] text-gray-500">Auto-routes to next tier if pending</span>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Reminder Trigger (Hours)</label>
                <input
                  type="number"
                  value={formReminderHours}
                  onChange={e => setFormReminderHours(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
                <span className="text-[10px] text-gray-500">Sends notification reminder to approver</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" variant="primary" className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold">
                {editingPolicyId ? 'Update Policy' : 'Save & Activate Policy'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
