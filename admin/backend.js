/**
 * Custom Backend Adapter for Netlify CMS
 * Connects Netlify CMS to our custom API endpoints
 */

(function() {
  'use strict';

  const API_BASE = '/.netlify/functions';

  // Custom Backend implementation
  class CustomBackend {
    constructor(config) {
      this.config = config;
    }

    async authenticate() {
      // Simple authentication - you can enhance this later
      return Promise.resolve();
    }

    async entriesByFolder(collection, folder) {
      try {
        const response = await fetch(`${API_BASE}/get-posts`);
        if (!response.ok) throw new Error('Failed to fetch posts');
        const posts = await response.json();
        
        return posts.map(post => ({
          data: {
            title: post.title,
            date: post.date,
            category: post.category,
            summary: post.summary,
            featuredImage: post.featuredImage,
            body: post.body,
            emoji: post.emoji,
            slug: post.slug,
          },
          file: {
            path: `content/blog/${post.slug}.md`,
            id: post.id,
            slug: post.slug,
          },
        }));
      } catch (error) {
        console.error('Error fetching entries:', error);
        return [];
      }
    }

    async getEntry(collection, slug, path) {
      try {
        const response = await fetch(`${API_BASE}/get-post?slug=${slug}`);
        if (!response.ok) throw new Error('Failed to fetch post');
        const post = await response.json();
        
        return {
          data: {
            title: post.title,
            date: post.date,
            category: post.category,
            summary: post.summary,
            featuredImage: post.featuredImage,
            body: post.body,
            emoji: post.emoji,
            slug: post.slug,
          },
          file: {
            path: `content/blog/${post.slug}.md`,
            id: post.id,
            slug: post.slug,
          },
        };
      } catch (error) {
        console.error('Error fetching entry:', error);
        throw error;
      }
    }

    async persistEntry(entry) {
      try {
        const data = entry.data;
        const slug = data.slug || data.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        const postData = {
          title: data.title,
          date: data.date || new Date().toISOString(),
          category: data.category || 'Mental Health',
          summary: data.summary || '',
          emoji: data.emoji || '💙',
          featuredImage: data.featuredImage || '',
          body: data.body,
          slug: slug,
        };

        // Check if this is an update or create
        const existingResponse = await fetch(`${API_BASE}/get-post?slug=${slug}`);
        const isUpdate = existingResponse.ok;

        const url = isUpdate ? `${API_BASE}/update-post` : `${API_BASE}/create-post`;
        const method = isUpdate ? 'PUT' : 'POST';

        if (isUpdate) {
          const existingPost = await existingResponse.json();
          postData.id = existingPost.id;
        }

        const response = await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postData),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save post');
        }

        const result = await response.json();
        return {
          data: result.post,
          file: {
            path: `content/blog/${slug}.md`,
            id: result.post.id,
            slug: slug,
          },
        };
      } catch (error) {
        console.error('Error persisting entry:', error);
        throw error;
      }
    }

    async deleteEntry(collection, slug, path) {
      try {
        const response = await fetch(`${API_BASE}/get-post?slug=${slug}`);
        if (!response.ok) throw new Error('Post not found');
        const post = await response.json();

        const deleteResponse = await fetch(`${API_BASE}/delete-post`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ id: post.id, slug: slug }),
        });

        if (!deleteResponse.ok) {
          const error = await deleteResponse.json();
          throw new Error(error.error || 'Failed to delete post');
        }

        return true;
      } catch (error) {
        console.error('Error deleting entry:', error);
        throw error;
      }
    }

    async getMedia() {
      // Media handling - return empty for now
      return [];
    }

    async persistMedia(file) {
      // Media upload handling - you can enhance this later
      return {
        url: file.url || `/uploads/${file.name}`,
        path: `/uploads/${file.name}`,
      };
    }
  }

  // Register the custom backend
  if (typeof window !== 'undefined' && window.CMS) {
    window.CMS.registerBackend('custom', CustomBackend);
  }

})();

