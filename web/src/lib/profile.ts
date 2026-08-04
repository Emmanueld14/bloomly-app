import type { Profile } from "@/lib/auth";

const DEFAULT_USERNAME_RE = /^user_[a-f0-9]{8}$/i;
export const AUTH_STORAGE_KEY = "sb-xmhyjttyarskimsxcfhl-auth-token";

export function isDefaultUsername(username: string | null | undefined) {
  if (!username || !username.trim()) return true;
  return DEFAULT_USERNAME_RE.test(username.trim());
}

export function needsProfileSetup(
  profile: Pick<Profile, "username"> | null | undefined
) {
  return isDefaultUsername(profile?.username);
}

export function displayName(
  profile: Pick<Profile, "username" | "display_name"> | null | undefined,
  email?: string | null
) {
  if (profile?.username && !isDefaultUsername(profile.username)) {
    return profile.username;
  }
  if (profile?.display_name) return profile.display_name;
  if (email) return email.split("@")[0];
  return "Member";
}

export function initials(name: string) {
  const parts = String(name || "M")
    .trim()
    .replace(/^@/, "")
    .split(/[\s_]+/)
    .filter(Boolean)
    .slice(0, 2);
  if (!parts.length) return "M";
  return parts.map((p) => p.charAt(0).toUpperCase()).join("");
}

export function profileSetupUrl(nextPath?: string) {
  const next = nextPath && nextPath.startsWith("/") ? nextPath : "/blog/";
  return `/profile-setup/?next=${encodeURIComponent(next)}`;
}

export function syncSessionToLocalStorage(session: unknown) {
  if (typeof window === "undefined" || !session) return;
  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // ignore quota / private mode
  }
}

export function clearLocalSession() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
}
