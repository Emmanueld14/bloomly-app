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

  const MAX_PICK_BYTES = 50 * 1024 * 1024;
  const MAX_EDGE_PX = 1600;
  const TARGET_UPLOAD_BYTES = 1.5 * 1024 * 1024;

  function errorMessage(err) {
    if (!err) return "Unknown error";
    if (typeof err === "string") return err;
    return err.message || err.error_description || err.error || "Unknown error";
  }

  function friendlyAvatarError(err) {
    const msg = errorMessage(err);
    if (/exceeded the maximum allowed size|EntityTooLarge|Payload too large|413/i.test(msg)) {
      return "That photo is still too large for storage. Try a smaller image, or run the 50MB avatars migration in Supabase.";
    }
    if (/mime type|not allowed|invalid.*type/i.test(msg)) {
      return "Use a JPG, PNG, WebP, or GIF photo.";
    }
    if (/row-level security|not authorized|403|Unauthorized/i.test(msg)) {
      return "Couldn’t save the photo (permission denied). Sign out and back in, then try again.";
    }
    if (/Failed to fetch|NetworkError|network/i.test(msg)) {
      return "Network error while uploading the photo. Check your connection and try again.";
    }
    return msg;
  }

  function loadImageElement(file) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Couldn’t read that image. Try JPG, PNG, or WebP."));
      };
      img.src = url;
    });
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error("Couldn’t process that image."));
          else resolve(blob);
        },
        type,
        quality
      );
    });
  }

  /**
   * Accept large camera rolls (up to 50MB) but upload a resized JPEG avatar.
   * Avoids Supabase bucket / network failures on huge originals.
   */
  async function prepareAvatarFile(file) {
    if (!file.type || !file.type.startsWith("image/")) {
      throw new Error("Use a JPG, PNG, WebP, or GIF photo.");
    }

    const img = await loadImageElement(file);
    const scale = Math.min(1, MAX_EDGE_PX / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
    const width = Math.max(1, Math.round((img.naturalWidth || img.width) * scale));
    const height = Math.max(1, Math.round((img.naturalHeight || img.height) * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error("Couldn’t process that image.");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    let quality = 0.88;
    let blob = await canvasToBlob(canvas, "image/jpeg", quality);
    while (blob.size > TARGET_UPLOAD_BYTES && quality > 0.55) {
      quality -= 0.1;
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
    }

    const base = (file.name || "avatar").replace(/\.[^.]+$/, "") || "avatar";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  }

  async function uploadAvatar(client, userId, file) {
    const prepared = await prepareAvatarFile(file);
    const path = `${userId}/avatar-${Date.now()}.jpg`;
    const { error: uploadError } = await client.storage.from("avatars").upload(path, prepared, {
      cacheControl: "3600",
      upsert: true,
      contentType: "image/jpeg",
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
      if (file.size > MAX_PICK_BYTES) {
        setText(avatarError, "Please choose an image under 50MB.", true);
        avatarInput.value = "";
        selectedFile = null;
        return;
      }
      if (!file.type || !file.type.startsWith("image/")) {
        setText(avatarError, "Use a JPG, PNG, WebP, or GIF photo.", true);
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
            setText(statusEl, "Optimizing & uploading photo…", false);
            await uploadAvatar(client, state.user.id, selectedFile);
            selectedFile = null;
          } catch (avatarErr) {
            console.warn("Avatar upload failed", avatarErr);
            setText(
              avatarError,
              `Username saved, but the photo didn’t upload: ${friendlyAvatarError(avatarErr)}`,
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
