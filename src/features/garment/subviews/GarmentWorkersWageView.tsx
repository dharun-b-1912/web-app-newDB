import React, { useState } from 'react';
import { UserPlus, IndianRupee, Save } from 'lucide-react';
import { GarmentSubviewProps } from '../types';
import { garmentMasterService } from '../../../services/garment/garmentMasterService';
import { PaymentFrequency, SkillGrade, WageMethod, WorkerCategory } from '../../../types/garment';

export const GarmentWorkersWageView: React.FC<GarmentSubviewProps> = ({ data, onRefresh }) => {
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [workerForm, setWorkerForm] = useState({
    employee_id: '',
    worker_category: 'PIECE_RATE' as WorkerCategory,
    skill_grade: 'GRADE_B' as SkillGrade,
    skill_weightage: 1.0,
    contractor_vendor_id: '',
    primary_unit_id: '',
    primary_team_id: '',
    default_wage_method: 'PIECE_RATE' as WageMethod,
    default_payment_frequency: 'WEEKLY' as PaymentFrequency,
    attendance_mode: 'BOTH' as 'STANDARD_BIOMETRIC_GPS' | 'SUPERVISOR_FLOOR' | 'BOTH',
  });

  const [wageForm, setWageForm] = useState({
    employee_id: '',
    wage_method: 'HYBRID' as WageMethod,
    payment_frequency: 'MONTHLY' as PaymentFrequency,
    daily_rate: 700,
    hourly_rate: 100,
    hybrid_base_daily_rate: 400,
    hybrid_base_hourly_rate: 0,
    default_piece_rate: 5,
    overtime_hourly_rate: 0,
    minimum_daily_guarantee: 0,
    incentive_eligible: true,
    effective_from: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const handleSaveWorker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerForm.employee_id) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      await garmentMasterService.upsertWorkerProfile({
        organization_id: data.orgId,
        employee_id: workerForm.employee_id,
        worker_category: workerForm.worker_category,
        skill_grade: workerForm.skill_grade,
        skill_weightage: Number(workerForm.skill_weightage || 1),
        contractor_vendor_id: workerForm.contractor_vendor_id || null,
        primary_unit_id: workerForm.primary_unit_id || null,
        primary_team_id: workerForm.primary_team_id || null,
        default_wage_method: workerForm.default_wage_method,
        default_payment_frequency: workerForm.default_payment_frequency,
        attendance_mode: workerForm.attendance_mode,
        is_active: true,
      });
      setStatusMsg({ type: 'ok', text: 'Garment worker profile enrolled & synced.' });
      await onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveWage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wageForm.employee_id) return;
    setSaving(true);
    setStatusMsg(null);
    try {
      await garmentMasterService.saveWageAssignment({
        organization_id: data.orgId,
        employee_id: wageForm.employee_id,
        wage_method: wageForm.wage_method,
        payment_frequency: wageForm.payment_frequency,
        daily_rate: Number(wageForm.daily_rate || 0),
        hourly_rate: Number(wageForm.hourly_rate || 0),
        hybrid_base_daily_rate: Number(wageForm.hybrid_base_daily_rate || 0),
        hybrid_base_hourly_rate: Number(wageForm.hybrid_base_hourly_rate || 0),
        default_piece_rate: Number(wageForm.default_piece_rate || 0),
        overtime_hourly_rate: Number(wageForm.overtime_hourly_rate || 0),
        minimum_daily_guarantee: Number(wageForm.minimum_daily_guarantee || 0),
        incentive_eligible: wageForm.incentive_eligible,
        effective_from: wageForm.effective_from,
        notes: wageForm.notes || null,
        is_active: true,
      });
      setStatusMsg({ type: 'ok', text: 'Effective-dated wage assignment saved.' });
      await onRefresh();
    } catch (err: any) {
      setStatusMsg({ type: 'err', text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {statusMsg && (
        <div className={`p-3 rounded-xl text-xs font-medium border ${statusMsg.type === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
          {statusMsg.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Worker Enrollment & Category Classification */}
        <form onSubmit={handleSaveWorker} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-emerald-600" /> Enroll / Categorize Garment Worker
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="col-span-2">
              <label className="block font-semibold text-slate-600 mb-1">Core HRMS Employee *</label>
              <select
                required
                value={workerForm.employee_id}
                onChange={(e) => {
                  const empId = e.target.value;
                  const existing = data.workers.find((w) => w.employee_id === empId);
                  if (existing) {
                    setWorkerForm({
                      employee_id: empId,
                      worker_category: existing.worker_category,
                      skill_grade: existing.skill_grade,
                      skill_weightage: existing.skill_weightage,
                      contractor_vendor_id: existing.contractor_vendor_id || '',
                      primary_unit_id: existing.primary_unit_id || '',
                      primary_team_id: existing.primary_team_id || '',
                      default_wage_method: existing.default_wage_method,
                      default_payment_frequency: existing.default_payment_frequency,
                      attendance_mode: existing.attendance_mode,
                    });
                  } else {
                    setWorkerForm({ ...workerForm, employee_id: empId });
                  }
                  setWageForm((prev) => ({ ...prev, employee_id: empId }));
                }}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white"
              >
                <option value="">-- Select Employee from Master Directory --</option>
                {data.employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {data.empNameMap[e.id]} ({e.employee_code || e.id.slice(0, 6)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Worker Category</label>
              <select value={workerForm.worker_category} onChange={(e) => setWorkerForm({ ...workerForm, worker_category: e.target.value as WorkerCategory })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="PERMANENT">PERMANENT</option>
                <option value="TEMPORARY">TEMPORARY</option>
                <option value="CONTRACT">CONTRACT</option>
                <option value="MIGRANT">MIGRANT</option>
                <option value="PIECE_RATE">PIECE_RATE</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Skill Grade</label>
              <select value={workerForm.skill_grade} onChange={(e) => setWorkerForm({ ...workerForm, skill_grade: e.target.value as SkillGrade })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="HELPER">HELPER</option>
                <option value="GRADE_C">GRADE_C</option>
                <option value="GRADE_B">GRADE_B</option>
                <option value="GRADE_A">GRADE_A</option>
                <option value="MASTER_TAILOR">MASTER_TAILOR</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Skill Weightage (for Shared Split)</label>
              <input type="number" step="0.1" min="0.1" value={workerForm.skill_weightage} onChange={(e) => setWorkerForm({ ...workerForm, skill_weightage: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Contractor / Vendor</label>
              <select value={workerForm.contractor_vendor_id} onChange={(e) => setWorkerForm({ ...workerForm, contractor_vendor_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">Direct Payroll (None)</option>
                {data.vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Primary Line / Unit</label>
              <select value={workerForm.primary_unit_id} onChange={(e) => setWorkerForm({ ...workerForm, primary_unit_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">-- Select Line --</option>
                {data.units.map((u) => (
                  <option key={u.id} value={u.id}>{u.unit_name} ({u.unit_code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Primary Team</label>
              <select value={workerForm.primary_team_id} onChange={(e) => setWorkerForm({ ...workerForm, primary_team_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">-- Select Team --</option>
                {data.teams.map((t) => (
                  <option key={t.id} value={t.id}>{t.team_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Default Wage Method</label>
              <select value={workerForm.default_wage_method} onChange={(e) => setWorkerForm({ ...workerForm, default_wage_method: e.target.value as WageMethod })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="DAILY">DAILY</option>
                <option value="HOURLY">HOURLY</option>
                <option value="PIECE_RATE">PIECE_RATE</option>
                <option value="HYBRID">HYBRID</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Payment Cycle Frequency</label>
              <select value={workerForm.default_payment_frequency} onChange={(e) => setWorkerForm({ ...workerForm, default_payment_frequency: e.target.value as PaymentFrequency })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="DAILY">DAILY</option>
                <option value="WEEKLY">WEEKLY</option>
                <option value="FORTNIGHTLY">FORTNIGHTLY</option>
                <option value="MONTHLY">MONTHLY</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </div>
          </div>
          <button disabled={saving} type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2">
            <Save className="w-3.5 h-3.5" /> Save Garment Worker Profile
          </button>
        </form>

        {/* Wage Method & Effective Rate Assignment */}
        <form onSubmit={handleSaveWage} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <IndianRupee className="w-4 h-4 text-emerald-600" /> Configure Wage Method &amp; Effective Rates
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="col-span-2">
              <label className="block font-semibold text-slate-600 mb-1">Worker *</label>
              <select required value={wageForm.employee_id} onChange={(e) => setWageForm({ ...wageForm, employee_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">-- Select Worker --</option>
                {data.employees.map((e) => (
                  <option key={e.id} value={e.id}>{data.empNameMap[e.id]}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-600 mb-1">Wage Method</label>
              <select value={wageForm.wage_method} onChange={(e) => setWageForm({ ...wageForm, wage_method: e.target.value as WageMethod })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="DAILY">DAILY (Per Day)</option>
                <option value="HOURLY">HOURLY (Per Hour)</option>
                <option value="PIECE_RATE">PIECE_RATE (Per Approved Piece)</option>
                <option value="HYBRID">HYBRID (Daily/Hourly Base + Piece)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Pay Frequency</label>
              <select value={wageForm.payment_frequency} onChange={(e) => setWageForm({ ...wageForm, payment_frequency: e.target.value as PaymentFrequency })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="DAILY">DAILY</option>
                <option value="WEEKLY">WEEKLY</option>
                <option value="FORTNIGHTLY">FORTNIGHTLY</option>
                <option value="MONTHLY">MONTHLY</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </div>

            {wageForm.wage_method === 'DAILY' && (
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Daily Wage Rate ({data.currency})</label>
                <input type="number" step="0.01" min="0" value={wageForm.daily_rate} onChange={(e) => setWageForm({ ...wageForm, daily_rate: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
              </div>
            )}

            {wageForm.wage_method === 'HOURLY' && (
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Hourly Wage Rate ({data.currency})</label>
                <input type="number" step="0.01" min="0" value={wageForm.hourly_rate} onChange={(e) => setWageForm({ ...wageForm, hourly_rate: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
              </div>
            )}

            {wageForm.wage_method === 'HYBRID' && (
              <>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Hybrid Daily Guarantee ({data.currency})</label>
                  <input type="number" step="0.01" min="0" value={wageForm.hybrid_base_daily_rate} onChange={(e) => setWageForm({ ...wageForm, hybrid_base_daily_rate: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Hybrid Base Hourly ({data.currency})</label>
                  <input type="number" step="0.01" min="0" value={wageForm.hybrid_base_hourly_rate} onChange={(e) => setWageForm({ ...wageForm, hybrid_base_hourly_rate: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
                </div>
              </>
            )}

            {(wageForm.wage_method === 'PIECE_RATE' || wageForm.wage_method === 'HYBRID') && (
              <div>
                <label className="block font-semibold text-slate-600 mb-1">Fallback Piece Rate ({data.currency})</label>
                <input type="number" step="0.01" min="0" value={wageForm.default_piece_rate} onChange={(e) => setWageForm({ ...wageForm, default_piece_rate: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-600 mb-1">OT Hourly Override (0 = auto)</label>
              <input type="number" step="0.01" min="0" value={wageForm.overtime_hourly_rate} onChange={(e) => setWageForm({ ...wageForm, overtime_hourly_rate: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Min Daily Guarantee Floor</label>
              <input type="number" step="0.01" min="0" value={wageForm.minimum_daily_guarantee} onChange={(e) => setWageForm({ ...wageForm, minimum_daily_guarantee: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Effective From *</label>
              <input required type="date" value={wageForm.effective_from} onChange={(e) => setWageForm({ ...wageForm, effective_from: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div className="flex items-end pb-2">
              <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                <input type="checkbox" checked={wageForm.incentive_eligible} onChange={(e) => setWageForm({ ...wageForm, incentive_eligible: e.target.checked })} className="rounded text-emerald-600" />
                Incentive Eligible
              </label>
            </div>
          </div>

          <button disabled={saving} type="submit" className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2">
            <Save className="w-3.5 h-3.5" /> Assign Effective Wage Structure
          </button>
        </form>
      </div>

      {/* Enrolled Workers & Active Wage Configurations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Garment Worker Directory &amp; Wage Rules ({data.workers.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-left uppercase text-slate-500">
                <th className="py-2 px-2">Worker</th>
                <th className="py-2 px-2">Category &amp; Grade</th>
                <th className="py-2 px-2">Line / Team</th>
                <th className="py-2 px-2">Active Wage Assignment</th>
                <th className="py-2 px-2">Frequency</th>
                <th className="py-2 px-2">Effective From</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.workers.map((w) => {
                const unit = data.units.find((u) => u.id === w.primary_unit_id);
                const team = data.teams.find((t) => t.id === w.primary_team_id);
                const activeAssign = data.wageAssignments.find((a) => a.employee_id === w.employee_id && a.is_active);
                return (
                  <tr key={w.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-2 font-semibold text-slate-800">{data.empNameMap[w.employee_id] || w.employee_id}</td>
                    <td className="py-2.5 px-2">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">{w.worker_category}</span> • {w.skill_grade} (wt {w.skill_weightage})
                    </td>
                    <td className="py-2.5 px-2 text-slate-600">{unit ? unit.unit_name : '—'} / {team ? team.team_name : '—'}</td>
                    <td className="py-2.5 px-2 font-medium text-emerald-700">
                      {activeAssign ? (
                        <>
                          {activeAssign.wage_method} —{' '}
                          {activeAssign.wage_method === 'DAILY' && `${data.currency} ${activeAssign.daily_rate}/day`}
                          {activeAssign.wage_method === 'HOURLY' && `${data.currency} ${activeAssign.hourly_rate}/hr`}
                          {activeAssign.wage_method === 'PIECE_RATE' && `Rate Card (fallback ${data.currency} ${activeAssign.default_piece_rate}/pc)`}
                          {activeAssign.wage_method === 'HYBRID' && `${data.currency} ${activeAssign.hybrid_base_daily_rate}/day + ${data.currency} ${activeAssign.default_piece_rate}/pc`}
                        </>
                      ) : (
                        <span className="text-amber-600">Default: {w.default_wage_method} (No rate sheet)</span>
                      )}
                    </td>
                    <td className="py-2.5 px-2 text-slate-600">{activeAssign?.payment_frequency || w.default_payment_frequency}</td>
                    <td className="py-2.5 px-2 text-slate-500">{activeAssign?.effective_from || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

