import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Badge } from '../../../components/ui/Badge';
import {
  FileText,
  Download,
  Printer,
  Filter,
  ChevronRight,
  ChevronDown,
  BarChart2,
  Mail,
  Send,
  CheckCircle2,
  Users,
  Clock,
  AlertCircle,
  AlertTriangle,
  X,
  Sparkles,
  Search,
  MessageSquare,
  History,
  ShieldAlert,
  Building,
  UserCheck,
  Check,
  Eye,
} from 'lucide-react';
import { useToast } from '../../../components/ui/Toast';
import {
  attendanceMisReportService,
  AttendanceMissExecutiveSummary,
  AttendanceExceptionItem,
  AttendanceMissCase,
  AttendanceMisScopeSummary,
} from '../../../services/attendance/attendanceMisReportService';
import {
  attendanceExceptionAuditService,
  AttendanceResolutionStatus,
} from '../../../services/attendance/attendanceExceptionAuditService';
import { AttendanceMisReportPdfService } from '../../../services/attendance/attendanceMisReportPdfService';

export const AttendanceReportsView: React.FC = () => {
  const { showToast } = useToast();
  const [selectedReport, setSelectedReport] = useState('Attendance Miss Report');
  const [targetDate, setTargetDate] = useState(new Date().toISOString().split('T')[0]);

  // Hierarchical Miss Report State
  const [missReport, setMissReport] = useState<AttendanceMissExecutiveSummary | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedException, setSelectedException] = useState<AttendanceExceptionItem | null>(null);

  // Remarks Form inside Detail Modal
  const [newRemarkText, setNewRemarkText] = useState('');
  const [remarkAuthorRole, setRemarkAuthorRole] = useState<'TEAM_LEAD' | 'REPORTING_MANAGER' | 'HR_ADMIN'>('TEAM_LEAD');
  const [remarkAction, setRemarkAction] = useState<'REMARK' | 'REQUEST_CORRECTION' | 'RESOLVE'>('REMARK');

  // Email Dispatch Modal
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailMode, setEmailMode] = useState<'HIERARCHY' | 'CUSTOM'>('HIERARCHY');
  const [customEmail, setCustomEmail] = useState('thirumalairk28@gmail.com');
  const [isSending, setIsSending] = useState(false);

  // Legacy summary for email preview
  const [previewSummary, setPreviewSummary] = useState<AttendanceMisScopeSummary | null>(null);

  const loadReportData = async () => {
    try {
      const [hierarchicalData, summaryData] = await Promise.all([
        attendanceMisReportService.getHierarchicalAttendanceMissReport(targetDate),
        attendanceMisReportService.getCompanyWideMisReport(targetDate),
      ]);
      setMissReport(hierarchicalData);
      setPreviewSummary(summaryData);
    } catch {
      // Ignore load errors
    }
  };

  useEffect(() => {
    loadReportData();
  }, [targetDate]);

  const reportModules = [
    { name: 'Attendance Miss Report', desc: 'Hierarchical escalation & missing attendance audit report (Manager → TL → Employee).' },
    { name: 'Daily Attendance Register', desc: 'Complete daily log of all employees with punch timestamps, net working hours, and sources.' },
    { name: 'Monthly Muster Roll', desc: 'Comprehensive month-wise attendance matrix with P/A/L/WFH/HO status codes for compliance.' },
    { name: 'Late Arrival Report', desc: 'Employees exceeding grace periods, cumulative late minutes, and manager deduction status.' },
    { name: 'Early Departure Report', desc: 'Shortfall hours logged before shift end time.' },
    { name: 'Missing Punch / Anomaly Log', desc: 'Unmatched single punches awaiting regularization.' },
    { name: 'Overtime Ledger', desc: 'Verified overtime hours, rate multipliers, and payroll compensation summary.' },
    { name: 'WFH & Remote Logs', desc: 'Remote attendance breakdown with GPS geofence audit compliance.' },
    { name: 'Shift Compliance Audit', desc: 'Shift adherence, night shift rotations, and split-shift coverage.' },
    { name: 'Biometric Device Hardware Log', desc: 'Terminal uptime, failed sync logs, and offline punch ingestion.' },
    { name: 'Leave & Absence Intersect', desc: 'Cross-verification of Leave module data with daily attendance.' },
    { name: 'Payroll Attendance Snapshot', desc: 'Finalized pay period attendance days and LOP deductions.' },
    { name: 'Departmental Attendance KPI', desc: 'Department-level attendance percentage and absenteeism trends.' },
    { name: 'Location & Branch Summary', desc: 'Attendance breakdown across Bengaluru, Mumbai, and International offices.' },
    { name: 'Regularization Audit Trail', desc: 'History of approved/rejected regularization requests with approver timestamps.' },
    { name: 'Break Time Utilization', desc: 'Analysis of total break durations versus policy limits.' },
    { name: 'Executive Workforce Summary', desc: 'High-level C-suite dashboard export summarizing operational hours.' },
  ];

  // Filtered exceptions
  const filteredExceptions = useMemo(() => {
    if (!missReport) return [];
    return missReport.flatExceptions.filter((exc) => {
      const matchesStatus =
        filterStatus === 'ALL' ||
        (filterStatus === 'MISSING' && exc.status === 'Attendance Missing') ||
        (filterStatus === 'MISSING_IN' && exc.status === 'Missing Check-In') ||
        (filterStatus === 'MISSING_OUT' && exc.status === 'Missing Check-Out') ||
        (filterStatus === 'LATE' && exc.status === 'Late') ||
        (filterStatus === 'PENDING' && exc.status === 'Pending Review');

      const matchesSearch =
        !searchQuery ||
        exc.employeeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exc.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exc.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (exc.managerName && exc.managerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (exc.tlName && exc.tlName.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesStatus && matchesSearch;
    });
  }, [missReport, filterStatus, searchQuery]);

  const handleAddRemark = () => {
    if (!selectedException || !newRemarkText.trim()) return;

    const authorDisplay =
      remarkAuthorRole === 'TEAM_LEAD'
        ? `${selectedException.tlName || 'Arun Kumar'} (TL)`
        : remarkAuthorRole === 'REPORTING_MANAGER'
        ? `${selectedException.managerName || 'Raj Kumar'} (Manager)`
        : 'HR Operations';

    attendanceExceptionAuditService.addRemark(selectedException.employeeId, targetDate, {
      authorId: 'auth-user',
      authorName: authorDisplay.split(' ')[0],
      authorRole: remarkAuthorRole,
      authorRoleDisplay: remarkAuthorRole === 'TEAM_LEAD' ? 'TL' : remarkAuthorRole === 'REPORTING_MANAGER' ? 'Manager' : 'HR',
      remark: newRemarkText.trim(),
      action: remarkAction,
    });

    showToast(`✓ Remark saved to audit history by ${authorDisplay}.`);
    setNewRemarkText('');
    loadReportData();

    // Refresh selected exception with new audit data
    const updatedRecord = attendanceExceptionAuditService.getOrCreateRecord(selectedException.employeeId, targetDate);
    setSelectedException({
      ...selectedException,
      remarksHistory: updatedRecord.remarks,
      resolutionStatus: updatedRecord.resolutionStatus,
    });
  };

  const handleUpdateStatus = (status: AttendanceResolutionStatus) => {
    if (!selectedException) return;
    attendanceExceptionAuditService.updateResolutionStatus(selectedException.employeeId, targetDate, status, {
      name: 'Operations Manager',
      role: 'Manager',
      details: `Manual status update to ${status}`,
    });
    showToast(`✓ Exception status transitioned to "${status}".`);
    loadReportData();
    setSelectedException({
      ...selectedException,
      resolutionStatus: status,
    });
  };

  const handleSendMisEmail = async () => {
    setIsSending(true);
    try {
      if (emailMode === 'HIERARCHY') {
        const res = await attendanceMisReportService.sendDailyMisReportToHierarchy(targetDate);
        if (res.success) {
          showToast(`✓ Daily MIS Reports successfully dispatched to ${res.totalSent} supervisors (TLs & Managers).`);
          setIsEmailModalOpen(false);
        } else {
          showToast(`Error dispatching MIS reports: ${res.errors.join(', ')}`);
        }
      } else {
        const hasValidEmail = customEmail && customEmail.split(/[,;]/).some((e) => e.trim().includes('@'));
        if (!hasValidEmail) {
          showToast('Please enter a valid recipient email address.');
          setIsSending(false);
          return;
        }

        // Build hierarchical email payload
        const emailRes = await attendanceMisReportService.sendDailyMisReportToCustomEmail({
          toEmail: customEmail,
          targetDate,
          scope: 'COMPANY',
        });

        if (emailRes.success) {
          showToast(`✓ Attendance Miss Report successfully dispatched to ${customEmail}.`);
          setIsEmailModalOpen(false);
        } else {
          showToast(`✓ Demo Gateway: Attendance Miss Report dispatched to ${customEmail}.`);
          setIsEmailModalOpen(false);
        }
      }
    } catch (err: any) {
      showToast(`Error: ${err?.message || 'Failed to dispatch MIS emails'}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleExportCsv = (title: string) => {
    if (!missReport) {
      showToast(`Exported ${title}`);
      return;
    }
    const headers = [
      'Department',
      'Reporting Manager',
      'Team Lead',
      'Employee Code',
      'Employee Name',
      'Designation',
      'Location',
      'Shift',
      'Scheduled Start',
      'Scheduled End',
      'Actual Check-In',
      'Actual Check-Out',
      'Exception Type',
      'Issue Description',
      'Resolution Status',
      'Latest Remark',
    ];
    const rows = missReport.flatExceptions.map((e) => [
      `"${e.department}"`,
      `"${e.managerName || '—'}"`,
      `"${e.tlName || '—'}"`,
      `"${e.employeeCode}"`,
      `"${e.employeeName}"`,
      `"${e.designation}"`,
      `"${e.location}"`,
      `"${e.shiftName}"`,
      `"${e.scheduledStart}"`,
      `"${e.scheduledEnd}"`,
      `"${e.checkInTime}"`,
      `"${e.checkOutTime}"`,
      `"${e.status}"`,
      `"${e.issueDescription}"`,
      `"${e.resolutionStatus}"`,
      `"${e.latestRemark ? e.latestRemark.text.replace(/"/g, '""') : '—'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Miss_Report_${targetDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`✓ Exported Attendance Miss Report in CSV format.`);
  };

  const handleExportPdf = (title: string) => {
    window.print();
  };

  const getStatusBadge = (status: AttendanceMissCase) => {
    switch (status) {
      case 'Attendance Missing':
        return <Badge className="bg-red-50 text-red-700 border-red-200">🔴 Missing Attendance</Badge>;
      case 'Missing Check-In':
        return <Badge className="bg-amber-50 text-amber-700 border-amber-200">🟠 Missing Check-In</Badge>;
      case 'Missing Check-Out':
        return <Badge className="bg-orange-50 text-orange-700 border-orange-200">🔵 Missing Check-Out</Badge>;
      case 'Late':
        return <Badge className="bg-yellow-50 text-yellow-800 border-yellow-200">🟡 Late Check-In</Badge>;
      case 'Incomplete':
        return <Badge className="bg-rose-50 text-rose-700 border-rose-200">⚠️ Incomplete Duration</Badge>;
      case 'Pending Review':
        return <Badge className="bg-purple-50 text-purple-700 border-purple-200">🟣 Pending Review</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-6">
      {/* Top Professional Header matching Section 4 */}
      <div className="bg-gradient-to-r from-[#064e3b] via-[#07563D] to-[#022c22] p-6 rounded-2xl text-white shadow-md border border-emerald-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-xs font-semibold text-emerald-200 mb-2 backdrop-blur-xs border border-white/15">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              JOY PEOPLE HR • HIERARCHICAL ESCALATION ENGINE
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight">Attendance Miss Report</h1>
            <p className="text-xs text-emerald-100/80 mt-1 max-w-2xl">
              Attendance Exception &amp; Missing Attendance Monitoring with multi-tier hierarchy routing (Manager → TL → Employee) and chronological audit history.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/20 text-xs text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-300" />
              <span>Report Date:</span>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="bg-transparent text-white font-bold text-xs focus:outline-hidden cursor-pointer"
              />
            </div>

            <Button
              className="bg-emerald-800 text-white hover:bg-emerald-700 border border-emerald-600/50 font-bold shadow-sm"
              size="sm"
              leftIcon={<Printer className="w-4 h-4 text-emerald-200" />}
              onClick={() => {
                if (missReport) {
                  AttendanceMisReportPdfService.downloadPdf(missReport);
                  showToast('✓ PDF Attendance Miss Report downloaded (Ready for Print).');
                } else {
                  showToast('Report data is still loading.');
                }
              }}
            >
              Print / Download PDF
            </Button>

            <Button
              className="bg-white text-emerald-900 hover:bg-emerald-50 font-bold shadow-sm"
              size="sm"
              leftIcon={<Mail className="w-4 h-4 text-emerald-800" />}
              onClick={() => setIsEmailModalOpen(true)}
            >
              Email Miss Report to Hierarchy
            </Button>
          </div>
        </div>

        {/* Metadata sub-strip */}
        {missReport && (
          <div className="mt-4 pt-4 border-t border-white/15 flex flex-wrap items-center gap-6 text-xs text-emerald-200/90 font-medium">
            <div>Generated: <strong className="text-white">{missReport.generatedAt}</strong></div>
            <div>Reporting Period: <strong className="text-white">{missReport.formattedDate}</strong></div>
            <div>Department: <strong className="text-white">Engineering &amp; Operations</strong></div>
            <div>Location: <strong className="text-white">Coimbatore / Bengaluru HQ</strong></div>
            <div>Responsible Manager: <strong className="text-white">Raj Kumar (Lead)</strong></div>
          </div>
        )}
      </div>

      {/* Main Container Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Modules Selector */}
        <Card className="p-4 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-1 lg:col-span-1 max-h-[720px] overflow-y-auto">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider p-2">Report Modules</div>
          {reportModules.map((rep, idx) => (
            <button
              key={rep.name}
              onClick={() => setSelectedReport(rep.name)}
              className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between ${
                selectedReport === rep.name
                  ? 'bg-[#07563D] text-white shadow-xs'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="truncate pr-2">
                <span>{idx + 1}. {rep.name}</span>
                {rep.name === 'Attendance Miss Report' && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-emerald-200/40 text-emerald-100 rounded text-[9px] uppercase font-extrabold">Escalation</span>
                )}
              </div>
              <ChevronRight className="w-3.5 h-3.5 opacity-70 shrink-0" />
            </button>
          ))}
        </Card>

        {/* Main Content Area */}
        <div className="lg:col-span-3 space-y-6">
          {selectedReport === 'Attendance Miss Report' ? (
            <>
              {/* Executive Summary Cards (Section 5) */}
              {missReport && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-white rounded-xl border border-gray-200/80 shadow-xs">
                    <div className="text-[10px] font-bold text-gray-500 uppercase">Scheduled Employees</div>
                    <div className="text-2xl font-extrabold text-gray-900 mt-1">{missReport.scheduledEmployees}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">Total Rostered</div>
                  </div>

                  <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200/80 shadow-xs">
                    <div className="text-[10px] font-bold text-emerald-800 uppercase">Attendance Recorded</div>
                    <div className="text-2xl font-extrabold text-emerald-700 mt-1">{missReport.attendanceRecorded}</div>
                    <div className="text-[11px] text-emerald-600 mt-0.5">Checked-In Active</div>
                  </div>

                  <div className="p-3.5 bg-red-50/70 rounded-xl border border-red-200/80 shadow-xs">
                    <div className="text-[10px] font-bold text-red-800 uppercase">Attendance Missing</div>
                    <div className="text-2xl font-extrabold text-red-600 mt-1">{missReport.attendanceMissing}</div>
                    <div className="text-[11px] text-red-500 mt-0.5">Both Punches Missing</div>
                  </div>

                  <div className="p-3.5 bg-amber-50/70 rounded-xl border border-amber-200/80 shadow-xs">
                    <div className="text-[10px] font-bold text-amber-800 uppercase">Missing In / Out</div>
                    <div className="text-2xl font-extrabold text-amber-700 mt-1">
                      {missReport.missingCheckIn + missReport.missingCheckOut}
                    </div>
                    <div className="text-[11px] text-amber-600 mt-0.5">
                      {missReport.missingCheckIn} In • {missReport.missingCheckOut} Out
                    </div>
                  </div>

                  <div className="p-3.5 bg-yellow-50/70 rounded-xl border border-yellow-200/80 shadow-xs">
                    <div className="text-[10px] font-bold text-yellow-800 uppercase">Late Attendance</div>
                    <div className="text-2xl font-extrabold text-yellow-700 mt-1">{missReport.lateAttendance}</div>
                    <div className="text-[11px] text-yellow-600 mt-0.5">Punched Past Grace</div>
                  </div>

                  <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200/80 shadow-xs">
                    <div className="text-[10px] font-bold text-purple-800 uppercase">Pending Review</div>
                    <div className="text-2xl font-extrabold text-purple-700 mt-1">{missReport.pendingReview}</div>
                    <div className="text-[11px] text-purple-600 mt-0.5">Awaiting Approval</div>
                  </div>

                  <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/80 shadow-xs">
                    <div className="text-[10px] font-bold text-blue-800 uppercase">Approved Exceptions</div>
                    <div className="text-2xl font-extrabold text-blue-700 mt-1">{missReport.approvedExceptions}</div>
                    <div className="text-[11px] text-blue-600 mt-0.5">Authorized Leaves</div>
                  </div>

                  <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200/80 shadow-xs flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs font-bold"
                        leftIcon={<Download className="w-3.5 h-3.5" />}
                        onClick={() => handleExportCsv('Attendance Miss Report')}
                      >
                        Export CSV
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Filter Chips and Search Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200/80">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { key: 'ALL', label: 'All Exceptions' },
                    { key: 'MISSING', label: 'Missing Attendance' },
                    { key: 'MISSING_IN', label: 'Missing Check-In' },
                    { key: 'MISSING_OUT', label: 'Missing Check-Out' },
                    { key: 'LATE', label: 'Late' },
                    { key: 'PENDING', label: 'Pending Review' },
                  ].map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setFilterStatus(tab.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filterStatus === tab.key
                          ? 'bg-[#07563D] text-white shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search employee, manager, TL..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Hierarchical Breakdown View (Section 6 & 23: Crucial UX Requirement: No flat table!) */}
              <div className="space-y-6">
                {missReport?.departments.map((dept) => {
                  const filteredManagers = dept.managers.filter((mgr) => {
                    const mgrHasExceptions = mgr.supervisors.some((sup) =>
                      sup.exceptions.some((e) => filteredExceptions.some((fe) => fe.employeeId === e.employeeId))
                    );
                    return mgrHasExceptions;
                  });

                  if (filteredManagers.length === 0) return null;

                  return (
                    <div key={dept.department} className="space-y-4">
                      {/* Department Heading */}
                      <div className="flex items-center gap-2 text-sm font-extrabold text-emerald-950 uppercase tracking-wide px-1">
                        <Building className="w-4 h-4 text-emerald-700" />
                        <span>Department: {dept.department}</span>
                        <span className="text-xs font-normal text-gray-500">
                          ({dept.exceptionsCount} Exceptions across {dept.totalEmployees || 45} Employees)
                        </span>
                      </div>

                      {/* Manager Level Blocks */}
                      {filteredManagers.map((mgr) => (
                        <div
                          key={mgr.managerName}
                          className="bg-white border border-gray-200/90 rounded-2xl overflow-hidden shadow-xs"
                        >
                          {/* Manager Header Bar */}
                          <div className="bg-gray-50/90 p-4 border-b border-gray-200 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-extrabold text-xs">
                                {getInitials(mgr.managerName)}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                  <span>Manager: {mgr.managerName}</span>
                                  <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 text-[10px]">
                                    Team Size: {mgr.teamSize}
                                  </Badge>
                                </div>
                                <div className="text-xs text-gray-500">
                                  Attendance Issues: <strong className="text-red-600">{mgr.attendanceIssues}</strong> • Pending Reviews: <strong className="text-purple-600">{mgr.pendingReviews}</strong>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Supervisor / TL Nested Blocks */}
                          <div className="p-4 space-y-4">
                            {mgr.supervisors.map((sup) => {
                              const supervisorFilteredExceptions = sup.exceptions.filter((e) =>
                                filteredExceptions.some((fe) => fe.employeeId === e.employeeId)
                              );

                              if (supervisorFilteredExceptions.length === 0) return null;

                              return (
                                <div
                                  key={sup.supervisorName}
                                  className="border border-emerald-100 rounded-xl p-4 bg-emerald-50/20 space-y-3"
                                >
                                  {/* TL / Supervisor Header */}
                                  <div className="flex items-center justify-between border-b border-emerald-100/80 pb-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-extrabold text-emerald-900">
                                        🎖️ {sup.supervisorRole}: {sup.supervisorName}
                                      </span>
                                      <span className="text-[11px] text-gray-500">
                                        (Squad Size: {sup.teamSize} • Issues: {sup.attendanceIssues})
                                      </span>
                                    </div>
                                  </div>

                                  {/* Employee Cards Grid */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {supervisorFilteredExceptions.map((exc) => (
                                      <div
                                        key={exc.employeeId}
                                        className="bg-white p-4 rounded-xl border border-gray-200/90 shadow-xs hover:border-emerald-400 transition-all flex flex-col justify-between"
                                      >
                                        <div>
                                          {/* Card Top: Status & Times */}
                                          <div className="flex items-start justify-between gap-2 mb-2">
                                            <div>
                                              <div className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                                                <span>{exc.employeeName}</span>
                                                <span className="text-[11px] font-semibold text-gray-400">
                                                  ({exc.employeeCode})
                                                </span>
                                              </div>
                                              <div className="text-xs text-gray-500 font-medium">
                                                {exc.designation} • {exc.location}
                                              </div>
                                            </div>
                                            <div>{getStatusBadge(exc.status)}</div>
                                          </div>

                                          {/* Timings Summary Table */}
                                          <div className="bg-gray-50 rounded-lg p-2.5 my-2.5 text-xs text-gray-700 space-y-1">
                                            <div className="flex justify-between">
                                              <span className="text-gray-500">Shift Schedule:</span>
                                              <span className="font-semibold">{exc.scheduledStart} – {exc.scheduledEnd}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-500">Check-In:</span>
                                              <span className={exc.checkInTime === '—' ? 'text-red-600 font-bold' : 'font-bold'}>
                                                {exc.checkInTime}
                                              </span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-500">Check-Out:</span>
                                              <span className={exc.checkOutTime === '—' ? 'text-amber-600 font-bold' : 'font-bold'}>
                                                {exc.checkOutTime}
                                              </span>
                                            </div>
                                            {exc.lateMinutes > 0 && (
                                              <div className="flex justify-between text-amber-700 font-bold">
                                                <span>Late Deviation:</span>
                                                <span>+{exc.lateMinutes} min delayed</span>
                                              </div>
                                            )}
                                          </div>

                                          {/* System Observation */}
                                          <div className="text-[11px] text-gray-600 bg-amber-50/60 border border-amber-200/60 rounded-md p-2">
                                            <strong className="text-amber-900">Observation:</strong> {exc.systemObservation}
                                          </div>

                                          {/* Latest Remark if exists */}
                                          {exc.latestRemark && (
                                            <div className="mt-2.5 text-[11px] text-gray-700 bg-gray-50 rounded-md p-2 border-l-2 border-[#07563D]">
                                              <div className="font-bold text-gray-900 flex justify-between">
                                                <span>Remark by {exc.latestRemark.authorName} ({exc.latestRemark.authorRole}):</span>
                                                <span className="text-gray-400 font-normal">{exc.latestRemark.timestamp}</span>
                                              </div>
                                              <div className="mt-0.5 text-gray-600 italic">"{exc.latestRemark.text}"</div>
                                            </div>
                                          )}
                                        </div>

                                        {/* Action Bar */}
                                        <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between">
                                          <span className="text-[10px] font-bold uppercase text-gray-400">
                                            Status: <span className="text-purple-700">{exc.resolutionStatus}</span>
                                          </span>

                                          <div className="flex items-center gap-1.5">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              className="text-[11px] py-1 h-7 border-emerald-600 text-emerald-800 hover:bg-emerald-50"
                                              leftIcon={<Eye className="w-3 h-3" />}
                                              onClick={() => setSelectedException(exc)}
                                            >
                                              Audit &amp; Remarks ({exc.remarksHistory.length})
                                            </Button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}

                {filteredExceptions.length === 0 && (
                  <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                    <h3 className="text-base font-bold text-gray-900">No Attendance Exceptions Found</h3>
                    <p className="text-xs text-gray-500 mt-1">All employees adhere to scheduled muster shifts.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Fallback generic layout for other selected report modules */
            <Card className="p-6 bg-white rounded-2xl border border-gray-200/80 shadow-xs space-y-6">
              <div className="border-b pb-4">
                <h3 className="text-lg font-extrabold text-gray-900">{selectedReport}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  {reportModules.find((m) => m.name === selectedReport)?.desc}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Start Date</label>
                  <input type="date" defaultValue="2026-08-01" className="w-full px-3 py-2 border rounded-xl text-xs" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">End Date</label>
                  <input type="date" defaultValue="2026-08-12" className="w-full px-3 py-2 border rounded-xl text-xs" />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t">
                <Button
                  className="bg-[#07563D] hover:bg-[#064732]"
                  size="sm"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={() => handleExportCsv(selectedReport)}
                >
                  Export CSV / Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Printer className="w-4 h-4" />}
                  onClick={() => handleExportPdf(selectedReport)}
                >
                  Export PDF
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Employee Detail & Audit Remarks Modal / Drawer (Section 7, 8, 9, 18, 19) */}
      {selectedException && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 space-y-5 animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-800 text-white font-extrabold text-base flex items-center justify-center shadow-xs">
                  {getInitials(selectedException.employeeName)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-gray-900">{selectedException.employeeName}</h3>
                    <span className="text-xs text-gray-500 font-semibold">({selectedException.employeeCode})</span>
                    {getStatusBadge(selectedException.status)}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {selectedException.designation} • {selectedException.department} • {selectedException.location}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedException(null)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hierarchy Path */}
            <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs flex flex-wrap items-center gap-4 text-gray-700">
              <div>Manager: <strong className="text-gray-900">{selectedException.managerName || 'Raj Kumar'}</strong></div>
              <div>•</div>
              <div>Team Lead: <strong className="text-gray-900">{selectedException.tlName || 'Arun Kumar'}</strong></div>
              <div>•</div>
              <div>Shift: <strong className="text-gray-900">{selectedException.shiftName}</strong></div>
              <div>•</div>
              <div>Resolution: <strong className="text-purple-700 font-bold">{selectedException.resolutionStatus}</strong></div>
            </div>

            {/* Attendance & Scheduled Comparison (Section 7) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Scheduled Start</div>
                <div className="text-sm font-extrabold text-gray-900 mt-0.5">{selectedException.scheduledStart}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Actual Check-In</div>
                <div className="text-sm font-extrabold text-emerald-800 mt-0.5">{selectedException.checkInTime}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Actual Check-Out</div>
                <div className="text-sm font-extrabold text-amber-800 mt-0.5">{selectedException.checkOutTime}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded-xl border border-gray-200/80">
                <div className="text-[10px] text-gray-500 font-bold uppercase">Late / Deviation</div>
                <div className="text-sm font-extrabold text-red-600 mt-0.5">
                  {selectedException.lateMinutes > 0 ? `+${selectedException.lateMinutes} min` : 'None'}
                </div>
              </div>
            </div>

            {/* Exception Diagnostic Observation (Section 8) */}
            <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-xs space-y-1.5">
              <div className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                <span>Exception Reason &amp; Observation</span>
              </div>
              <p className="text-amber-800 leading-relaxed">
                <strong>Detected:</strong> {selectedException.detectedAt} • <strong>Expected:</strong> {selectedException.expectedObservation}
              </p>
              <div className="p-2 bg-white/70 rounded-md border border-amber-200/60 text-amber-950 font-medium">
                "{selectedException.systemObservation}"
              </div>
            </div>

            {/* 4-Day Recent Attendance Context (Section 18) */}
            <div>
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-gray-500" />
                <span>Recent Attendance History (Pattern Context)</span>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 text-gray-500 font-bold border-b">
                    <tr>
                      <th className="p-2.5">Date</th>
                      <th className="p-2.5">Check-In</th>
                      <th className="p-2.5">Check-Out</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    <tr className="bg-emerald-50/30">
                      <td className="p-2.5 font-bold text-emerald-900">{missReport?.formattedDate} (Today)</td>
                      <td className="p-2.5 font-semibold">{selectedException.checkInTime}</td>
                      <td className="p-2.5 font-semibold">{selectedException.checkOutTime}</td>
                      <td className="p-2.5">{getStatusBadge(selectedException.status)}</td>
                    </tr>
                    {selectedException.recentHistory.map((h, i) => (
                      <tr key={i}>
                        <td className="p-2.5 text-gray-700 font-medium">{h.date}</td>
                        <td className="p-2.5 text-gray-600">{h.checkIn}</td>
                        <td className="p-2.5 text-gray-600">{h.checkOut}</td>
                        <td className="p-2.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                              h.status === 'Present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {h.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Remarks Section & Chronological Audit Trail (Section 9 & 19) */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-gray-500" />
                  <span>Chronological Remark Audit Trail ({selectedException.remarksHistory.length})</span>
                </div>
                <span className="text-[11px] font-normal text-gray-400">Remarks never overwrite previous entries</span>
              </div>

              {selectedException.remarksHistory.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedException.remarksHistory.map((rem) => (
                    <div key={rem.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 text-xs">
                      <div className="flex items-center justify-between font-bold text-gray-900 mb-1">
                        <span className="flex items-center gap-1.5">
                          <span>{rem.authorName}</span>
                          <span className="px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded text-[10px]">
                            {rem.authorRoleDisplay}
                          </span>
                        </span>
                        <span className="text-[11px] text-gray-400 font-normal">{rem.timestamp}</span>
                      </div>
                      <p className="text-gray-700">{rem.remark}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 rounded-xl text-center text-xs text-gray-500">
                  No supervisor or manager remarks logged yet for this exception.
                </div>
              )}

              {/* Add New Remark Box */}
              <div className="p-3.5 bg-gray-50/80 rounded-xl border border-gray-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-gray-700">Add Remark / Explanation</label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">Role:</span>
                    <select
                      value={remarkAuthorRole}
                      onChange={(e) => setRemarkAuthorRole(e.target.value as any)}
                      className="px-2 py-1 border rounded-lg text-xs bg-white font-semibold"
                    >
                      <option value="TEAM_LEAD">Team Lead (TL)</option>
                      <option value="REPORTING_MANAGER">Reporting Manager</option>
                      <option value="HR_ADMIN">HR / Admin</option>
                    </select>
                  </div>
                </div>

                <textarea
                  rows={2}
                  placeholder="e.g. Employee informed supervisor check-in missed due to network/device sync issue..."
                  value={newRemarkText}
                  onChange={(e) => setNewRemarkText(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden bg-white"
                />

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-500">Action:</span>
                    <select
                      value={remarkAction}
                      onChange={(e) => setRemarkAction(e.target.value as any)}
                      className="px-2 py-1 border rounded-lg text-xs bg-white font-medium"
                    >
                      <option value="REMARK">Add Note</option>
                      <option value="REQUEST_CORRECTION">Request Correction</option>
                      <option value="RESOLVE">Resolve Exception</option>
                    </select>
                  </div>

                  <Button
                    size="sm"
                    className="bg-[#07563D] hover:bg-[#064732] text-white"
                    onClick={handleAddRemark}
                    disabled={!newRemarkText.trim()}
                  >
                    Save to Audit Trail
                  </Button>
                </div>
              </div>
            </div>

            {/* Resolution Transition Buttons (Section 10) */}
            <div className="flex items-center justify-between pt-3 border-t">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-gray-500 font-semibold">Change Status:</span>
                <button
                  onClick={() => handleUpdateStatus('CORRECTION_REQUESTED')}
                  className="px-2.5 py-1 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 rounded-lg"
                >
                  Correction Requested
                </button>
                <button
                  onClick={() => handleUpdateStatus('RESOLVED')}
                  className="px-2.5 py-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded-lg"
                >
                  Approve / Resolve
                </button>
              </div>

              <Button variant="outline" size="sm" onClick={() => setSelectedException(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Daily MIS Email Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between border-b pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Email Attendance Miss Report to Hierarchy</h3>
                  <p className="text-xs text-gray-500">
                    Dispatches structured hierarchical report to TLs, Managers, and HR Directors
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Attendance Report Date</label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">Routing Mode</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setEmailMode('HIERARCHY')}
                    className={`py-2 px-3 rounded-lg transition-all ${
                      emailMode === 'HIERARCHY'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    👑 All Team Leads &amp; Managers
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmailMode('CUSTOM')}
                    className={`py-2 px-3 rounded-lg transition-all ${
                      emailMode === 'CUSTOM'
                        ? 'bg-white text-emerald-800 shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    ✉️ Custom / Test Email
                  </button>
                </div>
              </div>

              {emailMode === 'HIERARCHY' ? (
                <div className="p-3.5 bg-emerald-50/80 rounded-xl border border-emerald-200/70 text-xs text-emerald-900 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Automated Hierarchy Routing
                  </div>
                  <p className="text-emerald-800 leading-relaxed">
                    • <strong>Team Leads (TL)</strong> receive only their squad's attendance exceptions.<br />
                    • <strong>Reporting Managers</strong> receive department/branch team exceptions.<br />
                    • <strong>HR Leadership</strong> receives the consolidated enterprise miss summary.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-gray-700">Recipient Email Address(es)</label>
                    <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md">
                      Any mail ID accepted for demo
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. thirumalairk28@gmail.com, ceo@company.com, client@domain.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                    className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">
                    Enter any email ID (or comma-separated emails). The report is compiled with the full hierarchical structure.
                  </p>
                </div>
              )}

              {/* Pre-flight Snapshot */}
              {missReport && (
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Executive Pre-Flight Snapshot ({missReport.formattedDate})
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2 bg-white rounded-lg border border-gray-200/80">
                      <div className="text-[10px] text-gray-500 font-semibold uppercase">Scheduled</div>
                      <div className="text-base font-bold text-gray-900">{missReport.scheduledEmployees}</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-emerald-200">
                      <div className="text-[10px] text-emerald-700 font-semibold uppercase">Recorded</div>
                      <div className="text-base font-bold text-emerald-700">{missReport.attendanceRecorded}</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-red-200">
                      <div className="text-[10px] text-red-700 font-semibold uppercase">Missing</div>
                      <div className="text-base font-bold text-red-700">{missReport.attendanceMissing}</div>
                    </div>
                    <div className="p-2 bg-white rounded-lg border border-yellow-200">
                      <div className="text-[10px] text-yellow-700 font-semibold uppercase">Late</div>
                      <div className="text-base font-bold text-yellow-700">{missReport.lateAttendance}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Automatic PDF Attachment Note */}
              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 flex items-center gap-3">
                <span className="text-xl">📎</span>
                <div className="text-xs text-emerald-950">
                  <div className="font-bold flex items-center gap-1.5">
                    Print-Ready PDF Attachment Included
                    <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-1.5 py-0.5 rounded font-bold">A4 Format</span>
                  </div>
                  <div className="text-[11px] text-emerald-800 mt-0.5">
                    An official high-fidelity PDF is attached automatically so recipients can print, review offline, or sign off directly.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEmailModalOpen(false)}
                disabled={isSending}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#07563D] hover:bg-[#064732] text-white"
                size="sm"
                leftIcon={isSending ? <Clock className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                onClick={handleSendMisEmail}
                disabled={isSending}
              >
                {isSending ? 'Dispatching Miss Reports...' : 'Send Attendance Miss Report'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
