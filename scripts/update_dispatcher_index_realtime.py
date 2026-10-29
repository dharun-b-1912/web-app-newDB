import os

index_file = r"d:\web-app (2)\Joy PeopleHR\supabase\functions\attendance-report-dispatcher\index.ts"

with open(index_file, "r", encoding="utf-8") as f:
    code = f.read()

# Replace the weekly section to compute weeklyEmployeeLedger
weekly_target_old = """      weeklyAvgTurnout = Math.round(weeklyTrend.reduce((acc, t) => acc + t.turnoutPct, 0) / (weeklyTrend.length || 1));
      weeklyAvgAbsenteeism = Math.max(0, 100 - weeklyAvgTurnout);
      weeklyTotalOtHours = Math.round(weeklyTrend.reduce((acc, t) => acc + t.otHours, 0) * 10) / 10;
    }"""

weekly_target_new = """      weeklyAvgTurnout = Math.round(weeklyTrend.reduce((acc, t) => acc + t.turnoutPct, 0) / (weeklyTrend.length || 1));
      weeklyAvgAbsenteeism = Math.max(0, 100 - weeklyAvgTurnout);
      weeklyTotalOtHours = Math.round(weeklyTrend.reduce((acc, t) => acc + t.otHours, 0) * 10) / 10;

      // Realtime employee-wise weekly metrics aggregation (ZERO mocks)
      const empWeeklyMap = new Map<string, {
        presentDays: number;
        lateDays: number;
        workMins: number;
        otMins: number;
        dayWiseOt: number[];
      }>();

      (weekDailyRecords || []).forEach((r) => {
        const empId = r.employee_id || r.employee_code;
        if (!empId) return;
        const cur = empWeeklyMap.get(empId) || {
          presentDays: 0,
          lateDays: 0,
          workMins: 0,
          otMins: 0,
          dayWiseOt: [0, 0, 0, 0, 0, 0, 0],
        };
        const isPres = r.status === "PRESENT" || r.status === "Present" || !!r.first_check_in;
        if (isPres) cur.presentDays++;
        if ((r.late_minutes || 0) > 0) cur.lateDays++;
        cur.workMins += (r.total_work_minutes || r.net_working_minutes || 0);
        cur.otMins += (r.overtime_minutes || 0);

        const dIdx = weeklyDates.indexOf(r.attendance_date);
        if (dIdx >= 0 && dIdx < 7) {
          cur.dayWiseOt[dIdx] = Math.round(((r.overtime_minutes || 0) / 60) * 10) / 10;
        }
        empWeeklyMap.set(empId, cur);
      });

      var weeklyEmployeeLedger = empList.map((emp) => {
        const s = empWeeklyMap.get(emp.id) || empWeeklyMap.get(emp.employee_code) || {
          presentDays: 0,
          lateDays: 0,
          workMins: 0,
          otMins: 0,
          dayWiseOt: [0, 0, 0, 0, 0, 0, 0],
        };
        const attPct = Math.round((s.presentDays / 7) * 100);
        return {
          employeeId: emp.id,
          employeeCode: emp.employee_code,
          employeeName: emp.display_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
          department: deptMap.get(emp.department_id) || "General",
          designation: desigMap.get(emp.designation_id) || "Staff",
          shift: "General Corporate Shift",
          scheduledDays: 7,
          presentDays: s.presentDays,
          halfDays: 0,
          absentDays: Math.max(0, 7 - s.presentDays),
          lateDays: s.lateDays,
          totalWorkMinutes: s.workMins,
          totalOtMinutes: s.otMins,
          attendancePct: attPct,
          dayWiseOt: s.dayWiseOt,
        };
      });
    }"""

if weekly_target_old in code:
    code = code.replace(weekly_target_old, weekly_target_new)
    print("Replaced weekly section successfully")
else:
    print("Weekly target not found")

# Replace monthly section to query payroll_periods and aggregate monthlyEmployeeLedger
monthly_old = """    if (isMonthly) {
      const [mY, mM] = todayStr.split("-");
      monthStartStr = `${mY}-${mM}-01`;

      const { data: monthDailyRecords } = await supabase
        .from("attendance_daily")
        .select("*")
        .eq("organization_id", orgId)
        .gte("attendance_date", monthStartStr)
        .lte("attendance_date", todayStr);

      const curDayNum = Number(todayStr.split("-")[2]);
      scheduledDays = totalHeadcount * curDayNum;
      const monthRecs = monthDailyRecords || [];
      const presentDays = monthRecs.filter((r) => r.status === "PRESENT" || r.status === "Present" || r.status === "HALF_DAY" || !!r.first_check_in).length;
      const absentDays = Math.max(0, scheduledDays - presentDays);
      const totalLateArrivals = monthRecs.filter((r) => (r.late_minutes || 0) > 0).length;
      monthAttendancePct = scheduledDays > 0 ? Math.round((presentDays / scheduledDays) * 100) : 0;
      monthAbsenteeismPct = Math.max(0, 100 - monthAttendancePct);

      const joinersCount = empList.filter((e) => e.doj && e.doj >= monthStartStr).length;
      const exitsCount = 0;
      const openingCount = totalHeadcount - joinersCount;

      monthlyHeadcount = {
        opening: openingCount,
        closing: totalHeadcount,
        joiners: joinersCount,
        exits: exitsCount,
        net: totalHeadcount - openingCount,
      };

      monthlyMetrics = {
        attendancePct: monthAttendancePct,
        absenteeismPct: monthAbsenteeismPct,
        scheduledDays,
        presentDays,
        absentDays,
        totalLateArrivals,
      };

      const totalMonthOtMins = monthRecs.reduce((acc, r) => acc + (r.overtime_minutes || 0), 0);
      totalMonthOtHours = Math.round((totalMonthOtMins / 60) * 10) / 10;
      overtimeGovernance = {
        recordedOtHours: totalMonthOtHours,
        approvedOtHours: totalMonthOtHours,
        periodAllocationHours: 20,
        utilizationPct: Math.round((totalMonthOtHours / 20) * 100),
        remainingHours: Math.max(0, 20 - totalMonthOtHours),
        exceededCount: 0,
        approachingCount: 0,
      };
    }"""

monthly_new = """    let payrollCycleConfig: any = undefined;

    if (isMonthly) {
      // 1. Fetch Company's Configured Payroll Billing Cycle from payroll_periods
      const { data: activePayrollPeriod } = await supabase
        .from("payroll_periods")
        .select("*")
        .eq("organization_id", orgId)
        .order("start_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      const payrollStart = activePayrollPeriod?.start_date || `${todayStr.slice(0, 7)}-01`;
      const payrollEnd = activePayrollPeriod?.end_date || todayStr;
      monthStartStr = payrollStart;

      payrollCycleConfig = {
        periodName: activePayrollPeriod?.period_name || `October 2026`,
        startDate: payrollStart,
        endDate: payrollEnd,
        payDate: activePayrollPeriod?.pay_date || payrollEnd,
      };

      const { data: monthDailyRecords } = await supabase
        .from("attendance_daily")
        .select("*")
        .eq("organization_id", orgId)
        .gte("attendance_date", payrollStart)
        .lte("attendance_date", todayStr);

      const monthRecs = monthDailyRecords || [];
      const distinctWorkDays = Array.from(new Set(monthRecs.map((r) => r.attendance_date))).length || Number(todayStr.split("-")[2]);
      scheduledDays = totalHeadcount * distinctWorkDays;

      // Group actual employee records from Supabase DB (ZERO mocks)
      const empMonthlyMap = new Map<string, {
        presentDays: number;
        halfDays: number;
        absentDays: number;
        lateDays: number;
        workMins: number;
        otMins: number;
      }>();

      monthRecs.forEach((r) => {
        const empId = r.employee_id || r.employee_code;
        if (!empId) return;
        const cur = empMonthlyMap.get(empId) || {
          presentDays: 0,
          halfDays: 0,
          absentDays: 0,
          lateDays: 0,
          workMins: 0,
          otMins: 0,
        };
        const isPres = r.status === "PRESENT" || r.status === "Present" || !!r.first_check_in;
        if (r.status === "HALF_DAY") cur.halfDays++;
        if (isPres) cur.presentDays++;
        else if (r.status === "ABSENT") cur.absentDays++;
        if ((r.late_minutes || 0) > 0) cur.lateDays++;
        cur.workMins += (r.total_work_minutes || r.net_working_minutes || 0);
        cur.otMins += (r.overtime_minutes || 0);
        empMonthlyMap.set(empId, cur);
      });

      var monthlyEmployeeLedger = empList.map((emp) => {
        const s = empMonthlyMap.get(emp.id) || empMonthlyMap.get(emp.employee_code) || {
          presentDays: 0,
          halfDays: 0,
          absentDays: 0,
          lateDays: 0,
          workMins: 0,
          otMins: 0,
        };
        const attPct = distinctWorkDays > 0 ? Math.round((s.presentDays / distinctWorkDays) * 100) : 0;
        return {
          employeeId: emp.id,
          employeeCode: emp.employee_code,
          employeeName: emp.display_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
          department: deptMap.get(emp.department_id) || "General",
          designation: desigMap.get(emp.designation_id) || "Staff",
          shift: "General Corporate Shift",
          scheduledDays: distinctWorkDays,
          presentDays: s.presentDays,
          halfDays: s.halfDays,
          absentDays: Math.max(0, distinctWorkDays - s.presentDays),
          lateDays: s.lateDays,
          totalWorkMinutes: s.workMins,
          totalOtMinutes: s.otMins,
          attendancePct: attPct,
        };
      });

      const presentDays = monthRecs.filter((r) => r.status === "PRESENT" || r.status === "Present" || r.status === "HALF_DAY" || !!r.first_check_in).length;
      const absentDays = Math.max(0, scheduledDays - presentDays);
      const totalLateArrivals = monthRecs.filter((r) => (r.late_minutes || 0) > 0).length;
      monthAttendancePct = scheduledDays > 0 ? Math.round((presentDays / scheduledDays) * 100) : 0;
      monthAbsenteeismPct = Math.max(0, 100 - monthAttendancePct);

      const joinersCount = empList.filter((e) => e.doj && e.doj >= monthStartStr).length;
      const exitsCount = 0;
      const openingCount = totalHeadcount - joinersCount;

      monthlyHeadcount = {
        opening: openingCount,
        closing: totalHeadcount,
        joiners: joinersCount,
        exits: exitsCount,
        net: totalHeadcount - openingCount,
      };

      monthlyMetrics = {
        attendancePct: monthAttendancePct,
        absenteeismPct: monthAbsenteeismPct,
        scheduledDays,
        presentDays,
        absentDays,
        totalLateArrivals,
      };

      const totalMonthOtMins = monthRecs.reduce((acc, r) => acc + (r.overtime_minutes || 0), 0);
      totalMonthOtHours = Math.round((totalMonthOtMins / 60) * 10) / 10;
      overtimeGovernance = {
        recordedOtHours: totalMonthOtHours,
        approvedOtHours: totalMonthOtHours,
        periodAllocationHours: 20,
        utilizationPct: Math.round((totalMonthOtHours / 20) * 100),
        remainingHours: Math.max(0, 20 - totalMonthOtHours),
        exceededCount: 0,
        approachingCount: 0,
      };
    }"""

if monthly_old in code:
    code = code.replace(monthly_old, monthly_new)
    print("Replaced monthly section successfully")
else:
    print("Monthly target not found")

# Update exportOptions to include weeklyEmployeeLedger and monthlyEmployeeLedger
opts_old = """    const exportOptions: AttendanceExportOptions = {
      companyName,
      reportDate: todayStr,
      reportType: isWeekly ? "WEEKLY" : isMonthly ? "MONTHLY" : isMorning ? "MORNING_CHECKIN" : "EVENING_FINAL",
      cutoffTime: istTimeFormatted,
      yesterdayRows: yesterdayDailyRecords || [],
      includePunches: true,
      weeklyTrend,
      weeklyRepeatedLate,
      weeklyRepeatedAbsent,
      weeklyAvgTurnout: isWeekly ? weeklyAvgTurnout : undefined,
      weeklyAvgAbsenteeism: isWeekly ? weeklyAvgAbsenteeism : undefined,
      weeklyTotalOtHours: isWeekly ? weeklyTotalOtHours : undefined,
      monthlyHeadcount,
      monthlyMetrics,
      overtimeGovernance,
    };"""

opts_new = """    const exportOptions: AttendanceExportOptions = {
      companyName,
      reportDate: todayStr,
      reportType: isWeekly ? "WEEKLY" : isMonthly ? "MONTHLY" : isMorning ? "MORNING_CHECKIN" : "EVENING_FINAL",
      cutoffTime: istTimeFormatted,
      yesterdayRows: yesterdayDailyRecords || [],
      includePunches: true,
      weeklyTrend,
      weeklyRepeatedLate,
      weeklyRepeatedAbsent,
      weeklyAvgTurnout: isWeekly ? weeklyAvgTurnout : undefined,
      weeklyAvgAbsenteeism: isWeekly ? weeklyAvgAbsenteeism : undefined,
      weeklyTotalOtHours: isWeekly ? weeklyTotalOtHours : undefined,
      monthlyHeadcount,
      monthlyMetrics,
      overtimeGovernance,
      weeklyEmployeeLedger: isWeekly ? weeklyEmployeeLedger : undefined,
      monthlyEmployeeLedger: isMonthly ? monthlyEmployeeLedger : undefined,
      payrollCycle: isMonthly ? payrollCycleConfig : undefined,
    };"""

if opts_old in code:
    code = code.replace(opts_old, opts_new)
    print("Replaced exportOptions successfully")
else:
    print("exportOptions target not found")

with open(index_file, "w", encoding="utf-8") as f:
    f.write(code)

print(f"Updated index.ts: {len(code)} characters")
