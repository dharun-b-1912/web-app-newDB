// ============================================================================
// JOY PeopleHR — Multi-Tenant Biometric Cloud ADMS Gateway Edge Function
// ============================================================================
// Protocol: eSSL / ZKTeco Cloud Server / ADMS Protocol (Push Version 2.4.1 / 3.4.1)
// Architecture: Physical Biometric Terminal (Any Branch / Any Tenant) -> HTTPS -> Supabase Edge Function -> PostgreSQL
// Tenant Isolation: Devices are authenticated by Serial Number (SN) and bound to their organization_id.
// Authoritative Rules: Morning duplicate punch ignorance, exact punch time in SMS, 30m departure debouncing.
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const DLT_CHECKIN_TEMPLATE_ID = '1077076930061928891';
const DLT_CHECKOUT_TEMPLATE_ID = '1077188040062422070';

// In-memory daily SMS sent set per instance (backed by Postgres attendance_daily / punches audit)
const smsSentTodayCache = new Set<string>();

function getAirtelCredentials() {
  return {
    customerId: Deno.env.get('AIRTEL_CUSTOMER_ID') || '07877a9b-e87e-488d-b48f-796813a9a920',
    username: Deno.env.get('AIRTEL_IQ_USERNAME') || 'fffd90ff_bb42_45ae_815f_b8a7c5f267b3',
    password: Deno.env.get('AIRTEL_IQ_PASSWORD') || 'VunePZVDJp',
    senderId: Deno.env.get('AIRTEL_DEFAULT_SENDER_ID') || 'JCSPRL',
    peId: Deno.env.get('AIRTEL_DLT_PE_ID') || '1001333025440167393',
  };
}

async function sendAirtelSms(recipientPhone: string, message: string, templateId: string) {
  let cleanPhone = String(recipientPhone || '').replace(/\D/g, '');
  if (cleanPhone.length === 10) cleanPhone = '91' + cleanPhone;
  if (!cleanPhone.startsWith('91') || cleanPhone.length !== 12) {
    console.warn(`[AIRTEL-SMS] Invalid phone format: ${recipientPhone}`);
    return null;
  }

  const creds = getAirtelCredentials();
  const authHeader = 'Basic ' + btoa(`${creds.username}:${creds.password}`);

  try {
    const res = await fetch('https://iqsms.airtel.in/api/v1/send-prepaid-sms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        customerId: creds.customerId,
        destinationAddress: [cleanPhone],
        message: message,
        sourceAddress: creds.senderId,
        messageType: 'SERVICE_IMPLICIT',
        dltTemplateId: templateId,
        entityId: creds.peId,
      }),
    });
    return await res.json();
  } catch (err: any) {
    console.warn('[AIRTEL-SMS] Error sending SMS:', err?.message || err);
    return null;
  }
}

async function notifyReportingManager(
  supabase: any,
  emp: any,
  punchType: 'CHECK_IN' | 'CHECK_OUT',
  timeFormatted: string,
  organizationId: string
) {
  try {
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

    if (!managerId) {
      console.log(`[ADMS-EDGE] No reporting manager for ${emp.first_name || emp.employee_code}`);
      return;
    }

    // Fetch manager details
    const { data: mgr } = await supabase
      .from('employees')
      .select('id, employee_code, first_name, last_name, display_name, phone, user_id')
      .eq('id', managerId)
      .maybeSingle();

    if (!mgr) return;

    // Resolve manager profile / auth ID
    let authUserId = mgr.user_id;
    let profileId = mgr.user_id;
    const { data: prof } = await supabase
      .from('user_profiles')
      .select('id, auth_user_id')
      .or(`employee_id.eq.${mgr.id},id.eq.${mgr.user_id || 'none'},auth_user_id.eq.${mgr.user_id || 'none'}`)
      .limit(1)
      .maybeSingle();
    if (prof) {
      if (prof.auth_user_id) authUserId = prof.auth_user_id;
      if (prof.id) profileId = prof.id;
    }

    const empName = (emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`).trim();
    const isOut = punchType === 'CHECK_OUT';
    const title = isOut ? `👋 Employee Check-Out: ${empName}` : `🟢 Biometric Check-In: ${empName}`;
    const body = isOut
      ? `${empName} (${emp.employee_code || ''}) checked out at ${timeFormatted} via Biometric Terminal.`
      : `${empName} (${emp.employee_code || ''}) checked in at ${timeFormatted} via Biometric Terminal.`;

    const targetUserId = profileId || authUserId || mgr.id;
    const nowIso = new Date().toISOString();

    // 1. Insert In-App Notification into notification_events for manager
    try {
      await supabase.from('notification_events').insert([{
        organization_id: organizationId,
        recipient_user_id: targetUserId,
        channel: 'IN_APP',
        title,
        message: body,
        action_url: `/attendance?emp=${emp.id}&date=${nowIso.split('T')[0]}`,
        is_read: false,
        is_sent: true,
        sent_at: nowIso,
        created_at: nowIso,
      }]);
    } catch (e: any) {
      console.warn('[ADMS-EDGE] In-app notification error:', e?.message || e);
    }

    // 2. Dispatch FCM Push Notification using send-push edge function
    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || '';
      await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          employee_id: mgr.id,
          auth_user_id: authUserId,
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
      console.log(`[ADMS-EDGE] ✓ Biometric alert sent to manager ${mgr.first_name} (${mgr.employee_code}) for ${empName}`);
    } catch (e: any) {
      console.warn('[ADMS-EDGE] Push notification error:', e?.message || e);
    }
  } catch (err: any) {
    console.warn('[ADMS-EDGE] Manager notification notice:', err?.message || err);
  }
}

serve(async (req: Request) => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const sn = (url.searchParams.get('SN') || url.searchParams.get('sn') || '').trim();

  // Create authoritative Supabase Admin Client
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  // --------------------------------------------------------------------------
  // 1. TERMINAL INITIAL HANDSHAKE (GET /iclock/cdata.aspx?SN=...)
  // --------------------------------------------------------------------------
  if (req.method === 'GET' && (pathname.includes('cdata') || pathname.endsWith('/cdata.aspx'))) {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const nowFormatted = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const pushVer = url.searchParams.get('pushver') || '2.4.1';

    // Update terminal health in database
    if (sn) {
      await supabase
        .from('biometric_devices')
        .update({
          last_heartbeat_at: new Date().toISOString(),
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('serial_number', sn);
    }

    return new Response(
      `GET OPTION FROM: ${sn || 'ZK-DEFAULT'}\n` +
      `ATTLOGStamp=0\n` +
      `OPERLOGStamp=0\n` +
      `ATTPHOTOStamp=0\n` +
      `BIODATAStamp=0\n` +
      `Stamp=0\n` +
      `OpStamp=0\n` +
      `PhotoStamp=0\n` +
      `ErrorDelay=30\n` +
      `Delay=10\n` +
      `TransTimes=00:00;14:00\n` +
      `TransInterval=1\n` +
      `TransFlag=1111000000\n` +
      `TimeZone=330\n` +
      `Realtime=1\n` +
      `ServerVer=3.4.1\n` +
      `PushOptionsFlag=1\n` +
      `PushVersion=${pushVer}\n` +
      `ServerName=JOY-HR-ADMS\n` +
      `ServerTime=${nowFormatted}\n` +
      `SyncTime=1\n` +
      `RegistryCode=OK\n`,
      { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
    );
  }

  // --------------------------------------------------------------------------
  // 2. REAL-TIME DATA PUSH FROM TERMINAL (POST /iclock/cdata.aspx?SN=...&table=ATTLOG)
  // --------------------------------------------------------------------------
  if (req.method === 'POST' && (pathname.includes('cdata') || pathname.endsWith('/cdata.aspx'))) {
    const table = (url.searchParams.get('table') || 'ATTLOG').toUpperCase();
    const bodyText = await req.text();

    if (!sn) {
      console.warn('[ADMS-EDGE] Request missing device serial number (SN)');
      return new Response('OK: 0\n', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    // A. Multi-Tenant Device Resolution: Query device by Serial Number
    const { data: devices, error: devErr } = await supabase
      .from('biometric_devices')
      .select('id, organization_id, branch_id, device_name, is_active')
      .eq('serial_number', sn)
      .limit(1);

    if (devErr || !devices || devices.length === 0) {
      console.warn(`[ADMS-EDGE] Unregistered device tried to connect: SN ${sn}`);
      return new Response('OK: 0\n', { status: 200, headers: { 'Content-Type': 'text/plain' } });
    }

    const device = devices[0];
    const organizationId = device.organization_id;

    // Update heartbeat
    await supabase
      .from('biometric_devices')
      .update({
        last_heartbeat_at: new Date().toISOString(),
        status: 'Online',
        updated_at: new Date().toISOString(),
      })
      .eq('id', device.id);

    let parsedCount = 0;

    // Process Attendance Punches
    if (table === 'ATTLOG' && bodyText.trim()) {
      const lines = bodyText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

      // Load all employees belonging to THIS SPECIFIC TENANT (Multi-Tenant Isolation)
      const { data: emps } = await supabase
        .from('employees')
        .select('id, employee_code, first_name, last_name, display_name, phone, organization_id, reporting_manager_id, department_id')
        .eq('organization_id', organizationId);

      const tenantEmployees = emps || [];

      for (const line of lines) {
        const parts = line.split('\t');
        if (parts.length < 2) continue;

        const pin = parts[0].trim();
        const timeStr = parts[1].trim(); // YYYY-MM-DD HH:MM:SS
        const vCode = parts[2] || '15';
        const sCode = parts[3] || '0';

        // Match PIN to employee within this organization
        const numericPin = pin.replace(/\D/g, '');
        const emp = tenantEmployees.find(e => {
          const codeNum = String(e.employee_code || '').replace(/\D/g, '');
          return codeNum === numericPin || parseInt(codeNum, 10) === parseInt(numericPin, 10);
        });

        if (!emp) {
          console.log(`[ADMS-EDGE] PIN #${pin} not matched to employee in organization ${organizationId}`);
          parsedCount++;
          continue;
        }

        // Convert IST device timestamp to canonical UTC ISO
        let eventUtcIso = new Date().toISOString();
        let punchDate = new Date();
        const timeMatch = timeStr.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (timeMatch) {
          const y = parseInt(timeMatch[1], 10);
          const mo = parseInt(timeMatch[2], 10) - 1;
          const da = parseInt(timeMatch[3], 10);
          const ho = parseInt(timeMatch[4], 10);
          const mi = parseInt(timeMatch[5], 10);
          const se = timeMatch[6] ? parseInt(timeMatch[6], 10) : 0;
          const utcEpochMs = Date.UTC(y, mo, da, ho, mi, se) - 330 * 60 * 1000;
          punchDate = new Date(utcEpochMs);
          eventUtcIso = punchDate.toISOString();
        } else {
          punchDate = new Date(timeStr);
          eventUtcIso = !isNaN(punchDate.getTime()) ? punchDate.toISOString() : new Date().toISOString();
        }

        const todayDate = punchDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }); // YYYY-MM-DD
        const timeFormatted = punchDate.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        });
        const day = punchDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit' });
        const month = punchDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', month: '2-digit' });
        const year = punchDate.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', year: 'numeric' });
        const dateFormatted = `${day}-${month}-${year}`;

        // Fetch today's daily record for this employee
        const { data: dailyRows } = await supabase
          .from('attendance_daily')
          .select('id, first_check_in, last_check_out')
          .eq('employee_id', emp.id)
          .eq('attendance_date', todayDate)
          .limit(1);

        const existingDaily = dailyRows && dailyRows.length > 0 ? dailyRows[0] : null;
        const hasFirstCheckIn = Boolean(existingDaily && existingDaily.first_check_in);
        const existingInMs = hasFirstCheckIn ? new Date(existingDaily.first_check_in).getTime() : 0;
        const currentPunchMs = punchDate.getTime();
        const diffHours = hasFirstCheckIn ? (currentPunchMs - existingInMs) / (1000 * 60 * 60) : 0;
        const eventIstHour = (punchDate.getUTCHours() + 5.5 + punchDate.getUTCMinutes() / 60) % 24;

        const checkInKey = `${emp.id}_${todayDate}_CHECK_IN`;
        const checkOutKey = `${emp.id}_${todayDate}_CHECK_OUT`;

        // =====================================================================
        // RULE 0: MIDNIGHT SHIFT / EXTENDED OVERTIME RECONCILER (00:00 to 05:00 IST)
        // If employee punches after midnight and yesterday has an unclosed check-in,
        // this is an extended checkout for yesterday, NOT a check-in for today!
        // =====================================================================
        if (eventIstHour < 5.0) {
          const yDateObj = new Date(punchDate.getTime() - 24 * 60 * 60 * 1000);
          const yesterdayDate = yDateObj.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

          const { data: yDailyRows } = await supabase
            .from('attendance_daily')
            .select('id, first_check_in, last_check_out')
            .eq('employee_id', emp.id)
            .eq('attendance_date', yesterdayDate)
            .limit(1);

          const yDaily = yDailyRows && yDailyRows.length > 0 ? yDailyRows[0] : null;
          if (yDaily && yDaily.first_check_in && !yDaily.last_check_out) {
            const yInMs = new Date(yDaily.first_check_in).getTime();
            const yTotalMins = Math.max(0, Math.floor((currentPunchMs - yInMs) / 60000));
            const yOvertimeMins = Math.max(0, yTotalMins - 480);

            await supabase
              .from('attendance_daily')
              .update({
                last_check_out: eventUtcIso,
                total_work_minutes: yTotalMins,
                overtime_minutes: yOvertimeMins,
              })
              .eq('id', yDaily.id);

            await supabase.from('attendance_punches').insert({
              employee_id: emp.id,
              organization_id: organizationId,
              device_id: device.id,
              punch_time: eventUtcIso,
              punch_type: 'CHECK_OUT',
              punch_source: 'BIOMETRIC',
              verification_mode: 'FACE',
              attendance_date: yesterdayDate,
            });

            console.log(`[ADMS-EDGE] 🌙 Midnight checkout reconciled for ${emp.first_name} on shift ${yesterdayDate} at ${timeFormatted} (${Math.floor(yTotalMins / 60)}h ${yTotalMins % 60}m worked, ${Math.floor(yOvertimeMins / 60)}h ${yOvertimeMins % 60}m OT).`);
            parsedCount++;
            continue;
          }
        }

        // =====================================================================
        // RULE 1: MORNING ARRIVAL WINDOW (< 13:00 IST or < 3.5 hours worked)
        // Morning punches are strictly Check-Ins. Never Check-Outs.
        // =====================================================================
        if (eventIstHour < 13.0 || diffHours < 3.5) {
          if (hasFirstCheckIn) {
            // Case 1A: Punch is EARLIER than existing check-in (reconcile earlier biometric punch)
            if (currentPunchMs < existingInMs) {
              await supabase
                .from('attendance_daily')
                .update({ first_check_in: eventUtcIso })
                .eq('id', existingDaily.id);

              if (emp.phone && !smsSentTodayCache.has(checkInKey)) {
                const msg = `Dear ${emp.first_name}, your check-in has been recorded at ${timeFormatted} on ${dateFormatted}. Have a productive day! - Joy PeopleHR`;
                await sendAirtelSms(emp.phone, msg, DLT_CHECKIN_TEMPLATE_ID);
                smsSentTodayCache.add(checkInKey);
              }
            } else {
              // Case 1B: Morning duplicate scan -> Completely ignore!
              console.log(`[ADMS-EDGE] 🛡️ Ignored morning duplicate scan for ${emp.first_name} (PIN #${pin}) at ${timeFormatted}. Original check-in remains at ${existingDaily.first_check_in}.`);
            }
          } else {
            // Case 1C: First arrival of the day!
            await supabase.from('attendance_punches').insert({
              employee_id: emp.id,
              organization_id: organizationId,
              device_id: device.id,
              punch_time: eventUtcIso,
              punch_type: 'CHECK_IN',
              punch_source: 'BIOMETRIC',
              verification_mode: 'FACE',
              attendance_date: todayDate,
            });

            await supabase.from('attendance_daily').upsert({
              employee_id: emp.id,
              organization_id: organizationId,
              attendance_date: todayDate,
              first_check_in: eventUtcIso,
              last_check_out: null,
              status: 'PRESENT',
              payable_status: 1.0,
            }, { onConflict: 'employee_id,attendance_date' });

            if (emp.phone && !smsSentTodayCache.has(checkInKey)) {
              const msg = `Dear ${emp.first_name}, your check-in has been recorded at ${timeFormatted} on ${dateFormatted}. Have a productive day! - Joy PeopleHR`;
              await sendAirtelSms(emp.phone, msg, DLT_CHECKIN_TEMPLATE_ID);
              smsSentTodayCache.add(checkInKey);
            }

            // Dispatch instant push & in-app alert to reporting manager
            await notifyReportingManager(supabase, emp, 'CHECK_IN', timeFormatted, organizationId);
          }
          parsedCount++;
          continue;
        }

        // =====================================================================
        // RULE 2: LATE AFTERNOON FIRST ARRIVAL (Shift started after 13:00 IST)
        // =====================================================================
        if (!hasFirstCheckIn) {
          await supabase.from('attendance_punches').insert({
            employee_id: emp.id,
            organization_id: organizationId,
            device_id: device.id,
            punch_time: eventUtcIso,
            punch_type: 'CHECK_IN',
            punch_source: 'BIOMETRIC',
            verification_mode: 'FACE',
            attendance_date: todayDate,
          });

          await supabase.from('attendance_daily').upsert({
            employee_id: emp.id,
            organization_id: organizationId,
            attendance_date: todayDate,
            first_check_in: eventUtcIso,
            last_check_out: null,
            status: 'PRESENT',
            payable_status: 1.0,
          }, { onConflict: 'employee_id,attendance_date' });

          if (emp.phone && !smsSentTodayCache.has(checkInKey)) {
            const msg = `Dear ${emp.first_name}, your check-in has been recorded at ${timeFormatted} on ${dateFormatted}. Have a productive day! - Joy PeopleHR`;
            await sendAirtelSms(emp.phone, msg, DLT_CHECKIN_TEMPLATE_ID);
            smsSentTodayCache.add(checkInKey);
          }

          // Dispatch instant push & in-app alert to reporting manager
          await notifyReportingManager(supabase, emp, 'CHECK_IN', timeFormatted, organizationId);
          parsedCount++;
          continue;
        }

        // =====================================================================
        // RULE 3: MID-DAY ROAMING SCAN SUPPRESSION (13:00 to 16:30 IST & < 6h)
        // Employees walking past terminal for lunch, water, meetings, etc.
        // MUST NEVER trigger premature Check-Out or send SMS!
        // =====================================================================
        if (eventIstHour < 16.5 && diffHours < 6.0) {
          console.log(`[ADMS-EDGE] 🚶 Mid-day roaming scan suppressed for ${emp.first_name} (PIN #${pin}) at ${timeFormatted} (${diffHours.toFixed(1)}h on shift). Premature check-out and SMS blocked.`);
          parsedCount++;
          continue;
        }

        // =====================================================================
        // RULE 4: EVENING DEPARTURE WINDOW (>= 16:30 IST OR >= 6.0 hours worked)
        // =====================================================================
        const inMs = new Date(existingDaily.first_check_in).getTime();
        const outMs = currentPunchMs;
        const totalMins = Math.max(0, Math.floor((outMs - inMs) / 60000));
        const hours = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        const overtimeMins = Math.max(0, totalMins - 480);

        // 30-minute departure debounce: multiple face scans on exit update time silently
        if (existingDaily.last_check_out) {
          const prevOutMs = new Date(existingDaily.last_check_out).getTime();
          const outDiffMins = (outMs - prevOutMs) / 60000;
          if (outDiffMins < 30 && smsSentTodayCache.has(checkOutKey)) {
            await supabase
              .from('attendance_daily')
              .update({
                last_check_out: eventUtcIso,
                total_work_minutes: totalMins,
                overtime_minutes: overtimeMins,
              })
              .eq('id', existingDaily.id);

            parsedCount++;
            continue;
          }
        }

        await supabase.from('attendance_punches').insert({
          employee_id: emp.id,
          organization_id: organizationId,
          device_id: device.id,
          punch_time: eventUtcIso,
          punch_type: 'CHECK_OUT',
          punch_source: 'BIOMETRIC',
          verification_mode: 'FACE',
          attendance_date: todayDate,
        });

        await supabase.from('attendance_daily').upsert({
          employee_id: emp.id,
          organization_id: organizationId,
          attendance_date: todayDate,
          first_check_in: existingDaily.first_check_in,
          last_check_out: eventUtcIso,
          total_work_minutes: totalMins,
          overtime_minutes: overtimeMins,
          status: 'PRESENT',
          payable_status: 1.0,
        }, { onConflict: 'employee_id,attendance_date' });

        if (emp.phone && !smsSentTodayCache.has(checkOutKey) && totalMins >= 180) {
          const totalDurationFormatted = `${hours} hrs ${mins} mins`;
          const msg = `Dear ${emp.first_name}, your check-out has been recorded at ${timeFormatted} today. Your total logged time is ${totalDurationFormatted}. Status: Present. - Joy PeopleHR.`;
          await sendAirtelSms(emp.phone, msg, DLT_CHECKOUT_TEMPLATE_ID);
          smsSentTodayCache.add(checkOutKey);
        }

        // Dispatch instant push & in-app alert to reporting manager
        await notifyReportingManager(supabase, emp, 'CHECK_OUT', timeFormatted, organizationId);

        parsedCount++;
      }
    }

    return new Response(`OK: ${parsedCount || 1}\n`, {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // --------------------------------------------------------------------------
  // 3. COMMAND POLLING LOOP (GET /iclock/getrequest.aspx)
  // --------------------------------------------------------------------------
  if (pathname.includes('getrequest') || pathname.endsWith('/getrequest.aspx')) {
    if (sn) {
      await supabase
        .from('biometric_devices')
        .update({
          last_heartbeat_at: new Date().toISOString(),
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('serial_number', sn);
    }

    return new Response('OK\n', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // --------------------------------------------------------------------------
  // 4. REGISTRY & PING (GET /iclock/registry.aspx / /iclock/ping.aspx)
  // --------------------------------------------------------------------------
  if (pathname.includes('registry') || pathname.includes('ping')) {
    return new Response('RegistryCode=OK\n', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  // --------------------------------------------------------------------------
  // 5. DEVICE COMMAND ACKNOWLEDGEMENT (POST /iclock/devicecmd.aspx)
  // --------------------------------------------------------------------------
  if (pathname.includes('devicecmd') || pathname.endsWith('/devicecmd.aspx')) {
    return new Response('OK\n', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  return new Response('OK\n', {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
});
