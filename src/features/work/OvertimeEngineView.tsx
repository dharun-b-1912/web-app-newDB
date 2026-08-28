import React, { useState, useEffect } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { useToast } from '../../components/ui/Toast';
import {
  TrendingUp,
  Clock,
  Calendar,
  DollarSign,
  AlertTriangle,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Building2,
  Factory,
  Laptop,
  ShoppingCart,
  HeartPulse,
  HardHat,
  Info,
  ChevronRight,
  ShieldCheck,
  Zap,
  Lock,
  Layers,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import {
  IndustryPreset,
  WorkHourRecord,
  OvertimeDashboardMetrics,
  WorkException,
  OvertimePolicy,
} from '../../types/workOvertime';
import { workOvertimeService } from '../../services/workOvertimeService';

const PRESET_ICONS: Record<IndustryPreset, React.ElementType> = {
  CORPORATE: Building2,
  MANUFACTURING: Factory,
  IT_SERVICES: Laptop,
  RETAIL: ShoppingCart,
  HEALTHCARE: HeartPulse,
  CONSTRUCTION: HardHat,
};

const PRESET_NAMES: Record<IndustryPreset, string> = {
  CORPORATE: 'Corporate / Office',
  MANUFACTURING: 'Manufacturing & Plant Ops',
  IT_SERVICES: 'IT & Project Releases',
  RETAIL: 'Retail & Store Operations',
  HEALTHCARE: 'Healthcare & Clinical Shifts',
  CONSTRUCTION: 'Construction & Field Sites',
};

export const OvertimeEngineView: React.FC = () => {
  const { showToast } = useToast();
  const [metrics, setMetrics] = useState<OvertimeDashboardMetrics>(() => workOvertimeService.getDashboardMetrics());
  const [activePreset, setActivePreset] = useState<IndustryPreset>(() => workOvertimeService.getActivePreset());
  const [workHours, setWorkHours] = useState<WorkHourRecord[]>(() => workOvertimeService.getWorkHourRecords());
  const [exceptions, setExceptions] = useState<WorkException[]>(() => workOvertimeService.getWorkExceptions());
  const [policy, setPolicy] = useState<OvertimePolicy>(() => workOvertimeService.getPolicy());
  const [selectedRecordForDrawer, setSelectedRecordForDrawer] = useState<WorkHourRecord | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [filterDepartment, setFilterDepartment] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const refreshData = () => {
    setMetrics(workOvertimeService.getDashboardMetrics());
    setActivePreset(workOvertimeService.getActivePreset());
    setWorkHours(workOvertimeService.getWorkHourRecords());
    setExceptions(workOvertimeService.getWorkExceptions());
    setPolicy(workOvertimeService.getPolicy());
  };

  useEffect(() => {
    const handleUpdate = () => refreshData();
    window.addEventListener('work-overtime:updated', handleUpdate);
    return () => window.removeEventListener('work-overtime:updated', handleUpdate);
  }, []);

  const handleSwitchPreset = (preset: IndustryPreset) => {
    workOvertimeService.setActivePreset(preset);
    setActivePreset(preset);
    showToast(`Operational mode switched to ${PRESET_NAMES[preset]} with industry rule defaults!`);
    refreshData();
  };

  const handleResolveException = (id: string) => {
    workOvertimeService.resolveException(id, 'Resolved and authorized by Department Manager');
    showToast('Exception verified and cleared for payroll calculation');
    refreshData();
  };

  const filteredWorkHours = workHours.filter(record => {
    if (filterDepartment !== 'ALL' && record.department !== filterDepartment) return false;
    if (filterStatus !== 'ALL' && record.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Preset Selector */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100 text-[#07563D]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 tracking-tight">Work & Overtime Calculation Engine</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-[#07563D] border border-emerald-200">
                  {policy.version}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Centralized operational layer evaluating attendance punches, scheduled rosters, break deductions, and rate multipliers
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<SlidersHorizontal className="w-4 h-4" />}
            onClick={() => setIsConfigModalOpen(true)}
          >
            Configure Rules
          </Button>
        </div>
      </div>

      {/* Operational Industry Presets Bar */}
      <div className="bg-gray-50/80 p-2.5 rounded-2xl border border-gray-200/70 flex items-center gap-1.5 overflow-x-auto">
        <span className="text-[11px] font-black uppercase tracking-wider text-gray-500 px-2 shrink-0">
          Operational Mode:
        </span>
        {(Object.keys(PRESET_NAMES) as IndustryPreset[]).map(preset => {
          const Icon = PRESET_ICONS[preset];
          const isSelected = activePreset === preset;
          return (
            <button
              key={preset}
              onClick={() => handleSwitchPreset(preset)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-white text-[#07563D] shadow-xs border border-emerald-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-[#07563D]' : 'text-gray-400'}`} />
              <span>{PRESET_NAMES[preset]}</span>
            </button>
          );
        })}
      </div>

      {/* Manufacturing Plant Operational Live Card (Active when Manufacturing Mode is active) */}
      {activePreset === 'MANUFACTURING' && (
        <Card className="p-5 bg-gradient-to-br from-emerald-950 via-gray-900 to-gray-900 text-white rounded-2xl border border-emerald-900 shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 font-bold">
                <Factory className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-widest">Plant 1 — Live Floor Control</div>
                <div className="text-base font-bold">Shift B (Evening) & Shift C (Night Prep)</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Line Coverage: {metrics.active_plant_coverage_percent}%
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4">
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Scheduled Staff</div>
              <div className="text-xl font-black text-white mt-0.5">48 Operators</div>
              <div className="text-[10px] text-emerald-400">45 Checked-in (94%)</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">On Break</div>
              <div className="text-xl font-black text-white mt-0.5">6 Workers</div>
              <div className="text-[10px] text-gray-400">Meal & Tea intervals</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Active OT Workers</div>
              <div className="text-xl font-black text-amber-400 mt-0.5">{metrics.workers_on_ot_count} Workers</div>
              <div className="text-[10px] text-amber-300">Surge target dispatch</div>
            </div>
            <div>
              <div className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Coverage Risk</div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">0 Stations</div>
              <div className="text-[10px] text-gray-400">All machines staffed</div>
            </div>
          </div>
        </Card>
      )}

      {/* Top Summary Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="p-3.5 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">OT Today</div>
          <div className="text-xl font-black text-gray-900 mt-0.5">{metrics.ot_today_hours}h</div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">{metrics.workers_on_ot_count} on duty</div>
        </Card>

        <Card className="p-3.5 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">OT This Week</div>
          <div className="text-xl font-black text-gray-900 mt-0.5">{metrics.ot_week_hours}h</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Current Cycle</div>
        </Card>

        <Card className="p-3.5 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">OT This Month</div>
          <div className="text-xl font-black text-gray-900 mt-0.5">{metrics.ot_month_hours}h</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Aug 2026</div>
        </Card>

        <Card className="p-3.5 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pending Requests</div>
          <div className="text-xl font-black text-amber-600 mt-0.5">{metrics.pending_requests_count}</div>
          <div className="text-[10px] text-amber-700 font-semibold mt-0.5">Requires Action</div>
        </Card>

        <Card className="p-3.5 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Projected OT</div>
          <div className="text-xl font-black text-blue-600 mt-0.5">{metrics.projected_ot_hours}h</div>
          <div className="text-[10px] text-blue-700 mt-0.5">Estimated End-of-Day</div>
        </Card>

        <Card className="p-3.5 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Policy Exceptions</div>
          <div className="text-xl font-black text-rose-600 mt-0.5">{metrics.policy_exceptions_count}</div>
          <div className="text-[10px] text-rose-700 font-semibold mt-0.5">Threshold Alerts</div>
        </Card>

        <Card className="p-3.5 bg-white rounded-2xl border border-gray-200/80 shadow-xs">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Estimated OT Cost</div>
          <div className="text-xl font-black text-[#07563D] mt-0.5">₹{metrics.estimated_ot_cost.toLocaleString()}</div>
          <div className="text-[10px] text-emerald-700 mt-0.5">Payroll Accrual</div>
        </Card>
      </div>

      {/* Main Operational Table */}
      <Card className="p-5 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">Live Work & Overtime Roster</h3>
            <p className="text-xs text-gray-500 mt-0.5">Click on any record to inspect the explainable calculation breakdown drawer</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterDepartment}
              onChange={e => setFilterDepartment(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white font-medium text-gray-700"
            >
              <option value="ALL">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Manufacturing Ops">Manufacturing Ops</option>
              <option value="Finance & Accounts">Finance & Accounts</option>
              <option value="Logistics & Warehouse">Logistics & Warehouse</option>
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-xs px-2.5 py-1.5 rounded-xl border border-gray-200 bg-white font-medium text-gray-700"
            >
              <option value="ALL">All Statuses</option>
              <option value="NORMAL">Normal Work</option>
              <option value="OVERTIME">Overtime Generated</option>
              <option value="DEFICIT">Work Deficit</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/60">
                <TableHead className="font-bold text-xs text-gray-700">Employee</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Shift & Scheduled</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Punches (Check In/Out)</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Presence / Breaks</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Net Payable</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Overtime (Raw / Approved)</TableHead>
                <TableHead className="font-bold text-xs text-gray-700">Estimated Cost</TableHead>
                <TableHead className="font-bold text-xs text-gray-700 text-right">Audit Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredWorkHours.map(record => (
                <TableRow
                  key={record.id}
                  onClick={() => setSelectedRecordForDrawer(record)}
                  className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                >
                  <TableCell>
                    <div className="font-bold text-xs text-gray-900">{record.employee_name}</div>
                    <div className="text-[10px] text-gray-500">
                      {record.employee_code} • {record.department}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-gray-800">{record.shift_name}</div>
                    <div className="text-[10px] text-gray-500">{record.scheduled_hours}h required</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-mono font-bold text-gray-800">
                      {record.check_in} → {record.check_out}
                    </div>
                    <div className="text-[10px] text-gray-500">Biometric Verified</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-semibold text-gray-800">{record.actual_presence_hours}h presence</div>
                    <div className="text-[10px] text-gray-500">
                      {record.breaks.length} breaks ({record.unpaid_break_hours * 60}m unpaid)
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-black text-gray-900">{record.payable_work_hours}h</div>
                    <div className="text-[10px] text-emerald-600 font-semibold">
                      {record.deficit_hours > 0 ? `${record.deficit_hours}h deficit` : 'Target met'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {record.payable_ot_hours > 0 ? (
                      <div>
                        <Badge variant="emerald" size="sm">
                          {record.payable_ot_hours}h Payable OT
                        </Badge>
                        <div className="text-[10px] text-gray-500 mt-0.5 font-medium">
                          Eligible: {record.eligible_ot_hours}h | Appr: {record.approved_ot_hours}h
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400 font-medium">0.0h (No OT)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-bold text-gray-900">
                      {record.estimated_cost > 0 ? `₹${record.estimated_cost.toLocaleString()}` : '—'}
                    </div>
                    <div className="text-[10px] text-gray-400">1.5x Multiplier</div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-[#07563D] hover:bg-emerald-50"
                      onClick={e => {
                        e.stopPropagation();
                        setSelectedRecordForDrawer(record);
                      }}
                    >
                      Inspect <ChevronRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Policy Exceptions Queue */}
      {exceptions.length > 0 && (
        <Card className="p-5 bg-white rounded-2xl border border-rose-100 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-wide">
                Work & Overtime Exception Queue ({exceptions.filter(e => e.status === 'OPEN' || e.status === 'IN_REVIEW').length} Open)
              </h3>
            </div>
          </div>

          <div className="space-y-2.5">
            {exceptions.map(exc => (
              <div
                key={exc.id}
                className="p-3.5 rounded-xl bg-rose-50/40 border border-rose-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{exc.employee_name}</span>
                    <span className="text-[10px] text-gray-500">({exc.department})</span>
                    <Badge variant={exc.severity === 'HIGH' || exc.severity === 'CRITICAL' ? 'rose' : 'amber'} size="sm">
                      {exc.type.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-700">{exc.details}</p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {exc.status === 'OPEN' || exc.status === 'IN_REVIEW' ? (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs border-rose-200 text-rose-700 hover:bg-rose-100"
                        onClick={() => handleResolveException(exc.id)}
                      >
                        Authorize & Clear
                      </Button>
                    </>
                  ) : (
                    <span className="text-xs font-bold text-emerald-700 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Explainable Calculation Breakdown Drawer */}
      {selectedRecordForDrawer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl overflow-y-auto p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <div className="text-xs font-bold text-[#07563D] uppercase tracking-wider">Calculation Audit Trail</div>
                  <h3 className="text-lg font-black text-gray-900">{selectedRecordForDrawer.employee_name}</h3>
                  <div className="text-xs text-gray-500">{selectedRecordForDrawer.date} • {selectedRecordForDrawer.shift_name}</div>
                </div>
                <button
                  onClick={() => setSelectedRecordForDrawer(null)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Mathematical Equation Overview */}
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-3">
                <div className="text-xs font-black text-[#07563D] uppercase tracking-wider">Work Hours Formula Breakdown</div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="p-2 bg-white rounded-lg border border-emerald-100">
                    <div className="text-[10px] text-gray-500 font-semibold">Presence</div>
                    <div className="font-bold text-gray-900 mt-0.5">{selectedRecordForDrawer.actual_presence_hours}h</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-emerald-100">
                    <div className="text-[10px] text-gray-500 font-semibold">Unpaid Breaks</div>
                    <div className="font-bold text-rose-600 mt-0.5">-{selectedRecordForDrawer.unpaid_break_hours}h</div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-emerald-100">
                    <div className="text-[10px] text-gray-500 font-semibold">Net Payable</div>
                    <div className="font-bold text-[#07563D] mt-0.5">{selectedRecordForDrawer.payable_work_hours}h</div>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Explanation Log */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wide">Authoritative Calculation Steps</h4>
                <div className="space-y-2">
                  {selectedRecordForDrawer.explainability.steps.map((step, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-xs text-gray-700 p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#07563D] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Policy Snapshot Badge */}
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-200/80 flex items-center justify-between text-xs">
                <div>
                  <span className="text-gray-500">Evaluated with Policy: </span>
                  <span className="font-bold text-gray-900">{selectedRecordForDrawer.explainability.policy_used}</span>
                </div>
                <Badge variant="outline">{selectedRecordForDrawer.explainability.policy_version}</Badge>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedRecordForDrawer(null)}>
                Close Audit Drawer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Policy Configuration Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-gray-200 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Overtime Policy Configuration</h3>
              <button onClick={() => setIsConfigModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Daily Work Threshold (Minutes)</label>
                <input
                  type="number"
                  value={policy.daily_threshold_minutes}
                  onChange={e => setPolicy({ ...policy, daily_threshold_minutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Grace Period (Minutes)</label>
                  <input
                    type="number"
                    value={policy.grace_period_minutes}
                    onChange={e => setPolicy({ ...policy, grace_period_minutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Regular Rate Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    value={policy.normal_rate_multiplier}
                    onChange={e => setPolicy({ ...policy, normal_rate_multiplier: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Weekend Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    value={policy.weekend_multiplier}
                    onChange={e => setPolicy({ ...policy, weekend_multiplier: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Holiday Multiplier</label>
                  <input
                    type="number"
                    step="0.1"
                    value={policy.holiday_multiplier}
                    onChange={e => setPolicy({ ...policy, holiday_multiplier: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Night Window Start</label>
                  <input
                    type="text"
                    value={policy.night_window_start}
                    onChange={e => setPolicy({ ...policy, night_window_start: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-gray-700 mb-1">Night Window End</label>
                  <input
                    type="text"
                    value={policy.night_window_end}
                    onChange={e => setPolicy({ ...policy, night_window_end: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-200 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsConfigModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  workOvertimeService.updatePolicy(policy);
                  showToast('Overtime policy parameters updated successfully!');
                  setIsConfigModalOpen(false);
                  refreshData();
                }}
              >
                Save Policy
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
