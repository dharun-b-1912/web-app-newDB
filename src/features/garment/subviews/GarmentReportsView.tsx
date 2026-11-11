import React, { useMemo, useState } from 'react';
import { BarChart3, Download } from 'lucide-react';
import { GarmentSubviewProps } from '../types';

export const GarmentReportsView: React.FC<GarmentSubviewProps> = ({ data }) => {
  const [groupBy, setGroupBy] = useState<'worker' | 'team' | 'line' | 'factory'>('worker');

  const rows = useMemo(() => {
    if (groupBy === 'worker') {
      return data.workers.map((w) => {
        const allocs = data.allocations.filter((a) => a.employee_id === w.employee_id);
        const att = data.attendance.filter((a) => a.employee_id === w.employee_id);
        const produced = allocs.reduce((s, a) => s + Number(a.allocated_produced_qty || 0), 0);
        const accepted = allocs.reduce((s, a) => s + Number(a.allocated_accepted_qty || 0), 0);
        const rejected = allocs.reduce((s, a) => s + Number(a.allocated_rejected_qty || 0), 0);
        const earned = allocs.reduce((s, a) => s + Number(a.earned_piece_amount || 0), 0);
        const days = att.reduce((s, a) => s + Number(a.payable_day_factor || 0), 0);
        return {
          key: w.id,
          name: data.empNameMap[w.employee_id] || w.employee_id,
          meta: `${w.worker_category} • ${w.default_wage_method}`,
          days,
          produced,
          accepted,
          rejected,
          earned,
        };
      });
    }

    if (groupBy === 'team') {
      return data.teams.map((t) => {
        const entries = data.productionEntries.filter((e) => e.team_id === t.id);
        return {
          key: t.id,
          name: t.team_name,
          meta: t.team_code,
          days: entries.length,
          produced: entries.reduce((s, e) => s + Number(e.produced_qty || 0), 0),
          accepted: entries.reduce((s, e) => s + Number(e.accepted_qty || 0), 0),
          rejected: entries.reduce((s, e) => s + Number(e.rejected_qty || 0), 0),
          earned: entries.reduce((s, e) => s + Number(e.computed_piece_amount || 0), 0),
        };
      });
    }

    const units = groupBy === 'factory'
      ? data.units.filter((u) => u.unit_type === 'FACTORY')
      : data.units.filter((u) => u.unit_type !== 'FACTORY');

    const fallbackUnits = units.length > 0 ? units : data.units;

    return fallbackUnits.map((u) => {
      const entries = data.productionEntries.filter((e) => e.production_unit_id === u.id);
      return {
        key: u.id,
        name: u.unit_name,
        meta: `${u.unit_type} • ${u.line_stage}`,
        days: entries.length,
        produced: entries.reduce((s, e) => s + Number(e.produced_qty || 0), 0),
        accepted: entries.reduce((s, e) => s + Number(e.accepted_qty || 0), 0),
        rejected: entries.reduce((s, e) => s + Number(e.rejected_qty || 0), 0),
        earned: entries.reduce((s, e) => s + Number(e.computed_piece_amount || 0), 0),
      };
    });
  }, [groupBy, data]);

  const exportCsv = () => {
    const header = ['Group', 'Details', 'Entries/Days', 'Produced', 'Accepted', 'Rejected', 'Piece Earnings'].join(',');
    const body = rows.map((r) => [r.name, r.meta, r.days, r.produced, r.accepted, r.rejected, r.earned].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const blob = new Blob([[header, ...body].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `garment-${groupBy}-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-600 ml-1" />
          <span className="text-sm font-bold text-slate-900 mr-2">Production &amp; Wage Analytics</span>
          {(['worker', 'team', 'line', 'factory'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize ${groupBy === g ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              {g}-Wise
            </button>
          ))}
        </div>
        <button onClick={exportCsv} className="px-3.5 py-2 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" /> Download CSV
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-left uppercase text-slate-500">
              <th className="py-2 px-2 capitalize">{groupBy}</th>
              <th className="py-2 px-2">Metadata</th>
              <th className="py-2 px-2 text-right">{groupBy === 'worker' ? 'Payable Days' : 'Log Entries'}</th>
              <th className="py-2 px-2 text-right">Produced</th>
              <th className="py-2 px-2 text-right">Accepted</th>
              <th className="py-2 px-2 text-right">Rejected</th>
              <th className="py-2 px-2 text-right">Piece Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => (
              <tr key={r.key} className="hover:bg-slate-50">
                <td className="py-2.5 px-2 font-semibold text-slate-800">{r.name}</td>
                <td className="py-2.5 px-2 text-slate-500">{r.meta}</td>
                <td className="py-2.5 px-2 text-right">{r.days}</td>
                <td className="py-2.5 px-2 text-right">{r.produced.toLocaleString()}</td>
                <td className="py-2.5 px-2 text-right font-semibold text-emerald-700">{r.accepted.toLocaleString()}</td>
                <td className="py-2.5 px-2 text-right text-rose-600">{r.rejected.toLocaleString()}</td>
                <td className="py-2.5 px-2 text-right font-bold">{data.currency} {r.earned.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

