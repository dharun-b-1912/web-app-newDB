// supabase/functions/sentinel-escalator/index.ts
// ============================================================================
// JOY SENTINEL: Phase V4 — Autonomous Night Watch Timer Escalator
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '9137821052:AAH40OpD041tLdmC0_fheiZbk9_AxGs2TQ0';
const TELEGRAM_GROUP_CHAT_ID = Deno.env.get('TELEGRAM_OPS_GROUP_CHAT_ID') || '-5189746331';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendTelegramAlert(chatId: string | number, text: string) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    return await res.json();
  } catch (err: any) {
    console.error('[SENTINEL-ESCALATOR] Telegram send failed:', err?.message || err);
  }
}

serve(async (req: Request) => {
  try {
    // 1. Run the database escalation evaluation RPC
    const { data: escalationResult, error } = await supabase.rpc('fn_sentinel_check_nightwatch_escalation');

    if (error) {
      console.error('[SENTINEL-ESCALATOR] RPC Error:', error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const escalatedCount = escalationResult?.escalated_count || 0;
    const incidents = escalationResult?.escalated_incidents || [];

    if (escalatedCount > 0) {
      const incList = incidents.map((inc: any) => {
        return `• 🚨 <b>${inc.incident_number}</b> [${inc.severity}]: <b>${inc.error_code}</b>\n  <i>${inc.title}</i>\n  Assigned To: <b>${inc.escalated_to}</b>`;
      }).join('\n\n');

      const escalationHtml = `🚨🚨 <b>JOY SENTINEL · NIGHT WATCH SLA ESCALATION</b>
━━━━━━━━━━━━━━━━━━━━
<b>Status</b>: <b>TIER-2 MAINTAINER ESCALATED</b>
<b>Reason</b>: Primary On-Call Engineer exceeded <b>15-minute acknowledgement SLA</b>!

<b>Unacknowledged Incidents (${escalatedCount})</b>:
${incList}

<b>Assigned Maintainer</b>: <b>Head of Engineering Ops (Secondary)</b>
<b>Action Required</b>:
Type <code>/ack &lt;INCIDENT_NUMBER&gt;</code> to claim incident and halt recurring alarm.
━━━━━━━━━━━━━━━━━━━━`;

      // Dispatch to Ops group
      await sendTelegramAlert(TELEGRAM_GROUP_CHAT_ID, escalationHtml);

      // Dispatch directly to Secondary Engineer chat
      const secChatId = incidents[0]?.secondary_chat_id;
      if (secChatId && String(secChatId) !== TELEGRAM_GROUP_CHAT_ID) {
        await sendTelegramAlert(secChatId, escalationHtml);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      escalated_count: escalatedCount,
      timestamp: new Date().toISOString()
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (err: any) {
    console.error('[SENTINEL-ESCALATOR] Fatal error:', err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal Error' }), { status: 500 });
  }
});
