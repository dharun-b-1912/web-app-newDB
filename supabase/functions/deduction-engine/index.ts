// ============================================================================
// Supabase Edge Function: deduction-engine
// Joy PeopleHR: Authoritative Multi-Tenant Deductions, Loans & LOP Engine
// ============================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    const action = body.action || "get_active_policy";
    const organizationId = body.organization_id || "0c621892-e938-4707-9957-13534ea32c19";

    // ────────────────────────────────────────────────────────────────────────
    // 1. ACTION: get_active_policy
    // ────────────────────────────────────────────────────────────────────────
    if (action === "get_active_policy") {
      const { data, error } = await supabase
        .from("payroll_deduction_policies")
        .select("*")
        .eq("organization_id", organizationId)
        .eq("status", "ACTIVE")
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ policy: data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ────────────────────────────────────────────────────────────────────────
    // 2. ACTION: calculate_emi
    // ────────────────────────────────────────────────────────────────────────
    if (action === "calculate_emi") {
      const principal = Number(body.principal) || 0;
      const rate = Number(body.annual_interest_rate) || 0;
      const tenure = Math.max(1, Number(body.tenure_months) || 12);
      const method = body.interest_method || "INTEREST_FREE";

      let emi = 0;
      let totalInterest = 0;
      let totalRepayable = principal;

      if (method === "INTEREST_FREE" || rate === 0) {
        emi = Math.round((principal / tenure) * 100) / 100;
      } else if (method === "REDUCING_BALANCE") {
        const r = rate / 12 / 100;
        const factor = Math.pow(1 + r, tenure);
        emi = Math.round((principal * r * factor) / (factor - 1) * 100) / 100;
        totalRepayable = Math.round(emi * tenure * 100) / 100;
        totalInterest = Math.max(0, Math.round((totalRepayable - principal) * 100) / 100);
      } else {
        // Flat rate
        totalInterest = Math.round((principal * (rate / 100) * (tenure / 12)) * 100) / 100;
        totalRepayable = principal + totalInterest;
        emi = Math.round((totalRepayable / tenure) * 100) / 100;
      }

      return new Response(
        JSON.stringify({
          monthly_emi: emi,
          total_interest: totalInterest,
          total_repayable: totalRepayable,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ────────────────────────────────────────────────────────────────────────
    // 3. ACTION: calculate_lop
    // ────────────────────────────────────────────────────────────────────────
    if (action === "calculate_lop") {
      const monthlyGross = Number(body.monthly_gross) || 0;
      const lopDays = Number(body.lop_days) || 0;
      const method = body.method || "CALENDAR_DAYS";
      let divisor = Number(body.divisor) || 30;

      if (method === "CALENDAR_DAYS") {
        divisor = 31; // October standard calendar length
      } else if (method === "SCHEDULED_WORKING_DAYS") {
        divisor = 26;
      }

      const dailyRate = Math.round((monthlyGross / divisor) * 100) / 100;
      const lopAmount = Math.round(dailyRate * lopDays);

      return new Response(
        JSON.stringify({
          monthly_gross: monthlyGross,
          lop_days: lopDays,
          divisor_used: divisor,
          daily_wage_rate: dailyRate,
          computed_lop_deduction: lopAmount,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // ────────────────────────────────────────────────────────────────────────
    // 4. ACTION: reconcile_monthly_deductions
    // ────────────────────────────────────────────────────────────────────────
    if (action === "reconcile_monthly_deductions") {
      const gross = Number(body.monthly_gross) || 0;
      const lop = Number(body.lop_deduction) || 0;
      const emi = Number(body.loan_emi) || 0;
      const advance = Number(body.advance_recovery) || 0;
      const statutory = Number(body.statutory_deductions) || 0;
      const maxCapPercent = Number(body.max_total_deduction_percent) || 50;

      const totalScheduled = statutory + lop + advance + emi;
      const maxCap = Math.round(gross * (maxCapPercent / 100));

      let actualApplied = totalScheduled;
      let deferred = 0;
      let status = "BALANCED";

      if (totalScheduled > maxCap) {
        actualApplied = maxCap;
        deferred = totalScheduled - maxCap;
        status = "CAPPED_AND_DEFERRED";
      }

      const netPay = Math.max(0, gross - actualApplied);

      return new Response(
        JSON.stringify({
          monthly_gross: gross,
          total_scheduled_deductions: totalScheduled,
          permitted_deduction_cap: maxCap,
          actual_applied_deductions: actualApplied,
          deferred_deductions: deferred,
          estimated_net_pay: netPay,
          reconciliation_status: status,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
