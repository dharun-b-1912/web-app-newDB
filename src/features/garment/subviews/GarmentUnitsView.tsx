import React, { useState } from 'react';
import { Factory, Plus, Users, Edit2, Save, X } from 'lucide-react';
import { GarmentSubviewProps } from '../types';
import { garmentMasterService } from '../../../services/garment/garmentMasterService';
import { LineStage, SharedSplitMethod, UnitType } from '../../../types/garment';

export const GarmentUnitsView: React.FC<GarmentSubviewProps> = ({ data, onRefresh }) => {
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Unit form
  const [unitForm, setUnitForm] = useState({
    id: '' as string,
    unit_code: '',
    unit_name: '',
    unit_type: 'LINE' as UnitType,
    line_stage: 'STITCHING' as LineStage,
    work_location_id: '',
    parent_unit_id: '',
    supervisor_employee_id: '',
    tl_employee_id: '',
    qc_inspector_employee_id: '',
    piece_rate_mode_override: '' as '' | 'INDIVIDUAL_OPERATION' | 'SHARED_LINE_OUTPUT',
    shared_split_method_override: '' as '' | SharedSplitMethod,
    daily_target_qty: 500,
    is_active: true,
  });

  // Team form
  const [teamForm, setTeamForm] = useState({
    id: '' as string,
    team_code: '',
    team_name: '',
    production_unit_id: '',
    shift_id: '',
    tl_employee_id: '',
    supervisor_employee_id: '',
    is_active: true,
  });

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSaving(true);
    try {
      await garmentMasterService.saveUnit({
        ...(unitForm.id ? { id: unitForm.id } : {}),
        organization_id: data.orgId,
        unit_code: unitForm.unit_code.trim().toUpperCase(),
        unit_name: unitForm.unit_name.trim(),
        unit_type: unitForm.unit_type,
        line_stage: unitForm.line_stage,
        work_location_id: unitForm.work_location_id || null,
        parent_unit_id: unitForm.parent_unit_id || null,
        supervisor_employee_id: unitForm.supervisor_employee_id || null,
        tl_employee_id: unitForm.tl_employee_id || null,
        qc_inspector_employee_id: unitForm.qc_inspector_employee_id || null,
        piece_rate_mode_override: unitForm.piece_rate_mode_override || null,
        shared_split_method_override: unitForm.shared_split_method_override || null,
        daily_target_qty: Number(unitForm.daily_target_qty || 0),
        is_active: unitForm.is_active,
      });
      setUnitForm({
        id: '',
        unit_code: '',
        unit_name: '',
        unit_type: 'LINE',
        line_stage: 'STITCHING',
        work_location_id: '',
        parent_unit_id: '',
        supervisor_employee_id: '',
        tl_employee_id: '',
        qc_inspector_employee_id: '',
        piece_rate_mode_override: '',
        shared_split_method_override: '',
        daily_target_qty: 500,
        is_active: true,
      });
      await onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamForm.production_unit_id) {
      setErrorMsg('Please select a Production Unit / Line for this team.');
      return;
    }
    setErrorMsg(null);
    setSaving(true);
    try {
      await garmentMasterService.saveTeam({
        ...(teamForm.id ? { id: teamForm.id } : {}),
        organization_id: data.orgId,
        team_code: teamForm.team_code.trim().toUpperCase(),
        team_name: teamForm.team_name.trim(),
        production_unit_id: teamForm.production_unit_id,
        shift_id: teamForm.shift_id || null,
        tl_employee_id: teamForm.tl_employee_id || null,
        supervisor_employee_id: teamForm.supervisor_employee_id || null,
        is_active: teamForm.is_active,
      });
      setTeamForm({
        id: '',
        team_code: '',
        team_name: '',
        production_unit_id: '',
        shift_id: '',
        tl_employee_id: '',
        supervisor_employee_id: '',
        is_active: true,
      });
      await onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Create / Edit Production Unit */}
        <form onSubmit={handleSaveUnit} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Factory className="w-4 h-4 text-emerald-600" />
              {unitForm.id ? 'Edit Production Unit / Line' : 'Add Factory, Floor or Sewing Line'}
            </h3>
            {unitForm.id && (
              <button type="button" onClick={() => setUnitForm({ ...unitForm, id: '' })} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Unit Code *</label>
              <input required value={unitForm.unit_code} onChange={(e) => setUnitForm({ ...unitForm, unit_code: e.target.value })} placeholder="LINE-01" className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Unit Name *</label>
              <input required value={unitForm.unit_name} onChange={(e) => setUnitForm({ ...unitForm, unit_name: e.target.value })} placeholder="Stitching Line A" className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Unit Type</label>
              <select value={unitForm.unit_type} onChange={(e) => setUnitForm({ ...unitForm, unit_type: e.target.value as UnitType })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="FACTORY">FACTORY</option>
                <option value="FLOOR">FLOOR</option>
                <option value="LINE">LINE</option>
                <option value="SECTION">SECTION</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Production Stage</label>
              <select value={unitForm.line_stage} onChange={(e) => setUnitForm({ ...unitForm, line_stage: e.target.value as LineStage })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="CUTTING">CUTTING</option>
                <option value="STITCHING">STITCHING</option>
                <option value="FINISHING">FINISHING</option>
                <option value="CHECKING">CHECKING</option>
                <option value="PACKING">PACKING</option>
                <option value="GENERAL">GENERAL</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Work Location (Plant)</label>
              <select value={unitForm.work_location_id} onChange={(e) => setUnitForm({ ...unitForm, work_location_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">-- Select Work Location --</option>
                {data.workLocations.map((wl) => (
                  <option key={wl.id} value={wl.id}>{wl.name}{wl.city ? ` (${wl.city})` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Parent Factory / Floor</label>
              <select value={unitForm.parent_unit_id} onChange={(e) => setUnitForm({ ...unitForm, parent_unit_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">-- Top Level --</option>
                {data.units.filter((u) => u.id !== unitForm.id).map((u) => (
                  <option key={u.id} value={u.id}>{u.unit_name} ({u.unit_type})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Supervisor</label>
              <select value={unitForm.supervisor_employee_id} onChange={(e) => setUnitForm({ ...unitForm, supervisor_employee_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">-- Unassigned --</option>
                {data.employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{data.empNameMap[emp.id]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Team Lead (TL)</label>
              <select value={unitForm.tl_employee_id} onChange={(e) => setUnitForm({ ...unitForm, tl_employee_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">-- Unassigned --</option>
                {data.employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{data.empNameMap[emp.id]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">QC Inspector</label>
              <select value={unitForm.qc_inspector_employee_id} onChange={(e) => setUnitForm({ ...unitForm, qc_inspector_employee_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">-- Unassigned --</option>
                {data.employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{data.empNameMap[emp.id]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Daily Target Qty</label>
              <input type="number" min={0} value={unitForm.daily_target_qty} onChange={(e) => setUnitForm({ ...unitForm, daily_target_qty: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Piece-Rate Mode Override</label>
              <select value={unitForm.piece_rate_mode_override} onChange={(e) => setUnitForm({ ...unitForm, piece_rate_mode_override: e.target.value as any })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">Inherit Org Setting ({data.settings.piece_rate_calculation_mode})</option>
                <option value="INDIVIDUAL_OPERATION">INDIVIDUAL_OPERATION</option>
                <option value="SHARED_LINE_OUTPUT">SHARED_LINE_OUTPUT</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Shared Split Method</label>
              <select value={unitForm.shared_split_method_override} onChange={(e) => setUnitForm({ ...unitForm, shared_split_method_override: e.target.value as any })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">Inherit Org ({data.settings.default_shared_split_method})</option>
                <option value="EQUAL">EQUAL</option>
                <option value="BY_HOURS">BY_HOURS</option>
                <option value="BY_SKILL_WEIGHT">BY_SKILL_WEIGHT</option>
              </select>
            </div>
          </div>

          <button disabled={saving} type="submit" className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-2">
            <Save className="w-3.5 h-3.5" /> {saving ? 'Saving...' : unitForm.id ? 'Update Unit' : 'Create Production Unit'}
          </button>
        </form>

        {/* Create / Edit Production Team */}
        <form onSubmit={handleSaveTeam} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              {teamForm.id ? 'Edit Floor Team' : 'Create Production Team & Shift Mapping'}
            </h3>
            {teamForm.id && (
              <button type="button" onClick={() => setTeamForm({ ...teamForm, id: '' })} className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Team Code *</label>
              <input required value={teamForm.team_code} onChange={(e) => setTeamForm({ ...teamForm, team_code: e.target.value })} placeholder="TM-STITCH-A" className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Team Name *</label>
              <input required value={teamForm.team_name} onChange={(e) => setTeamForm({ ...teamForm, team_name: e.target.value })} placeholder="Line A Collar Batch" className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Production Unit / Line *</label>
              <select required value={teamForm.production_unit_id} onChange={(e) => setTeamForm({ ...teamForm, production_unit_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">-- Select Line / Unit --</option>
                {data.units.map((u) => (
                  <option key={u.id} value={u.id}>{u.unit_name} ({u.unit_code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Shift</label>
              <select value={teamForm.shift_id} onChange={(e) => setTeamForm({ ...teamForm, shift_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">-- Any Shift --</option>
                {data.shifts.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.start_time}–{s.end_time})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Team Leader (TL)</label>
              <select value={teamForm.tl_employee_id} onChange={(e) => setTeamForm({ ...teamForm, tl_employee_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">-- Select TL --</option>
                {data.employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{data.empNameMap[emp.id]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-600 mb-1">Supervisor</label>
              <select value={teamForm.supervisor_employee_id} onChange={(e) => setTeamForm({ ...teamForm, supervisor_employee_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">-- Select Supervisor --</option>
                {data.employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{data.empNameMap[emp.id]}</option>
                ))}
              </select>
            </div>
          </div>

          <button disabled={saving} type="submit" className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-2">
            <Plus className="w-3.5 h-3.5" /> {saving ? 'Saving...' : teamForm.id ? 'Update Team' : 'Save Team Mapping'}
          </button>
        </form>
      </div>

      {/* Existing Units Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Registered Factories, Floors &amp; Lines ({data.units.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-left uppercase text-slate-500">
                <th className="py-2 px-2">Code / Name</th>
                <th className="py-2 px-2">Type / Stage</th>
                <th className="py-2 px-2">Supervisor &amp; TL</th>
                <th className="py-2 px-2">QC Inspector</th>
                <th className="py-2 px-2">Mode Override</th>
                <th className="py-2 px-2 text-right">Target/Day</th>
                <th className="py-2 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.units.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-2">
                    <div className="font-semibold text-slate-800">{u.unit_name}</div>
                    <div className="text-slate-400">{u.unit_code}</div>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">{u.unit_type}</span> • {u.line_stage}
                  </td>
                  <td className="py-2.5 px-2 text-slate-600">
                    Sup: {u.supervisor_employee_id ? data.empNameMap[u.supervisor_employee_id] : '—'}<br />
                    TL: {u.tl_employee_id ? data.empNameMap[u.tl_employee_id] : '—'}
                  </td>
                  <td className="py-2.5 px-2 text-slate-600">{u.qc_inspector_employee_id ? data.empNameMap[u.qc_inspector_employee_id] : '—'}</td>
                  <td className="py-2.5 px-2 text-slate-600">{u.piece_rate_mode_override || 'Inherit Org'}</td>
                  <td className="py-2.5 px-2 text-right font-semibold">{u.daily_target_qty}</td>
                  <td className="py-2.5 px-2 text-right">
                    <button
                      onClick={() =>
                        setUnitForm({
                          id: u.id,
                          unit_code: u.unit_code,
                          unit_name: u.unit_name,
                          unit_type: u.unit_type,
                          line_stage: u.line_stage,
                          work_location_id: u.work_location_id || '',
                          parent_unit_id: u.parent_unit_id || '',
                          supervisor_employee_id: u.supervisor_employee_id || '',
                          tl_employee_id: u.tl_employee_id || '',
                          qc_inspector_employee_id: u.qc_inspector_employee_id || '',
                          piece_rate_mode_override: u.piece_rate_mode_override || '',
                          shared_split_method_override: u.shared_split_method_override || '',
                          daily_target_qty: u.daily_target_qty,
                          is_active: u.is_active,
                        })
                      }
                      className="text-emerald-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Existing Teams Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-900 mb-3">Production Teams ({data.teams.length})</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-left uppercase text-slate-500">
                <th className="py-2 px-2">Team</th>
                <th className="py-2 px-2">Line / Unit</th>
                <th className="py-2 px-2">Shift</th>
                <th className="py-2 px-2">TL / Supervisor</th>
                <th className="py-2 px-2 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.teams.map((t) => {
                const unit = data.units.find((u) => u.id === t.production_unit_id);
                const shift = data.shifts.find((s) => s.id === t.shift_id);
                return (
                  <tr key={t.id} className="hover:bg-slate-50">
                    <td className="py-2 px-2 font-semibold text-slate-800">{t.team_name} ({t.team_code})</td>
                    <td className="py-2 px-2 text-slate-600">{unit ? unit.unit_name : '—'}</td>
                    <td className="py-2 px-2 text-slate-600">{shift ? shift.name : 'All'}</td>
                    <td className="py-2 px-2 text-slate-600">
                      TL: {t.tl_employee_id ? data.empNameMap[t.tl_employee_id] : '—'} • Sup: {t.supervisor_employee_id ? data.empNameMap[t.supervisor_employee_id] : '—'}
                    </td>
                    <td className="py-2 px-2 text-right">
                      <button
                        onClick={() =>
                          setTeamForm({
                            id: t.id,
                            team_code: t.team_code,
                            team_name: t.team_name,
                            production_unit_id: t.production_unit_id,
                            shift_id: t.shift_id || '',
                            tl_employee_id: t.tl_employee_id || '',
                            supervisor_employee_id: t.supervisor_employee_id || '',
                            is_active: t.is_active,
                          })
                        }
                        className="text-emerald-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    </td>
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

