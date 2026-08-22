// supabase/functions/check-payment/index.ts
// Check payment status after redirect from NOWPayments

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";
const NOW_API_KEY = Deno.env.get("NOWPAYMENTS_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const invoiceIdRaw = url.searchParams.get("invoice_id");

    if (!invoiceIdRaw) {
      return new Response(
        JSON.stringify({ error: "invoice_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const invoiceId = parseInt(invoiceIdRaw, 10);
    if (!Number.isInteger(invoiceId) || invoiceId <= 0) {
      return new Response(
        JSON.stringify({ error: "invoice_id must be a positive integer" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Resolve caller identity (optional — the post-redirect check may run without session)
    let callerUserId: string | null = null;
    const authHeader = req.headers.get("Authorization") || "";
    if (authHeader.startsWith("Bearer ")) {
      const { data: userData } = await supabase.auth.getUser(authHeader.slice(7));
      callerUserId = userData?.user?.id || null;
    }

    // Check NOWPayments status
    const nowRes = await fetch(`${NOWPAYMENTS_API}/invoice/${invoiceId}`, {
      headers: { "x-api-key": NOW_API_KEY },
    });

    let nowStatus = "unknown";
    if (nowRes.ok) {
      const nowData = await nowRes.json();
      nowStatus = nowData.invoice_status || "unknown";
    }

    // Check local payment record
    const { data: payment } = await supabase
      .from("payments")
      .select("*, subscriptions(*, plans(*))")
      .eq("invoice_id", invoiceId)
      .single();

    if (!payment) {
      return new Response(
        JSON.stringify({ status: "not_found", message: "پرداخت یافت نشد" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // IDOR guard: if authenticated, require ownership for full details;
    // unauthenticated callers get status only (needed for post-redirect check)
    if (callerUserId && payment.user_id && callerUserId !== payment.user_id) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map NOWPayments status
    const statusMap: Record<string, string> = {
      "finished": "confirmed",
      "confirmed": "confirming",
      "sending": "confirming",
      "waiting": "waiting",
      "failed": "failed",
      "refunded": "refunded",
      "expired": "expired",
    };

    const mappedStatus = statusMap[nowStatus] || payment.payment_status;

    // Update payment if status changed
    if (mappedStatus !== payment.payment_status) {
      await supabase
        .from("payments")
        .update({ payment_status: mappedStatus, updated_at: new Date().toISOString() })
        .eq("id", payment.id);

      // If confirmed, activate subscription
      if (mappedStatus === "confirmed" && payment.subscriptions) {
        const sub = payment.subscriptions;
        const plan = sub.plans;
        if (plan && sub.status !== "active") {
          const now = new Date();
          const durationDays = plan.duration_days || 30;
          const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);
          await supabase
            .from("subscriptions")
            .update({
              status: "active",
              started_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", sub.id);
        }
      }
    }

    // Unauthenticated callers get minimal status only
    if (!callerUserId) {
      return new Response(
        JSON.stringify({ status: mappedStatus, now_status: nowStatus }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        status: mappedStatus,
        now_status: nowStatus,
        payment_id: payment.id,
        plan_label: payment.subscriptions?.plans?.label || "",
        amount_usdt: payment.amount_usdt,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
