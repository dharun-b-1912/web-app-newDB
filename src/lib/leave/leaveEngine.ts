import {
  HolidayCalendar,
  LeaveLedgerTransaction,
  LeavePolicy,
  LeavePolicyRule,
  LeaveRequest,
  LeaveRequestDay,
  LeaveType,
} from '../../types/leave';

export interface DurationCalculationResult {
  totalCalendarDays: number;
  workingDays: number;
  holidayDays: number;
  weeklyOffDays: number;
  leaveDaysDeducted: number;
  sandwichDaysAdded: number;
  dailyBreakdown: LeaveRequestDay[];
}

export interface LeaveValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  requiresAttachment: boolean;
  availableBalance: number;
  balanceAfterRequest: number;
  isLop: boolean;
}

/**
 * Main leave calculation logic: Working days, Holidays, Weekly-offs, Sandwich rules, Half-days.
 */
export function calculateLeaveDuration(
  fromDate: string,
  toDate: string,
  isHalfDay: boolean,
  leaveType: LeaveType,
  policyRule: LeavePolicyRule | undefined,
  holidayCalendar?: HolidayCalendar
): DurationCalculationResult {
  const start = new Date(fromDate);
  const end = new Date(toDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return {
      totalCalendarDays: 0,
      workingDays: 0,
      holidayDays: 0,
      weeklyOffDays: 0,
      leaveDaysDeducted: 0,
      sandwichDaysAdded: 0,
      dailyBreakdown: [],
    };
  }

  const dailyBreakdown: LeaveRequestDay[] = [];
  let totalCalendarDays = 0;
  let workingDays = 0;
  let holidayDays = 0;
  let weeklyOffDays = 0;

  const weeklyOffs = holidayCalendar?.weekly_offs || ['Saturday', 'Sunday'];
  const holidaysList = holidayCalendar?.holidays || [];

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const curr = new Date(start);
  while (curr <= end) {
    totalCalendarDays++;
    const dateStr = curr.toISOString().split('T')[0];
    const dayName = dayNames[curr.getDay()];

    const isWeeklyOff = weeklyOffs.includes(dayName as any);
    const holidayMatch = holidaysList.find(h => h.date === dateStr);
    const isHoliday = !!holidayMatch;

    const isWorkingDay = !isWeeklyOff && !isHoliday;

    let leaveCount = 0;
    if (isWorkingDay) {
      workingDays++;
      leaveCount = isHalfDay ? 0.5 : 1.0;
    } else if (isHoliday) {
      holidayDays++;
    } else if (isWeeklyOff) {
      weeklyOffDays++;
    }

    dailyBreakdown.push({
      date: dateStr,
      is_working_day: isWorkingDay,
      is_holiday: isHoliday,
      holiday_name: holidayMatch?.name,
      is_weekly_off: isWeeklyOff,
      is_half_day: isHalfDay,
      leave_count: leaveCount,
    });

    curr.setDate(curr.getDate() + 1);
  }

  let leaveDaysDeducted = workingDays * (isHalfDay ? 0.5 : 1.0);
  let sandwichDaysAdded = 0;

  // Apply Sandwich Rule if enabled in policy rule
  if (policyRule?.sandwich_rule_enabled && totalCalendarDays >= 3) {
    // If request covers intervening weekends/holidays between working days
    let nonWorkingDaysCount = 0;
    dailyBreakdown.forEach(day => {
      if (!day.is_working_day) {
        nonWorkingDaysCount++;
        day.is_sandwich_applied = true;
        day.leave_count = isHalfDay ? 0.5 : 1.0;
      }
    });
    sandwichDaysAdded = nonWorkingDaysCount;
    leaveDaysDeducted += nonWorkingDaysCount * (isHalfDay ? 0.5 : 1.0);
  }

  return {
    totalCalendarDays,
    workingDays,
    holidayDays,
    weeklyOffDays,
    leaveDaysDeducted,
    sandwichDaysAdded,
    dailyBreakdown,
  };
}

/**
 * Derive exact available balance from transaction ledger
 */
export function calculateBalanceFromLedger(
  transactions: LeaveLedgerTransaction[],
  employeeId: string,
  leaveTypeId: string
): { currentBalance: number; accrued: number; used: number; encashed: number; expired: number } {
  const filtered = transactions.filter(
    t => t.employee_id === employeeId && t.leave_type_id === leaveTypeId
  );

  let currentBalance = 0;
  let accrued = 0;
  let used = 0;
  let encashed = 0;
  let expired = 0;

  filtered.forEach(t => {
    currentBalance += t.amount;
    if (t.transaction_type === 'Accrual' || t.transaction_type === 'Grant') {
      accrued += t.amount;
    } else if (t.transaction_type === 'Consumption') {
      used += Math.abs(t.amount);
    } else if (t.transaction_type === 'Encashment') {
      encashed += Math.abs(t.amount);
    } else if (t.transaction_type === 'Expiry') {
      expired += Math.abs(t.amount);
    }
  });

  return {
    currentBalance,
    accrued,
    used,
    encashed,
    expired,
  };
}

/**
 * Validate a proposed leave request against rules, notice period, limits, and overlaps
 */
export function validateLeaveRequest(
  fromDate: string,
  toDate: string,
  requestedDays: number,
  leaveType: LeaveType,
  policyRule: LeavePolicyRule | undefined,
  currentAvailableBalance: number,
  existingRequests: LeaveRequest[],
  employeeId: string
): LeaveValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(fromDate);
  start.setHours(0, 0, 0, 0);

  // 1. Check Min / Max Days per request
  if (leaveType.min_days_per_request && requestedDays < leaveType.min_days_per_request) {
    errors.push(`Minimum days for ${leaveType.name} is ${leaveType.min_days_per_request} day(s).`);
  }
  if (leaveType.max_days_per_request && requestedDays > leaveType.max_days_per_request) {
    errors.push(`Maximum days per request for ${leaveType.name} is ${leaveType.max_days_per_request} day(s).`);
  }

  // 2. Advance Notice Rule
  if (policyRule?.advance_notice_days && policyRule.advance_notice_days > 0) {
    const noticeDiffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 3600 * 24));
    if (noticeDiffDays < policyRule.advance_notice_days) {
      warnings.push(
        `Policy requires ${policyRule.advance_notice_days} day(s) advance notice. You submitted ${Math.max(
          0,
          noticeDiffDays
        )} day(s) in advance.`
      );
    }
  }

  // 3. Backdated Leave Rule
  if (start < today) {
    if (!leaveType.allow_backdated) {
      errors.push(`Backdated leave is not allowed for ${leaveType.name}.`);
    } else if (leaveType.max_backdated_days) {
      const backdatedDiffDays = Math.ceil((today.getTime() - start.getTime()) / (1000 * 3600 * 24));
      if (backdatedDiffDays > leaveType.max_backdated_days) {
        errors.push(`Backdated leave cannot exceed ${leaveType.max_backdated_days} day(s).`);
      }
    }
  }

  // 4. Balance & Negative Balance Checks
  let balanceAfterRequest = currentAvailableBalance - requestedDays;
  let isLop = false;

  if (requestedDays > currentAvailableBalance) {
    if (leaveType.allow_negative_balance || policyRule?.allow_negative_balance) {
      const maxNeg = policyRule?.max_negative_balance || 5;
      if (Math.abs(balanceAfterRequest) > maxNeg) {
        if (leaveType.converts_to_lop_if_exhausted) {
          isLop = true;
          warnings.push(
            `Insufficient leave balance. Excess ${requestedDays - currentAvailableBalance} day(s) will be converted to Loss of Pay (LOP).`
          );
        } else {
          errors.push(
            `Insufficient balance. Negative balance limit of ${maxNeg} day(s) would be exceeded.`
          );
        }
      } else {
        warnings.push(`This request will result in a negative balance (${balanceAfterRequest} days).`);
      }
    } else if (leaveType.converts_to_lop_if_exhausted) {
      isLop = true;
      warnings.push(`Insufficient leave balance. This request will be processed as Loss of Pay (LOP).`);
    } else {
      errors.push(
        `Insufficient leave balance. Available: ${currentAvailableBalance} day(s), Requested: ${requestedDays} day(s).`
      );
    }
  }

  // 5. Overlapping Leave Conflict Check
  const reqStart = new Date(fromDate).getTime();
  const reqEnd = new Date(toDate).getTime();

  const activeEmployeeRequests = existingRequests.filter(
    r =>
      r.employee_id === employeeId &&
      (r.status === 'Approved' || r.status === 'Pending' || r.status === 'Submitted')
  );

  for (const existing of activeEmployeeRequests) {
    const exStart = new Date(existing.from_date).getTime();
    const exEnd = new Date(existing.to_date).getTime();

    if (reqStart <= exEnd && reqEnd >= exStart) {
      errors.push(
        `Overlapping request conflict! You already have a ${existing.status.toLowerCase()} request (${existing.leave_type_name}: ${existing.from_date} to ${existing.to_date}).`
      );
      break;
    }
  }

  // 6. Attachment Check
  let requiresAttachment = leaveType.attachment_required;
  if (
    leaveType.attachment_mandatory_days_threshold &&
    requestedDays >= leaveType.attachment_mandatory_days_threshold
  ) {
    requiresAttachment = true;
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    requiresAttachment,
    availableBalance: currentAvailableBalance,
    balanceAfterRequest,
    isLop,
  };
}
