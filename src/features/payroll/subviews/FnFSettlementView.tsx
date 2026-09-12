import React, { useState, useEffect, useMemo } from 'react';
import { payrollApi } from '../../../services/payrollApi';
import { offboardingService } from '../../../services/offboardingService';
import { FnFSettlement, EmployeeSalaryAssignment } from '../../../types/payroll';
import { EmployeeSeparation } from '../../../types';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Modal } from '../../../components/ui/Modal';
import {
  UserMinus,
  Calculator,
  CheckCircle2,
  FileText,
  AlertCircle,
  Search,
  ArrowRight,
  Clock,
  ShieldCheck,
  Building,
  CheckCircle,
  DollarSign,
  AlertTriangle,
  Pencil,
  Trash2,
  X,
  Check,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';
import { useAuth } from '../../../hooks/useAuth';

export const FnFSettlementView: React.FC = () => {
  const { showToast } = useToast();
  const { user } = useAuth();
  const [settlements, setSettlements] = useState<FnFSettlement[]>([]);
  const [salaries, setSalaries] = useState<EmployeeSalaryAssignment[]>([]);
  const [pendingSeparations, setPendingSeparations] = useState<EmployeeSeparation[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'disbursed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [activeSeparationId, setActiveSeparationId] = useState<string | undefined>(undefined);
  const [resignationDate, setResignationDate] = useState('2026-08-01');
  const [lastWorkingDate, setLastWorkingDate] = useState('2026-08-31');
  const [noticeRequired, setNoticeRequired] = useState(60);
  const [noticeServed, setNoticeServed] = useState(60);
  const [earnedLeaveBalance, setEarnedLeaveBalance] = useState(14);
  const [assetDeductions, setAssetDeductions] = useState<number>(0);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<FnFSettlement | null>(null);
  const [editForm, setEditForm] = useState<{
    resignation_date: string;
    last_working_date: string;
    notice_period_required_days: number;
    notice_period_served_days: number;
    unpaid_salary_days: number;
    unpaid_salary_amount: number;
    earned_leave_balance_days: number;
    leave_encashment_amount: number;
    gratuity_amount: number;
    bonus_incentive_amount: number;
    reimbursement_amount: number;
    notice_shortfall_recovery: number;
    asset_recovery_deduction: number;
    loan_outstanding_recovery: number;
    advance_outstanding_recovery: number;
    statutory_deductions: number;
    payment_status: 'Calculated' | 'Approved' | 'Disbursed' | 'Closed';
  }>({
    resignation_date: '',
    last_working_date: '',
    notice_period_required_days: 30,
    notice_period_served_days: 30,
    unpaid_salary_days: 0,
    unpaid_salary_amount: 0,
    earned_leave_balance_days: 0,
    leave_encashment_amount: 0,
    gratuity_amount: 0,
    bonus_incentive_amount: 0,
    reimbursement_amount: 0,
    notice_shortfall_recovery: 0,
    asset_recovery_deduction: 0,
    loan_outstanding_recovery: 0,
    advance_outstanding_recovery: 0,
    statutory_deductions: 200,
    payment_status: 'Calculated',
  });

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingSettlement, setDeletingSettlement] = useState<FnFSettlement | null>(null);

  const loadData = async () => {
    const list = await payrollApi.getFnFSettlementsAsync();
    setSettlements(list);
    const salList = await payrollApi.getEmployeeSalaries();
    setSalaries(salList);
    const pending = offboardingService.getPendingFnFClearances();
    setPendingSeparations(pending);
    if (salList.length > 0 && !selectedEmpId) {
      setSelectedEmpId(salList[0].employee_id);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('*', () => loadData());
    return () => unsub();
  }, []);

  const handleOpenFromSeparation = (sep: EmployeeSeparation) => {
    setSelectedEmpId(sep.employee_id);
    setActiveSeparationId(sep.id);
    setResignationDate(sep.resignation_date || new Date().toISOString().split('T')[0]);
    const lwd =
      sep.actual_last_working_date ||
      sep.approved_last_working_date ||
      sep.expected_last_working_date ||
      new Date().toISOString().split('T')[0];
    setLastWorkingDate(lwd);
    setNoticeRequired(sep.notice_period_days || 30);

    // calculate notice served
    const rDate = new Date(sep.resignation_date || Date.now());
    const lDate = new Date(lwd);
    const served = Math.max(0, Math.round((lDate.getTime() - rDate.getTime()) / (1000 * 60 * 60 * 24)));
    setNoticeServed(served);

    // Leave encashment days
    setEarnedLeaveBalance(sep.fnf_readiness?.leave_encashment_days || 12);

    // Asset recovery deductions
    const assetDeds = (sep.assets || []).reduce((sum, a) => {
      if (a.recovery_status === 'DAMAGED' || a.recovery_status === 'MISSING') {
        return sum + (Number(a.financial_recovery_amount) || 0);
      }
      return sum;
    }, 0);
    setAssetDeductions(assetDeds);

    setIsModalOpen(true);
  };

  const handleCalculate = () => {
    try {
      const calculated = payrollApi.calculateFnFSettlement(
        selectedEmpId,
        resignationDate,
        lastWorkingDate,
        noticeRequired,
        noticeServed,
        earnedLeaveBalance,
        user?.name || 'HR Administrator',
        undefined,
        {
          separation_id: activeSeparationId,
          asset_recovery_deduction: assetDeductions,
        }
      );
      loadData();
      setIsModalOpen(false);
      setActiveSeparationId(undefined);
      showToast(
        `✓ Calculated F&F settlement for ${calculated.employee_name}. Net: ₹${calculated.net_settlement_payable.toLocaleString('en-IN')}`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Calculation error', 'error');
    }
  };

  const handleApprove = (settlementId: string) => {
    try {
      const updated = payrollApi.approveFnFSettlement(settlementId, user?.name || 'Finance Approver');
      loadData();
      showToast(`✓ Approved F&F settlement for ${updated.employee_name}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Approval failed', 'error');
    }
  };

  const handleDisburse = (settlementId: string) => {
    try {
      const updated = payrollApi.disburseFnFSettlement(settlementId, user?.name || 'Disbursement Specialist');
      loadData();
      showToast(
        `✓ Disbursed final settlement for ${updated.employee_name}. Amount: ₹${updated.net_settlement_payable.toLocaleString('en-IN')}`,
        'success'
      );
    } catch (err: any) {
      showToast(err.message || 'Disbursement failed', 'error');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (fnf: FnFSettlement) => {
    setEditingSettlement(fnf);
    setEditForm({
      resignation_date: fnf.resignation_date,
      last_working_date: fnf.last_working_date,
      notice_period_required_days: fnf.notice_period_required_days || 30,
      notice_period_served_days: fnf.notice_period_served_days || 30,
      unpaid_salary_days: fnf.unpaid_salary_days || 0,
      unpaid_salary_amount: fnf.unpaid_salary_amount || 0,
      earned_leave_balance_days: fnf.earned_leave_balance_days || 0,
      leave_encashment_amount: fnf.leave_encashment_amount || 0,
      gratuity_amount: fnf.gratuity_amount || 0,
      bonus_incentive_amount: fnf.bonus_incentive_amount || 0,
      reimbursement_amount: fnf.reimbursement_amount || 0,
      notice_shortfall_recovery: fnf.notice_shortfall_recovery || 0,
      asset_recovery_deduction: fnf.asset_recovery_deduction || 0,
      loan_outstanding_recovery: fnf.loan_outstanding_recovery || 0,
      advance_outstanding_recovery: fnf.advance_outstanding_recovery || 0,
      statutory_deductions: fnf.statutory_deductions || 200,
      payment_status: fnf.payment_status as any,
    });
    setIsEditModalOpen(true);
  };

  // Save Edit
  const handleSaveEdit = () => {
    if (!editingSettlement) return;
    try {
      payrollApi.updateFnFSettlement(editingSettlement.id, editForm, user?.name || 'HR Administrator');
      loadData();
      setIsEditModalOpen(false);
      setEditingSettlement(null);
      showToast(`✓ Updated F&F settlement for ${editingSettlement.employee_name}`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update settlement', 'error');
    }
  };

  // Open Delete Modal
  const handleOpenDelete = (fnf: FnFSettlement) => {
    setDeletingSettlement(fnf);
    setIsDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!deletingSettlement) return;
    try {
      payrollApi.deleteFnFSettlement(deletingSettlement.id, user?.name || 'HR Administrator');
      loadData();
      setIsDeleteModalOpen(false);
      showToast(`✓ Removed F&F settlement for ${deletingSettlement.employee_name}`, 'success');
      setDeletingSettlement(null);
    } catch (err: any) {
      showToast(err.message || 'Failed to delete settlement', 'error');
    }
  };

  // Live recalculated preview inside Edit Modal
  const editPreviewGross = useMemo(() => {
    return (
      Number(editForm.unpaid_salary_amount || 0) +
      Number(editForm.leave_encashment_amount || 0) +
      Number(editForm.gratuity_amount || 0) +
      Number(editForm.bonus_incentive_amount || 0) +
      Number(editForm.reimbursement_amount || 0)
    );
  }, [editForm]);

  const editPreviewDeductions = useMemo(() => {
    return (
      Number(editForm.notice_shortfall_recovery || 0) +
      Number(editForm.asset_recovery_deduction || 0) +
      Number(editForm.loan_outstanding_recovery || 0) +
      Number(editForm.advance_outstanding_recovery || 0) +
      Number(editForm.statutory_deductions || 0)
    );
  }, [editForm]);

  const editPreviewNet = useMemo(() => {
    return Math.max(0, editPreviewGross - editPreviewDeductions);
  }, [editPreviewGross, editPreviewDeductions]);

  const filteredSettlements = settlements.filter((s) => {
    const matchesSearch =
      s.employee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.employee_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.department.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (activeTab === 'pending') return s.payment_status === 'Calculated' || s.payment_status === 'Pending Approval';
    if (activeTab === 'disbursed') return s.payment_status === 'Disbursed' || s.payment_status === 'Closed';
    return true;
  });

  return (
    <div className="space-y-6 select-none">
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
          onClick={() => {
            setActiveSeparationId(undefined);
            setAssetDeductions(0);
            setIsModalOpen(true);
          }}
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

      {/* Offboarding Clearance Queue */}
      {pendingSeparations.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50/70 via-white to-amber-50/30 p-5 rounded-2xl border border-amber-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                <Clock className="w-4 h-4" />
              </span>
              <h3 className="text-xs font-bold text-gray-900">
                Offboarding Clearances Queue — Ready for F&F Settlement ({pendingSeparations.length})
              </h3>
            </div>
            <span className="text-[11px] text-amber-800 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Direct Automated Bridge from Exit Management
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {pendingSeparations.map((sep) => {
              const alreadySettled = settlements.some(
                (s) => s.separation_id === sep.id || s.employee_id === sep.employee_id
              );
              const empName =
                sep.employee?.display_name ||
                (sep.employee ? `${sep.employee.first_name} ${sep.employee.last_name}` : `Employee ${sep.employee_id.slice(0, 6)}`);
              return (
                <div
                  key={sep.id}
                  className="p-3.5 bg-white rounded-xl border border-amber-200/60 shadow-xs flex flex-col justify-between space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-gray-900">{empName}</h4>
                      <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                        LWD: {sep.actual_last_working_date || sep.approved_last_working_date || sep.expected_last_working_date || 'Pending'}
                      </p>
                    </div>
                    <Badge variant={alreadySettled ? 'emerald' : 'amber'} className="text-[10px]">
                      {alreadySettled ? 'Settled' : sep.status}
                    </Badge>
                  </div>

                  <div className="text-[11px] text-gray-600 bg-gray-50 p-2 rounded-lg flex items-center justify-between">
                    <span>
                      Leave: <strong>{sep.fnf_readiness?.leave_encashment_days || 12}d</strong>
                    </span>
                    <span>
                      Notice: <strong>{sep.notice_period_days || 30}d</strong>
                    </span>
                    <span>
                      Assets: <strong>{(sep.assets || []).length} items</strong>
                    </span>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <span className="text-[10px] text-gray-400">
                      Reason: {sep.reason_code || sep.reason_text || 'Resignation'}
                    </span>
                    <Button
                      size="sm"
                      onClick={() => handleOpenFromSeparation(sep)}
                      className="bg-[#07563D] hover:bg-[#064e37] text-white text-[10px] h-6 px-2 font-bold cursor-pointer"
                    >
                      {alreadySettled ? 'Recalculate' : 'Review & Settle'}
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Settlements Table & Filters */}
      <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab('all')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer',
                activeTab === 'all' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              All Records ({settlements.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer',
                activeTab === 'pending' ? 'bg-white text-amber-800 shadow-xs' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              Pending Approval ({settlements.filter((s) => s.payment_status === 'Calculated' || s.payment_status === 'Pending Approval').length})
            </button>
            <button
              onClick={() => setActiveTab('disbursed')}
              className={cn(
                'px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer',
                activeTab === 'disbursed' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              Disbursed / Closed ({settlements.filter((s) => s.payment_status === 'Disbursed' || s.payment_status === 'Closed').length})
            </button>
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search settlements..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#07563D]/20"
            />
          </div>
        </div>

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
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredSettlements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400">
                    <UserMinus className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="font-semibold text-gray-700">No exit settlements found</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Click "Calculate Exit Settlement" or choose an exiting employee from the clearance queue above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredSettlements.map((fnf) => (
                  <tr key={fnf.id} className="hover:bg-gray-50/70 transition-colors">
                    <td className="p-3 font-bold text-gray-900">
                      <div>{fnf.employee_name}</div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        LWD: {fnf.last_working_date} • {fnf.department}
                      </div>
                    </td>
                    <td className="p-3 font-mono text-right text-gray-800">
                      ₹ {fnf.unpaid_salary_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 font-mono text-right text-gray-800">
                      ₹ {fnf.leave_encashment_amount.toLocaleString('en-IN')}
                      <span className="block text-[10px] text-gray-400">
                        ({fnf.earned_leave_balance_days}d Encashment)
                      </span>
                    </td>
                    <td className="p-3 font-mono text-right text-gray-800">
                      ₹ {fnf.gratuity_amount.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3 font-mono text-right text-rose-700 font-bold">
                      - ₹ {fnf.total_deductions_settlement.toLocaleString('en-IN')}
                      {fnf.asset_recovery_deduction > 0 && (
                        <span className="block text-[10px] text-rose-600">
                          Assets: ₹{fnf.asset_recovery_deduction}
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono text-right font-black text-[#07563D] text-sm">
                      ₹ {fnf.net_settlement_payable.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3">
                      <Badge
                        variant={
                          fnf.payment_status === 'Disbursed' || fnf.payment_status === 'Closed'
                            ? 'emerald'
                            : fnf.payment_status === 'Approved'
                            ? 'info'
                            : 'amber'
                        }
                      >
                        {fnf.payment_status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        {/* Status workflow button */}
                        {fnf.payment_status === 'Calculated' && (
                          <Button
                            size="xs"
                            onClick={() => handleApprove(fnf.id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] h-6 px-2 font-bold cursor-pointer"
                          >
                            Approve
                          </Button>
                        )}
                        {fnf.payment_status === 'Approved' && (
                          <Button
                            size="xs"
                            onClick={() => handleDisburse(fnf.id)}
                            className="bg-[#07563D] hover:bg-[#064e37] text-white text-[11px] h-6 px-2 font-bold cursor-pointer"
                          >
                            Disburse
                          </Button>
                        )}
                        {(fnf.payment_status === 'Disbursed' || fnf.payment_status === 'Closed') && (
                          <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            <CheckCircle className="w-3 h-3" /> Paid
                          </span>
                        )}

                        {/* Edit Button */}
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleOpenEdit(fnf)}
                          className="h-6 w-6 p-0 text-gray-600 hover:text-[#07563D] hover:bg-emerald-50 hover:border-emerald-200 cursor-pointer shadow-2xs"
                          title="Edit F&F Settlement"
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>

                        {/* Delete Button */}
                        <Button
                          size="xs"
                          variant="outline"
                          onClick={() => handleOpenDelete(fnf)}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-rose-700 hover:bg-rose-50 hover:border-rose-200 cursor-pointer shadow-2xs"
                          title="Delete F&F Settlement"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
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
          onClose={() => {
            setIsModalOpen(false);
            setActiveSeparationId(undefined);
          }}
          title="Full & Final (F&F) Exit Settlement Calculation"
          size="md"
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-gray-700 font-bold mb-1">Select Exiting Employee *</label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
              >
                {salaries.map((s) => (
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
                  onChange={(e) => setResignationDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Last Working Date (LWD)</label>
                <input
                  type="date"
                  value={lastWorkingDate}
                  onChange={(e) => setLastWorkingDate(e.target.value)}
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
                  onChange={(e) => setNoticeRequired(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Notice Served (Days)</label>
                <input
                  type="number"
                  value={noticeServed}
                  onChange={(e) => setNoticeServed(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Earned Leave (Days)</label>
                <input
                  type="number"
                  value={earnedLeaveBalance}
                  onChange={(e) => setEarnedLeaveBalance(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            {assetDeductions > 0 && (
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-[11px] flex items-center justify-between">
                <span className="font-semibold">Hardware/Asset Damage Deductions:</span>
                <span className="font-bold font-mono text-rose-700">- ₹ {assetDeductions.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px] space-y-1">
              <span className="font-bold block">Automated Valuation Engine:</span>
              <p>• Unpaid Working Days Salary • Gratuity (15/26 formula) • Leave Encashment Value • Notice Shortfall Recovery</p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsModalOpen(false);
                  setActiveSeparationId(undefined);
                }}
              >
                Cancel
              </Button>
              <Button size="sm" variant="primary" onClick={handleCalculate} className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold cursor-pointer">
                Execute F&F Computation
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Edit F&F Settlement */}
      {isEditModalOpen && editingSettlement && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingSettlement(null);
          }}
          title={`Edit F&F Settlement — ${editingSettlement.employee_name}`}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            {/* Meta summary */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200/80 flex items-center justify-between">
              <div>
                <span className="font-bold text-gray-900">{editingSettlement.employee_name}</span>
                <span className="text-gray-500 font-mono ml-2">({editingSettlement.employee_code})</span>
                <span className="text-gray-400 ml-2">• {editingSettlement.department}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Status:</span>
                <select
                  value={editForm.payment_status}
                  onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value as any })}
                  className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#07563D]"
                >
                  <option value="Calculated">Calculated</option>
                  <option value="Approved">Approved</option>
                  <option value="Disbursed">Disbursed</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            {/* Dates & Notice Period */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Resignation Date</label>
                <input
                  type="date"
                  value={editForm.resignation_date}
                  onChange={(e) => setEditForm({ ...editForm, resignation_date: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Last Working Date</label>
                <input
                  type="date"
                  value={editForm.last_working_date}
                  onChange={(e) => setEditForm({ ...editForm, last_working_date: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Notice Required (d)</label>
                <input
                  type="number"
                  value={editForm.notice_period_required_days}
                  onChange={(e) => setEditForm({ ...editForm, notice_period_required_days: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-1">Notice Served (d)</label>
                <input
                  type="number"
                  value={editForm.notice_period_served_days}
                  onChange={(e) => setEditForm({ ...editForm, notice_period_served_days: Number(e.target.value) })}
                  className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs font-mono font-bold"
                />
              </div>
            </div>

            {/* Earnings Section */}
            <div className="p-3.5 bg-emerald-50/40 border border-emerald-100 rounded-xl space-y-3">
              <div className="font-bold text-[#07563D] flex items-center justify-between border-b border-emerald-100/80 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Gross Settlement Earnings (Additions)</span>
                </span>
                <span className="font-mono text-xs font-black text-[#07563D]">
                  ₹ {editPreviewGross.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">
                    Unpaid Salary Amount (₹)
                    <span className="text-[10px] text-gray-400 ml-1">({editForm.unpaid_salary_days}d)</span>
                  </label>
                  <input
                    type="number"
                    value={editForm.unpaid_salary_amount}
                    onChange={(e) => setEditForm({ ...editForm, unpaid_salary_amount: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 font-medium mb-1">
                    Leave Encashment (₹)
                    <span className="text-[10px] text-gray-400 ml-1">({editForm.earned_leave_balance_days}d)</span>
                  </label>
                  <input
                    type="number"
                    value={editForm.leave_encashment_amount}
                    onChange={(e) => setEditForm({ ...editForm, leave_encashment_amount: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 font-medium mb-1">Gratuity (₹)</label>
                  <input
                    type="number"
                    value={editForm.gratuity_amount}
                    onChange={(e) => setEditForm({ ...editForm, gratuity_amount: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 font-medium mb-1">Bonus / Incentives (₹)</label>
                  <input
                    type="number"
                    value={editForm.bonus_incentive_amount}
                    onChange={(e) => setEditForm({ ...editForm, bonus_incentive_amount: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 font-medium mb-1">Reimbursements (₹)</label>
                  <input
                    type="number"
                    value={editForm.reimbursement_amount}
                    onChange={(e) => setEditForm({ ...editForm, reimbursement_amount: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-900"
                  />
                </div>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="p-3.5 bg-rose-50/40 border border-rose-100 rounded-xl space-y-3">
              <div className="font-bold text-rose-800 flex items-center justify-between border-b border-rose-100/80 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                  <span>Exit Deductions & Recoveries</span>
                </span>
                <span className="font-mono text-xs font-black text-rose-700">
                  - ₹ {editPreviewDeductions.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-600 font-medium mb-1">Notice Shortfall Recovery (₹)</label>
                  <input
                    type="number"
                    value={editForm.notice_shortfall_recovery}
                    onChange={(e) => setEditForm({ ...editForm, notice_shortfall_recovery: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 font-medium mb-1">Asset Damage / Missing (₹)</label>
                  <input
                    type="number"
                    value={editForm.asset_recovery_deduction}
                    onChange={(e) => setEditForm({ ...editForm, asset_recovery_deduction: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 font-medium mb-1">Loan Outstanding Recovery (₹)</label>
                  <input
                    type="number"
                    value={editForm.loan_outstanding_recovery}
                    onChange={(e) => setEditForm({ ...editForm, loan_outstanding_recovery: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 font-medium mb-1">Advance Recovery (₹)</label>
                  <input
                    type="number"
                    value={editForm.advance_outstanding_recovery}
                    onChange={(e) => setEditForm({ ...editForm, advance_outstanding_recovery: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-gray-600 font-medium mb-1">Statutory Deductions (PT/TDS) (₹)</label>
                  <input
                    type="number"
                    value={editForm.statutory_deductions}
                    onChange={(e) => setEditForm({ ...editForm, statutory_deductions: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-rose-700"
                  />
                </div>
              </div>
            </div>

            {/* Recalculated Final Total Banner */}
            <div className="p-3 bg-gray-100 rounded-xl flex items-center justify-between font-mono">
              <span className="font-bold text-gray-700">Revised Final Net Settlement:</span>
              <span className="text-base font-black text-[#07563D]">
                ₹ {editPreviewNet.toLocaleString('en-IN')}
              </span>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingSettlement(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleSaveEdit}
                className="bg-[#07563D] hover:bg-[#064e37] text-white font-bold cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Save Changes
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Modal: Delete F&F Settlement Confirmation */}
      {isDeleteModalOpen && deletingSettlement && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setDeletingSettlement(null);
          }}
          title="Confirm F&F Settlement Deletion"
          size="sm"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Are you sure you want to delete this exit settlement?</p>
                <p className="text-[11px] text-rose-700 mt-1">
                  Settlement record for <strong>{deletingSettlement.employee_name}</strong> ({deletingSettlement.employee_code}) with net payout of{' '}
                  <strong>₹{deletingSettlement.net_settlement_payable.toLocaleString('en-IN')}</strong> will be permanently removed.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeletingSettlement(null);
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleConfirmDelete}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Confirm Delete
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
