// src/services/observability/developerAlertService.ts
// ============================================================================
// Joy PeopleHR — Enterprise Developer Incident & Watchdog Dispatcher
// Automated alerting for Airtel DLT, WhatsApp Bot, ADMS Biometric & Supabase Core
// ============================================================================

export type WatchdogSeverity = 'SEV-1 (CRITICAL)' | 'SEV-2 (MAJOR)' | 'SEV-3 (MODERATE)';

export interface DeveloperAlertPayload {
  errorCode: string;               // e.g. ERR_AIRTEL_DLT_REJECTED, ERR_ADMS_UNKNOWN_DEVICE
  severity: WatchdogSeverity;
  service: string;                 // e.g. 'Airtel IQ SMS Gateway', 'ADMS Biometric Gateway'
  location: string;                // e.g. 'supabase/functions/adms-gateway/index.ts:79'
  organizationId?: string;
  organizationName?: string;
  summary: string;
  details?: string;
  remediation?: string;
  metadata?: Record<string, any>;
}

export interface RegisteredDeveloper {
  name: string;
  phone: string; // 91XXXXXXXXXX
  role: string;
  active: boolean;
}

export const MONITORED_DEVELOPERS: RegisteredDeveloper[] = [
  {
    name: 'Lead Cloud Architect',
    phone: '919384125278',
    role: 'PLATFORM_ARCHITECT',
    active: true,
  },
  {
    name: 'Engineering Ops / HR Tech Head',
    phone: '919944399088',
    role: 'HEAD_ENGINEERING_OPS',
    active: true,
  },
];

// In-memory alert deduplication cache: Suppress duplicate alerts for same error signature within 5 minutes
const alertDedupCache = new Map<string, number>();
const DEDUP_WINDOW_MS = 5 * 60 * 1000; // 5 minutes

export class DeveloperAlertService {
  private static instance: DeveloperAlertService;

  public static getInstance(): DeveloperAlertService {
    if (!DeveloperAlertService.instance) {
      DeveloperAlertService.instance = new DeveloperAlertService();
    }
    return DeveloperAlertService.instance;
  }

  /**
   * Formats the alert message with structured error blocks
   */
  public formatAlertText(payload: DeveloperAlertPayload): string {
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium',
    });

    const orgDisplay = payload.organizationName || payload.organizationId || 'Multi-Tenant System Core';
    const remediationBlock = payload.remediation
      ? `\n*Action Steps*:\n${payload.remediation}`
      : '';

    return `🚨 *[CRITICAL DEV ALERT]* Joy PeopleHR Watchdog
━━━━━━━━━━━━━━━━━━━━
*Error Code*: \`${payload.errorCode}\`
*Severity*: ${payload.severity}
*Service*: ${payload.service}
*Location*: \`${payload.location}\`
*Tenant*: ${orgDisplay}
*Time*: ${timestamp}

*Summary*:
${payload.summary}
${payload.details ? `\n*Diagnostic Details*:\n\`\`\`${payload.details.slice(0, 500)}\`\`\`` : ''}
${remediationBlock}
━━━━━━━━━━━━━━━━━━━━`;
  }

  /**
   * Dispatches the alert to all registered developers via WhatsApp Meta Cloud API
   */
  public async dispatchAlert(payload: DeveloperAlertPayload): Promise<{
    dispatched: boolean;
    results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }>;
  }> {
    const dedupKey = `${payload.errorCode}_${payload.location}_${payload.organizationId || 'global'}`;
    const now = Date.now();
    const lastSent = alertDedupCache.get(dedupKey);

    if (lastSent && now - lastSent < DEDUP_WINDOW_MS) {
      console.log(`[DeveloperAlertService] Alert suppressed by dedup window (${Math.round((now - lastSent) / 1000)}s ago): ${dedupKey}`);
      return { dispatched: false, results: [] };
    }
    alertDedupCache.set(dedupKey, now);

    const alertText = this.formatAlertText(payload);
    const results: Array<{ phone: string; success: boolean; messageId?: string; error?: string }> = [];

    // Meta Cloud API Credentials
    const phoneNumberId =
      (typeof process !== 'undefined' && (process.env.META_WA_PHONE_NUMBER_ID || process.env.VITE_META_WA_PHONE_NUMBER_ID)) ||
      '1352826481241407';

    const accessToken =
      (typeof process !== 'undefined' && (process.env.META_WA_ACCESS_TOKEN || process.env.VITE_META_WA_ACCESS_TOKEN)) ||
      '';

    const apiVersion =
      (typeof process !== 'undefined' && process.env.VITE_META_WA_API_VERSION) ||
      'v20.0';

    for (const dev of MONITORED_DEVELOPERS) {
      if (!dev.active) continue;

      try {
        if (!accessToken) {
          console.warn(`[DeveloperAlertService] META_WA_ACCESS_TOKEN not present. Logged alert locally for ${dev.phone}`);
          results.push({ phone: dev.phone, success: false, error: 'META_WA_ACCESS_TOKEN missing' });
          continue;
        }

        const res = await fetch(`https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: dev.phone,
            type: 'text',
            text: { preview_url: false, body: alertText },
          }),
        });

        const data = await res.json();
        if (res.ok && data.messages?.[0]?.id) {
          results.push({ phone: dev.phone, success: true, messageId: data.messages[0].id });
        } else {
          results.push({ phone: dev.phone, success: false, error: JSON.stringify(data) });
        }
      } catch (err: any) {
        results.push({ phone: dev.phone, success: false, error: err.message });
      }
    }

    // ── 2. Dispatches to Telegram Ops Watchdog Group & Private Chat ─────────────
    const telegramToken =
      (typeof process !== 'undefined' && (process.env.TELEGRAM_BOT_TOKEN || process.env.VITE_TELEGRAM_BOT_TOKEN)) ||
      '9137821052:AAH40OpD041tLdmC0_fheiZbk9_AxGs2TQ0';

    const rawChatIds =
      (typeof process !== 'undefined' && (process.env.TELEGRAM_CHAT_ID || process.env.VITE_TELEGRAM_CHAT_ID)) ||
      '-5189746331,9155594412';

    const telegramChatIds = rawChatIds.split(',').map(s => s.trim()).filter(Boolean);

    const telegramHtml = `🚨 <b>[CRITICAL DEV ALERT] Joy PeopleHR Watchdog</b>
━━━━━━━━━━━━━━━━━━━━
<b>Error Code</b>: <code>${payload.errorCode}</code>
<b>Severity</b>: ${payload.severity}
<b>Service</b>: ${payload.service}
<b>Location</b>: <code>${payload.location}</code>
<b>Tenant</b>: ${payload.organizationName || payload.organizationId || 'Multi-Tenant System Core'}
<b>Time</b>: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'medium' })}

<b>Summary</b>:
${payload.summary}
${payload.details ? `\n<b>Diagnostic Details</b>:\n<pre>${payload.details.slice(0, 450)}</pre>` : ''}
${payload.remediation ? `\n<b>Action Steps</b>:\n${payload.remediation}` : ''}
━━━━━━━━━━━━━━━━━━━━`;

    for (const chatId of telegramChatIds) {
      try {
        const tgRes = await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: telegramHtml,
            parse_mode: 'HTML',
          }),
        });
        const tgData = await tgRes.json();
        if (tgRes.ok && tgData.ok) {
          results.push({ phone: `telegram:${chatId}`, success: true, messageId: String(tgData.result?.message_id) });
        } else {
          results.push({ phone: `telegram:${chatId}`, success: false, error: JSON.stringify(tgData) });
        }
      } catch (tgErr: any) {
        results.push({ phone: `telegram:${chatId}`, success: false, error: tgErr.message });
      }
    }

    return { dispatched: true, results };
  }
}

export const developerAlertService = DeveloperAlertService.getInstance();

