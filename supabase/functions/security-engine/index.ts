// supabase/functions/security-engine/index.ts
// ============================================================
// WorkForceOS — Security Engine Edge Function & Cron Task Worker
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "evaluate";

    // Action 1: Evaluate Security Posture & Scan Credentials (Cron or on-demand)
    if (action === "evaluate" || action === "cron_hourly_scan") {
      const { data: postureData, error: postureErr } = await supabaseClient.rpc("fn_calculate_security_posture");
      if (postureErr) throw postureErr;

      // Update expired or expiring credentials
      await supabaseClient
        .from("security_credentials")
        .update({ status: "Expired", risk: "High" })
        .lt("expires_at", new Date().toISOString())
        .neq("status", "Expired");

      const fourteenDaysOut = new Date(Date.now() + 14 * 86400000).toISOString();
      await supabaseClient
        .from("security_credentials")
        .update({ status: "Expiring", risk: "Medium" })
        .gte("expires_at", new Date().toISOString())
        .lt("expires_at", fourteenDaysOut)
        .eq("status", "Active");

      return new Response(
        JSON.stringify({
          success: true,
          action,
          evaluated_at: new Date().toISOString(),
          posture: postureData,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Action 2: Run Full 48-Point Security Check
    if (action === "run_security_check") {
      const body = await req.json().catch(() => ({}));
      const triggeredBy = body.triggered_by || "Super Admin";

      const { data: checkData, error: checkErr } = await supabaseClient.rpc("fn_run_security_check", {
        p_triggered_by: triggeredBy,
      });

      if (checkErr) throw checkErr;

      return new Response(
        JSON.stringify({
          success: true,
          check_summary: checkData,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Action 3: Safe Credential Rotation
    if (action === "rotate_credential") {
      const { credential_id, reason } = await req.json();
      if (!credential_id) {
        return new Response(JSON.stringify({ error: "Missing credential_id" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: rotatedCred, error: rotateErr } = await supabaseClient.rpc("fn_rotate_credential", {
        p_credential_id: credential_id,
        p_reason: reason || "Manual rotation via Security Center API",
      });

      if (rotateErr) throw rotateErr;

      return new Response(
        JSON.stringify({
          success: true,
          credential: rotatedCred,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
