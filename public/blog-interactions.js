/**
 * Authenticated likes + comments for static blog posts.
 * Requires window.BloomlyAuth from /public/auth-nav.js.
 */
(function () {
  "use strict";

  const HEART_SVG =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21.2l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>';

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
        } else if (Date.now() - started > (timeoutMs || 8000)) {
          clearInterval(timer);
          document.removeEventListener("bloomly:auth", onReady);
          resolve(window.BloomlyAuth || null);
        }
      }, 50);
    });
  }

  function helpers() {
    return window.BloomlyProfile || null;
  }

  function ensureInteractionStyles() {
    if (document.querySelector('link[data-bloomly-interactions-ui]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "/public/interactions-ui.css?v=20260805a";
    link.setAttribute("data-bloomly-interactions-ui", "true");
    document.head.appendChild(link);
  }

  function ensurePanel(postEl, postId) {
    let panel = postEl.querySelector("[data-post-interactions]");
    if (panel) return panel;

    panel = document.createElement("section");
    panel.className = "section post-interactions-section";
    panel.setAttribute("data-post-interactions", "true");
    panel.setAttribute("data-post-id", postId);
    panel.innerHTML = `
      <div class="container">
        <div class="post-interactions-card">
          <div class="post-like-row">
            <button type="button" class="like-button" data-like-button aria-pressed="false">
              <span class="like-heart" aria-hidden="true">${HEART_SVG}</span>
              <span class="like-text">Like</span>
            </button>
            <span class="like-count" data-like-count>0 likes</span>
            <p class="post-auth-hint" data-auth-hint hidden></p>
          </div>
          <div class="comment-section">
            <div class="comment-section-heading">
              <h3 class="comment-section-title">Comments</h3>
              <span class="comment-count-badge" data-comment-count>0</span>
            </div>
            <p class="comment-login-hint" data-comment-login-hint hidden>
              <a data-comment-login-link href="/login/">Log in</a> to leave a comment.
            </p>
            <form class="comment-form" data-comment-form>
              <div class="comment-author-chip" data-comment-as hidden>
                <span class="bloomly-avatar bloomly-avatar--initials comment-author-chip-avatar" data-comment-as-avatar>B</span>
                <span class="comment-author-chip-name" data-comment-as-name></span>
              </div>
              <label>
                <span>Comment</span>
                <textarea name="comment" rows="3" maxlength="4000" required placeholder="Share a kind thought…"></textarea>
              </label>
              <button type="submit" class="btn btn-primary comment-submit-btn" data-comment-submit>
                <span data-comment-submit-label>Post comment</span>
              </button>
              <p class="comment-message" data-comment-message></p>
            </form>
            <div class="comment-list" data-comment-list></div>
          </div>
        </div>
      </div>
    `;

    const share = postEl.querySelector(".post-share-section");
    if (share) share.insertAdjacentElement("afterend", panel);
    else postEl.appendChild(panel);
    return panel;
  }

  function formatTimestamp(isoString) {
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "Just now";
    return date.toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function popElement(el) {
    if (!el) return;
    el.classList.remove("is-popping");
    // Force reflow so repeated clicks re-trigger the animation.
    void el.offsetWidth;
    el.classList.add("is-popping");
    window.setTimeout(() => el.classList.remove("is-popping"), 240);
  }

  function setCommentCount(badge, count) {
    if (!badge) return;
    badge.textContent = String(count);
    badge.setAttribute("aria-label", `${count} comment${count === 1 ? "" : "s"}`);
  }

  function renderEmptyState(listEl) {
    listEl.innerHTML = `
      <div class="comment-empty-card comment-empty">
        <span class="comment-empty-icon" aria-hidden="true">💬</span>
        <p>No comments yet — be the first to share a kind thought</p>
      </div>
    `;
  }

  async function loadProfilesByIds(client, ids) {
    const unique = Array.from(new Set((ids || []).filter(Boolean)));
    const map = {};
    if (!unique.length) return map;
    const { data } = await client
      .from("public_profiles")
      .select("id, username, avatar_url, display_name")
      .in("id", unique);
    (data || []).forEach((row) => {
      map[row.id] = row;
    });
    return map;
  }

  function renderComments(listEl, comments, profileMap, countBadge) {
    const h = helpers();
    setCommentCount(countBadge, comments.length);
    listEl.innerHTML = "";
    if (!comments.length) {
      renderEmptyState(listEl);
      return;
    }
    comments.forEach((comment) => {
      const profile = comment.user_id ? profileMap[comment.user_id] : null;
      const author =
        (profile && h && !h.isDefaultUsername(profile.username) && profile.username) ||
        profile?.display_name ||
        comment.nick ||
        "Member";
      const avatarUrl = profile?.avatar_url || null;
      const initial = h ? h.initials(author) : author.charAt(0).toUpperCase();

      const item = document.createElement("div");
      item.className = "comment-item";
      item.innerHTML = `
        <span class="comment-avatar bloomly-avatar ${avatarUrl ? "" : "bloomly-avatar--initials"}">
          ${
            avatarUrl
              ? `<img class="bloomly-avatar-img" src="${escapeHtml(avatarUrl)}" alt="" loading="lazy" />`
              : escapeHtml(initial)
          }
        </span>
        <div class="comment-content">
          <div class="comment-meta">
            <strong class="comment-author">${escapeHtml(author)}</strong>
            <span class="comment-time">${formatTimestamp(comment.timestamp || comment.created_at)}</span>
          </div>
          <p class="comment-text"></p>
        </div>
      `;
      item.querySelector(".comment-text").textContent = comment.text || "";
      listEl.appendChild(item);
    });
  }

  function fillAuthorChip(chip, avatarEl, nameEl, profile, user) {
    const h = helpers();
    if (!chip || !h) return;
    const name = h.displayName(profile, user);
    chip.hidden = false;
    if (nameEl) nameEl.textContent = "@" + name;
    if (avatarEl) {
      h.renderAvatarElement(avatarEl, {
        username: profile?.username,
        avatarUrl: profile?.avatar_url,
        name,
      });
    }
  }

  async function initPost(postEl, auth) {
    const postId = (postEl.getAttribute("data-post-id") || "").trim();
    if (!postId) return;

    const panel = ensurePanel(postEl, postId);
    const client = await auth.getClient();
    const state = auth.getState();
    const h = helpers();
    const likeButton = panel.querySelector("[data-like-button]");
    const likeCountEl = panel.querySelector("[data-like-count]");
    const authHint = panel.querySelector("[data-auth-hint]");
    const form = panel.querySelector("[data-comment-form]");
    const list = panel.querySelector("[data-comment-list]");
    const messageEl = panel.querySelector("[data-comment-message]");
    const loginHint = panel.querySelector("[data-comment-login-hint]");
    const loginLink = panel.querySelector("[data-comment-login-link]");
    const commentAs = panel.querySelector("[data-comment-as]");
    const commentAsAvatar = panel.querySelector("[data-comment-as-avatar]");
    const commentAsName = panel.querySelector("[data-comment-as-name]");
    const countBadge = panel.querySelector("[data-comment-count]");
    const submitBtn = panel.querySelector("[data-comment-submit]");
    const submitLabel = panel.querySelector("[data-comment-submit-label]");

    if (loginLink) loginLink.href = auth.loginUrl();

    const { data: likeRow } = await client
      .from("likes")
      .select("count")
      .eq("post_id", postId)
      .maybeSingle();
    let likeCount = typeof likeRow?.count === "number" ? likeRow.count : 0;

    let liked = false;
    if (state.user) {
      const { data: mine } = await client
        .from("user_post_likes")
        .select("post_id")
        .eq("post_id", postId)
        .eq("user_id", state.user.id)
        .maybeSingle();
      liked = Boolean(mine);

      const needsSetup = h && h.needsProfileSetup(state.profile);
      if (needsSetup) {
        form.hidden = true;
        if (loginHint) {
          loginHint.hidden = false;
          loginHint.innerHTML = `<a href="${h.setupUrl()}">Finish your profile</a> to leave a comment.`;
        }
        if (authHint) {
          authHint.hidden = false;
          authHint.innerHTML = `<a href="${h.setupUrl()}">Finish your profile</a> to like this post.`;
        }
      } else {
        form.hidden = false;
        if (loginHint) loginHint.hidden = true;
        if (authHint) authHint.hidden = true;
        fillAuthorChip(commentAs, commentAsAvatar, commentAsName, state.profile, state.user);
      }
    } else {
      form.hidden = true;
      if (loginHint) loginHint.hidden = false;
      if (authHint) {
        authHint.hidden = false;
        authHint.innerHTML = `<a href="${auth.loginUrl()}">Log in</a> to like this post.`;
      }
    }

    const updateLikeUI = (animate) => {
      likeCountEl.textContent = `${likeCount} like${likeCount === 1 ? "" : "s"}`;
      likeButton.classList.toggle("liked", liked);
      likeButton.setAttribute("aria-pressed", liked ? "true" : "false");
      likeButton.querySelector(".like-text").textContent = liked ? "Liked" : "Like";
      if (animate) {
        popElement(likeButton);
        popElement(likeCountEl);
      }
    };
    updateLikeUI(false);

    likeButton.addEventListener("click", async () => {
      const authed = await auth.requireUser({
        message: "Log in to like this post.",
      });
      if (!authed?.user) return;

      likeButton.disabled = true;
      try {
        if (liked) {
          await client
            .from("user_post_likes")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", authed.user.id);
          liked = false;
          likeCount = Math.max(0, likeCount - 1);
        } else {
          await client.from("user_post_likes").insert({
            post_id: postId,
            user_id: authed.user.id,
          });
          liked = true;
          likeCount += 1;
        }
        await client.from("likes").upsert(
          { post_id: postId, count: likeCount },
          { onConflict: "post_id" }
        );
        updateLikeUI(true);
      } catch (err) {
        console.warn("Like failed", err);
        alert("Could not update like. Please try again.");
      } finally {
        likeButton.disabled = false;
      }
    });

    const { data: comments } = await client
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("timestamp", { ascending: false });
    let commentRows = comments || [];
    const profileMap = await loadProfilesByIds(
      client,
      commentRows.map((c) => c.user_id)
    );
    renderComments(list, commentRows, profileMap, countBadge);

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const authed = await auth.requireUser({
        message: "Log in to leave a comment.",
      });
      if (!authed?.user) return;

      const nickname =
        (h && h.displayName(authed.profile, authed.user)) ||
        authed.profile?.display_name ||
        "Member";
      const text = (form.querySelector('textarea[name="comment"]')?.value || "").trim();
      if (!text) {
        messageEl.textContent = "Please write a comment before submitting.";
        messageEl.className = "comment-message is-error";
        return;
      }

      submitBtn.disabled = true;
      submitBtn.classList.add("is-loading");
      submitBtn.classList.remove("is-success");
      if (submitLabel) submitLabel.textContent = "Posting…";
      messageEl.textContent = "";
      messageEl.className = "comment-message";

      const { data: saved, error } = await client
        .from("comments")
        .insert({
          post_id: postId,
          nick: nickname,
          text,
          user_id: authed.user.id,
        })
        .select("*")
        .single();

      submitBtn.classList.remove("is-loading");

      if (error || !saved) {
        submitBtn.disabled = false;
        if (submitLabel) submitLabel.textContent = "Post comment";
        messageEl.textContent = "Unable to save comment. Please try again.";
        messageEl.className = "comment-message is-error";
        return;
      }

      commentRows = [saved].concat(commentRows);
      profileMap[authed.user.id] = {
        id: authed.user.id,
        username: authed.profile?.username,
        avatar_url: authed.profile?.avatar_url,
        display_name: authed.profile?.display_name,
      };
      renderComments(list, commentRows, profileMap, countBadge);
      form.querySelector('textarea[name="comment"]').value = "";
      messageEl.textContent = "Thanks! Your comment is now public.";
      messageEl.className = "comment-message is-success";
      submitBtn.classList.add("is-success");
      if (submitLabel) submitLabel.textContent = "Posted";
      window.setTimeout(() => {
        submitBtn.classList.remove("is-success");
        submitBtn.disabled = false;
        if (submitLabel) submitLabel.textContent = "Post comment";
      }, 1200);
    });
  }

  async function init() {
    ensureInteractionStyles();
    if (!window.BloomlyProfile) {
      await new Promise((resolve, reject) => {
        const el = document.createElement("script");
        el.src = "/public/profile-helpers.js?v=20260804c";
        el.onload = resolve;
        el.onerror = reject;
        document.head.appendChild(el);
      }).catch(() => null);
    }
    const auth = await waitForAuth();
    if (!auth) return;
    const posts = Array.from(document.querySelectorAll(".post[data-post-id]"));
    for (const postEl of posts) {
      await initPost(postEl, auth);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
