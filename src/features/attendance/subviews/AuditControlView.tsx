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
import { workLocationService } from '../../../services/location/workLocationService';
import { supabase, isSupabaseEnabled } from '../../../lib/supabase';
import { realtimeChannelManager } from '../../../services/realtime/realtimeChannelManager';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';

export interface AuditControlViewProps {
  currentTab?: string;
  onNavigateSubPath?: (path: string) => void;
  onOpenEmployeeProfile?: (empId: string) => void;
}

export const AuditControlView: React.FC<AuditControlViewProps> = ({
  currentTab = 'calculation-audit',
  onNavigateSubPath,
  onOpenEmployeeProfile,
}) => {
  const { showToast } = useToast();
  const [activeSubTab, setActiveSubTab] = useState<'ledger' | 'corrections' | 'approvals' | 'activity'>(() => {
    if (currentTab === 'attendance-corrections') return 'corrections';
    if (currentTab === 'approval-history') return 'approvals';
    if (currentTab === 'attendance-activity-logs') return 'activity';
    return 'ledger';
  });

  const [employees, setEmployees] = useState<any[]>([]);
  const [dailyRecords, setDailyRecords] = useState<any[]>([]);
  const [locationEvents, setLocationEvents] = useState<any[]>([]);
  const [supabasePunches, setSupabasePunches] = useState<any[]>([]);
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
    if (currentTab === 'attendance-corrections') setActiveSubTab('corrections');
    else if (currentTab === 'approval-history') setActiveSubTab('approvals');
    else if (currentTab === 'attendance-activity-logs') setActiveSubTab('activity');
    else if (currentTab === 'calculation-audit') setActiveSubTab('ledger');
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

  // Build live audit events from actual daily records, location events, and real database punches
  const dynamicAudits = useMemo(() => {
    const list: any[] = [];

    // 1. Immutable live punches directly from Supabase attendance_punches
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
      const isMobile = (p.punch_source || p.device_id || '').toUpperCase().includes('MOBILE') || !!p.latitude;

      let detailStr = `${punchType} registered`;
      if (p.latitude && p.longitude) {
        detailStr += ` at GPS (${Number(p.latitude).toFixed(4)}, ${Number(p.longitude).toFixed(4)})`;
      }
      if (p.is_geofence_verified !== undefined && p.is_geofence_verified !== null) {
        detailStr += p.is_geofence_verified ? ' [Geofence Verified]' : ' [Geofence Warning]';
      }
      if (p.checkout_location_reason) {
        detailStr += ` (Reason: ${p.checkout_location_reason})`;
      }

      list.push({
        id: `aud-live-${p.id}`,
        entity: isMobile ? 'Mobile GPS Attendance Punch' : 'Web / Device Punch',
        actor: isMobile ? (p.device_id || 'Flutter Mobile App') : (p.device_id || 'Web Portal'),
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

    // 2. Daily records reconciliation audit
    dailyRecords.forEach((rec, idx) => {
      const checkInTime = rec.first_check_in || rec.in_time;
      if (checkInTime) {
        const isMobile = (rec.source || '').toUpperCase().includes('MOBILE');
        list.push({
          id: `aud-ledger-${rec.id || idx}`,
          entity: 'Daily Attendance Ledger Record',
          actor: 'PostgreSQL Calculation Engine',
          event: (rec.status || 'PRESENT').toUpperCase(),
          target: `${rec.employee_name || 'Staff'} (${rec.employee_code || rec.employee_id || 'WF-EMP'})`,
          details: `Computed ${rec.net_working_minutes || 0}m net work time, ${rec.late_minutes || 0}m late, ${rec.overtime_minutes || 0}m OT from ${rec.source || 'Unified Portal'}.`,
          timestamp: rec.date ? `${rec.date} ${checkInTime}` : 'Today',
          rawTime: rec.created_at ? new Date(rec.created_at).getTime() : 0,
          sourceType: isMobile ? 'MOBILE' : 'WEB',
        });
      }
    });

    // 3. Location Events
    locationEvents.forEach((evt, idx) => {
      list.push({
        id: `aud-loc-${evt.id || idx}`,
        entity: 'GPS Geofence Policy Evaluation',
        actor: 'Geofence Policy Guard',
        event: evt.geofence_status === 'INSIDE' ? 'VERIFIED' : 'VIOLATION_FLAGGED',
        target: `${evt.employee_name || 'Staff'} (${evt.employee_code || 'WF-EMP'})`,
        details: `${evt.event_type} evaluated at ${evt.distance_meters}m from center (Accuracy: ±${evt.accuracy_meters}m).`,
        timestamp: new Date(evt.device_timestamp).toLocaleString('en-IN', {
          timeZone: 'Asia/Kolkata',
          dateStyle: 'medium',
          timeStyle: 'medium',
        }),
        rawTime: new Date(evt.device_timestamp).getTime(),
        sourceType: 'MOBILE',
      });
    });

    // Sort newest transactions first
    list.sort((a, b) => b.rawTime - a.rawTime);

    // Apply channel filter & search query
    return list.filter((item) => {
      if (channelFilter !== 'ALL' && item.sourceType !== channelFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchTarget = item.target.toLowerCase().includes(q);
        const matchEntity = item.entity.toLowerCase().includes(q);
        const matchEvent = item.event.toLowerCase().includes(q);
        const matchDetails = item.details.toLowerCase().includes(q);
        const matchActor = item.actor.toLowerCase().includes(q);
        return matchTarget || matchEntity || matchEvent || matchDetails || matchActor;
      }
      return true;
    });
  }, [supabasePunches, dailyRecords, locationEvents, employees, channelFilter, searchQuery]);

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
            Punch Corrections
          </button>
          <button
            onClick={() => handleTabSwitch('approvals')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'approvals' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <History className="w-3.5 h-3.5" />
            Approval History
          </button>
          <button
            onClick={() => handleTabSwitch('activity')}
            className={cn(
              'px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer',
              activeSubTab === 'activity' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <Terminal className="w-3.5 h-3.5" />
            Geofence Events ({locationEvents.length})
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
              placeholder="Search by employee, punch, or device..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
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

      {/* 3. Live Transaction Table */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 bg-gray-50/80 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
              Live Production Transaction Feed
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
      </div>
    </div>
  );
};
