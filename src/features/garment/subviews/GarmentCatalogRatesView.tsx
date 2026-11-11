import React, { useState } from 'react';
import { Scissors, Plus, Layers, Tag, ClipboardList } from 'lucide-react';
import { GarmentSubviewProps } from '../types';
import { garmentMasterService } from '../../../services/garment/garmentMasterService';
import { OperationStage, SharedSplitMethod, SkillGrade } from '../../../types/garment';

export const GarmentCatalogRatesView: React.FC<GarmentSubviewProps> = ({ data, onRefresh }) => {
  const [subTab, setSubTab] = useState<'styles' | 'operations' | 'orders' | 'rates'>('styles');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [styleForm, setStyleForm] = useState({
    style_code: '',
    style_name: '',
    garment_category: 'SHIRT',
    buyer_name: '',
    season: '',
    standard_sam_minutes: 18,
    target_efficiency_pct: 75,
  });

  const [opForm, setOpForm] = useState({
    operation_code: '',
    operation_name: '',
    department_stage: 'STITCHING' as OperationStage,
    sequence_order: 1,
    unit_of_measure: 'PIECE',
    default_smv: 1.5,
  });

  const [orderForm, setOrderForm] = useState({
    order_number: '',
    buyer_name: '',
    style_id: '',
    production_unit_id: '',
    target_quantity: 5000,
    start_date: new Date().toISOString().split('T')[0],
    due_date: '',
    piece_rate_mode_override: '' as '' | 'INDIVIDUAL_OPERATION' | 'SHARED_LINE_OUTPUT',
    shared_split_method_override: '' as '' | SharedSplitMethod,
    priority: 'NORMAL' as 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT',
    status: 'IN_PROGRESS' as 'PLANNED' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED' | 'CANCELLED',
  });

  const [rateForm, setRateForm] = useState({
    operation_id: '',
    style_id: '',
    order_id: '',
    production_unit_id: '',
    skill_grade: '' as '' | SkillGrade,
    rate_per_unit: 12,
    rework_rate_per_unit: 0,
    rejected_rate_per_unit: 0,
    effective_from: new Date().toISOString().split('T')[0],
  });

  const runSave = async (fn: () => Promise<any>, okText: string) => {
    setSaving(true);
    setMsg(null);
    try {
      await fn();
      setMsg(okText);
      await onRefresh();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-2xl border border-slate-200 w-fit">
        {[
          { id: 'styles', label: `Styles (${data.styles.length})`, icon: Layers },
          { id: 'operations', label: `Operations (${data.operations.length})`, icon: Scissors },
          { id: 'orders', label: `Production Orders (${data.orders.length})`, icon: ClipboardList },
          { id: 'rates', label: `Piece-Rate Matrix (${data.rateCards.length})`, icon: Tag },
        ].map((t) => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition ${active ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {msg && (
        <div className={`p-3 rounded-xl text-xs font-medium border ${msg.startsWith('Error') ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {msg}
        </div>
      )}

      {/* Styles */}
      {subTab === 'styles' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSave(async () => {
                await garmentMasterService.saveStyle({ ...styleForm, style_code: styleForm.style_code.trim().toUpperCase(), is_active: true });
                setStyleForm({ style_code: '', style_name: '', garment_category: 'SHIRT', buyer_name: '', season: '', standard_sam_minutes: 18, target_efficiency_pct: 75 });
              }, 'Garment style saved.');
            }}
            className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs"
          >
            <h4 className="text-sm font-bold text-slate-900">New Garment Style</h4>
            <input required placeholder="Style Code (e.g. STY-OXFORD-01)" value={styleForm.style_code} onChange={(e) => setStyleForm({ ...styleForm, style_code: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            <input required placeholder="Style Name (e.g. Men Formal Oxford Shirt)" value={styleForm.style_name} onChange={(e) => setStyleForm({ ...styleForm, style_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Category (SHIRT, DENIM...)" value={styleForm.garment_category} onChange={(e) => setStyleForm({ ...styleForm, garment_category: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
              <input placeholder="Buyer" value={styleForm.buyer_name} onChange={(e) => setStyleForm({ ...styleForm, buyer_name: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" step="0.1" placeholder="SAM (min)" value={styleForm.standard_sam_minutes} onChange={(e) => setStyleForm({ ...styleForm, standard_sam_minutes: Number(e.target.value) })} className="px-3 py-2 border border-slate-200 rounded-xl" />
              <input type="number" step="1" placeholder="Target Eff %" value={styleForm.target_efficiency_pct} onChange={(e) => setStyleForm({ ...styleForm, target_efficiency_pct: Number(e.target.value) })} className="px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <button disabled={saving} type="submit" className="w-full py-2 rounded-xl bg-emerald-600 text-white font-semibold flex items-center justify-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Save Style
            </button>
          </form>

          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-left uppercase text-slate-500">
                  <th className="py-2 px-2">Code</th>
                  <th className="py-2 px-2">Style Name</th>
                  <th className="py-2 px-2">Category / Buyer</th>
                  <th className="py-2 px-2 text-right">SAM (min)</th>
                  <th className="py-2 px-2 text-right">Target Eff %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.styles.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2 px-2 font-semibold text-slate-800">{s.style_code}</td>
                    <td className="py-2 px-2">{s.style_name}</td>
                    <td className="py-2 px-2 text-slate-500">{s.garment_category}{s.buyer_name ? ` • ${s.buyer_name}` : ''}</td>
                    <td className="py-2 px-2 text-right">{s.standard_sam_minutes}</td>
                    <td className="py-2 px-2 text-right">{s.target_efficiency_pct}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Operations */}
      {subTab === 'operations' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSave(async () => {
                await garmentMasterService.saveOperation({ ...opForm, operation_code: opForm.operation_code.trim().toUpperCase(), is_active: true });
                setOpForm({ operation_code: '', operation_name: '', department_stage: 'STITCHING', sequence_order: data.operations.length + 2, unit_of_measure: 'PIECE', default_smv: 1.5 });
              }, 'Garment operation saved.');
            }}
            className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs"
          >
            <h4 className="text-sm font-bold text-slate-900">New Manufacturing Operation</h4>
            <input required placeholder="Op Code (e.g. OP-COLLAR)" value={opForm.operation_code} onChange={(e) => setOpForm({ ...opForm, operation_code: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            <input required placeholder="Operation Name (e.g. Collar Attach)" value={opForm.operation_name} onChange={(e) => setOpForm({ ...opForm, operation_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            <select value={opForm.department_stage} onChange={(e) => setOpForm({ ...opForm, department_stage: e.target.value as OperationStage })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
              {['CUTTING', 'STITCHING', 'COLLAR_ATTACH', 'SLEEVE_ATTACH', 'BUTTON_FIXING', 'IRONING', 'CHECKING', 'PACKING', 'CUSTOM'].map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input type="number" placeholder="Sequence #" value={opForm.sequence_order} onChange={(e) => setOpForm({ ...opForm, sequence_order: Number(e.target.value) })} className="px-3 py-2 border border-slate-200 rounded-xl" />
              <input type="number" step="0.1" placeholder="SMV" value={opForm.default_smv} onChange={(e) => setOpForm({ ...opForm, default_smv: Number(e.target.value) })} className="px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <button disabled={saving} type="submit" className="w-full py-2 rounded-xl bg-emerald-600 text-white font-semibold">Save Operation</button>
          </form>

          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-left uppercase text-slate-500">
                  <th className="py-2 px-2">Seq</th>
                  <th className="py-2 px-2">Code / Name</th>
                  <th className="py-2 px-2">Stage</th>
                  <th className="py-2 px-2">UoM</th>
                  <th className="py-2 px-2 text-right">SMV</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.operations.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 px-2 text-slate-500">{o.sequence_order}</td>
                    <td className="py-2 px-2 font-semibold text-slate-800">{o.operation_name} <span className="text-slate-400 font-normal">({o.operation_code})</span></td>
                    <td className="py-2 px-2"><span className="px-2 py-0.5 rounded bg-slate-100">{o.department_stage}</span></td>
                    <td className="py-2 px-2">{o.unit_of_measure}</td>
                    <td className="py-2 px-2 text-right">{o.default_smv}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Production Orders */}
      {subTab === 'orders' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSave(async () => {
                await garmentMasterService.saveOrder({
                  order_number: orderForm.order_number.trim().toUpperCase(),
                  buyer_name: orderForm.buyer_name || null,
                  style_id: orderForm.style_id,
                  production_unit_id: orderForm.production_unit_id || null,
                  target_quantity: Number(orderForm.target_quantity || 0),
                  start_date: orderForm.start_date,
                  due_date: orderForm.due_date || null,
                  piece_rate_mode_override: orderForm.piece_rate_mode_override || null,
                  shared_split_method_override: orderForm.shared_split_method_override || null,
                  priority: orderForm.priority,
                  status: orderForm.status,
                });
                setOrderForm({ ...orderForm, order_number: '', buyer_name: '' });
              }, 'Production order created.');
            }}
            className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs"
          >
            <h4 className="text-sm font-bold text-slate-900">Create Production Order</h4>
            <input required placeholder="Order Number (PO-2026-101)" value={orderForm.order_number} onChange={(e) => setOrderForm({ ...orderForm, order_number: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            <select required value={orderForm.style_id} onChange={(e) => setOrderForm({ ...orderForm, style_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
              <option value="">-- Select Style * --</option>
              {data.styles.map((s) => (
                <option key={s.id} value={s.id}>{s.style_name} ({s.style_code})</option>
              ))}
            </select>
            <select value={orderForm.production_unit_id} onChange={(e) => setOrderForm({ ...orderForm, production_unit_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
              <option value="">-- Assign Line / Unit --</option>
              {data.units.map((u) => (
                <option key={u.id} value={u.id}>{u.unit_name}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <input placeholder="Buyer" value={orderForm.buyer_name} onChange={(e) => setOrderForm({ ...orderForm, buyer_name: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
              <input type="number" min={1} placeholder="Target Qty" value={orderForm.target_quantity} onChange={(e) => setOrderForm({ ...orderForm, target_quantity: Number(e.target.value) })} className="px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={orderForm.start_date} onChange={(e) => setOrderForm({ ...orderForm, start_date: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
              <input type="date" value={orderForm.due_date} onChange={(e) => setOrderForm({ ...orderForm, due_date: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <select value={orderForm.piece_rate_mode_override} onChange={(e) => setOrderForm({ ...orderForm, piece_rate_mode_override: e.target.value as any })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
              <option value="">Mode: Inherit Unit / Org</option>
              <option value="INDIVIDUAL_OPERATION">INDIVIDUAL_OPERATION</option>
              <option value="SHARED_LINE_OUTPUT">SHARED_LINE_OUTPUT</option>
            </select>
            <button disabled={saving} type="submit" className="w-full py-2 rounded-xl bg-emerald-600 text-white font-semibold">Save Order</button>
          </form>

          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-left uppercase text-slate-500">
                  <th className="py-2 px-2">Order #</th>
                  <th className="py-2 px-2">Style &amp; Buyer</th>
                  <th className="py-2 px-2">Line / Mode</th>
                  <th className="py-2 px-2 text-right">Target / Done</th>
                  <th className="py-2 px-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.orders.map((ord) => {
                  const st = data.styles.find((s) => s.id === ord.style_id);
                  const un = data.units.find((u) => u.id === ord.production_unit_id);
                  return (
                    <tr key={ord.id}>
                      <td className="py-2 px-2 font-semibold text-slate-800">{ord.order_number}</td>
                      <td className="py-2 px-2">{st?.style_name || ord.style_id} <div className="text-slate-400">{ord.buyer_name || '—'}</div></td>
                      <td className="py-2 px-2 text-slate-600">{un?.unit_name || 'All'} • {ord.piece_rate_mode_override || 'Inherit'}</td>
                      <td className="py-2 px-2 text-right font-medium">{ord.completed_quantity.toLocaleString()} / {ord.target_quantity.toLocaleString()}</td>
                      <td className="py-2 px-2"><span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">{ord.status}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Piece-Rate Cards */}
      {subTab === 'rates' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              runSave(async () => {
                await garmentMasterService.saveRateCard({
                  operation_id: rateForm.operation_id,
                  style_id: rateForm.style_id || null,
                  order_id: rateForm.order_id || null,
                  production_unit_id: rateForm.production_unit_id || null,
                  skill_grade: rateForm.skill_grade || null,
                  rate_per_unit: Number(rateForm.rate_per_unit || 0),
                  rework_rate_per_unit: Number(rateForm.rework_rate_per_unit || 0),
                  rejected_rate_per_unit: Number(rateForm.rejected_rate_per_unit || 0),
                  effective_from: rateForm.effective_from,
                  currency: data.currency,
                  is_active: true,
                });
              }, 'Effective-dated piece-rate card saved.');
            }}
            className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs"
          >
            <h4 className="text-sm font-bold text-slate-900">Configure Piece-Rate Card</h4>
            <select required value={rateForm.operation_id} onChange={(e) => setRateForm({ ...rateForm, operation_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
              <option value="">-- Select Operation * --</option>
              {data.operations.map((o) => (
                <option key={o.id} value={o.id}>{o.operation_name} ({o.operation_code})</option>
              ))}
            </select>
            <select value={rateForm.style_id} onChange={(e) => setRateForm({ ...rateForm, style_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
              <option value="">All Styles (Optional Filter)</option>
              {data.styles.map((s) => (
                <option key={s.id} value={s.id}>{s.style_name}</option>
              ))}
            </select>
            <select value={rateForm.order_id} onChange={(e) => setRateForm({ ...rateForm, order_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
              <option value="">All Orders (Optional Filter)</option>
              {data.orders.map((o) => (
                <option key={o.id} value={o.id}>{o.order_number}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select value={rateForm.production_unit_id} onChange={(e) => setRateForm({ ...rateForm, production_unit_id: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">All Units/Lines</option>
                {data.units.map((u) => (
                  <option key={u.id} value={u.id}>{u.unit_name}</option>
                ))}
              </select>
              <select value={rateForm.skill_grade} onChange={(e) => setRateForm({ ...rateForm, skill_grade: e.target.value as any })} className="px-3 py-2 border border-slate-200 rounded-xl bg-white">
                <option value="">All Grades</option>
                {['HELPER', 'GRADE_C', 'GRADE_B', 'GRADE_A', 'MASTER_TAILOR'].map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-500">Rate / Accepted Pc ({data.currency})</label>
                <input type="number" step="0.01" min="0" value={rateForm.rate_per_unit} onChange={(e) => setRateForm({ ...rateForm, rate_per_unit: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-500">Rework Rate / Pc</label>
                <input type="number" step="0.01" min="0" value={rateForm.rework_rate_per_unit} onChange={(e) => setRateForm({ ...rateForm, rework_rate_per_unit: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
              </div>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-500">Effective From *</label>
              <input required type="date" value={rateForm.effective_from} onChange={(e) => setRateForm({ ...rateForm, effective_from: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
            </div>
            <button disabled={saving} type="submit" className="w-full py-2 rounded-xl bg-slate-900 text-white font-semibold">Publish Rate Card</button>
          </form>

          <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-left uppercase text-slate-500">
                  <th className="py-2 px-2">Operation</th>
                  <th className="py-2 px-2">Scope (Order / Style / Unit)</th>
                  <th className="py-2 px-2">Grade</th>
                  <th className="py-2 px-2 text-right">Accepted Rate</th>
                  <th className="py-2 px-2 text-right">Rework Rate</th>
                  <th className="py-2 px-2">Effective From</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.rateCards.map((rc) => {
                  const op = data.operations.find((o) => o.id === rc.operation_id);
                  const st = data.styles.find((s) => s.id === rc.style_id);
                  const ord = data.orders.find((o) => o.id === rc.order_id);
                  const un = data.units.find((u) => u.id === rc.production_unit_id);
                  return (
                    <tr key={rc.id}>
                      <td className="py-2 px-2 font-semibold text-slate-800">{op?.operation_name || rc.operation_id}</td>
                      <td className="py-2 px-2 text-slate-600">{ord?.order_number || 'Any Order'} / {st?.style_code || 'Any Style'} / {un?.unit_code || 'All Units'}</td>
                      <td className="py-2 px-2">{rc.skill_grade || 'Any'}</td>
                      <td className="py-2 px-2 text-right font-bold text-emerald-700">{rc.currency} {rc.rate_per_unit}</td>
                      <td className="py-2 px-2 text-right text-slate-600">{rc.currency} {rc.rework_rate_per_unit}</td>
                      <td className="py-2 px-2 text-slate-500">{rc.effective_from}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

