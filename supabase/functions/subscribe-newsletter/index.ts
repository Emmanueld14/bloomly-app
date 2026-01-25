import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildWelcomeEmail(email: string) {
  const safeEmail = escapeHtml(email);
  return {
    subject: "You're subscribed to Bloomly updates",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f1f1f;">
        <h2 style="margin: 0 0 12px;">Welcome to Bloomly</h2>
        <p style="margin: 0 0 12px;">Thanks for subscribing. You'll receive new blog posts and updates.</p>
        <p style="margin: 0 0 12px; font-size: 12px; color: #6b6b6b;">
          This email was sent to ${safeEmail}.
        </p>
      </div>
    `,
    text: "Welcome to Bloomly! Thanks for subscribing. You'll receive new blog posts and updates.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Supabase service role key is missing." }, 500);
  }

  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    return jsonResponse({ error: "Resend API key or from email is missing." }, 500);
  }

  let email = "";
  try {
    const body = await req.json();
    email = (body?.email || "").trim().toLowerCase();
  } catch (error) {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  if (!email || !isValidEmail(email)) {
    return jsonResponse({ error: "Valid email is required." }, 400);
  }

  try {
    const { data, error } = await supabase
      .from("subscribers")
      .insert({ email })
      .select("id, email")
      .single();

    if (error) {
      const isDuplicate = error.code === "23505" ||
        (typeof error.message === "string" && error.message.toLowerCase().includes("duplicate"));
      if (isDuplicate) {
        return jsonResponse({ status: "already_subscribed" }, 200);
      }

      console.error("Insert subscriber failed", error);
      return jsonResponse({ error: "Unable to save subscriber." }, 500);
    }

    const welcome = buildWelcomeEmail(email);

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: RESEND_FROM_EMAIL,
        to: [email],
        subject: welcome.subject,
        html: welcome.html,
        text: welcome.text,
      }),
    });

    if (!resendResponse.ok) {
      const detail = await resendResponse.text().catch(() => "");
      console.error("Resend error", resendResponse.status, detail);
      return jsonResponse({ error: "Subscriber saved, but email failed." }, 502);
    }

    return jsonResponse({ status: "subscribed", subscriber: data });
  } catch (error) {
    console.error("subscribe-newsletter error", error);
    return jsonResponse({ error: "Unexpected error." }, 500);
  }
});
