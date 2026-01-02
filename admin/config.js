// GitHub OAuth Configuration
// IMPORTANT: Replace these with your GitHub OAuth App credentials
// Get them from: https://github.com/settings/developers

const GITHUB_CONFIG = {
    // Your GitHub OAuth App Client ID
    clientId: 'Ov23ligFSm5nzRevPd41',
    
    // Your GitHub OAuth App Client Secret (keep this secure!)
    // Note: In production, this should be stored server-side, but for simplicity
    // we'll use it client-side. Consider using environment variables or a backend.
    clientSecret: 'c0a23cbd55971a7270d4def0c3384c7d96e74404',
    
    // Your repository details
    repoOwner: 'Emmanueld14',
    repoName: 'bloomly-app',
    repoBranch: 'main',
    
    // OAuth redirect URI (must match your GitHub OAuth App settings)
    redirectUri: window.location.origin + '/admin/callback.html',
    
    // GitHub API base URL
    apiBase: 'https://api.github.com'
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GITHUB_CONFIG;
}

