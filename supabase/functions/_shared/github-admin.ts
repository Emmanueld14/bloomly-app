const ALLOWED_ADMIN_EMAILS = [
  "manuel.muh@lightacademynairobi.sc.ke",
  "manuelmuhunami@gmail.com",
  "muhunanim@gmail.com",
];

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, accept",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function verifyGitHubAdmin(req: Request) {
  const auth = req.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) {
    return { ok: false as const, status: 401, error: "Missing authorization token." };
  }

  const userRes = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Bloomly-Admin",
    },
  });
  if (!userRes.ok) {
    return { ok: false as const, status: 401, error: "Invalid GitHub token." };
  }
  const user = await userRes.json();

  const emailRes = await fetch("https://api.github.com/user/emails", {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Bloomly-Admin",
    },
  });
  const emails = emailRes.ok ? await emailRes.json() : [];
  const primaryEmail = (
    emails.find((e: { primary?: boolean }) => e.primary)?.email ||
    emails[0]?.email ||
    user.email ||
    ""
  ).toLowerCase();

  const allowed = ALLOWED_ADMIN_EMAILS.some(
    (e) => e.toLowerCase() === primaryEmail,
  );
  if (!allowed) {
    return {
      ok: false as const,
      status: 403,
      error: "Access denied. This account is not authorized.",
    };
  }

  return { ok: true as const, user, email: primaryEmail };
}
