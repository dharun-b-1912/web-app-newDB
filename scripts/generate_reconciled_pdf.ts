import fs from 'fs';
import path from 'path';
if (fs.existsSync('.env')) {
  process.loadEnvFile('.env');
}
import { createClient } from '@supabase/supabase-js';
import { attendanceReportExportService, AttendanceReportRow, AttendanceExportOptions } from '../src/services/attendance/attendanceReportExportService';
import { ClassifiedPunchEvent } from '../src/services/attendance/attendanceClassificationEngine';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

function formatTo12HourTime(timeStr?: string | null): string {
  if (!timeStr) return '—';
  try {
    if (timeStr.includes('T') || (timeStr.includes('-') && timeStr.length > 10)) {
      const d = new Date(timeStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
      }
    }
    const ampmMatch = timeStr.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (ampmMatch) {
      let h = parseInt(ampmMatch[1], 10);
      const m = ampmMatch[2];
      const ampm = ampmMatch[3];
      if (ampm) {
        return `${h}:${m} ${ampm.toUpperCase()}`;
      }
      const period = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${h12}:${m} ${period}`;
    }
    return timeStr;
  } catch {
    return timeStr;
  }
}

function parseTimeToMin(val?: string | null): number | null {
  if (!val || typeof val !== 'string') return null;
  const str = val.trim();
  if (!str || str === '—' || str.includes('In Shift')) return null;
  if (str.includes('T') || (str.includes('-') && str.length > 10)) {
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const istDate = new Date(d.getTime() + (5 * 60 + 30) * 60 * 1000);
      return istDate.getUTCHours() * 60 + istDate.getUTCMinutes();
    }
  }
  const ampmMatch = str.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)/i);
  if (ampmMatch) {
    let h = parseInt(ampmMatch[1], 10);
    const m = parseInt(ampmMatch[2], 10);
    if (ampmMatch[3].toUpperCase() === 'PM' && h < 12) h += 12;
    if (ampmMatch[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  }
  const parts = str.split(':');
  if (parts.length >= 2) {
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (!isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59) return h * 60 + m;
  }
  return null;
}

async function run() {
  console.log('=== GENERATING AUDITED RECONCILED MIS REPORT ===');
  const orgId = process.env.ORGANIZATION_ID || '0c621892-e938-4707-9957-13534ea32c19';
  const todayStr = process.argv[2] || process.env.REPORT_DATE || '2026-10-23';
  const cutoffTime = process.argv[3] || process.env.REPORT_CUTOFF || '10:31 AM';

  const [y, m, d] = todayStr.split('-').map(Number);
  const prevDate = new Date(Date.UTC(y, m - 1, d));
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);
  const yesterdayStr = prevDate.toISOString().split('T')[0];

  // 1. Fetch Employees
  const { data: emps, error: empErr } = await supabase
    .from('employees')
    .select('id, employee_code, first_name, last_name, display_name, department_id, designation_id')
    .is('deleted_at', null)
    .order('employee_code', { ascending: true });

  if (empErr || !emps) {
    throw new Error(`Failed to fetch employees: ${empErr?.message}`);
  }
  console.log(`Fetched ${emps.length} active employees.`);

  // 2. Fetch Departments & Designations & Shifts
  const { data: depts } = await supabase.from('departments').select('id, name, code');
  const deptMap = new Map((depts || []).map(d => [d.id, d.name]));

  const { data: desigs } = await supabase.from('designations').select('id, title, code');
  const desigMap = new Map((desigs || []).map(d => [d.id, d.title]));

  const { data: shifts } = await supabase.from('shifts').select('*');
  const shiftMap = new Map((shifts || []).map(s => [s.id, s]));

  // 3. Fetch Daily Records for Today
  const { data: dailyToday } = await supabase
    .from('attendance_daily')
    .select('*')
    .eq('attendance_date', todayStr);
  const dailyTodayMap = new Map((dailyToday || []).map(d => [d.employee_id, d]));

  // 4. Fetch Daily Records for Yesterday (DoD)
  const { data: dailyYesterday } = await supabase
    .from('attendance_daily')
    .select('*')
    .eq('attendance_date', yesterdayStr);

  // 5. Fetch Punches for Today (only accepted punches for todayStr before cutoff)
  const { data: punchesData } = await supabase
    .from('attendance_punches')
    .select('*, employees(employee_code, first_name, last_name, display_name)')
    .eq('organization_id', orgId)
    .or(`attendance_date.eq.${todayStr},and(attendance_date.is.null,punch_time.gte.${todayStr}T00:00:00+05:30,punch_time.lte.${todayStr}T23:59:59+05:30)`)
    .order('punch_time', { ascending: true });

  const punchMap = new Map<string, any[]>();
  (punchesData || []).forEach(p => {
    const list = punchMap.get(p.employee_id) || [];
    list.push(p);
    punchMap.set(p.employee_id, list);
  });

  // Calculate cutoff minutes dynamically
  const cutoffMins = parseTimeToMin(cutoffTime) ?? (10 * 60 + 31);

  // 6. Build AttendanceReportRow[]
  const rows: AttendanceReportRow[] = emps.map(emp => {
    const rec = dailyTodayMap.get(emp.id) || {};
    const empPunches = punchMap.get(emp.id) || [];

    const inPunch = empPunches.find(p => p.punch_type === 'IN' || p.punch_type === 'CHECK_IN') || empPunches[0];
    const outPunch = empPunches.slice().reverse().find(p => p.punch_type === 'OUT' || p.punch_type === 'CHECK_OUT') || (empPunches.length > 1 ? empPunches[empPunches.length - 1] : undefined);

    const shiftId = rec.shift_id || 'f847c561-4bbb-4b9f-a2dd-003162897eef';
    const shift = shiftMap.get(shiftId) || {
      shift_code: 'GEN-09',
      name: 'General Corporate Shift',
      start_time: '09:00:00',
      end_time: '18:00:00',
      grace_entry_minutes: 15,
      grace_exit_minutes: 15,
    };

    const rawFirstIn = rec.first_check_in || inPunch?.punch_time || null;
    const rawLastOut = rec.last_check_out || outPunch?.punch_time || null;

    const inMins = parseTimeToMin(rawFirstIn);
    const shiftStartMins = parseTimeToMin(shift.start_time);
    let calcLateMins = 0;
    if (inMins !== null && shiftStartMins !== null) {
      const grace = shift.grace_entry_minutes ?? 15;
      if (inMins > shiftStartMins + grace) {
        calcLateMins = inMins - shiftStartMins;
      }
    }

    let workMins = 0;
    if (rawFirstIn && !rawLastOut && inMins !== null) {
      if (cutoffMins >= inMins) {
        workMins = cutoffMins - inMins;
      }
    } else if (rawFirstIn && rawLastOut) {
      const outM = parseTimeToMin(rawLastOut);
      if (inMins !== null && outM !== null && outM >= inMins) {
        workMins = outM - inMins;
      }
    }

    const cleanStatus = rawFirstIn ? (calcLateMins > 0 ? 'Late (Working)' : 'Present') : 'Not Checked In';

    return {
      emp: {
        ...emp,
        code: emp.employee_code,
        department: deptMap.get(emp.department_id) || 'General',
        designation: desigMap.get(emp.designation_id) || 'Staff',
      },
      record: {
        ...rec,
        employee_id: emp.id,
        employee_code: emp.employee_code,
        raw_first_check_in: rawFirstIn,
        raw_last_check_out: rawLastOut,
        first_check_in: rawFirstIn ? formatTo12HourTime(rawFirstIn) : null,
        last_check_out: rawLastOut ? formatTo12HourTime(rawLastOut) : null,
        check_in_source: inPunch?.punch_source || (rawFirstIn ? 'BIOMETRIC' : null),
        total_work_minutes: workMins,
        net_working_minutes: workMins,
        late_entry_minutes: calcLateMins,
        late_minutes: calcLateMins,
        status: cleanStatus,
      },
      shift: {
        ...shift,
        shift_code: shift.code || shift.name,
      },
      roster: null as any,
    };
  });

  // 7. Build ClassifiedPunchEvent[] (all punches up to cutoff)
  const classifiedPunches: ClassifiedPunchEvent[] = [];
  (punchesData || []).forEach(p => {
    const pTimeMins = parseTimeToMin(p.punch_time);
    if (pTimeMins !== null && pTimeMins > cutoffMins) {
      // Punches after cutoff time are omitted from morning snapshot
      return;
    }

    const emp = p.employees || {};
    const pSrc = String(p.punch_source || '').toUpperCase();
    const isBio = pSrc.includes('BIO') || p.verification_mode === 'FACE' || p.verification_mode === 'FINGER';
    const isWeb = pSrc.includes('WEB');
    const isMobile = pSrc.includes('MOB') || (!isBio && !isWeb);

    let deviceLabel = 'Biometric Terminal HQ';
    let verifLabel = 'FACIAL / FINGER';
    let reasonLabel = 'Verified Biometric Terminal Event';

    if (isWeb) {
      deviceLabel = 'Joy Web Portal';
      verifLabel = 'BROWSER GEOLOCATION';
      reasonLabel = 'Verified Web Browser Geo-Punch';
    } else if (isMobile) {
      deviceLabel = 'Joy PeopleHR Mobile App';
      verifLabel = 'MOBILE GPS GEOFENCE';
      reasonLabel = 'Verified Mobile App GPS Geofence Punch';
    }

    classifiedPunches.push({
      employee_id: p.employee_id,
      employee_code: emp.employee_code || '—',
      employee_name: emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'Employee',
      punch_time: p.punch_time,
      timestamp: p.punch_time,
      event_time_str: formatTo12HourTime(p.punch_time),
      punch_type: p.punch_type || 'CHECK_IN',
      device_name: deviceLabel,
      verification_method: verifLabel as any,
      classification_reason: reasonLabel,
    });
  });

  console.log(`Total punches up to cutoff 10:31 AM: ${classifiedPunches.length}`);

  const exportOptions: AttendanceExportOptions = {
    companyName: 'Joy Corporate Solutions Pvt. Ltd.',
    reportDate: todayStr,
    reportType: 'MORNING_CHECKIN',
    cutoffTime: cutoffTime,
    yesterdayRows: dailyYesterday || [],
  };

  const pdfRes = await attendanceReportExportService.generatePdfDocument(rows, classifiedPunches, exportOptions);
  console.log(`Generated PDF: ${pdfRes.filename}, Size: ${pdfRes.buffer.length} bytes`);

  const outputDir = path.resolve('Test Data/MIS REPORT TEST');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, 'JOY_Morning_Snapshot_2026-10-23_Reconciled.pdf');
  fs.writeFileSync(outputPath, Buffer.from(pdfRes.buffer));
  console.log(`Successfully saved reconciled PDF to: ${outputPath}`);
}

run().catch(console.error);
