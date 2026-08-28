import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { LeavePolicy, LeaveType } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  FileCheck,
  Plus,
  Play,
  Sliders,
  CheckCircle,
  Building,
  Layers,
  Sparkles,
  HelpCircle,
  Clock,
  AlertTriangle,
  Users,
  Shield,
  Search,
  Check,
  X,
  Edit2,
  Trash2,
  ChevronRight,
  Info,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export const LeavePoliciesView: React.FC = () => {
  const [policies, setPolicies] = useState<LeavePolicy[]>([]);
  const [types, setTypes] = useState<LeaveType[]>([]);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [conflicts, setConflicts] = useState<string[]>([]);

  // Simulation State
  const [simDays, setSimDays] = useState<number>(4);
  const [simSandwich, setSimSandwich] = useState<boolean>(true);
  const [simWeeklyOff, setSimWeeklyOff] = useState<boolean>(true);
  const [simHoliday, setSimHoliday] = useState<boolean>(true);

  // Modals
  const [isAssignedEmployeesModalOpen, setIsAssignedEmployeesModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Partial<LeavePolicy> | null>(null);

  useEffect(() => {
    const loadedPolicies = leaveApi.getLeavePolicies();
    const loadedTypes = leaveApi.getLeaveTypes();
    setPolicies(loadedPolicies);
    setTypes(loadedTypes);
    if (loadedPolicies.length > 0) {
      setSelectedPolicyId(loadedPolicies[0].id);
    }
    setConflicts(leaveApi.detectPolicyConflicts());
  }, []);

  const activePol = policies.find(p => p.id === selectedPolicyId) || policies[0];

  const handleOpenNewPolicy = () => {
    setEditingPolicy({
      id: `pol-${Date.now()}`,
      code: `POL-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`,
      name: '',
      description: '',
      company_id: 'tenant-joy-01',
      applicable_groups: ['All Staff'],
      employment_types: ['Full Time', 'Confirmed'],
      departments: ['All'],
      locations: ['All Locations'],
      grades: ['All'],
      designations: ['All'],
      effective_from: '2026-01-01',
      status: 'Active',
      priority: policies.length + 1,
      precedence_rule: 'SpecificOverGeneral',
      version: 1,
      rules: types.slice(0, 3).map(t => ({
        leave_type_id: t.id,
        annual_entitlement: 18,
        accrual_frequency: 'Monthly',
        accrual_amount_per_cycle: 1.5,
        accrual_start: 'JoiningDate',
        proration_method: 'CalendarDays',
        allow_carry_forward: t.allow_carry_forward,
        max_carry_forward_days: t.max_carry_forward_days || 10,
        carry_forward_expiry_months: 3,
        allow_encashment: t.allow_encashment,
        max_encashment_days_per_year: 10,
        min_balance_for_encashment: 15,
        encashment_calculation_basis: 'BasicSalary',
        allow_half_day: t.allow_half_day,
        allow_hourly: false,
        max_hourly_per_month: 0,
        allow_negative_balance: false,
        max_negative_balance: 0,
        advance_notice_days: t.min_notice_days || 2,
        allow_backdated: true,
        max_backdated_days: 3,
        attachment_required: t.attachment_required,
        sandwich_rule_enabled: true,
        exclude_holidays: true,
        exclude_weekly_offs: true,
      })),
    });
    setIsEditModalOpen(true);
  };

  const handleSavePolicy = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPolicy && editingPolicy.name && editingPolicy.code) {
      leaveApi.saveLeavePolicy(editingPolicy as LeavePolicy);
      const updated = leaveApi.getLeavePolicies();
      setPolicies(updated);
      setConflicts(leaveApi.detectPolicyConflicts());
      setIsEditModalOpen(false);
      setEditingPolicy(null);
    }
  };

  const handleDeletePolicy = (polId: string) => {
    if (confirm('Are you sure you want to delete this leave policy?')) {
      leaveApi.deleteLeavePolicy(polId);
      const updated = leaveApi.getLeavePolicies();
      setPolicies(updated);
      if (updated.length > 0) setSelectedPolicyId(updated[0].id);
      setConflicts(leaveApi.detectPolicyConflicts());
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-[#07563D]" />
            <span>Enterprise Leave Policy Architecture & Precedence Engine</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Configure multi-tiered policy assignment rules, accrual schemes, sandwich rules, and conflict resolution
          </p>
        </div>
        <button
          onClick={handleOpenNewPolicy}
          className="px-4 py-2.5 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Leave Policy</span>
        </button>
      </div>

      {/* Conflict & Precedence Resolution Alert */}
      {conflicts.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="font-black block">Policy Assignment Overlap Detected</strong>
            <p className="text-[11px] text-amber-800">
              Multiple active policies match overlapping employee groups. The precedence engine resolves assignments by:
              <strong className="underline ml-1">Specific Department/Location &gt; Employee Group &gt; Organization Default</strong> (Priority Rank).
            </p>
            <ul className="list-disc list-inside text-[11px] font-mono text-amber-950 pt-1">
              {conflicts.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Main 2-Column Policy Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Policies Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-black text-gray-500 uppercase tracking-wider">
              Configured Policies ({policies.length})
            </span>
          </div>

          <div className="space-y-2">
            {policies.map(pol => {
              const isSelected = pol.id === selectedPolicyId;
              return (
                <div
                  key={pol.id}
                  onClick={() => setSelectedPolicyId(pol.id)}
                  className={cn(
                    'p-4 rounded-2xl border transition-all cursor-pointer space-y-2 text-left bg-white',
                    isSelected
                      ? 'border-[#07563D] ring-2 ring-[#07563D]/10 shadow-sm'
                      : 'border-gray-200/80 hover:border-gray-300 shadow-2xs'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                      {pol.code}
                    </span>
                    <Badge variant={pol.status === 'Active' ? 'emerald' : 'neutral'} size="sm">
                      {pol.status}
                    </Badge>
                  </div>

                  <h3 className="text-xs font-extrabold text-gray-900 leading-tight">
                    {pol.name}
                  </h3>

                  <p className="text-[11px] text-gray-500 line-clamp-2">
                    {pol.description}
                  </p>

                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                    <span>Priority: #{pol.priority || 1}</span>
                    <span>{pol.rules.length} Rule(s) Configured</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Policy Detail Inspector & Simulator */}
        {activePol && (
          <div className="lg:col-span-2 space-y-6">
            {/* Policy Meta Card */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-[#07563D] bg-emerald-50 px-2.5 py-0.5 rounded-lg">
                      {activePol.code}
                    </span>
                    <h3 className="text-sm font-black text-gray-900">{activePol.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{activePol.description}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAssignedEmployeesModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Users className="w-3.5 h-3.5 text-gray-500" />
                    <span>Assigned Staff (142)</span>
                  </button>
                  <button
                    onClick={() => {
                      setEditingPolicy({ ...activePol });
                      setIsEditModalOpen(true);
                    }}
                    className="p-2 rounded-xl bg-gray-100 hover:bg-[#07563D] hover:text-white text-gray-700 transition-colors cursor-pointer"
                    title="Edit Policy"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Assignment Scope Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Locations</span>
                  <strong className="text-gray-900">{(activePol.locations || []).join(', ')}</strong>
                </div>
                <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Departments</span>
                  <strong className="text-gray-900">{(activePol.departments || []).join(', ')}</strong>
                </div>
                <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Employment</span>
                  <strong className="text-gray-900">{(activePol.employment_types || []).join(', ')}</strong>
                </div>
                <div className="p-3 rounded-xl bg-gray-50/70 border border-gray-100">
                  <span className="text-[10px] font-bold text-gray-400 uppercase block">Effective From</span>
                  <strong className="text-gray-900 font-mono">{activePol.effective_from}</strong>
                </div>
              </div>

              {/* Policy Rule Matrix Table */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  Leave Allocation & Entitlement Matrix
                </h4>

                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50/80 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                        <th className="p-3">Leave Type</th>
                        <th className="p-3">Annual Entitlement</th>
                        <th className="p-3">Accrual Mode</th>
                        <th className="p-3">Carry Forward</th>
                        <th className="p-3">Encashment</th>
                        <th className="p-3">Sandwich Rule</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {activePol.rules.map(r => {
                        const lt = types.find(t => t.id === r.leave_type_id);
                        return (
                          <tr key={r.leave_type_id} className="hover:bg-gray-50/50">
                            <td className="p-3 font-bold text-gray-900">
                              {lt ? lt.name : r.leave_type_id}
                              <span className="block text-[10px] font-mono text-gray-400">
                                {lt ? lt.code : ''}
                              </span>
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-800">
                              {r.annual_entitlement} Days / Yr
                            </td>
                            <td className="p-3 font-medium text-gray-700">
                              {r.accrual_frequency}
                              <span className="block text-[10px] text-gray-400">
                                +{r.accrual_amount_per_cycle}d / cycle
                              </span>
                            </td>
                            <td className="p-3 font-mono">
                              {r.allow_carry_forward ? (
                                <span className="text-emerald-700 font-bold">Max {r.max_carry_forward_days}d</span>
                              ) : (
                                <span className="text-gray-400">No</span>
                              )}
                            </td>
                            <td className="p-3 font-mono">
                              {r.allow_encashment ? (
                                <span className="text-amber-700 font-bold">Max {r.max_encashment_days_per_year}d</span>
                              ) : (
                                <span className="text-gray-400">No</span>
                              )}
                            </td>
                            <td className="p-3">
                              {r.sandwich_rule_enabled ? (
                                <Badge variant="purple" size="sm">Enabled</Badge>
                              ) : (
                                <Badge variant="neutral" size="sm">Disabled</Badge>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Policy Calculation Simulator Sandbox */}
            <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2 text-indigo-700">
                  <Play className="w-4 h-4 fill-indigo-700" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-900">
                    Policy Calculation & Sandwich Simulator Sandbox
                  </h4>
                </div>
                <span className="text-[10px] text-gray-400 font-mono">Live Rule Engine</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">
                    Simulate Applied Days
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    value={simDays}
                    onChange={e => setSimDays(Number(e.target.value))}
                    className="w-full p-2 border border-gray-300 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="sim-sandwich"
                    checked={simSandwich}
                    onChange={e => setSimSandwich(e.target.checked)}
                    className="rounded text-[#07563D]"
                  />
                  <label htmlFor="sim-sandwich" className="text-xs font-bold text-gray-700 cursor-pointer">
                    Sandwich Rule
                  </label>
                </div>

                <div className="flex items-center gap-2 pt-4">
                  <input
                    type="checkbox"
                    id="sim-wo"
                    checked={simWeeklyOff}
                    onChange={e => setSimWeeklyOff(e.target.checked)}
                    className="rounded text-[#07563D]"
                  />
                  <label htmlFor="sim-wo" className="text-xs font-bold text-gray-700 cursor-pointer">
                    Exclude Weekly Offs
                  </label>
                </div>

                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-center">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase block">Deducted Result</span>
                  <span className="text-lg font-black font-mono text-emerald-950">
                    {simDays + (simSandwich && !simWeeklyOff ? 2 : 0)} Days
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Assigned Employees Counter Modal */}
      {isAssignedEmployeesModalOpen && activePol && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#07563D]" />
                <div>
                  <h3 className="text-sm font-black text-gray-900">
                    Staff Assigned to {activePol.name}
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Matches: {(activePol.employment_types || []).join(', ')} • {(activePol.locations || []).join(', ')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAssignedEmployeesModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 text-xs divide-y divide-gray-100">
              {[
                { name: 'Dharun B', id: 'EMP-1001', dept: 'Engineering', loc: 'Coimbatore', role: 'Staff Engineer' },
                { name: 'Priya Sundaram', id: 'EMP-1002', dept: 'Product', loc: 'Bengaluru', role: 'Product Manager' },
                { name: 'Karthik Raja', id: 'EMP-1003', dept: 'Operations', loc: 'Coimbatore', role: 'Operations Lead' },
                { name: 'Ananya Sharma', id: 'EMP-1004', dept: 'Engineering', loc: 'Bengaluru', role: 'Frontend Engineer' },
                { name: 'Vikram Menon', id: 'EMP-1005', dept: 'Sales', loc: 'Bengaluru', role: 'Account Executive' },
              ].map(emp => (
                <div key={emp.id} className="pt-2 flex items-center justify-between">
                  <div>
                    <strong className="text-gray-900 block">{emp.name}</strong>
                    <span className="text-[11px] text-gray-500 font-mono">
                      {emp.id} • {emp.dept} • {emp.role}
                    </span>
                  </div>
                  <Badge variant="neutral" size="sm">{emp.loc}</Badge>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setIsAssignedEmployeesModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Create Policy Modal */}
      {isEditModalOpen && editingPolicy && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-[#07563D]" />
                <h3 className="text-sm font-black text-gray-900">
                  {editingPolicy.name ? `Edit Policy: ${editingPolicy.name}` : 'Create Enterprise Leave Policy'}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-500 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSavePolicy} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Policy Name *</label>
                  <input
                    type="text"
                    required
                    value={editingPolicy.name || ''}
                    onChange={e => setEditingPolicy({ ...editingPolicy, name: e.target.value })}
                    placeholder="e.g. Standard Corporate Policy"
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-semibold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Policy Code *</label>
                  <input
                    type="text"
                    required
                    value={editingPolicy.code || ''}
                    onChange={e => setEditingPolicy({ ...editingPolicy, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. POL-CORP-2026"
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-mono uppercase font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-gray-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={editingPolicy.description || ''}
                  onChange={e => setEditingPolicy({ ...editingPolicy, description: e.target.value })}
                  placeholder="Scope and intent of policy..."
                  className="w-full p-2.5 border border-gray-300 rounded-xl bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Priority Rank (1 = Highest)</label>
                  <input
                    type="number"
                    min="1"
                    value={editingPolicy.priority ?? 1}
                    onChange={e => setEditingPolicy({ ...editingPolicy, priority: Number(e.target.value) })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Precedence Rule</label>
                  <select
                    value={editingPolicy.precedence_rule || 'SpecificOverGeneral'}
                    onChange={e => setEditingPolicy({ ...editingPolicy, precedence_rule: e.target.value as any })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-semibold"
                  >
                    <option value="SpecificOverGeneral">Specific Over General</option>
                    <option value="SeniorityBased">Seniority Based</option>
                    <option value="HighestEntitlement">Highest Entitlement</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Effective Date</label>
                  <input
                    type="date"
                    value={editingPolicy.effective_from || '2026-01-01'}
                    onChange={e => setEditingPolicy({ ...editingPolicy, effective_from: e.target.value })}
                    className="w-full p-2.5 border border-gray-300 rounded-xl bg-white font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-300 text-gray-700 font-bold hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Save Policy</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
