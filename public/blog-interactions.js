/**
 * Authenticated likes + comments for static blog posts.
 * Requires window.BloomlyAuth from /public/auth-nav.js.
 */
(function () {
  "use strict";

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
            <button type="button" class="btn btn-secondary like-button" data-like-button aria-pressed="false">
              <span class="like-text">Like</span>
            </button>
            <span class="like-count" data-like-count>0 likes</span>
            <p class="post-auth-hint" data-auth-hint hidden></p>
          </div>
          <div class="comment-section">
            <h3>Comments</h3>
            <p class="comment-login-hint" data-comment-login-hint hidden>
              <a data-comment-login-link href="/login/">Log in</a> to leave a comment.
            </p>
            <form class="comment-form" data-comment-form>
              <p class="comment-as" data-comment-as hidden></p>
              <label>
                <span>Comment</span>
                <textarea name="comment" rows="3" maxlength="4000" required placeholder="Share a kind thought…"></textarea>
              </label>
              <button type="submit" class="btn btn-primary">Post comment</button>
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

  function renderComments(listEl, comments, profileMap) {
    const h = helpers();
    listEl.innerHTML = "";
    if (!comments.length) {
      const empty = document.createElement("p");
      empty.className = "comment-empty";
      empty.textContent = "No comments yet. Be the first to share.";
      listEl.appendChild(empty);
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
        if (commentAs) {
          commentAs.hidden = false;
          commentAs.textContent = "Commenting as @" + h.displayName(state.profile, state.user);
        }
      }
    } else {
      form.hidden = true;
      if (loginHint) loginHint.hidden = false;
      if (authHint) {
        authHint.hidden = false;
        authHint.innerHTML = `<a href="${auth.loginUrl()}">Log in</a> to like this post.`;
      }
    }

    const updateLikeUI = () => {
      likeCountEl.textContent = `${likeCount} like${likeCount === 1 ? "" : "s"}`;
      likeButton.classList.toggle("liked", liked);
      likeButton.setAttribute("aria-pressed", liked ? "true" : "false");
      likeButton.querySelector(".like-text").textContent = liked ? "Liked" : "Like";
    };
    updateLikeUI();

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
        updateLikeUI();
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
    const commentRows = comments || [];
    const profileMap = await loadProfilesByIds(
      client,
      commentRows.map((c) => c.user_id)
    );
    renderComments(list, commentRows, profileMap);

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

      if (error || !saved) {
        messageEl.textContent = "Unable to save comment. Please try again.";
        messageEl.className = "comment-message is-error";
        return;
      }

      const next = [saved].concat(commentRows);
      profileMap[authed.user.id] = {
        id: authed.user.id,
        username: authed.profile?.username,
        avatar_url: authed.profile?.avatar_url,
        display_name: authed.profile?.display_name,
      };
      renderComments(list, next, profileMap);
      form.querySelector('textarea[name="comment"]').value = "";
      messageEl.textContent = "Thanks! Your comment is now public.";
      messageEl.className = "comment-message is-success";
    });
  }

  async function init() {
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
