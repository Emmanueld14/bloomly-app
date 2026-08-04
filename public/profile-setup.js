/**
 * Profile setup / edit: username + optional avatar.
 * Uses window.BloomlyAuth (shared client) and window.BloomlyProfile helpers.
 */
(function () {
  "use strict";

  function qs(id) {
    return document.getElementById(id);
  }

  function setHidden(el, hidden) {
    if (!el) return;
    el.hidden = hidden;
  }

  function setText(el, text, isError) {
    if (!el) return;
    el.textContent = text || "";
    setHidden(el, !text);
    el.classList.toggle("is-error", Boolean(isError && text));
    el.classList.toggle("is-success", Boolean(!isError && text));
  }

  function nextPath() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next") || "";
    if (next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/login")) {
      return next;
    }
    return "/blog/";
  }

  function waitForAuth(timeoutMs) {
    return new Promise((resolve) => {
      if (window.BloomlyAuth?.getState()?.ready) {
        resolve(window.BloomlyAuth);
        return;
      }
      const started = Date.now();
      const onReady = () => {
        document.removeEventListener("bloomly:auth", onReady);
        resolve(window.BloomlyAuth);
      };
      document.addEventListener("bloomly:auth", onReady);
      const timer = setInterval(() => {
        if (window.BloomlyAuth?.getState()?.ready) {
          clearInterval(timer);
          document.removeEventListener("bloomly:auth", onReady);
          resolve(window.BloomlyAuth);
        } else if (Date.now() - started > (timeoutMs || 10000)) {
          clearInterval(timer);
          document.removeEventListener("bloomly:auth", onReady);
          resolve(window.BloomlyAuth || null);
        }
      }, 40);
    });
  }

  function updateAvatarPreview(fileOrUrl, username) {
    const preview = qs("avatarPreview");
    const helpers = window.BloomlyProfile;
    if (!preview || !helpers) return;

    if (fileOrUrl instanceof File) {
      const url = URL.createObjectURL(fileOrUrl);
      preview.classList.remove("bloomly-avatar--initials");
      preview.innerHTML = "";
      const img = document.createElement("img");
      img.src = url;
      img.alt = "";
      img.className = "bloomly-avatar-img";
      preview.appendChild(img);
      return;
    }

    helpers.renderAvatarElement(preview, {
      username,
      avatarUrl: typeof fileOrUrl === "string" ? fileOrUrl : null,
      name: username,
    });
  }

  async function uploadAvatar(client, userId, file) {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${userId}/avatar-${Date.now()}.${ext || "jpg"}`;
    const { error: uploadError } = await client.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
      contentType: file.type || "image/jpeg",
    });
    if (uploadError) throw uploadError;

    const { data } = client.storage.from("avatars").getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error("Could not resolve avatar URL.");

    const { error: updateError } = await client
      .from("profiles")
      .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
      .eq("id", userId);
    if (updateError) throw updateError;
    return publicUrl;
  }

  async function init() {
    const helpers = window.BloomlyProfile;
    const form = qs("profileSetupForm");
    const usernameInput = qs("usernameInput");
    const usernameError = qs("usernameError");
    const avatarInput = qs("avatarInput");
    const avatarError = qs("avatarError");
    const statusEl = qs("profileSetupStatus");
    const saveBtn = qs("saveProfileBtn");
    const skipBtn = qs("skipProfileBtn");
    const titleEl = qs("profileSetupTitle");
    const leadEl = qs("profileSetupLead");

    if (!form || !helpers) return;

    const auth = await waitForAuth();
    if (!auth) {
      setText(statusEl, "Could not load auth. Please refresh.", true);
      return;
    }

    await auth.refresh();
    let state = auth.getState();
    if (!state.user) {
      window.location.replace(auth.loginUrl());
      return;
    }

    const client = await auth.getClient();
    const { data: profile } = await client
      .from("profiles")
      .select("id, email, display_name, role, username, avatar_url")
      .eq("id", state.user.id)
      .maybeSingle();

    const editing = profile && !helpers.needsProfileSetup(profile);
    if (editing) {
      if (titleEl) titleEl.textContent = "Edit your profile";
      if (leadEl) {
        leadEl.textContent = "Update the username and photo people see on your comments.";
      }
      if (skipBtn) skipBtn.textContent = "Cancel";
    }

    const currentUsername = helpers.needsProfileSetup(profile)
      ? ""
      : profile?.username || "";
    usernameInput.value = currentUsername;
    updateAvatarPreview(profile?.avatar_url || null, currentUsername || "B");

    let selectedFile = null;

    qs("avatarPreviewBtn")?.addEventListener("click", () => avatarInput?.click());
    avatarInput?.addEventListener("change", () => {
      setText(avatarError, "", false);
      const file = avatarInput.files && avatarInput.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        setText(avatarError, "Please choose an image under 2MB.", true);
        avatarInput.value = "";
        selectedFile = null;
        return;
      }
      selectedFile = file;
      updateAvatarPreview(file, usernameInput.value || "B");
    });

    usernameInput.addEventListener("input", () => {
      setText(usernameError, "", false);
      if (!selectedFile && !profile?.avatar_url) {
        updateAvatarPreview(null, usernameInput.value || "B");
      }
    });

    skipBtn?.addEventListener("click", () => {
      // Soft exit: no redirect loop, but member actions stay gated.
      helpers.deferSetup();
      window.location.href = editing ? "/account/" : nextPath();
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setText(usernameError, "", false);
      setText(avatarError, "", false);
      setText(statusEl, "", false);

      const username = usernameInput.value.trim();
      const formatError = helpers.validateUsername(username);
      if (formatError) {
        setText(usernameError, formatError, true);
        usernameInput.focus();
        return;
      }

      saveBtn.disabled = true;
      skipBtn.disabled = true;
      setText(statusEl, "Saving…", false);

      try {
        const { error: usernameUpdateError } = await client
          .from("profiles")
          .update({
            username,
            display_name: username,
            updated_at: new Date().toISOString(),
          })
          .eq("id", state.user.id);

        if (usernameUpdateError) {
          const msg = String(usernameUpdateError.message || "");
          if (/duplicate|unique|profiles_username/i.test(msg)) {
            setText(usernameError, "That username is taken. Try another.", true);
          } else if (/username_format|check/i.test(msg)) {
            setText(usernameError, helpers.validateUsername(username) || msg, true);
          } else {
            setText(usernameError, msg || "Could not save username.", true);
          }
          setText(statusEl, "", false);
          return;
        }

        // Avatar is independent — failure must not undo username.
        if (selectedFile) {
          try {
            await uploadAvatar(client, state.user.id, selectedFile);
          } catch (avatarErr) {
            console.warn("Avatar upload failed", avatarErr);
            setText(
              avatarError,
              "Username saved, but the photo didn’t upload. You can try the photo again anytime.",
              true
            );
            helpers.clearDeferSetup();
            await auth.refresh();
            setText(statusEl, "Username saved.", false);
            saveBtn.disabled = false;
            skipBtn.disabled = false;
            return;
          }
        }

        helpers.clearDeferSetup();
        await auth.refresh();
        setText(statusEl, "Profile saved. Taking you onward…", false);
        window.location.href = nextPath();
      } catch (err) {
        console.warn("Profile save failed", err);
        setText(statusEl, err instanceof Error ? err.message : "Something went wrong.", true);
      } finally {
        saveBtn.disabled = false;
        skipBtn.disabled = false;
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
