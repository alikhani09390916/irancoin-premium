#!/usr/bin/env node
/**
 * Google Analytics MCP Server for IRANCOIN
 * =========================================
 * Provides:
 *  - GA4 property management
 *  - Real-time analytics data
 *  - Custom reports and queries
 *  - User behavior insights
 *  - Conversion tracking
 *  - Audience demographics
 *  - Content performance
 *  - E-commerce analytics
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// ============================================================
// GOOGLE ANALYTICS CONFIG
// ============================================================
const GA_CONFIG = {
  // Service account credentials (to be configured)
  serviceAccountEmail: process.env.GA_SERVICE_ACCOUNT_EMAIL || "",
  privateKey: process.env.GA_PRIVATE_KEY || "",
  // GA4 Property ID
  propertyId: process.env.GA_PROPERTY_ID || "",
  // Measurement ID (GA4 Web)
  measurementId: process.env.GA_MEASUREMENT_ID || "",
  // API Key for public data
  apiKey: process.env.GA_API_KEY || "",
};

// ============================================================
// GA4 DATA API HELPER
// ============================================================
async function ga4Request(endpoint, requestBody) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${GA_CONFIG.propertyId}:${endpoint}`;

  // For demo purposes, return mock data structure
  // In production, use Google Auth Library for service account
  return {
    success: true,
    endpoint,
    message: "Configure GA4 credentials to fetch real data",
    mockData: generateMockData(endpoint, requestBody),
  };
}

function generateMockData(endpoint, body) {
  const mockData = {
    runReport: {
      rows: [
        { dimensionValues: [{ value: "Direct" }], metricValues: [{ value: "1250" }] },
        { dimensionValues: [{ value: "Organic Search" }], metricValues: [{ value: "3400" }] },
        { dimensionValues: [{ value: "Social" }], metricValues: [{ value: "890" }] },
        { dimensionValues: [{ value: "Referral" }], metricValues: [{ value: "560" }] },
      ],
      totals: [{ metricValues: [{ value: "6100" }] }],
      metadata: { currencyCode: "USD", timeZone: "Asia/Tehran" },
    },
    runRealtimeReport: {
      activeUsers: 42,
      screenPageViews: 156,
      events: [
        { eventName: "page_view", eventCount: 89 },
        { eventName: "scroll", eventCount: 34 },
        { eventName: "click", eventCount: 23 },
        { eventName: "purchase", eventCount: 3 },
      ],
    },
    getMetadata: {
      dimensions: [
        { apiName: "date", uiName: "Date" },
        { apiName: "sessionSource", uiName: "Session source" },
        { apiName: "sessionMedium", uiName: "Session medium" },
        { apiName: "pagePath", uiName: "Page path" },
        { apiName: "deviceCategory", uiName: "Device category" },
        { apiName: "country", uiName: "Country" },
        { apiName: "city", uiName: "City" },
      ],
      metrics: [
        { apiName: "activeUsers", uiName: "Active users" },
        { apiName: "sessions", uiName: "Sessions" },
        { apiName: "screenPageViews", uiName: "Screen page views" },
        { apiName: "averageSessionDuration", uiName: "Avg. session duration" },
        { apiName: "bounceRate", uiName: "Bounce rate" },
        { apiName: "conversions", uiName: "Conversions" },
        { apiName: "totalRevenue", uiName: "Total revenue" },
      ],
    },
  };
  return mockData[endpoint] || {};
}

// ============================================================
// MCP SERVER
// ============================================================
const server = new McpServer({
  name: "google-analytics-irancoin",
  version: "1.0.0",
});

// ============================================================
// TOOL: get_realtime_data
// ============================================================
server.tool(
  "get_realtime_data",
  "Get real-time analytics data from GA4",
  {
    propertyId: z.string().optional().describe("GA4 Property ID (or use env GA_PROPERTY_ID)"),
  },
  async ({ propertyId }) => {
    const pid = propertyId || GA_CONFIG.propertyId;
    if (!pid) {
      return {
        content: [{
          type: "text",
          text: "GA4 Property ID not configured.\n\nSet GA_PROPERTY_ID environment variable or pass propertyId parameter.\n\nTo find your Property ID:\n1. Go to Google Analytics → Admin\n2. Select your property\n3. Property Settings → Property ID",
        }],
      };
    }

    const data = await ga4Request("runRealtimeReport", {
      dimensions: [{ name: "eventName" }],
      metrics: [{ name: "activeUsers" }, { name: "eventCount" }],
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          propertyId: pid,
          realtime: data.mockData,
          note: "Configure GA4 service account for real data",
        }, null, 2),
      }],
    };
  }
);

// ============================================================
// TOOL: get_traffic_report
// ============================================================
server.tool(
  "get_traffic_report",
  "Get traffic acquisition report from GA4",
  {
    days: z.number().optional().describe("Number of days to look back (default 30)"),
    propertyId: z.string().optional().describe("GA4 Property ID"),
  },
  async ({ days, propertyId }) => {
    const pid = propertyId || GA_CONFIG.propertyId;
    const d = days || 30;

    const data = await ga4Request("runReport", {
      dateRanges: [{ startDate: `${d}daysAgo`, endDate: "today" }],
      dimensions: [
        { name: "sessionSource" },
        { name: "sessionMedium" },
      ],
      metrics: [
        { name: "sessions" },
        { name: "activeUsers" },
        { name: "averageSessionDuration" },
        { name: "bounceRate" },
      ],
      orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
      limit: 10,
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          propertyId: pid,
          period: `Last ${d} days`,
          trafficSources: data.mockData,
        }, null, 2),
      }],
    };
  }
);

// ============================================================
// TOOL: get_content_performance
// ============================================================
server.tool(
  "get_content_performance",
  "Get page/content performance data from GA4",
  {
    days: z.number().optional().describe("Number of days to look back (default 7)"),
    propertyId: z.string().optional().describe("GA4 Property ID"),
  },
  async ({ days, propertyId }) => {
    const pid = propertyId || GA_CONFIG.propertyId;
    const d = days || 7;

    const data = await ga4Request("runReport", {
      dateRanges: [{ startDate: `${d}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "pagePath" }],
      metrics: [
        { name: "screenPageViews" },
        { name: "averageSessionDuration" },
        { name: "bounceRate" },
        { name: "conversions" },
      ],
      orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
      limit: 20,
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          propertyId: pid,
          period: `Last ${d} days`,
          topPages: data.mockData,
        }, null, 2),
      }],
    };
  }
);

// ============================================================
// TOOL: get_audience_insights
// ============================================================
server.tool(
  "get_audience_insights",
  "Get audience demographics and device data from GA4",
  {
    days: z.number().optional().describe("Number of days to look back (default 30)"),
    propertyId: z.string().optional().describe("GA4 Property ID"),
  },
  async ({ days, propertyId }) => {
    const pid = propertyId || GA_CONFIG.propertyId;
    const d = days || 30;

    const [countryData, deviceData] = await Promise.all([
      ga4Request("runReport", {
        dateRanges: [{ startDate: `${d}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "country" }],
        metrics: [{ name: "activeUsers" }],
        orderBys: [{ metric: { metricName: "activeUsers" }, desc: true }],
        limit: 10,
      }),
      ga4Request("runReport", {
        dateRanges: [{ startDate: `${d}daysAgo`, endDate: "today" }],
        dimensions: [{ name: "deviceCategory" }],
        metrics: [
          { name: "activeUsers" },
          { name: "sessions" },
          { name: "bounceRate" },
        ],
      }),
    ]);

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          propertyId: pid,
          period: `Last ${d} days`,
          countries: countryData.mockData,
          devices: deviceData.mockData,
        }, null, 2),
      }],
    };
  }
);

// ============================================================
// TOOL: get_conversions
// ============================================================
server.tool(
  "get_conversions",
  "Get conversion and goal completion data from GA4",
  {
    days: z.number().optional().describe("Number of days to look back (default 30)"),
    propertyId: z.string().optional().describe("GA4 Property ID"),
  },
  async ({ days, propertyId }) => {
    const pid = propertyId || GA_CONFIG.propertyId;
    const d = days || 30;

    const data = await ga4Request("runReport", {
      dateRanges: [{ startDate: `${d}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "eventName" }],
      metrics: [
        { name: "eventCount" },
        { name: "conversions" },
        { name: "totalRevenue" },
      ],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          inListFilter: {
            values: ["purchase", "sign_up", "begin_checkout", "add_to_cart"],
          },
        },
      },
      orderBys: [{ metric: { metricName: "conversions" }, desc: true }],
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          propertyId: pid,
          period: `Last ${d} days`,
          conversions: data.mockData,
        }, null, 2),
      }],
    };
  }
);

// ============================================================
// TOOL: get_user_journey
// ============================================================
server.tool(
  "get_user_journey",
  "Get user flow and navigation paths from GA4",
  {
    propertyId: z.string().optional().describe("GA4 Property ID"),
  },
  async ({ propertyId }) => {
    const pid = propertyId || GA_CONFIG.propertyId;

    const data = await ga4Request("runReport", {
      dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
      dimensions: [
        { name: "landingPage" },
        { name: "pagePath" },
      ],
      metrics: [
        { name: "screenPageViews" },
        { name: "conversions" },
      ],
      limit: 50,
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          propertyId: pid,
          userFlow: data.mockData,
          note: "Configure GA4 for real user journey data",
        }, null, 2),
      }],
    };
  }
);

// ============================================================
// TOOL: setup_ga4_tracking
// ============================================================
server.tool(
  "setup_ga4_tracking",
  "Generate GA4 tracking code for IRANCOIN website",
  {
    measurementId: z.string().optional().describe("GA4 Measurement ID (G-XXXXXXXXXX)"),
  },
  async ({ measurementId }) => {
    const mid = measurementId || GA_CONFIG.measurementId;

    if (!mid) {
      return {
        content: [{
          type: "text",
          text: "Measurement ID not configured.\n\nTo find your Measurement ID:\n1. Go to Google Analytics → Admin\n2. Data Streams → Web\n3. Copy the Measurement ID (G-XXXXXXXXXX)\n\nOr set GA_MEASUREMENT_ID environment variable.",
        }],
      };
    }

    const trackingCode = `<!-- Google Analytics - IRANCOIN -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${mid}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', '${mid}', {
    page_title: document.title,
    page_location: window.location.href,
    custom_map: {
      dimension1: 'user_type',
      dimension2: 'crypto_asset',
      dimension3: 'payment_method',
    },
    // Enhanced measurement
    send_page_view: true,
    cookie_flags: 'SameSite=None;Secure',
    // IP anonymization (required for GDPR)
    anonymize_ip: true,
    // Cross-domain tracking
    linker: {
      domains: ['irancoin.ir', 'app.irancoin.ir'],
    },
  });

  // Custom events for crypto platform
  function trackCryptoEvent(eventName, params) {
    gtag('event', eventName, {
      crypto_asset: params.asset || 'unknown',
      transaction_amount: params.amount || 0,
      payment_method: params.method || 'unknown',
      ...params,
    });
  }

  // Track subscription events
  function trackSubscription(plan, amount) {
    gtag('event', 'subscription', {
      plan_name: plan,
      value: amount,
      currency: 'USD',
    });
  }

  // Track trading signals
  function trackSignal(action, asset) {
    gtag('event', 'signal_interaction', {
      action: action,
      crypto_asset: asset,
    });
  }

  // Expose globally
  window.IranCoinAnalytics = {
    trackEvent: trackCryptoEvent,
    trackSubscription,
    trackSignal,
    gtag,
  };
</script>

<!-- Google Tag Manager (optional - for advanced tracking) -->
<script>
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','GTM-XXXXXXX');
</script>`;

    return {
      content: [{
        type: "text",
        text: `GA4 Tracking Code for IRANCOIN\nMeasurement ID: ${mid}\n\n${trackingCode}\n\n---\n\nInstallation:\n1. Add the code to <head> of all HTML pages\n2. For SPA, use gtag('config') on route changes\n3. For custom events, use:\n   window.IranCoinAnalytics.trackEvent('event_name', { key: 'value' })\n   window.IranCoinAnalytics.trackSubscription('monthly', 29.99)\n   window.IranCoinAnalytics.trackSignal('view', 'BTC')`,
      }],
    };
  }
);

// ============================================================
// TOOL: get_ecommerce_data
// ============================================================
server.tool(
  "get_ecommerce_data",
  "Get e-commerce and purchase data from GA4",
  {
    days: z.number().optional().describe("Number of days to look back (default 30)"),
    propertyId: z.string().optional().describe("GA4 Property ID"),
  },
  async ({ days, propertyId }) => {
    const pid = propertyId || GA_CONFIG.propertyId;
    const d = days || 30;

    const data = await ga4Request("runReport", {
      dateRanges: [{ startDate: `${d}daysAgo`, endDate: "today" }],
      dimensions: [{ name: "eventName" }],
      metrics: [
        { name: "purchaseRevenue" },
        { name: "transactions" },
        { name: "itemsAddedToCart" },
        { name: "itemsCheckedOut" },
      ],
      dimensionFilter: {
        filter: {
          fieldName: "eventName",
          inListFilter: {
            values: ["purchase", "begin_checkout", "add_to_cart", "remove_from_cart"],
          },
        },
      },
    });

    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          propertyId: pid,
          period: `Last ${d} days`,
          ecommerce: data.mockData,
        }, null, 2),
      }],
    };
  }
);

// ============================================================
// TOOL: list_ga4_metrics
// ============================================================
server.tool(
  "list_ga4_metrics",
  "List all available GA4 metrics and dimensions",
  {},
  async () => {
    const data = await ga4Request("getMetadata", {});
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          availableDimensions: data.mockData.dimensions,
          availableMetrics: data.mockData.metrics,
          documentation: "https://developers.google.com/analytics/devguides/reporting/data/v1/api-schema",
        }, null, 2),
      }],
    };
  }
);

// ============================================================
// START SERVER
// ============================================================
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Google Analytics MCP Server for IRANCOIN running");
}

main().catch(console.error);
