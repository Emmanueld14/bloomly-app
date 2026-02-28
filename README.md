# Bloomly - Teen Mental Health Platform

A modern, teen-friendly website for mental health awareness, support, and resources. Built with clean HTML, CSS, and JavaScript, featuring Netlify CMS for easy content management.

## Features

- 🏠 **Home Page** - Welcoming hero section with mission and wellness tips
- 📖 **About Page** - Manuel's personal story and Bloomly's values
- 📝 **Blog** - Mental health articles with dynamic loading
- 🎨 **Modern Design** - Glassmorphism, gradients, and smooth animations
- 📱 **Fully Responsive** - Mobile-first design that works on all devices
- 🔐 **Netlify CMS** - Easy content management for blog posts

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **CMS**: Netlify CMS with Git Gateway
- **Deployment**: Netlify
- **Styling**: Custom CSS with glassmorphism effects

## Project Structure

```
.
├── index.html              # Homepage
├── about.html              # About page with Manuel's story
├── blog.html               # Blog listing page
├── blog/                   # Individual blog post pages
├── content/blog/           # Blog post markdown files (CMS managed)
├── static/admin/           # Netlify CMS admin interface
├── public/uploads/         # Uploaded images
├── styles.css              # Main stylesheet
├── script.js               # Main JavaScript
├── blog-loader.js          # Dynamic blog post loader
├── logo.svg                # Bloomly butterfly logo
└── netlify.toml            # Netlify configuration
```

## Quick Start

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/Emmanueld14/bloomly-app.git
cd bloomly-app
```

2. Serve locally:
```bash
npx serve . -p 3000
```

3. Open `http://localhost:3000` in your browser

### Deploy to Netlify

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Enable Netlify Identity in your Netlify dashboard
4. Enable Git Gateway
5. Your site will auto-deploy

## Supabase Setup (Charla + newsletter + interactions)

If you want database-backed features (Charla bookings, likes/comments, and
newsletter/post notifications), follow:

- [SUPABASE_SETUP.md](./SUPABASE_SETUP.md)

That guide includes migration, environment variables, and Edge Function deploy
steps.

## Content Management

### Accessing the CMS

1. Deploy your site to Netlify
2. Navigate to `yoursite.com/admin`
3. Log in with Netlify Identity
4. Start creating and editing blog posts!

### Creating Blog Posts

Blog posts are stored as Markdown files in `/content/blog/`. You can:

- Create posts via the CMS admin interface at `/admin`
- Or manually create `.md` files with frontmatter:

```markdown
---
title: "Your Post Title"
date: 2025-01-20T10:00:00.000Z
category: "Category Name"
summary: "Short description"
emoji: "💙"
featuredImage: ""
---

Your post content in Markdown...
```

## Design System

### Colors
- **Soft Blue**: `#5FA8FF`
- **Blossom Pink**: `#FF78B9`
- **Lilac**: `#C8A7FF`
- **Glass White**: `rgba(255, 255, 255, 0.3)`

### Typography
- **Headings**: Nunito (Google Fonts)
- **Body**: Poppins (Google Fonts)

### Features
- Glassmorphic cards with backdrop blur
- Smooth scroll animations
- Floating shape animations
- Responsive grid layouts
- Mobile-first design

## Pages

- **Home** (`index.html`) - Hero, mission, features, wellness tips
- **About** (`about.html`) - Manuel's story, values, how we help
- **Blog** (`blog.html`) - Dynamic blog listing with glassmorphic cards
- **Blog Posts** (`blog/[slug].html`) - Individual blog post pages

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT

## Support

For questions or issues, please contact: support@bloomly.co.ke

---

Built with ❤️ for teens navigating mental health challenges.
