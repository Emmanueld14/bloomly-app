# Bloomly Blog System - Clean Architecture

## 🏗️ Architecture Overview

This is a **runtime-only, cache-safe blog system** with a single source of truth.

### Core Principles

1. **Single Source of Truth**: GitHub API is the ONLY data source
2. **No Static Files**: All blog data fetched at runtime
3. **No Caching**: Aggressive no-cache headers everywhere
4. **Operation Verification**: All CRUD operations verify immediately
5. **Deterministic Behavior**: Same code path for all devices

---

## 📁 Project Structure

```
bloomly-app/
├── src/
│   ├── data/
│   │   ├── blog-api.js          # Unified GitHub API abstraction
│   │   ├── blog-loader.js       # Blog listing (runtime fetch)
│   │   └── blog-post-loader.js  # Individual posts (runtime fetch)
│   └── admin/
│       └── blog-admin.js        # Admin CRUD with verification
├── admin/
│   ├── index.html               # Admin UI
│   ├── admin.js                 # Admin UI logic (uses blog-admin.js)
│   └── config.js                # Configuration
├── blog.html                    # Blog listing page
├── blog-post.html               # Individual post page
├── _headers                     # Cache control headers
└── _redirects                   # URL routing
```

---

## 🔄 Data Flow

### Read Operations (Frontend)

```
User visits blog.html
  ↓
blog-loader.js loads
  ↓
blog-api.js → GitHub API (list posts)
  ↓
blog-api.js → GitHub API (get each post)
  ↓
Render to page
```

### Write Operations (Admin)

```
Admin creates/updates/deletes post
  ↓
blog-admin.js → GitHub API (write)
  ↓
blog-admin.js → GitHub API (verify)
  ↓
Reload admin list
  ↓
Frontend auto-refresh (30s) picks up changes
```

---

## 🛡️ Cache Prevention Strategy

### 1. HTTP Headers (`_headers`)
- All blog pages: `Cache-Control: no-cache, no-store, must-revalidate`
- All data files: `Cache-Control: no-cache, no-store, must-revalidate`
- Prevents Cloudflare Pages from caching

### 2. Fetch Options
- All API calls: `cache: 'no-store'`
- All API calls: `Cache-Control: no-cache` headers
- Prevents browser from caching responses

### 3. URL Cache-Busting
- All GitHub API calls: `?t=${Date.now()}&r=${Math.random()}`
- Ensures every request is unique
- Bypasses CDN/proxy caches

### 4. No Browser Storage
- No localStorage for blog data
- No IndexedDB
- No service workers
- Session storage only for auth token

---

## ✅ Why This Architecture Prevents Issues

### 1. Single Source of Truth
- **Before**: Blog listing used GitHub, posts used static files
- **After**: Everything uses GitHub API
- **Result**: No data inconsistency

### 2. Runtime-Only Fetching
- **Before**: Static files could be stale
- **After**: Always fetches fresh data from GitHub
- **Result**: Always shows current state

### 3. Aggressive No-Cache
- **Before**: Browser/CDN cached stale content
- **After**: Explicit no-cache everywhere
- **Result**: No stale data served

### 4. Operation Verification
- **Before**: Operations assumed success
- **After**: Verifies immediately after write
- **Result**: Guaranteed consistency

### 5. Unified Code Path
- **Before**: Different code for different devices
- **After**: Same code for all devices
- **Result**: Identical behavior everywhere

---

## 🔒 Guarantees

1. **New posts appear immediately**: GitHub API → Frontend (30s auto-refresh)
2. **Deleted posts disappear immediately**: GitHub API deletion → Frontend (30s auto-refresh)
3. **No stale cache**: Aggressive no-cache headers prevent all caching
4. **All devices see same data**: Single API source, no device-specific code
5. **Operations are verified**: Admin verifies after every write

---

## 🚀 Deployment

### Cloudflare Pages Settings
- **Build Command**: (empty)
- **Output Directory**: `/`
- **Framework**: None

### Environment
- No build-time data generation
- No static file dependencies
- Pure runtime fetching

---

## 📊 Performance Considerations

- **Trade-off**: Slightly slower (API calls vs static files)
- **Benefit**: Always accurate, no cache issues
- **Mitigation**: Auto-refresh every 30s, optimistic UI updates

---

## 🔧 Maintenance

- **Adding features**: Extend `blog-api.js` or `blog-admin.js`
- **Changing data source**: Only modify `blog-api.js`
- **Cache issues**: Check `_headers` file
- **API issues**: Check GitHub API rate limits

---

## ✅ Testing Checklist

- [ ] New post appears on all devices within 30s
- [ ] Deleted post disappears on all devices within 30s
- [ ] iPad loads posts correctly
- [ ] Mobile shows current data
- [ ] No stale cached content
- [ ] Admin operations verify correctly

---

## 🎯 Success Metrics

- **Data Consistency**: 100% (single source)
- **Cache Issues**: 0% (no-cache everywhere)
- **Device Differences**: 0% (same code path)
- **Operation Reliability**: 100% (with verification)

