"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AdminErrorState, AdminLoadingState } from "@/components/ui/States";
import type { Profile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";
import type { BlogComment } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/utils";

export function UserDetailClient() {
  const searchParams = useSearchParams();
  const idParam = searchParams.get("id");
  const [currentUserId, setCurrentUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<"admin" | "user">("user");
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [likeCount, setLikeCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      if (!idParam) {
        setError("Missing user id.");
        setProfile(null);
        return;
      }
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);

      const { data, error: fetchError } = await supabase
        .from("profiles")
        .select(
          "id, email, display_name, role, username, avatar_url, is_active, deactivated_at, created_at, updated_at"
        )
        .eq("id", idParam)
        .maybeSingle();
      if (fetchError) {
        setError(fetchError.message);
        setProfile(null);
        return;
      }
      if (!data) {
        setProfile(null);
        return;
      }
      const row = data as Profile;
      setProfile(row);
      setUsername(row.username || "");
      setDisplayName(row.display_name || "");
      setRole(row.role === "admin" ? "admin" : "user");

      const [commentsRes, likesRes] = await Promise.all([
        supabase
          .from("comments")
          .select("id, post_id, nick, text, timestamp, user_id, status")
          .eq("user_id", idParam)
          .order("timestamp", { ascending: false })
          .limit(20),
        supabase
          .from("user_post_likes")
          .select("post_id", { count: "exact", head: true })
          .eq("user_id", idParam),
      ]);
      setComments((commentsRes.data || []) as BlogComment[]);
      setLikeCount(likesRes.count || 0);
    }
    void load();
  }, [idParam]);

  async function saveIdentity(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError(null);
    setNote(null);

    const nextUsername = username.trim();
    if (nextUsername && !/^[a-zA-Z0-9_]{3,24}$/.test(nextUsername)) {
      setBusy(false);
      setError("Username must be 3–24 characters: letters, numbers, underscore.");
      return;
    }

    const supabase = createClient();
    if (nextUsername) {
      const { data: clash } = await supabase
        .from("profiles")
        .select("id")
        .ilike("username", nextUsername)
        .neq("id", profile.id)
        .maybeSingle();
      if (clash) {
        setBusy(false);
        setError("That username is already taken.");
        return;
      }
    }

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username: nextUsername || null,
        display_name: displayName.trim() || null,
      })
      .eq("id", profile.id);

    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setProfile({
      ...profile,
      username: nextUsername || null,
      display_name: displayName.trim() || null,
    });
    setNote("Profile details saved.");
  }

  async function saveRole(next: "admin" | "user") {
    if (!profile || profile.id === currentUserId) return;
    setBusy(true);
    setError(null);
    setNote(null);
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ role: next })
      .eq("id", profile.id);
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setRole(next);
    setProfile({ ...profile, role: next });
    setNote(`Role updated to ${next}.`);
  }

  async function setActive(active: boolean) {
    if (!profile || profile.id === currentUserId) return;
    if (
      !active &&
      !confirm("Deactivate this account? They will not be able to sign in until reactivated.")
    ) {
      return;
    }
    setBusy(true);
    setError(null);
    setNote(null);
    const supabase = createClient();
    const payload = active
      ? { is_active: true, deactivated_at: null }
      : { is_active: false, deactivated_at: new Date().toISOString() };
    const { error: updateError } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", profile.id);
    setBusy(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setProfile({ ...profile, ...payload });
    setNote(active ? "Account reactivated." : "Account deactivated.");
  }

  if (error && profile === undefined) return <AdminErrorState message={error} />;
  if (profile === undefined) return <AdminLoadingState />;
  if (!profile) return <AdminErrorState message="User not found." />;

  const inactive = profile.is_active === false;
  const isSelf = profile.id === currentUserId;

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/users/" className="text-xs text-gray-500 hover:text-gray-800">
          ← Users
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900">
          {profile.username || profile.display_name || profile.email || "User"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{profile.email}</p>
      </div>

      {error ? (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {note ? (
        <p className="rounded-md border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-800">
          {note}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <form
            onSubmit={saveIdentity}
            className="space-y-4 rounded-lg border border-[var(--admin-border)] bg-white p-5"
          >
            <h2 className="text-sm font-semibold text-gray-900">Profile</h2>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-gray-700">Username</span>
              <input
                className="admin-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                pattern="[a-zA-Z0-9_]{3,24}"
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="font-medium text-gray-700">Display name</span>
              <input
                className="admin-input"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </label>
            <button type="submit" disabled={busy} className="admin-btn admin-btn-primary">
              Save profile
            </button>
          </form>

          <div className="rounded-lg border border-[var(--admin-border)] bg-white p-5">
            <h2 className="text-sm font-semibold text-gray-900">Recent comments</h2>
            {comments.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No comments yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-gray-100">
                {comments.map((c) => (
                  <li key={c.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="line-clamp-2 text-sm text-gray-800">{c.text}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          /{c.post_id} · {formatDateTime(c.timestamp)} ·{" "}
                          {(c.status || "visible") === "hidden" ? "hidden" : "visible"}
                        </p>
                      </div>
                      <Link
                        href={`/admin/comments/edit/?id=${c.id}`}
                        className="shrink-0 text-xs text-teal-700 hover:underline"
                      >
                        Open
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <aside className="space-y-4 rounded-lg border border-[var(--admin-border)] bg-white p-4">
          <div className="text-sm">
            <p className="font-medium text-gray-700">Role</p>
            {isSelf ? (
              <p className="mt-1 capitalize text-gray-900">{role} (you)</p>
            ) : (
              <select
                className="admin-input mt-1"
                value={role}
                disabled={busy}
                onChange={(e) => void saveRole(e.target.value as "admin" | "user")}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            )}
          </div>

          <div className="text-sm">
            <p className="font-medium text-gray-700">Account status</p>
            <p className="mt-1 text-gray-900">{inactive ? "Deactivated" : "Active"}</p>
            {inactive && profile.deactivated_at ? (
              <p className="mt-1 text-xs text-gray-500">
                Since {formatDateTime(profile.deactivated_at)}
              </p>
            ) : null}
            {!isSelf ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void setActive(inactive)}
                className={`mt-3 admin-btn w-full ${
                  inactive ? "admin-btn-primary" : "admin-btn-danger"
                }`}
              >
                {inactive ? "Reactivate" : "Deactivate"}
              </button>
            ) : (
              <p className="mt-2 text-xs text-gray-400">You cannot deactivate your own account.</p>
            )}
          </div>

          <div className="text-sm">
            <p className="font-medium text-gray-700">Activity</p>
            <p className="mt-1 text-gray-900">{likeCount} post like{likeCount === 1 ? "" : "s"}</p>
            <p className="text-gray-900">
              {comments.length}
              {comments.length >= 20 ? "+" : ""} recent comment
              {comments.length === 1 ? "" : "s"} shown
            </p>
          </div>

          <div className="text-sm">
            <p className="font-medium text-gray-700">Joined</p>
            <p className="mt-1 text-gray-900">{formatDate(profile.created_at) || "—"}</p>
          </div>

          {profile.avatar_url ? (
            <div className="text-sm">
              <p className="font-medium text-gray-700">Avatar</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.avatar_url}
                alt=""
                className="mt-2 h-16 w-16 rounded-full object-cover"
              />
            </div>
          ) : null}

          <div className="text-sm">
            <p className="font-medium text-gray-700">ID</p>
            <p className="mt-1 break-all font-mono text-xs text-gray-600">{profile.id}</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
