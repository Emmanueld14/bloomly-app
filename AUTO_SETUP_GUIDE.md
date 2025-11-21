# Automated Setup Guide

This guide explains how to use the automated setup scripts to configure your Supabase integration.

## Quick Start

### Option 1: Full Automated Setup (Recommended)

If you already have Supabase credentials:

1. **Create `.env` file** with your credentials:
   ```bash
   npm run create-env
   ```
   Or manually create `.env`:
   ```env
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_KEY=your-service-key
   ```

2. **Run automated setup**:
   ```bash
   npm run setup
   ```

This will:
- ✅ Test Supabase connection
- ✅ Verify database schema
- ✅ Create configuration files
- ⚠️  Guide you through running migrations (manual step)

### Option 2: Step-by-Step Setup

1. **Get Supabase credentials**:
   - Go to https://app.supabase.com
   - Create a new project (or use existing)
   - Go to Settings → API
   - Copy: Project URL, anon public key, service_role key

2. **Create environment file**:
   ```bash
   npm run create-env
   ```

3. **Run setup**:
   ```bash
   npm run setup
   ```

4. **Run migrations**:
   - Go to Supabase SQL Editor
   - Copy contents of `supabase/supabase.sql`
   - Paste and run

## What Gets Automated

### ✅ Automatic Steps

- Connection testing
- Configuration file creation (`.env`, `supabase-config.js`)
- Schema verification
- Read/write operation testing
- Code configuration updates

### ⚠️ Manual Steps Required

- **Creating Supabase project** (if not exists)
  - Go to https://app.supabase.com
  - Click "New Project"
  - Fill in details and wait for creation

- **Running database migrations**
  - Supabase JS client doesn't support raw SQL execution
  - Must be done via SQL Editor or Supabase CLI
  - Copy `supabase/supabase.sql` and run in SQL Editor

- **Setting deployment environment variables**
  - Vercel: Project Settings → Environment Variables
  - Netlify: Site Settings → Environment Variables
  - Add: `SUPABASE_URL`, `SUPABASE_ANON_KEY`

## Scripts Available

- `npm run setup` - Main setup script (requires .env file)
- `npm run setup:full` - Full automated setup attempt
- `npm run create-env` - Interactive .env file creation
- `npm run migrate` - Migration script (requires service key)
- `npm test` - Run smoke tests

## Troubleshooting

### "Environment variables not found"

Create a `.env` file in the project root with your Supabase credentials.

### "Connection test failed"

- Check your `SUPABASE_URL` is correct
- Verify your `SUPABASE_ANON_KEY` is correct
- Ensure your Supabase project is active

### "Tables not found"

Run the migrations manually:
1. Open `supabase/supabase.sql`
2. Copy all contents
3. Go to Supabase SQL Editor
4. Paste and run

### "Migrations couldn't be executed automatically"

This is expected. Supabase JS client doesn't support raw SQL execution. You must:
1. Use Supabase SQL Editor (web interface)
2. Or use Supabase CLI: `supabase db push`

## Next Steps After Setup

1. ✅ Verify all tables exist in Supabase dashboard
2. ✅ Test user sign up
3. ✅ Test user sign in
4. ✅ Test creating a journal entry
5. ✅ Deploy to production
6. ✅ Set environment variables in deployment platform

## Security Notes

- ⚠️ Never commit `.env` file
- ⚠️ Never commit `supabase-config.js` (already in .gitignore)
- ⚠️ Never expose `SUPABASE_SERVICE_KEY` in client code
- ✅ Anon key is safe for client-side use (protected by RLS)

