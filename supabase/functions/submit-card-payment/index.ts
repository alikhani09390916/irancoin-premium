// supabase/functions/submit-card-payment/index.ts
// Accept card-to-card payment submission with receipt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { plan_id, tracking_code, receipt_image, card_number } = await req.json();

    if (!plan_id || !tracking_code) {
      return new Response(
        JSON.stringify({ error: "plan_id and tracking_code are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    let user_id = null;
    if (authHeader) {
      const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await supabaseUser.auth.getUser();
      if (user) user_id = user.id;
    }

    // Get plan details
    const { data: plan } = await supabase
      .from("plans")
      .select("*")
      .eq("id", plan_id)
      .single();

    if (!plan) {
      return new Response(
        JSON.stringify({ error: "Invalid plan" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create subscription (pending manual review)
    const subData: any = { plan_id, status: "pending" };
    if (user_id) subData.user_id = user_id;

    const { data: subscription, error: subErr } = await supabase
      .from("subscriptions")
      .insert(subData)
      .select()
      .single();

    if (subErr) {
      return new Response(
        JSON.stringify({ error: "Failed to create subscription" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save receipt image to storage if provided
    let receiptUrl = "";
    if (receipt_image) {
      const fileName = `receipts/${subscription.id}_${Date.now()}.jpg`;
      const buffer = Uint8Array.from(atob(receipt_image), c => c.charCodeAt(0));
      const { error: uploadErr } = await supabase.storage
        .from("receipts")
        .upload(fileName, buffer, { contentType: "image/jpeg" });

      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(fileName);
        receiptUrl = urlData?.publicUrl || "";
      }
    }

    // Create payment record
    const payData: any = {
      subscription_id: subscription.id,
      plan_id,
      amount_usdt: plan.price_usdt,
      payment_status: "waiting",
      currency: "IRR_card",
      pay_address: card_number || "",
      metadata: JSON.stringify({
        tracking_code,
        receipt_url: receiptUrl,
        payment_method: "card_to_card",
        submitted_at: new Date().toISOString(),
      }),
    };
    if (user_id) payData.user_id = user_id;

    await supabase.from("payments").insert(payData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "فیش شما دریافت شد. پس از تأیید مدیر، اشتراک فعال می‌شود.",
        subscription_id: subscription.id,
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
