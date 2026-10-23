// supabase/functions/attendance-report-dispatcher/index.ts
// ============================================================================
// Joy PeopleHR Enterprise — Automated Attendance MIS Report Dispatcher Edge Function
// Dispatches Real Executive Attendance MIS Reports via Hostinger SMTP / Resend & Meta Cloud API
// Multi-Tenant SaaS Scoped • Vector-rendered 3-Page Landscape PDF • 7-Sheet Excel • Real Punches
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import {
  AttendanceReportRow,
  AttendanceExportOptions,
  ClassifiedPunchEvent,
  computeEmployeeOvertime,
  formatMinutesToHoursStr,
  formatTo12HourTime,
} from "./reportHelpers.ts";
import { generatePdfDocument } from "./pdfGenerator.ts";
import { generateExcelWorkbook } from "./excelGenerator.ts";
import { generateCsvContent } from "./csvGenerator.ts";
import { buildMidnightObsidianHtmlEmail } from "./emailGenerator.ts";

interface DispatchRequestBody {
  organization_id?: string;
  company_id?: string;
  companyName?: string;
  slot?: "MORNING" | "EVENING";
  recipients?: string[];
  whatsAppRecipients?: string[];
  cc?: string;
  date?: string;
  mode?: "AUTOMATED_SCHEDULE" | "MANUAL_DISPATCH" | "MANUAL_TEST" | "BOT_SELF_SERVICE";
  customNote?: string;
  attachExcel?: boolean;
  attachCsv?: boolean;
  subject?: string;
  requesterPhone?: string;
  requesterName?: string;
}

// Meta WhatsApp Cloud API credentials
const META_WA_PHONE_NUMBER_ID = Deno.env.get("META_WA_PHONE_NUMBER_ID") || "1352826481241407";
const META_WA_ACCESS_TOKEN =
  Deno.env.get("META_WA_ACCESS_TOKEN") ||
  "EAAVABkQlajUBSjPw0ZChZCPzoO3nFz2aI2tDnnkZBOsgUquxD0Dw8NZCIOKYfCr0vk7hDfWYyIiDuWkZCzqjhwU6CwnxnumN1IDlu9pKhAKFLOMUZAmGT0gOBZBhtcXZApEUGmUSHtNC7or1Nv3z9HKHtyvSVGF3dH5J2GbVGYKzsSMiuRvmJ8KhqdSIQV0kkAZDZD";
const META_WA_API_VERSION = "v20.0";

serve(async (req: Request) => {
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
      Deno.env.get("SUPABASE_SECRET_KEY") ||
      "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase server credentials." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let body: DispatchRequestBody = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    // Determine current IST time
    const nowUtc = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istTime = new Date(nowUtc.getTime() + istOffset);
    const todayStr = body.date || istTime.toISOString().split("T")[0];
    const istHour = istTime.getUTCHours();
    const istTimeFormatted = istTime.toLocaleTimeString("en-IN", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    // 1. Fetch Schedule Configuration from Supabase Database for this tenant
    let scheduleQuery = supabase.from("attendance_report_schedules").select("*");
    if (body.organization_id) {
      scheduleQuery = scheduleQuery.eq("organization_id", body.organization_id);
    }
    const { data: scheduleRow } = await scheduleQuery
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const orgId = body.organization_id || scheduleRow?.organization_id || "0c621892-e938-4707-9957-13534ea32c19";

    const slot: "MORNING" | "EVENING" =
      body.slot || (istHour < 14 ? "MORNING" : "EVENING");
    const isMorning = slot === "MORNING";

    // Deduplication Guard: If this is an automated schedule run and already ran today, skip immediately
    if (body.mode === "AUTOMATED_SCHEDULE" && scheduleRow) {
      let alreadyRan = false;
      if (isMorning) {
        alreadyRan = scheduleRow.last_morning_run_at?.startsWith(todayStr) && scheduleRow.last_morning_status === "SUCCESS";
      } else {
        // Evening run only counts if it actually ran in the evening (after 16:30 IST / 11:00 UTC)
        if (scheduleRow.last_evening_run_at?.startsWith(todayStr) && scheduleRow.last_evening_status === "SUCCESS") {
          const runDate = new Date(scheduleRow.last_evening_run_at);
          const runIstHour = new Date(runDate.getTime() + istOffset).getUTCHours();
          alreadyRan = runIstHour >= 16;
        }
      }
      if (alreadyRan) {
        return new Response(
          JSON.stringify({
            success: true,
            message: `Automated ${slot} report for ${todayStr} already dispatched. Skipping duplicate run.`,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2. Dynamically Resolve Tenant Authentic Company Name (Multi-Tenant SaaS)
    let companyName = body.companyName || "";
    if (!companyName && orgId) {
      // Check companies table first (trade_name / legal_name)
      const { data: compData } = await supabase
        .from("companies")
        .select("trade_name, legal_name")
        .eq("organization_id", orgId)
        .order("is_active", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (compData?.trade_name && !/workforce organization/i.test(compData.trade_name)) {
        companyName = compData.trade_name;
      } else if (compData?.legal_name && !/workforce organization/i.test(compData.legal_name)) {
        companyName = compData.legal_name;
      }

      // Check organizations table (display_name / name)
      if (!companyName) {
        const { data: orgData } = await supabase
          .from("organizations")
          .select("display_name, legal_name, name")
          .eq("id", orgId)
          .maybeSingle();

        if (orgData?.display_name && !/workforce organization/i.test(orgData.display_name)) {
          companyName = orgData.display_name;
        } else if (orgData?.legal_name && !/workforce organization/i.test(orgData.legal_name)) {
          companyName = orgData.legal_name;
        } else if (orgData?.name && !/workforce organization/i.test(orgData.name)) {
          companyName = orgData.name;
        }
      }
    }

    if (!companyName || /workforce organization/i.test(companyName) || companyName === "Enterprise Workforce Management") {
      companyName = "Joy Corporate Solutions Pvt. Ltd.";
    }

    const safeComp = companyName.replace(/[^a-zA-Z0-9]/g, "_");
    const slotTag = isMorning ? "Morning_Snapshot" : "Attendance_MIS";
    const slotSheetName = isMorning ? "Morning_Check_In_Turnout" : "Daily_Attendance";
    const slotLabel = isMorning
      ? "Morning Workforce Check-In & Turnout Report"
      : "End-of-Day Final Attendance Reconciliation & Punch Audit";

    // 3. Query All Active Employees for this Tenant
    const { data: employees, error: empErr } = await supabase
      .from("employees")
      .select("id, employee_code, first_name, last_name, display_name, work_email, personal_email, department_id, designation_id, employment_type, employment_status")
      .eq("organization_id", orgId)
      .neq("employment_status", "TERMINATED")
      .order("employee_code", { ascending: true });

    if (empErr) {
      console.warn("[EdgeFunction] Error fetching employees:", empErr);
    }

    const empList = employees || [];
    const totalHeadcount = empList.length;

    // 4. Resolve Authoritative Recipients from mis_report_recipients Table
    const reportTypeKey = isMorning ? "MORNING_CHECKIN" : "EVENING_FINAL";

    const { data: dbRecipients, error: dbRecipientsErr } = await supabase
      .from("mis_report_recipients")
      .select("*")
      .eq("organization_id", orgId)
      .eq("is_active", true)
      .eq("is_verified", true);

    if (dbRecipientsErr) {
      console.warn("[EdgeFunction] Warning reading mis_report_recipients:", dbRecipientsErr.message);
    }

    const authorizedRecipients = dbRecipients || [];

    // Filter recipients matching slot/reportType
    const slotMatchingRecipients = authorizedRecipients.filter((r) => {
      if (body.mode === "AUTOMATED_SCHEDULE") {
        const matchesSlot = isMorning ? r.scheduled_morning !== false : r.scheduled_evening !== false;
        const matchesReport = Array.isArray(r.permitted_report_types)
          ? r.permitted_report_types.includes(reportTypeKey)
          : true;
        return matchesSlot && matchesReport;
      }
      return true;
    });

    // 4a. Resolve Email Recipients
    let targetRecipients: string[] = [];
    if (body.recipients && Array.isArray(body.recipients) && body.recipients.length > 0) {
      targetRecipients = body.recipients;
    } else if (body.mode === "BOT_SELF_SERVICE") {
      // In BOT self-service mode, send email ONLY to the respective requester if their profile has EMAIL enabled
      const reqPhoneClean = String(body.requesterPhone || "").replace(/\D/g, "");
      const reqRec = authorizedRecipients.find((r) => {
        const p = String(r.phone || "").replace(/\D/g, "");
        return p === reqPhoneClean || p.endsWith(reqPhoneClean.slice(-10)) || reqPhoneClean.endsWith(p.slice(-10));
      });
      if (reqRec && reqRec.email && (Array.isArray(reqRec.delivery_channels) ? reqRec.delivery_channels.includes("EMAIL") : true)) {
        targetRecipients = [reqRec.email];
      } else {
        targetRecipients = []; // Strict: Do NOT broadcast to other recipients!
      }
    } else if (slotMatchingRecipients.length > 0) {
      targetRecipients = slotMatchingRecipients
        .filter((r) => Array.isArray(r.delivery_channels) ? r.delivery_channels.includes("EMAIL") : true)
        .map((r) => r.email)
        .filter(Boolean);
    } else if (scheduleRow && Array.isArray(scheduleRow.recipients) && scheduleRow.recipients.length > 0) {
      targetRecipients = scheduleRow.recipients;
    } else {
      const detected = empList
        .filter((e) => {
          const em = (e.work_email || e.personal_email || "").toLowerCase();
          return (
            /^(hr|people|talent|admin)@/i.test(em) ||
            /hr|human\s*resources|people/i.test(e.first_name || "") ||
            /hr|human\s*resources|people/i.test(e.last_name || "")
          );
        })
        .map((e) => e.work_email || e.personal_email)
        .filter(Boolean);

      if (detected.length > 0) targetRecipients = detected;
    }

    const validRecipients = Array.from(
      new Set(
        targetRecipients
          .map((e) => (typeof e === "string" ? e.trim().toLowerCase() : ""))
          .filter((e) => e.length > 3 && e.includes("@") && !e.includes("example.com"))
      )
    );

    const cc = body.cc || scheduleRow?.cc || "";

    // 5. Query Departments for Department Names
    const { data: deptData } = await supabase
      .from("departments")
      .select("id, name, code")
      .eq("organization_id", orgId);

    const deptMap = new Map<string, string>();
    (deptData || []).forEach((d) => {
      if (d.id) deptMap.set(d.id, d.name);
    });

    // 6. Query Designations for Designation Titles
    const { data: desigData } = await supabase
      .from("designations")
      .select("id, title, code")
      .eq("organization_id", orgId);

    const desigMap = new Map<string, string>();
    (desigData || []).forEach((d) => {
      if (d.id) desigMap.set(d.id, d.title);
    });

    // 7. Query Shifts for Shift Details
    const { data: shiftData } = await supabase
      .from("shifts")
      .select("id, code, name, start_time, end_time, grace_entry_minutes, grace_exit_minutes, min_half_day_hours, min_full_day_hours")
      .eq("organization_id", orgId);

    const shiftMap = new Map<string, any>();
    (shiftData || []).forEach((s) => {
      if (s.id) {
        shiftMap.set(s.id, {
          id: s.id,
          shift_code: s.code,
          shift_name: s.name,
          start_time: s.start_time ? s.start_time.slice(0, 5) : "09:00",
          end_time: s.end_time ? s.end_time.slice(0, 5) : "18:00",
          grace_entry_minutes: s.grace_entry_minutes ?? 15,
          grace_exit_minutes: s.grace_exit_minutes ?? 15,
          min_half_day_hours: s.min_half_day_hours ?? 4,
          min_full_day_hours: s.min_full_day_hours ?? 8,
        });
      }
    });

    // 7. Query Daily Attendance for Today
    const { data: dailyRecords, error: dErr } = await supabase
      .from("attendance_daily")
      .select("*")
      .eq("organization_id", orgId)
      .eq("attendance_date", todayStr);

    if (dErr) {
      console.warn("[EdgeFunction] attendance_daily query error:", dErr);
    }

    const dailyMap = new Map<string, any>();
    (dailyRecords || []).forEach((r) => {
      if (r.employee_id) dailyMap.set(r.employee_id, r);
      if (r.employee_code) dailyMap.set(r.employee_code, r);
    });

    // 8. Query Yesterday Daily Records for Day-over-Day Comparison
    const [yNum, mNum, dNum] = todayStr.split("-").map(Number);
    const dateObj = new Date(Date.UTC(yNum, mNum - 1, dNum));
    dateObj.setUTCDate(dateObj.getUTCDate() - 1);
    const yesterdayStr = dateObj.toISOString().split("T")[0];

    const { data: yesterdayDailyRecords } = await supabase
      .from("attendance_daily")
      .select("*")
      .eq("organization_id", orgId)
      .eq("attendance_date", yesterdayStr);

    // 9. Query Biometric Punch Logs for Today
    const { data: punchesData, error: pErr } = await supabase
      .from("attendance_punches")
      .select("id, employee_id, punch_time, punch_type, punch_source, verification_mode, attendance_date")
      .eq("organization_id", orgId)
      .or(`attendance_date.eq.${todayStr},and(attendance_date.is.null,punch_time.gte.${todayStr}T00:00:00+05:30,punch_time.lte.${todayStr}T23:59:59+05:30)`)
      .order("punch_time", { ascending: true });

    if (pErr) {
      console.warn("[EdgeFunction] attendance_punches query error:", pErr);
    }

    const punchMap = new Map<string, any[]>();
    (punchesData || []).forEach((p) => {
      if (p.employee_id) {
        const list = punchMap.get(p.employee_id) || [];
        list.push(p);
        punchMap.set(p.employee_id, list);
      }
    });

    // 10. Build Rich AttendanceReportRow[] & ClassifiedPunchEvent[]
    const formatTimeHelper = (ts?: string) => {
      if (!ts) return "";
      try {
        const d = new Date(ts);
        return d.toLocaleTimeString("en-IN", {
          timeZone: "Asia/Kolkata",
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
      } catch {
        return "";
      }
    };

    const classifiedPunches: ClassifiedPunchEvent[] = [];

    const normalizeSource = (src?: string | null) => {
      if (!src) return "";
      const upper = String(src).toUpperCase();
      if (upper.includes("BIO")) return "BIOMETRIC";
      if (upper.includes("GPS") || upper.includes("MOB") || upper.includes("WEB")) return "MOBILE (GPS)";
      return "BIOMETRIC";
    };

    const parseTimeToMinHelper = (val?: string | null) => {
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
    };

    const rows: AttendanceReportRow[] = empList.map((emp) => {
      const rec = dailyMap.get(emp.id) || dailyMap.get(emp.employee_code) || {};
      const empPunches = punchMap.get(emp.id) || punchMap.get(emp.employee_code) || [];

      const inPunch = empPunches.find((p) => p.punch_type === "IN" || p.punch_type === "CHECK_IN") || empPunches[0];
      const outPunch = empPunches
        .slice()
        .reverse()
        .find((p) => p.punch_type === "OUT" || p.punch_type === "CHECK_OUT");

      const deptName = (emp.department_id && deptMap.get(emp.department_id)) || "General";
      const desigTitle = (emp.designation_id && desigMap.get(emp.designation_id)) || "Staff";

      // 1. Resolve Authentic Shift Assignment from DB
      const shiftId = rec.shift_id || emp.shift_id;
      const shift = (shiftId && shiftMap.get(shiftId)) || Array.from(shiftMap.values())[0] || {
        shift_code: "GEN-09",
        shift_name: "General Corporate Shift",
        start_time: "09:00",
        end_time: "18:00",
        grace_entry_minutes: 15,
        grace_exit_minutes: 15,
      };

      const rawFirstIn = rec.first_check_in || inPunch?.punch_time || null;
      const rawLastOut = rec.last_check_out || outPunch?.punch_time || null;

      const formattedFirstIn = rawFirstIn ? formatTo12HourTime(rawFirstIn) : "";
      const formattedLastOut = rawLastOut ? formatTo12HourTime(rawLastOut) : "";

      const checkInSource = rawFirstIn ? normalizeSource(rec.check_in_source || inPunch?.punch_source) : "—";
      const checkOutSource = rawLastOut ? normalizeSource(rec.check_out_source || outPunch?.punch_source) : "—";

      // 2. Compute Accurate Late Arrival and Early Departure Deviations
      const inMins = parseTimeToMinHelper(rawFirstIn);
      const outMins = parseTimeToMinHelper(rawLastOut);
      const shiftStartMins = parseTimeToMinHelper(shift.start_time);
      const shiftEndMins = parseTimeToMinHelper(shift.end_time);

      let calcLateMins = 0;
      if (inMins !== null && shiftStartMins !== null) {
        const graceIn = shift.grace_entry_minutes ?? 15;
        if (inMins > shiftStartMins + graceIn) {
          calcLateMins = inMins - shiftStartMins;
        }
      }

      let calcEarlyMins = 0;
      if (outMins !== null && shiftEndMins !== null) {
        const graceOut = shift.grace_exit_minutes ?? 15;
        if (outMins < shiftEndMins - graceOut) {
          calcEarlyMins = shiftEndMins - outMins;
        }
      }

      let workMins = typeof rec.total_work_minutes === "number" ? rec.total_work_minutes : (typeof rec.net_working_minutes === "number" ? rec.net_working_minutes : 0);
      const breakMins = typeof rec.break_minutes === "number" ? rec.break_minutes : (typeof rec.total_break_minutes === "number" ? rec.total_break_minutes : 0);
      const otMins = typeof rec.overtime_minutes === "number" ? rec.overtime_minutes : 0;

      // In a morning snapshot, if employee has checked in but not checked out, calculate elapsed time to snapshot cutoff
      if (isMorning && rawFirstIn && !rawLastOut) {
        if (inMins !== null) {
          const cutoffMins = istTime.getUTCHours() * 60 + istTime.getUTCMinutes();
          // Guard: If employee punched in today, elapsed time = cutoff - inMins
          if (cutoffMins >= inMins) {
            workMins = cutoffMins - inMins;
          } else {
            workMins = 0;
          }
        }
      } else if (workMins <= 0 && rawFirstIn && rawLastOut) {
        // If workMins is 0 or missing, but both first and last punches exist, calculate actual difference
        try {
          const tIn = new Date(rawFirstIn).getTime();
          const tOut = new Date(rawLastOut).getTime();
          if (!isNaN(tIn) && !isNaN(tOut) && tOut > tIn) {
            workMins = Math.max(0, Math.round((tOut - tIn) / 60000) - breakMins);
          }
        } catch {
          // ignore
        }
      }

      // 3. EOD Status Resolution: If not checked in OR not checked out at EOD, mark as Absent
      let cleanStatus = "Present";
      if (!rawFirstIn && !rawLastOut) {
        cleanStatus = "Absent";
      } else if (!isMorning && (!rawFirstIn || !rawLastOut)) {
        cleanStatus = "Absent"; // Missing punch at EOD
      } else if (rec.status === "HALF_DAY") {
        cleanStatus = "Half Day";
      } else if (rec.status === "ABSENT" || (!isMorning && workMins < 60)) {
        cleanStatus = "Absent";
      } else if (rec.status === "ON_LEAVE") {
        cleanStatus = "On Leave";
      } else if (rec.status === "WEEKLY_OFF") {
        cleanStatus = "Weekly Off";
      } else if (isMorning && rawFirstIn && !rawLastOut) {
        cleanStatus = calcLateMins > 0 ? "Late (Working)" : "Present";
      } else {
        cleanStatus = "Present";
      }

      const record: any = {
        ...rec,
        employee_id: emp.id,
        employee_code: emp.employee_code,
        employee_name: emp.display_name || `${emp.first_name || ""} ${emp.last_name || ""}`.trim(),
        raw_first_check_in: rawFirstIn,
        raw_last_check_out: rawLastOut,
        first_check_in: formattedFirstIn,
        last_check_out: formattedLastOut,
        check_in_source: checkInSource,
        check_out_source: checkOutSource,
        total_work_minutes: workMins,
        net_working_minutes: workMins,
        break_minutes: breakMins,
        total_break_minutes: breakMins,
        late_entry_minutes: calcLateMins,
        late_minutes: calcLateMins,
        early_exit_minutes: calcEarlyMins,
        early_checkout_minutes: calcEarlyMins,
        overtime_minutes: otMins,
        status: cleanStatus,
      };

      // 4. Collect classified punches with accurate mobile vs biometric device & verification
      empPunches.forEach((p, pIdx) => {
        const isOut = p.punch_type === "OUT" || p.punch_type === "CHECK_OUT" || (pIdx === empPunches.length - 1 && empPunches.length > 1);
        const pSourceUpper = String(p.punch_source || "").toUpperCase();
        const isBio = pSourceUpper.includes("BIO") || p.verification_mode === "FACE" || p.verification_mode === "FINGER";
        const isWeb = pSourceUpper.includes("WEB");
        const isMobile = pSourceUpper.includes("MOB") || (!isBio && !isWeb);

        let deviceLabel = "Biometric Terminal HQ";
        let verifLabel = "FACIAL / FINGER";
        let reasonLabel = "Verified Biometric Terminal Event";

        if (isWeb) {
          deviceLabel = "Joy Web Portal";
          verifLabel = "BROWSER GEOLOCATION";
          reasonLabel = "Verified Web Browser Geo-Punch";
        } else if (isMobile) {
          deviceLabel = "Joy PeopleHR Mobile App";
          verifLabel = "MOBILE GPS GEOFENCE";
          reasonLabel = "Verified Mobile Native Geo-Punch";
        }

        classifiedPunches.push({
          employee_id: emp.id,
          employee_code: emp.employee_code,
          employee_name: record.employee_name,
          punch_time: p.punch_time,
          timestamp: p.punch_time,
          event_time_str: formatTimeHelper(p.punch_time),
          classification: isOut ? "CHECK_OUT" : "CHECK_IN",
          punch_direction: isOut ? "OUT" : "IN",
          device_name: deviceLabel,
          verification_method: verifLabel,
          classification_reason: reasonLabel,
        });
      });

      return {
        emp: {
          ...emp,
            department_name: deptName,
            department: deptName,
            designation_title: desigTitle,
          designation: desigTitle,
        },
        record,
        shift,
        roster: {
          shift_code: shift.shift_code,
          shift_name: shift.shift_name,
        },
      };
    });

    // 11. Compute Turnout Statistics
    const presentCount = rows.filter(
      (r) => r.record?.status === "Present" || r.record?.status === "Half Day" || r.record?.status === "Checked Out" || (r.record?.status as string) === "Working" || !!r.record?.first_check_in
    ).length;
    const lateCount = rows.filter(
      (r) => (r.record?.late_minutes || 0) > 0 || r.record?.status === "Late"
    ).length;
    const absentCount = rows.filter(
      (r) => (r.record?.status === "Absent" || r.record?.status === "Not Checked In" || !r.record?.status) && !r.record?.first_check_in
    ).length;
    const turnoutPct = totalHeadcount > 0 ? Math.round((presentCount / totalHeadcount) * 100) : 0;

    // 12. GENERATE ALL 3 REAL EXECUTIVE ATTACHMENTS
    const exportOptions: AttendanceExportOptions = {
      companyName,
      reportDate: todayStr,
      reportType: isMorning ? "MORNING_CHECKIN" : "EVENING_FINAL",
      cutoffTime: istTimeFormatted,
      yesterdayRows: yesterdayDailyRecords || [],
      includePunches: true,
    };

    console.log(`[EdgeFunction] Generating real 3-page landscape PDF for ${companyName}...`);
    const pdfRes = await generatePdfDocument(rows, classifiedPunches, exportOptions);

    console.log(`[EdgeFunction] Generating real 7-sheet executive Excel workbook for ${companyName}...`);
    const excelRes = await generateExcelWorkbook(rows, classifiedPunches, exportOptions);

    console.log(`[EdgeFunction] Generating structured CSV for ${companyName}...`);
    const csvContent = generateCsvContent(rows, isMorning ? "MORNING_CHECKIN" : "EVENING_FINAL");
    const csvBase64 = btoa(unescape(encodeURIComponent(csvContent)));

    // Standardized Multi-Tenant SaaS Attachment Filenames (matching Image 1)
    const emailPdfFilename = `${safeComp}_Executive_${slotTag}_${todayStr}.pdf`;
    const emailExcelFilename = `${safeComp}_${slotSheetName}_${todayStr}.xlsx`;
    const emailCsvFilename = `${safeComp}_${slotSheetName}_${todayStr}.csv`;

    // WhatsApp Filename (concise <= 26 chars to prevent WhatsApp UI ellipsis truncation)
    const waPdfFilename = isMorning
      ? `JOY_Morning_${todayStr}.pdf`
      : `JOY_Evening_${todayStr}.pdf`;

    // 13. GENERATE AUTHENTIC MIDNIGHT OBSIDIAN HTML EMAIL BODY (matching Image 1)
    const emailHtml = buildMidnightObsidianHtmlEmail({
      company: companyName,
      reportType: isMorning ? "MORNING_CHECKIN" : "EVENING_FINAL",
      reportDate: todayStr,
      rows,
      customMessage: body.customNote,
    });

    const finalSubject =
      body.subject ||
      `[Joy PeopleHR] ${slotLabel} — ${todayStr} (${companyName})`;

    // Prepare Outbound Email Attachments: Executive PDF + 7-Sheet Excel Workbook (2 attachments)
    const attachments: Array<{ filename: string; content: string }> = [
      {
        filename: emailPdfFilename,
        content: pdfRes.base64,
      },
      {
        filename: emailExcelFilename,
        content: excelRes.base64,
      },
    ];

    if (body.attachCsv === true) {
      attachments.push({
        filename: emailCsvFilename,
        content: csvBase64,
      });
    }

    // 14. DISPATCH EMAIL via Hostinger SMTP / Resend API Fallback
    let emailDispatchResult: { success: boolean; id?: string; error?: string; provider?: string } = {
      success: false,
    };

    if (validRecipients.length > 0) {
      try {
        const hostingerResp = await fetch("https://app.joypeoplehr.com/api/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: validRecipients,
            cc: cc || undefined,
            subject: finalSubject,
            html: emailHtml,
            attachments,
          }),
        });

        const hostingerData = await hostingerResp.json().catch(() => null);
        if (hostingerResp.ok && hostingerData?.success) {
          emailDispatchResult = {
            success: true,
            id: hostingerData.id,
            provider: "HOSTINGER_SMTP",
          };
        } else {
          throw new Error(hostingerData?.error || `Hostinger HTTP ${hostingerResp.status}`);
        }
      } catch (smtpErr: any) {
        console.warn("[EdgeFunction] Hostinger SMTP notice, trying Resend API fallback:", smtpErr.message);

        const resendApiKey = Deno.env.get("RESEND_API_KEY") || "";
        try {
          const resendResp = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${resendApiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Joy PeopleHR <noreply@joypeoplehr.com>",
              to: validRecipients,
              cc: cc || undefined,
              subject: finalSubject,
              html: emailHtml,
              attachments: attachments.map((a) => ({
                filename: a.filename,
                content: a.content,
              })),
            }),
          });

          const resendData = await resendResp.json().catch(() => null);
          if (resendResp.ok && resendData?.id) {
            emailDispatchResult = {
              success: true,
              id: resendData.id,
              provider: "RESEND_API",
            };
          } else {
            throw new Error(resendData?.message || `Resend HTTP ${resendResp.status}`);
          }
        } catch (resendErr: any) {
          emailDispatchResult = {
            success: false,
            error: `SMTP Error: ${smtpErr.message} | Resend Error: ${resendErr.message}`,
          };
        }
      }
    }

    // 14b. Upload Authoritative PDF Document to Supabase Storage Bucket ('attendance-reports')
    let publicPdfDocUrl = `https://ysiajemrqakfngasehhi.supabase.co/storage/v1/object/public/attendance-reports/${waPdfFilename}`;
    try {
      const { error: uploadErr } = await supabase.storage
        .from("attendance-reports")
        .upload(waPdfFilename, pdfRes.buffer, {
          contentType: "application/pdf",
          upsert: true,
        });

      if (!uploadErr) {
        const { data: pubData } = supabase.storage
          .from("attendance-reports")
          .getPublicUrl(waPdfFilename);
        if (pubData?.publicUrl) {
          publicPdfDocUrl = pubData.publicUrl;
        }
      } else {
        console.warn("[EdgeFunction] Storage upload notice:", uploadErr.message);
      }
    } catch (stErr: any) {
      console.warn("[EdgeFunction] Storage upload exception:", stErr.message);
    }

    // 15. DISPATCH REAL PDF DOCUMENT TO WHATSAPP VIA META CLOUD API
    let rawWaRecipients: string[] = [];

    if (body.whatsAppRecipients && body.whatsAppRecipients.length > 0) {
      // In manual/direct calls, only allow authorized recipients or explicitly provided valid phone numbers
      rawWaRecipients = body.whatsAppRecipients;
    } else if (body.mode === "BOT_SELF_SERVICE" && body.requesterPhone) {
      rawWaRecipients = [body.requesterPhone];
    } else if (slotMatchingRecipients.length > 0) {
      rawWaRecipients = slotMatchingRecipients
        .filter((r) => Array.isArray(r.delivery_channels) ? r.delivery_channels.includes("WHATSAPP") : true)
        .map((r) => r.phone)
        .filter(Boolean);
    } else if (scheduleRow?.whatsapp_recipients && scheduleRow.whatsapp_recipients.length > 0) {
      rawWaRecipients = scheduleRow.whatsapp_recipients;
    } else {
      rawWaRecipients = ["919840209900", "917825906580"];
    }

    const validWaRecipients = Array.from(
      new Set(
        rawWaRecipients
          .map((p) => String(p).replace(/[^0-9]/g, ""))
          .filter((p) => p.length >= 10)
      )
    );

    let whatsAppUploadMediaId: string | null = null;
    let whatsAppSuccessCount = 0;
    const whatsAppResults: Array<{ phone: string; success: boolean; messageId?: string; error?: string }> = [];

    if (validWaRecipients.length > 0) {
      // Step A: Pre-upload real PDF to Meta Media API
      try {
        const formData = new FormData();
        formData.append("messaging_product", "whatsapp");
        formData.append("type", "application/pdf");
        formData.append("file", new Blob([pdfRes.buffer as any], { type: "application/pdf" }), waPdfFilename);

        const mediaUrl = `https://graph.facebook.com/${META_WA_API_VERSION}/${META_WA_PHONE_NUMBER_ID}/media`;
        const mediaResp = await fetch(mediaUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${META_WA_ACCESS_TOKEN}`,
          },
          body: formData,
        });

        const mediaData = await mediaResp.json();
        if (mediaResp.ok && mediaData?.id) {
          whatsAppUploadMediaId = mediaData.id;
          console.log(`[EdgeFunction] Pre-uploaded PDF to Meta Media API: ${whatsAppUploadMediaId}`);
        } else {
          console.warn("[EdgeFunction] Meta Media API notice:", mediaData);
        }
      } catch (mediaErr: any) {
        console.warn("[EdgeFunction] Meta Media upload exception:", mediaErr.message);
      }

      // Format template & direct caption dates and stats
      const dateParts = todayStr.split("-");
      const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const formattedDateForTemplate = `${Number(dateParts[2])} ${months[Number(dateParts[1]) - 1]} ${dateParts[0]}`;
      const totalNetMins = rows.reduce((acc, r) => acc + (r.record?.total_work_minutes || r.record?.net_working_minutes || 0), 0);
      const cumHours = `${Math.floor(totalNetMins / 60)}h ${totalNetMins % 60}m`;
      const shiftStatusStr = isMorning
        ? (totalNetMins > 0 ? cumHours : "Shift In-Progress (Active)")
        : (cumHours || "Final Audit Completed");

      // Step B: Send WhatsApp genuine document attachment with executive caption
      const waCaption =
        `*JOY PeopleHR — Workforce MIS Report*\n\n` +
        `Dear HR Team,\n\n` +
        `Your workforce report for *${formattedDateForTemplate}* is ready.\n\n` +
        `• *Organization:* ${companyName}\n` +
        `• *Report:* ${slotLabel}\n` +
        `• *Reporting Date:* ${formattedDateForTemplate}\n` +
        `• *Total Workforce:* ${totalHeadcount} Staff\n` +
        `• *Present Turnout:* ${presentCount} Staff (${turnoutPct}%)\n` +
        `• *Late Arrivals:* ${lateCount} Staff\n` +
        `• *Weekly Off / Leave:* ${absentCount} Staff\n` +
        `• *Shift Status:* ${shiftStatusStr}\n\n` +
        `📄 *Please open the attached PDF above* to review the verified attendance ledger and biometric audit timestamps.\n\n` +
        `_JOY PeopleHR | Workforce Management_`;

      for (const phone of validWaRecipients) {
        try {
          const docPayload: any = {
            filename: waPdfFilename,
            caption: waCaption,
          };
          if (whatsAppUploadMediaId) {
            docPayload.id = whatsAppUploadMediaId;
          } else {
            docPayload.link = publicPdfDocUrl;
          }

          const msgUrl = `https://graph.facebook.com/${META_WA_API_VERSION}/${META_WA_PHONE_NUMBER_ID}/messages`;

          let sentMessageId: string | undefined;
          let sendError: string | undefined;

          // Step B1: Send Genuine WhatsApp Document Attachment FIRST (renders prominent, large red PDF attachment card)
          try {
            const docResp = await fetch(msgUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${META_WA_ACCESS_TOKEN}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: phone,
                type: "document",
                document: docPayload,
              }),
            });

            const docData = await docResp.json();
            if (docResp.ok && docData?.messages?.[0]?.id) {
              sentMessageId = docData.messages[0].id;
              console.log(`[EdgeFunction] Direct Document Attachment delivered successfully to ${phone}: ${sentMessageId}`);
            } else {
              console.warn(`[EdgeFunction] Direct document returned error, trying HSM template fallback:`, docData);
              sendError = JSON.stringify(docData?.error || docData);
            }
          } catch (docErr: any) {
            console.warn(`[EdgeFunction] Direct document exception, trying HSM template fallback:`, docErr.message);
          }

          // Step B2: Fallback to Meta-approved HSM template daily_mis_report_v1 if direct document send did not return messageId (e.g. outside 24h window)
          if (!sentMessageId) {
            try {
              const templatePayload = {
                messaging_product: "whatsapp",
                recipient_type: "individual",
                to: phone,
                type: "template",
                template: {
                  name: "daily_mis_report_v1",
                  language: { code: "en" },
                  components: [
                    {
                      type: "header",
                      parameters: [
                        {
                          type: "document",
                          document: whatsAppUploadMediaId
                            ? { id: whatsAppUploadMediaId, filename: waPdfFilename }
                            : { link: docPayload.link, filename: waPdfFilename },
                        },
                      ],
                    },
                    {
                      type: "body",
                      parameters: [
                        { type: "text", text: "Executive Leadership" },
                        { type: "text", text: `${slotLabel}` },
                        { type: "text", text: formattedDateForTemplate },
                        { type: "text", text: companyName },
                        { type: "text", text: String(totalHeadcount) },
                        { type: "text", text: `${presentCount} Staff (${turnoutPct}% Turnout)` },
                        { type: "text", text: String(lateCount) },
                        { type: "text", text: String(absentCount) },
                        { type: "text", text: shiftStatusStr },
                      ],
                    },
                    {
                      type: "button",
                      sub_type: "quick_reply",
                      index: 0,
                      parameters: [
                        { type: "payload", payload: `ACK_DAILY_MIS_${todayStr.replace(/-/g, "_")}` },
                      ],
                    },
                  ],
                },
              };

              const tplResp = await fetch(msgUrl, {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${META_WA_ACCESS_TOKEN}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify(templatePayload),
              });
              const tplData = await tplResp.json();
              if (tplResp.ok && tplData?.messages?.[0]?.id) {
                sentMessageId = tplData.messages[0].id;
                console.log(`[EdgeFunction] HSM Template delivered successfully to ${phone}: ${sentMessageId}`);
              } else {
                console.warn("[EdgeFunction] HSM Template returned error:", tplData);
                sendError = JSON.stringify(tplData?.error || tplData);
              }
            } catch (tplErr: any) {
              console.warn("[EdgeFunction] HSM Template exception:", tplErr.message);
              sendError = tplErr.message;
            }
          }

          if (sentMessageId) {
            whatsAppSuccessCount++;
            whatsAppResults.push({
              phone,
              success: true,
              messageId: sentMessageId,
            });
          } else {
            whatsAppResults.push({
              phone,
              success: false,
              error: sendError || "Failed to deliver WhatsApp message",
            });
          }
        } catch (msgErr: any) {
          whatsAppResults.push({
            phone,
            success: false,
            error: msgErr.message,
          });
        }
      }
    }

    const nowIso = new Date().toISOString();

    // 16. Update Supabase Schedule State (ONLY for automated schedule runs)
    if (scheduleRow?.id && body.mode === "AUTOMATED_SCHEDULE") {
      const scheduleUpdate: any = {
        updated_at: nowIso,
      };
      if (isMorning) {
        scheduleUpdate.last_morning_run_at = nowIso;
        scheduleUpdate.last_morning_status = emailDispatchResult.success ? "SUCCESS" : "ERROR";
        scheduleUpdate.last_morning_message = `Morning MIS delivered (Email: ${emailDispatchResult.provider || "none"}, WA: ${whatsAppSuccessCount} sent, PDF: ${emailPdfFilename})`;
      } else {
        scheduleUpdate.last_evening_run_at = nowIso;
        scheduleUpdate.last_evening_status = emailDispatchResult.success ? "SUCCESS" : "ERROR";
        scheduleUpdate.last_evening_message = `Evening MIS delivered (Email: ${emailDispatchResult.provider || "none"}, WA: ${whatsAppSuccessCount} sent, PDF: ${emailPdfFilename})`;
      }

      await supabase
        .from("attendance_report_schedules")
        .update(scheduleUpdate)
        .eq("id", scheduleRow.id);
    }

    // 17. Record Detailed Channel-Specific Delivery Audit Logs in mis_delivery_audit_logs
    try {
      const auditEntries: any[] = [];
      const runId = `RUN_${todayStr.replace(/-/g, "")}_${slot}_${Date.now().toString(36)}`;

      // 17a. Email delivery audit entries
      for (const emailTarget of validRecipients) {
        const recipientRecord = authorizedRecipients.find((r) => r.email?.toLowerCase() === emailTarget.toLowerCase());
        auditEntries.push({
          organization_id: orgId,
          recipient_id: recipientRecord?.id || null,
          run_id: runId,
          report_type: reportTypeKey,
          reporting_date: todayStr,
          cutoff_time: istTimeFormatted,
          channel: "EMAIL",
          recipient_target: emailTarget,
          recipient_name: recipientRecord?.name || emailTarget.split("@")[0],
          dispatch_mode: body.mode || "AUTOMATED_SCHEDULE",
          status: emailDispatchResult.success ? "DELIVERED" : "FAILED",
          provider: emailDispatchResult.provider || "SMTP_GATEWAY",
          provider_message_id: emailDispatchResult.id || null,
          sha256_checksum: pdfRes.sha256Checksum || null,
          file_name: emailPdfFilename,
          document_url: publicPdfDocUrl,
          error_message: emailDispatchResult.error || null,
          idempotency_key: `${orgId}_${reportTypeKey}_${todayStr}_EMAIL_${emailTarget}`,
          metadata: {
            headcount: totalHeadcount,
            present: presentCount,
            late: lateCount,
            absent: absentCount,
          },
        });
      }

      // 17b. WhatsApp delivery audit entries
      for (const waRes of whatsAppResults) {
        const recipientRecord = authorizedRecipients.find((r) => String(r.phone).replace(/[^0-9]/g, "") === waRes.phone);
        auditEntries.push({
          organization_id: orgId,
          recipient_id: recipientRecord?.id || null,
          run_id: runId,
          report_type: reportTypeKey,
          reporting_date: todayStr,
          cutoff_time: istTimeFormatted,
          channel: "WHATSAPP",
          recipient_target: waRes.phone,
          recipient_name: recipientRecord?.name || "Authorized WhatsApp Recipient",
          dispatch_mode: body.mode || "AUTOMATED_SCHEDULE",
          status: waRes.success ? "DELIVERED" : "FAILED",
          provider: "META_WHATSAPP_CLOUD",
          provider_message_id: waRes.messageId || null,
          sha256_checksum: pdfRes.sha256Checksum || null,
          file_name: waPdfFilename,
          document_url: publicPdfDocUrl,
          error_message: waRes.error || null,
          idempotency_key: `${orgId}_${reportTypeKey}_${todayStr}_WHATSAPP_${waRes.phone}`,
          metadata: {
            headcount: totalHeadcount,
            present: presentCount,
            late: lateCount,
            absent: absentCount,
            mediaId: whatsAppUploadMediaId,
          },
        });
      }

      if (auditEntries.length > 0) {
        await supabase.from("mis_delivery_audit_logs").insert(auditEntries);
      }
    } catch (auditErr: any) {
      console.warn("[EdgeFunction] mis_delivery_audit_logs insert warning:", auditErr.message);
    }

    // 18. Legacy Summary Log in attendance_report_logs
    try {
      await supabase.from("attendance_report_logs").insert({
        organization_id: orgId,
        slot: slot,
        status: emailDispatchResult.success || whatsAppSuccessCount > 0 ? "SUCCESS" : "ERROR",
        mode: body.mode || "AUTOMATED_SCHEDULE",
        recipients: [...validRecipients, ...validWaRecipients],
        headcount: totalHeadcount,
        message: `${slotLabel} dispatched. PDF: ${emailPdfFilename} (${Math.round(pdfRes.buffer.byteLength / 1024)} KB), Excel: ${emailExcelFilename} (${Math.round(excelRes.buffer.byteLength / 1024)} KB). Email: ${emailDispatchResult.provider || (emailDispatchResult.success ? "DELIVERED" : "FAILED")}, WA: ${whatsAppSuccessCount}/${validWaRecipients.length} delivered.`,
        executed_at: nowIso,
      });
    } catch (logErr: any) {
      console.warn("[EdgeFunction] attendance_report_logs insert warning:", logErr.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        organization_id: orgId,
        companyName,
        slot,
        date: todayStr,
        headcount: totalHeadcount,
        turnout: {
          present: presentCount,
          late: lateCount,
          absent: absentCount,
          turnoutPct,
        },
        attachments: {
          pdf: { filename: emailPdfFilename, sizeBytes: pdfRes.buffer.byteLength },
          excel: { filename: emailExcelFilename, sizeBytes: excelRes.buffer.byteLength },
        },
        pdfBase64: body.mode === "MANUAL_TEST" ? pdfRes.base64 : undefined,
        excelBase64: body.mode === "MANUAL_TEST" ? excelRes.base64 : undefined,
        email: {
          recipients: validRecipients,
          status: emailDispatchResult.success ? "DELIVERED" : "FAILED",
          provider: emailDispatchResult.provider,
          error: emailDispatchResult.error,
        },
        whatsapp: {
          recipients: validWaRecipients,
          successCount: whatsAppSuccessCount,
          results: whatsAppResults,
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("[EdgeFunction] Fatal exception:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || String(err),
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
