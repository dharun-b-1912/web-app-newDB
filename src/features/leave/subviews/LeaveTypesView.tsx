import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { LeaveType, LeaveCategory } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  Plus,
  Sliders,
  CheckCircle,
  XCircle,
  FileText,
  Shield,
  Edit2,
  Trash2,
  Paperclip,
  Clock,
  Layers,
} from 'lucide-react';

export const LeaveTypesView: React.FC = () => {
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [editingType, setEditingType] = useState<Partial<LeaveType> | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    setTypes(leaveApi.getLeaveTypes());
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
      employment_types: ['Full Time'],
      min_service_days: 0,
      max_days_per_request: 5,
      min_days_per_request: 0.5,
      allow_half_day: true,
      allow_hourly: false,
      allow_negative_balance: false,
      allow_carry_forward: false,
      allow_encashment: false,
      attachment_required: false,
      approval_required: true,
      allow_backdated: true,
      allow_future: true,
      allow_cancellation: true,
      allow_modification: true,
      converts_to_lop_if_exhausted: true,
      applicable_locations: ['All'],
      applicable_departments: ['All'],
      applicable_employee_groups: ['All'],
    });
    setIsDrawerOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingType && editingType.name && editingType.code) {
      leaveApi.saveLeaveType(editingType as LeaveType);
      setTypes(leaveApi.getLeaveTypes());
      setIsDrawerOpen(false);
      setEditingType(null);
    }
  };

  const toggleActive = (type: LeaveType) => {
    const updated = { ...type, is_active: !type.is_active };
    leaveApi.saveLeaveType(updated);
    setTypes(leaveApi.getLeaveTypes());
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#07563D]" />
            <span>Master Leave Types Architecture</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure custom leave classifications, statutory rules, gender applicability, and validation constraints
          </p>
        </div>
        <button
          onClick={handleOpenNew}
          className="px-4 py-2.5 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Custom Leave Type</span>
        </button>
      </div>

      {/* Grid of Leave Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {types.map(t => (
          <div
            key={t.id}
            className={`bg-white p-5 rounded-2xl border transition-all ${
              t.is_active ? 'border-gray-200/80 hover:border-[#07563D]/40 shadow-2xs' : 'border-gray-200 opacity-60 bg-gray-50/50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black font-mono bg-gray-100 text-gray-800 px-2 py-0.5 rounded-md">
                    {t.code}
                  </span>
                  <h3 className="text-sm font-extrabold text-gray-900">{t.name}</h3>
                </div>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{t.description}</p>
              </div>
              <button
                onClick={() => toggleActive(t)}
                className={`p-1 rounded-full transition-colors ${t.is_active ? 'text-emerald-600' : 'text-gray-400'}`}
                title="Toggle Active Status"
              >
                {t.is_active ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </button>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-gray-400 font-bold block">Category</span>
                <span className="font-extrabold text-gray-800">{t.category}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold block">Paid / Unpaid</span>
                <Badge variant={t.is_paid ? 'emerald' : 'danger'} size="sm">
                  {t.is_paid ? 'Paid' : 'Unpaid LOP'}
                </Badge>
              </div>
              <div>
                <span className="text-gray-400 font-bold block">Gender Rule</span>
                <span className="font-extrabold text-gray-800">{t.gender_applicability}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold block">Max Days/Req</span>
                <span className="font-mono font-bold text-gray-900">{t.max_days_per_request} Days</span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1 text-[10px]">
              {t.allow_half_day && <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md">Half Day</span>}
              {t.allow_carry_forward && <span className="bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-md">Carry Forward</span>}
              {t.allow_encashment && <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md">Encashable</span>}
              {t.attachment_required && <span className="bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-md">Attachment Required</span>}
            </div>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="text-[10px] text-gray-400 font-medium">Updated: {new Date(t.updated_at).toLocaleDateString()}</span>
              <button
                onClick={() => {
                  setEditingType(t);
                  setIsDrawerOpen(true);
                }}
                className="text-xs font-bold text-[#07563D] hover:underline flex items-center gap-1"
              >
                <Edit2 className="w-3 h-3" />
                <span>Configure</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Slide-over Configuration Drawer */}
      {isDrawerOpen && editingType && (
        <div className="fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col p-6 overflow-y-auto">
            <h3 className="text-base font-black text-gray-900 border-b border-gray-200 pb-4">
              {editingType.code ? `Edit Leave Type: ${editingType.code}` : 'Create New Leave Type'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4 mt-4 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">Leave Code *</label>
                  <input
                    type="text"
                    required
                    value={editingType.code || ''}
                    onChange={e => setEditingType({ ...editingType, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. CL, SL, PL"
                    className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700">Leave Name *</label>
                  <input
                    type="text"
                    required
                    value={editingType.name || ''}
                    onChange={e => setEditingType({ ...editingType, name: e.target.value })}
                    placeholder="e.g. Casual Leave"
                    className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700">Description</label>
                <textarea
                  rows={2}
                  value={editingType.description || ''}
                  onChange={e => setEditingType({ ...editingType, description: e.target.value })}
                  className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">Category</label>
                  <select
                    value={editingType.category || 'Paid'}
                    onChange={e => setEditingType({ ...editingType, category: e.target.value as LeaveCategory })}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="Paid">Paid Leave</option>
                    <option value="Unpaid">Unpaid Leave (LOP)</option>
                    <option value="Statutory">Statutory / Special</option>
                    <option value="Compensatory">Compensatory</option>
                    <option value="OptionalHoliday">Optional Holiday</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700">Gender Applicability</label>
                  <select
                    value={editingType.gender_applicability || 'All'}
                    onChange={e => setEditingType({ ...editingType, gender_applicability: e.target.value as any })}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-xs font-semibold"
                  >
                    <option value="All">All Genders</option>
                    <option value="Male">Male Only</option>
                    <option value="Female">Female Only</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-700">Max Days per Request</label>
                  <input
                    type="number"
                    value={editingType.max_days_per_request || 5}
                    onChange={e => setEditingType({ ...editingType, max_days_per_request: parseFloat(e.target.value) })}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700">Min Service Requirement (Days)</label>
                  <input
                    type="number"
                    value={editingType.min_service_days || 0}
                    onChange={e => setEditingType({ ...editingType, min_service_days: parseInt(e.target.value) })}
                    className="w-full mt-1 p-2 border border-gray-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              {/* Toggles Group */}
              <div className="space-y-2 pt-3 border-t border-gray-200 text-xs font-bold text-gray-800">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingType.allow_half_day || false}
                    onChange={e => setEditingType({ ...editingType, allow_half_day: e.target.checked })}
                    className="rounded text-[#07563D]"
                  />
                  <span>Allow Half-Day Requests</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingType.allow_carry_forward || false}
                    onChange={e => setEditingType({ ...editingType, allow_carry_forward: e.target.checked })}
                    className="rounded text-[#07563D]"
                  />
                  <span>Allow Year-End Carry Forward</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingType.allow_encashment || false}
                    onChange={e => setEditingType({ ...editingType, allow_encashment: e.target.checked })}
                    className="rounded text-[#07563D]"
                  />
                  <span>Allow Leave Encashment</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingType.attachment_required || false}
                    onChange={e => setEditingType({ ...editingType, attachment_required: e.target.checked })}
                    className="rounded text-[#07563D]"
                  />
                  <span>Require Supporting Document / Attachment</span>
                </label>
              </div>

              <div className="pt-6 border-t border-gray-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-xs font-bold text-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-[#07563D] text-white text-xs font-bold shadow-xs hover:bg-[#05402e]"
                >
                  Save Leave Type
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
