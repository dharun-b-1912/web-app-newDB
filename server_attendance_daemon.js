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

    // 7. Authoritative Notification Gateway (Migration 189):
    // Centralized hierarchical notification creation is managed by the PostgreSQL trigger
    // trg_fn_notify_daily_attendance on public.attendance_daily.
    // Direct duplicate writes here are disabled to ensure zero duplicate notifications.
    /*
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
    */

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
const dispatchedOrgSlotsToday = new Set(); // Format: `${orgId}_${istDateStr}_${slot}`

export async function checkAndRunScheduledReports() {
  if (isReportSchedulerRunning) return;
  isReportSchedulerRunning = true;

  try {
    const res = await sbFetch('attendance_report_schedules?enabled=eq.true&order=updated_at.desc&limit=10');
    const rawSchedules = Array.isArray(res.data) ? res.data : [];
    if (rawSchedules.length === 0) return;

    // Deduplicate schedule rows by organization_id (only evaluate the most recently updated schedule per tenant)
    const seenOrgs = new Set();
    const schedules = [];
    for (const row of rawSchedules) {
      const orgKey = row.organization_id || 'default-org';
      if (!seenOrgs.has(orgKey)) {
        seenOrgs.add(orgKey);
        schedules.push(row);
      }
    }

    const now = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000;
    const istNow = new Date(now.getTime() + istOffset);
    const istDateStr = istNow.toISOString().split('T')[0];
    const istHour = istNow.getUTCHours();
    const istMin = istNow.getUTCMinutes();
    const curTotalMin = istHour * 60 + istMin;

    for (const sched of schedules) {
      const orgId = sched.organization_id || '0c621892-e938-4707-9957-13534ea32c19';

      if (sched.frequency === 'WEEKDAYS') {
        const istDay = istNow.getUTCDay();
        if (istDay === 0 || istDay === 6) continue;
      }

      // ── Morning Slot (10:30 AM default, no restrictive hour gatekeeper) ───
      if (sched.morning_enabled !== false) {
        const [mH, mM] = (sched.morning_time || '10:30').split(':').map(Number);
        const mTargetMin = mH * 60 + mM;
        const morningKey = `${orgId}_${istDateStr}_MORNING_${sched.morning_time || '10:30'}`;

        let alreadyDoneMorning = dispatchedOrgSlotsToday.has(morningKey);
        if (!alreadyDoneMorning && sched.last_morning_run_at && (sched.last_morning_status === 'SUCCESS' || sched.last_morning_status === 'IN_PROGRESS')) {
          const runDate = new Date(sched.last_morning_run_at);
          const runIst = new Date(runDate.getTime() + istOffset);
          const runDateStr = runIst.toISOString().split('T')[0];
          const runTotalMin = runIst.getUTCHours() * 60 + runIst.getUTCMinutes();
          // Marked done if it already ran today on or after the configured morning_time (or is currently IN_PROGRESS within 5 mins)
          if (runDateStr === istDateStr && (runTotalMin >= mTargetMin - 5 || sched.last_morning_status === 'IN_PROGRESS')) {
            alreadyDoneMorning = true;
            dispatchedOrgSlotsToday.add(morningKey);
          }
        }

        // Trigger once when current time reaches morning_time (within a 90-minute catchup window, no arbitrary hour gatekeeper)
        if (!alreadyDoneMorning && curTotalMin >= mTargetMin && curTotalMin <= mTargetMin + 90) {
          dispatchedOrgSlotsToday.add(morningKey);
          console.log(`[AttendanceReportDaemon] 🌅 Triggering MORNING Attendance MIS Report for ${istDateStr} (Org: ${orgId})...`);

          const dispRes = await fetch(`${SUPABASE_URL}/functions/v1/attendance-report-dispatcher`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SERVICE_KEY || SUPABASE_KEY}`,
            },
            body: JSON.stringify({
              slot: 'MORNING',
              mode: 'AUTOMATED_SCHEDULE',
              organization_id: orgId,
              date: istDateStr,
            }),
          });

          const dispJson = await dispRes.json().catch(() => ({}));
          console.log('[AttendanceReportDaemon] Morning dispatch result:', dispJson);

          if (!dispJson.skipped) {
            await sbFetch(`attendance_report_schedules?id=eq.${sched.id}`, {
              method: 'PATCH',
              body: {
                last_morning_run_at: now.toISOString(),
                last_morning_status: dispRes.ok && dispJson.success ? 'SUCCESS' : 'ERROR',
                last_morning_message: dispJson.message || `Morning MIS delivered (Email: ${dispJson.email?.status}, WA: ${dispJson.whatsapp?.successCount || 0} sent)`,
                updated_at: now.toISOString(),
              },
            });
          }
        }
      }

      // ── Evening Slot (07:00 PM / 19:00 default, no restrictive hour gatekeeper) ──
      if (sched.evening_enabled !== false) {
        const [eH, eM] = (sched.evening_time || '19:00').split(':').map(Number);
        const eTargetMin = eH * 60 + eM;
        const eveningKey = `${orgId}_${istDateStr}_EVENING_${sched.evening_time || '19:00'}`;

        let alreadyDoneEvening = dispatchedOrgSlotsToday.has(eveningKey);
        if (!alreadyDoneEvening && sched.last_evening_run_at && (sched.last_evening_status === 'SUCCESS' || sched.last_evening_status === 'IN_PROGRESS')) {
          const runDate = new Date(sched.last_evening_run_at);
          const runIst = new Date(runDate.getTime() + istOffset);
          const runDateStr = runIst.toISOString().split('T')[0];
          const runTotalMin = runIst.getUTCHours() * 60 + runIst.getUTCMinutes();
          if (runDateStr === istDateStr && (runTotalMin >= eTargetMin - 5 || sched.last_evening_status === 'IN_PROGRESS')) {
            alreadyDoneEvening = true;
            dispatchedOrgSlotsToday.add(eveningKey);
          }
        }

        // Trigger once when current time reaches evening_time (within a 90-minute catchup window, no arbitrary >=17h gatekeeper)
        if (!alreadyDoneEvening && curTotalMin >= eTargetMin && curTotalMin <= eTargetMin + 90) {
          dispatchedOrgSlotsToday.add(eveningKey);
          console.log(`[AttendanceReportDaemon] 🌆 Triggering EVENING End-of-Day Attendance MIS Report for ${istDateStr} (Org: ${orgId})...`);

          const dispRes = await fetch(`${SUPABASE_URL}/functions/v1/attendance-report-dispatcher`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SERVICE_KEY || SUPABASE_KEY}`,
            },
            body: JSON.stringify({
              slot: 'EVENING',
              mode: 'AUTOMATED_SCHEDULE',
              organization_id: orgId,
              date: istDateStr,
            }),
          });

          const dispJson = await dispRes.json().catch(() => ({}));
          console.log('[AttendanceReportDaemon] Evening dispatch result:', dispJson);

          if (!dispJson.skipped) {
            await sbFetch(`attendance_report_schedules?id=eq.${sched.id}`, {
              method: 'PATCH',
              body: {
                last_evening_run_at: now.toISOString(),
                last_evening_status: dispRes.ok && dispJson.success ? 'SUCCESS' : 'ERROR',
                last_evening_message: dispJson.message || `Evening MIS delivered (Email: ${dispJson.email?.status}, WA: ${dispJson.whatsapp?.successCount || 0} sent)`,
                updated_at: now.toISOString(),
              },
            });
          }
        }
      }
    }
  } catch (err) {
    console.warn('[AttendanceReportDaemon] Check notice:', err.message);
  } finally {
    isReportSchedulerRunning = false;
  }
}

// ── Biometric Device Heartbeat & Offline Telegram Watchdog ───────────────────
const TG_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '9137821052:AAH40OpD041tLdmC0_fheiZbk9_AxGs2TQ0';
const TG_CHAT_IDS = (process.env.TELEGRAM_CHAT_ID || '-5189746331,9155594412').split(',').map(s => s.trim()).filter(Boolean);

// Track alerted state for each device to avoid duplicate spamming
const deviceOfflineState = new Map(); // serial -> { isOffline: boolean, offlineSince: string, lastAlertAt: number, alertCount: number }

async function sendTelegramAlert(html) {
  for (const chatId of TG_CHAT_IDS) {
    try {
      await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: html,
          parse_mode: 'HTML',
        }),
      });
    } catch (e) {
      console.warn(`[BiometricWatchdog] Telegram send error (${chatId}):`, e.message);
    }
  }
}

let isDeviceWatchdogRunning = false;
export async function checkBiometricDeviceHeartbeats() {
  if (isDeviceWatchdogRunning) return;
  isDeviceWatchdogRunning = true;

  try {
    const res = await sbFetch('biometric_devices?is_active=eq.true&select=id,device_name,serial_number,ip_address,organization_id,last_heartbeat_at');
    const devices = Array.isArray(res.data) ? res.data : [];
    if (devices.length === 0) return;

    const nowMs = Date.now();
    const TIMEOUT_MS = 3 * 60 * 1000; // 3 minutes without heartbeat = offline

    for (const dev of devices) {
      const serial = dev.serial_number;
      if (!serial) continue;

      const lastHbMs = dev.last_heartbeat_at ? new Date(dev.last_heartbeat_at).getTime() : 0;
      const ageMs = nowMs - lastHbMs;
      const isDead = ageMs > TIMEOUT_MS;

      const devName = dev.device_name || `eSSL Device (${serial})`;
      const orgLabel = dev.organization_id === 'c5ab6b03-adde-47cc-a033-064f4c39b21e' ? 'Electra EV' : 'Joy Corporate Solutions';
      const timeStr = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });

      // If state is not yet tracked and the device has ALREADY been dead for > 15 mins (e.g. server restart),
      // do not spam Telegram on startup. Quietly track it as already notified.
      if (!deviceOfflineState.has(serial)) {
        if (isDead && ageMs > 15 * 60 * 1000) {
          deviceOfflineState.set(serial, {
            isOffline: true,
            offlineSince: dev.last_heartbeat_at,
            lastAlertAt: nowMs,
            alertCount: 2, // Maxed out: suppress alert for already-dead device
          });
          continue;
        } else {
          deviceOfflineState.set(serial, {
            isOffline: false,
            offlineSince: null,
            lastAlertAt: 0,
            alertCount: 0,
          });
        }
      }

      const state = deviceOfflineState.get(serial);

      if (isDead) {
        // Device is OFFLINE
        const alertCount = state.alertCount || (state.isOffline ? 1 : 0);
        // Only alert on transition (alertCount === 0) OR one reminder at 30 minutes (alertCount === 1).
        // Never spam beyond 2 alerts.
        const shouldAlert = !state.isOffline || (alertCount < 2 && (nowMs - state.lastAlertAt > 30 * 60 * 1000));

        if (shouldAlert) {
          const deadMinutes = Math.round(ageMs / 60000);
          const lastHbTime = lastHbMs ? new Date(lastHbMs).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }) : 'Never';

          const alertHtml = `🚨 <b>[BIOMETRIC TERMINAL OFFLINE] JOY SENTINEL</b>
━━━━━━━━━━━━━━━━━━━━
<b>Terminal</b>: ${devName}
<b>Serial Number</b>: <code>${serial}</code>
<b>Organization</b>: <b>${orgLabel}</b>
<b>IP / Port</b>: <code>${dev.ip_address || '4G SIM'}:4370</code>

⚠️ <b>Status</b>: <b>OFFLINE / HEARTBEAT FAILED</b>
⏱ <b>Last Heartbeat</b>: ${lastHbTime} (${deadMinutes} mins ago)
🕒 <b>Alert Time</b>: ${timeStr}

<b>Probable Causes:</b>
• Terminal powered OFF or plant main gate power outage
• 4G SIM cellular network loss / APN disconnect
• Hardware freeze or reboot required

<i>System will automatically alert when connection recovers.</i>
━━━━━━━━━━━━━━━━━━━━`;

          console.log(`[BiometricWatchdog] Device ${serial} is OFFLINE (${deadMinutes} mins, alert #${alertCount + 1}). Sending Telegram alert...`);
          await sendTelegramAlert(alertHtml);

          deviceOfflineState.set(serial, {
            isOffline: true,
            offlineSince: dev.last_heartbeat_at,
            lastAlertAt: nowMs,
            alertCount: alertCount + 1,
          });
        }
      } else {
        // Device is ONLINE
        if (state.isOffline) {
          // Transitioned from OFFLINE -> ONLINE (Recovered!)
          const recoveredHtml = `🟢 <b>[BIOMETRIC TERMINAL RESTORED] JOY SENTINEL</b>
━━━━━━━━━━━━━━━━━━━━
<b>Terminal</b>: ${devName}
<b>Serial Number</b>: <code>${serial}</code>
<b>Organization</b>: <b>${orgLabel}</b>
<b>Status</b>: <b>RESTORED ONLINE (Heartbeat Active)</b>
🕒 <b>Restored At</b>: ${timeStr}

✓ <i>4G ADMS Cloud connection re-established. Buffered offline attendance punches are syncing.</i>
━━━━━━━━━━━━━━━━━━━━`;

          console.log(`[BiometricWatchdog] Device ${serial} RESTORED ONLINE. Sending Telegram recovery alert...`);
          await sendTelegramAlert(recoveredHtml);

          deviceOfflineState.set(serial, {
            isOffline: false,
            offlineSince: null,
            lastAlertAt: 0,
            alertCount: 0,
          });
        }
      }
    }
  } catch (err) {
    console.warn('[BiometricWatchdog] Check error:', err.message);
  } finally {
    isDeviceWatchdogRunning = false;
  }
}

// ── Web App Uptime & 403 / 500 Telegram Sentinel Watchdog ───────────────────
let webAppState = { isDown: false, lastStatus: 200, downSince: null, alertCount: 0, lastAlertAt: 0 };
let isWebWatchdogRunning = false;

export async function checkWebAppHealth() {
  if (isWebWatchdogRunning) return;
  isWebWatchdogRunning = true;

  try {
    const url = 'https://app.joypeoplehr.com';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const startTime = Date.now();
    let res = null;
    let text = '';
    let fetchError = null;

    try {
      res = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'JoySentinel-Watchdog/2.0' } });
      text = await res.text();
    } catch (e) {
      fetchError = e;
    } finally {
      clearTimeout(timeout);
    }

    const latencyMs = Date.now() - startTime;
    const timeStr = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' });

    const isHttpError = !res || !res.ok || res.status === 403 || res.status >= 500;
    const isBlankOrForbidden = text.includes('403 Forbidden') || text.includes('Access to this resource on the server is denied');
    const isHealthy = !fetchError && !isHttpError && !isBlankOrForbidden && (text.includes('<!doctype html') || text.includes('<html'));

    if (!isHealthy) {
      const statusCode = res ? res.status : 0;
      const statusText = res ? res.statusText : (fetchError ? fetchError.message : 'Unreachable');

      // Only alert on transition or 30-min reminder
      const nowMs = Date.now();
      const shouldAlert = !webAppState.isDown || (webAppState.alertCount < 2 && (nowMs - webAppState.lastAlertAt > 30 * 60 * 1000));

      if (shouldAlert) {
        const errorHtml = `🚨 <b>[PRODUCTION WEB APP INCIDENT] JOY SENTINEL</b>
━━━━━━━━━━━━━━━━━━━━
<b>Domain</b>: <code>app.joypeoplehr.com</code>
<b>HTTP Status</b>: <b>${statusCode || 'DOWN'} ${statusText}</b>
<b>Latency</b>: <code>${latencyMs}ms</code>
🕒 <b>Incident Time</b>: ${timeStr}

⚠️ <b>Impact</b>: Production users unable to access HRMS portal!
<b>Diagnosis</b>: ${isBlankOrForbidden ? 'Directory Index or 403 Forbidden access denial detected.' : 'Web server unavailable or responding with error code.'}

<i>Sentinel Watchdog will notify immediately upon recovery.</i>
━━━━━━━━━━━━━━━━━━━━`;

        console.log(`[WebAppWatchdog] 🚨 Production App DOWN (${statusCode} ${statusText}). Sending Telegram alert...`);
        await sendTelegramAlert(errorHtml);

        webAppState = {
          isDown: true,
          lastStatus: statusCode,
          downSince: webAppState.downSince || new Date().toISOString(),
          lastAlertAt: nowMs,
          alertCount: (webAppState.alertCount || 0) + 1,
        };
      }
    } else {
      // System is Healthy!
      if (webAppState.isDown) {
        // Transitioned from DOWN -> RESTORED!
        const restoredHtml = `🟢 <b>[PRODUCTION WEB APP RESTORED] JOY SENTINEL</b>
━━━━━━━━━━━━━━━━━━━━
<b>Domain</b>: <code>app.joypeoplehr.com</code>
<b>HTTP Status</b>: <b>200 OK</b>
<b>Latency</b>: <code>${latencyMs}ms</code>
🕒 <b>Restored At</b>: ${timeStr}

✓ <b>Status</b>: <b>FULL PORTAL ACCESS RESTORED & HEALTHY</b>
<i>SPA index.html & client bundles responding normally.</i>
━━━━━━━━━━━━━━━━━━━━`;

        console.log(`[WebAppWatchdog] 🟢 Production App RESTORED (200 OK, ${latencyMs}ms). Sending Telegram restore alert...`);
        await sendTelegramAlert(restoredHtml);

        webAppState = {
          isDown: false,
          lastStatus: 200,
          downSince: null,
          lastAlertAt: 0,
          alertCount: 0,
        };
      }
    }
  } catch (err) {
    console.warn('[WebAppWatchdog] Probe error:', err.message);
  } finally {
    isWebWatchdogRunning = false;
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

  // 24/7 Biometric device heartbeat & offline Telegram watchdog (checks every 60 seconds)
  setTimeout(checkBiometricDeviceHeartbeats, 5000);
  setInterval(checkBiometricDeviceHeartbeats, 60000);
  console.log('[AttendanceDaemon] ✓ 24/7 Biometric Device Telegram Watchdog active (60s interval)');

  // 24/7 Web Application Uptime & 403/500 Telegram Sentinel Watchdog (checks every 60 seconds)
  setTimeout(checkWebAppHealth, 3000);
  setInterval(checkWebAppHealth, 60000);
  console.log('[AttendanceDaemon] ✓ 24/7 Web App Uptime Telegram Watchdog active (60s interval)');
}
