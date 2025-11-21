# Supabase Migration Guide

This document outlines the migration from Firebase to Supabase and provides setup instructions.

## What Was Changed

### 1. Database Migration
- **From**: Firebase Firestore (NoSQL)
- **To**: Supabase PostgreSQL (SQL)
- **Schema**: Complete database schema created in `supabase/supabase.sql`
- **RLS**: Row Level Security policies implemented for all tables

### 2. Authentication
- **From**: Firebase Auth
- **To**: Supabase Auth
- **Files Updated**: `login.html`, `signup.html`, `index.html`
- **Compatibility**: Firebase compatibility layer maintains backward compatibility

### 3. Client Library
- **From**: Firebase SDK v10
- **To**: Supabase JS Client v2
- **Helper Functions**: `script.supabase.js` provides clean API
- **Compatibility Layer**: `script.firebase-compat.js` translates Firebase calls to Supabase

### 4. Storage
- **From**: Firebase Storage
- **To**: Supabase Storage (for future audio files)

## Setup Instructions

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - Project name: `bloomly` (or your choice)
   - Database password: (save this securely)
   - Region: Choose closest to your users
5. Wait for project to be created (2-3 minutes)

### Step 2: Get Your Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) - **KEEP THIS SECRET**

### Step 3: Run Database Migrations

**Option A: Using Supabase SQL Editor (Recommended)**

1. Go to **SQL Editor** in your Supabase dashboard
2. Click **New Query**
3. Open `supabase/supabase.sql` from this repository
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** (or press Ctrl+Enter)
7. Verify all tables were created (check **Table Editor**)

**Option B: Using Supabase CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### Step 4: Configure Environment Variables

**For Local Development:**

Create a `.env` file in the project root:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

**For Vercel Deployment:**

1. Go to your Vercel project settings
2. Navigate to **Environment Variables**
3. Add:
   - `SUPABASE_URL` = your project URL
   - `SUPABASE_ANON_KEY` = your anon key
   - `SUPABASE_SERVICE_KEY` = your service role key (for migrations only)

**For Netlify Deployment:**

1. Go to your Netlify site settings
2. Navigate to **Environment variables**
3. Add the same variables as above

**Important**: Never expose `SUPABASE_SERVICE_KEY` in client-side code!

### Step 5: Update Client Code (if needed)

The compatibility layer should handle most Firebase calls automatically. However, if you need to set environment variables in the browser:

**Option 1: Inject at Build Time (Recommended)**

For Vercel/Netlify, environment variables are automatically available. Update `index.html` to read from `window`:

```javascript
window.SUPABASE_URL = window.SUPABASE_URL || 'YOUR_URL_HERE';
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || 'YOUR_ANON_KEY_HERE';
```

**Option 2: Use Build-time Injection**

For static hosting, you may need to replace placeholders during build:

```bash
# Example build script
sed -i "s|YOUR_SUPABASE_URL|$SUPABASE_URL|g" index.html
sed -i "s|YOUR_SUPABASE_ANON_KEY|$SUPABASE_ANON_KEY|g" index.html
```

### Step 6: Test the Application

1. Start local server: `npm start`
2. Test sign up: Create a new account
3. Test sign in: Log in with your account
4. Test features:
   - Chat with Deborah
   - Create journal entries
   - Track moods
   - View articles

### Step 7: Run Smoke Tests

```bash
npm test
```

This will verify:
- User sign up
- User sign in
- Note creation
- Note retrieval
- Row Level Security

## Database Schema

### Tables Created

1. **profiles** - User profiles (extends auth.users)
2. **notes** - Journal entries
3. **moods** - Mood tracking
4. **daily_check_ins** - Daily check-in responses
5. **articles** - Published articles (public)
6. **chat_messages** - AI chat history
7. **habits** - Habit tracking
8. **sleep_tracking** - Sleep data
9. **goals** - User goals

### Row Level Security (RLS)

All tables have RLS enabled:
- Users can only access their own data
- Articles are publicly readable
- Only admins can create/update/delete articles

## Migration Notes

### Collection Name Changes

- `aiChats` → `chatMessages`
- `journals` → `notes` (also supports `journals` for compatibility)
- Field names updated to snake_case (e.g., `userId` → `user_id`)

### API Differences

**Firebase:**
```javascript
const docRef = doc(db, 'collection', 'id');
const snapshot = await getDoc(docRef);
```

**Supabase:**
```javascript
const { data, error } = await supabase
  .from('collection')
  .select('*')
  .eq('id', 'id')
  .single();
```

The compatibility layer handles these differences automatically.

## Troubleshooting

### "Supabase client not initialized"

- Check that `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set
- Verify `script.supabase.js` is loaded before your app code
- Check browser console for errors

### "Permission denied" errors

- Verify RLS policies are set up correctly
- Check that user is authenticated
- Ensure user_id matches the authenticated user

### Migration errors

- Run SQL manually in Supabase SQL Editor
- Check that all extensions are enabled (uuid-ossp, pgcrypto)
- Verify you're using the service role key for migrations

### Real-time subscriptions not working

- Check that Realtime is enabled in Supabase dashboard
- Verify table has Realtime enabled (Settings → API → Realtime)
- Check browser console for subscription errors

## Next Steps

1. ✅ Set up Supabase project
2. ✅ Run database migrations
3. ✅ Configure environment variables
4. ✅ Test authentication
5. ✅ Test all features
6. ⬜ Set up email templates in Supabase (optional)
7. ⬜ Configure custom domain (optional)
8. ⬜ Set up backup strategy (optional)

## Support

For issues:
1. Check [Supabase documentation](https://supabase.com/docs)
2. Review error messages in browser console
3. Check Supabase project logs
4. Verify RLS policies in Supabase dashboard

