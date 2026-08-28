import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { LeaveType, LeaveCategory } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  Plus,
  SlidersHorizontal,
  CheckCircle,
  XCircle,
  FileText,
  Shield,
  Edit2,
  Trash2,
  Paperclip,
  Clock,
  Layers,
  X,
  Search,
  Check,
  AlertTriangle,
  History,
  Coins,
  FileCheck,
  Zap,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';

export const LeaveTypesView: React.FC = () => {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Modal State
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingType, setEditingType] = useState<Partial<LeaveType> | null>(null);
  const [activeModalTab, setActiveModalTab] = useState<
    'general' | 'eligibility' | 'rules' | 'accrual' | 'carryForward' | 'encashment' | 'documents' | 'approval' | 'audit'
  >('general');

  const loadLeaveTypes = () => {
    setTypes(leaveApi.getLeaveTypes());
  };

  useEffect(() => {
    loadLeaveTypes();
    const unsub = hrEventBus.subscribe('leave.*', () => {
      loadLeaveTypes();
    });
    return () => unsub();
  }, []);

  const handleOpenNew = () => {
    setEditingType({
      id: `lt-${Date.now()}`,
      code: '',
      name: '',
      description: '',
      category: 'Paid',
      is_paid: true,
      is_active: true,
      gender_applicability: 'All',
      employment_types: ['Full Time', 'Confirmed'],
      min_service_days: 0,
      max_days_per_request: 14,
      min_days_per_request: 0.5,
      max_consecutive_days: 30,
      min_notice_days: 2,
      allow_half_day: true,
      allow_hourly: false,
      allow_negative_balance: false,
      max_negative_balance_days: 0,
      allow_carry_forward: true,
      max_carry_forward_days: 10,
      carry_forward_expiry_months: 3,
      allow_encashment: false,
      min_balance_for_encashment: 15,
      max_encashment_days: 10,
      encashment_salary_component: 'Basic',
      attachment_required: false,
      attachment_mandatory_days_threshold: 2,
      reason_required: true,
      approval_required: true,
      approval_levels: 2,
      allow_backdated: true,
      max_backdated_days: 3,
      allow_future: true,
      allow_cancellation: true,
      allow_modification: true,
      converts_to_lop_if_exhausted: true,
      applicable_locations: ['All'],
      applicable_departments: ['All'],
      applicable_employee_groups: ['All'],
      applicable_designations: ['All'],
      applicable_grades: ['All'],
      probation_rule: 'FullAccess',
    });
    setActiveModalTab('general');
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (t: LeaveType) => {
    setEditingType({ ...t });
    setActiveModalTab('general');
    setIsDrawerOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingType && editingType.name && editingType.code) {
      leaveApi.saveLeaveType(editingType as LeaveType);
      setTypes(leaveApi.getLeaveTypes());
      setIsDrawerOpen(false);
      setEditingType(null);
    } else {
      alert('Please fill in Name and Code.');
    }
  };

  const toggleActive = (type: LeaveType) => {
    const updated = { ...type, is_active: !type.is_active };
    leaveApi.saveLeaveType(updated);
    setTypes(leaveApi.getLeaveTypes());
  };

  const handleDelete = (type: LeaveType) => {
    if (confirm(`Are you sure you want to delete or deactivate ${type.name}?`)) {
      try {
        const res = leaveApi.deleteLeaveType(type.id);
        alert(res.message);
        setTypes(leaveApi.getLeaveTypes());
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const filteredTypes = types.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
    const matchesStatus =
      statusFilter === 'All' || (statusFilter === 'Active' ? t.is_active : !t.is_active);
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-[#07563D]" />
            <span>Master Leave Types Configuration</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure custom leave classifications, statutory limits, eligibility rules, and approval policies
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="px-4 py-2.5 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create Custom Leave Type</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-xs">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search leave types by name, code..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-xl text-xs bg-white w-full"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-xl text-xs font-bold bg-white"
          >
            <option value="All">All Categories</option>
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Statutory">Statutory</option>
            <option value="Compensatory">Compensatory</option>
            <option value="OptionalHoliday">Optional Holiday</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="p-2 border border-gray-300 rounded-xl text-xs font-bold bg-white"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive / Archived</option>
          </select>
        </div>
      </div>

      {/* Structured Table */}
      <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
              <th className="p-4">Code & Name</th>
              <th className="p-4">Category</th>
              <th className="p-4">Gender & Eligibility</th>
              <th className="p-4 text-center">Request Limits</th>
              <th className="p-4 text-center">Accrual & Carry Forward</th>
              <th className="p-4 text-center">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {filteredTypes.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-xs text-gray-400">
                  No leave types match your filter criteria.
                </td>
              </tr>
            ) : (
              filteredTypes.map(t => (
                <tr key={t.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                        {t.code}
                      </span>
                      <strong className="text-gray-900 font-extrabold">{t.name}</strong>
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{t.description}</p>
                  </td>

                  <td className="p-4">
                    <Badge
                      variant={
                        t.category === 'Paid'
                          ? 'emerald'
                          : t.category === 'Statutory'
                          ? 'purple'
                          : t.category === 'Compensatory'
                          ? 'blue'
                          : 'amber'
                      }
                      size="sm"
                    >
                      {t.category}
                    </Badge>
                  </td>

                  <td className="p-4 text-gray-700">
                    <span className="font-bold">{t.gender_applicability} Genders</span>
                    <span className="block text-[11px] text-gray-400">
                      {(t.employment_types || []).join(', ')}
                    </span>
                  </td>

                  <td className="p-4 text-center font-mono">
                    <span className="font-bold text-gray-800">
                      {t.min_days_per_request} – {t.max_days_per_request} d
                    </span>
                    <span className="block text-[10px] text-gray-400">
                      Notice: {t.min_notice_days || 0}d
                    </span>
                  </td>

                  <td className="p-4 text-center font-mono">
                    {t.allow_carry_forward ? (
                      <span className="text-emerald-700 font-bold">
                        Max CF: {t.max_carry_forward_days || 0}d
                      </span>
                    ) : (
                      <span className="text-gray-400">No CF</span>
                    )}
                    {t.allow_encashment && (
                      <span className="block text-[10px] text-amber-700 font-semibold">Encashable</span>
                    )}
                  </td>

                  <td className="p-4 text-center">
                    <button
                      onClick={() => toggleActive(t)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors cursor-pointer',
                        t.is_active
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                          : 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-200'
                      )}
                    >
                      {t.is_active ? 'Active' : 'Inactive'}
                    </button>
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(t)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors"
                        title="Edit Configuration"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="p-1.5 rounded-lg hover:bg-rose-50 text-gray-400 hover:text-rose-700 transition-colors"
                        title="Delete / Deactivate"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 9-Tab Create / Edit Modal Drawer */}
      {isDrawerOpen && editingType && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2.5">
                <span className="p-2 rounded-xl bg-[#07563D]/10 text-[#07563D]">
                  <SlidersHorizontal className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    {editingType.id && types.some(t => t.id === editingType.id)
                      ? `Edit Leave Type: ${editingType.name}`
                      : 'Create Custom Leave Type Architecture'}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Configure multi-dimensional leave parameters across 9 specialized domain tabs
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-xl hover:bg-gray-200 text-gray-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 9 Tab Navigation Strip */}
            <div className="flex items-center gap-1 overflow-x-auto px-5 py-2.5 border-b border-gray-100 bg-gray-50/30 text-xs font-bold scrollbar-none">
              {[
                { id: 'general', label: '1. General' },
                { id: 'eligibility', label: '2. Eligibility' },
                { id: 'rules', label: '3. Request Rules' },
                { id: 'accrual', label: '4. Accrual' },
                { id: 'carryForward', label: '5. Carry Forward' },
                { id: 'encashment', label: '6. Encashment' },
                { id: 'documents', label: '7. Documents' },
                { id: 'approval', label: '8. Approval' },
                { id: 'audit', label: '9. Audit' },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveModalTab(tab.id as any)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl transition-all whitespace-nowrap cursor-pointer',
                    activeModalTab === tab.id
                      ? 'bg-[#07563D] text-white shadow-2xs'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Tab 1: General */}
              {activeModalTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Leave Type Name *</label>
                      <input
                        type="text"
                        required
                        value={editingType.name || ''}
                        onChange={e => setEditingType({ ...editingType, name: e.target.value })}
                        placeholder="e.g. Privilege Leave"
                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-semibold"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Leave Code *</label>
                      <input
                        type="text"
                        required
                        value={editingType.code || ''}
                        onChange={e => setEditingType({ ...editingType, code: e.target.value.toUpperCase() })}
                        placeholder="e.g. PL"
                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-mono font-bold uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={editingType.description || ''}
                      onChange={e => setEditingType({ ...editingType, description: e.target.value })}
                      placeholder="Purpose of this leave classification..."
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
                      <select
                        value={editingType.category || 'Paid'}
                        onChange={e => setEditingType({ ...editingType, category: e.target.value as LeaveCategory })}
                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-bold"
                      >
                        <option value="Paid">Paid Leave</option>
                        <option value="Unpaid">Unpaid / Loss of Pay (LOP)</option>
                        <option value="Statutory">Statutory Leave (e.g. Maternity)</option>
                        <option value="Compensatory">Compensatory Off</option>
                        <option value="OptionalHoliday">Optional / Restricted Holiday</option>
                        <option value="Custom">Custom</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-6 pt-5">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                        <input
                          type="checkbox"
                          checked={editingType.is_paid ?? true}
                          onChange={e => setEditingType({ ...editingType, is_paid: e.target.checked })}
                          className="rounded text-[#07563D] focus:ring-[#07563D] w-4 h-4"
                        />
                        <span>Paid Leave (Zero Salary Deduction)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                        <input
                          type="checkbox"
                          checked={editingType.is_active ?? true}
                          onChange={e => setEditingType({ ...editingType, is_active: e.target.checked })}
                          className="rounded text-[#07563D] focus:ring-[#07563D] w-4 h-4"
                        />
                        <span>Active in System</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Eligibility */}
              {activeModalTab === 'eligibility' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Gender Applicability</label>
                      <select
                        value={editingType.gender_applicability || 'All'}
                        onChange={e => setEditingType({ ...editingType, gender_applicability: e.target.value as any })}
                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-bold"
                      >
                        <option value="All">All Genders</option>
                        <option value="Female">Female Only (e.g. Maternity)</option>
                        <option value="Male">Male Only (e.g. Paternity)</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Minimum Service Requirement (Days)</label>
                      <input
                        type="number"
                        min="0"
                        value={editingType.min_service_days ?? 0}
                        onChange={e => setEditingType({ ...editingType, min_service_days: Number(e.target.value) })}
                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Probation Period Rule</label>
                    <select
                      value={editingType.probation_rule || 'FullAccess'}
                      onChange={e => setEditingType({ ...editingType, probation_rule: e.target.value as any })}
                      className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-semibold"
                    >
                      <option value="FullAccess">Full Access (Allowed during probation)</option>
                      <option value="AccrueOnly">Accrue Only (Cannot apply until confirmed)</option>
                      <option value="Ineligible">Ineligible (No accrual or leave during probation)</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Tab 3: Request Rules */}
              {activeModalTab === 'rules' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Min Days / Request</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        value={editingType.min_days_per_request ?? 0.5}
                        onChange={e => setEditingType({ ...editingType, min_days_per_request: Number(e.target.value) })}
                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Max Days / Request</label>
                      <input
                        type="number"
                        min="1"
                        value={editingType.max_days_per_request ?? 14}
                        onChange={e => setEditingType({ ...editingType, max_days_per_request: Number(e.target.value) })}
                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Min Advance Notice (Days)</label>
                      <input
                        type="number"
                        min="0"
                        value={editingType.min_notice_days ?? 2}
                        onChange={e => setEditingType({ ...editingType, min_notice_days: Number(e.target.value) })}
                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800">
                      <input
                        type="checkbox"
                        checked={editingType.allow_half_day ?? true}
                        onChange={e => setEditingType({ ...editingType, allow_half_day: e.target.checked })}
                        className="rounded text-[#07563D] focus:ring-[#07563D] w-4 h-4"
                      />
                      <span>Allow Half Day</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800">
                      <input
                        type="checkbox"
                        checked={editingType.allow_hourly ?? false}
                        onChange={e => setEditingType({ ...editingType, allow_hourly: e.target.checked })}
                        className="rounded text-[#07563D] focus:ring-[#07563D] w-4 h-4"
                      />
                      <span>Allow Hourly Permission</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800">
                      <input
                        type="checkbox"
                        checked={editingType.allow_negative_balance ?? false}
                        onChange={e => setEditingType({ ...editingType, allow_negative_balance: e.target.checked })}
                        className="rounded text-[#07563D] focus:ring-[#07563D] w-4 h-4"
                      />
                      <span>Allow Negative Balance</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800">
                      <input
                        type="checkbox"
                        checked={editingType.allow_backdated ?? true}
                        onChange={e => setEditingType({ ...editingType, allow_backdated: e.target.checked })}
                        className="rounded text-[#07563D] focus:ring-[#07563D] w-4 h-4"
                      />
                      <span>Allow Backdated Requests</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800">
                      <input
                        type="checkbox"
                        checked={editingType.allow_cancellation ?? true}
                        onChange={e => setEditingType({ ...editingType, allow_cancellation: e.target.checked })}
                        className="rounded text-[#07563D] focus:ring-[#07563D] w-4 h-4"
                      />
                      <span>Allow Cancellation</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800">
                      <input
                        type="checkbox"
                        checked={editingType.converts_to_lop_if_exhausted ?? true}
                        onChange={e => setEditingType({ ...editingType, converts_to_lop_if_exhausted: e.target.checked })}
                        className="rounded text-[#07563D] focus:ring-[#07563D] w-4 h-4"
                      />
                      <span>Convert to LOP if Exhausted</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Tab 4: Accrual */}
              {activeModalTab === 'accrual' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Annual Quota (Days / Year) *</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={editingType.annual_quota ?? 12}
                        onChange={e => {
                          const quota = Number(e.target.value);
                          const freq = editingType.accrual_frequency || 'Monthly';
                          const monthlyRate = freq === 'Monthly' ? Number((quota / 12).toFixed(2)) : quota;
                          setEditingType({
                            ...editingType,
                            annual_quota: quota,
                            monthly_accrual_rate: monthlyRate,
                          });
                        }}
                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-mono font-bold text-gray-900"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Accrual Frequency</label>
                      <select
                        value={editingType.accrual_frequency || 'Monthly'}
                        onChange={e => {
                          const freq = e.target.value as any;
                          const quota = editingType.annual_quota ?? 12;
                          const monthlyRate = freq === 'Monthly' ? Number((quota / 12).toFixed(2)) : quota;
                          setEditingType({
                            ...editingType,
                            accrual_frequency: freq,
                            monthly_accrual_rate: monthlyRate,
                          });
                        }}
                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-bold"
                      >
                        <option value="Monthly">Monthly (Accrued 1st of every month)</option>
                        <option value="Quarterly">Quarterly (Accrued each quarter)</option>
                        <option value="Yearly">Yearly Upfront (Accrued Jan 1st)</option>
                        <option value="JoiningDateBased">Joining Date Anniversary</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Credit Schedule Day</label>
                      <input
                        type="number"
                        min="1"
                        max="28"
                        value={editingType.accrual_credit_day ?? 1}
                        onChange={e => setEditingType({ ...editingType, accrual_credit_day: Number(e.target.value) })}
                        placeholder="e.g. 1st of month"
                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-800">
                      <input
                        type="checkbox"
                        checked={editingType.prorate_first_year ?? true}
                        onChange={e => setEditingType({ ...editingType, prorate_first_year: e.target.checked })}
                        className="rounded text-[#07563D] focus:ring-[#07563D] w-4 h-4"
                      />
                      <span>Pro-rate annual quota for new employees based on joining month</span>
                    </label>
                  </div>

                  {/* Dynamic Calculation Banner */}
                  {(() => {
                    const quota = editingType.annual_quota ?? 12;
                    const freq = editingType.accrual_frequency || 'Monthly';
                    const monthlyRate = freq === 'Monthly' ? (quota / 12) : freq === 'Quarterly' ? (quota / 4) : quota;
                    const curMonth = new Date().getMonth() + 1; // 1-12
                    const accruedToCurrentMonth = (monthlyRate * curMonth).toFixed(1);

                    const months = [
                      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
                    ];

                    return (
                      <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-xs space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-2">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse"></span>
                            <span className="font-bold text-emerald-950">
                              Auto-Accrual Math: {quota} Annual Days ÷ 12 Months = <span className="text-emerald-700 font-extrabold">{monthlyRate.toFixed(2)} Day(s)</span> credited per month
                            </span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900 font-bold text-[11px]">
                            Current (Month {curMonth}): ~{accruedToCurrentMonth} Days Accrued
                          </span>
                        </div>

                        {/* 12-Month Pro-rated Accrual Schedule Matrix */}
                        <div>
                          <div className="text-[11px] font-bold text-emerald-900 mb-2">
                            12-Month Automated Accrual Schedule & Cumulative Progression:
                          </div>
                          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                            {months.map((m, idx) => {
                              const monthNum = idx + 1;
                              const isCurrent = monthNum === curMonth;
                              const isPassed = monthNum <= curMonth;
                              const cumulative = (monthlyRate * monthNum).toFixed(1);

                              return (
                                <div
                                  key={m}
                                  className={cn(
                                    'p-2 rounded-xl border text-center transition-all',
                                    isCurrent
                                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-300'
                                      : isPassed
                                      ? 'bg-emerald-100/60 border-emerald-300 text-emerald-950'
                                      : 'bg-white/80 border-gray-200 text-gray-600'
                                  )}
                                >
                                  <div className="text-[10px] font-extrabold uppercase tracking-wider">{m}</div>
                                  <div className={cn('text-xs font-black my-0.5', isCurrent ? 'text-white' : 'text-emerald-900')}>
                                    +{monthlyRate.toFixed(2)}d
                                  </div>
                                  <div className={cn('text-[9px]', isCurrent ? 'text-emerald-100' : 'text-gray-500')}>
                                    Cumul: {cumulative}d
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Tab 5: Carry Forward */}
              {activeModalTab === 'carryForward' && (
                <div className="space-y-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={editingType.allow_carry_forward ?? true}
                      onChange={e => setEditingType({ ...editingType, allow_carry_forward: e.target.checked })}
                      className="rounded text-[#07563D] focus:ring-[#07563D] w-4 h-4"
                    />
                    <span>Enable Year-End Carry Forward</span>
                  </label>

                  {editingType.allow_carry_forward && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Max Carry Forward Days</label>
                        <input
                          type="number"
                          min="0"
                          value={editingType.max_carry_forward_days ?? 10}
                          onChange={e => setEditingType({ ...editingType, max_carry_forward_days: Number(e.target.value) })}
                          className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Carry Forward Expiry (Months)</label>
                        <input
                          type="number"
                          min="0"
                          value={editingType.carry_forward_expiry_months ?? 3}
                          onChange={e => setEditingType({ ...editingType, carry_forward_expiry_months: Number(e.target.value) })}
                          placeholder="0 = No Expiry"
                          className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 6: Encashment */}
              {activeModalTab === 'encashment' && (
                <div className="space-y-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={editingType.allow_encashment ?? false}
                      onChange={e => setEditingType({ ...editingType, allow_encashment: e.target.checked })}
                      className="rounded text-[#07563D] focus:ring-[#07563D] w-4 h-4"
                    />
                    <span>Allow Encashment of Unused Balance</span>
                  </label>

                  {editingType.allow_encashment && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Min Balance to Encash</label>
                        <input
                          type="number"
                          min="0"
                          value={editingType.min_balance_for_encashment ?? 15}
                          onChange={e => setEditingType({ ...editingType, min_balance_for_encashment: Number(e.target.value) })}
                          className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Max Days / Year</label>
                        <input
                          type="number"
                          min="1"
                          value={editingType.max_encashment_days ?? 10}
                          onChange={e => setEditingType({ ...editingType, max_encashment_days: Number(e.target.value) })}
                          className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-gray-700 mb-1">Salary Basis</label>
                        <select
                          value={editingType.encashment_salary_component || 'Basic'}
                          onChange={e => setEditingType({ ...editingType, encashment_salary_component: e.target.value as any })}
                          className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-bold"
                        >
                          <option value="Basic">Basic Salary Only</option>
                          <option value="Gross">Gross Salary</option>
                          <option value="Fixed">Fixed Daily Rate</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 7: Documents */}
              {activeModalTab === 'documents' && (
                <div className="space-y-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input
                      type="checkbox"
                      checked={editingType.attachment_required ?? false}
                      onChange={e => setEditingType({ ...editingType, attachment_required: e.target.checked })}
                      className="rounded text-[#07563D] focus:ring-[#07563D] w-4 h-4"
                    />
                    <span>Require Supporting Document / Attachment</span>
                  </label>

                  {editingType.attachment_required && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Mandatory Threshold (Days)</label>
                      <input
                        type="number"
                        min="1"
                        value={editingType.attachment_mandatory_days_threshold ?? 2}
                        onChange={e => setEditingType({ ...editingType, attachment_mandatory_days_threshold: Number(e.target.value) })}
                        placeholder="e.g. 2 days or more requires doctor certificate"
                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-mono max-w-xs"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Tab 8: Approval */}
              {activeModalTab === 'approval' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">Approval Levels</label>
                      <select
                        value={editingType.approval_levels ?? 2}
                        onChange={e => setEditingType({ ...editingType, approval_levels: Number(e.target.value) })}
                        className="w-full p-2.5 border border-gray-300 rounded-xl text-xs bg-white font-bold"
                      >
                        <option value={1}>1 Level (Reporting Manager Only)</option>
                        <option value={2}>2 Levels (Manager → HR Admin)</option>
                        <option value={3}>3 Levels (Manager → Department Head → HR)</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-6">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                        <input
                          type="checkbox"
                          checked={editingType.reason_required ?? true}
                          onChange={e => setEditingType({ ...editingType, reason_required: e.target.checked })}
                          className="rounded text-[#07563D] focus:ring-[#07563D] w-4 h-4"
                        />
                        <span>Mandatory Justification Reason</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 9: Audit */}
              {activeModalTab === 'audit' && (
                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Record ID:</span>
                      <span className="font-mono font-bold text-gray-800">{editingType.id}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Created At:</span>
                      <span className="font-mono text-gray-800">{editingType.created_at || 'New'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Modified:</span>
                      <span className="font-mono text-gray-800">{editingType.updated_at || 'Just now'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 text-xs font-bold hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Leave Type</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
