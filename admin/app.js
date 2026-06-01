(function () {
    'use strict';

    const TOKEN_KEY = 'github_token';
    const VIEWS = ['dashboard', 'blog', 'bookings', 'subscribers', 'counsellors', 'settings'];

    function getToken() {
        return sessionStorage.getItem(TOKEN_KEY) || '';
    }

    function requireAuth() {
        if (!getToken()) {
            window.location.replace('/admin/login/');
            return false;
        }
        return true;
    }

    function showAdminError(message) {
        let banner = document.getElementById('adminErrorBanner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'adminErrorBanner';
            banner.className = 'admin-error-banner';
            banner.setAttribute('role', 'alert');
            const main = document.querySelector('.admin-main');
            if (main) main.prepend(banner);
        }
        banner.textContent = message;
        banner.hidden = !message;
    }

    function getAdminApiUrls(path) {
        const [pathname, query] = path.split('?');
        const suffix = query ? `?${query}` : '';
        const urls = [`${pathname}${suffix}`];

        const routes =
            (typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.adminRoutes) || {};
        const fnName = routes[pathname];
        if (fnName && typeof SUPABASE_CONFIG !== 'undefined' && SUPABASE_CONFIG.functionsBase) {
            urls.push(`${SUPABASE_CONFIG.functionsBase}/${fnName}${suffix}`);
        }
        return urls.filter((url, index, list) => url && list.indexOf(url) === index);
    }

    async function api(path, options = {}) {
        const token = getToken();
        const anonKey =
            typeof SUPABASE_CONFIG !== 'undefined' ? SUPABASE_CONFIG.anonKey : '';
        const urls = getAdminApiUrls(path);
        let lastError = null;

        for (const url of urls) {
            const isSupabase = url.includes('supabase.co');
            try {
                const res = await fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                        ...(isSupabase && anonKey ? { apikey: anonKey } : {}),
                        ...(options.headers || {}),
                    },
                });
                const text = await res.text();
                let data = {};
                if (text) {
                    try {
                        data = JSON.parse(text);
                    } catch {
                        lastError = new Error(`Invalid JSON from ${url}`);
                        continue;
                    }
                } else if (!res.ok) {
                    lastError = new Error(`Empty response (${res.status}) from ${url}`);
                    continue;
                }

                if (data.code === 'NOT_FOUND' || data.message?.includes('function was not found')) {
                    lastError = new Error('Supabase admin functions not deployed yet.');
                    continue;
                }

                if (res.status === 401 || res.status === 403) {
                    sessionStorage.removeItem(TOKEN_KEY);
                    window.location.replace('/admin/login/?error=AccessDenied');
                    throw new Error(data.error || 'Unauthorized');
                }

                if (!res.ok) {
                    lastError = new Error(data.error || `Request failed (${res.status})`);
                    continue;
                }

                showAdminError('');
                return data;
            } catch (error) {
                lastError = error;
            }
        }

        throw lastError || new Error('Failed to fetch admin data. Deploy Supabase functions or set Cloudflare SUPABASE_* env vars.');
    }

    function setView(view) {
        VIEWS.forEach((v) => {
            const panel = document.querySelector(`[data-view-panel="${v}"]`);
            if (panel) panel.hidden = v !== view;
        });
        document.querySelectorAll('[data-admin-nav]').forEach((btn) => {
            btn.classList.toggle('is-active', btn.dataset.adminNav === view);
        });
        location.hash = view;
    }

    function slugify(title) {
        return String(title || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-');
    }

    function escapeCsv(value) {
        const s = String(value ?? '');
        return `"${s.replace(/"/g, '""')}"`;
    }

    function downloadCsv(filename, rows) {
        const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        a.click();
        URL.revokeObjectURL(a.href);
    }

    async function loadDashboard() {
        try {
            await loadDashboardInner();
        } catch (error) {
            console.error('Dashboard load failed:', error);
            showAdminError(error.message || 'Could not load dashboard data.');
        }
    }

    async function loadDashboardInner() {
        const data = await api('/api/admin/stats');
        document.getElementById('statPosts').textContent = data.counts.posts;
        document.getElementById('statSubscribers').textContent = data.counts.subscribers;
        document.getElementById('statBookings').textContent = data.counts.bookings;
        document.getElementById('statCounsellors').textContent = data.counts.counsellorApplicationsPending;

        const bookingsBody = document.querySelector('#recentBookingsTable tbody');
        bookingsBody.innerHTML = (data.recentBookings || [])
            .map(
                (b) => `<tr>
            <td>${b.name || '—'}</td>
            <td>${b.plan || '—'}</td>
            <td>KSh ${b.amount || 0}</td>
            <td>${b.payment_status || '—'}</td>
        </tr>`
            )
            .join('') || '<tr><td colspan="4">No bookings yet</td></tr>';

        const subsBody = document.querySelector('#recentSubscribersTable tbody');
        const recentSubs = Array.isArray(data.recentSubscribers) ? data.recentSubscribers : [];
        subsBody.innerHTML = recentSubs.length
            ? recentSubs
                  .map((s) => {
                      const dateVal = s.subscribed_at || s.created_at;
                      const dateLabel = dateVal
                          ? new Date(dateVal).toLocaleDateString()
                          : '—';
                      return `<tr>
            <td>${s.name || '—'}</td>
            <td>${s.email || '—'}</td>
            <td>${dateLabel}</td>
        </tr>`;
                  })
                  .join('')
            : '<tr><td colspan="3">No subscribers yet</td></tr>';
    }

    function isPostPublished(post) {
        if (post.published === true) return true;
        if (post.published === false) return false;
        return String(post.status || '').toLowerCase() === 'published';
    }

    function formatPostDate(post) {
        const raw = post.created_at || post.updated_at || post.metadata?.date;
        if (!raw) return '—';
        const d = new Date(raw);
        return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString();
    }

    async function loadGithubManifestPosts() {
        try {
            const res = await fetch('/content/blog/manifest.json', { cache: 'default' });
            if (!res.ok) return [];
            const manifest = await res.json();
            if (!Array.isArray(manifest)) return [];
            return manifest
                .filter((entry) => entry?.slug && entry?.metadata?.title)
                .map((entry) => ({
                    id: `github:${entry.slug}`,
                    slug: entry.slug,
                    title: entry.metadata.title,
                    category: entry.metadata.category || 'Mental Health',
                    emoji: entry.metadata.emoji || '💜',
                    created_at: entry.metadata.date,
                    published: entry.metadata.published !== false,
                    status: entry.metadata.published !== false ? 'published' : 'draft',
                    source: 'github',
                    summary: entry.metadata.summary || '',
                }));
        } catch (error) {
            console.warn('Could not load GitHub manifest:', error);
            return [];
        }
    }

    function mergeAdminPosts(supabasePosts, githubPosts) {
        const merged = new Map();
        githubPosts.forEach((post) => {
            merged.set(post.slug, post);
        });
        (supabasePosts || []).forEach((post) => {
            const slug = post.slug;
            if (!slug) return;
            const hadGithub = merged.has(slug);
            merged.set(slug, {
                ...merged.get(slug),
                ...post,
                source: hadGithub ? 'both' : 'supabase',
            });
        });
        return Array.from(merged.values()).sort((a, b) => {
            const dateA = new Date(a.created_at || 0).getTime();
            const dateB = new Date(b.created_at || 0).getTime();
            return dateB - dateA;
        });
    }

    async function loadPosts() {
        try {
            await loadPostsInner();
        } catch (error) {
            console.error('Posts load failed:', error);
            showAdminError(error.message || 'Could not load blog posts.');
            const tbody = document.querySelector('#postsTable tbody');
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6">Could not load posts. Check Cloudflare env vars (SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY).</td></tr>';
            }
        }
    }

    async function loadPostsInner() {
        const [{ posts: supabasePosts }, githubPosts] = await Promise.all([
            api('/api/admin/posts'),
            loadGithubManifestPosts(),
        ]);
        const posts = mergeAdminPosts(supabasePosts, githubPosts);
        const tbody = document.querySelector('#postsTable tbody');
        const hint = document.getElementById('blogPostsHint');
        if (hint) {
            hint.textContent = `${posts.length} post(s): ${supabasePosts?.length || 0} in Supabase, ${githubPosts.length} on GitHub (content/blog).`;
        }
        if (!posts.length) {
            tbody.innerHTML =
                '<tr><td colspan="6">No posts found. Click Import from GitHub or New Post.</td></tr>';
            return;
        }
        tbody.innerHTML = posts
            .map((p) => {
                const status = isPostPublished(p) ? 'Published' : 'Draft';
                const source =
                    p.source === 'github'
                        ? 'GitHub'
                        : p.source === 'both'
                          ? 'Both'
                          : 'Supabase';
                const editId = String(p.id).replace(/"/g, '&quot;');
                const canDelete = p.source === 'supabase' && !String(p.id).startsWith('github:');
                return `<tr>
            <td>${p.title}</td>
            <td>${p.category || '—'}</td>
            <td>${formatPostDate(p)}</td>
            <td>${status}</td>
            <td>${source}</td>
            <td class="admin-table-actions">
                <button type="button" class="admin-btn-sm" data-edit-post="${editId}">Edit</button>
                ${canDelete ? `<button type="button" class="admin-btn-sm" data-delete-post="${p.id}">Delete</button>` : ''}
            </td>
        </tr>`;
            })
            .join('');
        tbody.querySelectorAll('[data-edit-post]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const post = posts.find((p) => String(p.id) === btn.dataset.editPost);
                openPostEditor(post);
            });
        });
        tbody.querySelectorAll('[data-delete-post]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                if (!confirm('Delete this post from Supabase?')) return;
                await api(`/api/admin/posts?id=${btn.dataset.deletePost}`, { method: 'DELETE' });
                loadPosts();
            });
        });
    }

    async function syncGithubPostsToSupabase() {
        const btn = document.getElementById('syncGithubPostsBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Importing…';
        }
        try {
            const result = await api('/api/admin/sync-github-posts', { method: 'POST', body: '{}' });
            showAdminError('');
            alert(
                `Imported ${result.synced} of ${result.total} post(s) from GitHub into Supabase.` +
                    (result.errors?.length ? `\n\nSome issues:\n${result.errors.slice(0, 5).join('\n')}` : '')
            );
            loadPosts();
            loadDashboard();
        } catch (error) {
            showAdminError(error.message || 'Import failed.');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Import from GitHub';
            }
        }
    }

    async function openPostEditor(post) {
        const panel = document.getElementById('postSlideover');
        panel.classList.add('is-open');
        const isGithubOnly = post?.source === 'github' || String(post?.id || '').startsWith('github:');
        document.getElementById('postId').value = isGithubOnly ? '' : post?.id || '';
        document.getElementById('postTitle').value = post?.title || '';
        document.getElementById('postSlug').value = post?.slug || '';
        document.getElementById('postCategory').value = post?.category || 'Mental Health';
        document.getElementById('postEmoji').value = post?.emoji || '💜';
        document.getElementById('postPublished').checked = isPostPublished(post);

        let content = post?.content || '';
        if (!content && post?.slug) {
            try {
                const res = await fetch(`/content/blog/${post.slug}.md`);
                if (res.ok) {
                    const raw = await res.text();
                    const match = raw.match(/^---\s*\n[\s\S]*?\n---\s*\n([\s\S]*)$/);
                    content = match ? match[1].trim() : raw;
                }
            } catch (e) {
                console.warn('Could not load markdown for', post.slug);
            }
        }
        document.getElementById('postContent').value = content;
    }

    function closePostEditor() {
        document.getElementById('postSlideover').classList.remove('is-open');
    }

    async function savePost(event) {
        event.preventDefault();
        const id = document.getElementById('postId').value;
        const title = document.getElementById('postTitle').value.trim();
        const slug = document.getElementById('postSlug').value.trim() || slugify(title);
        const body = {
            title,
            slug,
            category: document.getElementById('postCategory').value,
            emoji: document.getElementById('postEmoji').value,
            content: document.getElementById('postContent').value,
            excerpt: document.getElementById('postContent').value.slice(0, 200),
            published: document.getElementById('postPublished').checked,
        };
        if (id) {
            await api('/api/admin/posts', { method: 'PATCH', body: JSON.stringify({ id: Number(id), ...body }) });
        } else {
            await api('/api/admin/posts', { method: 'POST', body: JSON.stringify(body) });
        }
        closePostEditor();
        loadPosts();
    }

    async function loadBookings(filter) {
        const q = filter && filter !== 'all' ? `?status=${encodeURIComponent(filter)}` : '';
        const { bookings } = await api(`/api/admin/bookings${q}`);
        const tbody = document.querySelector('#bookingsTable tbody');
        tbody.innerHTML = bookings
            .map(
                (b) => `<tr>
            <td>${b.name || '—'}</td>
            <td>${b.email || '—'}</td>
            <td>${b.phone || '—'}</td>
            <td>${b.plan || '—'}</td>
            <td>KSh ${b.amount || 0}</td>
            <td>${b.payment_status}</td>
            <td>${new Date(b.booked_at).toLocaleString()}</td>
            <td>${b.payment_status !== 'confirmed' ? `<button type="button" class="admin-btn-sm" data-confirm-booking="${b.id}">Confirm</button>` : '—'}</td>
        </tr>`
            )
            .join('');
        tbody.querySelectorAll('[data-confirm-booking]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                await api('/api/admin/bookings', {
                    method: 'PATCH',
                    body: JSON.stringify({ id: btn.dataset.confirmBooking, payment_status: 'confirmed' }),
                });
                loadBookings(document.getElementById('bookingFilter').value);
            });
        });
        document.getElementById('exportBookingsBtn').onclick = () => {
            const header = 'Name,Email,Phone,Plan,Amount,Status,Date';
            const rows = bookings.map((b) =>
                [b.name, b.email, b.phone, b.plan, b.amount, b.payment_status, b.booked_at].map(escapeCsv).join(',')
            );
            downloadCsv('charla-bookings.csv', [header, ...rows]);
        };
    }

    async function loadSubscribers() {
        try {
            const { subscribers } = await api('/api/admin/subscribers');
            const list = Array.isArray(subscribers) ? subscribers : [];
            const tbody = document.querySelector('#subscribersTable tbody');
            if (!list.length) {
                tbody.innerHTML = '<tr><td colspan="4">No subscribers in Supabase yet.</td></tr>';
                return;
            }
            tbody.innerHTML = list
                .map((s) => {
                    const dateVal = s.subscribed_at || s.created_at;
                    const dateLabel = dateVal ? new Date(dateVal).toLocaleDateString() : '—';
                    return `<tr>
            <td>${s.name || '—'}</td>
            <td>${s.email || '—'}</td>
            <td>${dateLabel}</td>
            <td><button type="button" class="admin-btn-sm" data-delete-sub="${s.id}">Delete</button></td>
        </tr>`;
                })
                .join('');
            tbody.querySelectorAll('[data-delete-sub]').forEach((btn) => {
                btn.addEventListener('click', async () => {
                    if (!confirm('Remove subscriber?')) return;
                    await api(`/api/admin/subscribers?id=${btn.dataset.deleteSub}`, { method: 'DELETE' });
                    loadSubscribers();
                    loadDashboard();
                });
            });
            document.getElementById('exportSubsBtn').onclick = () => {
                const header = 'Name,Email,Date';
                const rows = list.map((s) =>
                    [s.name, s.email, s.subscribed_at || s.created_at].map(escapeCsv).join(',')
                );
                downloadCsv('subscribers.csv', [header, ...rows]);
            };
        } catch (error) {
            console.error('Subscribers load failed:', error);
            showAdminError(error.message || 'Could not load subscribers.');
            const tbody = document.querySelector('#subscribersTable tbody');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="4">${error.message || 'Could not load subscribers.'}</td></tr>`;
            }
        }
    }

    async function loadCounsellors() {
        const { applications } = await api('/api/admin/counsellor-applications');
        const tbody = document.querySelector('#counsellorsTable tbody');
        tbody.innerHTML = applications
            .map(
                (a) => `<tr>
            <td>${a.full_name || '—'}</td>
            <td>${a.email || '—'}</td>
            <td>${a.qualification || '—'}</td>
            <td>${new Date(a.applied_at).toLocaleDateString()}</td>
            <td class="admin-table-actions">
                <button type="button" class="admin-btn-sm" data-view-app='${encodeURIComponent(JSON.stringify(a))}'>View</button>
                <button type="button" class="admin-btn-sm" data-approve-app="${a.id}">Approve</button>
                <button type="button" class="admin-btn-sm" data-reject-app="${a.id}">Reject</button>
            </td>
        </tr>`
            )
            .join('');
        tbody.querySelectorAll('[data-view-app]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const app = JSON.parse(decodeURIComponent(btn.dataset.viewApp));
                alert(
                    `Name: ${app.full_name}\nEmail: ${app.email}\nPhone: ${app.phone}\nQualification: ${app.qualification}\nInstitution: ${app.institution}\nExperience: ${app.years_experience}\nAvailability: ${app.availability}\nWhy Bloomly: ${app.why_bloomly}`
                );
            });
        });
        tbody.querySelectorAll('[data-approve-app]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                await api('/api/admin/counsellor-applications', {
                    method: 'PATCH',
                    body: JSON.stringify({ id: btn.dataset.approveApp, status: 'approved' }),
                });
                loadCounsellors();
            });
        });
        tbody.querySelectorAll('[data-reject-app]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                await api('/api/admin/counsellor-applications', {
                    method: 'PATCH',
                    body: JSON.stringify({ id: btn.dataset.rejectApp, status: 'rejected' }),
                });
                loadCounsellors();
            });
        });
    }

    function init() {
        if (!requireAuth()) return;

        document.getElementById('logoutBtn').addEventListener('click', () => {
            sessionStorage.removeItem(TOKEN_KEY);
            window.location.replace('/admin/login/');
        });

        document.querySelectorAll('[data-admin-nav]').forEach((btn) => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.adminNav;
                setView(view);
                if (view === 'dashboard') loadDashboard();
                if (view === 'blog') loadPosts();
                if (view === 'bookings') loadBookings(document.getElementById('bookingFilter').value);
                if (view === 'subscribers') loadSubscribers();
                if (view === 'counsellors') loadCounsellors();
            });
        });

        document.getElementById('newPostBtn').addEventListener('click', () => {
            void openPostEditor(null);
        });
        const syncBtn = document.getElementById('syncGithubPostsBtn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => {
                void syncGithubPostsToSupabase();
            });
        }
        document.getElementById('postForm').addEventListener('submit', savePost);
        document.getElementById('closePostEditor').addEventListener('click', closePostEditor);
        document.getElementById('postTitle').addEventListener('input', (e) => {
            const slugEl = document.getElementById('postSlug');
            if (!slugEl.dataset.touched) slugEl.value = slugify(e.target.value);
        });
        document.getElementById('postSlug').addEventListener('input', () => {
            document.getElementById('postSlug').dataset.touched = 'true';
        });

        document.getElementById('bookingFilter').addEventListener('change', (e) => loadBookings(e.target.value));

        const hash = (location.hash || '#dashboard').replace('#', '');
        setView(VIEWS.includes(hash) ? hash : 'dashboard');
        loadDashboard();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
