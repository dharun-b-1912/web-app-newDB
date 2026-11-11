import React, { useEffect, useState } from 'react';
import { IndianRupee, Scissors, MessageSquareWarning, FileText } from 'lucide-react';
import { GarmentSubviewProps } from '../types';
import { useAuth } from '../../../hooks/useAuth';
import { garmentPayrollService } from '../../../services/garment/garmentPayrollService';
import { garmentOperationsService } from '../../../services/garment/garmentOperationsService';
import { GarmentPayrollLine } from '../../../types/garment';

export const GarmentWorkerEssView: React.FC<GarmentSubviewProps> = ({ data, onRefresh }) => {
  const { user } = useAuth();
  const myEmpId = (user as any)?.employee_id || '';
  const [myLines, setMyLines] = useState<GarmentPayrollLine[]>([]);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeTargetId, setDisputeTargetId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!myEmpId) return;
    garmentPayrollService
      .listEmployeePayrollLines(myEmpId, data.orgId)
      .then((res) => setMyLines(res.filter((l) => l.worker_payslip_published)))
      .catch(() => setMyLines([]));
  }, [myEmpId, data.orgId]);

  const myProfile = data.workers.find((w) => w.employee_id === myEmpId);
  const myWage = data.wageAssignments.find((a) => a.employee_id === myEmpId && a.is_active);
  const myAllocations = data.allocations.filter((a) => a.employee_id === myEmpId);
  const myAdvances = data.advances.filter((a) => a.employee_id === myEmpId);
  const myAttendance = data.attendance.filter((a) => a.employee_id === myEmpId);

  const totalPieceAcc = myAllocations.reduce((s, a) => s + Number(a.allocated_accepted_qty || 0), 0);
  const totalPieceRej = myAllocations.reduce((s, a) => s + Number(a.allocated_rejected_qty || 0), 0);
  const totalPieceRew = myAllocations.reduce((s, a) => s + Number(a.allocated_rework_qty || 0), 0);
  const totalPieceEarn = myAllocations.reduce((s, a) => s + Number(a.earned_piece_amount || 0), 0);
  const outstandingAdv = myAdvances.reduce((s, a) => s + Number(a.balance_remaining || 0), 0);

  const handleDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myEmpId || !disputeReason.trim()) return;
    setSubmitting(true);
    setMsg(null);
    try {
      await garmentOperationsService.createCorrectionRequest({
        organization_id: data.orgId,
        request_type: 'WORKER_DISPUTE',
        target_table: disputeTargetId ? 'garment_production_allocations' : 'garment_payroll_lines',
        target_record_id: disputeTargetId || myLines[0]?.id || myEmpId,
        employee_id: myEmpId,
        requested_by_employee_id: myEmpId,
        work_date: new Date().toISOString().split('T')[0],
        reason: disputeReason.trim(),
        requested_changes_json: { source: 'WORKER_ESS' },
      });
      setDisputeReason('');
      setMsg('Your earnings / production dispute was sent to Supervisor & HR Payroll for review.');
      await onRefresh();
    } catch (err: any) {
      setMsg(`Error: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!myEmpId) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-sm text-slate-500">
        No employee record is linked to your user account yet.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Wage Method</div>
          <div className="mt-1 text-lg font-bold text-slate-900">{myWage?.wage_method || myProfile?.default_wage_method || 'Not Assigned'}</div>
          <div className="text-xs text-emerald-700">{myWage?.payment_frequency || myProfile?.default_payment_frequency || '—'}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Approved Pieces</div>
          <div className="mt-1 text-lg font-bold text-emerald-700">{totalPieceAcc.toLocaleString()}</div>
          <div className="text-xs text-slate-500">Rej: {totalPieceRej} • Rework: {totalPieceRew}</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Accrued Piece Earnings</div>
          <div className="mt-1 text-lg font-bold text-slate-900">{data.currency} {totalPieceEarn.toLocaleString()}</div>
          <div className="text-xs text-slate-500">{myAttendance.length} floor days logged</div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <div className="text-xs text-slate-500">Advance / Loan Balance</div>
          <div className="mt-1 text-lg font-bold text-rose-600">{data.currency} {outstandingAdv.toLocaleString()}</div>
          <div className="text-xs text-slate-500">{myLines.length} published payslip(s)</div>
        </div>
      </div>

      {msg && (
        <div className={`p-3 rounded-xl text-xs font-medium border ${msg.startsWith('Error') ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white rounded-2xl border border-slate-200 p-5 overflow-x-auto">
          <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><Scissors className="w-4 h-4 text-emerald-600" /> My Piece-Rate &amp; QC Ledger</h4>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-left uppercase text-slate-500">
                <th className="py-2 px-2">Date</th>
                <th className="py-2 px-2">Operation</th>
                <th className="py-2 px-2 text-right">Accepted</th>
                <th className="py-2 px-2 text-right">Rej / Rework</th>
                <th className="py-2 px-2 text-right">Rate</th>
                <th className="py-2 px-2 text-right">Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myAllocations.map((a) => {
                const op = data.operations.find((o) => o.id === a.operation_id);
                return (
                  <tr key={a.id}>
                    <td className="py-2 px-2">{a.work_date}</td>
                    <td className="py-2 px-2 font-medium">{op?.operation_name || a.operation_id}</td>
                    <td className="py-2 px-2 text-right font-semibold text-emerald-700">{a.allocated_accepted_qty}</td>
                    <td className="py-2 px-2 text-right">{a.allocated_rejected_qty} / {a.allocated_rework_qty}</td>
                    <td className="py-2 px-2 text-right">{data.currency} {a.unit_rate}</td>
                    <td className="py-2 px-2 text-right font-bold">{data.currency} {a.earned_piece_amount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <form onSubmit={handleDispute} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 text-xs">
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2"><MessageSquareWarning className="w-4 h-4 text-amber-600" /> Raise Earnings / Piece Dispute</h4>
          <select value={disputeTargetId} onChange={(e) => setDisputeTargetId(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-white">
            <option value="">General Payroll Query</option>
            {myAllocations.slice(0, 15).map((a) => (
              <option key={a.id} value={a.id}>{a.work_date} • Accepted {a.allocated_accepted_qty} pcs ({data.currency} {a.earned_piece_amount})</option>
            ))}
          </select>
          <textarea
            required
            rows={4}
            placeholder="Describe missing pieces, rate discrepancy, or attendance issue..."
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            className="w-full px-3 py-2 border border-slate-200 rounded-xl"
          />
          <button disabled={submitting} type="submit" className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold">
            {submitting ? 'Submitting...' : 'Submit Correction Dispute'}
          </button>
        </form>
      </div>

      {/* Published Payslips */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-600" /> Published Garment Payslips</h4>
        {myLines.length === 0 ? (
          <p className="text-xs text-slate-400">No published payslips yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {myLines.map((l) => (
              <div key={l.id} className="p-4 rounded-xl border border-slate-200 space-y-1.5">
                <div className="flex justify-between font-bold text-slate-900">
                  <span><IndianRupee className="w-3.5 h-3.5 inline" /> {l.wage_method_snapshot} Payslip</span>
                  <span className="text-emerald-700">{data.currency} {l.net_payable}</span>
                </div>
                <div className="text-slate-500">Days: {l.payable_days} • Hours: {l.worked_hours} • Accepted: {l.accepted_qty} pcs</div>
                <div className="text-slate-500">Gross: {data.currency} {l.gross_earnings} • Deductions: {data.currency} {l.total_deductions}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

