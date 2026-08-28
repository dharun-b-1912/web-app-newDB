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

    // Leave Entitlements: ensure normalized list for this employee
    const defaultEntitlements: LeaveEntitlement[] = [
      {
        id: 'ent-cl',
        employee_id: empId,
        employee_name: employee.display_name || user.name,
        department_name: employee.department_name || 'People & HR',
        leave_type_id: 'lt-cl',
        leave_type_name: 'Casual Leave',
        policy_id: 'pol-cl',
        policy_name: 'Corporate Casual Leave Policy',
        period: '2026',
        opening_balance: 12,
        granted: 12,
        accrued: 0,
        carried_forward: 0,
        adjustments: 0,
        used: 4,
        pending: 0,
        encashed: 0,
        expired: 0,
        closing_balance: 8,
        available_balance: 8,
        updated_at: new Date().toISOString(),
      },
      {
        id: 'ent-sl',
        employee_id: empId,
        employee_name: employee.display_name || user.name,
        department_name: employee.department_name || 'People & HR',
        leave_type_id: 'lt-sl',
        leave_type_name: 'Sick Leave',
        policy_id: 'pol-sl',
        policy_name: 'Corporate Sick Leave Policy',
        period: '2026',
        opening_balance: 12,
        granted: 12,
        accrued: 0,
        carried_forward: 0,
        adjustments: 0,
        used: 2,
        pending: 0,
        encashed: 0,
        expired: 0,
        closing_balance: 10,
        available_balance: 10,
        updated_at: new Date().toISOString(),
      },
      {
        id: 'ent-el',
        employee_id: empId,
        employee_name: employee.display_name || user.name,
        department_name: employee.department_name || 'People & HR',
        leave_type_id: 'lt-el',
        leave_type_name: 'Earned Leave',
        policy_id: 'pol-el',
        policy_name: 'Corporate Earned Leave Policy',
        period: '2026',
        opening_balance: 18,
        granted: 18,
        accrued: 0,
        carried_forward: 0,
        adjustments: 0,
        used: 4,
        pending: 0,
        encashed: 0,
        expired: 0,
        closing_balance: 14,
        available_balance: 14,
        updated_at: new Date().toISOString(),
      },
    ];

    const userEntitlements = entitlements.length > 0 ? entitlements : defaultEntitlements;

    // Upcoming Holiday from Organization Calendar
    let upcomingHoliday: { name: string; date: string; description?: string } | null = {
      name: 'Independence Day',
      date: '15 Aug 2026',
      description: 'National Public Holiday',
    };

    if (holidayCalendars.length > 0) {
      const activeCalendar = holidayCalendars[0];
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

    // Pending Action Items for Current Employee
    const pendingTasks: PendingTaskItem[] = [
      {
        id: 'tsk-01',
        title: 'Q3 Performance Self-Assessment',
        category: 'Performance',
        description: 'Complete quarterly self-evaluation for People Operations leadership metrics.',
        dueDate: '25 Aug 2026',
        priority: 'High',
        status: 'Pending',
        actionLabel: 'Complete Assessment',
        targetRoute: 'performance',
      },
      {
        id: 'tsk-02',
        title: 'Statutory POSH Policy 2026 Acknowledgement',
        category: 'Document',
        description: 'Review and electronically sign updated organizational compliance charter.',
        dueDate: '31 Aug 2026',
        priority: 'Normal',
        status: 'Pending',
        actionLabel: 'Review & Sign',
        targetRoute: 'documents',
      },
      {
        id: 'tsk-03',
        title: 'Pending Leave Approvals (3 Team Requests)',
        category: 'Approval',
        description: '3 team member leave requests are awaiting your review as HR Head.',
        dueDate: 'Today',
        priority: 'Urgent',
        status: 'Pending',
        actionLabel: 'Review Approvals',
        targetRoute: 'leave',
      },
    ];

    // Authoritative Recent Service Requests
    const serviceRequests: ServiceRequestItem[] = [
      {
        id: 'req-01',
        requestCode: 'REQ-ATT-2026-08',
        requestType: 'Attendance Regularization',
        submittedDate: '12 Aug 2026',
        status: 'Approved',
        summary: 'Missed evening punch out due to client strategy meeting (06:30 PM)',
      },
      {
        id: 'req-02',
        requestCode: 'REQ-DOC-2026-14',
        requestType: 'Employment Letter Request',
        submittedDate: '05 Aug 2026',
        status: 'Approved',
        summary: 'Official embassy verification letter for Schengen Business Visa',
      },
      {
        id: 'req-03',
        requestCode: 'REQ-BNK-2026-02',
        requestType: 'Bank Detail Verification',
        submittedDate: '01 Aug 2026',
        status: 'Approved',
        summary: 'Salary disbursement account validation with HDFC Bank',
      },
    ];

    // Notification Feed
    const notifications: NotificationItem[] = [
      {
        id: 'notif-01',
        title: 'July 2026 Payslip Available',
        message: 'Your official salary payslip for July 2026 has been published and is ready for download.',
        timestamp: '31 Jul 2026',
        type: 'payroll',
        isRead: false,
      },
      {
        id: 'notif-02',
        title: 'Leave Request Approved',
        message: 'Your 1-day Casual Leave for 08 Aug 2026 has been approved by Dharun Joy.',
        timestamp: '02 Aug 2026',
        type: 'leave',
        isRead: true,
      },
      {
        id: 'notif-03',
        title: 'New Device Sign-in Verified',
        message: 'Joy PeopleHR session active on Windows PC (Chrome 126) from Coimbatore HQ.',
        timestamp: 'Today 09:12 AM',
        type: 'security',
        isRead: true,
      },
    ];

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
