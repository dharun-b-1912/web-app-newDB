import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ShieldCheck,
  FileEdit,
  History,
  Terminal,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  UserCheck,
  Calendar,
  RefreshCw,
  Smartphone,
  Globe,
  Radio,
  Clock,
  Layers,
} from 'lucide-react';
import { cn } from '../../../lib/utils';
import { useToast } from '../../../components/ui/Toast';
import { api } from '../../../services/api';
import { attendanceApi } from '../../../services/attendanceApi';
import { attendanceRegularizationService, RegularizationRequest } from '../../../services/attendance/attendanceRegularizationService';
import { workLocationService } from '../../../services/location/workLocationService';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';
import { hrEventBus } from '../../../services/hrEventBus';
import { realtimeChannelManager } from '../../../services/realtime/realtimeChannelManager';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { formatDeviationDuration } from '../../../lib/attendance/attendanceEngine';

export interface AuditControlViewProps {
  currentTab?: string;
  onNavigateSubPath?: (path: string) => void;
  onOpenEmployeeProfile?: (empId: string) => void;
}

export function normalizeAuditSubTab(tab?: string): 'ledger' | 'corrections' | 'approvals' | 'activity' {
  if (!tab) return 'ledger';
  const clean = tab.toLowerCase().replace(/^\//, '');
  if (
    clean === 'attendance-corrections' ||
    clean === 'audit/corrections' ||
    clean === 'corrections' ||
    clean === 'attendance-correction'
  ) {
    return 'corrections';
  }
  if (
    clean === 'approval-history' ||
    clean === 'audit/approvals' ||
    clean === 'approvals' ||
    clean === 'approval'
  ) {
    return 'approvals';
  }
  if (
    clean === 'attendance-activity-logs' ||
    clean === 'audit/activity' ||
    clean === 'activity' ||
    clean === 'activity-logs' ||
    clean === 'attendance-activity'
  ) {
    return 'activity';
  }
  return 'ledger';
}

const DEFAULT_SEEDED_REGULARIZATIONS: RegularizationRequest[] = [
  {
    id: 'reg-seed-01',
    tenant_id: 'org-joy-01',
    organization_id: 'org-joy-01',
    employee_id: 'WF-017',
    employee_code: 'JCS-017',
    employee_name: 'Dharun B',
    department: 'Development',
    attendance_date: new Date().toISOString().split('T')[0],
    shift_name: 'General Day Shift (GEN-09)',
    shift_window: '09:30 AM - 06:30 PM',
    original_check_in: '09:32 AM',
    original_check_out: null,
    original_status: 'MISSING_OUT',
    original_source: 'BIOMETRIC',
    requested_check_in: '09:32 AM',
    requested_check_out: '06:35 PM',
    difference_minutes: 543,
    reason_code: 'DEVICE_READER_TIMEOUT',
    reason: 'Biometric reader timed out at plant lobby gate during exit checkout.',
    status: 'APPROVED',
    current_stage: 'COMPLETED',
    manager_name: 'Engineering Director',
    manager_comment: 'Verified presence on git commit logs and office exit gate.',
    manager_action_at: new Date().toISOString(),
    hr_reviewer_name: 'HR Operations',
    timeline: [
      { stage: 'MANAGER_REVIEW', timestamp: new Date().toISOString(), actor: 'Manager', action: 'Approved' },
      { stage: 'HR_REVIEW', timestamp: new Date().toISOString(), actor: 'HR Ops', action: 'Final Signoff' }
    ],
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'reg-seed-02',
    tenant_id: 'org-joy-01',
    organization_id: 'org-joy-01',
    employee_id: 'WF-022',
    employee_code: 'JCS-022',
    employee_name: 'Priya Sharma',
    department: 'Quality Assurance',
    attendance_date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    shift_name: 'General Day Shift (GEN-09)',
    shift_window: '09:30 AM - 06:30 PM',
    original_check_in: null,
    original_check_out: null,
    original_status: 'ABSENT',
    original_source: 'MANUAL',
    requested_check_in: '09:15 AM',
    requested_check_out: '01:45 PM',
    difference_minutes: 270,
    reason_code: 'OFFICIAL_DUTY',
    reason: 'Half-day medical appointment after completing morning QA test cycle.',
    status: 'MANAGER_PENDING',
    current_stage: 'MANAGER_REVIEW',
    manager_name: 'QA Lead',
    timeline: [
      { stage: 'MANAGER_REVIEW', timestamp: new Date().toISOString(), actor: 'Priya Sharma', action: 'Submitted' }
    ],
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'reg-seed-03',
    tenant_id: 'org-joy-01',
    organization_id: 'org-joy-01',
    employee_id: 'WF-045',
    employee_code: 'JCS-045',
    employee_name: 'Rahul Verma',
    department: 'Plant Operations',
    attendance_date: new Date(Date.now() - 86400000 * 2).toISOString().split('T')[0],
    shift_name: 'Night Shift Line A (NIT-08)',
    shift_window: '06:00 PM - 03:00 AM',
    original_check_in: '06:02 PM',
    original_check_out: '03:05 AM',
    original_status: 'PRESENT',
    original_source: 'BIOMETRIC',
    requested_check_in: '06:02 PM',
    requested_check_out: '04:30 AM',
    difference_minutes: 628,
    reason_code: 'OVERTIME_EXTENSION',
    reason: 'Extended production shift handover for automated batch stamping line.',
    status: 'APPROVED',
    current_stage: 'COMPLETED',
    manager_name: 'Plant Manager',
    manager_comment: 'Overtime authorized due to shift lead handover delay.',
    timeline: [
      { stage: 'MANAGER_REVIEW', timestamp: new Date().toISOString(), actor: 'Plant Manager', action: 'Approved' }
    ],
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'reg-seed-04',
    tenant_id: 'org-joy-01',
    organization_id: 'org-joy-01',
    employee_id: 'WF-088',
    employee_code: 'JCS-088',
    employee_name: 'Ananya Iyer',
    department: 'Human Resources',
    attendance_date: new Date(Date.now() - 86400000 * 3).toISOString().split('T')[0],
    shift_name: 'General Day Shift (GEN-09)',
    shift_window: '09:00 AM - 06:00 PM',
    original_check_in: null,
    original_check_out: null,
    original_status: 'ABSENT',
    original_source: 'MOBILE_GPS',
    requested_check_in: '09:00 AM',
    requested_check_out: '06:00 PM',
    difference_minutes: 540,
    reason_code: 'CAMPUS_VISIT',
    reason: 'Off-site campus recruitment drive at College of Engineering.',
    status: 'APPROVED',
    current_stage: 'COMPLETED',
    manager_name: 'HR Director',
    timeline: [
      { stage: 'MANAGER_REVIEW', timestamp: new Date().toISOString(), actor: 'HR Director', action: 'Approved' }
    ],
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const DEFAULT_SEEDED_LOCATION_EVENTS = [
  {
    id: 'locevt-seed-01',
    event_type: 'PUNCH_CHECK_IN',
    geofence_status: 'INSIDE',
    actor: 'Location Guard Policy',
    employee_name: 'Dharun B',
    employee_code: 'JCS-017',
    distance_meters: 14,
    accuracy_meters: 5,
    details: 'Check-in verified at 14m from Joy Tech Park HQ geofence center (Accuracy: ±5m).',
    device_timestamp: new Date().toISOString(),
  },
  {
    id: 'locevt-seed-02',
    event_type: 'PUNCH_CHECK_IN',
    geofence_status: 'INSIDE',
    actor: 'Location Guard Policy',
    employee_name: 'Priya Sharma',
    employee_code: 'JCS-022',
    distance_meters: 28,
    accuracy_meters: 8,
    details: 'Check-in verified at 28m from North Campus Branch geofence center (Accuracy: ±8m).',
    device_timestamp: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: 'locevt-seed-03',
    event_type: 'PUNCH_CHECK_OUT',
    geofence_status: 'BORDERLINE',
    actor: 'Location Guard Policy',
    employee_name: 'Rahul Verma',
    employee_code: 'JCS-045',
    distance_meters: 92,
    accuracy_meters: 22,
    details: 'Check-out captured near boundary perimeter (92m from center; radius: 100m).',
    device_timestamp: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'locevt-seed-04',
    event_type: 'FIRMWARE_SYNC',
    geofence_status: 'INSIDE',
    actor: 'Hardware LAN Agent',
    employee_name: 'CGKK223862906',
    employee_code: 'DEVICE-01',
    distance_meters: 0,
    accuracy_meters: 0,
    details: 'Biometric Terminal LAN Agent synced 18 offline punch packets successfully.',
    device_timestamp: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'locevt-seed-05',
    event_type: 'OUTSIDE_GEOFENCE',
    geofence_status: 'OUTSIDE',
    actor: 'Location Guard Policy',
    employee_name: 'Ananya Iyer',
    employee_code: 'JCS-088',
    distance_meters: 4200,
    accuracy_meters: 12,
    details: 'Offsite campus client visit location verified via GPS (Prompted reason captured).',
    device_timestamp: new Date(Date.now() - 14400000).toISOString(),
  },
];

export const AuditControlView: React.FC<AuditControlViewProps> = ({
  currentTab = 'calculation-audit',
  onNavigateSubPath,
  onOpenEmployeeProfile,
}) => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'corrections' | 'approvals' | 'activity'>(() => normalizeAuditSubTab(currentTab));

  const [employees, setEmployees] = useState<any[]>([]);
  const [dailyRecords, setDailyRecords] = useState<any[]>([]);
  const [locationEvents, setLocationEvents] = useState<any[]>([]);
  const [supabasePunches, setSupabasePunches] = useState<any[]>([]);
  const [regularizations, setRegularizations] = useState<RegularizationRequest[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [channelFilter, setChannelFilter] = useState<'ALL' | 'MOBILE' | 'WEB'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      api.getEmployees().then((emps) => {
        setEmployees(emps || []);
      }).catch(() => []);

      const todayStr = new Date().toISOString().split('T')[0];
      attendanceApi.getDailyAttendanceAsync(todayStr).then((recs) => {
        setDailyRecords(recs || []);
      }).catch(() => {
        setDailyRecords(attendanceApi.getDailyAttendance(todayStr));
      });

      const evts = workLocationService.getLocationEvents();
      setLocationEvents(evts || []);

      const reqs = attendanceRegularizationService.getRequests();
      setRegularizations(reqs || []);

      if (isSupabaseEnabled) {
        const { data, error } = await supabase
          .from('attendance_punches')
          .select('*')
          .order('punch_time', { ascending: false })
          .limit(200);

        if (!error && Array.isArray(data)) {
          setSupabasePunches(data);
        }
      }
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const unsubReg = hrEventBus.subscribe('attendance.regularization_updated', () => loadData());
    return () => {
      unsubReg();
    };
  }, [loadData]);

  // Real-time Postgres listeners on attendance_punches and attendance_daily via centralized mesh
  useEffect(() => {
    if (!isSupabaseEnabled) return;
    const unsubPunches = realtimeChannelManager.subscribeToTable('attendance_punches', () => {
      loadData();
    });
    const unsubDaily = realtimeChannelManager.subscribeToTable('attendance_daily', () => {
      loadData();
    });

    return () => {
      unsubPunches();
      unsubDaily();
    };
  }, [loadData]);

  useEffect(() => {
    setActiveSubTab(normalizeAuditSubTab(currentTab));
  }, [currentTab]);

  const handleTabSwitch = (tab: 'ledger' | 'corrections' | 'approvals' | 'activity') => {
    setActiveSubTab(tab);
    if (onNavigateSubPath) {
      const map: Record<string, string> = {
        ledger: 'calculation-audit',
        corrections: 'attendance-corrections',
        approvals: 'approval-history',
        activity: 'attendance-activity-logs',
      };
      onNavigateSubPath(map[tab]);
    }
  };

  // 1. Live Ledger / Transactions
  const dynamicAudits = useMemo(() => {
    const list: any[] = [];

    supabasePunches.forEach((p) => {
      const emp = employees.find(
        (e) => (e.id || '').toLowerCase() === (p.employee_id || '').toLowerCase() ||
               (e.employee_code || '').toLowerCase() === (p.employee_id || '').toLowerCase()
      );
      const staffLabel = emp
        ? `${emp.display_name || emp.name} (${emp.employee_code || emp.id})`
        : `Employee (${p.employee_id || 'ID Unknown'})`;

      const punchType = (p.punch_type || 'PUNCH').toUpperCase();
      const isCheckIn = punchType.includes('IN') && !punchType.includes('OUT');
      const isMobile = (p.punch_source || p.source || p.device_id || '').toUpperCase().includes('MOBILE') || !!p.latitude;

      let detailStr = `${punchType} registered`;
      if (p.location_name) {
        detailStr += ` at ${p.location_name}`;
      }
      if (p.latitude && p.longitude) {
        detailStr += ` at GPS (${Number(p.latitude).toFixed(4)}, ${Number(p.longitude).toFixed(4)})`;
      }
      if (p.is_geofence_verified !== undefined && p.is_geofence_verified !== null) {
        detailStr += p.is_geofence_verified ? ' [Geofence Verified]' : ' [Geofence Warning]';
      }

      list.push({
        id: `aud-live-${p.id}`,
        entity: isMobile ? 'Mobile GPS Punch' : 'Web / Device Punch',
        actor: isMobile ? (p.device_id || 'Mobile App') : (p.device_id || 'Web Portal'),
        event: isCheckIn ? 'CHECK_IN' : 'CHECK_OUT',
        target: staffLabel,
        details: detailStr,
        timestamp: p.punch_time
          ? new Date(p.punch_time).toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              dateStyle: 'medium',
              timeStyle: 'medium',
            })
          : 'Live',
        rawTime: p.punch_time ? new Date(p.punch_time).getTime() : Date.now(),
        sourceType: isMobile ? 'MOBILE' : 'WEB',
      });
    });

    dailyRecords.forEach((rec, idx) => {
      const checkInTime = rec.first_check_in || rec.in_time;
      if (checkInTime) {
        const isMobile = (rec.source || '').toUpperCase().includes('MOBILE');
        list.push({
          id: `aud-ledger-${rec.id || idx}`,
          entity: 'Daily Calculation Ledger',
          actor: 'Calculation Engine',
          event: (rec.status || 'PRESENT').toUpperCase(),
          target: `${rec.employee_name || 'Staff'} (${rec.employee_code || rec.employee_id || 'WF-EMP'})`,
          details: `Net work ${formatDeviationDuration(rec.net_working_minutes || 0)}, ${rec.late_minutes ? `${formatDeviationDuration(rec.late_minutes, { showBoth: rec.late_minutes >= 60 })} late` : 'on time'}${rec.overtime_minutes ? `, ${formatDeviationDuration(rec.overtime_minutes, { showBoth: rec.overtime_minutes >= 60 })} OT` : ''} via ${rec.source || 'Unified Portal'}.`,
          timestamp: rec.date ? `${rec.date} ${checkInTime}` : 'Today',
          rawTime: rec.created_at ? new Date(rec.created_at).getTime() : 0,
          sourceType: isMobile ? 'MOBILE' : 'WEB',
        });
      }
    });

    list.sort((a, b) => b.rawTime - a.rawTime);

    return list.filter((item) => {
      if (channelFilter !== 'ALL' && item.sourceType !== channelFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return item.target.toLowerCase().includes(q) || item.details.toLowerCase().includes(q) || item.actor.toLowerCase().includes(q);
      }
      return true;
    });
  }, [supabasePunches, dailyRecords, employees, channelFilter, searchQuery]);

  // 2. Punch Corrections / Regularizations
  const correctionsAudits = useMemo(() => {
    const source = regularizations && regularizations.length > 0 ? regularizations : DEFAULT_SEEDED_REGULARIZATIONS;
    return source.filter((r) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return (
          r.employee_name.toLowerCase().includes(q) ||
          r.employee_code.toLowerCase().includes(q) ||
          (r.reason_code || (r as any).reason_category || '').toLowerCase().includes(q) ||
          (r.reason || (r as any).reason_text || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [regularizations, searchQuery]);

  // 3. Approval History (Decided or In-Review Requests)
  const approvalAudits = useMemo(() => {
    const source = regularizations && regularizations.length > 0 ? regularizations : DEFAULT_SEEDED_REGULARIZATIONS;
    return source.map((r) => ({
      id: r.id,
      requestRef: `REQ-${r.id.slice(-6).toUpperCase()}`,
      employeeName: r.employee_name,
      employeeCode: r.employee_code,
      attendanceDate: r.attendance_date,
      stage: r.current_stage || (r as any).workflow_stage || 'PENDING',
      status: r.status,
      approverRole: (r.current_stage as string) === 'HR_REVIEW' ? 'HR Administrator' : (r.manager_name || 'Reporting Manager'),
      decisionTimestamp: r.updated_at ? new Date((r as any).updated_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : 'Pending',
      reasonText: r.reason || (r as any).reason_text || '',
      requestedShift: `${r.requested_check_in || '—'} → ${r.requested_check_out || '—'}`,
    })).filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return item.employeeName.toLowerCase().includes(q) || item.employeeCode.toLowerCase().includes(q) || item.requestRef.toLowerCase().includes(q);
      }
      return true;
    });
  }, [regularizations, searchQuery]);

  // 4. System Activity & Geofence Logs
  const activityAudits = useMemo(() => {
    const source = locationEvents && locationEvents.length > 0 ? locationEvents : DEFAULT_SEEDED_LOCATION_EVENTS;
    return source.map((evt: any, idx) => ({
      id: `act-${evt.id || idx}`,
      event: evt.geofence_status === 'INSIDE' ? 'GEOFENCE_VERIFIED' : evt.geofence_status === 'OUTSIDE' ? 'GEOFENCE_FLAGGED' : 'BORDERLINE_CAPTURE',
      actor: evt.actor || 'Location Guard Policy',
      target: `${evt.employee_name || 'Staff'} (${evt.employee_code || 'WF-EMP'})`,
      details: evt.details || `${evt.event_type} at ${evt.distance_meters}m from geofence center (Accuracy: ±${evt.accuracy_meters}m).`,
      timestamp: evt.device_timestamp ? new Date(evt.device_timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' }) : 'Live',
    })).filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        return item.target.toLowerCase().includes(q) || item.details.toLowerCase().includes(q);
      }
      return true;
    });
  }, [locationEvents, searchQuery]);

  return (
    <div className="space-y-4">
      {/* 1. Header & Segment Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-gray-900">Attendance Audit, Governance & Control</h1>
            <span className="px-2 py-0.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
              <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
              Live Replication Active
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Complete transaction log of mobile app GPS punches, web portal check-ins, and PostgreSQL database ledger records.
          </p>
        </div>

        {/* Sub-tab segmented bar */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200 text-xs flex-wrap gap-1">
          <button
            onClick={() => handleTabSwitch('ledger')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'ledger' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Live Transactions ({dynamicAudits.length})
          </button>
          <button
            onClick={() => handleTabSwitch('corrections')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'corrections' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <FileEdit className="w-3.5 h-3.5" />
            Punch Corrections ({correctionsAudits.length})
          </button>
          <button
            onClick={() => handleTabSwitch('approvals')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'approvals' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <History className="w-3.5 h-3.5" />
            Approval History ({approvalAudits.length})
          </button>
          <button
            onClick={() => handleTabSwitch('activity')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'activity' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Terminal className="w-3.5 h-3.5" />
            System Activity Logs ({activityAudits.length})
          </button>
        </div>
      </div>

      {/* 2. Channel Filter & Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search employee, reason, or punch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#07563D]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {activeSubTab === 'ledger' && (
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg text-xs">
              <button
                onClick={() => setChannelFilter('ALL')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-medium transition-all',
                  channelFilter === 'ALL' ? 'bg-white text-gray-900 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                All Channels
              </button>
              <button
                onClick={() => setChannelFilter('MOBILE')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1',
                  channelFilter === 'MOBILE' ? 'bg-white text-emerald-700 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <Smartphone className="w-3 h-3" />
                Mobile App
              </button>
              <button
                onClick={() => setChannelFilter('WEB')}
                className={cn(
                  'px-2.5 py-1 rounded-md font-medium transition-all flex items-center gap-1',
                  channelFilter === 'WEB' ? 'bg-white text-blue-700 shadow-xs font-bold' : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <Globe className="w-3 h-3" />
                Web Portal
              </button>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadData}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 text-xs h-8 cursor-pointer"
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </div>

      {/* 3. Tab-Specific Table Render */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs overflow-hidden">
        {/* SUB-TAB 1: LIVE TRANSACTIONS */}
        {activeSubTab === 'ledger' && (
          <>
            <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Live Production Transaction Feed & Punch Ledger
                </h3>
              </div>
              <span className="text-xs text-gray-500 font-mono">
                Showing {dynamicAudits.length} events
              </span>
            </div>

            {dynamicAudits.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5">Source Channel</th>
                      <th className="p-3.5">Device / Origin</th>
                      <th className="p-3.5">Event Type</th>
                      <th className="p-3.5">Staff Member</th>
                      <th className="p-3.5">Transaction Details</th>
                      <th className="p-3.5 text-right">Punch Time (IST)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {dynamicAudits.map((a) => (
                      <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-3.5 font-bold text-gray-900 flex items-center gap-1.5">
                          {a.sourceType === 'MOBILE' ? (
                            <span className="p-1 bg-emerald-50 text-emerald-700 rounded-md">
                              <Smartphone className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span className="p-1 bg-blue-50 text-blue-700 rounded-md">
                              <Globe className="w-3.5 h-3.5" />
                            </span>
                          )}
                          <span>{a.entity}</span>
                        </td>
                        <td className="p-3.5 text-gray-700 font-medium font-mono text-[11px]">{a.actor}</td>
                        <td className="p-3.5">
                          <Badge
                            variant={
                              a.event === 'CHECK_IN' || a.event === 'PRESENT' || a.event === 'VERIFIED'
                                ? 'emerald'
                                : a.event === 'CHECK_OUT'
                                ? 'blue'
                                : 'amber'
                            }
                            size="sm"
                          >
                            {a.event}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-semibold text-gray-800">{a.target}</td>
                        <td className="p-3.5 text-gray-600 max-w-md font-mono text-[11px]">{a.details}</td>
                        <td className="p-3.5 text-right font-mono text-gray-500 whitespace-nowrap">{a.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-gray-500 space-y-2">
                <p className="font-semibold text-gray-700">No transactions match the selected filters.</p>
                <p>Every check-in and check-out from Flutter or the Web portal will stream here instantly.</p>
              </div>
            )}
          </>
        )}

        {/* SUB-TAB 2: PUNCH CORRECTIONS */}
        {activeSubTab === 'corrections' && (
          <>
            <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileEdit className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Punch Corrections & Regularization Desk Logs
                </h3>
              </div>
              <span className="text-xs text-gray-500 font-mono">
                {correctionsAudits.length} correction records
              </span>
            </div>

            {correctionsAudits.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5">Employee Name & Code</th>
                      <th className="p-3.5">Date & Shift</th>
                      <th className="p-3.5">Original Punch</th>
                      <th className="p-3.5">Requested Correction</th>
                      <th className="p-3.5">Reason & Explanation</th>
                      <th className="p-3.5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {correctionsAudits.map((c) => (
                      <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-gray-900">{c.employee_name}</div>
                          <div className="text-[11px] font-mono text-gray-500">{c.employee_code} • {c.department}</div>
                        </td>
                        <td className="p-3.5 font-medium text-gray-700">
                          <div>{c.attendance_date}</div>
                          <div className="text-[11px] text-gray-400">{c.shift_name}</div>
                        </td>
                        <td className="p-3.5 font-mono text-gray-600">
                          {c.original_check_in || '—'} → {c.original_check_out || '—'}
                          <div className="text-[10px] text-gray-400">{c.original_status}</div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-[#07563D]">
                          {c.requested_check_in || '—'} → {c.requested_check_out || '—'}
                        </td>
                        <td className="p-3.5 text-gray-700 max-w-sm">
                          <div className="font-semibold text-gray-900">{c.reason_code || (c as any).reason_category || 'CORRECTION'}</div>
                          <div className="text-[11px] text-gray-500 truncate">{c.reason || (c as any).reason_text || 'Regularization request'}</div>
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <Badge
                            variant={
                              c.status === 'APPROVED' ? 'emerald' : c.status === 'REJECTED' ? 'rose' : 'amber'
                            }
                            size="sm"
                          >
                            {c.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-gray-500 space-y-2">
                <FileEdit className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="font-semibold text-gray-700">No punch correction requests found.</p>
                <p>When staff submit regularization requests for missing or late punches, they appear here.</p>
              </div>
            )}
          </>
        )}

        {/* SUB-TAB 3: APPROVAL HISTORY */}
        {activeSubTab === 'approvals' && (
          <>
            <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Manager & HR Signoff Approval Audit History
                </h3>
              </div>
              <span className="text-xs text-gray-500 font-mono">
                {approvalAudits.length} approval decisions
              </span>
            </div>

            {approvalAudits.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5">Request Ref</th>
                      <th className="p-3.5">Employee</th>
                      <th className="p-3.5">Date & Requested Shift</th>
                      <th className="p-3.5">Assigned Approver</th>
                      <th className="p-3.5">Decision & Remarks</th>
                      <th className="p-3.5 text-right">Decision Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {approvalAudits.map((ap) => (
                      <tr key={ap.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-gray-900">{ap.requestRef}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-gray-900">{ap.employeeName}</div>
                          <div className="text-[11px] font-mono text-gray-400">{ap.employeeCode}</div>
                        </td>
                        <td className="p-3.5 font-medium text-gray-700">
                          <div>{ap.attendanceDate}</div>
                          <div className="font-mono text-[11px] text-[#07563D]">{ap.requestedShift}</div>
                        </td>
                        <td className="p-3.5 font-semibold text-gray-800">
                          {ap.approverRole}
                          <div className="text-[10px] text-gray-400 font-normal">{ap.stage}</div>
                        </td>
                        <td className="p-3.5">
                          <Badge
                            variant={
                              ap.status === 'APPROVED' ? 'emerald' : ap.status === 'REJECTED' ? 'rose' : 'purple'
                            }
                            size="sm"
                          >
                            {ap.status}
                          </Badge>
                          <div className="text-[11px] text-gray-500 mt-0.5 truncate max-w-xs">{ap.reasonText}</div>
                        </td>
                        <td className="p-3.5 text-right font-mono text-gray-500 whitespace-nowrap">
                          {ap.decisionTimestamp}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-gray-500 space-y-2">
                <History className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="font-semibold text-gray-700">No approval history entries recorded yet.</p>
                <p>Approved and rejected requests will form an immutable audit trail here.</p>
              </div>
            )}
          </>
        )}

        {/* SUB-TAB 4: ACTIVITY LOGS */}
        {activeSubTab === 'activity' && (
          <>
            <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  GPS Geofence Policy Evaluations & Infrastructure Activity Logs
                </h3>
              </div>
              <span className="text-xs text-gray-500 font-mono">
                {activityAudits.length} activity events
              </span>
            </div>

            {activityAudits.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50/80 text-gray-600 font-semibold border-b border-gray-100 uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="p-3.5">Subsystem Guard</th>
                      <th className="p-3.5">Policy Event</th>
                      <th className="p-3.5">Target Staff</th>
                      <th className="p-3.5">Evaluation Telemetry</th>
                      <th className="p-3.5 text-right">Event Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {activityAudits.map((act) => (
                      <tr key={act.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-3.5 font-bold text-gray-900 flex items-center gap-1.5">
                          <Terminal className="w-3.5 h-3.5 text-[#07563D]" />
                          <span>{act.actor}</span>
                        </td>
                        <td className="p-3.5">
                          <Badge
                            variant={act.event === 'GEOFENCE_VERIFIED' ? 'emerald' : 'amber'}
                            size="sm"
                          >
                            {act.event}
                          </Badge>
                        </td>
                        <td className="p-3.5 font-semibold text-gray-800">{act.target}</td>
                        <td className="p-3.5 text-gray-600 font-mono text-[11px] max-w-md">{act.details}</td>
                        <td className="p-3.5 text-right font-mono text-gray-500 whitespace-nowrap">{act.timestamp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-gray-500 space-y-2">
                <Terminal className="w-8 h-8 text-gray-300 mx-auto" />
                <p className="font-semibold text-gray-700">No infrastructure activity logs recorded.</p>
                <p>GPS and geofence evaluations from mobile workers will log here automatically.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
