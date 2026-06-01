import { handleGitHubOAuthPost, handleGitHubOAuthOptions } from '../lib/github-oauth.js';

export async function onRequestPost(context) {
    return handleGitHubOAuthPost(context);
}

export async function onRequestOptions() {
    return handleGitHubOAuthOptions();
}
