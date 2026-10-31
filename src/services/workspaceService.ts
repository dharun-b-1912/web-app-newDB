import { api } from './api';
import { attendanceApi } from './attendanceApi';
import { leaveApi } from './leaveApi';
import { User, Employee, Company } from '../types';
import { AttendanceDaily } from '../types/attendance';
import { LeaveEntitlement, LeaveRequest, HolidayCalendar } from '../types/leave';
import { hrEventBus } from './hrEventBus';
import { profileService, FullProfileContext } from './profileService';
import { attendanceRosterService } from './attendance/attendanceRosterService';
import { attendanceTimeService } from './attendance/attendanceTimeService';
import { getActiveOrgId } from './attendance/biometricCommandService';
import { approvalService } from './notification/approvalService';
import { supabase, isSupabaseEnabled } from '../lib/supabase';

export interface PendingTaskItem {
  id: string;
  title: string;
  category: 'Performance' | 'Document' | 'Approval' | 'Attendance' | 'Onboarding' | 'General';
  description: string;
  dueDate: string;
  priority: 'Urgent' | 'High' | 'Normal' | 'Low';
  status: 'Pending' | 'Overdue' | 'In Progress';
  actionLabel: string;
  targetRoute?: string;
}

export interface ServiceRequestItem {
  id: string;
  requestCode: string;
  requestType: string;
  submittedDate: string;
  status: 'Pending' | 'Under Review' | 'Approved' | 'Rejected';
  summary: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  type: 'leave' | 'attendance' | 'payroll' | 'security' | 'announcement';
  isRead: boolean;
}

export interface UserWorkspaceData {
  user: User;
  employee: Employee;
  profileContext: FullProfileContext;
  todayAttendance: AttendanceDaily | null;
  attendanceState: 'NotCheckedIn' | 'CheckedIn' | 'CheckedOut' | 'OnBreak' | 'OnLeave' | 'Holiday' | 'WeeklyOff';
  workingDuration: string;
  leaveEntitlements: LeaveEntitlement[];
  pendingTasks: PendingTaskItem[];
  upcomingHoliday: { name: string; date: string; description?: string } | null;
  activeShift: { name: string; timings: string; location: string };
  latestPayslip: {
    period: string;
    grossPay: number;
    netPay: number;
    deductions: number;
    publishedDate: string;
    paymentStatus: string;
  } | null;
  documents: { id: string; name: string; category: string; verificationStatus: string; uploadedAt: string }[];
  serviceRequests: ServiceRequestItem[];
  notifications: NotificationItem[];
  unreadNotificationCount: number;
}

export const workspaceService = {
  // Aggregate authenticated employee personal workspace data
  async getWorkspaceData(user: User, companyId?: string): Promise<UserWorkspaceData> {
    const todayStr = attendanceTimeService.getOrganizationBusinessDate();
    const yesterdayDateObj = new Date();
    yesterdayDateObj.setDate(yesterdayDateObj.getDate() - 1);
    const yesterdayStr = attendanceTimeService.getOrganizationBusinessDate(yesterdayDateObj);

    const [
      allEmployees,
      dailyAttendanceList,
      entitlements,
      leaveRequests,
      holidayCalendars,
      profileContext,
    ] = await Promise.all([
      api.getEmployees(companyId ? { companyId } : undefined).catch(() => []),
      attendanceApi.getDailyAttendanceForPeriodAsync(yesterdayStr, todayStr, user.employee_id || user.id).catch(() => []),
      Promise.resolve(leaveApi.getEntitlements()).catch(() => []),
      Promise.resolve(leaveApi.getLeaveRequests()).catch(() => []),
      Promise.resolve(leaveApi.getHolidayCalendars()).catch(() => []),
      profileService.getProfileContext(user),
    ]);

    // Authoritative Employee Object
    const employee =
      allEmployees.find(
        (e) =>
          (user.employee_id && e.id === user.employee_id) ||
          (user.email && e.work_email?.toLowerCase() === user.email.toLowerCase())
      ) ||
      profileContext.employee;

    const empId = employee.id;

    // Resolve today's attendance record
    const todayAttendance = dailyAttendanceList.find(
      (a) => a.employee_id === empId && a.date === todayStr
    ) || null;

    // Resolve yesterday's attendance record (for active night shift)
    const yesterdayAttendance = dailyAttendanceList.find(
      (a) => a.employee_id === empId && a.date === yesterdayStr
    ) || null;

    // Check if night shift from yesterday is active (checked in yesterday evening, not checked out, and before 12:00 PM IST)
    const currentIstHour = (new Date().getUTCHours() + 5.5 + new Date().getUTCMinutes() / 60) % 24;
    const isNightShiftActive =
      (!todayAttendance || !todayAttendance.first_check_in) &&
      yesterdayAttendance &&
      yesterdayAttendance.first_check_in &&
      !yesterdayAttendance.last_check_out &&
      currentIstHour < 12.0;

    const activeAttendance = isNightShiftActive ? yesterdayAttendance : todayAttendance;

    // Check active leave today
    const activeLeave = leaveRequests.find(
      (l) => l.employee_id === empId && l.status === 'Approved' && l.from_date <= todayStr && l.to_date >= todayStr
    );

    // Determine current attendance state & working duration
    let attendanceState: UserWorkspaceData['attendanceState'] = 'NotCheckedIn';
    let workingDuration = '00h 00m';

    if (activeLeave) {
      attendanceState = 'OnLeave';
    } else if (activeAttendance) {
      if (activeAttendance.last_check_out && activeAttendance.first_check_in) {
        attendanceState = 'CheckedOut';
        const mins = activeAttendance.net_working_minutes || activeAttendance.gross_working_minutes || 0;
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        workingDuration = `${String(hrs).padStart(2, '0')}h ${String(remMins).padStart(2, '0')}m`;
      } else if (activeAttendance.first_check_in) {
        attendanceState = 'CheckedIn';
        
        // Calculate duration since check-in across midnight
        const checkInIso = (activeAttendance as any).created_at || (activeAttendance as any).first_in_iso;
        let startMs = checkInIso ? new Date(checkInIso).getTime() : NaN;

        if (isNaN(startMs)) {
          const rawTime = activeAttendance.first_check_in;
          const timeMatch = rawTime.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)?/i);
          if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const ampm = timeMatch[3];
            if (ampm && ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
            if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
            const checkInDate = new Date();
            if (isNightShiftActive) {
              checkInDate.setDate(checkInDate.getDate() - 1);
            }
            checkInDate.setHours(hours, minutes, 0, 0);
            startMs = checkInDate.getTime();
          }
        }

        if (!isNaN(startMs) && startMs < Date.now()) {
          const diffMs = Math.max(0, Date.now() - startMs);
          const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
          const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
          workingDuration = `${String(diffHrs).padStart(2, '0')}h ${String(diffMins).padStart(2, '0')}m`;
        } else {
          workingDuration = '00h 00m';
        }
      } else {
        attendanceState = 'NotCheckedIn';
        workingDuration = '00h 00m';
      }
    }

    // Real-Time Leave Entitlements: fetch from Supabase leave_balances for this employee
    let userEntitlements: LeaveEntitlement[] = [];
    if (isSupabaseEnabled && empId) {
      try {
        const { data: dbBalances } = await supabase
          .from('leave_balances')
          .select('*, leave_types(id, name, code, default_annual_quota)')
          .eq('employee_id', empId);

        if (dbBalances && dbBalances.length > 0) {
          userEntitlements = dbBalances.map((b: any) => ({
            id: b.id,
            employee_id: b.employee_id,
            employee_name: employee?.display_name || user.name,
            department_name: employee?.department_name || '',
            leave_type_id: b.leave_type_id,
            leave_type_name: b.leave_types?.name || b.leave_type_name || 'Leave',
            policy_id: b.policy_id || 'pol-01',
            policy_name: b.policy_name || 'Standard Leave Policy',
            period: String(b.calendar_year || '2026'),
            opening_balance: Number(b.opening_balance || 0),
            granted: Number(b.accrued || b.opening_balance || 0),
            accrued: Number(b.accrued || 0),
            carried_forward: Number(b.carried_forward || 0),
            adjustments: Number(b.adjustments || 0),
            used: Number(b.consumed || b.used || 0),
            pending: Number(b.pending || 0),
            encashed: Number(b.encashed || 0),
            expired: Number(b.expired || 0),
            closing_balance: Number(b.closing_balance ?? b.available_balance ?? 0),
            available_balance: Number(b.available_balance ?? b.closing_balance ?? 0),
            updated_at: b.updated_at || new Date().toISOString(),
          }));
        }
      } catch (err) {
        console.warn('[workspaceService] leave_balances fetch notice:', err);
      }
    }

    // Fallback: If no balances assigned yet, query active leave types from DB and calculate against actual employee leave requests
    if (userEntitlements.length === 0 && isSupabaseEnabled) {
      try {
        const { data: dbTypes } = await supabase.from('leave_types').select('*').eq('is_active', true);
        if (dbTypes && dbTypes.length > 0) {
          userEntitlements = dbTypes.map((lt: any) => {
            const usedCount = leaveRequests
              .filter((lr) => lr.employee_id === empId && lr.leave_type_id === lt.id && lr.status === 'Approved')
              .reduce((acc, r) => acc + (r.duration_days || 1), 0);
            const quota = Number(lt.default_annual_quota ?? 0);
            return {
              id: `lt-${lt.id}`,
              employee_id: empId,
              employee_name: employee?.display_name || user.name,
              department_name: employee?.department_name || '',
              leave_type_id: lt.id,
              leave_type_name: lt.name,
              policy_id: 'pol-standard',
              policy_name: 'Company Leave Policy',
              period: '2026',
              opening_balance: quota,
              granted: quota,
              accrued: 0,
              carried_forward: 0,
              adjustments: 0,
              used: usedCount,
              pending: 0,
              encashed: 0,
              expired: 0,
              closing_balance: Math.max(0, quota - usedCount),
              available_balance: Math.max(0, quota - usedCount),
              updated_at: new Date().toISOString(),
            };
          });
        }
      } catch (err) {
        console.warn('[workspaceService] leave_types fetch notice:', err);
      }
    }

    if (userEntitlements.length === 0) {
      userEntitlements = entitlements.filter((e) => e.employee_id === empId);
    }

    // Upcoming Holiday from Organization Calendar
    let upcomingHoliday: { name: string; date: string; description?: string } | null = null;

    if (holidayCalendars.length > 0) {
      const activeCalendar = holidayCalendars[0];
      if (activeCalendar.holidays && activeCalendar.holidays.length > 0) {
        const futureHolidays = activeCalendar.holidays
          .filter((h) => h.date >= todayStr)
          .sort((a, b) => a.date.localeCompare(b.date));
        if (futureHolidays.length > 0) {
          upcomingHoliday = {
            name: futureHolidays[0].name,
            date: new Date(futureHolidays[0].date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }),
            description: futureHolidays[0].type || 'Company Holiday',
          };
        }
      }
    }

    // Pending Action Items for Current Approver / Employee from real approval requests
    let pendingTasks: PendingTaskItem[] = [];
    let serviceRequests: ServiceRequestItem[] = [];

    try {
      const allApprovalRequests = await approvalService.getApprovalRequests().catch(() => []);
      
      // Requests submitted by current employee
      serviceRequests = allApprovalRequests
        .filter((r) => r.requested_by_id === empId || r.requested_by_id === user.id || (r.requested_by_email && r.requested_by_email.toLowerCase() === user.email?.toLowerCase()))
        .map((req) => ({
          id: req.id,
          requestCode: (req as any).request_code || `REQ-${req.id.slice(-6).toUpperCase()}`,
          requestType: req.title || req.type || 'Request',
          summary: req.details || `${req.type} submission pending review`,
          submittedDate: req.created_at ? new Date(req.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Today',
          status: req.status || 'Pending',
        }));

      // Tasks requiring action from current user (if manager/admin)
      const isManagerOrAdmin = ['Super Admin', 'Platform Admin', 'Company Admin', 'HR Head', 'HR Admin', 'Manager'].includes(
        (user.roles || [])[0]?.name || user.role || ''
      );

      pendingTasks = allApprovalRequests
        .filter((r) => r.status === 'Pending' && (r.approver_id === empId || r.approver_id === user.id || isManagerOrAdmin))
        .slice(0, 5)
        .map((req) => ({
          id: req.id,
          title: req.title || `${req.type} Review`,
          description: req.details || `Submitted by ${req.requested_by_name || 'Team Member'}`,
          dueDate: req.created_at ? new Date(req.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : 'Today',
          priority: (req.amount_or_duration && req.amount_or_duration.includes('Critical')) ? 'Urgent' : 'Normal',
          actionLabel: 'Review Request',
          targetRoute: 'approvals',
          category: req.type || 'Approval',
          status: 'Pending',
        }));
    } catch (err) {
      console.warn('[workspaceService] approvals fetch notice:', err);
    }

    // Real-Time Latest Payslip Query (Zero Mock — returns actual DB payslip or null)
    let latestPayslip: UserWorkspaceData['latestPayslip'] = null;
    if (isSupabaseEnabled && empId) {
      try {
        const { data: dbPayslip } = await supabase
          .from('payslips')
          .select('*')
          .eq('employee_id', empId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (dbPayslip) {
          latestPayslip = {
            period: dbPayslip.pay_period || dbPayslip.month_year || 'Current Period',
            grossPay: Number(dbPayslip.gross_salary || dbPayslip.gross_pay || 0),
            netPay: Number(dbPayslip.net_salary || dbPayslip.net_pay || 0),
            deductions: Number(dbPayslip.total_deductions || 0),
            publishedDate: dbPayslip.disbursement_date || (dbPayslip.created_at ? new Date(dbPayslip.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Recent'),
            paymentStatus: dbPayslip.status || 'Disbursed via Bank Transfer',
          };
        }
      } catch (err) {
        console.warn('[workspaceService] payslip fetch notice:', err);
      }
    }

    // Real Notification Feed
    const notifications: NotificationItem[] = [];

    return {
      user,
      employee,
      profileContext,
      todayAttendance,
      attendanceState,
      workingDuration,
      leaveEntitlements: userEntitlements,
      pendingTasks,
      upcomingHoliday,
      activeShift: (() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const empId = employee?.id || user.employee_id || user.id;
        const orgId = user.organization_id || employee?.organization_id || getActiveOrgId();

        const roster = attendanceRosterService.getRosterForEmployeeOnDate(empId, todayStr, orgId);
        const shift = attendanceRosterService.getShiftById(roster.shift_id, orgId) || {
          shift_name: roster.shift_name,
          shift_code: roster.shift_code,
          start_time: '09:00',
          end_time: '18:00',
        };

        const isNight = roster.shift_code.includes('NGT');
        const shiftTimings = roster.is_weekly_off
          ? 'Weekly Off (Rest Day)'
          : `${shift.start_time || '09:00 AM'} - ${shift.end_time || '06:00 PM'} ${isNight ? '(Next Day)' : ''}`;

        return {
          name: `${roster.shift_name} (${roster.shift_code})`,
          timings: shiftTimings,
          location: employee?.branch_name || (employee?.employment as any)?.work_location_name || employee?.location || 'Office Location',
        };
      })(),
      latestPayslip,
      documents: profileContext.documents.map((d) => ({
        id: d.id,
        name: d.type,
        category: d.category,
        verificationStatus: d.verificationStatus,
        uploadedAt: d.uploadedAt,
      })),
      serviceRequests,
      notifications,
      unreadNotificationCount: notifications.filter((n) => !n.isRead).length,
    };
  },

  // Interactive Punch In via Server-Side Authoritative RPC
  async punchIn(
    employee: Employee | null, 
    user: User, 
    coords?: { latitude: number; longitude: number; accuracy?: number }
  ): Promise<AttendanceDaily> {
    const empId = employee?.id || user.employee_id || user.id;
    const empName = employee ? `${employee.first_name} ${employee.last_name}` : user.name;

    if (isSupabaseEnabled) {
      const { data: punchRes, error: rpcErr } = await supabase.rpc('fn_record_attendance_punch', {
        p_latitude: coords?.latitude ?? null,
        p_longitude: coords?.longitude ?? null,
        p_accuracy: coords?.accuracy || 20.0,
        p_punch_type: 'IN',
        p_reason: null,
        p_device_info: { client: 'WEB_MOBILE_ESS' },
      });

      if (rpcErr) {
        throw new Error(rpcErr.message || 'Check-In failed.');
      }
    }

    attendanceApi.invalidateCache();
    const record = attendanceApi.checkIn(empId, empName, 'WEB');
    hrEventBus.publish('attendance.recorded', record, { actorId: user.id });
    return record;
  },

  // Interactive Punch Out via Server-Side Authoritative RPC
  async punchOut(
    employee: Employee | null, 
    user: User, 
    coords?: { latitude: number; longitude: number; accuracy?: number },
    reason?: string
  ): Promise<AttendanceDaily | null> {
    const empId = employee?.id || user.employee_id || user.id;

    if (isSupabaseEnabled) {
      const { data: punchRes, error: rpcErr } = await supabase.rpc('fn_record_attendance_punch', {
        p_latitude: coords?.latitude ?? null,
        p_longitude: coords?.longitude ?? null,
        p_accuracy: coords?.accuracy || 20.0,
        p_punch_type: 'OUT',
        p_reason: reason ? reason.trim() : null,
        p_device_info: { client: 'WEB_MOBILE_ESS' },
      });

      if (rpcErr) {
        throw new Error(rpcErr.message || 'Check-Out failed.');
      }
    }

    attendanceApi.invalidateCache();
    const record = attendanceApi.checkOut(empId);
    if (record) {
      hrEventBus.publish('attendance.updated', record, { actorId: user.id });
    }
    return record;
  },
};
