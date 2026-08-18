import React, { useState, useEffect, useMemo } from 'react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/Table';
import { Breadcrumb } from '../../components/shell/Breadcrumb';
import { useToast } from '../../components/ui/Toast';
import { offboardingService } from '../../services/offboardingService';
import { hrEventBus } from '../../services/hrEventBus';
import {
  EmployeeSeparation,
  SeparationSummaryMetrics,
  SeparationStatus,
  SeparationType,
} from '../../types';
import { InitiateSeparationModal } from './components/InitiateSeparationModal';
import { NoticeModificationModal } from './components/NoticeModificationModal';
import { ExitInterviewModal } from './components/ExitInterviewModal';
import { SeparationDetailDrawer } from './components/SeparationDetailDrawer';
import {
  UserMinus,
  Search,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Laptop,
  DollarSign,
  FileText,
  ShieldCheck,
  Building,
  RefreshCw,
  ChevronRight,
  ExternalLink,
  Users,
  Award,
  Layers,
  HelpCircle,
  Calendar,
} from 'lucide-react';

export const OffboardingView: React.FC = () => {
  const { showToast } = useToast();

  // Primary Tab State
  const [activeTab, setActiveTab] = useState<
    'separations' | 'clearances' | 'notice_period' | 'exit_interviews' | 'fnf_readiness' | 'exited_alumni'
  >('separations');

  // Search & Segment Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSegment, setSelectedSegment] = useState<string>('ACTIVE_SEPARATIONS');
  const [statusFilter, setStatusFilter] = useState<SeparationStatus | 'ALL'>('ALL');
  const [typeFilter, setTypeFilter] = useState<SeparationType | 'ALL'>('ALL');
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Data & Metrics
  const [separations, setSeparations] = useState<EmployeeSeparation[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [metrics, setMetrics] = useState<SeparationSummaryMetrics>({
    active_notice_period: 0,
    pending_clearances: 0,
    overdue_clearances: 0,
    upcoming_exits_week: 0,
    upcoming_exits_month: 0,
    fnf_pending: 0,
    ready_for_exit: 0,
    completed_this_month: 0,
  });

  // Modals & Drawer State
  const [isInitiateModalOpen, setIsInitiateModalOpen] = useState<boolean>(false);
  const [selectedSeparation, setSelectedSeparation] = useState<EmployeeSeparation | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState<boolean>(false);
  const [noticeModalSep, setNoticeModalSep] = useState<EmployeeSeparation | null>(null);
  const [exitModalSep, setExitModalSep] = useState<EmployeeSeparation | null>(null);

  // Load Data
  const loadData = () => {
    const res = offboardingService.getSeparations({
      search: searchQuery,
      segment: selectedSegment,
      status: statusFilter,
      separation_type: typeFilter,
      page: currentPage,
      limit: 10,
    });

    setSeparations(res.items);
    setTotalCount(res.total);
    setTotalPages(res.totalPages);

    const m = offboardingService.getSummaryMetrics();
    setMetrics(m);

    // If detail drawer is open, refresh selected item
    if (selectedSeparation) {
      const updated = offboardingService.getSeparationById(selectedSeparation.id);
      setSelectedSeparation(updated);
    }
  };

  useEffect(() => {
    loadData();
  }, [searchQuery, selectedSegment, statusFilter, typeFilter, currentPage]);

  // Subscribe to real-time events
  useEffect(() => {
    const unsub = hrEventBus.subscribe('separation.*', () => loadData());
    const unsubClr = hrEventBus.subscribe('clearance.*', () => loadData());
    const unsubAst = hrEventBus.subscribe('asset.*', () => loadData());
    const unsubEmp = hrEventBus.subscribe('employee.*', () => loadData());

    return () => {
      unsub();
      unsubClr();
      unsubAst();
      unsubEmp();
    };
  }, []);

  const openDrawer = (sep: EmployeeSeparation) => {
    setSelectedSeparation(sep);
    setIsDetailDrawerOpen(true);
  };

  const getStatusBadge = (status: SeparationStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge variant="emerald">COMPLETED</Badge>;
      case 'READY_TO_EXIT':
        return <Badge variant="emerald">READY FOR EXIT</Badge>;
      case 'NOTICE_PERIOD':
        return <Badge variant="amber">NOTICE PERIOD</Badge>;
      case 'CLEARANCE':
        return <Badge variant="info">CLEARANCE</Badge>;
      case 'MANAGER_REVIEW':
        return <Badge variant="purple">MANAGER REVIEW</Badge>;
      case 'HR_REVIEW':
        return <Badge variant="info">HR REVIEW</Badge>;
      case 'FNF_PROCESSING':
        return <Badge variant="purple">F&F PROCESSING</Badge>;
      case 'CANCELLED':
        return <Badge variant="neutral">WITHDRAWN</Badge>;
      case 'REJECTED':
        return <Badge variant="danger">REJECTED</Badge>;
      default:
        return <Badge variant="amber">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={[{ label: 'Core HR' }, { label: 'Offboarding & Separation Engine' }]} />

      {/* Main Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-xl bg-[#07563D]/10 text-[#07563D]">
              <UserMinus className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
                Offboarding & Exit Operations
              </h1>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage resignations, clearances, final settlements, asset custody and employee exits.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="text-xs font-bold"
          >
            Sync Realtime
          </Button>
          <Button
            size="sm"
            onClick={() => setIsInitiateModalOpen(true)}
            leftIcon={<Plus className="w-4 h-4" />}
            className="bg-[#07563D] hover:bg-[#064e37] text-white text-xs font-bold shadow-xs"
          >
            Initiate Separation
          </Button>
        </div>
      </div>

      {/* Real SQL-Backed KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <Card className="p-4 bg-white border border-gray-200/80 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Active Notice</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">{metrics.active_notice_period}</div>
          <span className="text-[10px] text-gray-400 font-medium">Serving notice</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Pending Clr</span>
            <CheckCircle2 className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">{metrics.pending_clearances}</div>
          <span className="text-[10px] text-gray-400 font-medium">Dept signoffs</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Overdue Clr</span>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-2xl font-extrabold text-red-600">{metrics.overdue_clearances}</div>
          <span className="text-[10px] text-red-500 font-medium">Past target LWD</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Exits This Wk</span>
            <Calendar className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">{metrics.upcoming_exits_week}</div>
          <span className="text-[10px] text-gray-400 font-medium">Within 7 days</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">F&F Pending</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">{metrics.fnf_pending}</div>
          <span className="text-[10px] text-gray-400 font-medium">Settlement inputs</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Ready for Exit</span>
            <ShieldCheck className="w-4 h-4 text-[#07563D]" />
          </div>
          <div className="text-2xl font-extrabold text-[#07563D]">{metrics.ready_for_exit}</div>
          <span className="text-[10px] text-emerald-600 font-medium">All cleared</span>
        </Card>

        <Card className="p-4 bg-white border border-gray-200/80 space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Exited Month</span>
            <Users className="w-4 h-4 text-gray-500" />
          </div>
          <div className="text-2xl font-extrabold text-gray-900">{metrics.completed_this_month}</div>
          <span className="text-[10px] text-gray-400 font-medium">Alumni archive</span>
        </Card>
      </div>

      {/* Main Tabs Header */}
      <div className="border-b border-gray-200 flex items-center gap-6 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => {
            setActiveTab('separations');
            setSelectedSegment('ACTIVE_SEPARATIONS');
          }}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'separations'
              ? 'border-[#07563D] text-[#07563D]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <UserMinus className="w-4 h-4" />
          Resignations & Separations
        </button>

        <button
          onClick={() => {
            setActiveTab('clearances');
            setSelectedSegment('CLEARANCE_PENDING');
          }}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'clearances'
              ? 'border-[#07563D] text-[#07563D]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <CheckCircle2 className="w-4 h-4" />
          Clearance Matrix
        </button>

        <button
          onClick={() => {
            setActiveTab('notice_period');
            setSelectedSegment('NOTICE_PERIOD');
          }}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'notice_period'
              ? 'border-[#07563D] text-[#07563D]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Clock className="w-4 h-4" />
          Notice Period Tracker
        </button>

        <button
          onClick={() => {
            setActiveTab('exit_interviews');
            setSelectedSegment('ALL_ACTIVE_SEPARATIONS');
          }}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'exit_interviews'
              ? 'border-[#07563D] text-[#07563D]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          Exit Interviews
        </button>

        <button
          onClick={() => {
            setActiveTab('fnf_readiness');
            setSelectedSegment('FNF_PENDING');
          }}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'fnf_readiness'
              ? 'border-[#07563D] text-[#07563D]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          F&F Readiness
        </button>

        <button
          onClick={() => {
            setActiveTab('exited_alumni');
            setSelectedSegment('EXITED_THIS_MONTH');
          }}
          className={`py-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'exited_alumni'
              ? 'border-[#07563D] text-[#07563D]'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <Users className="w-4 h-4" />
          Exited Alumni & History
        </button>
      </div>

      {/* Quick Segment Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'ACTIVE_SEPARATIONS', label: 'All Active' },
          { id: 'NOTICE_PERIOD', label: 'Notice Period' },
          { id: 'MANAGER_ACTION_REQUIRED', label: 'Manager Review Required' },
          { id: 'CLEARANCE_PENDING', label: 'Clearance Pending' },
          { id: 'ASSET_RETURN_PENDING', label: 'Asset Return Pending' },
          { id: 'FNF_PENDING', label: 'F&F Pending' },
          { id: 'READY_FOR_EXIT', label: 'Ready for Exit' },
          { id: 'DIRECT_SEPARATIONS', label: 'Direct Employees' },
          { id: 'VENDOR_SEPARATIONS', label: 'Vendor Workforce' },
        ].map(seg => (
          <button
            key={seg.id}
            onClick={() => setSelectedSegment(seg.id)}
            className={`px-3 py-1.5 rounded-full font-bold transition-colors whitespace-nowrap ${
              selectedSegment === seg.id
                ? 'bg-[#07563D] text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {seg.label}
          </button>
        ))}
      </div>

      {/* Search & Secondary Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-3.5 rounded-2xl border border-gray-200 shadow-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search employee, ID, department, manager, vendor or reason..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50/50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:ring-2 focus:ring-[#07563D] focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as SeparationType | 'ALL')}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-hidden"
          >
            <option value="ALL">All Types</option>
            <option value="RESIGNATION">Resignation</option>
            <option value="TERMINATION">Termination</option>
            <option value="LAYOFF">Layoff</option>
            <option value="CONTRACT_END">Contract End</option>
            <option value="RETIREMENT">Retirement</option>
          </select>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as SeparationStatus | 'ALL')}
            className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700 focus:outline-hidden"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUBMITTED">Submitted</option>
            <option value="NOTICE_PERIOD">Notice Period</option>
            <option value="MANAGER_REVIEW">Manager Review</option>
            <option value="CLEARANCE">Clearance</option>
            <option value="READY_TO_EXIT">Ready for Exit</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        {separations.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <UserMinus className="w-12 h-12 text-gray-300 mx-auto" />
            <h3 className="text-base font-extrabold text-gray-800">No active separations found</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto">
              There are currently no employee separations matching your active filters. Click below to initiate a
              separation workflow.
            </p>
            <Button
              size="sm"
              onClick={() => setIsInitiateModalOpen(true)}
              className="bg-[#07563D] text-white text-xs font-bold mt-2"
            >
              + Initiate Separation
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/70">
                  <TableHead className="text-xs font-bold text-gray-700">Employee & Code</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700">Department & Manager</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700">Type & Reason</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700">Resignation / LWD</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700">Notice Period</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700">Clearance Progress</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700">F&F Status</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700">Status</TableHead>
                  <TableHead className="text-xs font-bold text-gray-700 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {separations.map(s => {
                  const emp = s.employee;
                  const fullName = emp ? `${emp.first_name} ${emp.last_name}` : 'Employee';
                  const progress = s.progress_percentage || 0;

                  return (
                    <TableRow key={s.id} className="hover:bg-gray-50/60 transition-colors">
                      {/* Employee Info */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-[#07563D]/10 text-[#07563D] font-extrabold text-xs flex items-center justify-center">
                            {fullName.charAt(0)}
                          </div>
                          <div>
                            <span className="font-extrabold text-gray-900 text-xs block">{fullName}</span>
                            <span className="text-[11px] font-mono text-gray-500">
                              {emp?.employee_code || s.employee_id}
                            </span>
                            {s.employment_source === 'VENDOR' && (
                              <Badge variant="purple" className="text-[9px] mt-0.5">
                                Vendor
                              </Badge>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Department & Manager */}
                      <TableCell>
                        <span className="text-xs font-bold text-gray-800 block">
                          {emp?.department_name || 'Engineering'}
                        </span>
                        <span className="text-[11px] text-gray-500">
                          Mgr: {emp?.employment?.reporting_manager_name || 'Dharun Joy'}
                        </span>
                      </TableCell>

                      {/* Type & Reason */}
                      <TableCell>
                        <Badge variant="neutral" className="text-[10px] font-bold">
                          {s.separation_type}
                        </Badge>
                        <span className="text-[11px] text-gray-500 block mt-0.5">{s.reason_code}</span>
                      </TableCell>

                      {/* Resignation / LWD */}
                      <TableCell>
                        <span className="text-xs font-bold text-gray-900 block">
                          LWD: {s.approved_last_working_date || s.expected_last_working_date}
                        </span>
                        <span className="text-[11px] text-gray-500">Notice: {s.resignation_date}</span>
                      </TableCell>

                      {/* Notice Period */}
                      <TableCell>
                        <span className="text-xs font-extrabold text-gray-800">{s.notice_period_days} Days</span>
                        {s.is_early_release && (
                          <Badge variant="info" className="text-[9px] block w-fit mt-0.5">
                            Early Release
                          </Badge>
                        )}
                      </TableCell>

                      {/* Clearance Progress */}
                      <TableCell>
                        <div className="space-y-1 w-28">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-gray-600">{s.cleared_clearances_count || 0}/{s.total_clearances_count || 0} Cleared</span>
                            <span className="text-[#07563D]">{progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-[#07563D] h-full rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* F&F Status */}
                      <TableCell>
                        <Badge
                          variant={
                            s.fnf_readiness?.status === 'APPROVED' || s.fnf_readiness?.status === 'SETTLED'
                              ? 'emerald'
                              : 'amber'
                          }
                          className="text-[10px]"
                        >
                          {s.fnf_readiness?.status || 'PENDING'}
                        </Badge>
                      </TableCell>

                      {/* Separation Status */}
                      <TableCell>{getStatusBadge(s.status)}</TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDrawer(s)}
                          className="text-xs h-7 font-bold hover:bg-[#07563D] hover:text-white"
                        >
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Server-Side Pagination Bar */}
        {totalCount > 10 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
            <span>
              Showing {separations.length} of {totalCount} separations
            </span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="text-xs h-7"
              >
                Previous
              </Button>
              <span className="font-bold text-gray-800">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="text-xs h-7"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals & Drawer */}
      <InitiateSeparationModal
        isOpen={isInitiateModalOpen}
        onClose={() => setIsInitiateModalOpen(false)}
        onSuccess={loadData}
      />

      <NoticeModificationModal
        isOpen={!!noticeModalSep}
        onClose={() => setNoticeModalSep(null)}
        onSuccess={loadData}
        separation={noticeModalSep}
      />

      <ExitInterviewModal
        isOpen={!!exitModalSep}
        onClose={() => setExitModalSep(null)}
        onSuccess={loadData}
        separation={exitModalSep}
      />

      <SeparationDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        separation={selectedSeparation}
        onRefresh={loadData}
        onOpenNoticeModal={sep => setNoticeModalSep(sep)}
        onOpenExitInterviewModal={sep => setExitModalSep(sep)}
      />
    </div>
  );
};
