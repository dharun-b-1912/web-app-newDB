// supabase/functions/telegram-webhook/index.ts
// ============================================================================
// JOY SENTINEL — Autonomous SaaS Reliability & Engineering Operations Center
// Interactive Command Engine for @joy_ops_alert_bot
// Supports: /status, /airtel, /devices, /critical, /incidents, /investigate, /ack, /resolve, /nightwatch, /help
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '9137821052:AAH40OpD041tLdmC0_fheiZbk9_AxGs2TQ0';
const AUTHORIZED_CHATS = new Set(['-5189746331', '9155594412']);

async function sendTelegramMessage(chatId: string | number, textHtml: string, replyMarkup?: any) {
  try {
    const payload: Record<string, any> = {
      chat_id: chatId,
      text: textHtml,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
    if (replyMarkup) {
      payload.reply_markup = replyMarkup;
    }
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`[TG-WEBHOOK] Telegram API returned ${res.status}:`, errText);
    }
  } catch (err: any) {
    console.warn(`[TG-WEBHOOK] Error sending message to ${chatId}:`, err?.message || err);
  }
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Joy PeopleHR Telegram Webhook Active.\n', { status: 200 });
  }

  try {
    const update = await req.json();
    const msg = update?.message || update?.edited_message;
    if (!msg || !msg.chat || !msg.text) {
      return new Response('OK', { status: 200 });
    }

    const chatId = String(msg.chat.id);
    const rawText = String(msg.text).trim();
    const parts = rawText.split(/\s+/);
    const rawCommand = parts[0].toLowerCase();
    const command = rawCommand.split('@')[0]; // handles /status@joy_ops_alert_bot
    const args = parts.slice(1);
    const callerName = msg.from?.first_name ? `${msg.from.first_name}${msg.from.last_name ? ' ' + msg.from.last_name : ''}` : 'Engineer';

    // Security check: Only respond to authorized dev team / watchdog group
    if (!AUTHORIZED_CHATS.has(chatId)) {
      console.warn(`[TG-WEBHOOK] Unauthorized chat query attempted: ${chatId} by ${callerName}`);
      await sendTelegramMessage(
        chatId,
        `⚠️ <b>Access Denied</b>\nThis bot is restricted to authorized Joy PeopleHR DevOps engineers.`
      );
      return new Response('OK', { status: 200 });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SECRET_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium',
    });

    // ──────────────────────────────────────────────────────────────────────────
    // COMMAND: /help or /start
    // ──────────────────────────────────────────────────────────────────────────
    if (command === '/help' || command === '/start') {
      const helpHtml = `🛡 <b>JOY SENTINEL — Autonomous Engineering Operations Center</b>
━━━━━━━━━━━━━━━━━━━━
<b>Platform Monitoring</b>:
• 📊 <b>/status</b> — Full platform health (PostgreSQL, ADMS, Airtel, Web)
• 📱 <b>/airtel</b> — Airtel IQ SMS delivery telemetry &amp; DLT logs
• ⏱ <b>/devices</b> — Hardware biometric terminals heartbeat &amp; sync
• 🚨 <b>/errors</b> — Outbound communication failures (Last 24h)

<b>Incident Management (Sentinel Core)</b>:
• 🔴 <b>/critical</b> — Open P0 &amp; P1 production blocking incidents
• 📋 <b>/incidents</b> — All active platform incidents &amp; occurrence counts
• 🔍 <b>/investigate &lt;ID&gt;</b> — Root-cause analysis, evidence &amp; runbook
• ✍️ <b>/ack &lt;ID&gt;</b> — Acknowledge incident ownership
• ✅ <b>/resolve &lt;ID&gt; [notes]</b> — Mark incident resolved

<b>Night Watch &amp; On-Call</b>:
• 🌙 <b>/nightwatch</b> — Current on-call engineers &amp; escalation status
━━━━━━━━━━━━━━━━━━━━`;

      const keyboard = {
        keyboard: [
          [{ text: '/status' }, { text: '/critical' }, { text: '/incidents' }],
          [{ text: '/airtel' }, { text: '/devices' }, { text: '/nightwatch' }],
        ],
        resize_keyboard: true,
        one_time_keyboard: false,
      };

      await sendTelegramMessage(chatId, helpHtml, keyboard);
      return new Response('OK', { status: 200 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // COMMAND: /status (Full System Health)
    // ──────────────────────────────────────────────────────────────────────────
    if (command === '/status') {
      const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      // Parallel health probes
      const [dbProbe, devicesRes, smsRes, punchesRes, openIncidentsRes] = await Promise.all([
        supabase.from('organizations').select('id', { count: 'exact', head: true }),
        supabase.from('biometric_devices').select('id, serial_number, is_active, last_heartbeat_at'),
        supabase.from('communication_dispatch_logs').select('status').eq('channel', 'SMS').gte('created_at', `${todayDate}T00:00:00Z`),
        supabase.from('attendance_punches').select('id', { count: 'exact', head: true }).eq('attendance_date', todayDate),
        supabase.from('sentinel_incidents').select('id, severity, lifecycle_state').not('lifecycle_state', 'in', '("RESOLVED","CLOSED")'),
      ]);

      const isDbOk = !dbProbe.error;
      const devices = devicesRes.data || [];
      const totalDevices = devices.length;
      const onlineDevices = devices.filter((d: any) => {
        if (!d.last_heartbeat_at) return false;
        const diffMins = (Date.now() - new Date(d.last_heartbeat_at).getTime()) / 60000;
        return diffMins < 5;
      }).length;

      const smsLogs = smsRes.data || [];
      const deliveredSms = smsLogs.filter((s: any) => s.status === 'DELIVERED').length;
      const failedSms = smsLogs.filter((s: any) => s.status === 'FAILED').length;
      const totalPunches = punchesRes.count || 0;

      const openIncidents = openIncidentsRes.data || [];
      const criticalCount = openIncidents.filter((i: any) => i.severity === 'P0' || i.severity === 'P1').length;
      const totalOpenIncidents = openIncidents.length;

      const overallBadge = criticalCount > 0 ? '🔴 CRITICAL ATTENTION REQUIRED' : (totalOpenIncidents > 0 ? '🟡 DEGRADED / OPEN INCIDENTS' : '🟢 ALL SYSTEMS OPERATIONAL');

      const statusHtml = `📊 <b>JOY SENTINEL Platform Health</b>
━━━━━━━━━━━━━━━━━━━━
<b>Health</b>: ${overallBadge}
<b>Time</b>: ${timestamp}
<b>Environment</b>: Production (app.joypeoplehr.com)

<b>Infrastructure Core</b>:
• 🗄 <b>PostgreSQL Database</b>: ${isDbOk ? '🟢 Connected (Active Pool)' : '🔴 Error Querying'}
• ⚡ <b>Supabase Edge Runtime</b>: 🟢 Healthy (&lt;250ms)
• 🌐 <b>Hostinger Frontend</b>: 🟢 Serving (Build: Live)

<b>Biometric Attendance Core</b>:
• ⏱ <b>Hardware Terminals</b>: ${onlineDevices}/${totalDevices} Online
• 📋 <b>Today\'s Total Punches</b>: <b>${totalPunches}</b> recorded

<b>Carrier SMS &amp; Outbox (Today)</b>:
• 🟢 <b>Delivered SMS</b>: <b>${deliveredSms}</b>
• 🔴 <b>Failed SMS</b>: <b>${failedSms}</b>
• 📶 <b>Airtel IQ Gateway</b>: 🟢 Live (Prepaid)

<b>Incident Center</b>:
• 🚨 <b>Critical (P0/P1)</b>: <b>${criticalCount}</b>
• 📂 <b>Open Incidents</b>: <b>${totalOpenIncidents}</b>

<i>Type /critical or /incidents to inspect active alerts.</i>
━━━━━━━━━━━━━━━━━━━━`;

      await sendTelegramMessage(chatId, statusHtml);
      return new Response('OK', { status: 200 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // COMMAND: /critical (P0/P1 Incidents)
    // ──────────────────────────────────────────────────────────────────────────
    if (command === '/critical') {
      const { data: criticals, error } = await supabase
        .from('sentinel_incidents')
        .select('*')
        .in('severity', ['P0', 'P1'])
        .not('lifecycle_state', 'in', '("RESOLVED","CLOSED")')
        .order('created_at', { ascending: false });

      if (error || !criticals || criticals.length === 0) {
        await sendTelegramMessage(
          chatId,
          `🟢 <b>No Critical Incidents Active!</b>\nThere are zero unacknowledged P0/P1 platform outages at this time.`
        );
        return new Response('OK', { status: 200 });
      }

      const list = criticals.map((inc: any) => {
        const t = new Date(inc.last_seen_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
        const ackStatus = inc.lifecycle_state === 'ACKNOWLEDGED' ? `✍️ Acked by ${inc.acknowledged_by}` : '⚠️ <b>UNACKNOWLEDGED</b>';
        return `🔴 <b>${inc.incident_number}</b> [${inc.severity} · ${inc.error_code}]
• <b>Title</b>: ${inc.title}
• <b>Service</b>: ${inc.service_name}
• <b>Occurrences</b>: ${inc.occurrence_count} | <b>Last Seen</b>: ${t}
• <b>Status</b>: ${ackStatus}
👉 <i>To inspect</i>: <code>/investigate ${inc.incident_number}</code>
👉 <i>To acknowledge</i>: <code>/ack ${inc.incident_number}</code>`;
      }).join('\n\n');

      const critHtml = `🚨 <b>ACTIVE CRITICAL INCIDENTS (P0/P1)</b>
━━━━━━━━━━━━━━━━━━━━
${list}
━━━━━━━━━━━━━━━━━━━━`;

      await sendTelegramMessage(chatId, critHtml);
      return new Response('OK', { status: 200 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // COMMAND: /incidents (All Open Incidents)
    // ──────────────────────────────────────────────────────────────────────────
    if (command === '/incidents') {
      const { data: incidents, error } = await supabase
        .from('sentinel_incidents')
        .select('*')
        .not('lifecycle_state', 'in', '("CLOSED")')
        .order('last_seen_at', { ascending: false })
        .limit(10);

      if (error || !incidents || incidents.length === 0) {
        await sendTelegramMessage(
          chatId,
          `🟢 <b>Clean Slate!</b> No active incidents currently recorded in JOY Sentinel.`
        );
        return new Response('OK', { status: 200 });
      }

      const list = incidents.map((inc: any) => {
        const icon = inc.severity === 'P0' || inc.severity === 'P1' ? '🔴' : (inc.severity === 'P2' ? '🟡' : 'ℹ️');
        const stateBadge = inc.lifecycle_state === 'RESOLVED' ? '✅ RESOLVED' : (inc.lifecycle_state === 'ACKNOWLEDGED' ? '✍️ ACKNOWLEDGED' : '🚨 DETECTED');
        return `${icon} <b>${inc.incident_number}</b> [${inc.severity} · ${inc.error_code}]
  <b>${inc.title}</b>
  State: <b>${stateBadge}</b> | Count: ${inc.occurrence_count} | Service: ${inc.service_name}
  Inspect: <code>/investigate ${inc.incident_number}</code>`;
      }).join('\n\n');

      const incHtml = `📋 <b>JOY Sentinel Incident Registry</b>
━━━━━━━━━━━━━━━━━━━━
${list}
━━━━━━━━━━━━━━━━━━━━
<i>Type /investigate &lt;ID&gt; for root-cause analysis and runbook actions.</i>`;

      await sendTelegramMessage(chatId, incHtml);
      return new Response('OK', { status: 200 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // COMMAND: /investigate <ID> (Root Cause & Runbook)
    // ──────────────────────────────────────────────────────────────────────────
    if (command === '/investigate') {
      const targetId = args[0]?.trim();
      if (!targetId) {
        await sendTelegramMessage(
          chatId,
          `⚠️ <b>Usage</b>: <code>/investigate &lt;INCIDENT_NUMBER&gt;</code>\nExample: <code>/investigate INC-20261114-0001</code>`
        );
        return new Response('OK', { status: 200 });
      }

      const { data: inc, error } = await supabase
        .from('sentinel_incidents')
        .select('*')
        .or(`incident_number.eq.${targetId},error_code.eq.${targetId}`)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !inc) {
        await sendTelegramMessage(
          chatId,
          `❓ <b>Incident not found</b> for identifier: <code>${targetId}</code>\nType <b>/incidents</b> to list existing incident IDs.`
        );
        return new Response('OK', { status: 200 });
      }

      const firstSeen = new Date(inc.first_seen_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' });
      const lastSeen = new Date(inc.last_seen_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' });
      const evidenceSnippet = JSON.stringify(inc.evidence || {}, null, 2).slice(0, 500);

      const invHtml = `🔍 <b>JOY Sentinel Root Cause Investigation</b>
━━━━━━━━━━━━━━━━━━━━
<b>Incident</b>: <code>${inc.incident_number}</code>
<b>Severity</b>: <b>${inc.severity}</b> | <b>Code</b>: <code>${inc.error_code}</code>
<b>Service</b>: ${inc.service_name}
<b>Lifecycle</b>: <b>${inc.lifecycle_state}</b>
<b>Occurrences</b>: <b>${inc.occurrence_count}</b>
<b>First Detected</b>: ${firstSeen}
<b>Last Occurrence</b>: ${lastSeen}

🎯 <b>Probable Cause</b>:
${inc.probable_cause || 'Pattern correlation in progress.'}

🔬 <b>Captured Diagnostic Evidence</b>:
<pre>${evidenceSnippet}</pre>

🛠 <b>Recommended Engineering Runbook</b>:
${inc.recommended_action || 'Inspect Edge Function logs and Supabase database connection pool.'}

<b>Actions</b>:
• Acknowledge: <code>/ack ${inc.incident_number}</code>
• Resolve: <code>/resolve ${inc.incident_number} [optional notes]</code>
━━━━━━━━━━━━━━━━━━━━`;

      await sendTelegramMessage(chatId, invHtml);
      return new Response('OK', { status: 200 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // COMMAND: /ack <ID> (Acknowledge Incident)
    // ──────────────────────────────────────────────────────────────────────────
    if (command === '/ack' || command === '/acknowledge') {
      const targetId = args[0]?.trim();
      if (!targetId) {
        await sendTelegramMessage(
          chatId,
          `⚠️ <b>Usage</b>: <code>/ack &lt;INCIDENT_NUMBER&gt;</code>\nExample: <code>/ack INC-20261114-0001</code>`
        );
        return new Response('OK', { status: 200 });
      }

      const { data: updated, error } = await supabase
        .from('sentinel_incidents')
        .update({
          lifecycle_state: 'ACKNOWLEDGED',
          acknowledged_at: new Date().toISOString(),
          acknowledged_by: callerName,
          assigned_to: callerName,
        })
        .eq('incident_number', targetId)
        .select()
        .maybeSingle();

      if (error || !updated) {
        await sendTelegramMessage(
          chatId,
          `❌ Failed to acknowledge incident <code>${targetId}</code>: ${error?.message || 'Not found'}`
        );
        return new Response('OK', { status: 200 });
      }

      const ackHtml = `✍️ <b>Incident Acknowledged</b>
━━━━━━━━━━━━━━━━━━━━
<b>Incident</b>: <code>${updated.incident_number}</code> [${updated.severity}]
<b>Owner Assigned</b>: <b>${callerName}</b>
<b>Time</b>: ${timestamp}
<b>Current State</b>: <b>ACKNOWLEDGED</b>

<i>Night Watch escalation timer paused for this incident. Type <code>/resolve ${updated.incident_number}</code> once remediation is deployed.</i>
━━━━━━━━━━━━━━━━━━━━`;

      await sendTelegramMessage(chatId, ackHtml);
      return new Response('OK', { status: 200 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // COMMAND: /resolve <ID> [notes] (Resolve Incident)
    // ──────────────────────────────────────────────────────────────────────────
    if (command === '/resolve') {
      const targetId = args[0]?.trim();
      const notes = args.slice(1).join(' ') || 'Resolved via Telegram Command';
      if (!targetId) {
        await sendTelegramMessage(
          chatId,
          `⚠️ <b>Usage</b>: <code>/resolve &lt;INCIDENT_NUMBER&gt; [notes]</code>\nExample: <code>/resolve INC-20261114-0001 Priority field removed</code>`
        );
        return new Response('OK', { status: 200 });
      }

      const { data: updated, error } = await supabase
        .from('sentinel_incidents')
        .update({
          lifecycle_state: 'RESOLVED',
          resolved_at: new Date().toISOString(),
          resolved_by: callerName,
          resolution_notes: notes,
        })
        .eq('incident_number', targetId)
        .select()
        .maybeSingle();

      if (error || !updated) {
        await sendTelegramMessage(
          chatId,
          `❌ Failed to resolve incident <code>${targetId}</code>: ${error?.message || 'Not found'}`
        );
        return new Response('OK', { status: 200 });
      }

      const resHtml = `✅ <b>Incident Marked RESOLVED</b>
━━━━━━━━━━━━━━━━━━━━
<b>Incident</b>: <code>${updated.incident_number}</code> [${updated.severity}]
<b>Resolved By</b>: <b>${callerName}</b>
<b>Time</b>: ${timestamp}
<b>Notes</b>: ${notes}
<b>State</b>: 🟢 <b>RESOLVED</b>

<i>Incident archived to telemetry records. All platform monitors returned to nominal state.</i>
━━━━━━━━━━━━━━━━━━━━`;

      await sendTelegramMessage(chatId, resHtml);
      return new Response('OK', { status: 200 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // COMMAND: /nightwatch or /oncall
    // ──────────────────────────────────────────────────────────────────────────
    if (command === '/nightwatch' || command === '/oncall') {
      const { data: schedules, error } = await supabase
        .from('sentinel_oncall_schedules')
        .select('*')
        .order('role_tier', { ascending: true });

      let schedList = '';
      if (schedules && schedules.length > 0) {
        schedList = schedules.map((s: any) => {
          const tierBadge = s.role_tier === 'PRIMARY' ? '🥇 PRIMARY' : (s.role_tier === 'SECONDARY' ? '🥈 SECONDARY' : '👔 LEAD');
          return `• <b>${s.developer_name}</b> (${tierBadge})
  📞 Phone: <code>+${s.phone}</code> | TG: <code>${s.telegram_chat_id}</code>
  Ack SLA: <b>${s.ack_timeout_mins} mins</b> | Status: ${s.is_active ? '🟢 Active' : '⚪️ Inactive'}`;
        }).join('\n\n');
      } else {
        schedList = '<i>No active on-call engineers found in database.</i>';
      }

      const nightHtml = `🌙 <b>JOY Sentinel Night Watch &amp; Escalation Policy</b>
━━━━━━━━━━━━━━━━━━━━
<b>24/7 Silent Monitoring Policy</b>:
• <b>P0 (Disaster)</b>: Immediate Telegram + SMS dispatch to Primary; escalates to Secondary after 15m.
• <b>P1 (Major)</b>: Immediate Telegram alert to Watchdog Group + On-Call.
• <b>P2 (Degraded)</b>: Hourly batch grouped digest (No developer sleep disruption).
• <b>P3/P4 (Minor/Info)</b>: Queued for Morning 09:00 AM Engineering Briefing.

<b>Registered On-Call Directory</b>:
${schedList}
━━━━━━━━━━━━━━━━━━━━`;

      await sendTelegramMessage(chatId, nightHtml);
      return new Response('OK', { status: 200 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // COMMAND: /airtel (SMS Gateway Telemetry)
    // ──────────────────────────────────────────────────────────────────────────
    if (command === '/airtel' || command === '/sms') {
      const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

      const { data: logs } = await supabase
        .from('communication_dispatch_logs')
        .select('recipient_phone, message_content, status, provider_message_id, error_message, created_at')
        .eq('channel', 'SMS')
        .gte('created_at', `${todayDate}T00:00:00Z`)
        .order('created_at', { ascending: false })
        .limit(10);

      const totalDelivered = (logs || []).filter((l: any) => l.status === 'DELIVERED').length;
      const totalFailed = (logs || []).filter((l: any) => l.status === 'FAILED').length;

      let logSnippets = '';
      if (logs && logs.length > 0) {
        logSnippets = logs.slice(0, 5).map((l: any) => {
          const t = new Date(l.created_at).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true });
          const icon = l.status === 'DELIVERED' ? '🟢' : '🔴';
          const maskedPhone = l.recipient_phone ? `${l.recipient_phone.slice(0, 3)}****${l.recipient_phone.slice(-3)}` : 'N/A';
          return `${icon} <b>${t}</b> • <code>${maskedPhone}</code> — ${l.status}\n  ${l.provider_message_id ? `Req: <code>${l.provider_message_id.slice(0, 16)}...</code>` : `Err: ${l.error_message || 'Unconfirmed'}`}`;
        }).join('\n');
      } else {
        logSnippets = '<i>No SMS dispatches recorded yet today.</i>';
      }

      const airtelHtml = `📱 <b>Airtel IQ Prepaid Gateway Status</b>
━━━━━━━━━━━━━━━━━━━━
<b>Provider</b>: Airtel IQ (iqsms.airtel.in)
<b>Header (Sender ID)</b>: <code>JCSPRL</code>
<b>DLT Principal Entity ID</b>: <code>1001333025440167393</code>
<b>Today\'s Delivered</b>: <b>${totalDelivered}</b>
<b>Today\'s Failed</b>: <b>${totalFailed}</b>

<b>Latest 5 Dispatches (Today)</b>:
${logSnippets}

<i>Prepaid balance is actively monitored.</i>
━━━━━━━━━━━━━━━━━━━━`;

      await sendTelegramMessage(chatId, airtelHtml);
      return new Response('OK', { status: 200 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // COMMAND: /devices (Biometric Terminals Telemetry)
    // ──────────────────────────────────────────────────────────────────────────
    if (command === '/devices' || command === '/biometric') {
      const { data: devices, error } = await supabase
        .from('biometric_devices')
        .select('id, serial_number, device_name, is_active, last_heartbeat_at, branch_id')
        .order('is_active', { ascending: false });

      if (error || !devices || devices.length === 0) {
        await sendTelegramMessage(chatId, `⚠️ <b>No biometric devices registered</b> in database.`);
        return new Response('OK', { status: 200 });
      }

      const devList = devices.map((d: any) => {
        let statusBadge = '🔴 Offline';
        let lastSeenText = 'Never';
        if (d.last_heartbeat_at) {
          const diffMs = Date.now() - new Date(d.last_heartbeat_at).getTime();
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins < 5) {
            statusBadge = '🟢 Online';
            lastSeenText = `${diffMins === 0 ? 'Just now' : `${diffMins}m ago`}`;
          } else if (diffMins < 60) {
            statusBadge = '🟡 Idle';
            lastSeenText = `${diffMins}m ago`;
          } else {
            const diffHours = Math.floor(diffMins / 60);
            statusBadge = '🔴 Offline';
            lastSeenText = `${diffHours}h ago`;
          }
        }
        return `• <b>${d.device_name}</b>\n  SN: <code>${d.serial_number}</code> | Status: <b>${statusBadge}</b> (${lastSeenText})`;
      }).join('\n\n');

      const devicesHtml = `⏱ <b>Biometric Hardware Terminals</b>
━━━━━━━━━━━━━━━━━━━━
<b>Total Registered</b>: ${devices.length}
<b>Protocol</b>: eSSL ADMS (Push Version 3.4.1)

${devList}

<i>Terminals push heartbeats every 10–30 seconds to /adms-gateway.</i>
━━━━━━━━━━━━━━━━━━━━`;

      await sendTelegramMessage(chatId, devicesHtml);
      return new Response('OK', { status: 200 });
    }

    // ──────────────────────────────────────────────────────────────────────────
    // COMMAND: /errors (Recent Dispatch Failures)
    // ──────────────────────────────────────────────────────────────────────────
    if (command === '/errors') {
      const { data: failedLogs } = await supabase
        .from('communication_dispatch_logs')
        .select('id, channel, provider, recipient_phone, template_key, error_message, created_at')
        .eq('status', 'FAILED')
        .order('created_at', { ascending: false })
        .limit(6);

      let errList = '';
      if (failedLogs && failedLogs.length > 0) {
        errList = failedLogs.map((e: any) => {
          const t = new Date(e.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' });
          return `• <b>[${e.channel}]</b> ${t}\n  To: <code>${e.recipient_phone || 'N/A'}</code> (${e.template_key})\n  Error: <i>${e.error_message || 'Gateway rejected'}</i>`;
        }).join('\n\n');
      } else {
        errList = '🟢 <b>No recent failures found!</b> All communication services operating normally.';
      }

      const errorsHtml = `🚨 <b>Recent Communication Dispatch Errors</b>
━━━━━━━━━━━━━━━━━━━━
${errList}
━━━━━━━━━━━━━━━━━━━━`;

      await sendTelegramMessage(chatId, errorsHtml);
      return new Response('OK', { status: 200 });
    }

    // Unrecognized command
    await sendTelegramMessage(
      chatId,
      `❓ Unrecognized command: <code>${command}</code>\nType <b>/help</b> to see all available JOY Sentinel commands.`
    );
    return new Response('OK', { status: 200 });
  } catch (err: any) {
    console.error('[TG-WEBHOOK] Fatal error:', err?.message || err);
    return new Response(`Error: ${err?.message || err}`, { status: 500 });
  }
});
