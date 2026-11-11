import React, { useState } from 'react';
import { CheckSquare, ClipboardCheck, ShieldAlert, Save, Check, X } from 'lucide-react';
import { GarmentSubviewProps } from '../types';
import { garmentOperationsService } from '../../../services/garment/garmentOperationsService';
import { FloorAttendanceStatus, SharedSplitMethod } from '../../../types/garment';

export const GarmentFloorOpsView: React.FC<GarmentSubviewProps> = ({ data, onRefresh }) => {
  const [subTab, setSubTab] = useState<'attendance' | 'production' | 'corrections'>('production');
  const [workDate, setWorkDate] = useState(new Date().toISOString().split('T')[0]);
  const [unitFilter, setUnitFilter] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Batch Floor Attendance Draft State
  const [attDrafts, setAttDrafts] = useState<Record<string, { status: FloorAttendanceStatus; hours: number; ot: number }>>({});

  // Production / QC Entry Form
  const [prodForm, setProdForm] = useState({
    work_date: new Date().toISOString().split('T')[0],
    production_unit_id: '',
    order_id: '',
    style_id: '',
    operation_id: '',
    allocation_mode: 'INDIVIDUAL' as 'INDIVIDUAL' | 'SHARED_LINE',
    shared_split_method: data.settings.default_shared_split_method as SharedSplitMethod,
    employee_id: '',
    participant_employee_ids: [] as string[],
    produced_qty: 100,
    accepted_qty: 95,
    rejected_qty: 2,
    rework_qty: 3,
    rework_accepted_qty: 0,
    rejection_reason_code: '',
    notes: '',
  });

  const scopedWorkers = data.workers.filter((w) => !unitFilter || w.primary_unit_id === unitFilter);

  const handleSaveAttendanceBatch = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const targetWorkers = scopedWorkers.length > 0 ? scopedWorkers : data.workers;
      const rows = targetWorkers.map((w) => {
        const d = attDrafts[w.employee_id];
        const status: FloorAttendanceStatus = d?.status || 'PRESENT';
        const hours = d?.hours ?? (status === 'PRESENT' ? 8 : status === 'HALF_DAY' ? 4 : 0);
        const ot = d?.ot ?? 0;
        return {
          work_date: workDate,
          employee_id: w.employee_id,
          production_unit_id: w.primary_unit_id || unitFilter || null,
          team_id: w.primary_team_id || null,
          status,
          payable_day_factor: status === 'PRESENT' ? 1 : status === 'HALF_DAY' ? 0.5 : 0,
          worked_hours: hours,
          overtime_hours: ot,
          source: 'HR_WEB' as const,
          sync_to_core_attendance: true,
          approval_status: 'APPROVED' as const,
        };
      });
      await garmentOperationsService.saveFloorAttendanceBatch(rows, data.orgId);
      setMsg(`Saved & synced ${rows.length} floor attendance records for ${workDate}.`);
      await onRefresh();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProduction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.operation_id) return;
    setSaving(true);
    setMsg(null);
    try {
      const selectedOrder = data.orders.find((o) => o.id === prodForm.order_id);
      const res = await garmentOperationsService.saveProductionEntry({
        organization_id: data.orgId,
        work_date: prodForm.work_date,
        production_unit_id: prodForm.production_unit_id || selectedOrder?.production_unit_id || null,
        order_id: prodForm.order_id || null,
        style_id: prodForm.style_id || selectedOrder?.style_id || null,
        operation_id: prodForm.operation_id,
        allocation_mode: prodForm.allocation_mode,
        shared_split_method: prodForm.allocation_mode === 'SHARED_LINE' ? prodForm.shared_split_method : null,
        employee_id: prodForm.allocation_mode === 'INDIVIDUAL' ? prodForm.employee_id || null : null,
        participant_employee_ids:
          prodForm.allocation_mode === 'SHARED_LINE'
            ? prodForm.participant_employee_ids
            : prodForm.employee_id
              ? [prodForm.employee_id]
              : [],
        produced_qty: Number(prodForm.produced_qty || 0),
        accepted_qty: Number(prodForm.accepted_qty || 0),
        rejected_qty: Number(prodForm.rejected_qty || 0),
        rework_qty: Number(prodForm.rework_qty || 0),
        rework_accepted_qty: Number(prodForm.rework_accepted_qty || 0),
        rejection_reason_code: prodForm.rejection_reason_code || null,
        notes: prodForm.notes || null,
        approval_status: 'SUBMITTED',
      });
      setMsg(
        `Saved production entry! Payable units: ${res.entry.payable_units}, Earned Piece Amount: ${data.currency} ${res.entry.computed_piece_amount} across ${res.allocations.length} allocation(s).`
      );
      await onRefresh();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleVerifyEntry = async (entryId: string) => {
    setSaving(true);
    try {
      await garmentOperationsService.updateProductionEntryStatus({
        entryId,
        organizationId: data.orgId,
        qcStatus: 'QC_VERIFIED',
        approvalStatus: 'SUPERVISOR_APPROVED',
      });
      await onRefresh();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleReviewCorrection = async (requestId: string, decision: 'APPROVED' | 'REJECTED') => {
    setSaving(true);
    try {
      await garmentOperationsService.reviewCorrectionRequest({
        requestId,
        organizationId: data.orgId,
        decision,
        reviewerNotes: `${decision} via Floor Operations Desk`,
      });
      await onRefresh();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex gap-2">
          {[
            { id: 'production', label: 'Production & QC Entry', icon: ClipboardCheck },
            { id: 'attendance', label: 'Daily Floor Attendance', icon: CheckSquare },
            { id: 'corrections', label: `Corrections & Disputes (${data.corrections.filter((c) => c.status === 'PENDING').length})`, icon: ShieldAlert },
          ].map((t) => {
            const Icon = t.icon;
            const active = subTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setSubTab(t.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 ${active ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <Icon className="w-3.5 h-3.5" /> {t.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs">
          <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} className="px-2.5 py-1.5 border border-slate-200 rounded-xl" />
          <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="px-2.5 py-1.5 border border-slate-200 rounded-xl bg-white">
            <option value="">All Lines / Units</option>
            {data.units.map((u) => (
              <option key={u.id} value={u.id}>{u.unit_name}</option>
            ))}
          </select>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-xl text-xs font-medium border ${msg.startsWith('Error') ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {msg}
        </div>
      )}

      {/* Attendance Tab */}
      {subTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Supervisor Daily Floor Attendance ({workDate})</h3>
              <p className="text-xs text-slate-500">Marks Present, Half-Day, Absent, Leave, Hours &amp; Overtime and syncs cleanly with core HRMS Attendance</p>
            </div>
            <button disabled={saving} onClick={handleSaveAttendanceBatch} className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> {saving ? 'Syncing...' : 'Save & Sync Floor Attendance'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-left uppercase text-slate-500">
                  <th className="py-2 px-2">Worker</th>
                  <th className="py-2 px-2">Category</th>
                  <th className="py-2 px-2">Status</th>
                  <th className="py-2 px-2">Worked Hours</th>
                  <th className="py-2 px-2">OT Hours</th>
                  <th className="py-2 px-2">Last Saved ({workDate})</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(scopedWorkers.length > 0 ? scopedWorkers : data.workers).map((w) => {
                  const existing = data.attendance.find((a) => a.employee_id === w.employee_id && a.work_date === workDate);
                  const draft = attDrafts[w.employee_id] || {
                    status: (existing?.status || 'PRESENT') as FloorAttendanceStatus,
                    hours: existing?.worked_hours ?? 8,
                    ot: existing?.overtime_hours ?? 0,
                  };
                  return (
                    <tr key={w.id}>
                      <td className="py-2 px-2 font-semibold text-slate-800">{data.empNameMap[w.employee_id]}</td>
                      <td className="py-2 px-2 text-slate-500">{w.worker_category} • {w.default_wage_method}</td>
                      <td className="py-2 px-2">
                        <select
                          value={draft.status}
                          onChange={(e) => {
                            const st = e.target.value as FloorAttendanceStatus;
                            setAttDrafts((prev) => ({
                              ...prev,
                              [w.employee_id]: {
                                ...draft,
                                status: st,
                                hours: st === 'PRESENT' ? 8 : st === 'HALF_DAY' ? 4 : 0,
                              },
                            }));
                          }}
                          className="px-2 py-1 border border-slate-200 rounded-lg bg-white"
                        >
                          {['PRESENT', 'HALF_DAY', 'ABSENT', 'LEAVE', 'WEEK_OFF', 'HOLIDAY'].map((st) => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="24"
                          value={draft.hours}
                          onChange={(e) => setAttDrafts((prev) => ({ ...prev, [w.employee_id]: { ...draft, hours: Number(e.target.value) } }))}
                          className="w-20 px-2 py-1 border border-slate-200 rounded-lg"
                        />
                      </td>
                      <td className="py-2 px-2">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="12"
                          value={draft.ot}
                          onChange={(e) => setAttDrafts((prev) => ({ ...prev, [w.employee_id]: { ...draft, ot: Number(e.target.value) } }))}
                          className="w-20 px-2 py-1 border border-slate-200 rounded-lg"
                        />
                      </td>
                      <td className="py-2 px-2 text-slate-500">
                        {existing ? <span className="text-emerald-700 font-medium">{existing.status} ({existing.worked_hours}h + {existing.overtime_hours}h OT)</span> : 'Not synced yet'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Production & QC Tab */}
      {subTab === 'production' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <form onSubmit={handleSaveProduction} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
            <h4 className="text-sm font-bold text-slate-900">Log Production &amp; QC Quantities</h4>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" required value={prodForm.work_date} onChange={(e) => setProdForm({ ...prodForm, work_date: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
              <select value={prodForm.allocation_mode} onChange={(e) => setProdForm({ ...prodForm, allocation_mode: e.target.value as any })} className="px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="INDIVIDUAL">Individual Operation</option>
                <option value="SHARED_LINE">Shared Line Output</option>
              </select>
            </div>
            <select value={prodForm.production_unit_id} onChange={(e) => setProdForm({ ...prodForm, production_unit_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
              <option value="">-- Select Line / Unit --</option>
              {data.units.map((u) => (
                <option key={u.id} value={u.id}>{u.unit_name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select value={prodForm.order_id} onChange={(e) => setProdForm({ ...prodForm, order_id: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">Order (Optional)</option>
                {data.orders.map((o) => (
                  <option key={o.id} value={o.id}>{o.order_number}</option>
                ))}
              </select>
              <select value={prodForm.style_id} onChange={(e) => setProdForm({ ...prodForm, style_id: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">Style (Optional)</option>
                {data.styles.map((s) => (
                  <option key={s.id} value={s.id}>{s.style_code}</option>
                ))}
              </select>
            </div>
            <select required value={prodForm.operation_id} onChange={(e) => setProdForm({ ...prodForm, operation_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
              <option value="">-- Select Operation * --</option>
              {data.operations.map((o) => (
                <option key={o.id} value={o.id}>{o.operation_name} ({o.operation_code})</option>
              ))}
            </select>

            {prodForm.allocation_mode === 'INDIVIDUAL' ? (
              <select required value={prodForm.employee_id} onChange={(e) => setProdForm({ ...prodForm, employee_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">-- Select Worker * --</option>
                {data.workers.map((w) => (
                  <option key={w.id} value={w.employee_id}>{data.empNameMap[w.employee_id]}</option>
                ))}
              </select>
            ) : (
              <div className="space-y-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Shared Line Split Method</span>
                  <select value={prodForm.shared_split_method} onChange={(e) => setProdForm({ ...prodForm, shared_split_method: e.target.value as SharedSplitMethod })} className="px-2 py-1 border border-slate-200 rounded-lg bg-white">
                    <option value="EQUAL">EQUAL</option>
                    <option value="BY_HOURS">BY_HOURS</option>
                    <option value="BY_SKILL_WEIGHT">BY_SKILL_WEIGHT</option>
                  </select>
                </div>
                <div className="max-h-28 overflow-y-auto space-y-1">
                  {data.workers.map((w) => {
                    const checked = prodForm.participant_employee_ids.includes(w.employee_id);
                    return (
                      <label key={w.id} className="flex items-center gap-2 text-[11px] cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setProdForm((prev) => ({
                              ...prev,
                              participant_employee_ids: e.target.checked
                                ? [...prev.participant_employee_ids, w.employee_id]
                                : prev.participant_employee_ids.filter((id) => id !== w.employee_id),
                            }))
                          }
                        />
                        <span>{data.empNameMap[w.employee_id]} (wt {w.skill_weightage})</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-500">Produced Qty</label>
                <input type="number" min={0} value={prodForm.produced_qty} onChange={(e) => setProdForm({ ...prodForm, produced_qty: Number(e.target.value) })} className="w-full px-3 py-1.5 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-emerald-700">Accepted Qty</label>
                <input type="number" min={0} value={prodForm.accepted_qty} onChange={(e) => setProdForm({ ...prodForm, accepted_qty: Number(e.target.value) })} className="w-full px-3 py-1.5 border border-emerald-200 rounded-xl" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-rose-600">Rejected Qty</label>
                <input type="number" min={0} value={prodForm.rejected_qty} onChange={(e) => setProdForm({ ...prodForm, rejected_qty: Number(e.target.value) })} className="w-full px-3 py-1.5 border border-rose-200 rounded-xl" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-amber-700">Rework Pending</label>
                <input type="number" min={0} value={prodForm.rework_qty} onChange={(e) => setProdForm({ ...prodForm, rework_qty: Number(e.target.value) })} className="w-full px-3 py-1.5 border border-amber-200 rounded-xl" />
              </div>
              <div className="col-span-2">
                <label className="text-[11px] font-semibold text-slate-500">Rework Passed QC Qty</label>
                <input type="number" min={0} value={prodForm.rework_accepted_qty} onChange={(e) => setProdForm({ ...prodForm, rework_accepted_qty: Number(e.target.value) })} className="w-full px-3 py-1.5 border border-slate-200 rounded-xl" />
              </div>
            </div>

            <input placeholder="Rejection Reason Code (e.g. SKIP_STITCH)" value={prodForm.rejection_reason_code} onChange={(e) => setProdForm({ ...prodForm, rejection_reason_code: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            <button disabled={saving} type="submit" className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
              {saving ? 'Calculating & Saving...' : 'Submit Production & Auto-Compute Wage'}
            </button>
          </form>

          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
            <h4 className="text-sm font-bold text-slate-900 mb-3">Production &amp; Quality Ledger ({data.productionEntries.length})</h4>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-left uppercase text-slate-500">
                  <th className="py-2 px-2">Date</th>
                  <th className="py-2 px-2">Worker / Mode</th>
                  <th className="py-2 px-2">Operation</th>
                  <th className="py-2 px-2 text-right">Prod / Acc / Rej / Rew</th>
                  <th className="py-2 px-2 text-right">Rate</th>
                  <th className="py-2 px-2 text-right">Piece Wage</th>
                  <th className="py-2 px-2">QC / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.productionEntries.map((e) => {
                  const op = data.operations.find((o) => o.id === e.operation_id);
                  return (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="py-2 px-2">{e.work_date}</td>
                      <td className="py-2 px-2 font-medium">{e.allocation_mode === 'SHARED_LINE' ? `Shared (${e.shared_split_method})` : data.empNameMap[e.employee_id || ''] || '—'}</td>
                      <td className="py-2 px-2">{op?.operation_name || e.operation_id}</td>
                      <td className="py-2 px-2 text-right">{e.produced_qty} / <strong className="text-emerald-700">{e.accepted_qty}</strong> / <span className="text-rose-600">{e.rejected_qty}</span> / {e.rework_qty}</td>
                      <td className="py-2 px-2 text-right">{data.currency} {e.applied_unit_rate}</td>
                      <td className="py-2 px-2 text-right font-bold">{data.currency} {e.computed_piece_amount}</td>
                      <td className="py-2 px-2">
                        {e.approval_status === 'SUBMITTED' || e.qc_status === 'PENDING' ? (
                          <button onClick={() => handleVerifyEntry(e.id)} className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 font-semibold hover:bg-emerald-100">
                            Approve QC
                          </button>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold">{e.approval_status}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Corrections & Worker Disputes */}
      {subTab === 'corrections' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h4 className="text-sm font-bold text-slate-900 mb-3">Supervisor Corrections &amp; Worker Earnings Disputes</h4>
          {data.corrections.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No correction requests or worker disputes filed yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-left uppercase text-slate-500">
                    <th className="py-2 px-2">Date / Type</th>
                    <th className="py-2 px-2">Worker</th>
                    <th className="py-2 px-2">Reason &amp; Details</th>
                    <th className="py-2 px-2">Status</th>
                    <th className="py-2 px-2 text-right">Review</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.corrections.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 px-2">
                        <div className="font-semibold text-slate-800">{c.request_type}</div>
                        <div className="text-slate-400">{c.work_date || c.created_at?.slice(0, 10)}</div>
                      </td>
                      <td className="py-2.5 px-2 font-medium">{c.employee_id ? data.empNameMap[c.employee_id] : '—'}</td>
                      <td className="py-2.5 px-2 text-slate-700">{c.reason}</td>
                      <td className="py-2.5 px-2">
                        <span className={`px-2 py-0.5 rounded-full font-semibold ${c.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : c.status === 'REJECTED' ? 'bg-rose-50 text-rose-700' : 'bg-amber-50 text-amber-700'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right space-x-1.5">
                        {c.status === 'PENDING' && (
                          <>
                            <button disabled={saving} onClick={() => handleReviewCorrection(c.id, 'APPROVED')} className="px-2 py-1 rounded bg-emerald-600 text-white font-semibold inline-flex items-center gap-1">
                              <Check className="w-3 h-3" /> Approve
                            </button>
                            <button disabled={saving} onClick={() => handleReviewCorrection(c.id, 'REJECTED')} className="px-2 py-1 rounded bg-rose-600 text-white font-semibold inline-flex items-center gap-1">
                              <X className="w-3 h-3" /> Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

