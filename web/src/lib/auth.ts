import { createClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "user";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  role: UserRole;
};

export async function getSessionUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getProfile(): Promise<{
  user: Awaited<ReturnType<typeof getSessionUser>>;
  profile: Profile | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null, error: null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, display_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return { user, profile: null, error: error.message };
  }

  // If trigger hasn't fired yet, create a default profile row
  if (!data) {
    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email,
        display_name: user.email?.split("@")[0] || "User",
        role: "user",
      })
      .select("id, email, display_name, role")
      .single();

    if (insertError) {
      return { user, profile: null, error: insertError.message };
    }
    return { user, profile: created as Profile, error: null };
  }

  return { user, profile: data as Profile, error: null };
}

export async function requireAdmin() {
  const { user, profile, error } = await getProfile();
  if (!user || profile?.role !== "admin") {
    return { ok: false as const, user, profile, error };
  }
  return { ok: true as const, user, profile, error: null };
}
