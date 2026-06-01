// GitHub OAuth Configuration
// Client ID is public. Client secret must live only on the token-exchange server
// (e.g. Vercel `GITHUB_CLIENT_SECRET` for api/github-auth.js).

const GITHUB_CONFIG = {
    clientId: 'Ov23ligFSm5nzRevPd41',

    // Your repository details
    repoOwner: 'Emmanueld14',
    repoName: 'bloomly-app',
    repoBranch: 'main',
    
    // Must match GitHub OAuth App → Authorization callback URL exactly
    redirectUri: window.location.origin + '/admin/callback.html',
    
    // GitHub API base URL
    apiBase: 'https://api.github.com',
    
    // OAuth token exchange (Cloudflare Pages: /github-auth or /api/github-auth)
    vercelApiUrl: window.location.origin + '/github-auth',
    oauthFallbackUrls: [
        'https://bloomly-app.onrender.com/api/github-auth',
    ],
};

// Supabase configuration (Edge Functions deploy from GitHub via Supabase integration)
const SUPABASE_CONFIG = {
    url: 'https://xmhyjttyarskimsxcfhl.supabase.co',
    anonKey: 'sb_publishable_IOs-j6rgWuDnwrymIIUHxQ_wCTmcaMp',
    functionsBase: 'https://xmhyjttyarskimsxcfhl.supabase.co/functions/v1',
    notifyFunctionUrl: 'https://xmhyjttyarskimsxcfhl.supabase.co/functions/v1/notify-subscribers',
    publishPostFunctionUrl: 'https://xmhyjttyarskimsxcfhl.supabase.co/functions/v1/publish-post',
    // Admin API routes (Supabase Edge Functions — no Cloudflare env vars required)
    adminRoutes: {
        '/api/admin/stats': 'admin-stats',
        '/api/admin/posts': 'admin-posts',
        '/api/admin/bookings': 'admin-bookings',
        '/api/admin/subscribers': 'admin-subscribers',
        '/api/admin/counsellor-applications': 'admin-counsellor-applications',
        '/api/admin/sync-github-posts': 'admin-sync-github-posts',
    },
};

// Appointments (Charla) configuration.
// Admin password is primarily entered at unlock (sessionStorage), with this value as fallback.
const APPOINTMENTS_CONFIG = {
    apiBase: 'https://xmhyjttyarskimsxcfhl.supabase.co/functions/v1',
    adminKey: 'Manu@4477'
};

// Modular dashboard storage and default admin access
const ADMIN_DASHBOARD_CONFIG = {
    permissionsFilePath: 'content/admin/permissions.json',
    draftsFilePath: 'content/admin/blog-drafts.json',
    reportsFilePath: 'content/admin/session-reports.json',
    activityFilePath: 'content/admin/activity-log.json',
    defaultAdminLogins: ['Emmanueld14']
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GITHUB_CONFIG, SUPABASE_CONFIG, APPOINTMENTS_CONFIG, ADMIN_DASHBOARD_CONFIG };
}

