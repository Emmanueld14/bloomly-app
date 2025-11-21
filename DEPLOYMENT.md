# Bloomly Deployment Guide

This guide will help you deploy Bloomly to production and configure it for public use.

## Prerequisites

1. Node.js installed on your computer
2. Firebase account (already configured)
3. Firebase CLI installed

## Step 1: Install Firebase CLI

```bash
npm install -g firebase-tools
```

## Step 2: Login to Firebase

```bash
firebase login
```

This will open a browser window for you to authenticate with your Google account.

## Step 3: Configure Firestore Security Rules

1. Open the Firebase Console: https://console.firebase.google.com/
2. Select your project: `bloomly-67dbc`
3. Go to Firestore Database → Rules
4. Copy the contents of `firestore.rules` file
5. Paste into the rules editor
6. Click "Publish"

Alternatively, deploy rules using CLI:
```bash
firebase deploy --only firestore:rules
```

## Step 4: Create Firestore Indexes

1. In Firebase Console, go to Firestore Database → Indexes
2. Click "Create Index"
3. For each index in `firestore.indexes.json`, create the corresponding index:
   - Collection: journals, fields: userId (Ascending), date (Descending)
   - Collection: moods, fields: userId (Ascending), date (Descending)
   - Collection: dailyCheckIns, fields: userId (Ascending), date (Descending)
   - Collection: articles, fields: published (Ascending), createdAt (Descending)
   - Collection: chatMessages, fields: userId (Ascending), timestamp (Ascending)
   - Collection: habits, fields: userId (Ascending), date (Descending)
   - Collection: sleep, fields: userId (Ascending), date (Descending)
   - Collection: goals, fields: userId (Ascending), createdAt (Descending)

Alternatively, deploy indexes using CLI:
```bash
firebase deploy --only firestore:indexes
```

## Step 5: Add Audio Files to Soundscapes

The soundscapes currently use placeholder URLs. To add real audio:

### Option A: Use Firebase Storage (Recommended)

1. Go to Firebase Console → Storage
2. Create a folder called `sounds`
3. Upload your audio files (ocean.mp3, rain.mp3, forest.mp3, fireplace.mp3, space.mp3, piano.mp3)
4. Get the download URLs for each file
5. Update the URLs in `index.html` (around line 6473) in the `soundscapes` array

### Option B: Use Free Audio Sources

1. Download free audio files from:
   - Pixabay (https://pixabay.com/music/)
   - Freesound (https://freesound.org/)
   - YouTube Audio Library (https://www.youtube.com/audiolibrary)
2. Host them on a CDN or your own server
3. Update the URLs in `index.html`

### Option C: Use Web Audio API

You can generate ambient sounds programmatically using the Web Audio API. This requires additional code implementation.

## Step 6: Deploy to Firebase Hosting

```bash
firebase deploy --only hosting
```

Your app will be available at: `https://bloomly-67dbc.web.app`

## Step 7: Configure Custom Domain (Optional)

1. In Firebase Console, go to Hosting
2. Click "Add custom domain"
3. Follow the instructions to verify your domain
4. Update DNS records as instructed

## Step 8: Test Production Deployment

1. Visit your deployed URL
2. Test all features:
   - User registration and login
   - Journal entries
   - Mood tracking
   - Chat with Deborah
   - Soundscapes (verify audio plays)
   - Articles
   - All other features

## Troubleshooting

### Audio not playing
- Check browser console for CORS errors
- Verify audio URLs are accessible
- Ensure audio files are in supported formats (MP3, OGG, WAV)

### Firestore permission errors
- Verify security rules are deployed correctly
- Check that indexes are created
- Ensure users are authenticated before accessing protected data

### Deployment errors
- Verify Firebase CLI is logged in: `firebase login`
- Check project ID matches: `firebase use`
- Ensure all files are in the correct directory

## Post-Deployment Checklist

- [ ] Firestore security rules deployed
- [ ] All Firestore indexes created
- [ ] Audio files uploaded and URLs updated
- [ ] App deployed to Firebase Hosting
- [ ] All features tested in production
- [ ] Custom domain configured (if applicable)
- [ ] Analytics enabled and working
- [ ] Error monitoring set up (optional)

## Support

For issues or questions:
1. Check Firebase Console for error logs
2. Review browser console for client-side errors
3. Check Firestore usage and quotas
4. Review Firebase documentation: https://firebase.google.com/docs

