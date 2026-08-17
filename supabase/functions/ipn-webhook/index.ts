// supabase/functions/ipn-webhook/index.ts
// NOWPayments IPN webhook handler
// Verifies payment, activates subscription, sends email notifications

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";
const NOW_API_KEY = Deno.env.get("NOWPAYMENTS_API_KEY")!;
const NOW_IPN_SECRET = Deno.env.get("NOWPAYMENTS_IPN_SECRET")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
};

async function verifySignature(body: string, signature: string): Promise<boolean> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(NOW_IPN_SECRET),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const expected = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return expected === signature;
  } catch {
    return false;
  }
}

async function sendEmailNotification(supabase: any, template: string, to: string, data: any) {
  try {
    await supabase.functions.invoke("send-email", {
      body: { template, to, data },
    });
  } catch (e) {
    console.error("Email send failed:", e);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("x-nowpayments-sig") || "";

    // Verify signature
    if (NOW_IPN_SECRET && signature) {
      const valid = await verifySignature(body, signature);
      if (!valid) {
        console.error("Invalid IPN signature");
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const data = JSON.parse(body);
    const {
      order_id,
      invoice_id,
      payment_status,
      actually_paid,
      pay_currency,
      tx_hash,
    } = data;

    if (!order_id || !payment_status) {
      return new Response("Missing required fields", { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

    const newStatus = statusMap[payment_status] || payment_status;

    // Get current payment
    const { data: currentPayment } = await supabase
      .from("payments")
      .select("*, subscriptions(*, plans(*)), profiles(*)")
      .eq("invoice_id", invoice_id)
      .single();

    // Update payment record
    const { error: payErr } = await supabase
      .from("payments")
      .update({
        payment_status: newStatus,
        tx_hash: tx_hash || null,
        updated_at: new Date().toISOString(),
      })
      .eq("invoice_id", invoice_id);

    if (payErr) {
      console.error("Payment update error:", payErr);
    }

    // Get user email for notifications
    let userEmail = "";
    let userName = "";
    if (currentPayment?.profiles) {
      userEmail = currentPayment.profiles.full_name || "";
    }
    if (currentPayment?.user_id) {
      const { data: userData } = await supabase.auth.admin.getUserById(currentPayment.user_id);
      if (userData?.user) {
        userEmail = userData.user.email || userEmail;
        userName = userData.user.user_metadata?.full_name || userName;
      }
    }

    // If confirmed, activate subscription
    if (newStatus === "confirmed") {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("id", order_id)
        .single();

      if (subscription && subscription.status !== "active") {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + subscription.plans.duration_days * 24 * 60 * 60 * 1000);

        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            started_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", order_id);

        console.log(`Subscription ${order_id} activated for ${subscription.plans.duration_days} days`);

        // Send payment success email
        if (userEmail) {
          await sendEmailNotification(supabase, "payment_success", userEmail, {
            name: userName,
            plan_label: subscription.plans.label,
            amount_usdt: currentPayment?.amount_usdt,
            activated_at: now.toLocaleDateString("fa-IR"),
            expires_at: expiresAt.toLocaleDateString("fa-IR"),
          });
        }
      }
    }

    // Send failure email
    if (newStatus === "failed" && userEmail) {
      await sendEmailNotification(supabase, "payment_failed", userEmail, {
        name: userName,
        plan_label: currentPayment?.subscriptions?.plans?.label || "",
      });
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("IPN webhook error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
