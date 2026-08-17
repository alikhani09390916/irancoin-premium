// supabase/functions/ipn-webhook/index.ts
// NOWPayments IPN (Instant Payment Notification) webhook handler
// Verifies payment and activates subscription

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

// Verify NOWPayments signature
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const signature = req.headers.get("x-nowpayments-sig") || "";

    // Verify signature in production
    if (NOW_IPN_SECRET && signature) {
      const valid = await verifySignature(body, signature);
      if (!valid) {
        return new Response("Invalid signature", { status: 401 });
      }
    }

    const data = JSON.parse(body);
    const {
      order_id,          // subscription UUID
      invoice_id,        // NOWPayments invoice ID
      payment_status,    // 'confirming', 'confirmed', 'failed', 'refunded'
      actually_paid,     // amount paid in crypto
      pay_currency,      // crypto currency used
      tx_hash,           // blockchain transaction hash
    } = data;

    if (!order_id || !payment_status) {
      return new Response("Missing required fields", { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Map NOWPayments status to our status
    let statusMap: Record<string, string> = {
      "finished": "confirmed",
      "confirmed": "confirming",
      "sending": "confirming",
      "waiting": "waiting",
      "failed": "failed",
      "refunded": "refunded",
      "expired": "expired",
    };

    const newStatus = statusMap[payment_status] || payment_status;

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

    // If confirmed, activate subscription
    if (newStatus === "confirmed") {
      // Get subscription details
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*, plans(*)")
        .eq("id", order_id)
        .single();

      if (subscription) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + subscription.plans.duration_days * 24 * 60 * 60 * 1000);

        // Activate subscription
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
      }
    }

    return new Response("OK", { status: 200, headers: corsHeaders });
  } catch (err) {
    console.error("IPN webhook error:", err);
    return new Response("Internal error", { status: 500 });
  }
});
