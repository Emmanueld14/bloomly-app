/**
 * Bloomly auth nav: adds Login / Account / Admin / profile chip to every page navbar
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

  function helpers() {
    return window.BloomlyProfile || null;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src^="${src.split("?")[0]}"]`)) {
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

  async function ensureHelpers() {
    if (helpers()) return helpers();
    await loadScript("/public/profile-helpers.js?v=20260804c");
    return helpers();
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
    await ensureHelpers();
    const client = await ensureClient();
    const {
      data: { user },
    } = await client.auth.getUser();
    state.user = user || null;
    state.profile = null;

    if (user) {
      const { data } = await client
        .from("profiles")
        .select("id, email, display_name, role, username, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      const h = helpers();
      const fallbackUsername =
        "user_" + String(user.id).replace(/-/g, "").slice(0, 8);
      state.profile = data || {
        id: user.id,
        email: user.email,
        display_name: (user.email || "").split("@")[0],
        username: fallbackUsername,
        avatar_url: null,
        role: "user",
      };
      if (h && !state.profile.username) {
        state.profile.username = fallbackUsername;
      }
    }

    state.ready = true;
    renderNav();
    maybeSoftPromptSetup();
    document.dispatchEvent(new CustomEvent("bloomly:auth", { detail: { ...state } }));
    return state;
  }

  function loginUrl() {
    const next = window.location.pathname + window.location.search + window.location.hash;
    return "/login/?next=" + encodeURIComponent(next || "/");
  }

  function onProfileSetupPage() {
    return window.location.pathname.indexOf("/profile-setup") === 0;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderNav() {
    const navLinks = document.getElementById("navLinks");
    if (!navLinks) return;
    const h = helpers();

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
    const needsSetup = h ? h.needsProfileSetup(state.profile) : false;
    const name = h ? h.displayName(state.profile, state.user) : "Account";
    const avatarUrl = state.profile?.avatar_url || "";
    const initial = h ? h.initials(name) : "A";

    if (isAdmin) {
      navLinks.appendChild(makeItem('<a class="nav-auth-link" href="/admin/">Admin</a>'));
    }

    if (needsSetup) {
      navLinks.appendChild(
        makeItem(
          `<a class="nav-auth-link nav-auth-setup" href="${h.setupUrl("/account/")}">Finish profile</a>`
        )
      );
    }

    const chipHtml = `
      <a class="nav-auth-chip" href="${needsSetup ? h.setupUrl("/account/") : "/account/"}" title="Account">
        <span class="bloomly-avatar bloomly-avatar--nav ${avatarUrl ? "" : "bloomly-avatar--initials"}" data-nav-avatar>
          ${
            avatarUrl
              ? `<img class="bloomly-avatar-img" src="${escapeHtml(avatarUrl)}" alt="" />`
              : escapeHtml(initial)
          }
        </span>
        <span class="nav-auth-chip-name">${escapeHtml(name)}</span>
      </a>`;
    navLinks.appendChild(makeItem(chipHtml));
  }

  /**
   * Soft prompt only: never hard-redirect every page (avoids loops).
   * Incomplete profiles get a nav CTA; member actions call requireCompleteProfile().
   */
  function maybeSoftPromptSetup() {
    /* intentionally no hard redirect here */
  }

  async function requireUser(options) {
    const opts = options || {};
    await refreshSession();
    if (state.user) {
      if (opts.requireCompleteProfile !== false) {
        const complete = await requireCompleteProfile({ silent: opts.silent });
        if (!complete) return null;
      }
      return state;
    }

    const message = opts.message || "Log in to like posts and leave comments.";
    if (opts.silent) return null;

    const go = window.confirm(message + "\n\nContinue to log in?");
    if (go) {
      window.location.href = loginUrl();
    }
    return null;
  }

  /**
   * Gate likes/comments/account actions until a real username is set.
   * Leaving /profile-setup via "Not now" sets a defer flag so we don't loop,
   * but member actions still send the user back to setup.
   */
  async function requireCompleteProfile(options) {
    const opts = options || {};
    await ensureHelpers();
    const h = helpers();
    if (!state.user || !h) return state;
    if (onProfileSetupPage()) return state;
    if (!h.needsProfileSetup(state.profile)) return state;

    if (opts.silent) return null;

    window.location.href = h.setupUrl(
      window.location.pathname + window.location.search + window.location.hash
    );
    return null;
  }

  window.BloomlyAuth = {
    getState: () => state,
    refresh: refreshSession,
    requireUser,
    requireCompleteProfile,
    loginUrl,
    isAdmin: () => state.profile?.role === "admin",
    getClient: ensureClient,
    needsProfileSetup: () => {
      const h = helpers();
      return Boolean(h && state.profile && h.needsProfileSetup(state.profile));
    },
  };

  function ensureProfileStyles() {
    if (document.querySelector('link[data-bloomly-profile-ui]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/public/profile-ui.css?v=20260804c";
    link.setAttribute("data-bloomly-profile-ui", "true");
    document.head.appendChild(link);
  }

  function init() {
    ensureProfileStyles();
    renderNav();
    ensureHelpers()
      .then(() => refreshSession())
      .catch((err) => {
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
