// supabase/functions/automated-cron-dispatcher/index.ts
// ============================================================================
// Joy PeopleHR Enterprise — Automated Cron Job & Background Worker Dispatcher
// Dispatches Scheduled HRMS Tasks: Daily Attendance Settlement, Biometric Heartbeats,
// Monthly Leave Accruals, Expired Session Cleanups & Security Posture Scans.
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";
import { getCorsHeaders, handleCorsPreflight } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimiter.ts";

interface CronJobResult {
  job_name: string;
  status: "SUCCESS" | "FAILED" | "SKIPPED";
  duration_ms: number;
  details?: any;
  error?: string;
}

serve(async (req: Request) => {
  const preflightResponse = handleCorsPreflight(req);
  if (preflightResponse) return preflightResponse;

  const corsHeaders = getCorsHeaders(req);

  // 1. Rate Limiting Protection (Gate: 60 cron dispatches / 60 seconds)
  const rateLimitCheck = await checkRateLimit(req, {
    profile: "CRON_DISPATCHER",
    maxRequests: 60,
    windowSeconds: 60,
  });
  if (!rateLimitCheck.allowed && rateLimitCheck.response) {
    return rateLimitCheck.response;
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const expectedCronSecret = Deno.env.get("CRON_SECRET") || "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: "Missing Supabase server credentials." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Authentication: Validate Bearer token (must match CRON_SECRET or Service Role Key)
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    const isAuthorized =
      (expectedCronSecret && token === expectedCronSecret) ||
      token === supabaseServiceKey;

    if (!isAuthorized) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid or missing cron dispatcher token." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const url = new URL(req.url);
    const actionParam = url.searchParams.get("action") || "all";
    const dateParam = url.searchParams.get("date"); // Optional target date (YYYY-MM-DD)

    const executionResults: CronJobResult[] = [];
    const startTimeOverall = Date.now();

    // -------------------------------------------------------------
    // Task 1: Daily Attendance Settlement
    // -------------------------------------------------------------
    if (actionParam === "all" || actionParam === "attendance" || actionParam === "daily_attendance_settlement") {
      const taskStart = Date.now();
      try {
        const targetDate = dateParam || new Date().toISOString().split("T")[0];
        const { data, error } = await supabase.rpc("fn_batch_settle_daily_attendance", {
          p_date: targetDate,
        });

        if (error) throw error;
        executionResults.push({
          job_name: "daily_attendance_settlement",
          status: "SUCCESS",
          duration_ms: Date.now() - taskStart,
          details: data,
        });
      } catch (err: any) {
        executionResults.push({
          job_name: "daily_attendance_settlement",
          status: "FAILED",
          duration_ms: Date.now() - taskStart,
          error: err.message || "Failed to execute attendance settlement",
        });
      }
    }

    // -------------------------------------------------------------
    // Task 2: Biometric Device Heartbeat & Health Check
    // -------------------------------------------------------------
    if (actionParam === "all" || actionParam === "devices" || actionParam === "biometric_device_heartbeat") {
      const taskStart = Date.now();
      try {
        const { data, error } = await supabase.rpc("fn_check_biometric_device_heartbeats");
        if (error) throw error;

        executionResults.push({
          job_name: "biometric_device_heartbeat",
          status: "SUCCESS",
          duration_ms: Date.now() - taskStart,
          details: data,
        });
      } catch (err: any) {
        executionResults.push({
          job_name: "biometric_device_heartbeat",
          status: "FAILED",
          duration_ms: Date.now() - taskStart,
          error: err.message || "Failed to check biometric device heartbeats",
        });
      }
    }

    // -------------------------------------------------------------
    // Task 3: Monthly Leave Accrual Credit
    // -------------------------------------------------------------
    if (actionParam === "all" || actionParam === "leave" || actionParam === "monthly_leave_accrual") {
      const taskStart = Date.now();
      try {
        const { data, error } = await supabase.rpc("fn_process_monthly_leave_accruals");
        if (error) throw error;

        executionResults.push({
          job_name: "monthly_leave_accrual",
          status: "SUCCESS",
          duration_ms: Date.now() - taskStart,
          details: data,
        });
      } catch (err: any) {
        executionResults.push({
          job_name: "monthly_leave_accrual",
          status: "FAILED",
          duration_ms: Date.now() - taskStart,
          error: err.message || "Failed to process monthly leave accruals",
        });
      }
    }

    // -------------------------------------------------------------
    // Task 4: Stale Session & Credential Cleanup
    // -------------------------------------------------------------
    if (actionParam === "all" || actionParam === "sessions" || actionParam === "session_cleanup") {
      const taskStart = Date.now();
      try {
        const { data, error } = await supabase.rpc("fn_cleanup_expired_sessions");
        if (error) throw error;

        executionResults.push({
          job_name: "session_cleanup",
          status: "SUCCESS",
          duration_ms: Date.now() - taskStart,
          details: data,
        });
      } catch (err: any) {
        executionResults.push({
          job_name: "session_cleanup",
          status: "FAILED",
          duration_ms: Date.now() - taskStart,
          error: err.message || "Failed to cleanup expired sessions",
        });
      }
    }

    // -------------------------------------------------------------
    // Task 5: Security Posture Hourly Evaluation
    // -------------------------------------------------------------
    if (actionParam === "all" || actionParam === "security" || actionParam === "security_scan") {
      const taskStart = Date.now();
      try {
        const { data, error } = await supabase.rpc("fn_calculate_security_posture");
        if (error) throw error;

        executionResults.push({
          job_name: "security_scan",
          status: "SUCCESS",
          duration_ms: Date.now() - taskStart,
          details: data,
        });
      } catch (err: any) {
        executionResults.push({
          job_name: "security_scan",
          status: "FAILED",
          duration_ms: Date.now() - taskStart,
          error: err.message || "Failed to evaluate security posture",
        });
      }
    }

    const overallDuration = Date.now() - startTimeOverall;
    const hasFailures = executionResults.some((r) => r.status === "FAILED");

    // Optional: Log execution audit event to audit_events
    await supabase.from("audit_events").insert([
      {
        event_type: "CRON_JOBS_DISPATCHED",
        actor_type: "SYSTEM",
        actor_name: "Automated Cron Dispatcher",
        action: actionParam,
        status: hasFailures ? "WARNING" : "SUCCESS",
        details: {
          total_duration_ms: overallDuration,
          results: executionResults,
        },
      },
    ]).catch(() => {});

    return new Response(
      JSON.stringify({
        success: !hasFailures,
        action: actionParam,
        dispatched_at: new Date().toISOString(),
        total_duration_ms: overallDuration,
        jobs_executed_count: executionResults.length,
        jobs: executionResults,
      }),
      {
        status: hasFailures ? 207 : 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (globalErr: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: globalErr.message || "Internal server error executing cron dispatcher.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
