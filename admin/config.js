// GitHub OAuth Configuration
// Client ID is public. Client secret must live only on the token-exchange server
// (e.g. Vercel `GITHUB_CLIENT_SECRET` for api/github-auth.js).

const GITHUB_CONFIG = {
    clientId: 'Ov23ligFSm5nzRevPd41',

    // Your repository details
    repoOwner: 'Emmanueld14',
    repoName: 'bloomly-app',
    repoBranch: 'main',
    
    // OAuth redirect URI (must match your GitHub OAuth App settings)
    redirectUri: window.location.origin + '/admin/callback.html',
    
    // GitHub API base URL
    apiBase: 'https://api.github.com',
    
    // Backend API URL for OAuth token exchange
    vercelApiUrl: 'https://bloomly-app.onrender.com/api/github-auth'
};

// Supabase configuration for email notifications
const SUPABASE_CONFIG = {
    url: 'https://xmhyjttyarskimsxcfhl.supabase.co',
    anonKey: 'sb_publishable_IOs-j6rgWuDnwrymIIUHxQ_wCTmcaMp',
    notifyFunctionUrl: 'https://xmhyjttyarskimsxcfhl.supabase.co/functions/v1/notify-subscribers',
    publishPostFunctionUrl: 'https://xmhyjttyarskimsxcfhl.supabase.co/functions/v1/publish-post'
};

// Appointments (Charla) — apiBase only; admin password is entered after login (sessionStorage)
const APPOINTMENTS_CONFIG = {
    apiBase: 'https://xmhyjttyarskimsxcfhl.supabase.co/functions/v1'
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

