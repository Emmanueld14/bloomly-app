# Bloomly - Mental Wellbeing Companion

A comprehensive mental wellness platform built with React and Supabase, featuring AI-powered support, journaling, mood tracking, and more.

## Features

- 🤖 **AI Therapist (Deborah)** - Personalized mental health support
- 📔 **Journaling** - Private journal entries with mood tagging
- 😊 **Mood Tracking** - Track your daily moods and see trends
- 📊 **Progress Tracking** - Visualize your wellness journey
- 📚 **Articles** - Mental health resources and articles
- 🎵 **Soundscapes** - Ambient sounds for relaxation
- 🧘 **Guided Exercises** - Breathing and mindfulness exercises
- 🎯 **Goal Setting** - Set and track personal wellness goals
- 💤 **Sleep Tracking** - Monitor sleep patterns
- ✅ **Habit Tracking** - Build positive habits with streaks

## Tech Stack

- **Frontend**: React, HTML, CSS, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Deployment**: Vercel/Netlify

## Prerequisites

- Node.js 18+ (for local development)
- A Supabase account and project
- Git

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd muhunami
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API
3. Copy your `Project URL` and `anon public` key

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here
```

**Important**: Never commit the `.env` file or expose the service role key in client code.

### 4. Set Up Database

Run the SQL migration in your Supabase project:

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/supabase.sql`
4. Paste and click **Run**

Alternatively, if you have Supabase CLI installed:

```bash
supabase init
supabase link --project-ref your-project-ref
supabase db push
```

### 5. Install Dependencies

```bash
npm install
```

### 6. Run Locally

```bash
npm start
```

The app will be available at `http://localhost:3000`

## Project Structure

```
.
├── index.html              # Main application file
├── login.html              # Login page
├── signup.html             # Signup page
├── script.supabase.js      # Supabase client helper functions
├── supabase/
│   ├── supabase.sql        # Complete database schema
│   └── migrations/         # Migration files
├── scripts/
│   ├── migrate.js          # Migration runner
│   └── smoke-test.js       # Smoke tests
├── .github/workflows/      # CI/CD workflows
├── package.json            # Dependencies and scripts
└── README.md               # This file
```

## Database Schema

The application uses the following main tables:

- `profiles` - User profiles (extends auth.users)
- `notes` - Journal entries
- `moods` - Mood tracking data
- `daily_check_ins` - Daily check-in responses
- `articles` - Published articles (public)
- `chat_messages` - AI chat history
- `habits` - Habit tracking
- `sleep_tracking` - Sleep data
- `goals` - User goals

All tables have Row Level Security (RLS) enabled to ensure users can only access their own data.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import your repository in [Vercel](https://vercel.com)
3. Add environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
4. Deploy

### Netlify

1. Push your code to GitHub
2. Import your repository in [Netlify](https://netlify.com)
3. Add environment variables in Site Settings → Environment Variables
4. Deploy

### Manual Deployment

1. Build the project: `npm run build`
2. Upload all files to your hosting provider
3. Ensure environment variables are set

## Environment Variables

### Required (Client-side)

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Your Supabase anon/public key

### Required (Server-side/Migrations)

- `SUPABASE_SERVICE_KEY` - Your Supabase service role key (NEVER expose in client code)

## Testing

Run smoke tests to verify Supabase integration:

```bash
npm test
```

This will test:
- User sign up
- User sign in
- Note creation
- Note retrieval
- Row Level Security

## Security Notes

- ✅ Row Level Security (RLS) is enabled on all tables
- ✅ Users can only access their own data
- ✅ Service role key is never exposed to clients
- ✅ All authentication is handled by Supabase Auth

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

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT

## Support

For issues or questions:
1. Check the [Supabase documentation](https://supabase.com/docs)
2. Review error messages in browser console
3. Check Supabase project logs

## Next Steps After Deployment

1. ✅ Create Supabase project
2. ✅ Run database migrations
3. ✅ Set environment variables in deployment platform
4. ✅ Test authentication flow
5. ✅ Test all features
6. ✅ Set up custom domain (optional)
7. ✅ Configure email templates in Supabase (optional)

