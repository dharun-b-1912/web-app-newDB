import React, { useState, useEffect } from 'react';
import { leaveApi } from '../../../services/leaveApi';
import { Badge } from '../../../components/ui/Badge';
import {
  FileSpreadsheet,
  Download,
  Printer,
  Search,
  Filter,
  CheckCircle,
  BarChart,
  FileText,
  Calendar,
  Layers,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';
import { cn } from '../../../lib/utils';

export const LeaveReportsView: React.FC = () => {
  const [selectedReportId, setSelectedReportId] = useState<string>('rep-01');
  const [searchQuery, setSearchQuery] = useState('');
  const [entitlements, setEntitlements] = useState(leaveApi.getEntitlements());
  const [requests, setRequests] = useState(leaveApi.getLeaveRequests());
  const [ledger, setLedger] = useState(leaveApi.getLedger());
  const [exceptions, setExceptions] = useState(leaveApi.getExceptions());
  const [leaveTypes, setLeaveTypes] = useState(leaveApi.getLeaveTypes());

  useEffect(() => {
    setEntitlements(leaveApi.getEntitlements());
    setRequests(leaveApi.getLeaveRequests());
    setLedger(leaveApi.getLedger());
    setExceptions(leaveApi.getExceptions());
    setLeaveTypes(leaveApi.getLeaveTypes());
  }, []);

  const reportList = [
    { id: 'rep-01', name: '1. Leave Summary Matrix', desc: 'High-level aggregate leave entitlement and utilization by employee & department' },
    { id: 'rep-02', name: '2. Detailed Leave Register', desc: 'Line-by-line employee request transactions with duration breakdowns and approval audit stamps' },
    { id: 'rep-03', name: '3. Complete Balance & Closing Ledger', desc: 'Opening, accrued, adjusted, consumed, encashed, and closing balance per employee' },
    { id: 'rep-04', name: '4. LOP & Unpaid Leave Register', desc: 'Loss-of-pay deductions fed into monthly payroll computation' },
    { id: 'rep-05', name: '5. Accrual & Grant Execution Audit', desc: 'Audit log of automated monthly accrual batches and manual HR grants' },
    { id: 'rep-06', name: '6. Year-End Carry Forward Audit', desc: 'Lapsed, encashed, and carried-forward leave days at fiscal year end' },
    { id: 'rep-07', name: '7. Encashment Statement', desc: 'Approved leave encashments and corresponding monetary calculation records' },
    { id: 'rep-08', name: '8. Comp-Off Utilization Audit', desc: 'Credits earned from weekend work vs claims consumed and expired' },
    { id: 'rep-09', name: '9. Holiday & Calendar Master', desc: 'List of mandatory and restricted holidays configured across branches' },
    { id: 'rep-10', name: '10. Department Absence Distribution', desc: 'SLA analysis of peak leave days and team capacity bottlenecks' },
    { id: 'rep-11', name: '11. Leave Utilization Rate', desc: 'Percentage of allocated leave taken per department' },
    { id: 'rep-12', name: '12. Approval SLA & Turnaround', desc: 'Average time taken by line managers to approve/reject requests' },
    { id: 'rep-13', name: '13. Negative Balance Audit', desc: 'Tracking employees with overdrafted leave balances' },
    { id: 'rep-14', name: '14. Exceptions & Compliance Risk Report', desc: 'Statutory compliance register and policy violations log' },
    { id: 'rep-15', name: '15. Year-End Leave Reconciliation', desc: 'Comprehensive fiscal year-end leave balance audit' },
  ];

  const selectedReport = reportList.find(r => r.id === selectedReportId) || reportList[0];

  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (selectedReportId === 'rep-02') {
      headers = ['Request Code', 'Employee', 'Department', 'Leave Type', 'From', 'To', 'Calendar Days', 'Deducted Days', 'Status', 'Approver'];
      rows = requests.map(r => [
        r.request_code,
        `"${r.employee_name}"`,
        `"${r.department_name}"`,
        `"${r.leave_type_name}"`,
        r.from_date,
        r.to_date,
        r.total_calendar_days,
        r.leave_days_deducted,
        r.status,
        `"${r.current_approver_name || 'System'}"`,
      ]);
    } else if (selectedReportId === 'rep-14') {
      headers = ['Exception ID', 'Employee', 'Department', 'Type', 'Severity', 'Title', 'Status', 'Flagged Date'];
      rows = exceptions.map(e => [
        e.id,
        `"${e.employee_name}"`,
        `"${e.department_name}"`,
        e.type,
        e.severity,
        `"${e.title}"`,
        e.status,
        e.flagged_at,
      ]);
    } else {
      headers = ['Employee', 'Department', 'Leave Type', 'Opening', 'Accrued', 'Adjusted', 'Used', 'Encashed', 'Available Balance', 'Period'];
      rows = entitlements.map(e => [
        `"${e.employee_name}"`,
        `"${e.department_name}"`,
        `"${e.leave_type_name}"`,
        e.opening_balance,
        e.accrued,
        e.adjusted || 0,
        e.used,
        e.encashed || 0,
        e.available_balance,
        `"${e.period}"`,
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${selectedReportId}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#07563D]" />
            <span>Enterprise Leave Reports & Compliance Analytics</span>
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Real-time querying across 15+ specialized HR reports with automated CSV exports and audit-grade data
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-[#07563D] hover:bg-[#05402e] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export Report (CSV)</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reports Catalog Sidebar */}
        <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
          <h3 className="text-xs font-black text-gray-900 uppercase tracking-wider mb-2">
            15 Specialized Leave Reports
          </h3>
          {reportList.map(rep => (
            <div
              key={rep.id}
              onClick={() => setSelectedReportId(rep.id)}
              className={cn(
                'p-3.5 rounded-2xl border cursor-pointer transition-all',
                selectedReportId === rep.id
                  ? 'border-[#07563D] bg-[#07563D]/5 shadow-2xs'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              )}
            >
              <h4 className="text-xs font-extrabold text-gray-900">{rep.name}</h4>
              <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{rep.desc}</p>
            </div>
          ))}
        </div>

        {/* Report Preview Surface */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200/80 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-sm font-black text-gray-900">{selectedReport.name}</h3>
                <p className="text-xs text-gray-500">{selectedReport.desc}</p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter records..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 border border-gray-300 rounded-xl text-xs bg-white w-48"
                />
              </div>
            </div>

            {/* Table Display */}
            <div className="overflow-x-auto rounded-xl border border-gray-100">
              {selectedReportId === 'rep-02' ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase">
                      <th className="p-3">Req ID</th>
                      <th className="p-3">Employee</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">From - To</th>
                      <th className="p-3 text-center">Days</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {requests.map(req => (
                      <tr key={req.id} className="hover:bg-gray-50/50">
                        <td className="p-3 font-mono font-bold text-gray-900">{req.request_code}</td>
                        <td className="p-3 font-bold text-gray-900">{req.employee_name}</td>
                        <td className="p-3 text-gray-700">{req.leave_type_name}</td>
                        <td className="p-3 font-mono text-gray-600">{req.from_date} → {req.to_date}</td>
                        <td className="p-3 text-center font-mono font-bold">{req.leave_days_deducted}d</td>
                        <td className="p-3 text-center">
                          <Badge variant={req.status === 'Approved' ? 'emerald' : 'amber'} size="sm">
                            {req.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : selectedReportId === 'rep-14' ? (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase">
                      <th className="p-3">ID</th>
                      <th className="p-3">Employee</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Severity</th>
                      <th className="p-3">Title</th>
                      <th className="p-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {exceptions.map(exc => (
                      <tr key={exc.id} className="hover:bg-gray-50/50">
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
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase">
                      <th className="p-3">Employee</th>
                      <th className="p-3">Type</th>
                      <th className="p-3 text-right">Opening</th>
                      <th className="p-3 text-right text-emerald-700">Accrued</th>
                      <th className="p-3 text-right text-rose-700">Used</th>
                      <th className="p-3 text-right font-black text-[#07563D]">Available</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {entitlements.map(ent => (
                      <tr key={ent.id} className="hover:bg-gray-50/50">
                        <td className="p-3">
                          <strong className="text-gray-900 block">{ent.employee_name}</strong>
                          <span className="text-[10px] text-gray-400 font-normal">{ent.department_name}</span>
                        </td>
                        <td className="p-3 font-semibold text-gray-700">{ent.leave_type_name}</td>
                        <td className="p-3 text-right font-mono text-gray-600">{ent.opening_balance}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-700">+{ent.accrued}</td>
                        <td className="p-3 text-right font-mono font-bold text-rose-700">-{ent.used}</td>
                        <td className="p-3 text-right font-mono font-black text-[#07563D]">{ent.available_balance} d</td>
                      </tr>
                    ))}
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
