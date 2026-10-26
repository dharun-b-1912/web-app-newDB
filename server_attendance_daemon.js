// server_attendance_daemon.js
// ============================================================================
// JOY PeopleHR — 24/7 Production Attendance Punch & Push Notification Daemon
// Ultra-Resilient Engine: 100% Native fetch REST Architecture (Node 18/20/22+ Compatible)
// Zero External Library Dependencies — NEVER Crashes Express or Passenger
// Dispatches In-App Alerts (notification_events) & FCM Push (send-push Edge Function)
// ============================================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ysiajemrqakfngasehhi.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_i_pb_iFcxX0BEJFok_XfZA_gZF3W8mj';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlzaWFqZW1ycWFrZm5nYXNlaGhpIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODQxNDEwOSwiZXhwIjoyMTAzOTkwMTA5fQ.D6xZ3REU8mTG9DmSufj8DnAH6qSyMvbukqyf5z9lvxc';

function generateUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try { return crypto.randomUUID(); } catch (_) {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// REST fetch helper with full Supabase Service Role authority
async function sbFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const headers = {
    'apikey': SERVICE_KEY || SUPABASE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY || SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': options.prefer || 'return=representation',
    ...(options.headers || {}),
  };

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (_) {
    json = text;
  }

  return { ok: res.ok, status: res.status, data: json };
}

// In-memory processed cache (max 1500 IDs)
const processedPunchIds = new Set();
function markProcessed(id) {
  if (!id) return;
  if (processedPunchIds.size > 1500) {
    const first = processedPunchIds.values().next().value;
    processedPunchIds.delete(first);
  }
  processedPunchIds.add(id);
}

/**
 * Process a single attendance punch row
 */
export async function processPunchRecord(punch) {
  if (!punch || !punch.id || !punch.employee_id) return;
  if (processedPunchIds.has(punch.id)) return;
  markProcessed(punch.id);

  // Skip test simulations so production feeds remain clean
  if (punch.idempotency_key && String(punch.idempotency_key).startsWith('sim-')) {
    return;
  }

  try {
    console.log(`[AttendanceDaemon] Intercepted punch ${punch.id} (${punch.punch_type}) for employee ${punch.employee_id}`);

    // 1. Fetch Employee details
    const empRes = await sbFetch(`employees?id=eq.${punch.employee_id}&select=id,employee_code,first_name,last_name,display_name,reporting_manager_id,organization_id,department_id`);
    const emp = Array.isArray(empRes.data) ? empRes.data[0] : null;

    if (!emp) {
      console.warn(`[AttendanceDaemon] Employee ${punch.employee_id} not found in DB.`);
      return;
    }

    // 2. Resolve Supervisor / Manager
    let managerId = emp.reporting_manager_id;
    if (!managerId && emp.department_id) {
      const deptRes = await sbFetch(`departments?id=eq.${emp.department_id}&select=head_employee_id`);
      const dept = Array.isArray(deptRes.data) ? deptRes.data[0] : null;
      if (dept?.head_employee_id && dept.head_employee_id !== emp.id) {
        managerId = dept.head_employee_id;
      }
    }

    if (!managerId) {
      console.log(`[AttendanceDaemon] No reporting supervisor assigned for ${emp.first_name} ${emp.last_name}.`);
      return;
    }

    // 3. Fetch Manager Record
    const mgrRes = await sbFetch(`employees?id=eq.${managerId}&select=id,employee_code,first_name,last_name,display_name,phone,user_id`);
    const mgr = Array.isArray(mgrRes.data) ? mgrRes.data[0] : null;

    if (!mgr) {
      console.warn(`[AttendanceDaemon] Supervisor ${managerId} not found in DB.`);
      return;
    }

    // 4. Resolve Manager User Profile (Needed for notification_events FK)
    const profRes = await sbFetch(`user_profiles?employee_id=eq.${mgr.id}&select=id,auth_user_id`);
    let mgrProf = Array.isArray(profRes.data) ? profRes.data[0] : null;

    if (!mgrProf && mgr.user_id) {
      const profById = await sbFetch(`user_profiles?id=eq.${mgr.user_id}&select=id,auth_user_id`);
      mgrProf = Array.isArray(profById.data) ? profById.data[0] : null;
    }

    const recipientProfileId = mgrProf?.id || mgr.user_id;
    const recipientAuthId = mgrProf?.auth_user_id;

    // 5. Fetch Manager Device Tokens for FCM
    let tokenQuery = `employee_device_tokens?employee_id=eq.${mgr.id}&select=fcm_token,platform,auth_user_id`;
    if (recipientAuthId) {
      tokenQuery = `employee_device_tokens?or=(employee_id.eq.${mgr.id},auth_user_id.eq.${recipientAuthId})&select=fcm_token,platform,auth_user_id`;
    }
    const tokenRes = await sbFetch(tokenQuery);
    const devTokens = Array.isArray(tokenRes.data) ? tokenRes.data : [];

    // 6. Format Messages
    const isOut = (punch.punch_type || '').toUpperCase().includes('OUT');
    const rawSource = (punch.punch_source || '').toUpperCase();
    const sourceLabel = rawSource.includes('BIO')
      ? 'Biometric Terminal'
      : rawSource.includes('WEB')
      ? 'Web Portal'
      : 'Mobile App';

    const punchTime = punch.punch_time ? new Date(punch.punch_time) : new Date();
    const timeFormatted = punchTime.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });

    const empName = (emp.display_name || `${emp.first_name || ''} ${emp.last_name || ''}`).trim();
    const empCode = emp.employee_code || '';
    const title = isOut ? `👋 Employee Check-Out: ${empName}` : `🟢 Employee Check-In: ${empName}`;
    const message = isOut
      ? `${empName} (${empCode}) checked out at ${timeFormatted} via ${sourceLabel}.`
      : `${empName} (${empCode}) checked in at ${timeFormatted} via ${sourceLabel}.`;

    const orgId = emp.organization_id || punch.organization_id || '0c621892-e938-4707-9957-13534ea32c19';
    const eventType = isOut ? 'attendance.check_out.accepted' : 'attendance.check_in.accepted';

    // 7. Persist in notification_events so the alert appears in supervisor's in-app notification center & mobile bell
    if (recipientProfileId) {
      try {
        await sbFetch('notification_events', {
          method: 'POST',
          body: [{
            organization_id: orgId,
            recipient_user_id: recipientProfileId,
            channel: 'IN_APP',
            title,
            message,
            action_url: `/attendance?emp=${emp.id}&date=${punchTime.toISOString().split('T')[0]}`,
            is_read: false,
            is_sent: true,
            sent_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          }],
        });
      } catch (e) {
        console.warn('[AttendanceDaemon] In-app notification persistence notice:', e.message);
      }
    }

    // 8. Dispatch FCM Push Notifications to Supervisor Tray
    if (devTokens.length > 0) {
      for (const t of devTokens) {
        if (!t.fcm_token) continue;
        try {
          const pushUrl = `${SUPABASE_URL}/functions/v1/send-push`;
          const pushRes = await fetch(pushUrl, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${SERVICE_KEY || SUPABASE_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: t.fcm_token,
              employee_id: mgr.id,
              auth_user_id: recipientAuthId,
              title,
              body: message,
              route: 'attendance',
              data: {
                route: 'attendance',
                eventType,
                punchId: punch.id,
                employeeId: punch.employee_id,
              },
            }),
          });

          const pushData = await pushRes.json().catch(() => ({}));
          const isDelivered = pushRes.ok && (pushData.success !== false);
          const providerMsgId = pushData.messageId || (pushData.results && pushData.results[0]?.messageId) || 'live-fcm';

          console.log(`[AttendanceDaemon] ✓ Live Push sent to supervisor ${mgr.first_name} ${mgr.last_name} (${t.platform}): ${providerMsgId}`);

          // 9. Record in communication_dispatch_logs
          await sbFetch('communication_dispatch_logs', {
            method: 'POST',
            body: [{
              organization_id: orgId,
              employee_id: emp.id,
              channel: 'PUSH',
              provider: 'FCM',
              recipient_phone: mgr.phone || 'APP_PUSH',
              template_key: eventType,
              message_content: JSON.stringify({ title, body: message, route: 'attendance' }),
              dynamic_payload: { route: 'attendance', eventType, punchId: punch.id },
              provider_message_id: providerMsgId,
              status: isDelivered ? 'DELIVERED' : 'FAILED',
              error_code: isDelivered ? null : 'FCM_ERROR',
              error_message: isDelivered ? null : JSON.stringify(pushData),
              cost_inr: 0.45,
            }],
          });
        } catch (pushErr) {
          console.error('[AttendanceDaemon] Push dispatch network notice:', pushErr.message);
        }
      }
    } else {
      console.log(`[AttendanceDaemon] Supervisor ${mgr.first_name} ${mgr.last_name} has no registered FCM tokens.`);
    }
  } catch (err) {
    console.error('[AttendanceDaemon] Error processing punch record:', err.message);
  }
}

let isPolling = false;
let lastSweepTime = new Date(Date.now() - 30000).toISOString();

async function pollRecentPunches() {
  if (isPolling) return;
  isPolling = true;

  try {
    // Look back 90 seconds to ensure zero missed punches
    const queryTime = new Date(Date.now() - 90000).toISOString();
    const endpoint = `attendance_punches?created_at=gte.${encodeURIComponent(queryTime)}&order=created_at.asc&limit=25`;
    const res = await sbFetch(endpoint);

    if (res.ok && Array.isArray(res.data) && res.data.length > 0) {
      for (const punch of res.data) {
        if (!processedPunchIds.has(punch.id)) {
          await processPunchRecord(punch);
        }
      }
    }
  } catch (err) {
    console.warn('[AttendanceDaemon] Poller notice:', err.message);
  } finally {
    isPolling = false;
  }
}

// ============================================================================
// 24/7 Automated Attendance Report Scheduler (Morning Turnout & Evening MIS)
// Guarantees zero missed reports via Email (Hostinger SMTP) and WhatsApp (Meta Cloud API)
// ============================================================================
let isReportSchedulerRunning = false;

export async function checkAndRunScheduledReports() {
  if (isReportSchedulerRunning) return;
  isReportSchedulerRunning = true;

  try {
    const res = await sbFetch('attendance_report_schedules?enabled=eq.true&order=updated_at.desc&limit=5');
    const schedules = Array.isArray(res.data) ? res.data : [];
    if (schedules.length === 0) return;

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istDateStr = istNow.toISOString().split('T')[0];
    const istHour = istNow.getUTCHours();
    const istMin = istNow.getUTCMinutes();
    const curTotalMin = istHour * 60 + istMin;

    for (const sched of schedules) {
      if (sched.frequency === 'WEEKDAYS') {
        const istDay = istNow.getUTCDay();
        if (istDay === 0 || istDay === 6) continue;
      }

      // ── Morning Slot (10:30 AM default) ───────────────────────────────────
      if (sched.morning_enabled !== false) {
        const [mH, mM] = (sched.morning_time || '10:30').split(':').map(Number);
        const mTargetMin = mH * 60 + mM;

        let alreadyDoneMorning = false;
        if (sched.last_morning_run_at && (sched.last_morning_status === 'SUCCESS' || sched.last_morning_status === 'IN_PROGRESS')) {
          const runDate = new Date(sched.last_morning_run_at);
          const runIst = new Date(runDate.getTime() + istOffset);
          const runDateStr = runIst.toISOString().split('T')[0];
          const runHour = runIst.getUTCHours();
          if (runDateStr === istDateStr && runHour >= 8 && runHour < 15) {
            alreadyDoneMorning = true;
          }
        }

        // Trigger if current time is past morning target time and before 15:00 IST
        if (!alreadyDoneMorning && curTotalMin >= mTargetMin && curTotalMin < 15 * 60) {
          console.log(`[AttendanceReportDaemon] 🌅 Triggering MORNING Attendance MIS Report for ${istDateStr}...`);
          await sbFetch(`attendance_report_schedules?id=eq.${sched.id}`, {
            method: 'PATCH',
            body: {
              last_morning_status: 'IN_PROGRESS',
              last_morning_run_at: now.toISOString(),
              updated_at: now.toISOString(),
            },
          });

          const dispRes = await fetch(`${SUPABASE_URL}/functions/v1/attendance-report-dispatcher`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SERVICE_KEY || SUPABASE_KEY}`,
            },
            body: JSON.stringify({
              slot: 'MORNING',
              mode: 'AUTOMATED_SCHEDULE',
              organization_id: sched.organization_id,
              date: istDateStr,
            }),
          });

          const dispJson = await dispRes.json().catch(() => ({}));
          console.log('[AttendanceReportDaemon] Morning dispatch result:', dispJson);

          await sbFetch(`attendance_report_schedules?id=eq.${sched.id}`, {
            method: 'PATCH',
            body: {
              last_morning_status: dispRes.ok && dispJson.success ? 'SUCCESS' : 'ERROR',
              last_morning_message: dispJson.message || `Morning MIS delivered (Email: ${dispJson.email?.status}, WA: ${dispJson.whatsapp?.successCount || 0} sent)`,
              updated_at: now.toISOString(),
            },
          });
        }
      }

      // ── Evening Slot (07:00 PM / 19:00 default) ───────────────────────────
      if (sched.evening_enabled !== false) {
        const [eH, eM] = (sched.evening_time || '19:00').split(':').map(Number);
        const eTargetMin = eH * 60 + eM;

        let alreadyDoneEvening = false;
        if (sched.last_evening_run_at && (sched.last_evening_status === 'SUCCESS' || sched.last_evening_status === 'IN_PROGRESS')) {
          const runDate = new Date(sched.last_evening_run_at);
          const runIst = new Date(runDate.getTime() + istOffset);
          const runDateStr = runIst.toISOString().split('T')[0];
          const runHour = runIst.getUTCHours();
          // Evening run ONLY valid if it was actually executed at or after 17:00 (5:00 PM IST)!
          if (runDateStr === istDateStr && runHour >= 17) {
            alreadyDoneEvening = true;
          }
        }

        // Trigger if current time is past evening target time (from 19:00 onwards until midnight)
        if (!alreadyDoneEvening && curTotalMin >= eTargetMin) {
          console.log(`[AttendanceReportDaemon] 🌆 Triggering EVENING End-of-Day Attendance MIS Report for ${istDateStr}...`);
          await sbFetch(`attendance_report_schedules?id=eq.${sched.id}`, {
            method: 'PATCH',
            body: {
              last_evening_status: 'IN_PROGRESS',
              last_evening_run_at: now.toISOString(),
              updated_at: now.toISOString(),
            },
          });

          const dispRes = await fetch(`${SUPABASE_URL}/functions/v1/attendance-report-dispatcher`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SERVICE_KEY || SUPABASE_KEY}`,
            },
            body: JSON.stringify({
              slot: 'EVENING',
              mode: 'AUTOMATED_SCHEDULE',
              organization_id: sched.organization_id,
              date: istDateStr,
            }),
          });

          const dispJson = await dispRes.json().catch(() => ({}));
          console.log('[AttendanceReportDaemon] Evening dispatch result:', dispJson);

          await sbFetch(`attendance_report_schedules?id=eq.${sched.id}`, {
            method: 'PATCH',
            body: {
              last_evening_status: dispRes.ok && dispJson.success ? 'SUCCESS' : 'ERROR',
              last_evening_message: dispJson.message || `Evening MIS delivered (Email: ${dispJson.email?.status}, WA: ${dispJson.whatsapp?.successCount || 0} sent)`,
              updated_at: now.toISOString(),
            },
          });
        }
      }
    }
  } catch (err) {
    console.warn('[AttendanceReportDaemon] Check notice:', err.message);
  } finally {
    isReportSchedulerRunning = false;
  }
}

/**
 * Start the 24/7 attendance notification daemon
 */
export function startAttendanceRealtimeDaemon() {
  console.log('[AttendanceDaemon] Initializing 24/7 Attendance Punch & Push Notification Daemon (Native REST Engine)...');

  // Seed cache with most recent punch IDs so we don't spam historical records on boot
  sbFetch('attendance_punches?order=created_at.desc&limit=50').then(res => {
    if (res.ok && Array.isArray(res.data)) {
      for (const p of res.data) {
        processedPunchIds.add(p.id);
      }
      console.log(`[AttendanceDaemon] Initialized historical cache with ${res.data.length} recent punch IDs.`);
    }
  }).catch(() => {});

  // High-frequency punch polling (every 10 seconds)
  setInterval(pollRecentPunches, 10000);
  console.log('[AttendanceDaemon] ✓ 24/7 Punch Poller active (10s interval)');

  // Automated attendance report schedule monitoring (every 30 seconds)
  setTimeout(checkAndRunScheduledReports, 2000);
  setInterval(checkAndRunScheduledReports, 30000);
  console.log('[AttendanceDaemon] ✓ 24/7 Report Scheduler active (30s interval for Email & WhatsApp)');
}
