/**
 * Shared profile helpers for Bloomly public pages.
 * Attaches to window.BloomlyProfile.
 */
(function () {
  "use strict";

  const DEFAULT_USERNAME_RE = /^user_[a-f0-9]{8}$/i;
  const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;
  const AUTH_STORAGE_KEY = "sb-xmhyjttyarskimsxcfhl-auth-token";
  const DEFER_KEY = "bloomly_profile_setup_deferred";

  function isDefaultUsername(username) {
    if (!username || !String(username).trim()) return true;
    return DEFAULT_USERNAME_RE.test(String(username).trim());
  }

  function needsProfileSetup(profile) {
    return isDefaultUsername(profile?.username);
  }

  function validateUsername(username) {
    const value = String(username || "").trim();
    if (!value) return "Username is required.";
    if (!USERNAME_RE.test(value)) {
      return "Use 3–24 characters: letters, numbers, or underscores.";
    }
    if (isDefaultUsername(value)) {
      return "Please choose a personal username (not the default).";
    }
    return null;
  }

  function displayName(profile, user) {
    if (profile?.username && !isDefaultUsername(profile.username)) {
      return profile.username;
    }
    if (profile?.display_name) return profile.display_name;
    if (user?.email) return user.email.split("@")[0];
    return "Member";
  }

  function initials(name) {
    const parts = String(name || "M")
      .trim()
      .replace(/^@/, "")
      .split(/[\s_]+/)
      .filter(Boolean)
      .slice(0, 2);
    if (!parts.length) return "M";
    return parts.map((p) => p.charAt(0).toUpperCase()).join("");
  }

  function setupUrl(nextPath) {
    const next = nextPath || window.location.pathname + window.location.search;
    const safe = next.startsWith("/") ? next : "/";
    return "/profile-setup/?next=" + encodeURIComponent(safe);
  }

  function isSetupDeferred() {
    try {
      return sessionStorage.getItem(DEFER_KEY) === "1";
    } catch {
      return false;
    }
  }

  function deferSetup() {
    try {
      sessionStorage.setItem(DEFER_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function clearDeferSetup() {
    try {
      sessionStorage.removeItem(DEFER_KEY);
    } catch {
      /* ignore */
    }
  }

  function syncSessionToLocalStorage(session) {
    if (!session) return;
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* ignore */
    }
  }

  function clearLocalSession() {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  function renderAvatarElement(el, { username, avatarUrl, name }) {
    if (!el) return;
    const label = name || username || "Member";
    el.setAttribute("aria-label", label);
    el.classList.add("bloomly-avatar");
    if (avatarUrl) {
      el.innerHTML = "";
      const img = document.createElement("img");
      img.src = avatarUrl;
      img.alt = "";
      img.loading = "lazy";
      img.className = "bloomly-avatar-img";
      el.appendChild(img);
      el.classList.remove("bloomly-avatar--initials");
    } else {
      el.textContent = initials(label);
      el.classList.add("bloomly-avatar--initials");
    }
  }

  window.BloomlyProfile = {
    isDefaultUsername,
    needsProfileSetup,
    validateUsername,
    displayName,
    initials,
    setupUrl,
    isSetupDeferred,
    deferSetup,
    clearDeferSetup,
    syncSessionToLocalStorage,
    clearLocalSession,
    renderAvatarElement,
    AUTH_STORAGE_KEY,
    USERNAME_RE,
  };
})();
