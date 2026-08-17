// supabase/functions/create-invoice/index.ts
// Creates a NOWPayments invoice for subscription purchase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";
const NOW_API_KEY = Deno.env.get("NOWPAYMENTS_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://alikhani09390916.github.io/irancoin-premium";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { plan_id, pay_currency, user_email, user_name } = await req.json();

    if (!plan_id) {
      return new Response(
        JSON.stringify({ error: "plan_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get plan details
    const { data: plan, error: planErr } = await supabase
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (planErr || !plan) {
      return new Response(
        JSON.stringify({ error: "Invalid plan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or create user
    let user_id: string | null = null;
    let user_email_final = user_email || "";

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (user) {
        user_id = user.id;
        user_email_final = user.email || user_email_final;
      }
    }

    // Create subscription (pending)
    const subscriptionData: any = {
      plan_id,
      status: "pending",
    };
    if (user_id) subscriptionData.user_id = user_id;

    const { data: subscription, error: subErr } = await supabase
      .from("subscriptions")
      .insert(subscriptionData)
      .select()
      .single();

    if (subErr) {
      return new Response(
        JSON.stringify({ error: "Failed to create subscription", details: subErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create NOWPayments invoice
    const ipnCallbackUrl = `${SUPABASE_URL}/functions/v1/ipn-webhook`;

    const invoiceBody: any = {
      price_amount: plan.price_usdt,
      price_currency: "usd",
      pay_currency: pay_currency || "usdttrc20",
      ipn_callback_url: ipnCallbackUrl,
      order_id: subscription.id,
      order_description: `IRAN COIN ${plan.label} Subscription`,
    };

    const nowRes = await fetch(`${NOWPAYMENTS_API}/invoice`, {
      method: "POST",
      headers: {
        "x-api-key": NOW_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invoiceBody),
    });

    const nowData = await nowRes.json();

    if (!nowRes.ok || !nowData.id) {
      return new Response(
        JSON.stringify({ error: "NOWPayments error", details: nowData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create payment record
    const paymentData: any = {
      subscription_id: subscription.id,
      plan_id,
      amount_usdt: plan.price_usdt,
      invoice_id: nowData.id,
      payment_status: "waiting",
      pay_address: nowData.pay_address,
      pay_amount: nowData.pay_amount,
      currency: pay_currency || "usdttrc20",
    };
    if (user_id) paymentData.user_id = user_id;

    await supabase.from("payments").insert(paymentData);

    return new Response(
      JSON.stringify({
        invoice_url: nowData.invoice_url,
        invoice_id: nowData.id,
        pay_address: nowData.pay_address,
        pay_amount: nowData.pay_amount,
        subscription_id: subscription.id,
        plan_label: plan.label,
        price_usdt: plan.price_usdt,
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
