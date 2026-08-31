import React, { useState, useEffect } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { FnFSettlement, EmployeeSalaryAssignment } from '../../../types/payroll';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import { UserMinus, Calculator, CheckCircle2, FileText, Plus, AlertCircle, Search } from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';
import { useAuth } from '../../../hooks/useAuth';

export const FnFSettlementView: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [settlements, setSettlements] = useState<FnFSettlement[]>([]);
  const [salaries, setSalaries] = useState<EmployeeSalaryAssignment[]>([]);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [resignationDate, setResignationDate] = useState('2026-08-01');
  const [lastWorkingDate, setLastWorkingDate] = useState('2026-08-31');
  const [noticeRequired, setNoticeRequired] = useState(60);
  const [noticeServed, setNoticeServed] = useState(60);
  const [earnedLeaveBalance, setEarnedLeaveBalance] = useState(14);

  const loadData = async () => {
    setSettlements(payrollApi.getFnFSettlements());
    const salList = await payrollApi.getEmployeeSalaries();
    setSalaries(salList);
    if (salList.length > 0 && !selectedEmpId) {
      setSelectedEmpId(salList[0].employee_id);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('*', () => loadData());
    return () => unsub();
  }, []);

  const handleCalculate = () => {
    try {
      const calculated = payrollApi.calculateFnFSettlement(
        selectedEmpId,
        resignationDate,
        lastWorkingDate,
        noticeRequired,
        noticeServed,
        earnedLeaveBalance,
        user?.name || 'HR Administrator'
      );
      loadData();
      setIsModalOpen(false);
      showToast(`✓ Calculated F&F settlement for ${calculated.employee_name}. Net: ₹${calculated.net_settlement_payable.toLocaleString('en-IN')}`);
    } catch (err: any) {
      showToast(err.message || 'Calculation error', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-rose-50 text-rose-700">
              <UserMinus className="w-5 h-5" />
            </span>
            <h2 className="text-sm font-bold text-gray-900">Full & Final (F&F) Exit Settlement Engine</h2>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Automated final exit payout calculation: Earned salary, leave encashment, gratuity, notice period recoveries & statutory clearance
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => setIsModalOpen(true)}
          className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold text-xs cursor-pointer shadow-xs"
        >
          <Calculator className="w-3.5 h-3.5 mr-1" />
          Calculate Exit Settlement
        </Button>
      </div>

      {/* Quick KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Completed F&F Settlements</span>
            <span className="text-base font-black text-gray-900 mt-0.5 block font-mono">
              {settlements.length} Record(s)
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold">100% Statutory Cleared</span>
          </div>
          <span className="p-3 rounded-xl bg-emerald-50 text-[#07563D] border border-emerald-100">
            <CheckCircle2 className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Total Net Exit Payout</span>
            <span className="text-base font-black text-[#07563D] mt-0.5 block font-mono">
              ₹ {settlements.reduce((acc, s) => acc + s.net_settlement_payable, 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-gray-500 font-medium">Gratuity + Encashment + Unpaid</span>
          </div>
          <span className="p-3 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
            <Calculator className="w-5 h-5" />
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">Gratuity Formula</span>
            <span className="text-base font-black text-gray-900 mt-0.5 block font-mono">
              15/26 × Basic × Yrs
            </span>
            <span className="text-[10px] text-purple-700 font-semibold">Payment of Gratuity Act 1972</span>
          </div>
          <span className="p-3 rounded-xl bg-purple-50 text-purple-700 border border-purple-100">
            <FileText className="w-5 h-5" />
          </span>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-100">
              <tr>
                <th className="p-3">Employee & Exit Date</th>
                <th className="p-3 font-mono text-right">Unpaid Salary</th>
                <th className="p-3 font-mono text-right">Leave Encashment</th>
                <th className="p-3 font-mono text-right">Gratuity</th>
                <th className="p-3 font-mono text-right text-rose-700">Recoveries</th>
                <th className="p-3 font-mono text-right text-emerald-800">Final Net Settlement</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {settlements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    <UserMinus className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-gray-700">No exit settlements recorded</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">Click "Calculate Exit Settlement" to compute full and final payout for an exiting employee.</p>
                  </td>
                </tr>
              ) : (
                settlements.map(fnf => (
                  <tr key={fnf.id} className="hover:bg-gray-50/70">
                    <td className="p-3 font-bold text-gray-900">
                      <div>{fnf.employee_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        LWD: {fnf.last_working_date} • {fnf.department}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-right text-gray-800">₹ {fnf.unpaid_salary_amount.toLocaleString('en-IN')}</td>
                    <td className="p-3 font-mono text-right text-gray-800">
                      ₹ {fnf.leave_encashment_amount.toLocaleString('en-IN')}
                      <span className="block text-[10px] text-gray-400">({fnf.earned_leave_balance_days}d Encashment)</span>
                    </td>
                    <td className="p-3 font-mono text-right text-gray-800">₹ {fnf.gratuity_amount.toLocaleString('en-IN')}</td>
                    <td className="p-3 font-mono text-right text-rose-700 font-bold">- ₹ {fnf.total_deductions_settlement.toLocaleString('en-IN')}</td>
                    <td className="p-3 font-mono text-right font-black text-[#07563D] text-sm">
                      ₹ {fnf.net_settlement_payable.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3">
                      <Badge variant="emerald">{fnf.payment_status}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Calculate F&F Settlement */}
      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Full & Final (F&F) Exit Settlement Calculation"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Select Exiting Employee *</label>
              <select
                value={selectedEmpId}
                onChange={e => setSelectedEmpId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
              >
                {salaries.map(s => (
                  <option key={s.employee_id} value={s.employee_id}>
                    {s.employee_name} ({s.employee_code}) — {s.department_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Resignation Date</label>
                <input
                  type="date"
                  value={resignationDate}
                  onChange={e => setResignationDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Last Working Date (LWD)</label>
                <input
                  type="date"
                  value={lastWorkingDate}
                  onChange={e => setLastWorkingDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Notice Req. (Days)</label>
                <input
                  type="number"
                  value={noticeRequired}
                  onChange={e => setNoticeRequired(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Notice Served (Days)</label>
                <input
                  type="number"
                  value={noticeServed}
                  onChange={e => setNoticeServed(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Earned Leave (Days)</label>
                <input
                  type="number"
                  value={earnedLeaveBalance}
                  onChange={e => setEarnedLeaveBalance(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px] space-y-1">
              <span className="font-bold block">Automated Valuation Engine:</span>
              <p>• Unpaid Working Days Salary • Gratuity (15/26 formula) • Leave Encashment Value • Notice Shortfall Recovery</p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleCalculate} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold">
                Execute F&F Computation
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
