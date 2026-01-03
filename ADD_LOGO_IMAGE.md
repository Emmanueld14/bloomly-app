# Add Logo Image for Google Search Results

## IMPORTANT: You need to add the image file

To make your logo appear on Google search results, you need to:

1. **Save your logo image** as `og-image.png` in the root directory of your project
   - Recommended size: 1200 x 630 pixels (for best Google display)
   - Format: PNG with transparent background (if needed)
   - File name must be exactly: `og-image.png`

2. **Also create a favicon** as `favicon.png` 
   - Size: 512 x 512 pixels (or 32 x 32 for smaller)
   - This appears in browser tabs

3. **Optional: Apple touch icon** as `apple-touch-icon.png`
   - Size: 180 x 180 pixels
   - For iOS devices when users add to home screen

## Steps:

1. Take the exact photo/image you want to use
2. Save it as `og-image.png` in the root folder (same folder as index.html)
3. Save a square version as `favicon.png` (can be the same image cropped)
4. Commit and push to GitHub
5. Cloudflare Pages will deploy it automatically

## Current Setup:

✅ Meta tags are already configured in `index.html`
✅ Open Graph tags are set up
✅ Twitter Card tags are set up
✅ Favicon links are added

**Just add the image files and you're done!**

The meta tags will automatically reference:
- `https://bloomly.co.ke/og-image.png` for Google search results
- `https://bloomly.co.ke/favicon.png` for browser tabs

