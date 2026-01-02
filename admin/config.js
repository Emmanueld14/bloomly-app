// GitHub OAuth Configuration
// IMPORTANT: Replace these with your GitHub OAuth App credentials
// Get them from: https://github.com/settings/developers

const GITHUB_CONFIG = {
    // Your GitHub OAuth App Client ID
    clientId: 'YOUR_GITHUB_CLIENT_ID_HERE',
    
    // Your GitHub OAuth App Client Secret (keep this secure!)
    // Note: In production, this should be stored server-side, but for simplicity
    // we'll use it client-side. Consider using environment variables or a backend.
    clientSecret: 'YOUR_GITHUB_CLIENT_SECRET_HERE',
    
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

