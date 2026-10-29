import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { leaveReportExportService } from '../../../services/leave/leaveReportExportService';
import { LeaveRequest, LeaveEntitlement, LeaveType, LeaveException, LeaveLedgerTransaction } from '../../../types/leave';
import { Badge } from '../../../components/ui/Badge';
import {
  FileSpreadsheet,
  Download,
  Search,
  CheckCircle,
  FileText,
  Calendar,
  Layers,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  RotateCcw,
  Building2,
  Filter,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { hrEventBus } from '../../../services/hrEventBus';

export const LeaveReportsView: React.FC = () => {
  const [selectedReportId, setSelectedReportId] = useState<string>('rep-02');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('All');
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [entitlements, setEntitlements] = useState<LeaveEntitlement[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [ledger, setLedger] = useState<LeaveLedgerTransaction[]>([]);
  const [exceptions, setExceptions] = useState<LeaveException[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const loadData = async () => {
    try {
      const [reqs, ents, types, led] = await Promise.all([
        leaveApi.getLeaveRequestsAsync(),
        leaveApi.getEntitlementsAsync(),
        leaveApi.getLeaveTypesAsync(),
        leaveApi.getLedgerAsync(),
      ]);
      setRequests(reqs);
      setEntitlements(ents);
      setLeaveTypes(types);
      setLedger(led);
      setExceptions(leaveApi.getExceptions());
    } catch (err) {
      console.warn('[LeaveReportsView] loadData error:', err);
      setRequests(leaveApi.getLeaveRequests());
      setEntitlements(leaveApi.getEntitlements());
      setLeaveTypes(leaveApi.getLeaveTypes());
      setLedger(leaveApi.getLedger());
      setExceptions(leaveApi.getExceptions());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = hrEventBus.subscribe('leave.*', () => {
      loadData();
    });
    return () => unsub();
  }, []);

  const reportList = [
    { id: 'rep-02', name: '1. Detailed Leave Register (Who Took Leave)', desc: 'Line-by-line employee request transactions, leave type, duration, dates, reason, and approval records' },
    { id: 'rep-10', name: '2. Department-Wise Monthly Breakdown & Absence Summary', desc: 'Department-level leave consumption, peak absentee clusters, average leave days per employee, and capacity status' },
    { id: 'rep-06', name: '3. Year-End Carry Forward & Encashment Audit', desc: 'Statutory carry-forward limits (CL: 6d, SL: 0d, EL: 15d), eligible carry-forward days, and lapsed days' },
    { id: 'rep-01', name: '4. Monthly Employee-Wise Leave Summary Matrix', desc: 'Consolidated employee leave consumption (CL, SL, EL) and closing available balance for all 21 employees' },
    { id: 'rep-03', name: '5. Complete Balance & Closing Ledger', desc: 'Annual quota, opening balance, accrued YTD, consumed YTD, pending requests, and closing available balance' },
    { id: 'rep-14', name: '6. Exceptions & Compliance Risk Report', desc: 'Unapproved backdated requests, low balance flags, and policy violation audit log' },
  ];

  const selectedReport = reportList.find(r => r.id === selectedReportId) || reportList[0];

  // Dynamic Department List
  const departments = Array.from(new Set([
    ...entitlements.map(e => e.department_name),
    ...requests.map(r => r.department_name),
  ])).filter(Boolean).sort();

  // Month Filter Options
  const months = [
    { value: 'All', label: 'All Months (FY 2026)' },
    { value: '2026-10', label: 'October 2026 (Current Month)' },
    { value: '2026-09', label: 'September 2026' },
    { value: '2026-08', label: 'August 2026' },
    { value: '2026-07', label: 'July 2026' },
    { value: '2026-06', label: 'June 2026' },
    { value: '2026-05', label: 'May 2026' },
    { value: '2026-04', label: 'April 2026' },
    { value: '2026-03', label: 'March 2026' },
    { value: '2026-02', label: 'February 2026' },
    { value: '2026-01', label: 'January 2026' },
  ];

  const handleExportFullExcel = async () => {
    try {
      setIsExportingExcel(true);
      await leaveReportExportService.exportComprehensiveWorkbook(
        { requests, entitlements, leaveTypes, exceptions },
        { selectedMonth, selectedDept, organizationName: 'Joy Corporate Solutions Pvt. Ltd.' }
      );
    } catch (err) {
      console.error('Failed to export Excel report:', err);
      alert('Failed to generate Excel report. Please try again.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportCSV = () => {
    leaveReportExportService.exportToCSV(
      selectedReportId,
      { requests, entitlements, leaveTypes, exceptions },
      { selectedMonth, selectedDept }
    );
  };

  // Filtered datasets
  const filteredRequests = requests.filter(r => {
    const matchMonth = selectedMonth === 'All' || (r.from_date && r.from_date.startsWith(selectedMonth)) || (r.to_date && r.to_date.startsWith(selectedMonth));
    const matchDept = selectedDept === 'All' || r.department_name === selectedDept;
    const matchSearch =
      (r.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.employee_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.department_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.leave_type_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.request_code || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchMonth && matchDept && matchSearch;
  });

  const filteredEntitlements = entitlements.filter(e => {
    const matchDept = selectedDept === 'All' || e.department_name === selectedDept;
    const matchSearch =
      (e.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.employee_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.department_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.leave_type_name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchSearch;
  });

  const filteredExceptions = exceptions.filter(e => {
    const matchDept = selectedDept === 'All' || e.department_name === selectedDept;
    const matchSearch =
      (e.employee_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.department_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (e.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchSearch;
  });

  // Calculate Department-Wise Breakdown
  const deptStats = (selectedDept === 'All' ? departments : [selectedDept]).map(dept => {
    const deptEnts = entitlements.filter(e => e.department_name === dept);
    const deptReqs = requests.filter(r => {
      const matchMonth = selectedMonth === 'All' || (r.from_date && r.from_date.startsWith(selectedMonth));
      return r.department_name === dept && matchMonth;
    });
    const empIds = new Set(deptEnts.map(e => e.employee_id));
    const headcount = empIds.size || 1;

    const clTaken = deptReqs.filter(r => r.status === 'Approved' && (r.leave_type_code || '').toUpperCase() === 'CL').reduce((sum, r) => sum + (r.leave_days_deducted || 0), 0);
    const slTaken = deptReqs.filter(r => r.status === 'Approved' && (r.leave_type_code || '').toUpperCase() === 'SL').reduce((sum, r) => sum + (r.leave_days_deducted || 0), 0);
    const elTaken = deptReqs.filter(r => r.status === 'Approved' && (r.leave_type_code || '').toUpperCase() === 'EL').reduce((sum, r) => sum + (r.leave_days_deducted || 0), 0);
    const totalTaken = clTaken + slTaken + elTaken;
    const avgPerEmp = headcount > 0 ? (totalTaken / headcount).toFixed(1) : '0.0';
    const totalAvail = deptEnts.reduce((sum, e) => sum + (e.available_balance || 0), 0);

    return {
      department: dept,
      headcount,
      clTaken,
      slTaken,
      elTaken,
      totalTaken,
      avgPerEmp,
      totalAvail,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#07563D]/10 flex items-center justify-center text-[#07563D]">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-gray-900 tracking-tight">
                Enterprise Leave Reports & Compliance Analytics
              </h2>
              <span className="text-[11px] text-[#07563D] font-bold font-mono">
                Multi-Tenant Scoped • 100% Live Database • Joy Corporate Solutions Pvt. Ltd.
              </span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Real-time monthly employee-wise and department-wise leave registers, carry-forward audits, and balance statements.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={loadData}
            title="Refresh Live Data"
            className="p-2.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-colors cursor-pointer"
          >
            <RotateCcw className={cn("w-4 h-4", loading && "animate-spin text-[#07563D]")} />
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-800 text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-gray-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handleExportFullExcel}
            disabled={isExportingExcel}
            className="px-4 py-2.5 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-black flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-300" />
            <span>{isExportingExcel ? 'Generating Master Excel...' : 'Export 5-Sheet Excel (.xlsx)'}</span>
          </button>
        </div>
      </div>

      {/* Dynamic Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          {/* Month Selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-gray-500" />
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-bold bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Department Selector */}
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-gray-500" />
            <select
              value={selectedDept}
              onChange={e => setSelectedDept(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-xl text-xs font-bold bg-white text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
            >
              <option value="All">All Departments</option>
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Global Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2" />
          <input
            type="text"
            placeholder="Search employee, code, dept..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 border border-gray-300 rounded-xl text-xs bg-white w-56 focus:outline-none focus:ring-1 focus:ring-[#07563D]"
          />
        </div>
      </div>

      {/* Main Grid: Catalog Sidebar & Report Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports Catalog Sidebar */}
        <div className="space-y-2 max-h-[700px] overflow-y-auto pr-1">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider">
              Corporate Report Catalog
            </h3>
            <span className="text-[10px] font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {reportList.length} Reports
            </span>
          </div>

          {reportList.map(rep => (
            <div
              key={rep.id}
              onClick={() => setSelectedReportId(rep.id)}
              className={cn(
                'p-3.5 rounded-2xl border cursor-pointer transition-all',
                selectedReportId === rep.id
                  ? 'border-[#07563D] bg-[#07563D]/5 shadow-2xs ring-1 ring-[#07563D]/20'
                  : 'border-gray-200/80 bg-white hover:border-gray-300'
              )}
            >
              <h4 className={cn(
                "text-xs font-extrabold",
                selectedReportId === rep.id ? "text-[#07563D]" : "text-gray-900"
              )}>
                {rep.name}
              </h4>
              <p className="text-[11px] text-gray-500 mt-1 line-clamp-2 leading-relaxed">
                {rep.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Report Preview Surface */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-gray-900">{selectedReport.name}</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Scope: {selectedMonth === 'All' ? 'Full Fiscal Year 2026' : selectedMonth} • Dept: {selectedDept}
                </p>
              </div>
            </div>

            {/* Table Displays */}
            <div className="overflow-x-auto rounded-xl border border-gray-200/80">
              {/* REPORT 2: DETAILED LEAVE REGISTER (WHO TOOK LEAVE) */}
              {selectedReportId === 'rep-02' ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="p-3">Req Code</th>
                      <th className="p-3">Employee</th>
                      <th className="p-3">Leave Type</th>
                      <th className="p-3">Dates (Duration)</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3">Approver</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRequests.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400">
                          No leave request records found for selected period and department.
                        </td>
                      </tr>
                    ) : (
                      filteredRequests.map(req => (
                        <tr key={req.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="p-3 font-mono font-bold text-gray-900">
                            {req.request_code}
                          </td>
                          <td className="p-3">
                            <strong className="text-gray-900 font-bold block">{req.employee_name}</strong>
                            <span className="text-[10px] text-gray-500 font-mono">
                              [{req.employee_code || 'EMP'}] • {req.department_name}
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="font-semibold text-gray-800">{req.leave_type_name}</span>
                            <span className="block text-[10px] font-mono text-gray-400">Code: {req.leave_type_code}</span>
                          </td>
                          <td className="p-3 font-mono text-gray-700">
                            <div>{req.from_date} → {req.to_date}</div>
                            <span className="text-[10px] font-bold text-[#07563D]">{req.leave_days_deducted} Day(s)</span>
                          </td>
                          <td className="p-3 text-gray-600 max-w-xs truncate" title={req.reason}>
                            {req.reason || 'Personal'}
                          </td>
                          <td className="p-3 text-center">
                            <Badge
                              variant={
                                req.status === 'Approved' ? 'emerald' :
                                req.status === 'Pending' ? 'amber' : 'rose'
                              }
                              size="sm"
                            >
                              {req.status}
                            </Badge>
                          </td>
                          <td className="p-3 text-[11px] text-gray-600">
                            {req.approved_by_name || req.manager_name || 'Management'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : selectedReportId === 'rep-10' ? (
                /* REPORT 10: DEPARTMENT-WISE BREAKDOWN & ABSENCE SUMMARY */
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="p-3">Department Name</th>
                      <th className="p-3 text-center">Headcount</th>
                      <th className="p-3 text-right">CL Taken</th>
                      <th className="p-3 text-right">SL Taken</th>
                      <th className="p-3 text-right">EL Taken</th>
                      <th className="p-3 text-right font-black text-rose-700">Total Days Taken</th>
                      <th className="p-3 text-right font-mono font-bold text-gray-700">Avg / Employee</th>
                      <th className="p-3 text-right font-mono font-black text-[#07563D]">Available Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {deptStats.map((ds, idx) => (
                      <tr key={ds.department} className="hover:bg-gray-50/60 transition-colors">
                        <td className="p-3 font-extrabold text-gray-900">
                          {ds.department}
                        </td>
                        <td className="p-3 text-center font-mono font-bold text-gray-700">
                          {ds.headcount} Staff
                        </td>
                        <td className="p-3 text-right font-mono text-gray-600">
                          {ds.clTaken}d
                        </td>
                        <td className="p-3 text-right font-mono text-gray-600">
                          {ds.slTaken}d
                        </td>
                        <td className="p-3 text-right font-mono text-gray-600">
                          {ds.elTaken}d
                        </td>
                        <td className="p-3 text-right font-mono font-black text-rose-700 bg-rose-50/20">
                          {ds.totalTaken} Days
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-gray-800">
                          {ds.avgPerEmp} d/emp
                        </td>
                        <td className="p-3 text-right font-mono font-black text-[#07563D] bg-emerald-50/30">
                          {ds.totalAvail} Days
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : selectedReportId === 'rep-06' ? (
                /* REPORT 6: YEAR-END CARRY FORWARD & ENCASHMENT AUDIT */
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="p-3">Employee</th>
                      <th className="p-3">Leave Type</th>
                      <th className="p-3 text-right">Available Bal</th>
                      <th className="p-3 text-center">Carry-Forward?</th>
                      <th className="p-3 text-center">Max Limit</th>
                      <th className="p-3 text-right text-emerald-700 font-black">Eligible CF (2027)</th>
                      <th className="p-3 text-right text-rose-700 font-black">Lapsed Days</th>
                      <th className="p-3 text-center">Encashable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEntitlements.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-400">
                          No entitlement records found.
                        </td>
                      </tr>
                    ) : (
                      filteredEntitlements.map(ent => {
                        const isCf = ent.is_carry_forward_allowed !== false;
                        const maxCf = ent.max_carry_forward_days || 0;
                        const eligible = ent.carry_forward_eligible ?? (isCf ? Math.min(ent.available_balance, maxCf) : 0);
                        const lapsed = ent.lapsed_days ?? (isCf ? Math.max(0, ent.available_balance - maxCf) : ent.available_balance);

                        return (
                          <tr key={ent.id} className="hover:bg-gray-50/60 transition-colors">
                            <td className="p-3">
                              <strong className="text-gray-900 font-bold block">{ent.employee_name}</strong>
                              <span className="text-[10px] text-gray-500 font-mono">
                                [{ent.employee_code || 'EMP'}] • {ent.department_name}
                              </span>
                            </td>
                            <td className="p-3 font-semibold text-gray-800">
                              {ent.leave_type_name} ({ent.leave_type_code || ''})
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-gray-800">
                              {ent.available_balance}
                            </td>
                            <td className="p-3 text-center">
                              <Badge variant={isCf ? 'emerald' : 'gray'} size="sm">
                                {isCf ? 'Allowed' : 'No'}
                              </Badge>
                            </td>
                            <td className="p-3 text-center font-mono text-gray-600">
                              {isCf ? `${maxCf}d` : '0d'}
                            </td>
                            <td className="p-3 text-right font-mono font-black text-emerald-700 bg-emerald-50/30">
                              +{eligible}d
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-rose-600 bg-rose-50/30">
                              {lapsed > 0 ? `-${lapsed}d` : '0d'}
                            </td>
                            <td className="p-3 text-center">
                              {ent.is_encashable ? (
                                <Badge variant="blue" size="sm">Yes</Badge>
                              ) : (
                                <span className="text-gray-400 text-[10px]">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              ) : selectedReportId === 'rep-14' ? (
                /* REPORT 14: EXCEPTIONS REPORT */
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="p-3">Exception ID</th>
                      <th className="p-3">Employee</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Severity</th>
                      <th className="p-3">Violation Details</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredExceptions.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-gray-400">
                          <CheckCircle className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                          <span>Zero open compliance exceptions. System in full adherence.</span>
                        </td>
                      </tr>
                    ) : (
                      filteredExceptions.map(exc => (
                        <tr key={exc.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="p-3 font-mono font-bold text-gray-900">{exc.id}</td>
                          <td className="p-3 font-bold text-gray-900">{exc.employee_name}</td>
                          <td className="p-3 font-mono text-gray-700">{exc.type}</td>
                          <td className="p-3">
                            <Badge variant={exc.severity === 'High' ? 'rose' : 'amber'} size="sm">
                              {exc.severity}
                            </Badge>
                          </td>
                          <td className="p-3 text-gray-700 max-w-xs truncate">{exc.title}</td>
                          <td className="p-3 text-center">
                            <Badge variant={exc.status === 'Resolved' ? 'emerald' : 'rose'} size="sm">
                              {exc.status}
                            </Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                /* REPORT 1 & 3: BALANCE & CLOSING LEDGER */
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-wider border-b border-gray-200">
                      <th className="p-3">Employee</th>
                      <th className="p-3">Leave Type</th>
                      <th className="p-3 text-right">Opening</th>
                      <th className="p-3 text-right text-emerald-700 font-bold">+ Accrued</th>
                      <th className="p-3 text-right text-rose-700 font-bold">- Consumed</th>
                      <th className="p-3 text-right text-amber-600 font-bold">Pending</th>
                      <th className="p-3 text-right font-black text-[#07563D] bg-emerald-50/40">
                        = Available
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredEntitlements.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-gray-400">
                          No balance records found.
                        </td>
                      </tr>
                    ) : (
                      filteredEntitlements.map(ent => (
                        <tr key={ent.id} className="hover:bg-gray-50/60 transition-colors">
                          <td className="p-3">
                            <strong className="text-gray-900 font-bold block">{ent.employee_name}</strong>
                            <span className="text-[10px] text-gray-500 font-mono">
                              [{ent.employee_code || 'EMP'}] • {ent.department_name}
                            </span>
                          </td>
                          <td className="p-3 font-semibold text-gray-800">
                            {ent.leave_type_name} ({ent.leave_type_code || ''})
                          </td>
                          <td className="p-3 text-right font-mono text-gray-600">{ent.opening_balance}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-700">+{ent.accrued}</td>
                          <td className="p-3 text-right font-mono font-bold text-rose-700">-{ent.used}</td>
                          <td className="p-3 text-right font-mono font-bold text-amber-600">{ent.pending}</td>
                          <td className="p-3 text-right font-mono font-black text-[#07563D] bg-emerald-50/20">
                            {ent.available_balance}d
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
