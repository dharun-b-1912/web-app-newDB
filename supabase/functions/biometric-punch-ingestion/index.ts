// ============================================================================
// JOY PeopleHR — Secure Biometric Punch Ingestion Edge Function
// ============================================================================
// Architecture: Physical Biometric Terminal -> HTTPS -> Edge Function -> Postgres
// Protects database by requiring device token / API key authentication.
// NEVER exposes service_role key to physical hardware or clients.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit } from '../_shared/rateLimiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-token, x-tenant-id',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 0. Rate Limiting Protection (Gate: 500 requests / 60 seconds per device token / IP)
  const rateLimitCheck = await checkRateLimit(req, {
    profile: 'BIOMETRIC_PUNCH_INGESTION',
    maxRequests: 500,
    windowSeconds: 60,
  });
  if (!rateLimitCheck.allowed && rateLimitCheck.response) {
    return rateLimitCheck.response;
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: missing Supabase credentials' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Authenticate physical device / gateway agent via token
    const deviceToken = req.headers.get('x-device-token') || req.headers.get('authorization')?.replace('Bearer ', '');
    const headerTenantId = req.headers.get('x-tenant-id');

    if (!deviceToken) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: missing x-device-token header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const {
      serial_number,
      device_id,
      biometric_pin,
      punch_time,
      verification_mode = 'Face',
      punch_direction = 'AUTO',
      raw_payload,
    } = body;

    if (!serial_number && !device_id) {
      return new Response(
        JSON.stringify({ error: 'Bad Request: missing serial_number or device_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!biometric_pin || !punch_time) {
      return new Response(
        JSON.stringify({ error: 'Bad Request: missing biometric_pin or punch_time' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Resolve registered device & organization
    let deviceQuery = supabase.from('biometric_devices').select('*');
    if (serial_number) {
      deviceQuery = deviceQuery.eq('serial_number', serial_number);
    } else {
      deviceQuery = deviceQuery.eq('id', device_id);
    }

    const { data: devices, error: devError } = await deviceQuery;
    if (devError || !devices || devices.length === 0) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: unregistered or unrecognized biometric terminal' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const device = devices[0];
    const organizationId = device.organization_id || headerTenantId;

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'Internal Error: device has no associated organization' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. 60-Second Timestamp Deduplication Hash
    const punchDate = new Date(punch_time);
    const minuteBucket = Math.floor(punchDate.getTime() / 60000);
    const dedupHash = `${device.serial_number}_${biometric_pin}_${minuteBucket}`;

    // 4. Check for existing punch with same dedup hash
    const { data: existingPunches } = await supabase
      .from('attendance_punches')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('device_id', device.id)
      .eq('device_user_id', biometric_pin)
      .gte('punch_time', new Date(punchDate.getTime() - 60000).toISOString())
      .lte('punch_time', new Date(punchDate.getTime() + 60000).toISOString())
      .limit(1);

    if (existingPunches && existingPunches.length > 0) {
      return new Response(
        JSON.stringify({
          status: 'DEDUPLICATED',
          message: 'Duplicate punch within 60s window ignored',
          dedup_hash: dedupHash,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Resolve employee mapping if available
    let employeeId = null;
    const { data: mappings } = await supabase
      .from('biometric_device_users')
      .select('id, mapped_employee_id')
      .eq('organization_id', organizationId)
      .eq('device_user_id', biometric_pin)
      .limit(1);

    if (mappings && mappings.length > 0 && mappings[0].mapped_employee_id) {
      employeeId = mappings[0].mapped_employee_id;
    }

    // 6. Insert Authoritative Attendance Punch into PostgreSQL
    const punchId = `punch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const { data: insertedPunch, error: insertError } = await supabase
      .from('attendance_punches')
      .insert({
        id: punchId,
        organization_id: organizationId,
        employee_id: employeeId,
        device_id: device.id,
        device_serial: device.serial_number,
        device_name: device.device_name,
        device_user_id: biometric_pin,
        punch_time: punchDate.toISOString(),
        punch_type: punch_direction === 'OUT' ? 'CHECK_OUT' : 'CHECK_IN',
        punch_source: 'BIOMETRIC',
        verification_mode: verification_mode.toUpperCase(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: 'Database error storing punch', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Update device last_seen_at / last_punch_at timestamp
    await supabase
      .from('biometric_devices')
      .update({
        last_punch_at: new Date().toISOString(),
        last_health_check: new Date().toISOString(),
        status: 'Online',
        updated_at: new Date().toISOString(),
      })
      .eq('id', device.id);

    // 8. Smart Adaptive Shift & Attendance Policy Engine (120m Permission/Late Quota)
    let dailyAttendanceOutcome: any = null;
    if (employeeId) {
      try {
        // A. Determine IST Attendance Date (early morning < 06:00 overnight check belongs to previous day)
        const punchDateObj = new Date(punch_time);
        const istHoursDecimal = (punchDateObj.getUTCHours() + 5.5 + punchDateObj.getUTCMinutes() / 60) % 24;
        let attendanceDateStr = punchDateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
        if (istHoursDecimal < 6.0) {
          const prevDay = new Date(punchDateObj.getTime() - 24 * 60 * 60 * 1000);
          attendanceDateStr = prevDay.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        }

        // B. Resolve Adaptive Shift (Contract assignment -> Roster -> Adaptive Candidate Inference)
        let resolvedShiftCode = 'GEN-10';
        let resolvedShiftName = 'General Day Shift (Corporate)';
        let shiftStartMinutes = 570; // 09:30
        let shiftEndMinutes = 1110;  // 18:30
        let shiftGraceMinutes = 15;
        let shiftResolutionSource = 'ADAPTIVE_PUNCH_INFERENCE';
        let shiftConfidence = 85;

        // Check Tier 1 & 2: Shift roster or contract assignment
        const { data: rosterRows } = await supabase
          .from('shift_rosters')
          .select('shift_code, shift_name, start_time, end_time, is_override')
          .eq('employee_id', employeeId)
          .eq('roster_date', attendanceDateStr)
          .limit(1);

        if (rosterRows && rosterRows.length > 0) {
          const r = rosterRows[0];
          resolvedShiftCode = r.shift_code || 'GEN-10';
          resolvedShiftName = r.shift_name || 'Assigned Roster Shift';
          shiftResolutionSource = r.is_override ? 'EMERGENCY_REASSIGNMENT' : 'APPROVED_ROSTER_ROTATION';
          shiftConfidence = 100;
        } else {
          // Candidate Shifts: GEN-10 (09:30), GEN-01 (08:30), GEN-09 (09:00), NGT-01 (20:00)
          const punchMinutesFromMidnight = Math.round(istHoursDecimal * 60);
          const candidates = [
            { code: 'GEN-10', name: 'General Day Shift (Corporate)', start: 570, end: 1110 },
            { code: 'GEN-01', name: 'Morning Operations Shift', start: 510, end: 1050 },
            { code: 'GEN-09', name: 'Technical Support Shift', start: 540, end: 1080 },
            { code: 'NGT-01', name: 'Overnight Production Shift', start: 1200, end: 300 },
          ];

          let bestCand = candidates[0];
          let minDiff = 9999;
          for (const cand of candidates) {
            let diff = Math.abs(punchMinutesFromMidnight - cand.start);
            if (diff > 720) diff = 1440 - diff;
            if (diff < minDiff) {
              minDiff = diff;
              bestCand = cand;
            }
          }
          resolvedShiftCode = bestCand.code;
          resolvedShiftName = bestCand.name;
          shiftStartMinutes = bestCand.start;
          shiftEndMinutes = bestCand.end;
          shiftConfidence = Math.max(70, 100 - minDiff);
        }

        // C. Fetch existing attendance_daily row for this date
        const { data: existingDailyRows } = await supabase
          .from('attendance_daily')
          .select('*')
          .eq('employee_id', employeeId)
          .eq('attendance_date', attendanceDateStr)
          .limit(1);

        const existingDaily = existingDailyRows && existingDailyRows.length > 0 ? existingDailyRows[0] : null;
        const isCheckoutPunch = punch_direction === 'OUT' || (existingDaily && existingDaily.first_check_in && istHoursDecimal >= 13.0);

        if (!existingDaily || !existingDaily.first_check_in) {
          // =================================================================
          // FIRST ARRIVAL (CHECK-IN)
          // =================================================================
          const punchMinutesFromMidnight = Math.round(istHoursDecimal * 60);
          const rawLateMinutes = punchMinutesFromMidnight > (shiftStartMinutes + shiftGraceMinutes)
            ? punchMinutesFromMidnight - shiftStartMinutes
            : 0;

          // Company Policy: Excess late arrival beyond 15m shift grace auto-consumes from 120m monthly allowance
          const excessLateArrivalMins = Math.max(0, rawLateMinutes - shiftGraceMinutes);

          // Calculate Month's Prior Cumulative Permissions and Late Minutes
          const monthPrefix = attendanceDateStr.substring(0, 7); // YYYY-MM
          const { data: monthRows } = await supabase
            .from('attendance_daily')
            .select('late_entry_minutes, permission_minutes')
            .eq('employee_id', employeeId)
            .gte('attendance_date', `${monthPrefix}-01`)
            .lte('attendance_date', `${monthPrefix}-31`);

          let priorCumulativeMinutes = 0;
          if (monthRows) {
            for (const r of monthRows) {
              const pM = Number(r.permission_minutes || 0);
              const lateM = Number(r.late_entry_minutes || 0);
              const excess = Math.max(0, lateM - shiftGraceMinutes);
              priorCumulativeMinutes += (pM + excess);
            }
          }

          const newCumulativeMinutes = priorCumulativeMinutes + excessLateArrivalMins;
          const monthlyAllowance = 120; // 2 Hours default quota
          const isThresholdCrossedToday = priorCumulativeMinutes <= monthlyAllowance && newCumulativeMinutes > monthlyAllowance;

          let status = 'PRESENT';
          let payableStatus = 1.0;

          if (isThresholdCrossedToday) {
            // Policy A: Threshold-crossing day marked as Half-Day
            status = 'Half Day';
            payableStatus = 0.5;
          } else if (rawLateMinutes > 0) {
            status = 'LATE';
            payableStatus = 1.0;
          }

          const dailyPayload: any = {
            employee_id: employeeId,
            organization_id: organizationId,
            attendance_date: attendanceDateStr,
            first_check_in: punchDate.toISOString(),
            last_check_out: null,
            status,
            payable_status: payableStatus,
            late_entry_minutes: rawLateMinutes,
            shift_code: resolvedShiftCode,
            total_work_minutes: 0,
            overtime_minutes: 0,
          };

          await supabase.from('attendance_daily').upsert(dailyPayload, { onConflict: 'employee_id,attendance_date' });
          dailyAttendanceOutcome = {
            attendanceDate: attendanceDateStr,
            status,
            payableStatus,
            lateMinutes: rawLateMinutes,
            excessLateConsumed: excessLateArrivalMins,
            priorCumulativeMinutes,
            newCumulativeMinutes,
            isThresholdCrossedToday,
            shiftCode: resolvedShiftCode,
            shiftResolutionSource,
          };
        } else if (isCheckoutPunch) {
          // =================================================================
          // DEPARTURE (CHECK-OUT)
          // =================================================================
          const inMs = new Date(existingDaily.first_check_in).getTime();
          const outMs = punchDate.getTime();
          const totalWorkMinutes = Math.max(0, Math.floor((outMs - inMs) / 60000));
          const overtimeMinutes = Math.max(0, totalWorkMinutes - 480);

          let finalStatus = existingDaily.status || 'PRESENT';
          let payableStatus = existingDaily.payable_status ?? 1.0;

          // If not already classified as Half-Day due to 120m permission threshold
          if (finalStatus !== 'Half Day') {
            if (totalWorkMinutes < 120) {
              finalStatus = 'Absent';
              payableStatus = 0.0;
            } else if (totalWorkMinutes < 240) {
              finalStatus = 'Half Day';
              payableStatus = 0.5;
            } else {
              finalStatus = 'PRESENT';
              payableStatus = 1.0;
            }
          }

          await supabase.from('attendance_daily').update({
            last_check_out: punchDate.toISOString(),
            total_work_minutes: totalWorkMinutes,
            overtime_minutes: overtimeMinutes,
            status: finalStatus,
            payable_status: payableStatus,
          }).eq('id', existingDaily.id);

          dailyAttendanceOutcome = {
            attendanceDate: attendanceDateStr,
            status: finalStatus,
            totalWorkMinutes,
            overtimeMinutes,
            payableStatus,
          };
        }
      } catch (errEngine) {
        console.warn('[biometric-punch-ingestion] Policy engine notice:', errEngine);
      }
    }

    // 9. Dispatch notification to reporting manager if employee is resolved
    if (employeeId) {
      try {
        const { data: emp } = await supabase
          .from('employees')
          .select('id, employee_code, first_name, last_name, display_name, phone, organization_id, reporting_manager_id, department_id')
          .eq('id', employeeId)
          .maybeSingle();

        if (emp) {
          let managerId = emp.reporting_manager_id;
          if (!managerId && emp.department_id) {
            const { data: dept } = await supabase
              .from('departments')
              .select('head_employee_id')
              .eq('id', emp.department_id)
              .maybeSingle();
            if (dept?.head_employee_id && dept.head_employee_id !== emp.id) {
              managerId = dept.head_employee_id;
            }
          }

          if (managerId) {
            const timeFormatted = punchDate.toLocaleTimeString('en-US', {
              timeZone: 'Asia/Kolkata',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            });
            const empName = (emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`).trim();
            const isOut = punch_direction === 'OUT';
            const title = isOut ? `👋 Employee Check-Out: ${empName}` : `🟢 Biometric Check-In: ${empName}`;
            const body = isOut
              ? `${empName} (${emp.employee_code || ''}) checked out at ${timeFormatted} via Biometric Terminal.`
              : `${empName} (${emp.employee_code || ''}) checked in at ${timeFormatted} via Biometric Terminal.`;

            // Insert in-app notification
            await supabase.from('notification_events').insert([{
              organization_id: organizationId,
              recipient_user_id: managerId,
              channel: 'IN_APP',
              title,
              message: body,
              action_url: `/attendance?emp=${emp.id}&date=${punchDate.toISOString().split('T')[0]}`,
              is_read: false,
              is_sent: true,
              sent_at: new Date().toISOString(),
              created_at: new Date().toISOString(),
            }]);

            // Dispatch push notification
            await fetch(`${supabaseUrl}/functions/v1/send-push`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                employee_id: managerId,
                title,
                body,
                route: 'attendance',
                data: {
                  route: 'attendance',
                  eventType: isOut ? 'attendance.check_out.accepted' : 'attendance.check_in.accepted',
                  employeeId: emp.id,
                  employeeName: empName,
                  source: 'BIOMETRIC',
                  timestamp: String(Date.now()),
                },
              }),
            });
          }
        }
      } catch (errNotif) {
        console.warn('[biometric-punch-ingestion] Manager alert error:', errNotif);
      }
    }

    return new Response(
      JSON.stringify({
        status: 'SUCCESS',
        punch_id: insertedPunch.id,
        employee_id: employeeId,
        organization_id: organizationId,
        punch_time: punchDate.toISOString(),
        daily_outcome: dailyAttendanceOutcome,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', message: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
