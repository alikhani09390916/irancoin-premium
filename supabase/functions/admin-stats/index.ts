// supabase/functions/admin-stats/index.ts
// Admin dashboard stats and data

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple admin auth — check against ADMIN_KEY env var
function isAdmin(req: Request): boolean {
  const auth = req.headers.get("Authorization") || "";
  const adminKey = req.headers.get("X-Admin-Key") || "";
  const expected = Deno.env.get("ADMIN_KEY");
  if (!expected) {
    console.error("ADMIN_KEY env var is not set; denying all admin requests");
    return false;
  }
  return adminKey === expected || auth.includes(SUPABASE_SERVICE_KEY);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (!isAdmin(req)) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const url = new URL(req.url);
    const section = url.searchParams.get("section") || "overview";

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    if (section === "overview") {
      // Get stats
      const { data: users } = await supabase.auth.admin.listUsers();
      const totalUsers = users?.users?.length || 0;

      const { count: activeSubs } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      const { count: pendingSubs } = await supabase
        .from("subscriptions")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      const { count: confirmedPayments } = await supabase
        .from("payments")
        .select("*", { count: "exact", head: true })
        .eq("payment_status", "confirmed");

      const { data: revenueData } = await supabase
        .from("payments")
        .select("amount_usdt")
        .eq("payment_status", "confirmed");

      const totalRevenue = revenueData?.reduce((sum, p) => sum + (p.amount_usdt || 0), 0) || 0;

      const { count: emailsSent } = await supabase
        .from("email_logs")
        .select("*", { count: "exact", head: true });

      return new Response(
        JSON.stringify({
          total_users: totalUsers,
          active_subscriptions: activeSubs || 0,
          pending_subscriptions: pendingSubs || 0,
          confirmed_payments: confirmedPayments || 0,
          total_revenue_usdt: totalRevenue,
          emails_sent: emailsSent || 0,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (section === "payments") {
      const { data: payments } = await supabase
        .from("payments")
        .select("*, subscriptions(*, plans(*)), profiles(*)")
        .order("created_at", { ascending: false })
        .limit(50);

      return new Response(
        JSON.stringify({ payments: payments || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (section === "users") {
      const { data: users } = await supabase.auth.admin.listUsers();
      const userList = (users?.users || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        name: u.user_metadata?.full_name || "",
        created_at: u.created_at,
        last_sign_in: u.last_sign_in_at,
      }));

      return new Response(
        JSON.stringify({ users: userList }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (section === "subscriptions") {
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("*, plans(*), profiles(*)")
        .order("created_at", { ascending: false })
        .limit(50);

      return new Response(
        JSON.stringify({ subscriptions: subs || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (section === "emails") {
      const { data: emails } = await supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      return new Response(
        JSON.stringify({ emails: emails || [] }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Unknown section" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal error", message: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
