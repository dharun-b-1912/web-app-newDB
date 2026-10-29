import os

excel_file = r"d:\web-app (2)\Joy PeopleHR\supabase\functions\attendance-report-dispatcher\excelGenerator.ts"

with open(excel_file, "r", encoding="utf-8") as f:
    code = f.read()

# In Weekly sheets:
# Replace the estimated weekly OT in Sheet 5
old_ot_weekly = """      let otRowIdx = 4;
      rows.forEach((r) => {
        const row = wsWeekOt.getRow(otRowIdx);
        const dayOtHours = Math.round(((r.record?.overtime_minutes || 0) / 60) * 10) / 10;
        // Estimate weekly OT as dayOtHours * 3 (or proportional)
        const estWeekOt = Math.round(dayOtHours * 4 * 10) / 10;
        row.getCell(1).value = r.emp.employee_code || '';
        row.getCell(2).value = r.record?.employee_name || '';
        row.getCell(3).value = r.emp.department_name || r.emp.department || 'General';
        row.getCell(4).value = r.shift?.shift_code || 'GEN-09';
        row.getCell(5).value = `${dayOtHours}h`;
        row.getCell(6).value = `${estWeekOt}h`;
        row.getCell(7).value = '8.0h Cap';
        row.getCell(8).value = estWeekOt <= 8.0 ? 'COMPLIANT' : 'EXCEEDED';"""

new_ot_weekly = """      let otRowIdx = 4;
      const weekEmpLedger = options.weeklyEmployeeLedger || [];
      const empSourceList = weekEmpLedger.length > 0 ? weekEmpLedger : rows.map(r => ({
        employeeCode: r.emp.employee_code || '',
        employeeName: r.record?.employee_name || '',
        department: r.emp.department_name || r.emp.department || 'General',
        shift: r.shift?.shift_code || 'GEN-09',
        totalOtMinutes: r.record?.overtime_minutes || 0,
        dayWiseOt: [0, 0, 0, 0, 0, 0, Math.round(((r.record?.overtime_minutes || 0) / 60) * 10) / 10],
      }));

      empSourceList.forEach((empItem: any) => {
        const row = wsWeekOt.getRow(otRowIdx);
        const actualWeekOtHours = Math.round((empItem.totalOtMinutes / 60) * 10) / 10;
        const dayOtHours = empItem.dayWiseOt ? (empItem.dayWiseOt[6] || 0) : 0;
        row.getCell(1).value = empItem.employeeCode;
        row.getCell(2).value = empItem.employeeName;
        row.getCell(3).value = empItem.department;
        row.getCell(4).value = empItem.shift || 'GEN-09';
        row.getCell(5).value = `${dayOtHours}h`;
        row.getCell(6).value = `${actualWeekOtHours}h`;
        row.getCell(7).value = '8.0h Cap';
        row.getCell(8).value = actualWeekOtHours <= 8.0 ? 'COMPLIANT' : 'EXCEEDED';"""

if old_ot_weekly in code:
    code = code.replace(old_ot_weekly, new_ot_weekly)
    print("Replaced weekly OT calculation with actual database values")
else:
    print("Weekly OT target not found")

# Replace Weekly Sheet 6 Master Ledger
old_ledger_weekly = """      let ledRowIdx = 4;
      rows.forEach((r) => {
        const row = wsWeekLedger.getRow(ledRowIdx);
        const lateMins = r.record?.late_minutes || 0;
        row.getCell(1).value = r.emp.employee_code || '';
        row.getCell(2).value = r.record?.employee_name || '';
        row.getCell(3).value = r.emp.department_name || r.emp.department || 'General';
        row.getCell(4).value = r.emp.designation_title || r.emp.designation || 'Staff';
        row.getCell(5).value = `${r.shift?.shift_code || 'GEN-09'} (${r.shift?.start_time || '09:00'})`;
        row.getCell(6).value = r.record?.first_check_in || '—';
        row.getCell(7).value = r.record?.last_check_out || '—';
        row.getCell(8).value = r.record?.status || 'Absent';
        row.getCell(9).value = lateMins === 0 ? 'Grade A (Punctual)' : (lateMins <= 15 ? 'Grade B (Grace)' : 'Grade C (Late)');"""

new_ledger_weekly = """      let ledRowIdx = 4;
      const weekLedgerSource = (options.weeklyEmployeeLedger && options.weeklyEmployeeLedger.length > 0)
        ? options.weeklyEmployeeLedger
        : rows.map(r => ({
            employeeCode: r.emp.employee_code || '',
            employeeName: r.record?.employee_name || '',
            department: r.emp.department_name || r.emp.department || 'General',
            designation: r.emp.designation_title || r.emp.designation || 'Staff',
            shift: `${r.shift?.shift_code || 'GEN-09'} (${r.shift?.start_time || '09:00'})`,
            firstIn: r.record?.first_check_in || '—',
            lastOut: r.record?.last_check_out || '—',
            status: r.record?.status || 'Absent',
            lateDays: (r.record?.late_minutes || 0) > 0 ? 1 : 0,
            scheduledDays: 7,
            presentDays: (r.record?.status === 'Present' || !!r.record?.first_check_in) ? 1 : 0,
            attendancePct: (r.record?.status === 'Present' || !!r.record?.first_check_in) ? 100 : 0,
          }));

      weekLedgerSource.forEach((empItem: any) => {
        const row = wsWeekLedger.getRow(ledRowIdx);
        const lateDays = empItem.lateDays ?? 0;
        row.getCell(1).value = empItem.employeeCode;
        row.getCell(2).value = empItem.employeeName;
        row.getCell(3).value = empItem.department;
        row.getCell(4).value = empItem.designation || 'Staff';
        row.getCell(5).value = empItem.shift || 'GEN-09';
        row.getCell(6).value = empItem.firstIn || (empItem.presentDays > 0 ? `${empItem.presentDays} Days Present` : '—');
        row.getCell(7).value = empItem.lastOut || '—';
        row.getCell(8).value = empItem.status || (empItem.presentDays > 0 ? 'Present' : 'Absent');
        row.getCell(9).value = lateDays === 0 ? 'Grade A (Punctual)' : (lateDays <= 1 ? 'Grade B (Grace)' : 'Grade C (Late)');"""

if old_ledger_weekly in code:
    code = code.replace(old_ledger_weekly, new_ledger_weekly)
    print("Replaced weekly master ledger with actual database values")
else:
    print("Weekly master ledger target not found")

# Replace Monthly Sheet 4 Statutory OT
old_ot_monthly = """      let otLimIdx = 4;
      rows.forEach((r) => {
        const row = wsMonthOt.getRow(otLimIdx);
        const dayOtHours = Math.round(((r.record?.overtime_minutes || 0) / 60) * 10) / 10;
        const monthOtEst = Math.round(dayOtHours * 12 * 10) / 10;
        const utilPct = Math.round((monthOtEst / 20.0) * 100);
        const status = monthOtEst > 20.0 ? 'EXCEEDED' : (monthOtEst >= 16.0 ? 'APPROACHING CAP' : 'COMPLIANT');

        row.getCell(1).value = r.emp.employee_code || '';
        row.getCell(2).value = r.record?.employee_name || '';
        row.getCell(3).value = r.emp.department_name || r.emp.department || 'General';
        row.getCell(4).value = r.emp.designation_title || r.emp.designation || 'Staff';
        row.getCell(5).value = `${dayOtHours}h`;
        row.getCell(6).value = `${monthOtEst}h`;"""

new_ot_monthly = """      let otLimIdx = 4;
      const monthEmpLedger = options.monthlyEmployeeLedger || [];
      const monthOtSource = monthEmpLedger.length > 0 ? monthEmpLedger : rows.map(r => ({
        employeeCode: r.emp.employee_code || '',
        employeeName: r.record?.employee_name || '',
        department: r.emp.department_name || r.emp.department || 'General',
        designation: r.emp.designation_title || r.emp.designation || 'Staff',
        totalOtMinutes: r.record?.overtime_minutes || 0,
      }));

      monthOtSource.forEach((empItem: any) => {
        const row = wsMonthOt.getRow(otLimIdx);
        const actualMonthOt = Math.round((empItem.totalOtMinutes / 60) * 10) / 10;
        const utilPct = Math.round((actualMonthOt / 20.0) * 100);
        const status = actualMonthOt > 20.0 ? 'EXCEEDED' : (actualMonthOt >= 16.0 ? 'APPROACHING CAP' : 'COMPLIANT');

        row.getCell(1).value = empItem.employeeCode;
        row.getCell(2).value = empItem.employeeName;
        row.getCell(3).value = empItem.department;
        row.getCell(4).value = empItem.designation;
        row.getCell(5).value = `${actualMonthOt}h`;
        row.getCell(6).value = `${actualMonthOt}h`;"""

if old_ot_monthly in code:
    code = code.replace(old_ot_monthly, new_ot_monthly)
    print("Replaced monthly OT calculation with actual database values")
else:
    print("Monthly OT target not found")

# Replace Monthly Sheet 6 Master Ledger
old_ledger_monthly = """      let mLedIdx = 4;
      rows.forEach((r) => {
        const row = wsMonthLedger.getRow(mLedIdx);
        const isPres = r.record?.status === 'Present' || !!r.record?.first_check_in;
        const presDays = isPres ? curDayNum - 2 : Math.max(0, curDayNum - 6);
        const attPct = Math.round((presDays / curDayNum) * 100);
        const workHours = Math.round(presDays * 8.2);

        row.getCell(1).value = r.emp.employee_code || '';
        row.getCell(2).value = r.record?.employee_name || '';
        row.getCell(3).value = r.emp.department_name || r.emp.department || 'General';
        row.getCell(4).value = r.emp.designation_title || r.emp.designation || 'Staff';
        row.getCell(5).value = r.shift?.shift_code || 'GEN-09';
        row.getCell(6).value = `${curDayNum} Days`;
        row.getCell(7).value = `${presDays} Days`;
        row.getCell(8).value = (r.record?.late_minutes || 0) > 0 ? '1 Day' : '0 Days';
        row.getCell(9).value = `${workHours}h 00m`;
        row.getCell(10).value = `${attPct}%`;"""

new_ledger_monthly = """      let mLedIdx = 4;
      const monthLedgerSource = (options.monthlyEmployeeLedger && options.monthlyEmployeeLedger.length > 0)
        ? options.monthlyEmployeeLedger
        : rows.map(r => ({
            employeeCode: r.emp.employee_code || '',
            employeeName: r.record?.employee_name || '',
            department: r.emp.department_name || r.emp.department || 'General',
            designation: r.emp.designation_title || r.emp.designation || 'Staff',
            shift: r.shift?.shift_code || 'GEN-09',
            scheduledDays: curDayNum,
            presentDays: (r.record?.status === 'Present' || !!r.record?.first_check_in) ? 1 : 0,
            lateDays: (r.record?.late_minutes || 0) > 0 ? 1 : 0,
            totalWorkMinutes: r.record?.total_work_minutes || r.record?.net_working_minutes || 0,
            attendancePct: (r.record?.status === 'Present' || !!r.record?.first_check_in) ? 100 : 0,
          }));

      monthLedgerSource.forEach((empItem: any) => {
        const row = wsMonthLedger.getRow(mLedIdx);
        const workHoursStr = formatMinutesToHoursStr(empItem.totalWorkMinutes);
        row.getCell(1).value = empItem.employeeCode;
        row.getCell(2).value = empItem.employeeName;
        row.getCell(3).value = empItem.department;
        row.getCell(4).value = empItem.designation;
        row.getCell(5).value = empItem.shift || 'GEN-09';
        row.getCell(6).value = `${empItem.scheduledDays} Days`;
        row.getCell(7).value = `${empItem.presentDays} Days`;
        row.getCell(8).value = `${empItem.lateDays} Days`;
        row.getCell(9).value = workHoursStr;
        row.getCell(10).value = `${empItem.attendancePct}%`;"""

if old_ledger_monthly in code:
    code = code.replace(old_ledger_monthly, new_ledger_monthly)
    print("Replaced monthly master ledger with actual database values")
else:
    print("Monthly master ledger target not found")

with open(excel_file, "w", encoding="utf-8") as f:
    f.write(code)

print(f"Updated excelGenerator.ts: {len(code)} characters")
