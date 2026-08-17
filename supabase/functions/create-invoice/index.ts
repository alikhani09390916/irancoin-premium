// supabase/functions/create-invoice/index.ts
// Creates a NOWPayments invoice for subscription purchase

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";
const NOW_API_KEY = Deno.env.get("NOWPAYMENTS_API_KEY")!;
const NOW_PUBLIC_KEY = Deno.env.get("NOWPAYMENTS_PUBLIC_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = Deno.env.get("SITE_URL") || "https://alikhani09390916.github.io/irancoin-premium";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { plan_id, user_email, user_name } = await req.json();

    if (!plan_id || !user_email) {
      return new Response(
        JSON.stringify({ error: "plan_id and user_email are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get plan details from DB
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
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

    // Get or create Supabase user
    let user_id: string;
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find((u: any) => u.email === user_email);

    if (existingUser) {
      user_id = existingUser.id;
    } else {
      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email: user_email,
        password: crypto.randomUUID(), // random password - user will reset
        email_confirm: true,
        user_metadata: { full_name: user_name || "" },
      });
      if (createErr || !newUser?.user) {
        return new Response(
          JSON.stringify({ error: "Failed to create user" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      user_id = newUser.user.id;
    }

    // Create subscription (pending)
    const { data: subscription, error: subErr } = await supabase
      .from("subscriptions")
      .insert({
        user_id,
        plan_id,
        status: "pending",
      })
      .select()
      .single();

    if (subErr) {
      return new Response(
        JSON.stringify({ error: "Failed to create subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create NOWPayments invoice
    const invoiceBody = {
      price_amount: plan.price_usdt,
      price_currency: "usd",
      pay_currency: "usdttrc20",
      ipn_callback_url: `${SITE_URL}/.netlify/functions/ipn-webok`, // will be updated
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

    // Update payment record with invoice ID
    await supabase.from("payments").insert({
      user_id,
      subscription_id: subscription.id,
      plan_id,
      amount_usdt: plan.price_usdt,
      invoice_id: nowData.id,
      payment_status: "waiting",
      pay_address: nowData.pay_address,
      pay_amount: nowData.pay_amount,
    });

    return new Response(
      JSON.stringify({
        invoice_url: nowData.invoice_url,
        invoice_id: nowData.id,
        pay_address: nowData.pay_address,
        pay_amount: nowData.pay_amount,
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
