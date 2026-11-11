import React, { useMemo } from 'react';
import {
  Factory,
  Users,
  CheckCircle2,
  XCircle,
  RotateCcw,
  IndianRupee,
  TrendingUp,
  Layers,
  ArrowUpRight,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { GarmentSubviewProps } from '../types';

export const GarmentDashboardView: React.FC<GarmentSubviewProps> = ({ data, onNavigateTab }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const stats = useMemo(() => {
    const activeWorkers = data.workers.filter((w) => w.is_active).length;
    const todayAtt = data.attendance.filter((a) => a.work_date === todayStr);
    const presentToday = todayAtt.filter((a) => a.status === 'PRESENT' || a.status === 'HALF_DAY').length;

    const totalProduced = data.productionEntries.reduce((s, e) => s + Number(e.produced_qty || 0), 0);
    const totalAccepted = data.productionEntries.reduce((s, e) => s + Number(e.accepted_qty || 0), 0);
    const totalRejected = data.productionEntries.reduce((s, e) => s + Number(e.rejected_qty || 0), 0);
    const totalRework = data.productionEntries.reduce((s, e) => s + Number(e.rework_qty || 0), 0);
    const pieceEarningsTotal = data.productionEntries.reduce((s, e) => s + Number(e.computed_piece_amount || 0), 0);

    const activeOrders = data.orders.filter((o) => o.status === 'IN_PROGRESS' || o.status === 'PLANNED');
    const orderTarget = activeOrders.reduce((s, o) => s + Number(o.target_quantity || 0), 0);
    const orderDone = activeOrders.reduce((s, o) => s + Number(o.completed_quantity || 0), 0);
    const targetAchievement = orderTarget > 0 ? Math.min(100, Math.round((orderDone / orderTarget) * 100)) : 0;

    const acceptanceRate = totalProduced > 0 ? Math.round((totalAccepted / totalProduced) * 1000) / 10 : 0;
    const pendingCorrections = data.corrections.filter((c) => c.status === 'PENDING').length;
    const latestCycle = data.cycles[0] || null;

    return {
      activeWorkers,
      presentToday,
      todayAttCount: todayAtt.length,
      totalProduced,
      totalAccepted,
      totalRejected,
      totalRework,
      pieceEarningsTotal,
      targetAchievement,
      orderTarget,
      orderDone,
      acceptanceRate,
      pendingCorrections,
      latestCycle,
    };
  }, [data, todayStr]);

  const unitBreakdown = useMemo(() => {
    return data.units.map((unit) => {
      const entries = data.productionEntries.filter((e) => e.production_unit_id === unit.id);
      const produced = entries.reduce((s, e) => s + Number(e.produced_qty || 0), 0);
      const accepted = entries.reduce((s, e) => s + Number(e.accepted_qty || 0), 0);
      const rejected = entries.reduce((s, e) => s + Number(e.rejected_qty || 0), 0);
      const amount = entries.reduce((s, e) => s + Number(e.computed_piece_amount || 0), 0);
      const workersCount = data.workers.filter((w) => w.primary_unit_id === unit.id && w.is_active).length;
      const eff = unit.daily_target_qty > 0 ? Math.round((accepted / unit.daily_target_qty) * 100) : 0;
      return { unit, produced, accepted, rejected, amount, workersCount, eff };
    });
  }, [data.units, data.productionEntries, data.workers]);

  const fmt = (val: number) => `${data.currency} ${val.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Top KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Garment Workforce</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{stats.activeWorkers}</div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-2">
            <span>Today floor present: <strong className="text-emerald-600">{stats.presentToday}</strong></span>
            <span>• {data.units.length} units/lines</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Output &amp; Quality</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{stats.totalAccepted.toLocaleString()} <span className="text-sm font-normal text-slate-500">/ {stats.totalProduced.toLocaleString()} pcs</span></div>
          <div className="mt-1 text-xs text-slate-500 flex items-center gap-3">
            <span className="text-emerald-600 font-medium">{stats.acceptanceRate}% Accepted</span>
            <span className="text-rose-600">Rej: {stats.totalRejected}</span>
            <span className="text-amber-600">Rework: {stats.totalRework}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Piece-Rate Ledger Value</span>
            <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{fmt(stats.pieceEarningsTotal)}</div>
          <div className="mt-1 text-xs text-slate-500">
            Latest cycle: {stats.latestCycle ? `${stats.latestCycle.cycle_code} (${stats.latestCycle.status})` : 'No cycles yet'}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Order Target &amp; Alerts</span>
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-slate-900">{stats.targetAchievement}%</div>
          <div className="mt-1 text-xs text-slate-500 flex items-center justify-between">
            <span>{stats.orderDone.toLocaleString()} / {stats.orderTarget.toLocaleString()} target</span>
            {stats.pendingCorrections > 0 && (
              <button onClick={() => onNavigateTab('operations')} className="text-amber-700 font-semibold hover:underline flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> {stats.pendingCorrections} pending
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Line Efficiency & Unit Breakdown + Quick Actions */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Factory className="w-4 h-4 text-emerald-600" /> Factory, Line &amp; Section Performance
              </h3>
              <p className="text-xs text-slate-500">Live production volume, QC quality split, and piece-rate wage accrual by unit</p>
            </div>
            <button onClick={() => onNavigateTab('units')} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
              Manage Units <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {unitBreakdown.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
              No production units or lines configured yet. Create your first Factory, Floor, or Line to begin tracking output.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs uppercase text-slate-500">
                    <th className="py-2.5 px-3">Unit / Line</th>
                    <th className="py-2.5 px-3">Stage</th>
                    <th className="py-2.5 px-3">Workers</th>
                    <th className="py-2.5 px-3 text-right">Produced</th>
                    <th className="py-2.5 px-3 text-right">Accepted</th>
                    <th className="py-2.5 px-3 text-right">Rej</th>
                    <th className="py-2.5 px-3 text-right">Piece Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {unitBreakdown.map(({ unit, produced, accepted, rejected, amount, workersCount }) => (
                    <tr key={unit.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-800">{unit.unit_name}</div>
                        <div className="text-xs text-slate-400">{unit.unit_code} • {unit.unit_type}</div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">{unit.line_stage}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{workersCount}</td>
                      <td className="py-2.5 px-3 text-right font-medium text-slate-800">{produced.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-emerald-700">{accepted.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right text-rose-600">{rejected.toLocaleString()}</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">{fmt(amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Wage Policy & Quick Workflow Launcher */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600" /> Active Tenant Wage Policy
          </h3>
          <div className="space-y-2.5 text-xs">
            <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-500">Piece-Rate Mode</span>
              <span className="font-semibold text-slate-800">{data.settings.piece_rate_calculation_mode}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-500">QC Payment Rule</span>
              <span className="font-semibold text-emerald-700">{data.settings.default_rework_payment_rule}</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-500">OT Multiplier (Daily / Hourly)</span>
              <span className="font-semibold text-slate-800">{data.settings.overtime_multiplier_daily}x / {data.settings.overtime_multiplier_hourly}x</span>
            </div>
            <div className="flex justify-between p-2.5 bg-slate-50 rounded-xl">
              <span className="text-slate-500">Shared Line Split</span>
              <span className="font-semibold text-slate-800">{data.settings.default_shared_split_method}</span>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-2">
            <div className="text-xs font-semibold uppercase text-slate-400">Daily Supervisor Actions</div>
            <button onClick={() => onNavigateTab('operations')} className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center justify-between transition">
              <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Mark Floor Attendance &amp; QC Output</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button onClick={() => onNavigateTab('payroll')} className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-between transition">
              <span className="flex items-center gap-2"><IndianRupee className="w-4 h-4" /> Run Daily / Weekly / Monthly Payroll</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button onClick={() => onNavigateTab('wages')} className="w-full py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center justify-between transition">
              <span className="flex items-center gap-2"><RotateCcw className="w-4 h-4" /> Configure Worker Wage Methods</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Recent Production Entries Snapshot */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-bold text-slate-900">Recent Floor Production &amp; QC Entries</h3>
          <button onClick={() => onNavigateTab('operations')} className="text-xs font-semibold text-emerald-600 hover:underline">
            View Full Production Ledger
          </button>
        </div>
        {data.productionEntries.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No production entries recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-left uppercase text-slate-500">
                  <th className="py-2 px-2">Date</th>
                  <th className="py-2 px-2">Worker / Mode</th>
                  <th className="py-2 px-2">Operation</th>
                  <th className="py-2 px-2 text-right">Produced</th>
                  <th className="py-2 px-2 text-right">Accepted</th>
                  <th className="py-2 px-2 text-right">Rework / Rej</th>
                  <th className="py-2 px-2 text-right">Payable Amount</th>
                  <th className="py-2 px-2">QC Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.productionEntries.slice(0, 8).map((entry) => {
                  const op = data.operations.find((o) => o.id === entry.operation_id);
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="py-2 px-2 font-medium text-slate-700">{entry.work_date}</td>
                      <td className="py-2 px-2">
                        {entry.allocation_mode === 'SHARED_LINE' ? (
                          <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold">Shared Line ({entry.shared_split_method || 'EQUAL'})</span>
                        ) : (
                          <span className="font-medium text-slate-800">{entry.employee_id ? data.empNameMap[entry.employee_id] || entry.employee_id : 'Unassigned'}</span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-slate-700">{op ? `${op.operation_name} (${op.operation_code})` : entry.operation_id}</td>
                      <td className="py-2 px-2 text-right">{entry.produced_qty}</td>
                      <td className="py-2 px-2 text-right font-semibold text-emerald-700">{entry.accepted_qty}</td>
                      <td className="py-2 px-2 text-right text-slate-600">{entry.rework_qty} / <span className="text-rose-600">{entry.rejected_qty}</span></td>
                      <td className="py-2 px-2 text-right font-bold text-slate-900">{fmt(Number(entry.computed_piece_amount || 0))}</td>
                      <td className="py-2 px-2">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${entry.qc_status === 'QC_VERIFIED' ? 'bg-emerald-50 text-emerald-700' : entry.qc_status === 'REJECTED_ENTRY' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                          {entry.qc_status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

