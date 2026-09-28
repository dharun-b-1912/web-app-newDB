import * as fs from 'fs';
import * as path from 'path';
import { UniversalWorkbookInspector } from '../src/services/vendor/universalSheetParsers/index';

async function testCompleteDynamicBuilder() {
  const filePath = path.join(process.cwd(), 'Test Data', 'JOY SEP IN & OUT.xlsx');
  const buffer = fs.readFileSync(filePath);
  const file = new File([buffer], 'JOY SEP IN & OUT.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const inspection = await UniversalWorkbookInspector.inspectWorkbook(file);
  const attSheet = inspection.sheets['IN&OUT'];
  const mrSheet = inspection.sheets['MR REPORT'];
  const otSheet = inspection.sheets['OT'];

  const attRecords = attSheet?.attendanceData?.records || [];
  const mrRecords = mrSheet?.mrData?.records || [];
  const otRecords = otSheet?.otData?.records || [];

  console.log(`Parsed dynamically: ${attRecords.length} attendance rows, ${mrRecords.length} MR rows, ${otRecords.length} OT rows`);

  // Build employee punches map
  const empPunchesMap = new Map<string, any[]>();
  attRecords.forEach((r) => {
    const list = empPunchesMap.get(r.employeeId) || [];
    list.push(r);
    empPunchesMap.set(r.employeeId, list);
  });

  // Build OT lookup map from parsed OT records
  const otLookup = new Map<string, { totalOt: number; otDays: number; dailyOt: Record<string, number> }>();
  otRecords.forEach((ot) => {
    otLookup.set(ot.employeeId, {
      totalOt: ot.totalOtHours || 0,
      otDays: ot.otDaysCount || 0,
      dailyOt: ot.dailyOt || {},
    });
  });

  // Dynamically calculate employee summaries
  const summaries = mrRecords.map((mr, idx) => {
    const punches = empPunchesMap.get(mr.employeeId) || [];
    const inoutPresentDays = punches.reduce((sum, p) => {
      const s1 = (p.firstHalf || 'P').toUpperCase();
      const s2 = (p.secondHalf || 'P').toUpperCase();
      const isPresent = s1 === 'P' || s2 === 'P' || s1 === 'WP' || s2 === 'WP';
      return sum + (isPresent ? 1 : 0);
    }, 0);

    const mrPresentDays = mr.presentDays || 0;
    const diff = Math.abs(inoutPresentDays - mrPresentDays);
    const ot = otLookup.get(mr.employeeId) || { totalOt: mr.otHours || 0, otDays: mr.otGte4hDays || 0, dailyOt: {} };

    let auditStatus = 'MATCHED';
    let rootCause = 'Exact match: IN&OUT biometric days equal MR REPORT declared days';

    if (punches.length === 0) {
      auditStatus = 'NO_ATTENDANCE';
      rootCause = 'Worker listed in Master roster but has 0 punches in IN&OUT';
    } else if (diff > 0) {
      auditStatus = 'POLICY_DIFFERENCE';
      rootCause = `Source Conflict / Policy: ${inoutPresentDays} biometric punch days + ${diff} approved On-Duty (OD) days recorded on MR REPORT`;
    }

    return {
      s_no: mr.sourceSerialNumber || idx + 1,
      employee_id: mr.employeeId,
      employee_name: mr.employeeName,
      department: mr.department,
      present_days: mrPresentDays,
      absent_days: mr.lop || 0,
      weekly_off_days: mr.weeklyOff || 0,
      ot_hours: ot.totalOt,
      ot_days: ot.otDays,
      inout_present_days: inoutPresentDays,
      mr_present_days: mrPresentDays,
      difference_days: diff,
      status: punches.length > 0 ? 'ACTIVE' : 'INACTIVE',
      audit_status: auditStatus,
      root_cause: rootCause,
    };
  });

  // Calculate dynamic stats
  const totalOtHours = summaries.reduce((s, e) => s + e.ot_hours, 0);
  const totalPresentDays = summaries.reduce((s, e) => s + e.present_days, 0);
  const totalWeeklyOff = summaries.reduce((s, e) => s + e.weekly_off_days, 0);
  const totalLOP = summaries.reduce((s, e) => s + e.absent_days, 0);

  console.log('Dynamic Stats:');
  console.log('  Total Workers:', summaries.length);
  console.log('  Total Present Days:', totalPresentDays);
  console.log('  Total OT Hours:', totalOtHours);
  console.log('  Total Weekly Off:', totalWeeklyOff);
  console.log('  Total LOP:', totalLOP);
  console.log('  Matched Count:', summaries.filter((e) => e.audit_status === 'MATCHED').length);
  console.log('  Mismatch / Policy Diff Count:', summaries.filter((e) => e.audit_status !== 'MATCHED').length);
}

testCompleteDynamicBuilder().catch(console.error);
