# Deployment Guide

This guide covers multiple ways to host your PictureTales app on GitHub and other platforms.

## Prerequisites

1. Push your code to a GitHub repository
2. Ensure you have a GitHub account
3. Make sure all environment variables are properly configured

## Option 1: GitHub Pages (Free, Static Only)

### Steps:
1. **Push your code to GitHub:**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/picture-tales.git
   git push -u origin main
   ```

2. **Enable GitHub Pages:**
   - Go to your repository settings
   - Scroll to "Pages" section
   - Select "GitHub Actions" as source
   - The workflow will automatically deploy your app

3. **Access your app:**
   - Your app will be available at: `https://yourusername.github.io/picture-tales/`

### Limitations:
- No server-side features (API routes won't work)
- No authentication features
- Static export only

## Option 2: Vercel (Recommended - Full Features)

### Steps:
1. **Push to GitHub** (same as above)
2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with your GitHub account
   - Import your repository
   - Vercel will automatically detect it's a Next.js app
   - Click "Deploy"

3. **Configure Environment Variables:**
   - In Vercel dashboard, go to Project Settings > Environment Variables
   - Add any required environment variables (API keys, etc.)

### Benefits:
- Full Next.js features (API routes, server-side rendering)
- Automatic deployments on git push
- Free tier with generous limits
- Built-in analytics and performance monitoring

## Option 3: Netlify

### Steps:
1. **Push to GitHub** (same as above)
2. **Connect to Netlify:**
   - Go to [netlify.com](https://netlify.com)
   - Sign up with your GitHub account
   - Click "Add new site" > "Import an existing project"
   - Select your repository
   - Build settings are automatically configured via `netlify.toml`

## Environment Variables

For any deployment option, you'll need to configure these environment variables:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Google AI API Key
GOOGLE_GENAI_API_KEY=your_google_ai_key
```

## Recommendations

1. **For Development/Portfolio:** Use GitHub Pages (free, simple)
2. **For Production/Full Features:** Use Vercel (best Next.js support)
3. **For Alternative:** Use Netlify (good performance, easy setup)

## Troubleshooting

### Common Issues:
1. **Build Failures:** Check that all dependencies are in package.json
2. **Environment Variables:** Ensure all required env vars are set
3. **Image Optimization:** For static export, images must be unoptimized
4. **Routing Issues:** Ensure proper trailing slashes for static export

### Build Commands:
- **Development:** `npm run dev`
- **Production Build:** `npm run build`
- **Static Export:** Automatically handled with current config
