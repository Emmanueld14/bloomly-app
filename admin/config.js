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

// Appointments (Charla) configuration.
// Admin password is primarily entered at unlock (sessionStorage), with this value as fallback.
const APPOINTMENTS_CONFIG = {
    apiBase: '/api',
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
export { GITHUB_CONFIG, APPOINTMENTS_CONFIG, ADMIN_DASHBOARD_CONFIG };

