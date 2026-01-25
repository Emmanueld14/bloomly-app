import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-admin-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";
const RESEND_FROM_EMAIL = Deno.env.get("RESEND_FROM_EMAIL") || "";
const ADMIN_PUBLISH_KEY = Deno.env.get("ADMIN_PUBLISH_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const RESEND_BATCH_URL = "https://api.resend.com/emails/batch";
const BATCH_SIZE = 50;

type PostRecord = {
  id: number;
  title: string;
  slug: string;
  summary: string | null;
  url: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailSubject(post: PostRecord) {
  return `New blog post: ${post.title}`;
}

function buildEmailHtml(post: PostRecord) {
  const summary = post.summary ? escapeHtml(post.summary) : "Read the latest post.";
  return `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1f1f1f;">
      <h2 style="margin: 0 0 12px;">${escapeHtml(post.title)}</h2>
      <p style="margin: 0 0 16px;">${summary}</p>
      <a href="${post.url}" style="display: inline-block; padding: 10px 16px; background: #5fa8ff; color: #ffffff; text-decoration: none; border-radius: 6px;">
        Read the full post
      </a>
      <p style="margin-top: 16px; font-size: 12px; color: #6b6b6b;">
        You are receiving this because you subscribed to blog updates.
      </p>
    </div>
  `;
}

function buildEmailText(post: PostRecord) {
  const summary = post.summary || "Read the latest post.";
  return `${post.title}\n\n${summary}\n\nRead here: ${post.url}`;
}

async function fetchAllSubscribers() {
  const emails: string[] = [];
  const pageSize = 1000;
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("subscribers")
      .select("email")
      .range(from, from + pageSize - 1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    emails.push(...data.map((row) => row.email));
    if (data.length < pageSize) {
      break;
    }

    from += pageSize;
  }

  return emails;
}

async function fetchSentEmails(postId: number) {
  const { data, error } = await supabase
    .from("email_logs")
    .select("email, status")
    .eq("post_id", postId);

  if (error) {
    throw error;
  }

  const sent = new Set<string>();
  (data || []).forEach((row) => {
    if (row.status === "sent" || row.status === "success") {
      sent.add(row.email);
    }
  });

  return sent;
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchOrCreatePost(payload: Record<string, string>) {
  const title = (payload.title || "").trim();
  const summary = (payload.summary || "").trim();
  const url = (payload.url || "").trim();
  const slug = (payload.slug || slugify(title)).trim();

  if (!title || !url) {
    throw new Error("Post title and URL are required.");
  }

  const { data: existing } = await supabase
    .from("posts")
    .select("id, title, slug, summary, url")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) {
    return existing as PostRecord;
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({ title, summary: summary || null, url, slug })
    .select("id, title, slug, summary, url")
    .single();

  if (error) {
    throw error;
  }

  return data as PostRecord;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  if (ADMIN_PUBLISH_KEY) {
    const providedKey = req.headers.get("x-admin-key") || "";
    if (providedKey !== ADMIN_PUBLISH_KEY) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return jsonResponse({ error: "Supabase service role key is missing." }, 500);
  }

  if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    return jsonResponse({ error: "Resend API key or from email is missing." }, 500);
  }

  let payload: Record<string, string> = {};
  try {
    const body = await req.json();
    payload = body?.post ? body.post : body;
  } catch (error) {
    return jsonResponse({ error: "Invalid JSON payload." }, 400);
  }

  try {
    const post = await fetchOrCreatePost(payload);
    const sentAlready = await fetchSentEmails(post.id);
    const subscribers = await fetchAllSubscribers();
    const targets = subscribers.filter((email) => !sentAlready.has(email));

    if (targets.length === 0) {
      return jsonResponse({
        message: "No new subscribers to notify.",
        post_id: post.id,
        sent: 0,
        skipped: sentAlready.size,
        failed: 0,
      });
    }

    const batches = chunkArray(targets, BATCH_SIZE);
    let sentCount = 0;
    let failedCount = 0;

    for (const batch of batches) {
      const emailPayload = batch.map((email) => ({
        from: RESEND_FROM_EMAIL,
        to: [email],
        subject: buildEmailSubject(post),
        html: buildEmailHtml(post),
        text: buildEmailText(post),
      }));

      const response = await fetch(RESEND_BATCH_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailPayload),
      });

      const logs: { post_id: number; email: string; status: string }[] = [];

      if (!response.ok) {
        failedCount += batch.length;
        batch.forEach((email) => logs.push({ post_id: post.id, email, status: "failed" }));
        await supabase.from("email_logs").insert(logs);
        continue;
      }

      const result = await response.json().catch(() => ({}));
      const data = Array.isArray(result?.data) ? result.data : [];

      batch.forEach((email, index) => {
        const entry = data[index];
        const status = entry && entry.id ? "sent" : "failed";
        if (status === "sent") {
          sentCount += 1;
        } else {
          failedCount += 1;
        }
        logs.push({ post_id: post.id, email, status });
      });

      if (logs.length) {
        await supabase.from("email_logs").insert(logs);
      }

      await sleep(250);
    }

    return jsonResponse({
      message: "Email notifications processed.",
      post_id: post.id,
      sent: sentCount,
      skipped: sentAlready.size,
      failed: failedCount,
    });
  } catch (error) {
    console.error("notify-subscribers error", error);
    return jsonResponse({ error: "Failed to send notifications." }, 500);
  }
});
