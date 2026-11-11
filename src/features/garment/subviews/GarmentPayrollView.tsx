import React, { useState, useEffect } from 'react';
import { Play, Download, Eye, Lock, RotateCcw, CheckCircle2, FileText, X } from 'lucide-react';
import { GarmentSubviewProps } from '../types';
import { garmentPayrollService } from '../../../services/garment/garmentPayrollService';
import { GarmentPayrollLine, PaymentFrequency, PayrollCycleStatus, WageMethod } from '../../../types/garment';
import { useAuth } from '../../../hooks/useAuth';

export const GarmentPayrollView: React.FC<GarmentSubviewProps> = ({ data, onRefresh }) => {
  const { user } = useAuth();
  const [selectedCycleId, setSelectedCycleId] = useState<string>(data.cycles[0]?.id || '');
  const [lines, setLines] = useState<GarmentPayrollLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [explainLine, setExplainLine] = useState<GarmentPayrollLine | null>(null);

  const [cycleForm, setCycleForm] = useState({
    cycleName: `Garment Weekly Payroll (${new Date().toISOString().split('T')[0]})`,
    paymentFrequency: 'WEEKLY' as PaymentFrequency,
    periodStart: new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0],
    periodEnd: new Date().toISOString().split('T')[0],
    productionUnitId: '',
    wageMethodFilter: '' as '' | WageMethod,
  });

  const activeCycle = data.cycles.find((c) => c.id === selectedCycleId) || data.cycles[0] || null;

  useEffect(() => {
    if (!activeCycle) {
      setLines([]);
      return;
    }
    garmentPayrollService
      .listCycleLines(activeCycle.id, data.orgId)
      .then(setLines)
      .catch(() => setLines([]));
  }, [activeCycle?.id, data.orgId]);

  const handleCreateAndCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const cycle = await garmentPayrollService.createCycle({
        organizationId: data.orgId,
        cycleName: cycleForm.cycleName,
        paymentFrequency: cycleForm.paymentFrequency,
        periodStart: cycleForm.periodStart,
        periodEnd: cycleForm.periodEnd,
        productionUnitId: cycleForm.productionUnitId || null,
        wageMethodFilter: cycleForm.wageMethodFilter || null,
      });
      const res = await garmentPayrollService.calculateCycle(cycle.id, data.orgId);
      setSelectedCycleId(res.cycle.id);
      setLines(res.lines);
      setMsg(`Calculated ${res.lines.length} worker payroll lines. Total Net Pay: ${data.currency} ${res.cycle.total_net_pay.toLocaleString()}.`);
      await onRefresh();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleRecalculate = async () => {
    if (!activeCycle) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await garmentPayrollService.calculateCycle(activeCycle.id, data.orgId);
      setLines(res.lines);
      setMsg(`Recalculated ${res.lines.length} worker lines cleanly.`);
      await onRefresh();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleTransition = async (nextStatus: PayrollCycleStatus, publishPayslips = false) => {
    if (!activeCycle) return;
    const notes = nextStatus === 'REOPENED' ? window.prompt('Enter mandatory reason for reopening locked payroll cycle:') || '' : undefined;
    if (nextStatus === 'REOPENED' && !notes) return;
    setBusy(true);
    setMsg(null);
    try {
      await garmentPayrollService.transitionCycleStatus({
        cycleId: activeCycle.id,
        organizationId: data.orgId,
        nextStatus,
        actorName: (user as any)?.name || (user as any)?.full_name || user?.email || 'HR / Payroll Admin',
        notes,
        publishPayslips,
      });
      setMsg(`Cycle moved to ${nextStatus}.`);
      const refreshedLines = await garmentPayrollService.listCycleLines(activeCycle.id, data.orgId);
      setLines(refreshedLines);
      await onRefresh();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleExportCsv = () => {
    if (!activeCycle) return;
    const csv = garmentPayrollService.exportPayrollCsv(activeCycle, lines, data.empNameMap);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeCycle.cycle_code}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fmt = (n: number) => `${data.currency} ${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`p-3 rounded-xl text-xs font-medium border ${msg.startsWith('Error') ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {msg}
        </div>
      )}

      {/* Cycle Builder & Selector */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <form onSubmit={handleCreateAndCalculate} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
          <h4 className="text-sm font-bold text-slate-900">New Garment Payroll Cycle</h4>
          <input required placeholder="Cycle Name" value={cycleForm.cycleName} onChange={(e) => setCycleForm({ ...cycleForm, cycleName: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
          <div className="grid grid-cols-2 gap-2">
            <select value={cycleForm.paymentFrequency} onChange={(e) => setCycleForm({ ...cycleForm, paymentFrequency: e.target.value as PaymentFrequency })} className="px-3 py-2 border border-slate-200 rounded-xl bg-white">
              <option value="DAILY">DAILY</option>
              <option value="WEEKLY">WEEKLY</option>
              <option value="FORTNIGHTLY">FORTNIGHTLY</option>
              <option value="MONTHLY">MONTHLY</option>
              <option value="CUSTOM">CUSTOM</option>
            </select>
            <select value={cycleForm.wageMethodFilter} onChange={(e) => setCycleForm({ ...cycleForm, wageMethodFilter: e.target.value as any })} className="px-3 py-2 border border-slate-200 rounded-xl bg-white">
              <option value="">All Wage Methods</option>
              <option value="DAILY">DAILY Only</option>
              <option value="HOURLY">HOURLY Only</option>
              <option value="PIECE_RATE">PIECE_RATE Only</option>
              <option value="HYBRID">HYBRID Only</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-semibold text-slate-500">Period Start</label>
              <input type="date" required value={cycleForm.periodStart} onChange={(e) => setCycleForm({ ...cycleForm, periodStart: e.target.value })} className="w-full px-3 py-1.5 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500">Period End</label>
              <input type="date" required value={cycleForm.periodEnd} onChange={(e) => setCycleForm({ ...cycleForm, periodEnd: e.target.value })} className="w-full px-3 py-1.5 border border-slate-200 rounded-xl" />
            </div>
          </div>
          <select value={cycleForm.productionUnitId} onChange={(e) => setCycleForm({ ...cycleForm, productionUnitId: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
            <option value="">All Units / Lines</option>
            {data.units.map((u) => (
              <option key={u.id} value={u.id}>{u.unit_name}</option>
            ))}
          </select>
          <button disabled={busy} type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1.5">
            <Play className="w-3.5 h-3.5" /> Create &amp; Calculate Payroll
          </button>
        </form>

        {/* Active Cycle Governance & Approval Stepper */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Select Cycle &amp; Approval Chain</h4>
              <p className="text-xs text-slate-500">Supervisor → Manager → HR / Payroll → Authorised → Paid → Locked</p>
            </div>
            <select
              value={activeCycle?.id || ''}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-semibold"
            >
              {data.cycles.length === 0 && <option value="">No payroll cycles created yet</option>}
              {data.cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cycle_code} • {c.period_start} to {c.period_end} ({c.status})
                </option>
              ))}
            </select>
          </div>

          {activeCycle && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-500">Workers</div>
                  <div className="text-lg font-bold text-slate-900">{activeCycle.total_workers}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-500">Total Gross</div>
                  <div className="text-lg font-bold text-slate-900">{fmt(activeCycle.total_gross)}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <div className="text-slate-500">Deductions</div>
                  <div className="text-lg font-bold text-rose-600">{fmt(activeCycle.total_deductions)}</div>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl">
                  <div className="text-emerald-700 font-semibold">Net Payable</div>
                  <div className="text-lg font-bold text-emerald-800">{fmt(activeCycle.total_net_pay)}</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                {activeCycle.status !== 'LOCKED' && (
                  <button disabled={busy} onClick={handleRecalculate} className="px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold">
                    Recalculate
                  </button>
                )}
                {(['SUPERVISOR_APPROVED', 'MANAGER_APPROVED', 'HR_APPROVED', 'AUTHORIZED', 'PAID', 'LOCKED'] as PayrollCycleStatus[]).map((st) => (
                  <button
                    key={st}
                    disabled={busy || activeCycle.status === 'LOCKED'}
                    onClick={() => handleTransition(st, st === 'HR_APPROVED' || st === 'PAID')}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white font-semibold flex items-center gap-1"
                  >
                    {st === 'LOCKED' ? <Lock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />} {st.replace('_', ' ')}
                  </button>
                ))}
                {activeCycle.status === 'LOCKED' && (
                  <button disabled={busy} onClick={() => handleTransition('REOPENED')} className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-semibold flex items-center gap-1">
                    <RotateCcw className="w-3 h-3" /> Reopen Cycle
                  </button>
                )}
                <button onClick={handleExportCsv} className="ml-auto px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 font-semibold flex items-center gap-1">
                  <Download className="w-3.5 h-3.5" /> Export CSV Report
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Computed Worker Payroll Lines */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
        <h4 className="text-sm font-bold text-slate-900 mb-3">Worker-Wise Computed Wage Breakdown ({lines.length})</h4>
        {lines.length === 0 ? (
          <p className="text-xs text-slate-400 py-6 text-center">Select or calculate a payroll cycle to inspect worker wages.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-left uppercase text-slate-500">
                <th className="py-2 px-2">Worker</th>
                <th className="py-2 px-2">Method</th>
                <th className="py-2 px-2 text-right">Days / Hrs / OT</th>
                <th className="py-2 px-2 text-right">Accepted Pcs</th>
                <th className="py-2 px-2 text-right">Base + Piece + OT</th>
                <th className="py-2 px-2 text-right">Inc / Topup</th>
                <th className="py-2 px-2 text-right">Gross</th>
                <th className="py-2 px-2 text-right">Deduct</th>
                <th className="py-2 px-2 text-right">Net Pay</th>
                <th className="py-2 px-2 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((l) => {
                const basePieceOt = Number(l.daily_wage_earnings) + Number(l.hourly_wage_earnings) + Number(l.piece_rate_earnings) + Number(l.overtime_earnings);
                return (
                  <tr key={l.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 font-semibold text-slate-800">
                      {data.empNameMap[l.employee_id] || l.employee_id}
                      <div className="text-[11px] font-normal text-slate-400">{l.worker_category}</div>
                    </td>
                    <td className="py-2.5 px-2"><span className="px-2 py-0.5 rounded bg-slate-100 font-semibold">{l.wage_method_snapshot}</span></td>
                    <td className="py-2.5 px-2 text-right">{l.payable_days}d / {l.worked_hours}h / {l.overtime_hours}h</td>
                    <td className="py-2.5 px-2 text-right font-medium text-emerald-700">{l.accepted_qty} (+{l.rework_accepted_qty} rw)</td>
                    <td className="py-2.5 px-2 text-right">{fmt(basePieceOt)}</td>
                    <td className="py-2.5 px-2 text-right">{fmt(Number(l.incentive_earnings) + Number(l.minimum_wage_topup))}</td>
                    <td className="py-2.5 px-2 text-right font-semibold">{fmt(l.gross_earnings)}</td>
                    <td className="py-2.5 px-2 text-right text-rose-600">-{fmt(l.total_deductions)}</td>
                    <td className="py-2.5 px-2 text-right font-bold text-emerald-800">{fmt(l.net_payable)}</td>
                    <td className="py-2.5 px-2 text-right">
                      <button onClick={() => setExplainLine(l)} className="text-emerald-600 hover:underline inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> Explain
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Explain Calculation & Printable Payslip Modal */}
      {explainLine && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-600" /> Calculation Audit &amp; Payslip Preview</h4>
                <p className="text-xs text-slate-500">{data.empNameMap[explainLine.employee_id]} • {explainLine.wage_method_snapshot}</p>
              </div>
              <button onClick={() => setExplainLine(null)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span>Daily Wage Earnings ({explainLine.payable_days} days)</span><span className="font-semibold">{fmt(explainLine.daily_wage_earnings)}</span></div>
              <div className="flex justify-between"><span>Hourly Wage Earnings ({explainLine.worked_hours} hrs)</span><span className="font-semibold">{fmt(explainLine.hourly_wage_earnings)}</span></div>
              <div className="flex justify-between"><span>Piece-Rate Earnings ({explainLine.accepted_qty} acc + {explainLine.rework_accepted_qty} rw)</span><span className="font-semibold text-emerald-700">{fmt(explainLine.piece_rate_earnings)}</span></div>
              <div className="flex justify-between"><span>Overtime Earnings ({explainLine.overtime_hours} hrs)</span><span className="font-semibold">{fmt(explainLine.overtime_earnings)}</span></div>
              <div className="flex justify-between"><span>Incentives &amp; Minimum Wage Top-up</span><span className="font-semibold">{fmt(Number(explainLine.incentive_earnings) + Number(explainLine.minimum_wage_topup))}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900"><span>Gross Earnings</span><span>{fmt(explainLine.gross_earnings)}</span></div>
              <div className="flex justify-between text-rose-600"><span>Advance / Loan / Canteen / Statutory Deductions</span><span>-{fmt(explainLine.total_deductions)}</span></div>
              <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-emerald-700"><span>Net Payable</span><span>{fmt(explainLine.net_payable)}</span></div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl text-[11px] text-slate-600 max-h-40 overflow-y-auto">
              <div className="font-semibold text-slate-700 mb-1">Formula &amp; Trace Snapshot</div>
              <pre className="whitespace-pre-wrap">{JSON.stringify(explainLine.calculation_trace_json, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
