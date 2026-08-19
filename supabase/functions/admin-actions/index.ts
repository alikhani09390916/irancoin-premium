// supabase/functions/admin-actions/index.ts
// Admin write operations: manage subscriptions, payments, emails, plans

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function isAdmin(req: Request): boolean {
  const adminKey = Deno.env.get("ADMIN_KEY");
  if (!adminKey) {
    console.error("ADMIN_KEY env var is not set; denying all admin requests");
    return false;
  }
  return req.headers.get("X-Admin-Key") === adminKey;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isAdmin(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, payload } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // ============ SUBSCRIPTIONS ============

    if (action === "activate_subscription") {
      const { subscription_id } = payload;
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("id", subscription_id)
        .single();

      if (!sub) return respond({ error: "Subscription not found" }, 404);

      const now = new Date();
      const days = sub.plans?.duration_days || 30;
      const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          started_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", subscription_id);

      if (error) return respond({ error: error.message }, 500);
      return respond({ success: true, message: "اشتراک فعال شد", expires_at: expiresAt.toISOString() });
    }

    if (action === "deactivate_subscription") {
      const { subscription_id } = payload;
      const { error } = await supabase
        .from("subscriptions")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", subscription_id);

      if (error) return respond({ error: error.message }, 500);
      return respond({ success: true, message: "اشتراک لغو شد" });
    }

    if (action === "extend_subscription") {
      const { subscription_id, days } = payload;
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("expires_at")
        .eq("id", subscription_id)
        .single();

      if (!sub) return respond({ error: "Subscription not found" }, 404);

      const currentExpiry = sub.expires_at ? new Date(sub.expires_at) : new Date();
      const base = currentExpiry > new Date() ? currentExpiry : new Date();
      const newExpiry = new Date(base.getTime() + (days || 30) * 24 * 60 * 60 * 1000);

      const { error } = await supabase
        .from("subscriptions")
        .update({
          status: "active",
          expires_at: newExpiry.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription_id);

      if (error) return respond({ error: error.message }, 500);
      return respond({ success: true, message: `${days || 30} روز اضافه شد`, new_expires: newExpiry.toISOString() });
    }

    // ============ PAYMENTS ============

    if (action === "confirm_payment") {
      const { payment_id } = payload;
      const { data: payment } = await supabase
        .from("payments")
        .select("*, subscriptions(*, plans(*))")
        .eq("id", payment_id)
        .single();

      if (!payment) return respond({ error: "Payment not found" }, 404);

      // Update payment
      await supabase
        .from("payments")
        .update({ payment_status: "confirmed", updated_at: new Date().toISOString() })
        .eq("id", payment_id);

      // Activate subscription if exists
      if (payment.subscription_id && payment.subscriptions) {
        const sub = payment.subscriptions;
        const plan = sub.plans;
        if (plan && sub.status !== "active") {
          const now = new Date();
          const expiresAt = new Date(now.getTime() + plan.duration_days * 24 * 60 * 60 * 1000);
          await supabase
            .from("subscriptions")
            .update({
              status: "active",
              started_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", payment.subscription_id);
        }
      }

      return respond({ success: true, message: "پرداخت تایید و اشتراک فعال شد" });
    }

    if (action === "refund_payment") {
      const { payment_id } = payload;
      const { error } = await supabase
        .from("payments")
        .update({ payment_status: "refunded", updated_at: new Date().toISOString() })
        .eq("id", payment_id);

      if (error) return respond({ error: error.message }, 500);

      // Cancel associated subscription
      const { data: payment } = await supabase
        .from("payments")
        .select("subscription_id")
        .eq("id", payment_id)
        .single();

      if (payment?.subscription_id) {
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled", updated_at: new Date().toISOString() })
          .eq("id", payment.subscription_id);
      }

      return respond({ success: true, message: "پرداخت بازگشت و اشتراک لغو شد" });
    }

    // ============ EMAILS ============

    if (action === "send_email") {
      const { to, template, custom_data } = payload;
      const { error } = await supabase.functions.invoke("send-email", {
        body: { template, to, data: custom_data || {} },
      });

      if (error) return respond({ error: error.message }, 500);
      return respond({ success: true, message: "ایمیل ارسال شد" });
    }

    // ============ PLANS ============

    if (action === "update_plan") {
      const { plan_id, price_usdt, label, is_popular, features } = payload;
      const updates: any = { updated_at: new Date().toISOString() };
      if (price_usdt !== undefined) updates.price_usdt = price_usdt;
      if (label !== undefined) updates.label = label;
      if (is_popular !== undefined) updates.is_popular = is_popular;
      if (features !== undefined) updates.features = features;

      const { error } = await supabase
        .from("plans")
        .update(updates)
        .eq("id", plan_id);

      if (error) return respond({ error: error.message }, 500);
      return respond({ success: true, message: "پلن بروزرسانی شد" });
    }

    // ============ USER DETAILS ============

    if (action === "get_user_details") {
      const { user_id } = payload;
      const { data: user } = await supabase.auth.admin.getUserById(user_id);
      if (!user?.user) return respond({ error: "User not found" }, 404);

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false });

      const { data: pays } = await supabase
        .from("payments")
        .select("*, plans(*)")
        .eq("user_id", user_id)
        .order("created_at", { ascending: false });

      return respond({
        user: {
          id: user.user.id,
          email: user.user.email,
          name: user.user.user_metadata?.full_name || "",
          created_at: user.user.created_at,
          last_sign_in: user.user.last_sign_in_at,
        },
        subscriptions: subs || [],
        payments: pays || [],
      });
    }

    // ============ PAYMENT DETAILS ============

    if (action === "get_payment_details") {
      const { payment_id } = payload;
      const { data: payment } = await supabase
        .from("payments")
        .select("*, subscriptions(*, plans(*)), profiles(*)")
        .eq("id", payment_id)
        .single();

      if (!payment) return respond({ error: "Payment not found" }, 404);
      return respond({ payment });
    }

    return respond({ error: "Unknown action: " + action }, 400);
  } catch (err) {
    return respond({ error: "Internal error", message: err.message }, 500);
  }
});

function respond(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" },
  });
}
