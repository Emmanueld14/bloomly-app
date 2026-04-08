/**
 * Bloomly Admin Dashboard
 * Modular role-based admin workspace for blogs, Charla records, reports, and permissions.
 */
(function() {
    'use strict';

    const githubConfig =
        typeof GITHUB_CONFIG !== 'undefined' ? GITHUB_CONFIG : (window.GITHUB_CONFIG || {});
    const dashboardConfig =
        typeof ADMIN_DASHBOARD_CONFIG !== 'undefined' ? ADMIN_DASHBOARD_CONFIG : (window.ADMIN_DASHBOARD_CONFIG || {});
    const apiBase = githubConfig.apiBase || 'https://api.github.com';
    const repoOwner = githubConfig.repoOwner || 'Emmanueld14';
    const repoName = githubConfig.repoName || 'bloomly-app';
    const repoBranch = githubConfig.repoBranch || 'main';

    const ROLE_TEMPLATES = {
        admin: {
            label: 'Admin',
            permissions: {
                dashboard: true,
                blogAccess: true,
                blogReview: true,
                blogPublish: true,
                sessionRecords: true,
                reportsSubmit: true,
                reportsReview: true,
                userPermissions: true
            }
        },
        blog_contributor: {
            label: 'Blog contributor',
            permissions: {
                dashboard: true,
                blogAccess: true,
                blogReview: false,
                blogPublish: false,
                sessionRecords: false,
                reportsSubmit: false,
                reportsReview: false,
                userPermissions: false
            }
        },
        facilitator: {
            label: 'Session facilitator',
            permissions: {
                dashboard: true,
                blogAccess: false,
                blogReview: false,
                blogPublish: false,
                sessionRecords: true,
                reportsSubmit: true,
                reportsReview: false,
                userPermissions: false
            }
        },
        hybrid: {
            label: 'Hybrid employee',
            permissions: {
                dashboard: true,
                blogAccess: true,
                blogReview: false,
                blogPublish: false,
                sessionRecords: true,
                reportsSubmit: true,
                reportsReview: false,
                userPermissions: false
            }
        }
    };

    const PERMISSION_LABELS = {
        dashboard: 'Dashboard',
        blogAccess: 'Blog access',
        blogReview: 'Review drafts',
        blogPublish: 'Publish blogs',
        sessionRecords: 'Charla records',
        reportsSubmit: 'Submit reports',
        reportsReview: 'Review reports',
        userPermissions: 'Manage permissions'
    };

    const VIEW_META = {
        dashboard: {
            title: 'Dashboard',
            subtitle: 'Overview metrics and quick access tools.'
        },
        blogs: {
            title: 'Blog Management',
            subtitle: 'Draft workflow, approvals, and publishing controls.'
        },
        sessions: {
            title: 'Charla Records & Payments',
            subtitle: 'Track sessions, payment status, facilitators, and reporting filters.'
        },
        reports: {
            title: 'Employee Reports & Activity',
            subtitle: 'Capture session outcomes and maintain accountability logs.'
        },
        permissions: {
            title: 'User Permissions',
            subtitle: 'Authorize accounts and control access by role and module.'
        }
    };

    const REPO_FILES = {
        permissions: dashboardConfig.permissionsFilePath || 'content/admin/permissions.json',
        drafts: dashboardConfig.draftsFilePath || 'content/admin/blog-drafts.json',
        reports: dashboardConfig.reportsFilePath || 'content/admin/session-reports.json',
        activity: dashboardConfig.activityFilePath || 'content/admin/activity-log.json'
    };

    const DEFAULT_ADMIN_LOGINS = (dashboardConfig.defaultAdminLogins || ['Emmanueld14']).map((value) =>
        String(value || '').trim().toLowerCase()
    );

    const state = {
        githubToken: null,
        githubUser: null,
        docs: {
            permissions: { path: REPO_FILES.permissions, data: null, sha: null },
            drafts: { path: REPO_FILES.drafts, data: null, sha: null },
            reports: { path: REPO_FILES.reports, data: null, sha: null },
            activity: { path: REPO_FILES.activity, data: null, sha: null }
        },
        currentAccount: null,
        currentView: 'dashboard',
        publishedPosts: [],
        sessionRecords: [],
        sessionRows: [],
        mobileNavOpen: false,
        draftModalOpen: false
    };

    const els = {};

    function byId(id) {
        return document.getElementById(id);
    }

    function normalizeLogin(value) {
        return String(value || '').trim().toLowerCase();
    }

    function normalizeEmail(value) {
        return String(value || '').trim().toLowerCase();
    }

    function rolePermissions(role) {
        const template = ROLE_TEMPLATES[role] || ROLE_TEMPLATES.blog_contributor;
        return { ...template.permissions };
    }

    function encodePath(path) {
        return String(path)
            .split('/')
            .map((part) => encodeURIComponent(part))
            .join('/');
    }

    function encodeBase64Unicode(value) {
        return btoa(unescape(encodeURIComponent(String(value))));
    }

    function decodeBase64Unicode(value) {
        return decodeURIComponent(escape(atob(String(value))));
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function formatDateTime(value) {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function formatDate(value) {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '—';
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function formatAmount(cents, currency) {
        const amount = Number(cents || 0) / 100;
        const safeCurrency = String(currency || 'KES').toUpperCase();
        return `${safeCurrency} ${amount.toFixed(2)}`;
    }

    function toInputDateTime(value) {
        const date = value ? new Date(value) : new Date();
        if (Number.isNaN(date.getTime())) return '';
        const local = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
        return local.toISOString().slice(0, 16);
    }

    function slugify(text) {
        return String(text || '')
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    function makeId(prefix) {
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return `${prefix}-${crypto.randomUUID()}`;
        }
        return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    }

    function statusChip(status) {
        const normalized = String(status || '').toLowerCase().replace(/\s+/g, '_');
        const label = normalized ? normalized.replace(/_/g, ' ') : 'unknown';
        return `<span class="status-chip ${escapeHtml(normalized)}">${escapeHtml(label)}</span>`;
    }

    function isOwnRecord(actorLogin) {
        const currentLogin = normalizeLogin(state.githubUser?.login);
        return normalizeLogin(actorLogin) === currentLogin;
    }

    function hasPermission(permissionKey) {
        if (!state.currentAccount || !state.currentAccount.permissions) return false;
        return Boolean(state.currentAccount.permissions[permissionKey]);
    }

    function canAccessView(view) {
        if (view === 'dashboard') return hasPermission('dashboard') || Boolean(state.currentAccount);
        if (view === 'blogs') return hasPermission('blogAccess');
        if (view === 'sessions') return hasPermission('sessionRecords');
        if (view === 'reports') return hasPermission('reportsSubmit') || hasPermission('reportsReview');
        if (view === 'permissions') return hasPermission('userPermissions');
        return false;
    }

    function normalizeAccount(account) {
        const role = ROLE_TEMPLATES[account?.role] ? account.role : 'blog_contributor';
        const permissions = {
            ...rolePermissions(role),
            ...(account?.permissions || {})
        };
        Object.keys(PERMISSION_LABELS).forEach((key) => {
            permissions[key] = Boolean(permissions[key]);
        });
        return {
            id: account?.id || makeId('acct'),
            login: normalizeLogin(account?.login),
            email: normalizeEmail(account?.email),
            name: String(account?.name || account?.login || 'Team member').trim(),
            role,
            active: account?.active !== false,
            permissions,
            updatedAt: account?.updatedAt || new Date().toISOString()
        };
    }

    function normalizePermissionsDoc(doc) {
        const source = doc && typeof doc === 'object' ? doc : {};
        const accounts = Array.isArray(source.accounts) ? source.accounts : [];
        return {
            version: 1,
            updatedAt: source.updatedAt || new Date().toISOString(),
            accounts: accounts
                .map((account) => normalizeAccount(account))
                .filter((account) => account.login)
        };
    }

    function normalizeDraftsDoc(doc) {
        const source = doc && typeof doc === 'object' ? doc : {};
        const drafts = Array.isArray(source.drafts) ? source.drafts : [];
        return {
            version: 1,
            updatedAt: source.updatedAt || new Date().toISOString(),
            drafts: drafts
                .map((draft) => ({
                    id: draft.id || makeId('draft'),
                    title: String(draft.title || '').trim(),
                    date: draft.date || new Date().toISOString(),
                    category: String(draft.category || 'Mental Health').trim(),
                    author: String(draft.author || draft.authorName || '').trim(),
                    summary: String(draft.summary || '').trim(),
                    emoji: String(draft.emoji || '💙').trim(),
                    content: String(draft.content || '').trim(),
                    reviewNotes: String(draft.reviewNotes || '').trim(),
                    status: String(draft.status || 'draft').trim().toLowerCase(),
                    authorLogin: normalizeLogin(draft.authorLogin),
                    authorName: String(draft.authorName || draft.authorLogin || 'Unknown').trim(),
                    publishedSlug: draft.publishedSlug ? String(draft.publishedSlug) : '',
                    publishedAt: draft.publishedAt || '',
                    createdAt: draft.createdAt || new Date().toISOString(),
                    updatedAt: draft.updatedAt || new Date().toISOString(),
                    lastActionBy: normalizeLogin(draft.lastActionBy || draft.authorLogin)
                }))
                .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        };
    }

    function normalizeReportsDoc(doc) {
        const source = doc && typeof doc === 'object' ? doc : {};
        const reports = Array.isArray(source.reports) ? source.reports : [];
        return {
            version: 1,
            updatedAt: source.updatedAt || new Date().toISOString(),
            reports: reports
                .map((report) => ({
                    id: report.id || makeId('report'),
                    bookingId: String(report.bookingId || '').trim(),
                    sessionDate: String(report.sessionDate || '').trim(),
                    sessionType: String(report.sessionType || 'charla').trim().toLowerCase(),
                    participantCount: Math.max(1, Number(report.participantCount || 1)),
                    engagement: String(report.engagement || 'medium').trim().toLowerCase(),
                    rating: Math.max(1, Math.min(5, Number(report.rating || 4))),
                    summary: String(report.summary || '').trim(),
                    challenges: String(report.challenges || '').trim(),
                    notes: String(report.notes || '').trim(),
                    attachments: Array.isArray(report.attachments)
                        ? report.attachments.map((item) => ({
                            name: String(item.name || '').trim(),
                            type: String(item.type || '').trim(),
                            size: Number(item.size || 0)
                        }))
                        : [],
                    facilitatorLogin: normalizeLogin(report.facilitatorLogin),
                    facilitatorName: String(report.facilitatorName || report.facilitatorLogin || '').trim(),
                    status: String(report.status || 'submitted').trim().toLowerCase(),
                    reviewedBy: normalizeLogin(report.reviewedBy || ''),
                    reviewedAt: report.reviewedAt || '',
                    createdAt: report.createdAt || new Date().toISOString(),
                    updatedAt: report.updatedAt || new Date().toISOString()
                }))
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        };
    }

    function normalizeActivityDoc(doc) {
        const source = doc && typeof doc === 'object' ? doc : {};
        const entries = Array.isArray(source.entries) ? source.entries : [];
        return {
            version: 1,
            updatedAt: source.updatedAt || new Date().toISOString(),
            entries: entries
                .map((entry) => ({
                    id: entry.id || makeId('activity'),
                    timestamp: entry.timestamp || new Date().toISOString(),
                    actorLogin: normalizeLogin(entry.actorLogin),
                    actorRole: String(entry.actorRole || '').trim(),
                    module: String(entry.module || 'system').trim(),
                    action: String(entry.action || 'update').trim(),
                    target: String(entry.target || '').trim(),
                    details: String(entry.details || '').trim()
                }))
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 500)
        };
    }

    async function githubRequest(url, options = {}) {
        if (!state.githubToken) {
            throw new Error('Not authenticated.');
        }
        const response = await fetch(url, {
            ...options,
            headers: {
                Authorization: `token ${state.githubToken}`,
                Accept: 'application/vnd.github.v3+json',
                ...(options.headers || {})
            },
            cache: 'no-store'
        });
        return response;
    }

    async function readRepoJsonFile(path, fallbackData) {
        const encodedPath = encodePath(path);
        const url = `${apiBase}/repos/${repoOwner}/${repoName}/contents/${encodedPath}?ref=${encodeURIComponent(repoBranch)}`;
        const response = await githubRequest(url);
        if (response.status === 404) {
            return {
                exists: false,
                sha: null,
                data: fallbackData
            };
        }
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Unable to read ${path}: ${errorText || response.statusText}`);
        }
        const payload = await response.json();
        const content = decodeBase64Unicode(String(payload.content || '').replace(/\n/g, ''));
        let data = fallbackData;
        try {
            data = JSON.parse(content);
        } catch (error) {
            data = fallbackData;
        }
        return {
            exists: true,
            sha: payload.sha,
            data
        };
    }

    async function writeRepoJsonFile(path, jsonData, message, sha = null) {
        const encodedPath = encodePath(path);
        const url = `${apiBase}/repos/${repoOwner}/${repoName}/contents/${encodedPath}`;
        const content = `${JSON.stringify(jsonData, null, 2)}\n`;
        const body = {
            message,
            content: encodeBase64Unicode(content),
            branch: repoBranch
        };
        if (sha) {
            body.sha = sha;
        }
        const response = await githubRequest(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Unable to save ${path}: ${errorText || response.statusText}`);
        }
        const payload = await response.json();
        return payload?.content?.sha || null;
    }

    async function loadDocument(key, normalizer, fallbackData) {
        const doc = state.docs[key];
        const fileData = await readRepoJsonFile(doc.path, fallbackData);
        doc.sha = fileData.sha;
        doc.data = normalizer(fileData.data);
        return fileData.exists;
    }

    async function saveDocument(key, message) {
        const doc = state.docs[key];
        if (!doc || !doc.data) {
            throw new Error('Document is not loaded.');
        }
        doc.data.updatedAt = new Date().toISOString();
        let nextSha = null;
        try {
            nextSha = await writeRepoJsonFile(doc.path, doc.data, message, doc.sha);
        } catch (error) {
            if (!String(error.message || '').includes('sha')) {
                throw error;
            }
            const latest = await readRepoJsonFile(doc.path, doc.data);
            doc.sha = latest.sha;
            nextSha = await writeRepoJsonFile(doc.path, doc.data, message, doc.sha);
        }
        doc.sha = nextSha;
    }

    function getCurrentRoleLabel() {
        if (!state.currentAccount) return 'No role assigned';
        return ROLE_TEMPLATES[state.currentAccount.role]?.label || state.currentAccount.role;
    }

    function findAccountForUser() {
        const permissionsDoc = state.docs.permissions.data;
        if (!permissionsDoc || !Array.isArray(permissionsDoc.accounts)) return null;
        const login = normalizeLogin(state.githubUser?.login);
        const email = normalizeEmail(state.githubUser?.email);
        return permissionsDoc.accounts.find((account) => {
            if (!account.active) return false;
            if (login && normalizeLogin(account.login) === login) return true;
            if (email && normalizeEmail(account.email) === email) return true;
            return false;
        }) || null;
    }

    function buildAdminAccountFromUser() {
        const login = normalizeLogin(state.githubUser?.login);
        return normalizeAccount({
            id: makeId('acct'),
            login,
            email: normalizeEmail(state.githubUser?.email),
            name: state.githubUser?.name || state.githubUser?.login || 'Admin',
            role: 'admin',
            active: true,
            permissions: rolePermissions('admin')
        });
    }

    async function resolveCurrentAccount() {
        let account = findAccountForUser();
        if (account) {
            state.currentAccount = account;
            return;
        }

        const login = normalizeLogin(state.githubUser?.login);
        if (login && DEFAULT_ADMIN_LOGINS.includes(login)) {
            const adminAccount = buildAdminAccountFromUser();
            state.docs.permissions.data.accounts.push(adminAccount);
            state.docs.permissions.data.accounts = state.docs.permissions.data.accounts
                .map((entry) => normalizeAccount(entry))
                .sort((a, b) => a.login.localeCompare(b.login));
            await saveDocument('permissions', `Authorize admin account: ${adminAccount.login}`);
            state.currentAccount = adminAccount;
            return;
        }

        state.currentAccount = {
            id: makeId('acct'),
            login: normalizeLogin(state.githubUser?.login),
            email: normalizeEmail(state.githubUser?.email),
            name: state.githubUser?.name || state.githubUser?.login || 'Employee',
            role: 'unassigned',
            active: true,
            permissions: {
                dashboard: true,
                blogAccess: false,
                blogReview: false,
                blogPublish: false,
                sessionRecords: false,
                reportsSubmit: false,
                reportsReview: false,
                userPermissions: false
            },
            updatedAt: new Date().toISOString()
        };
    }

    function getDraftById(draftId) {
        const draftsDoc = state.docs.drafts.data;
        return draftsDoc.drafts.find((draft) => draft.id === draftId) || null;
    }

    function upsertDraft(draft) {
        const draftsDoc = state.docs.drafts.data;
        const nextDraft = {
            ...draft,
            updatedAt: new Date().toISOString(),
            status: String(draft.status || 'draft').trim().toLowerCase()
        };
        const existingIndex = draftsDoc.drafts.findIndex((entry) => entry.id === nextDraft.id);
        if (existingIndex === -1) {
            draftsDoc.drafts.unshift(nextDraft);
        } else {
            draftsDoc.drafts.splice(existingIndex, 1, nextDraft);
        }
        draftsDoc.drafts.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }

    function removeDraft(draftId) {
        const draftsDoc = state.docs.drafts.data;
        draftsDoc.drafts = draftsDoc.drafts.filter((draft) => draft.id !== draftId);
    }

    function showMessage(text, type = 'info') {
        if (!els.globalMessage) return;
        els.globalMessage.hidden = !text;
        els.globalMessage.classList.remove('is-error', 'is-success');
        if (!text) {
            els.globalMessage.textContent = '';
            return;
        }
        els.globalMessage.textContent = text;
        if (type === 'error') {
            els.globalMessage.classList.add('is-error');
        }
        if (type === 'success') {
            els.globalMessage.classList.add('is-success');
        }
    }

    async function logActivity(action, moduleName, target = '', details = '') {
        const activityDoc = state.docs.activity.data;
        if (!activityDoc) return;
        activityDoc.entries.unshift({
            id: makeId('activity'),
            timestamp: new Date().toISOString(),
            actorLogin: normalizeLogin(state.githubUser?.login),
            actorRole: state.currentAccount?.role || 'unknown',
            module: moduleName,
            action,
            target,
            details
        });
        activityDoc.entries = activityDoc.entries.slice(0, 500);
        try {
            await saveDocument('activity', `Log activity: ${action}`);
        } catch (error) {
            console.warn('Failed to persist activity log.', error);
        }
        renderActivityTable();
    }

    function cacheElements() {
        els.authScreen = byId('authScreen');
        els.adminShell = byId('adminShell');
        els.githubLoginBtn = byId('githubLoginBtn');
        els.authError = byId('authError');
        els.logoutBtn = byId('logoutBtn');
        els.sidebarNav = byId('sidebarNav');
        els.mobileNavToggle = byId('mobileNavToggle');
        els.sidebarUserAvatar = byId('sidebarUserAvatar');
        els.sidebarUserName = byId('sidebarUserName');
        els.sidebarUserRole = byId('sidebarUserRole');
        els.viewTitle = byId('viewTitle');
        els.viewSubtitle = byId('viewSubtitle');
        els.globalMessage = byId('globalMessage');
        els.refreshCurrentViewBtn = byId('refreshCurrentViewBtn');
        els.blogReviewBadge = byId('blogReviewBadge');

        els.metricPublishedPosts = byId('metricPublishedPosts');
        els.metricPendingDrafts = byId('metricPendingDrafts');
        els.metricConfirmedSessions = byId('metricConfirmedSessions');
        els.metricReportsTotal = byId('metricReportsTotal');
        els.dashboardAttentionList = byId('dashboardAttentionList');

        els.newDraftBtn = byId('newDraftBtn');
        els.refreshBlogDataBtn = byId('refreshBlogDataBtn');
        els.draftsTableBody = byId('draftsTableBody');
        els.publishedTableBody = byId('publishedTableBody');

        els.sessionFilterFrom = byId('sessionFilterFrom');
        els.sessionFilterTo = byId('sessionFilterTo');
        els.sessionFilterEmployee = byId('sessionFilterEmployee');
        els.sessionFilterType = byId('sessionFilterType');
        els.sessionFilterStatus = byId('sessionFilterStatus');
        els.applySessionFiltersBtn = byId('applySessionFiltersBtn');
        els.resetSessionFiltersBtn = byId('resetSessionFiltersBtn');
        els.sessionRecordsBody = byId('sessionRecordsBody');
        els.exportSessionsCsvBtn = byId('exportSessionsCsvBtn');
        els.exportSessionsPdfBtn = byId('exportSessionsPdfBtn');

        els.sessionReportForm = byId('sessionReportForm');
        els.reportBookingId = byId('reportBookingId');
        els.reportSessionDate = byId('reportSessionDate');
        els.reportSessionType = byId('reportSessionType');
        els.reportParticipantCount = byId('reportParticipantCount');
        els.reportEngagement = byId('reportEngagement');
        els.reportRating = byId('reportRating');
        els.reportSummary = byId('reportSummary');
        els.reportChallenges = byId('reportChallenges');
        els.reportNotes = byId('reportNotes');
        els.reportAttachments = byId('reportAttachments');
        els.reportsTableBody = byId('reportsTableBody');
        els.activityTableBody = byId('activityTableBody');
        els.refreshReportsBtn = byId('refreshReportsBtn');

        els.addPermissionUserForm = byId('addPermissionUserForm');
        els.permUserLogin = byId('permUserLogin');
        els.permUserName = byId('permUserName');
        els.permUserEmail = byId('permUserEmail');
        els.permUserRole = byId('permUserRole');
        els.permissionsCards = byId('permissionsCards');
        els.refreshPermissionsBtn = byId('refreshPermissionsBtn');

        els.draftModal = byId('draftModal');
        els.draftModalTitle = byId('draftModalTitle');
        els.closeDraftModalBtn = byId('closeDraftModalBtn');
        els.draftEditorForm = byId('draftEditorForm');
        els.draftEditorId = byId('draftEditorId');
        els.draftEditorPublishedSlug = byId('draftEditorPublishedSlug');
        els.draftEditorTitle = byId('draftEditorTitle');
        els.draftEditorDate = byId('draftEditorDate');
        els.draftEditorCategory = byId('draftEditorCategory');
        els.draftEditorAuthor = byId('draftEditorAuthor');
        els.draftEditorEmoji = byId('draftEditorEmoji');
        els.draftEditorSummary = byId('draftEditorSummary');
        els.draftEditorContent = byId('draftEditorContent');
        els.draftEditorReviewNotes = byId('draftEditorReviewNotes');
        els.saveDraftBtn = byId('saveDraftBtn');
        els.submitDraftReviewBtn = byId('submitDraftReviewBtn');
        els.approveDraftBtn = byId('approveDraftBtn');
        els.requestChangesDraftBtn = byId('requestChangesDraftBtn');
        els.publishDraftBtn = byId('publishDraftBtn');
        els.deleteDraftBtn = byId('deleteDraftBtn');
    }

    function showAuthScreen(errorMessage = '') {
        if (els.authScreen) els.authScreen.hidden = false;
        if (els.adminShell) els.adminShell.hidden = true;
        if (els.authError) {
            els.authError.hidden = !errorMessage;
            els.authError.textContent = errorMessage || '';
        }
    }

    function showDashboardShell() {
        if (els.authScreen) els.authScreen.hidden = true;
        if (els.adminShell) els.adminShell.hidden = false;
    }

    function setUserProfileUI() {
        if (!state.githubUser) return;
        if (els.sidebarUserAvatar) {
            els.sidebarUserAvatar.src = state.githubUser.avatar_url || '';
        }
        if (els.sidebarUserName) {
            els.sidebarUserName.textContent = state.githubUser.name || state.githubUser.login || 'User';
        }
        if (els.sidebarUserRole) {
            els.sidebarUserRole.textContent = getCurrentRoleLabel();
        }
    }

    function configureNavigation() {
        if (!els.sidebarNav) return;
        const navButtons = Array.from(els.sidebarNav.querySelectorAll('[data-view]'));
        navButtons.forEach((button) => {
            const view = button.getAttribute('data-view');
            button.hidden = !canAccessView(view);
        });

        const currentViewAllowed = canAccessView(state.currentView);
        if (!currentViewAllowed) {
            const firstAllowed = navButtons.find((button) => {
                const view = button.getAttribute('data-view');
                return canAccessView(view);
            });
            state.currentView = firstAllowed ? firstAllowed.getAttribute('data-view') : 'dashboard';
        }
        setActiveView(state.currentView);
    }

    function setActiveView(view) {
        if (!canAccessView(view)) {
            showMessage('You do not have permission to access this section.', 'error');
            return;
        }
        state.currentView = view;

        const navButtons = Array.from(document.querySelectorAll('.sidebar-link[data-view]'));
        navButtons.forEach((button) => {
            button.classList.toggle('is-active', button.getAttribute('data-view') === view);
        });

        const panels = Array.from(document.querySelectorAll('[data-view-panel]'));
        panels.forEach((panel) => {
            panel.classList.toggle('is-active', panel.getAttribute('data-view-panel') === view);
        });

        const meta = VIEW_META[view] || VIEW_META.dashboard;
        if (els.viewTitle) {
            els.viewTitle.textContent = meta.title;
        }
        if (els.viewSubtitle) {
            els.viewSubtitle.textContent = meta.subtitle;
        }
        closeMobileNavigation();
    }

    function openMobileNavigation() {
        const sidebar = document.querySelector('.admin-sidebar');
        if (!sidebar || !els.mobileNavToggle) return;
        state.mobileNavOpen = true;
        sidebar.classList.add('is-open');
        els.mobileNavToggle.setAttribute('aria-expanded', 'true');
    }

    function closeMobileNavigation() {
        const sidebar = document.querySelector('.admin-sidebar');
        if (!sidebar || !els.mobileNavToggle) return;
        state.mobileNavOpen = false;
        sidebar.classList.remove('is-open');
        els.mobileNavToggle.setAttribute('aria-expanded', 'false');
    }

    function toggleMobileNavigation() {
        if (state.mobileNavOpen) {
            closeMobileNavigation();
        } else {
            openMobileNavigation();
        }
    }

    async function handleGitHubLogin() {
        const clientId = githubConfig.clientId;
        const redirectUri = githubConfig.redirectUri || `${window.location.origin}/admin/callback.html`;
        if (!clientId || clientId === 'YOUR_GITHUB_CLIENT_ID_HERE') {
            showAuthScreen('GitHub OAuth is not configured. Update admin/config.js.');
            return;
        }
        sessionStorage.setItem('bloomly_admin_post_auth_redirect', '/admin/dashboard.html');
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=repo`;
        window.location.href = authUrl;
    }

    function handleLogout() {
        sessionStorage.removeItem('github_token');
        sessionStorage.removeItem('github_user');
        state.githubToken = null;
        state.githubUser = null;
        showAuthScreen();
    }

    async function verifyTokenAndLoadUser() {
        const response = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `token ${state.githubToken}`,
                Accept: 'application/vnd.github.v3+json'
            },
            cache: 'no-store'
        });
        if (!response.ok) {
            throw new Error('GitHub session expired. Please log in again.');
        }
        const user = await response.json();
        state.githubUser = user;
        sessionStorage.setItem('github_user', JSON.stringify(user));
    }

    async function initializeSessionRecords() {
        if (!hasPermission('sessionRecords')) {
            state.sessionRecords = [];
            state.sessionRows = [];
            renderSessionRows();
            return;
        }
        try {
            const toDate = new Date();
            const fromDate = new Date();
            fromDate.setMonth(fromDate.getMonth() - 6);
            const from = fromDate.toISOString().slice(0, 10);
            const to = toDate.toISOString().slice(0, 10);

            const query = new URLSearchParams({ start: from, end: to });
            const response = await fetch(`/api/appointments-records?${query.toString()}`, {
                headers: {
                    Authorization: `Bearer ${state.githubToken}`
                }
            });
            if (!response.ok) {
                const payload = await response.json().catch(() => ({}));
                throw new Error(payload.error || 'Unable to load Charla records.');
            }
            const payload = await response.json();
            state.sessionRecords = Array.isArray(payload.records) ? payload.records : [];
            if (els.sessionFilterFrom) els.sessionFilterFrom.value = from;
            if (els.sessionFilterTo) els.sessionFilterTo.value = to;
            mergeSessionRows();
            populateSessionFilterOptions();
            renderSessionRows();
        } catch (error) {
            showMessage(error.message || 'Unable to load Charla records.', 'error');
            state.sessionRecords = [];
            state.sessionRows = [];
            renderSessionRows();
        }
    }

    function mergeSessionRows() {
        const reports = state.docs.reports.data.reports;
        const reportByBookingId = new Map();
        reports.forEach((report) => {
            if (!report.bookingId) return;
            const existing = reportByBookingId.get(report.bookingId);
            if (!existing || new Date(report.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
                reportByBookingId.set(report.bookingId, report);
            }
        });

        state.sessionRows = state.sessionRecords.map((record) => {
            const report = reportByBookingId.get(record.id) || null;
            const payment = record.payment || null;
            const paymentStatus = payment?.status || (record.status === 'confirmed' ? 'paid' : record.status || 'pending');
            return {
                id: record.id,
                date: record.date,
                time: record.time,
                participant: `${record.name || 'Unknown'} (${record.email || 'No email'})`,
                facilitator: report?.facilitatorName || report?.facilitatorLogin || 'Unassigned',
                participantCount: report?.participantCount || 1,
                sessionType: report?.sessionType || 'charla',
                payment: payment?.provider ? `${payment.provider} (${paymentStatus})` : paymentStatus,
                amount: formatAmount(record.amountCents, record.currency),
                status: record.status || 'pending',
                paymentStatus
            };
        });
    }

    function filterSessionRows() {
        const from = els.sessionFilterFrom ? els.sessionFilterFrom.value : '';
        const to = els.sessionFilterTo ? els.sessionFilterTo.value : '';
        const employee = els.sessionFilterEmployee ? els.sessionFilterEmployee.value : '';
        const type = els.sessionFilterType ? els.sessionFilterType.value : '';
        const status = els.sessionFilterStatus ? els.sessionFilterStatus.value : '';

        return state.sessionRows.filter((row) => {
            if (from && row.date && row.date < from) return false;
            if (to && row.date && row.date > to) return false;
            if (employee && normalizeLogin(row.facilitator) !== normalizeLogin(employee)) return false;
            if (type && row.sessionType !== type) return false;
            if (status) {
                const matchesPayment = String(row.paymentStatus || '').toLowerCase() === status.toLowerCase();
                const matchesSession = String(row.status || '').toLowerCase() === status.toLowerCase();
                if (!matchesPayment && !matchesSession) return false;
            }
            return true;
        });
    }

    function populateSessionFilterOptions() {
        const facilitators = new Set();
        const sessionTypes = new Set();
        state.sessionRows.forEach((row) => {
            if (row.facilitator && row.facilitator !== 'Unassigned') {
                facilitators.add(row.facilitator);
            }
            if (row.sessionType) {
                sessionTypes.add(row.sessionType);
            }
        });

        if (els.sessionFilterEmployee) {
            const options = ['<option value="">All employees</option>']
                .concat(
                    [...facilitators]
                        .sort((a, b) => a.localeCompare(b))
                        .map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`)
                );
            els.sessionFilterEmployee.innerHTML = options.join('');
        }

        if (els.sessionFilterType) {
            const options = ['<option value="">All types</option>']
                .concat(
                    [...sessionTypes]
                        .sort((a, b) => a.localeCompare(b))
                        .map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
                );
            els.sessionFilterType.innerHTML = options.join('');
        }
    }

    function renderSessionRows() {
        if (!els.sessionRecordsBody) return;
        const rows = filterSessionRows();
        if (!rows.length) {
            els.sessionRecordsBody.innerHTML = '<tr><td colspan="8" class="inline-empty">No Charla records match this filter.</td></tr>';
            return;
        }

        els.sessionRecordsBody.innerHTML = rows.map((row) => `
            <tr>
                <td>${escapeHtml(row.date || '—')} ${escapeHtml(row.time || '')}</td>
                <td>${escapeHtml(row.participant)}</td>
                <td>${escapeHtml(row.facilitator)}</td>
                <td>${escapeHtml(String(row.participantCount || 1))}</td>
                <td>${escapeHtml(row.sessionType)}</td>
                <td>${escapeHtml(row.payment)}</td>
                <td>${escapeHtml(row.amount)}</td>
                <td>${statusChip(row.status || row.paymentStatus)}</td>
            </tr>
        `).join('');
    }

    function getVisibleSessionExportRows() {
        return filterSessionRows();
    }

    function exportSessionsCsv() {
        const rows = getVisibleSessionExportRows();
        if (!rows.length) {
            showMessage('No session rows available to export.', 'error');
            return;
        }
        const header = [
            'Date',
            'Time',
            'Participant',
            'Facilitator',
            'Participant Count',
            'Session Type',
            'Payment',
            'Amount',
            'Status'
        ];
        const lines = [header.join(',')];
        rows.forEach((row) => {
            const values = [
                row.date,
                row.time,
                row.participant,
                row.facilitator,
                row.participantCount,
                row.sessionType,
                row.payment,
                row.amount,
                row.status
            ].map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`);
            lines.push(values.join(','));
        });
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `charla-records-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    function exportSessionsPdf() {
        const rows = getVisibleSessionExportRows();
        if (!rows.length) {
            showMessage('No session rows available to export.', 'error');
            return;
        }
        const tableRows = rows.map((row) => `
            <tr>
                <td>${escapeHtml(row.date || '')}</td>
                <td>${escapeHtml(row.time || '')}</td>
                <td>${escapeHtml(row.participant || '')}</td>
                <td>${escapeHtml(row.facilitator || '')}</td>
                <td>${escapeHtml(String(row.participantCount || ''))}</td>
                <td>${escapeHtml(row.sessionType || '')}</td>
                <td>${escapeHtml(row.payment || '')}</td>
                <td>${escapeHtml(row.amount || '')}</td>
                <td>${escapeHtml(row.status || '')}</td>
            </tr>
        `).join('');
        const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=1100,height=760');
        if (!printWindow) {
            showMessage('Unable to open print window for PDF export.', 'error');
            return;
        }
        printWindow.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Charla Records Export</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 18px; color: #1f1f1f; }
                    h1 { margin-bottom: 4px; }
                    p { margin-top: 0; color: #555; }
                    table { width: 100%; border-collapse: collapse; font-size: 12px; }
                    th, td { border: 1px solid #ddd; padding: 6px; text-align: left; vertical-align: top; }
                    th { background: #f5f6fb; text-transform: uppercase; letter-spacing: .02em; font-size: 11px; }
                </style>
            </head>
            <body>
                <h1>Bloomly Charla Records</h1>
                <p>Generated: ${escapeHtml(formatDateTime(new Date().toISOString()))}</p>
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Time</th>
                            <th>Participant</th>
                            <th>Facilitator</th>
                            <th>Count</th>
                            <th>Type</th>
                            <th>Payment</th>
                            <th>Amount</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </body>
            </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    async function loadPublishedPosts() {
        if (!hasPermission('blogAccess')) {
            state.publishedPosts = [];
            renderPublishedPostsTable();
            return;
        }
        if (!window.BlogAdmin || typeof window.BlogAdmin.listPosts !== 'function') {
            showMessage('Blog admin API is not available.', 'error');
            return;
        }
        try {
            state.publishedPosts = await window.BlogAdmin.listPosts();
        } catch (error) {
            state.publishedPosts = [];
            showMessage(error.message || 'Unable to load published posts.', 'error');
        }
        renderPublishedPostsTable();
        renderDashboardMetrics();
    }

    function renderDraftsTable() {
        if (!els.draftsTableBody) return;
        const drafts = state.docs.drafts.data.drafts;
        if (!drafts.length) {
            els.draftsTableBody.innerHTML = '<tr><td colspan="5" class="inline-empty">No drafts yet. Start by creating a new draft.</td></tr>';
            return;
        }
        els.draftsTableBody.innerHTML = drafts.map((draft) => {
            const canEdit = isOwnRecord(draft.authorLogin) || hasPermission('blogReview') || hasPermission('blogPublish');
            const canReview = hasPermission('blogReview') && draft.status === 'in_review';
            const canPublish = hasPermission('blogPublish') && ['approved', 'in_review', 'draft'].includes(draft.status);
            const canDelete = isOwnRecord(draft.authorLogin) || hasPermission('blogReview') || hasPermission('blogPublish');
            const actionButtons = [];
            if (canEdit) {
                actionButtons.push(`<button type="button" class="table-action-btn" data-action="open-draft" data-draft-id="${escapeHtml(draft.id)}">Open</button>`);
            }
            if (canReview) {
                actionButtons.push(`<button type="button" class="table-action-btn" data-action="approve-draft" data-draft-id="${escapeHtml(draft.id)}">Approve</button>`);
            }
            if (canPublish) {
                actionButtons.push(`<button type="button" class="table-action-btn" data-action="publish-draft" data-draft-id="${escapeHtml(draft.id)}">Publish</button>`);
            }
            if (canDelete) {
                actionButtons.push(`<button type="button" class="table-action-btn" data-action="delete-draft" data-draft-id="${escapeHtml(draft.id)}">Delete</button>`);
            }
            return `
                <tr>
                    <td>
                        <strong>${escapeHtml(draft.title || 'Untitled draft')}</strong>
                        <div class="field-hint">${escapeHtml(draft.reviewNotes || '')}</div>
                    </td>
                    <td>${statusChip(draft.status)}</td>
                    <td>${escapeHtml(draft.authorName || draft.authorLogin || 'Unknown')}</td>
                    <td>${escapeHtml(formatDateTime(draft.updatedAt))}</td>
                    <td><div class="table-actions">${actionButtons.join('')}</div></td>
                </tr>
            `;
        }).join('');
    }

    function renderPublishedPostsTable() {
        if (!els.publishedTableBody) return;
        if (!state.publishedPosts.length) {
            els.publishedTableBody.innerHTML = '<tr><td colspan="5" class="inline-empty">No published posts available.</td></tr>';
            return;
        }
        const canCreateDraft = hasPermission('blogAccess');
        const canDelete = hasPermission('blogPublish');

        els.publishedTableBody.innerHTML = state.publishedPosts.map((post) => {
            const actions = [];
            if (canCreateDraft) {
                actions.push(`<button type="button" class="table-action-btn" data-action="revision-draft" data-post-slug="${escapeHtml(post.slug)}">Revision draft</button>`);
            }
            if (canDelete) {
                actions.push(`<button type="button" class="table-action-btn" data-action="delete-published" data-post-slug="${escapeHtml(post.slug)}">Delete</button>`);
            }
            return `
                <tr>
                    <td><strong>${escapeHtml(post.title || post.slug)}</strong></td>
                    <td>${escapeHtml(post.category || 'Uncategorized')}</td>
                    <td>${escapeHtml(post.author || 'Unknown')}</td>
                    <td>${escapeHtml(formatDate(post.date))}</td>
                    <td><div class="table-actions">${actions.join('')}</div></td>
                </tr>
            `;
        }).join('');
    }

    function updateBlogReviewBadge() {
        if (!els.blogReviewBadge) return;
        const pendingReviewCount = state.docs.drafts.data.drafts.filter((draft) => draft.status === 'in_review').length;
        if (pendingReviewCount > 0 && (hasPermission('blogReview') || hasPermission('blogPublish'))) {
            els.blogReviewBadge.hidden = false;
            els.blogReviewBadge.textContent = String(pendingReviewCount);
        } else {
            els.blogReviewBadge.hidden = true;
        }
    }

    function renderDashboardAttention() {
        if (!els.dashboardAttentionList) return;
        const items = [];
        const pendingDrafts = state.docs.drafts.data.drafts.filter((draft) => draft.status === 'in_review').length;
        if (pendingDrafts > 0) {
            items.push(`${pendingDrafts} draft${pendingDrafts === 1 ? '' : 's'} waiting for review.`);
        }

        const unassignedSessions = state.sessionRows.filter((row) => row.facilitator === 'Unassigned').length;
        if (unassignedSessions > 0) {
            items.push(`${unassignedSessions} Charla record${unassignedSessions === 1 ? '' : 's'} without facilitator report.`);
        }

        const pendingReports = state.docs.reports.data.reports.filter((report) => report.status === 'submitted').length;
        if (pendingReports > 0) {
            items.push(`${pendingReports} employee report${pendingReports === 1 ? '' : 's'} pending review.`);
        }

        if (!items.length) {
            els.dashboardAttentionList.innerHTML = '<li class="inline-empty">Everything looks up to date.</li>';
            return;
        }
        els.dashboardAttentionList.innerHTML = items.map((text) => `<li>${escapeHtml(text)}</li>`).join('');
    }

    function renderDashboardMetrics() {
        if (els.metricPublishedPosts) {
            els.metricPublishedPosts.textContent = String(state.publishedPosts.length);
        }
        if (els.metricPendingDrafts) {
            const value = state.docs.drafts.data.drafts.filter((draft) => draft.status === 'in_review').length;
            els.metricPendingDrafts.textContent = String(value);
        }
        if (els.metricConfirmedSessions) {
            const value = state.sessionRows.filter((row) => String(row.status).toLowerCase() === 'confirmed').length;
            els.metricConfirmedSessions.textContent = String(value);
        }
        if (els.metricReportsTotal) {
            els.metricReportsTotal.textContent = String(state.docs.reports.data.reports.length);
        }
        renderDashboardAttention();
        updateBlogReviewBadge();
    }

    function populateReportBookingOptions() {
        if (!els.reportBookingId) return;
        if (!state.sessionRecords.length) return;
        const currentValue = els.reportBookingId.value;
        const listId = 'reportBookingIdList';
        let datalist = byId(listId);
        if (!datalist) {
            datalist = document.createElement('datalist');
            datalist.id = listId;
            document.body.appendChild(datalist);
            els.reportBookingId.setAttribute('list', listId);
        }
        datalist.innerHTML = state.sessionRecords
            .slice(0, 200)
            .map((record) => `<option value="${escapeHtml(record.id)}">${escapeHtml(record.date)} ${escapeHtml(record.time)} - ${escapeHtml(record.name || '')}</option>`)
            .join('');
        els.reportBookingId.value = currentValue;
    }

    function renderReportsTable() {
        if (!els.reportsTableBody) return;
        const canReview = hasPermission('reportsReview');
        const canSubmit = hasPermission('reportsSubmit');
        const reports = state.docs.reports.data.reports.filter((report) => {
            if (canReview) return true;
            if (canSubmit) return isOwnRecord(report.facilitatorLogin);
            return false;
        });
        if (!reports.length) {
            els.reportsTableBody.innerHTML = '<tr><td colspan="8" class="inline-empty">No reports available for this role.</td></tr>';
            return;
        }
        els.reportsTableBody.innerHTML = reports.map((report) => {
            const actions = [];
            if (canReview && report.status === 'submitted') {
                actions.push(`<button type="button" class="table-action-btn" data-action="review-report" data-report-id="${escapeHtml(report.id)}">Mark reviewed</button>`);
            }
            if (isOwnRecord(report.facilitatorLogin) || canReview) {
                actions.push(`<button type="button" class="table-action-btn" data-action="delete-report" data-report-id="${escapeHtml(report.id)}">Delete</button>`);
            }
            actions.push(`<button type="button" class="table-action-btn" data-action="view-report" data-report-id="${escapeHtml(report.id)}">View</button>`);

            return `
                <tr>
                    <td>${escapeHtml(report.sessionDate || formatDate(report.createdAt))}</td>
                    <td>${escapeHtml(report.facilitatorName || report.facilitatorLogin || 'Unknown')}</td>
                    <td>${escapeHtml(report.sessionType)}</td>
                    <td>${escapeHtml(String(report.participantCount || 1))}</td>
                    <td>${escapeHtml(report.engagement)}</td>
                    <td>${escapeHtml(String(report.rating || 0))}</td>
                    <td>${statusChip(report.status)}</td>
                    <td><div class="table-actions">${actions.join('')}</div></td>
                </tr>
            `;
        }).join('');
    }

    function renderActivityTable() {
        if (!els.activityTableBody) return;
        const entries = state.docs.activity.data.entries.slice(0, 120);
        if (!entries.length) {
            els.activityTableBody.innerHTML = '<tr><td colspan="5" class="inline-empty">No activity logged yet.</td></tr>';
            return;
        }
        els.activityTableBody.innerHTML = entries.map((entry) => `
            <tr>
                <td>${escapeHtml(formatDateTime(entry.timestamp))}</td>
                <td>${escapeHtml(entry.actorLogin || 'system')}</td>
                <td>${escapeHtml(entry.module)}</td>
                <td>${escapeHtml(entry.action)}</td>
                <td>${escapeHtml(entry.details || entry.target || '')}</td>
            </tr>
        `).join('');
    }

    function renderPermissionsCards() {
        if (!els.permissionsCards) return;
        if (!hasPermission('userPermissions')) {
            els.permissionsCards.innerHTML = '<p class="inline-empty">You do not have permission to manage roles.</p>';
            return;
        }
        const accounts = state.docs.permissions.data.accounts
            .slice()
            .sort((a, b) => a.login.localeCompare(b.login));

        if (!accounts.length) {
            els.permissionsCards.innerHTML = '<p class="inline-empty">No authorized accounts configured yet.</p>';
            return;
        }

        const roleOptionsHtml = Object.keys(ROLE_TEMPLATES)
            .map((role) => `<option value="${escapeHtml(role)}">${escapeHtml(ROLE_TEMPLATES[role].label)}</option>`)
            .join('');

        els.permissionsCards.innerHTML = accounts.map((account) => {
            const permissionCheckboxes = Object.keys(PERMISSION_LABELS).map((permissionKey) => `
                <label>
                    <input type="checkbox" data-field="permission" data-permission="${escapeHtml(permissionKey)}" ${account.permissions[permissionKey] ? 'checked' : ''}>
                    ${escapeHtml(PERMISSION_LABELS[permissionKey])}
                </label>
            `).join('');

            return `
                <article class="permission-card" data-login="${escapeHtml(account.login)}">
                    <div class="permission-card-header">
                        <div>
                            <h4>${escapeHtml(account.name)}</h4>
                            <p>${escapeHtml(account.login)} ${account.email ? `• ${escapeHtml(account.email)}` : ''}</p>
                        </div>
                        <div class="table-actions">
                            ${statusChip(account.active ? 'active' : 'inactive')}
                        </div>
                    </div>
                    <div class="filters-grid">
                        <label>
                            Role
                            <select data-field="role">
                                ${roleOptionsHtml}
                            </select>
                        </label>
                        <label>
                            Name
                            <input type="text" data-field="name" value="${escapeHtml(account.name)}">
                        </label>
                        <label>
                            Email
                            <input type="email" data-field="email" value="${escapeHtml(account.email || '')}">
                        </label>
                        <label>
                            Active
                            <input type="checkbox" data-field="active" ${account.active ? 'checked' : ''}>
                        </label>
                    </div>
                    <div class="permission-grid">${permissionCheckboxes}</div>
                    <div class="permission-card-actions">
                        <button type="button" class="table-action-btn" data-action="save-account">Save</button>
                        <button type="button" class="table-action-btn" data-action="apply-template">Reset to role template</button>
                        <button type="button" class="table-action-btn" data-action="revoke-account">Revoke</button>
                    </div>
                </article>
            `;
        }).join('');

        accounts.forEach((account) => {
            const card = Array.from(els.permissionsCards.querySelectorAll('.permission-card'))
                .find((entry) => normalizeLogin(entry.getAttribute('data-login')) === normalizeLogin(account.login));
            if (!card) {
                return;
            }
            const roleSelect = card.querySelector('[data-field="role"]');
            if (roleSelect) {
                roleSelect.value = account.role;
            }
        });
    }

    function openDraftModal(draft = null) {
        const editorDraft = draft || {
            id: '',
            title: '',
            date: new Date().toISOString(),
            category: 'Mental Health',
            summary: '',
            emoji: '💙',
            content: '',
            reviewNotes: '',
            status: 'draft',
            publishedSlug: ''
        };

        if (els.draftModalTitle) {
            els.draftModalTitle.textContent = draft ? 'Edit draft' : 'Create draft';
        }
        els.draftEditorId.value = editorDraft.id || '';
        els.draftEditorPublishedSlug.value = editorDraft.publishedSlug || '';
        els.draftEditorTitle.value = editorDraft.title || '';
        els.draftEditorDate.value = toInputDateTime(editorDraft.date || new Date().toISOString());
        els.draftEditorCategory.value = editorDraft.category || 'Mental Health';
        els.draftEditorAuthor.value = editorDraft.author || editorDraft.authorName || state.githubUser?.name || state.githubUser?.login || '';
        els.draftEditorEmoji.value = editorDraft.emoji || '💙';
        els.draftEditorSummary.value = editorDraft.summary || '';
        els.draftEditorContent.value = editorDraft.content || '';
        els.draftEditorReviewNotes.value = editorDraft.reviewNotes || '';

        const isExisting = Boolean(editorDraft.id);
        const canReview = hasPermission('blogReview');
        const canPublish = hasPermission('blogPublish');
        const ownDraft = isOwnRecord(editorDraft.authorLogin || state.githubUser?.login);

        els.deleteDraftBtn.hidden = !isExisting || (!ownDraft && !canReview && !canPublish);
        els.saveDraftBtn.hidden = !hasPermission('blogAccess');
        els.submitDraftReviewBtn.hidden = !hasPermission('blogAccess');
        els.approveDraftBtn.hidden = !(canReview && editorDraft.status === 'in_review');
        els.requestChangesDraftBtn.hidden = !(canReview && editorDraft.status === 'in_review');
        els.publishDraftBtn.hidden = !canPublish;

        els.draftModal.hidden = false;
        state.draftModalOpen = true;
    }

    function closeDraftModal() {
        if (!els.draftModal) return;
        els.draftModal.hidden = true;
        state.draftModalOpen = false;
    }

    function getDraftFromEditor(statusOverride = '') {
        const existingId = String(els.draftEditorId.value || '').trim();
        const existingDraft = existingId ? getDraftById(existingId) : null;
        const status = statusOverride || existingDraft?.status || 'draft';
        return {
            id: existingId || makeId('draft'),
            title: String(els.draftEditorTitle.value || '').trim(),
            date: new Date(els.draftEditorDate.value || new Date().toISOString()).toISOString(),
            category: String(els.draftEditorCategory.value || 'Mental Health').trim(),
            author: String(els.draftEditorAuthor.value || existingDraft?.author || existingDraft?.authorName || '').trim(),
            summary: String(els.draftEditorSummary.value || '').trim(),
            emoji: String(els.draftEditorEmoji.value || '💙').trim(),
            content: String(els.draftEditorContent.value || '').trim(),
            reviewNotes: String(els.draftEditorReviewNotes.value || '').trim(),
            status,
            authorLogin: existingDraft?.authorLogin || normalizeLogin(state.githubUser?.login),
            authorName: existingDraft?.authorName || state.githubUser?.name || state.githubUser?.login || 'Unknown',
            publishedSlug: String(els.draftEditorPublishedSlug.value || existingDraft?.publishedSlug || '').trim(),
            publishedAt: existingDraft?.publishedAt || '',
            createdAt: existingDraft?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lastActionBy: normalizeLogin(state.githubUser?.login)
        };
    }

    async function saveDraftFromModal(statusOverride = '') {
        if (!hasPermission('blogAccess')) {
            showMessage('You do not have permission to edit drafts.', 'error');
            return;
        }
        const draft = getDraftFromEditor(statusOverride);
        if (!draft.title || !draft.author || !draft.summary || !draft.content) {
            showMessage('Title, author, summary, and content are required.', 'error');
            return;
        }
        upsertDraft(draft);
        await saveDocument('drafts', `Update blog draft: ${draft.title}`);
        renderDraftsTable();
        renderDashboardMetrics();
        updateBlogReviewBadge();
        closeDraftModal();
        showMessage(`Draft saved (${draft.status.replace('_', ' ')}).`, 'success');
        await logActivity('draft_saved', 'blog', draft.title, `Status: ${draft.status}`);
    }

    async function approveDraftFromModal() {
        if (!hasPermission('blogReview')) {
            showMessage('You do not have review permission.', 'error');
            return;
        }
        await saveDraftFromModal('approved');
    }

    async function requestChangesFromModal() {
        if (!hasPermission('blogReview')) {
            showMessage('You do not have review permission.', 'error');
            return;
        }
        await saveDraftFromModal('rejected');
    }

    async function publishDraftFromModal() {
        if (!hasPermission('blogPublish')) {
            showMessage('You do not have publish permission.', 'error');
            return;
        }
        const draft = getDraftFromEditor('approved');
        if (!draft.title || !draft.author || !draft.summary || !draft.content) {
            showMessage('Title, author, summary, and content are required before publishing.', 'error');
            return;
        }
        const slug = draft.publishedSlug || slugify(draft.title);
        if (!slug) {
            showMessage('Unable to generate a slug for this draft.', 'error');
            return;
        }
        const savePayload = {
            slug,
            title: draft.title,
            date: draft.date,
            category: draft.category,
            author: draft.author,
            summary: draft.summary,
            emoji: draft.emoji,
            content: draft.content
        };

        try {
            await window.BlogAdmin.savePost(savePayload, !draft.publishedSlug);
            draft.status = 'published';
            draft.publishedSlug = slug;
            draft.publishedAt = new Date().toISOString();
            draft.lastActionBy = normalizeLogin(state.githubUser?.login);
            upsertDraft(draft);
            await saveDocument('drafts', `Publish blog draft: ${draft.title}`);
            await loadPublishedPosts();
            renderDraftsTable();
            renderDashboardMetrics();
            closeDraftModal();
            showMessage(`Published "${draft.title}" successfully.`, 'success');
            await logActivity('draft_published', 'blog', draft.title, `Slug: ${slug}`);
        } catch (error) {
            showMessage(error.message || 'Failed to publish draft.', 'error');
        }
    }

    async function deleteDraftFromModal() {
        const draftId = String(els.draftEditorId.value || '').trim();
        if (!draftId) {
            closeDraftModal();
            return;
        }
        const draft = getDraftById(draftId);
        if (!draft) {
            closeDraftModal();
            return;
        }
        const canDelete = isOwnRecord(draft.authorLogin) || hasPermission('blogReview') || hasPermission('blogPublish');
        if (!canDelete) {
            showMessage('You do not have permission to delete this draft.', 'error');
            return;
        }
        removeDraft(draftId);
        await saveDocument('drafts', `Delete blog draft: ${draft.title}`);
        renderDraftsTable();
        renderDashboardMetrics();
        closeDraftModal();
        showMessage('Draft deleted.', 'success');
        await logActivity('draft_deleted', 'blog', draft.title, '');
    }

    async function handleDraftTableAction(event) {
        const target = event.target.closest('button[data-action]');
        if (!target) return;
        const action = target.getAttribute('data-action');
        const draftId = target.getAttribute('data-draft-id');
        const draft = getDraftById(draftId);
        if (!draft) return;

        if (action === 'open-draft') {
            openDraftModal(draft);
            return;
        }

        if (action === 'approve-draft') {
            if (!hasPermission('blogReview')) {
                showMessage('You do not have review permission.', 'error');
                return;
            }
            draft.status = 'approved';
            draft.lastActionBy = normalizeLogin(state.githubUser?.login);
            draft.updatedAt = new Date().toISOString();
            upsertDraft(draft);
            await saveDocument('drafts', `Approve draft: ${draft.title}`);
            renderDraftsTable();
            renderDashboardMetrics();
            showMessage('Draft approved.', 'success');
            await logActivity('draft_approved', 'blog', draft.title, '');
            return;
        }

        if (action === 'publish-draft') {
            if (!hasPermission('blogPublish')) {
                showMessage('You do not have publish permission.', 'error');
                return;
            }
            openDraftModal(draft);
            await publishDraftFromModal();
            return;
        }

        if (action === 'delete-draft') {
            const canDelete = isOwnRecord(draft.authorLogin) || hasPermission('blogReview') || hasPermission('blogPublish');
            if (!canDelete) {
                showMessage('You do not have permission to delete this draft.', 'error');
                return;
            }
            removeDraft(draft.id);
            await saveDocument('drafts', `Delete blog draft: ${draft.title}`);
            renderDraftsTable();
            renderDashboardMetrics();
            showMessage('Draft deleted.', 'success');
            await logActivity('draft_deleted', 'blog', draft.title, '');
        }
    }

    async function handlePublishedTableAction(event) {
        const target = event.target.closest('button[data-action]');
        if (!target) return;
        const action = target.getAttribute('data-action');
        const slug = target.getAttribute('data-post-slug');
        const post = state.publishedPosts.find((entry) => entry.slug === slug);
        if (!post) return;

        if (action === 'revision-draft') {
            if (!hasPermission('blogAccess')) {
                showMessage('You do not have permission to create blog drafts.', 'error');
                return;
            }
            const draft = {
                id: makeId('draft'),
                title: post.title || '',
                date: post.date || new Date().toISOString(),
                category: post.category || 'Mental Health',
                author: post.author || state.githubUser?.name || state.githubUser?.login || '',
                summary: post.summary || '',
                emoji: post.emoji || '💙',
                content: post.content || '',
                reviewNotes: '',
                status: hasPermission('blogPublish') ? 'approved' : 'draft',
                authorLogin: normalizeLogin(state.githubUser?.login),
                authorName: state.githubUser?.name || state.githubUser?.login || 'Unknown',
                publishedSlug: post.slug || '',
                publishedAt: '',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                lastActionBy: normalizeLogin(state.githubUser?.login)
            };
            upsertDraft(draft);
            await saveDocument('drafts', `Create revision draft: ${draft.title}`);
            renderDraftsTable();
            renderDashboardMetrics();
            setActiveView('blogs');
            openDraftModal(draft);
            showMessage('Revision draft created from published post.', 'success');
            await logActivity('revision_draft_created', 'blog', draft.title, `Source slug: ${post.slug}`);
            return;
        }

        if (action === 'delete-published') {
            if (!hasPermission('blogPublish')) {
                showMessage('You do not have permission to delete published posts.', 'error');
                return;
            }
            const confirmed = window.confirm(`Delete "${post.title || post.slug}" from published posts? This cannot be undone.`);
            if (!confirmed) return;
            try {
                await window.BlogAdmin.deletePost(post.slug, post.name);
                showMessage('Published post deleted.', 'success');
                await loadPublishedPosts();
                await logActivity('published_deleted', 'blog', post.slug, '');
            } catch (error) {
                showMessage(error.message || 'Failed to delete published post.', 'error');
            }
        }
    }

    async function submitSessionReport(event) {
        event.preventDefault();
        if (!hasPermission('reportsSubmit')) {
            showMessage('You do not have permission to submit reports.', 'error');
            return;
        }
        const summary = String(els.reportSummary.value || '').trim();
        if (!summary) {
            showMessage('Session summary is required.', 'error');
            return;
        }

        const attachments = Array.from(els.reportAttachments?.files || []).map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size
        }));

        const report = {
            id: makeId('report'),
            bookingId: String(els.reportBookingId.value || '').trim(),
            sessionDate: String(els.reportSessionDate.value || '').trim(),
            sessionType: String(els.reportSessionType.value || 'charla').trim().toLowerCase(),
            participantCount: Math.max(1, Number(els.reportParticipantCount.value || 1)),
            engagement: String(els.reportEngagement.value || 'medium').trim().toLowerCase(),
            rating: Math.max(1, Math.min(5, Number(els.reportRating.value || 4))),
            summary,
            challenges: String(els.reportChallenges.value || '').trim(),
            notes: String(els.reportNotes.value || '').trim(),
            attachments,
            facilitatorLogin: normalizeLogin(state.githubUser?.login),
            facilitatorName: state.githubUser?.name || state.githubUser?.login || 'Unknown',
            status: 'submitted',
            reviewedBy: '',
            reviewedAt: '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        state.docs.reports.data.reports.unshift(report);
        await saveDocument('reports', `Submit session report: ${report.sessionDate}`);
        mergeSessionRows();
        renderReportsTable();
        renderSessionRows();
        renderDashboardMetrics();
        if (typeof els.sessionReportForm.reset === 'function') {
            els.sessionReportForm.reset();
            els.reportSessionDate.value = new Date().toISOString().slice(0, 10);
            els.reportParticipantCount.value = '1';
            els.reportRating.value = '4';
        }
        showMessage('Session report submitted.', 'success');
        await logActivity('report_submitted', 'reports', report.bookingId || report.sessionDate, '');
    }

    async function handleReportsTableAction(event) {
        const target = event.target.closest('button[data-action]');
        if (!target) return;
        const action = target.getAttribute('data-action');
        const reportId = target.getAttribute('data-report-id');
        const report = state.docs.reports.data.reports.find((entry) => entry.id === reportId);
        if (!report) return;

        if (action === 'review-report') {
            if (!hasPermission('reportsReview')) {
                showMessage('You do not have permission to review reports.', 'error');
                return;
            }
            report.status = 'reviewed';
            report.reviewedBy = normalizeLogin(state.githubUser?.login);
            report.reviewedAt = new Date().toISOString();
            report.updatedAt = new Date().toISOString();
            await saveDocument('reports', `Review session report: ${report.id}`);
            renderReportsTable();
            renderDashboardMetrics();
            showMessage('Report marked as reviewed.', 'success');
            await logActivity('report_reviewed', 'reports', report.id, '');
            return;
        }

        if (action === 'delete-report') {
            const canDelete = hasPermission('reportsReview') || isOwnRecord(report.facilitatorLogin);
            if (!canDelete) {
                showMessage('You do not have permission to delete this report.', 'error');
                return;
            }
            const confirmed = window.confirm('Delete this report?');
            if (!confirmed) return;
            state.docs.reports.data.reports = state.docs.reports.data.reports.filter((entry) => entry.id !== report.id);
            await saveDocument('reports', `Delete session report: ${report.id}`);
            mergeSessionRows();
            renderReportsTable();
            renderSessionRows();
            renderDashboardMetrics();
            showMessage('Report deleted.', 'success');
            await logActivity('report_deleted', 'reports', report.id, '');
            return;
        }

        if (action === 'view-report') {
            const attachmentText = report.attachments.length
                ? report.attachments.map((item) => `${item.name} (${Math.round((item.size || 0) / 1024)} KB)`).join('\n')
                : 'None';
            window.alert(
                `Session date: ${report.sessionDate}\n` +
                `Facilitator: ${report.facilitatorName}\n` +
                `Type: ${report.sessionType}\n` +
                `Participants: ${report.participantCount}\n` +
                `Engagement: ${report.engagement}\n` +
                `Rating: ${report.rating}\n\n` +
                `Summary:\n${report.summary}\n\n` +
                `Challenges:\n${report.challenges || '—'}\n\n` +
                `Notes:\n${report.notes || '—'}\n\n` +
                `Attachments:\n${attachmentText}`
            );
        }
    }

    async function addPermissionAccount(event) {
        event.preventDefault();
        if (!hasPermission('userPermissions')) {
            showMessage('You do not have permission to manage accounts.', 'error');
            return;
        }
        const login = normalizeLogin(els.permUserLogin.value);
        if (!login) {
            showMessage('GitHub login is required.', 'error');
            return;
        }
        const role = ROLE_TEMPLATES[els.permUserRole.value] ? els.permUserRole.value : 'blog_contributor';
        const existing = state.docs.permissions.data.accounts.find((account) => normalizeLogin(account.login) === login);
        if (existing) {
            existing.name = String(els.permUserName.value || existing.name || login).trim();
            existing.email = normalizeEmail(els.permUserEmail.value || existing.email);
            existing.role = role;
            existing.permissions = rolePermissions(role);
            existing.active = true;
            existing.updatedAt = new Date().toISOString();
        } else {
            state.docs.permissions.data.accounts.push(normalizeAccount({
                id: makeId('acct'),
                login,
                name: String(els.permUserName.value || login).trim(),
                email: normalizeEmail(els.permUserEmail.value),
                role,
                active: true,
                permissions: rolePermissions(role)
            }));
        }
        await saveDocument('permissions', `Authorize account: ${login}`);
        renderPermissionsCards();
        if (typeof els.addPermissionUserForm.reset === 'function') {
            els.addPermissionUserForm.reset();
            els.permUserRole.value = 'blog_contributor';
        }
        showMessage(`Account "${login}" authorized.`, 'success');
        await logActivity('account_authorized', 'permissions', login, `Role: ${role}`);
        await resolveCurrentAccount();
        setUserProfileUI();
        configureNavigation();
    }

    async function handlePermissionCardAction(event) {
        const target = event.target.closest('button[data-action]');
        if (!target || !hasPermission('userPermissions')) return;
        const card = target.closest('.permission-card');
        if (!card) return;
        const login = normalizeLogin(card.getAttribute('data-login'));
        const account = state.docs.permissions.data.accounts.find((entry) => normalizeLogin(entry.login) === login);
        if (!account) return;

        const action = target.getAttribute('data-action');
        const roleField = card.querySelector('[data-field="role"]');
        const nameField = card.querySelector('[data-field="name"]');
        const emailField = card.querySelector('[data-field="email"]');
        const activeField = card.querySelector('[data-field="active"]');

        if (action === 'apply-template') {
            const nextRole = ROLE_TEMPLATES[roleField.value] ? roleField.value : account.role;
            account.role = nextRole;
            account.permissions = rolePermissions(nextRole);
            account.updatedAt = new Date().toISOString();
            await saveDocument('permissions', `Reset permissions for: ${account.login}`);
            renderPermissionsCards();
            showMessage(`Permissions reset to "${ROLE_TEMPLATES[nextRole].label}" template.`, 'success');
            await logActivity('permissions_template_reset', 'permissions', account.login, `Role: ${nextRole}`);
            if (normalizeLogin(state.currentAccount?.login) === account.login) {
                await resolveCurrentAccount();
                setUserProfileUI();
                configureNavigation();
            }
            return;
        }

        if (action === 'revoke-account') {
            const activeAdmins = state.docs.permissions.data.accounts.filter((entry) => entry.active && entry.role === 'admin');
            if (account.role === 'admin' && account.active && activeAdmins.length <= 1) {
                showMessage('At least one active admin account must remain authorized.', 'error');
                return;
            }
            account.active = false;
            account.updatedAt = new Date().toISOString();
            await saveDocument('permissions', `Revoke account: ${account.login}`);
            renderPermissionsCards();
            showMessage(`Account "${account.login}" has been revoked.`, 'success');
            await logActivity('account_revoked', 'permissions', account.login, '');
            if (normalizeLogin(state.currentAccount?.login) === account.login) {
                showMessage('Your account access was revoked. Please contact an admin.', 'error');
                configureNavigation();
            }
            return;
        }

        if (action === 'save-account') {
            const nextRole = ROLE_TEMPLATES[roleField.value] ? roleField.value : account.role;
            account.role = nextRole;
            account.name = String(nameField.value || account.login).trim();
            account.email = normalizeEmail(emailField.value);
            account.active = Boolean(activeField.checked);

            const permissionInputs = Array.from(card.querySelectorAll('input[data-field="permission"]'));
            const nextPermissions = {};
            permissionInputs.forEach((input) => {
                const key = input.getAttribute('data-permission');
                if (!key) return;
                nextPermissions[key] = input.checked;
            });
            account.permissions = {
                ...rolePermissions(nextRole),
                ...nextPermissions
            };
            account.updatedAt = new Date().toISOString();

            const activeAdmins = state.docs.permissions.data.accounts.filter((entry) => {
                if (entry.id === account.id) {
                    return account.active && account.role === 'admin';
                }
                return entry.active && entry.role === 'admin';
            });
            if (!activeAdmins.length) {
                showMessage('At least one active admin account must remain authorized.', 'error');
                return;
            }

            await saveDocument('permissions', `Update account permissions: ${account.login}`);
            renderPermissionsCards();
            showMessage(`Permissions updated for "${account.login}".`, 'success');
            await logActivity('permissions_updated', 'permissions', account.login, `Role: ${account.role}`);
            if (normalizeLogin(state.currentAccount?.login) === account.login) {
                await resolveCurrentAccount();
                setUserProfileUI();
                configureNavigation();
                setActiveView('dashboard');
            }
        }
    }

    async function refreshCurrentView() {
        if (state.currentView === 'blogs') {
            await loadPublishedPosts();
            renderDraftsTable();
            showMessage('Blog data refreshed.', 'success');
            return;
        }
        if (state.currentView === 'sessions') {
            await initializeSessionRecords();
            showMessage('Charla records refreshed.', 'success');
            return;
        }
        if (state.currentView === 'reports') {
            renderReportsTable();
            renderActivityTable();
            showMessage('Reports and activity refreshed.', 'success');
            return;
        }
        if (state.currentView === 'permissions') {
            renderPermissionsCards();
            showMessage('Permissions refreshed.', 'success');
            return;
        }
        renderDashboardMetrics();
        showMessage('Dashboard refreshed.', 'success');
    }

    function bindEvents() {
        if (els.githubLoginBtn) {
            els.githubLoginBtn.addEventListener('click', handleGitHubLogin);
        }
        if (els.logoutBtn) {
            els.logoutBtn.addEventListener('click', handleLogout);
        }
        if (els.sidebarNav) {
            els.sidebarNav.addEventListener('click', (event) => {
                const button = event.target.closest('button[data-view]');
                if (!button) return;
                setActiveView(button.getAttribute('data-view'));
            });
        }
        if (els.mobileNavToggle) {
            els.mobileNavToggle.addEventListener('click', toggleMobileNavigation);
        }
        document.addEventListener('click', (event) => {
            if (!state.mobileNavOpen) return;
            const sidebar = document.querySelector('.admin-sidebar');
            if (!sidebar) return;
            const clickedInsideSidebar = sidebar.contains(event.target);
            const clickedToggle = els.mobileNavToggle && els.mobileNavToggle.contains(event.target);
            if (!clickedInsideSidebar && !clickedToggle) {
                closeMobileNavigation();
            }
        });
        if (els.refreshCurrentViewBtn) {
            els.refreshCurrentViewBtn.addEventListener('click', refreshCurrentView);
        }

        const quickViewButtons = Array.from(document.querySelectorAll('[data-quick-view]'));
        quickViewButtons.forEach((button) => {
            button.addEventListener('click', () => {
                setActiveView(button.getAttribute('data-quick-view'));
            });
        });

        if (els.newDraftBtn) {
            els.newDraftBtn.addEventListener('click', () => openDraftModal(null));
        }
        if (els.refreshBlogDataBtn) {
            els.refreshBlogDataBtn.addEventListener('click', async () => {
                await loadPublishedPosts();
                renderDraftsTable();
                renderDashboardMetrics();
                showMessage('Blog data refreshed.', 'success');
            });
        }
        if (els.draftsTableBody) {
            els.draftsTableBody.addEventListener('click', (event) => {
                void handleDraftTableAction(event);
            });
        }
        if (els.publishedTableBody) {
            els.publishedTableBody.addEventListener('click', (event) => {
                void handlePublishedTableAction(event);
            });
        }

        if (els.applySessionFiltersBtn) {
            els.applySessionFiltersBtn.addEventListener('click', renderSessionRows);
        }
        if (els.resetSessionFiltersBtn) {
            els.resetSessionFiltersBtn.addEventListener('click', () => {
                if (els.sessionFilterEmployee) els.sessionFilterEmployee.value = '';
                if (els.sessionFilterType) els.sessionFilterType.value = '';
                if (els.sessionFilterStatus) els.sessionFilterStatus.value = '';
                renderSessionRows();
            });
        }
        if (els.exportSessionsCsvBtn) {
            els.exportSessionsCsvBtn.addEventListener('click', exportSessionsCsv);
        }
        if (els.exportSessionsPdfBtn) {
            els.exportSessionsPdfBtn.addEventListener('click', exportSessionsPdf);
        }

        if (els.sessionReportForm) {
            els.sessionReportForm.addEventListener('submit', (event) => {
                void submitSessionReport(event);
            });
        }
        if (els.reportsTableBody) {
            els.reportsTableBody.addEventListener('click', (event) => {
                void handleReportsTableAction(event);
            });
        }
        if (els.refreshReportsBtn) {
            els.refreshReportsBtn.addEventListener('click', () => {
                renderReportsTable();
                renderActivityTable();
                showMessage('Reports refreshed.', 'success');
            });
        }

        if (els.addPermissionUserForm) {
            els.addPermissionUserForm.addEventListener('submit', (event) => {
                void addPermissionAccount(event);
            });
        }
        if (els.permissionsCards) {
            els.permissionsCards.addEventListener('click', (event) => {
                void handlePermissionCardAction(event);
            });
        }
        if (els.refreshPermissionsBtn) {
            els.refreshPermissionsBtn.addEventListener('click', () => {
                renderPermissionsCards();
                showMessage('Permissions refreshed.', 'success');
            });
        }

        if (els.closeDraftModalBtn) {
            els.closeDraftModalBtn.addEventListener('click', closeDraftModal);
        }
        if (els.draftModal) {
            els.draftModal.addEventListener('click', (event) => {
                if (event.target === els.draftModal) {
                    closeDraftModal();
                }
            });
        }
        if (els.saveDraftBtn) {
            els.saveDraftBtn.addEventListener('click', () => {
                void saveDraftFromModal('draft');
            });
        }
        if (els.submitDraftReviewBtn) {
            els.submitDraftReviewBtn.addEventListener('click', () => {
                void saveDraftFromModal('in_review');
            });
        }
        if (els.approveDraftBtn) {
            els.approveDraftBtn.addEventListener('click', () => {
                void approveDraftFromModal();
            });
        }
        if (els.requestChangesDraftBtn) {
            els.requestChangesDraftBtn.addEventListener('click', () => {
                void requestChangesFromModal();
            });
        }
        if (els.publishDraftBtn) {
            els.publishDraftBtn.addEventListener('click', () => {
                void publishDraftFromModal();
            });
        }
        if (els.deleteDraftBtn) {
            els.deleteDraftBtn.addEventListener('click', () => {
                void deleteDraftFromModal();
            });
        }
    }

    async function bootstrapDashboard() {
        showMessage('Loading dashboard data...');

        const defaultPermissionsDoc = {
            version: 1,
            updatedAt: new Date().toISOString(),
            accounts: []
        };
        const defaultDraftsDoc = { version: 1, updatedAt: new Date().toISOString(), drafts: [] };
        const defaultReportsDoc = { version: 1, updatedAt: new Date().toISOString(), reports: [] };
        const defaultActivityDoc = { version: 1, updatedAt: new Date().toISOString(), entries: [] };

        await loadDocument('permissions', normalizePermissionsDoc, defaultPermissionsDoc);
        await loadDocument('drafts', normalizeDraftsDoc, defaultDraftsDoc);
        await loadDocument('reports', normalizeReportsDoc, defaultReportsDoc);
        await loadDocument('activity', normalizeActivityDoc, defaultActivityDoc);
        await resolveCurrentAccount();

        showDashboardShell();
        setUserProfileUI();
        configureNavigation();
        renderPermissionsCards();
        renderDraftsTable();
        renderReportsTable();
        renderActivityTable();
        populateReportBookingOptions();
        if (els.reportSessionDate && !els.reportSessionDate.value) {
            els.reportSessionDate.value = new Date().toISOString().slice(0, 10);
        }

        if (hasPermission('blogAccess')) {
            await loadPublishedPosts();
        }
        await initializeSessionRecords();
        populateReportBookingOptions();
        renderPublishedPostsTable();
        renderSessionRows();
        renderDashboardMetrics();

        if (!findAccountForUser()) {
            showMessage('Your account is logged in but not yet authorized for employee tools. Ask an admin to grant access.', 'error');
        } else {
            showMessage('', 'info');
            await logActivity('login', 'auth', state.githubUser?.login || '', 'Dashboard session started');
        }
    }

    async function initialize() {
        cacheElements();
        bindEvents();

        state.githubToken = sessionStorage.getItem('github_token');
        let sessionUser = null;
        try {
            sessionUser = JSON.parse(sessionStorage.getItem('github_user') || 'null');
        } catch (error) {
            sessionUser = null;
        }
        state.githubUser = sessionUser;

        if (!state.githubToken) {
            showAuthScreen();
            return;
        }

        try {
            await verifyTokenAndLoadUser();
            await bootstrapDashboard();
        } catch (error) {
            console.error('Dashboard bootstrap error:', error);
            handleLogout();
            showAuthScreen(error.message || 'Unable to initialize admin dashboard.');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            void initialize();
        });
    } else {
        void initialize();
    }
})();
