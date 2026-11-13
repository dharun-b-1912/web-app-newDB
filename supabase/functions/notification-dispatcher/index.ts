import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface FirebaseServiceAccount {
  project_id: string;
  client_email: string;
  private_key: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

let cachedAccessToken: string | null = null;
let cachedTokenExpiry = 0;

async function getFirebaseAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedTokenExpiry) return cachedAccessToken;
  const saJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
  if (!saJson) throw new Error("FIREBASE_SERVICE_ACCOUNT secret is not configured");

  const sa: FirebaseServiceAccount = JSON.parse(saJson);
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = btoa(
    JSON.stringify({
      iss: sa.client_email,
      scope: "https://www.googleapis.com/auth/firebase.messaging",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  );
  const dataToSign = `${header}.${claimSet}`;
  const pemKey = sa.private_key.replace(/\\n/g, "\n");
  const keyData = pemKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryDer = Uint8Array.from(atob(keyData), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(dataToSign)
  );
  const jwt = `${dataToSign}.${btoa(String.fromCharCode(...new Uint8Array(sig)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const tokenData = await resp.json();
  if (!tokenData.access_token) {
    throw new Error(`FCM OAuth failed: ${JSON.stringify(tokenData)}`);
  }
  cachedAccessToken = tokenData.access_token;
  cachedTokenExpiry = Date.now() + (Number(tokenData.expires_in || 3600) - 60) * 1000;
  return cachedAccessToken!;
}

async function sendFcmToToken(params: {
  projectId: string;
  accessToken: string;
  fcmToken: string;
  title: string;
  body: string;
  data: Record<string, string>;
}): Promise<{ ok: boolean; invalidToken?: boolean; error?: string; messageId?: string }> {
  const resp = await fetch(
    `https://fcm.googleapis.com/v1/projects/${params.projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${params.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token: params.fcmToken,
          notification: { title: params.title, body: params.body },
          data: params.data,
          android: {
            priority: "HIGH",
            notification: {
              channel_id: "joy_peoplehr_high_importance",
              sound: "default",
              default_vibrate_timings: true,
              notification_priority: "PRIORITY_MAX",
              icon: "ic_stat_notify",
              color: "#1A56DB",
            },
          },
          apns: {
            payload: {
              aps: {
                alert: { title: params.title, body: params.body },
                sound: "default",
                badge: 1,
              },
            },
          },
        },
      }),
    }
  );
  const json = await resp.json();
  if (resp.ok) return { ok: true, messageId: json.name };

  const errMsg = String(json?.error?.message || JSON.stringify(json));
  const errStatus = String(json?.error?.status || "");
  const invalid =
    errStatus === "NOT_FOUND" ||
    errStatus === "INVALID_ARGUMENT" ||
    errMsg.includes("UNREGISTERED") ||
    errMsg.includes("Requested entity was not found");
  return { ok: false, invalidToken: invalid, error: errMsg };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const organizationId = body.organization_id ? String(body.organization_id) : null;
    const limit = Math.min(50, Math.max(1, Number(body.limit || 25)));

    let query = supabase
      .from("notification_outbox")
      .select("*")
      .in("delivery_status", ["PENDING", "FAILED"])
      .order("created_at", { ascending: true })
      .limit(limit);

    if (organizationId) {
      query = query.eq("organization_id", organizationId);
    }

    const { data: rows, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    const pending = (rows || []).filter(
      (r: any) => Number(r.retry_count || 0) < Number(r.max_retries || 3)
    );

    if (pending.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, delivered: 0, skipped: 0, failed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const saJson = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    const projectId = saJson ? (JSON.parse(saJson) as FirebaseServiceAccount).project_id : null;
    let fcmAccessToken: string | null = null;
    let fcmInitError: string | null = null;

    if (saJson && projectId) {
      try {
        fcmAccessToken = await getFirebaseAccessToken();
      } catch (e) {
        fcmInitError = String(e);
      }
    } else {
      fcmInitError = "FIREBASE_SERVICE_ACCOUNT not configured";
    }

    let delivered = 0;
    let skipped = 0;
    let failed = 0;

    for (const item of pending as any[]) {
      const nowIso = new Date().toISOString();
      const nextRetry = Number(item.retry_count || 0) + 1;

      if (item.channel === "WEB_PUSH") {
        const hasVapid = Boolean(Deno.env.get("VAPID_PUBLIC_KEY") && Deno.env.get("VAPID_PRIVATE_KEY"));
        if (!hasVapid) {
          await supabase
            .from("notification_outbox")
            .update({
              delivery_status: "SKIPPED",
              last_attempt_at: nowIso,
              error_details: "VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY not configured",
              updated_at: nowIso,
            })
            .eq("id", item.id);
          skipped++;
          continue;
        }
      }

      if (!fcmAccessToken || !projectId) {
        await supabase
          .from("notification_outbox")
          .update({
            delivery_status: "FAILED",
            retry_count: nextRetry,
            last_attempt_at: nowIso,
            error_details: fcmInitError || "FCM unavailable",
            updated_at: nowIso,
          })
          .eq("id", item.id);
        failed++;
        continue;
      }

      // Lookup active FCM tokens for recipient_user_id or employee_id
      const { data: tokenRows } = await supabase
        .from("employee_device_tokens")
        .select("id, fcm_token")
        .eq("token_status", "ACTIVE")
        .or(
          item.employee_id
            ? `auth_user_id.eq.${item.recipient_user_id},employee_id.eq.${item.employee_id}`
            : `auth_user_id.eq.${item.recipient_user_id}`
        );

      const uniqueTokens = Array.from(
        new Map((tokenRows || []).map((t: any) => [t.fcm_token, t])).values()
      ) as { id: string; fcm_token: string }[];

      if (uniqueTokens.length === 0) {
        await supabase
          .from("notification_outbox")
          .update({
            delivery_status: "SKIPPED",
            last_attempt_at: nowIso,
            error_details: "No active device tokens registered for recipient",
            updated_at: nowIso,
          })
          .eq("id", item.id);
        skipped++;
        continue;
      }

      const stringData: Record<string, string> = {
        outbox_id: String(item.id),
        event_type: String(item.event_type || ""),
        category: String(item.category || "ATTENDANCE"),
        action_url: String(item.action_url || "/attendance"),
        route: String(item.payload?.route || "attendance"),
        title: String(item.title),
        body: String(item.message),
      };

      let anyOk = false;
      const errors: string[] = [];

      for (const tok of uniqueTokens) {
        const res = await sendFcmToToken({
          projectId,
          accessToken: fcmAccessToken,
          fcmToken: tok.fcm_token,
          title: String(item.title),
          body: String(item.message),
          data: stringData,
        });
        if (res.ok) {
          anyOk = true;
        } else {
          errors.push(res.error || "Unknown FCM error");
          if (res.invalidToken) {
            await supabase
              .from("employee_device_tokens")
              .update({ token_status: "REVOKED", updated_at: nowIso })
              .eq("id", tok.id);
          }
        }
      }

      if (anyOk) {
        await supabase
          .from("notification_outbox")
          .update({
            delivery_status: "DELIVERED",
            delivered_at: nowIso,
            last_attempt_at: nowIso,
            error_details: null,
            updated_at: nowIso,
          })
          .eq("id", item.id);
        delivered++;
      } else {
        await supabase
          .from("notification_outbox")
          .update({
            delivery_status: "FAILED",
            retry_count: nextRetry,
            last_attempt_at: nowIso,
            error_details: errors.join(" | ").slice(0, 500),
            updated_at: nowIso,
          })
          .eq("id", item.id);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ processed: pending.length, delivered, skipped, failed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

