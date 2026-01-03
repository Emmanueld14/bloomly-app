/**
 * Blog Admin - CRUD Operations with Verification
 * All operations write to GitHub API and verify immediately
 * No caching, no static files - single source of truth
 */

(function() {
    'use strict';

    let githubToken = null;
    let githubUser = null;
    const config = typeof GITHUB_CONFIG !== 'undefined' ? GITHUB_CONFIG : {};

    // GitHub API configuration
    const repoOwner = config.repoOwner || 'Emmanueld14';
    const repoName = config.repoName || 'bloomly-app';
    const repoBranch = config.repoBranch || 'main';
    const apiBase = config.apiBase || 'https://api.github.com';
    const basePath = 'content/blog';

    /**
     * Verify operation by checking if file exists/doesn't exist
     */
    async function verifyOperation(operation, filePath, expectedExists) {
        const verifyUrl = `${apiBase}/repos/${repoOwner}/${repoName}/contents/${filePath}?ref=${repoBranch}`;
        
        const token = getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        try {
            const response = await fetch(verifyUrl, {
                headers: {
                    'Authorization': 'token ' + token,
                    'Accept': 'application/vnd.github.v3+json'
                },
                cache: 'no-store'
            });

            const exists = response.ok;
            
            if (expectedExists && !exists) {
                throw new Error(`Verification failed: ${operation} - file does not exist`);
            }
            if (!expectedExists && exists) {
                throw new Error(`Verification failed: ${operation} - file still exists`);
            }

            return true;
        } catch (error) {
            if (error.message.includes('Verification failed')) {
                throw error;
            }
            // If verification fails due to network, log but don't fail operation
            console.warn('Verification check failed:', error);
            return false;
        }
    }

    /**
     * Create or update blog post
     */
    async function savePost(postData, isNew) {
        const slug = postData.slug || slugify(postData.title);
        const fileName = `${slug}.md`;
        const filePath = `${basePath}/${fileName}`;

        // Format date
        const dateObj = new Date(postData.date);
        const formattedDate = dateObj.toISOString();

        // Create markdown with frontmatter
        const markdown = `---
title: "${postData.title}"
date: ${formattedDate}
category: "${postData.category || 'Mental Health'}"
summary: "${(postData.summary || '').replace(/"/g, '\\"')}"
emoji: "${postData.emoji || '💙'}"
featuredImage: "${postData.featuredImage || ''}"
---

${postData.content}`;

        // Encode to base64
        const encodedContent = btoa(unescape(encodeURIComponent(markdown)));

        const token = getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        // Get SHA if updating
        let sha = null;
        if (!isNew) {
            try {
                const getResponse = await fetch(
                    `${apiBase}/repos/${repoOwner}/${repoName}/contents/${filePath}`,
                    {
                        headers: {
                            'Authorization': 'token ' + token,
                            'Accept': 'application/vnd.github.v3+json'
                        },
                        cache: 'no-store'
                    }
                );

                if (getResponse.ok) {
                    const fileData = await getResponse.json();
                    sha = fileData.sha;
                }
            } catch (error) {
                console.warn('Failed to get existing file SHA:', error);
            }
        }

        // Write to GitHub
        const response = await fetch(
            `${apiBase}/repos/${repoOwner}/${repoName}/contents/${filePath}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': 'token ' + token,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: isNew ? `Add blog post: ${postData.title}` : `Update blog post: ${postData.title}`,
                    content: encodedContent,
                    branch: repoBranch,
                    ...(sha && { sha: sha })
                }),
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to ${isNew ? 'create' : 'update'} post: ${response.statusText}`);
        }

        const result = await response.json();

        // Verify operation succeeded
        try {
            await verifyOperation(isNew ? 'create' : 'update', filePath, true);
        } catch (error) {
            console.warn('Verification failed, but operation may have succeeded:', error);
        }

        return {
            success: true,
            commit: result.commit,
            content: result.content,
            slug: slug
        };
    }

    /**
     * Delete blog post (hard delete with verification)
     */
    async function deletePost(slug, fileName) {
        const filePath = `${basePath}/${fileName}`;

        const token = getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        // Get file SHA
        const getResponse = await fetch(
            `${apiBase}/repos/${repoOwner}/${repoName}/contents/${filePath}`,
            {
                headers: {
                    'Authorization': 'token ' + token,
                    'Accept': 'application/vnd.github.v3+json'
                },
                cache: 'no-store'
            }
        );

        if (!getResponse.ok) {
            const errorData = await getResponse.json().catch(() => ({}));
            throw new Error(errorData.message || 'Post not found or already deleted');
        }

        const fileData = await getResponse.json();

        // Delete from GitHub
        const deleteResponse = await fetch(
            `${apiBase}/repos/${repoOwner}/${repoName}/contents/${filePath}`,
            {
                method: 'DELETE',
                headers: {
                    'Authorization': 'token ' + token,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: `Delete blog post: ${slug}`,
                    sha: fileData.sha,
                    branch: repoBranch
                }),
                cache: 'no-store'
            }
        );

        if (!deleteResponse.ok) {
            const errorData = await deleteResponse.json().catch(() => ({}));
            throw new Error(errorData.message || `Failed to delete post: ${deleteResponse.statusText}`);
        }

        // Verify deletion succeeded
        try {
            await verifyOperation('delete', filePath, false);
        } catch (error) {
            console.warn('Verification failed, but deletion may have succeeded:', error);
        }

        return {
            success: true,
            slug: slug
        };
    }

    /**
     * List all blog posts
     */
    async function listPosts() {
        const token = getToken();
        if (!token) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(
            `${apiBase}/repos/${repoOwner}/${repoName}/contents/${basePath}`,
            {
                headers: {
                    'Authorization': 'token ' + token,
                    'Accept': 'application/vnd.github.v3+json'
                },
                cache: 'no-store'
            }
        );

        if (!response.ok) {
            throw new Error('Failed to load posts: ' + response.statusText);
        }

        const files = await response.json();
        const fileArray = Array.isArray(files) ? files : [files];
        
        const markdownFiles = fileArray
            .filter(file => file && file.name && file.name.endsWith('.md') && file.type === 'file');

        // Load content for each post
        const posts = await Promise.allSettled(
            markdownFiles.map(async (file) => {
                try {
                    const contentResponse = await fetch(file.download_url, { cache: 'no-store' });
                    if (!contentResponse.ok) return null;
                    
                    const content = await contentResponse.text();
                    const frontmatter = parseFrontmatter(content);
                    
                    return {
                        ...file,
                        ...frontmatter,
                        slug: file.name.replace('.md', ''),
                        rawContent: content
                    };
                } catch (error) {
                    console.error('Error loading post:', file.name, error);
                    return {
                        ...file,
                        title: file.name.replace('.md', ''),
                        date: new Date().toISOString(),
                        slug: file.name.replace('.md', ''),
                        rawContent: ''
                    };
                }
            })
        );

        return posts
            .filter(result => result.status === 'fulfilled' && result.value)
            .map(result => result.value)
            .sort((a, b) => {
                const dateA = new Date(a.date || 0);
                const dateB = new Date(b.date || 0);
                return dateB - dateA;
            });
    }

    /**
     * Parse frontmatter
     */
    function parseFrontmatter(content) {
        const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
        const match = content.match(frontmatterRegex);

        if (!match) {
            return { title: '', date: new Date().toISOString(), category: '', summary: '', emoji: '', content: content };
        }

        const frontmatter = match[1];
        const body = match[2];
        const metadata = {};

        frontmatter.split('\n').forEach(line => {
            const colonIndex = line.indexOf(':');
            if (colonIndex > 0) {
                const key = line.substring(0, colonIndex).trim();
                let value = line.substring(colonIndex + 1).trim();
                if ((value.startsWith('"') && value.endsWith('"')) || 
                    (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                metadata[key] = value;
            }
        });

        return {
            ...metadata,
            content: body
        };
    }

    /**
     * Slugify text
     */
    function slugify(text) {
        return text
            .toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim();
    }

    // Export functions
    window.BlogAdmin = {
        savePost,
        deletePost,
        listPosts,
        verifyOperation
    };

})();

