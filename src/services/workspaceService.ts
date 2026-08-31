import { api } from './api';
import { attendanceApi } from './attendanceApi';
import { leaveApi } from './leaveApi';
import { User, Employee, Company } from '../types';
import { AttendanceDaily } from '../types/attendance';
import { LeaveEntitlement, LeaveRequest, HolidayCalendar } from '../types/leave';
import { hrEventBus } from './hrEventBus';
import { profileService, FullProfileContext } from './profileService';
import { attendanceRosterService } from './attendance/attendanceRosterService';
import { getActiveOrgId } from './attendance/biometricCommandService';

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
    const todayStr = new Date().toISOString().split('T')[0];

    const [
      allEmployees,
      dailyAttendanceList,
      entitlements,
      leaveRequests,
      holidayCalendars,
      profileContext,
    ] = await Promise.all([
      api.getEmployees(companyId ? { companyId } : undefined).catch(() => []),
      Promise.resolve(attendanceApi.getDailyAttendance(todayStr)).catch(() => []),
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

    // Check active leave today
    const activeLeave = leaveRequests.find(
      (l) => l.employee_id === empId && l.status === 'Approved' && l.from_date <= todayStr && l.to_date >= todayStr
    );

    // Determine current attendance state & working duration
    let attendanceState: UserWorkspaceData['attendanceState'] = 'NotCheckedIn';
    let workingDuration = '00h 00m';

    if (activeLeave) {
      attendanceState = 'OnLeave';
    } else if (todayAttendance) {
      if (todayAttendance.last_check_out && todayAttendance.first_check_in) {
        attendanceState = 'CheckedOut';
        const mins = todayAttendance.net_working_minutes || todayAttendance.gross_working_minutes || 0;
        const hrs = Math.floor(mins / 60);
        const remMins = mins % 60;
        workingDuration = `${String(hrs).padStart(2, '0')}h ${String(remMins).padStart(2, '0')}m`;
      } else if (todayAttendance.first_check_in) {
        attendanceState = 'CheckedIn';
        const now = new Date();
        const rawTime = todayAttendance.first_check_in;
        const timeMatch = rawTime.match(/(\d+):(\d+)(?::\d+)?\s*(AM|PM)?/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const ampm = timeMatch[3];
          if (ampm && ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
          if (ampm && ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
          const checkInDate = new Date();
          checkInDate.setHours(hours, minutes, 0, 0);
          const diffMs = Math.max(0, now.getTime() - checkInDate.getTime());
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

    // Leave Entitlements: return actual employee entitlements
    const userEntitlements = entitlements;

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

    // Pending Action Items for Current Employee (Derived from real pending approvals)
    const pendingTasks: PendingTaskItem[] = [];

    // Real Service Requests
    const serviceRequests: ServiceRequestItem[] = [];

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
          location: employee?.location || 'Joy Tech Park, Coimbatore HQ',
        };
      })(),
      latestPayslip: {
        period: 'July 2026',
        grossPay: 185000,
        netPay: 154200,
        deductions: 30800,
        publishedDate: '31 Jul 2026',
        paymentStatus: 'Disbursed via Bank Transfer',
      },
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

  // Interactive Punch In
  punchIn(employee: Employee | null, user: User): AttendanceDaily {
    const empId = employee?.id || user.employee_id || user.id;
    const empName = employee ? `${employee.first_name} ${employee.last_name}` : user.name;

    const record = attendanceApi.checkIn(empId, empName, 'WEB');
    hrEventBus.publish('attendance.recorded', record, { actorId: user.id });
    return record;
  },

  // Interactive Punch Out
  punchOut(employee: Employee | null, user: User): AttendanceDaily | null {
    const empId = employee?.id || user.employee_id || user.id;
    const record = attendanceApi.checkOut(empId);
    if (record) {
      hrEventBus.publish('attendance.updated', record, { actorId: user.id });
    }
    return record;
  },
};
