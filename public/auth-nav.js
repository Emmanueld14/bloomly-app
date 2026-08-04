/**
 * Bloomly auth nav: adds Login / Account / Admin to every page navbar
 * and exposes window.BloomlyAuth for likes/comments gating.
 */
(function () {
  "use strict";

  const SUPABASE_URL = "https://xmhyjttyarskimsxcfhl.supabase.co";
  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhtaHlqdHR5YXJza2ltc3hjZmhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzNDA0MjMsImV4cCI6MjA4NDkxNjQyM30.FlKaDDdR7FebbrrYQ8yNfelpQAeO4KZfGeSZEMoRMW4";

  const state = {
    ready: false,
    user: null,
    profile: null,
    client: null,
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const el = document.createElement("script");
      el.src = src;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => reject(new Error("Failed to load " + src));
      document.head.appendChild(el);
    });
  }

  async function ensureClient() {
    if (state.client) return state.client;
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
      await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js");
    }
    state.client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return state.client;
  }

  async function refreshSession() {
    const client = await ensureClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    state.user = user || null;
    state.profile = null;

    if (user) {
      const { data } = await client
        .from("profiles")
        .select("id, email, display_name, role")
        .eq("id", user.id)
        .maybeSingle();
      state.profile = data || {
        id: user.id,
        email: user.email,
        display_name: (user.email || "").split("@")[0],
        role: "user",
      };
    }

    state.ready = true;
    renderNav();
    document.dispatchEvent(new CustomEvent("bloomly:auth", { detail: { ...state } }));
    return state;
  }

  function loginUrl() {
    const next = window.location.pathname + window.location.search + window.location.hash;
    return "/login/?next=" + encodeURIComponent(next || "/");
  }

  function renderNav() {
    const navLinks = document.getElementById("navLinks");
    if (!navLinks) return;

    navLinks.querySelectorAll("[data-bloomly-auth-item]").forEach((el) => el.remove());

    const makeItem = (html) => {
      const li = document.createElement("li");
      li.setAttribute("data-bloomly-auth-item", "true");
      li.innerHTML = html;
      return li;
    };

    if (!state.user) {
      navLinks.appendChild(
        makeItem(`<a class="nav-auth-link nav-auth-login" href="${loginUrl()}">Log in</a>`)
      );
      return;
    }

    const isAdmin = state.profile?.role === "admin";
    if (isAdmin) {
      navLinks.appendChild(makeItem('<a class="nav-auth-link" href="/admin/">Admin</a>'));
    }
    navLinks.appendChild(makeItem('<a class="nav-auth-link" href="/account/">Account</a>'));
  }

  async function requireUser(options) {
    const opts = options || {};
    await refreshSession();
    if (state.user) return state;

    const message =
      opts.message || "Log in to like posts and leave comments.";
    if (opts.silent) return null;

    const go = window.confirm(message + "\n\nContinue to log in?");
    if (go) {
      window.location.href = loginUrl();
    }
    return null;
  }

  window.BloomlyAuth = {
    getState: () => state,
    refresh: refreshSession,
    requireUser,
    loginUrl,
    isAdmin: () => state.profile?.role === "admin",
    getClient: ensureClient,
  };

  function init() {
    renderNav();
    refreshSession().catch((err) => {
      console.warn("Bloomly auth init failed", err);
      renderNav();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
