import React, { useState } from 'react';
import { Award, Wallet, Plus } from 'lucide-react';
import { GarmentSubviewProps } from '../types';
import { garmentMasterService } from '../../../services/garment/garmentMasterService';
import { garmentOperationsService } from '../../../services/garment/garmentOperationsService';
import { GarmentAdvanceEntryType } from '../../../types/garment';

export const GarmentIncentivesAdvancesView: React.FC<GarmentSubviewProps> = ({ data, onRefresh }) => {
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const [ruleForm, setRuleForm] = useState({
    rule_code: '',
    rule_name: '',
    rule_type: 'TARGET_ACHIEVEMENT' as 'TARGET_ACHIEVEMENT' | 'QUALITY_ZERO_DEFECT' | 'ATTENDANCE_REGULARITY' | 'LINE_EFFICIENCY' | 'CUSTOM',
    threshold_value: 100,
    reward_type: 'FIXED_AMOUNT' as 'FIXED_AMOUNT' | 'PER_PIECE_BONUS' | 'PERCENT_OF_EARNINGS',
    reward_value: 500,
    period_type: 'WEEKLY' as 'DAILY' | 'WEEKLY' | 'MONTHLY',
    effective_from: new Date().toISOString().split('T')[0],
  });

  const [awardForm, setAwardForm] = useState({
    employee_id: '',
    award_date: new Date().toISOString().split('T')[0],
    incentive_rule_id: '',
    amount: 500,
    notes: '',
  });

  const [advForm, setAdvForm] = useState({
    employee_id: '',
    entry_date: new Date().toISOString().split('T')[0],
    entry_type: 'ADVANCE_RECOVERY' as GarmentAdvanceEntryType,
    amount: 1000,
    reason: '',
  });

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await garmentMasterService.saveIncentiveRule({
        ...ruleForm,
        rule_code: ruleForm.rule_code.trim().toUpperCase(),
        is_active: true,
      });
      setRuleForm({ ...ruleForm, rule_code: '', rule_name: '' });
      setMsg('Incentive rule saved.');
      await onRefresh();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!awardForm.employee_id) return;
    setSaving(true);
    setMsg(null);
    try {
      await garmentOperationsService.saveIncentiveAward({
        organization_id: data.orgId,
        employee_id: awardForm.employee_id,
        award_date: awardForm.award_date,
        incentive_rule_id: awardForm.incentive_rule_id || null,
        amount: Number(awardForm.amount || 0),
        status: 'APPROVED',
        notes: awardForm.notes || null,
      });
      setMsg('Incentive bonus awarded to worker.');
      await onRefresh();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advForm.employee_id) return;
    setSaving(true);
    setMsg(null);
    try {
      await garmentOperationsService.saveAdvanceLedgerEntry({
        organization_id: data.orgId,
        employee_id: advForm.employee_id,
        entry_date: advForm.entry_date,
        entry_type: advForm.entry_type,
        amount: Number(advForm.amount || 0),
        recovered_amount: 0,
        status: 'APPROVED',
        reason: advForm.reason || null,
      });
      setMsg('Advance / deduction ledger entry approved.');
      await onRefresh();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`p-3 rounded-xl text-xs font-medium border ${msg.startsWith('Error') ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Incentive Rule Builder */}
        <form onSubmit={handleSaveRule} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Award className="w-4 h-4 text-emerald-600" /> Configure Incentive Rule</h4>
          <input required placeholder="Rule Code (e.g. INC-ZERO-DEF)" value={ruleForm.rule_code} onChange={(e) => setRuleForm({ ...ruleForm, rule_code: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
          <input required placeholder="Rule Name (e.g. Weekly Target Bonus)" value={ruleForm.rule_name} onChange={(e) => setRuleForm({ ...ruleForm, rule_name: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
          <select value={ruleForm.rule_type} onChange={(e) => setRuleForm({ ...ruleForm, rule_type: e.target.value as any })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
            <option value="TARGET_ACHIEVEMENT">TARGET_ACHIEVEMENT</option>
            <option value="QUALITY_ZERO_DEFECT">QUALITY_ZERO_DEFECT</option>
            <option value="ATTENDANCE_REGULARITY">ATTENDANCE_REGULARITY</option>
            <option value="LINE_EFFICIENCY">LINE_EFFICIENCY</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="Threshold" value={ruleForm.threshold_value} onChange={(e) => setRuleForm({ ...ruleForm, threshold_value: Number(e.target.value) })} className="px-3 py-2 border border-slate-200 rounded-xl" />
            <input type="number" placeholder="Reward Val" value={ruleForm.reward_value} onChange={(e) => setRuleForm({ ...ruleForm, reward_value: Number(e.target.value) })} className="px-3 py-2 border border-slate-200 rounded-xl" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={ruleForm.reward_type} onChange={(e) => setRuleForm({ ...ruleForm, reward_type: e.target.value as any })} className="px-3 py-2 border border-slate-200 rounded-xl bg-white">
              <option value="FIXED_AMOUNT">FIXED_AMOUNT</option>
              <option value="PER_PIECE_BONUS">PER_PIECE_BONUS</option>
              <option value="PERCENT_OF_EARNINGS">PERCENT_OF_EARNINGS</option>
            </select>
            <select value={ruleForm.period_type} onChange={(e) => setRuleForm({ ...ruleForm, period_type: e.target.value as any })} className="px-3 py-2 border border-slate-200 rounded-xl bg-white">
              <option value="DAILY">DAILY</option>
              <option value="WEEKLY">WEEKLY</option>
              <option value="MONTHLY">MONTHLY</option>
            </select>
          </div>
          <button disabled={saving} type="submit" className="w-full py-2 rounded-xl bg-emerald-600 text-white font-semibold">Save Rule</button>
        </form>

        {/* Award Bonus */}
        <form onSubmit={handleSaveAward} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-600" /> Award Worker Incentive</h4>
          <select required value={awardForm.employee_id} onChange={(e) => setAwardForm({ ...awardForm, employee_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
            <option value="">-- Select Worker * --</option>
            {data.workers.map((w) => (
              <option key={w.id} value={w.employee_id}>{data.empNameMap[w.employee_id]}</option>
            ))}
          </select>
          <select value={awardForm.incentive_rule_id} onChange={(e) => setAwardForm({ ...awardForm, incentive_rule_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
            <option value="">Optional Linked Rule</option>
            {data.incentiveRules.map((r) => (
              <option key={r.id} value={r.id}>{r.rule_name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={awardForm.award_date} onChange={(e) => setAwardForm({ ...awardForm, award_date: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
            <input type="number" step="0.01" min="0" value={awardForm.amount} onChange={(e) => setAwardForm({ ...awardForm, amount: Number(e.target.value) })} className="px-3 py-2 border border-slate-200 rounded-xl" />
          </div>
          <input placeholder="Reason / Achievement notes" value={awardForm.notes} onChange={(e) => setAwardForm({ ...awardForm, notes: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
          <button disabled={saving} type="submit" className="w-full py-2 rounded-xl bg-slate-900 text-white font-semibold">Approve Bonus Award</button>
        </form>

        {/* Salary Advance & Recovery Ledger */}
        <form onSubmit={handleSaveAdvance} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Wallet className="w-4 h-4 text-emerald-600" /> Record Advance / Recovery / Canteen</h4>
          <select required value={advForm.employee_id} onChange={(e) => setAdvForm({ ...advForm, employee_id: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
            <option value="">-- Select Worker * --</option>
            {data.workers.map((w) => (
              <option key={w.id} value={w.employee_id}>{data.empNameMap[w.employee_id]}</option>
            ))}
          </select>
          <select value={advForm.entry_type} onChange={(e) => setAdvForm({ ...advForm, entry_type: e.target.value as GarmentAdvanceEntryType })} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
            <option value="ADVANCE_GIVEN">ADVANCE_GIVEN (Disbursal Track only)</option>
            <option value="ADVANCE_RECOVERY">ADVANCE_RECOVERY (Deduct in Payroll)</option>
            <option value="LOAN_RECOVERY">LOAN_RECOVERY (Deduct in Payroll)</option>
            <option value="CANTEEN">CANTEEN Deduction</option>
            <option value="HOSTEL">HOSTEL Deduction</option>
            <option value="DAMAGE_RECOVERY">DAMAGE_RECOVERY</option>
            <option value="OTHER_DEDUCTION">OTHER_DEDUCTION</option>
            <option value="OTHER_EARNING">OTHER_EARNING</option>
          </select>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={advForm.entry_date} onChange={(e) => setAdvForm({ ...advForm, entry_date: e.target.value })} className="px-3 py-2 border border-slate-200 rounded-xl" />
            <input type="number" step="0.01" min="0" value={advForm.amount} onChange={(e) => setAdvForm({ ...advForm, amount: Number(e.target.value) })} className="px-3 py-2 border border-slate-200 rounded-xl" />
          </div>
          <input placeholder="Reason / Reference" value={advForm.reason} onChange={(e) => setAdvForm({ ...advForm, reason: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-xl" />
          <button disabled={saving} type="submit" className="w-full py-2 rounded-xl bg-emerald-600 text-white font-semibold">Post Approved Ledger Entry</button>
        </form>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Awards History */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
          <h4 className="text-sm font-bold text-slate-900 mb-3">Approved Incentive Awards ({data.incentiveAwards.length})</h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-left uppercase text-slate-500">
                <th className="py-2 px-2">Date</th>
                <th className="py-2 px-2">Worker</th>
                <th className="py-2 px-2 text-right">Amount</th>
                <th className="py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.incentiveAwards.map((a) => (
                <tr key={a.id}>
                  <td className="py-2 px-2">{a.award_date}</td>
                  <td className="py-2 px-2 font-semibold">{data.empNameMap[a.employee_id]}</td>
                  <td className="py-2 px-2 text-right font-bold text-emerald-700">{data.currency} {a.amount}</td>
                  <td className="py-2 px-2">{a.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Advances & Recoveries Ledger */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
          <h4 className="text-sm font-bold text-slate-900 mb-3">Advances, Loans &amp; Recoveries Ledger ({data.advances.length})</h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-left uppercase text-slate-500">
                <th className="py-2 px-2">Date</th>
                <th className="py-2 px-2">Worker</th>
                <th className="py-2 px-2">Type</th>
                <th className="py-2 px-2 text-right">Amount / Bal</th>
                <th className="py-2 px-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.advances.map((l) => (
                <tr key={l.id}>
                  <td className="py-2 px-2">{l.entry_date}</td>
                  <td className="py-2 px-2 font-semibold">{data.empNameMap[l.employee_id]}</td>
                  <td className="py-2 px-2">{l.entry_type}</td>
                  <td className="py-2 px-2 text-right">{data.currency} {l.amount} (bal {l.balance_remaining})</td>
                  <td className="py-2 px-2">{l.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

