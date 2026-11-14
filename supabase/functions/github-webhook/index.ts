// supabase/functions/github-webhook/index.ts
// ============================================================================
// JOY SENTINEL: Phase V3 — GitHub Webhook Listener & Deployment Correlator
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN') || '9137821052:AAH40OpD041tLdmC0_fheiZbk9_AxGs2TQ0';
const TELEGRAM_GROUP_CHAT_ID = Deno.env.get('TELEGRAM_OPS_GROUP_CHAT_ID') || '-5189746331';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function sendTelegramAlert(text: string) {
  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_GROUP_CHAT_ID,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    return await res.json();
  } catch (err: any) {
    console.error('[GH-WEBHOOK] Failed to send Telegram alert:', err?.message || err);
  }
}

serve(async (req: Request) => {
  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      service: 'JOY Sentinel GitHub Webhook Ingress',
      status: 'ONLINE',
      mode: 'production',
      correlationWindowMins: 60,
      timestamp: new Date().toISOString()
    }), { headers: { 'Content-Type': 'application/json' }, status: 200 });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const ghEvent = req.headers.get('x-github-event') || 'unknown';
    const payload = await req.json();

    console.log(`[GH-WEBHOOK] Received event: ${ghEvent}`);

    // We correlate pushes to main, merged PRs, and deployment workflow runs
    let eventType = ghEvent;
    let commitSha = '';
    let commitMsg = '';
    let authorName = '';
    let authorLogin = '';
    let branch = 'main';
    let prNumber: number | null = null;
    let prTitle: string | null = null;
    let repoName = payload?.repository?.full_name || 'JoyPeopleHR/web-app';

    if (ghEvent === 'ping') {
      return new Response(JSON.stringify({ message: 'Pong! Webhook active.', zen: payload?.zen }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    }

    if (ghEvent === 'pull_request') {
      const pr = payload?.pull_request;
      const isMerged = payload?.action === 'closed' && pr?.merged === true;
      if (!isMerged) {
        return new Response(JSON.stringify({ message: 'Ignored unmerged PR event' }), { status: 200 });
      }

      eventType = 'pull_request';
      commitSha = pr.merge_commit_sha || pr.head?.sha || 'unknown';
      commitMsg = pr.title || 'Merged PR';
      authorLogin = pr.user?.login || payload?.sender?.login || 'unknown';
      authorName = pr.user?.login || 'Developer';
      branch = pr.base?.ref || 'main';
      prNumber = pr.number;
      prTitle = pr.title;
    } else if (ghEvent === 'push') {
      const ref = payload?.ref || '';
      branch = ref.replace('refs/heads/', '');
      
      const headCommit = payload?.head_commit;
      commitSha = headCommit?.id || payload?.after || 'unknown';
      commitMsg = headCommit?.message?.split('\n')[0] || 'Direct Push to ' + branch;
      authorName = headCommit?.author?.name || payload?.pusher?.name || 'Developer';
      authorLogin = payload?.sender?.login || headCommit?.author?.username || 'unknown';
    } else if (ghEvent === 'workflow_run') {
      const wf = payload?.workflow_run;
      if (wf?.conclusion !== 'success') {
        return new Response(JSON.stringify({ message: `Ignored workflow_run ${wf?.conclusion}` }), { status: 200 });
      }
      eventType = 'deployment';
      commitSha = wf.head_sha || 'unknown';
      commitMsg = wf.head_commit?.message?.split('\n')[0] || wf.name || 'CI/CD Deploy';
      authorLogin = wf.actor?.login || 'github-actions';
      authorName = wf.actor?.login || 'GitHub Actions';
      branch = wf.head_branch || 'main';
    } else {
      return new Response(JSON.stringify({ message: `Event ${ghEvent} recorded as informational` }), { status: 200 });
    }

    const shortSha = commitSha.slice(0, 7);

    // 1. Store in sentinel_deployments table
    const { data: deployment, error: dbErr } = await supabase
      .from('sentinel_deployments')
      .insert({
        provider: 'github',
        event_type: eventType,
        commit_sha: commitSha,
        commit_short_sha: shortSha,
        commit_message: commitMsg,
        author_name: authorName,
        author_login: authorLogin,
        branch,
        pr_number: prNumber,
        pr_title: prTitle,
        status: 'SUCCESS',
        environment: 'production',
        metadata: {
          repository: repoName,
          sender: payload?.sender?.login,
          html_url: payload?.head_commit?.url || payload?.pull_request?.html_url
        }
      })
      .select()
      .single();

    if (dbErr) {
      console.error('[GH-WEBHOOK] DB Insert error:', dbErr.message);
    }

    // 2. Correlation Check: Did any incidents occur in the last 60 minutes?
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentIncidents } = await supabase
      .from('sentinel_incidents')
      .select('id, incident_number, error_code, severity, lifecycle_state, title')
      .gte('last_seen_at', oneHourAgo)
      .not('lifecycle_state', 'in', '("RESOLVED","CLOSED")');

    let correlationWarning = '';
    if (recentIncidents && recentIncidents.length > 0) {
      correlationWarning = `\n\n⚠️ <b>ACTIVE INCIDENTS DURING DEPLOYMENT:</b>\n` +
        recentIncidents.map((inc: any) => `• <b>${inc.incident_number}</b> [${inc.severity}]: ${inc.error_code} — ${inc.title}`).join('\n') +
        `\n<i>Sentinel is tracking possible post-deployment regression.</i>`;
    }

    // 3. Dispatch Live Telegram Telemetry to Ops Group
    const typeLabel = eventType === 'pull_request' ? `PR #${prNumber} Merge` : (eventType === 'deployment' ? 'CI/CD Deployment' : 'Direct Branch Push');
    const timeIst = new Date().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

    const messageHtml = `🚀 <b>JOY Sentinel · GitHub Deployment Telemetry</b>
━━━━━━━━━━━━━━━━━━━━
<b>Action</b>: 🟢 <b>${typeLabel}</b>
<b>Repository</b>: <code>${repoName}</code>
<b>Branch</b>: <code>${branch}</code>
<b>Commit</b>: <code>${shortSha}</code>
<b>Message</b>: <i>${commitMsg}</i>
<b>Author</b>: @${authorLogin} (${authorName})
<b>Timestamp</b>: ${timeIst} (IST)

⏱ <b>Regression Correlation Window</b>: <b>Active (60 mins)</b>
All incoming telemetry, API latencies, and punch gateways are monitored for anomalies.${correlationWarning}
━━━━━━━━━━━━━━━━━━━━`;

    await sendTelegramAlert(messageHtml);

    return new Response(JSON.stringify({
      success: true,
      deployment_id: deployment?.id,
      commit_short_sha: shortSha,
      correlated_active_incidents: recentIncidents?.length || 0
    }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200
    });
  } catch (err: any) {
    console.error('[GH-WEBHOOK] Fatal error:', err?.message || err);
    return new Response(JSON.stringify({ error: err?.message || 'Internal Error' }), { status: 500 });
  }
});
