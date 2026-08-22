// supabase/functions/send-email/index.ts
// Email notification system for IRANCOiN
// Triggered by webhook or called directly

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Email templates
const templates: Record<string, (data: any) => { subject: string; html: string }> = {
  welcome: (data) => ({
    subject: "به IRANCOiN خوش آمدید!",
    html: `
      <div dir="rtl" style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:2rem;background:#0f172a;color:#e2e8f0;border-radius:1rem">
        <div style="text-align:center;margin-bottom:2rem">
          <div style="font-size:2rem;font-weight:800;background:linear-gradient(135deg,#7C3AED,#06B6D4);-webkit-background-clip:text;-webkit-text-fill-color:transparent">IRANCOiN</div>
        </div>
        <h1 style="color:white;font-size:1.5rem;text-align:center">به IRANCOiN خوش آمدید ${data.name || ""}!</h1>
        <p style="color:#94a3b8;line-height:1.8;font-size:1rem">
          حساب شما با موفقیت ساخته شد. شما می‌توانید از پلتفرم هوشمند معاملات ارز دیجیتال ما استفاده کنید.
        </p>
        <div style="text-align:center;margin:2rem 0">
          <a href="${data.site_url}/pricing.html" style="background:linear-gradient(135deg,#7C3AED,#06B6D4);color:white;padding:0.75rem 2rem;border-radius:0.75rem;text-decoration:none;font-weight:600">خرید اشتراک</a>
        </div>
        <p style="color:#64748b;font-size:0.8125rem;text-align:center;border-top:1px solid rgba(124,58,237,0.2);padding-top:1rem">
          IRANCOiN — پلتفرم هوشمند معاملات ارز دیجیتال
        </p>
      </div>
    `,
  }),

  payment_success: (data) => ({
    subject: "پرداخت شما تایید شد!",
    html: `
      <div dir="rtl" style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:2rem;background:#0f172a;color:#e2e8f0;border-radius:1rem">
        <div style="text-align:center;margin-bottom:2rem">
          <div style="font-size:2rem;font-weight:800;background:linear-gradient(135deg,#7C3AED,#06B6D4);-webkit-background-clip:text;-webkit-text-fill-color:transparent">IRANCOiN</div>
        </div>
        <div style="text-align:center;font-size:3rem;margin:1rem 0"><span style="color:#10b981">&#10004;</span></div>
        <h1 style="color:white;font-size:1.5rem;text-align:center">پرداخت تایید شد!</h1>
        <div style="background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.2);border-radius:0.75rem;padding:1.25rem;margin:1.5rem 0">
          <table style="width:100%;color:#e2e8f0;font-size:0.9375rem;border-collapse:collapse">
            <tr><td style="padding:0.375rem 0;color:#94a3b8">پلن:</td><td style="padding:0.375rem 0;text-align:left;font-weight:600">${data.plan_label || ""}</td></tr>
            <tr><td style="padding:0.375rem 0;color:#94a3b8">مبلغ:</td><td style="padding:0.375rem 0;text-align:left;font-weight:600">$${data.amount_usdt || ""}</td></tr>
            <tr><td style="padding:0.375rem 0;color:#94a3b8">تاریخ فعال‌سازی:</td><td style="padding:0.375rem 0;text-align:left">${data.activated_at || new Date().toLocaleDateString("fa-IR")}</td></tr>
            <tr><td style="padding:0.375rem 0;color:#94a3b8">تاریخ انقضا:</td><td style="padding:0.375rem 0;text-align:left;font-weight:600;color:#10b981">${data.expires_at || ""}</td></tr>
          </table>
        </div>
        <p style="color:#94a3b8;line-height:1.8;font-size:1rem;text-align:center">
          اشتراک شما با موفقیت فعال شد. اکنون می‌توانید از تمام امکانات پلتفرم استفاده کنید.
        </p>
        <div style="text-align:center;margin:2rem 0">
          <a href="${data.site_url}/dashboard.html" style="background:linear-gradient(135deg,#7C3AED,#06B6D4);color:white;padding:0.75rem 2rem;border-radius:0.75rem;text-decoration:none;font-weight:600">ورود به داشبورد</a>
        </div>
        <p style="color:#64748b;font-size:0.8125rem;text-align:center;border-top:1px solid rgba(124,58,237,0.2);padding-top:1rem">
          IRANCOiN — پلتفرم هوشمند معاملات ارز دیجیتال
        </p>
      </div>
    `,
  }),

  subscription_expiring: (data) => ({
    subject: "اشتراک شما رو به انقضا است",
    html: `
      <div dir="rtl" style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:2rem;background:#0f172a;color:#e2e8f0;border-radius:1rem">
        <div style="text-align:center;margin-bottom:2rem">
          <div style="font-size:2rem;font-weight:800;background:linear-gradient(135deg,#7C3AED,#06B6D4);-webkit-background-clip:text;-webkit-text-fill-color:transparent">IRANCOiN</div>
        </div>
        <div style="text-align:center;font-size:3rem;margin:1rem 0">⏰</div>
        <h1 style="color:white;font-size:1.5rem;text-align:center">اشتراک رو به انقضا</h1>
        <p style="color:#94a3b8;line-height:1.8;font-size:1rem;text-align:center">
          اشتراک شما <strong style="color:#fbbf24">${data.days_left || ""} روز</strong> دیگر منقضی می‌شود.
        </p>
        <div style="background:rgba(251,191,36,0.1);border:1px solid rgba(251,191,36,0.2);border-radius:0.75rem;padding:1.25rem;margin:1.5rem 0;text-align:center">
          <p style="color:#fbbf24;font-weight:600;margin:0">برای ادامه استفاده، اشتراک خود را تمدید کنید</p>
        </div>
        <div style="text-align:center;margin:2rem 0">
          <a href="${data.site_url}/pricing.html" style="background:linear-gradient(135deg,#7C3AED,#06B6D4);color:white;padding:0.75rem 2rem;border-radius:0.75rem;text-decoration:none;font-weight:600">تمدید اشتراک</a>
        </div>
        <p style="color:#64748b;font-size:0.8125rem;text-align:center;border-top:1px solid rgba(124,58,237,0.2);padding-top:1rem">
          IRANCOiN — پلتفرم هوشمند معاملات ارز دیجیتال
        </p>
      </div>
    `,
  }),

  subscription_expired: (data) => ({
    subject: "اشتراک شما منقضی شد",
    html: `
      <div dir="rtl" style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:2rem;background:#0f172a;color:#e2e8f0;border-radius:1rem">
        <div style="text-align:center;margin-bottom:2rem">
          <div style="font-size:2rem;font-weight:800;background:linear-gradient(135deg,#7C3AED,#06B6D4);-webkit-background-clip:text;-webkit-text-fill-color:transparent">IRANCOiN</div>
        </div>
        <div style="text-align:center;font-size:3rem;margin:1rem 0">❌</div>
        <h1 style="color:white;font-size:1.5rem;text-align:center">اشتراک منقضی شد</h1>
        <p style="color:#94a3b8;line-height:1.8;font-size:1rem;text-align:center">
          اشتراک شما منقضی شده است. برای ادامه استفاده از پلتفرم، لطفاً اشتراک جدید خریداری کنید.
        </p>
        <div style="text-align:center;margin:2rem 0">
          <a href="${data.site_url}/pricing.html" style="background:linear-gradient(135deg,#7C3AED,#06B6D4);color:white;padding:0.75rem 2rem;border-radius:0.75rem;text-decoration:none;font-weight:600">خرید اشتراک جدید</a>
        </div>
        <p style="color:#64748b;font-size:0.8125rem;text-align:center;border-top:1px solid rgba(124,58,237,0.2);padding-top:1rem">
          IRANCOiN — پلتفرم هوشمند معاملات ارز دیجیتال
        </p>
      </div>
    `,
  }),

  payment_failed: (data) => ({
    subject: "پرداخت ناموفق",
    html: `
      <div dir="rtl" style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:2rem;background:#0f172a;color:#e2e8f0;border-radius:1rem">
        <div style="text-align:center;margin-bottom:2rem">
          <div style="font-size:2rem;font-weight:800;background:linear-gradient(135deg,#7C3AED,#06B6D4);-webkit-background-clip:text;-webkit-text-fill-color:transparent">IRANCOiN</div>
        </div>
        <div style="text-align:center;font-size:3rem;margin:1rem 0">❌</div>
        <h1 style="color:white;font-size:1.5rem;text-align:center">پرداخت ناموفق</h1>
        <p style="color:#94a3b8;line-height:1.8;font-size:1rem;text-align:center">
          پرداخت شما تایید نشد. اگر مبلغ کسر شده ظرف ۳۰ دقیقه بازگردانده نشد، با پشتیبانی تماس بگیرید.
        </p>
        <div style="text-align:center;margin:2rem 0">
          <a href="${data.site_url}/pricing.html" style="background:linear-gradient(135deg,#7C3AED,#06B6D4);color:white;padding:0.75rem 2rem;border-radius:0.75rem;text-decoration:none;font-weight:600">تلاش مجدد</a>
        </div>
        <p style="color:#64748b;font-size:0.8125rem;text-align:center;border-top:1px solid rgba(124,58,237,0.2);padding-top:1rem">
          IRANCOiN — پلتفرم هوشمند معاملات ارز دیجیتال
        </p>
      </div>
    `,
  }),
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Restrict to admin key or internal service-role calls
    const adminKey = req.headers.get("X-Admin-Key") || "";
    const auth = req.headers.get("Authorization") || "";
    const expectedAdmin = Deno.env.get("ADMIN_KEY");
    const isInternal = auth.includes(SUPABASE_SERVICE_KEY);
    const isAdminCall = !!expectedAdmin && adminKey === expectedAdmin;
    if (!isInternal && !isAdminCall) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { template, to, data } = await req.json();

    if (!template || !to) {
      return new Response(
        JSON.stringify({ error: "template and to are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tmpl = templates[template];
    if (!tmpl) {
      return new Response(
        JSON.stringify({ error: "Unknown template: " + template }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { subject, html } = tmpl({ ...data, site_url: data?.site_url || "https://alikhani09390916.github.io/irancoin-premium" });

    // Store email in database for logging
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    await supabase.from("email_logs").insert({
      to_email: to,
      template,
      subject,
      status: "sent",
      metadata: data || {},
    }).then(() => {}).catch(() => {});

    // In production, integrate with Resend/SendGrid/etc.
    // For now, we log the email content
    console.log("=== EMAIL NOTIFICATION ===");
    console.log("To:", to);
    console.log("Subject:", subject);
    console.log("Template:", template);
    console.log("==========================");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Email queued for delivery",
        to,
        template,
        subject,
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
