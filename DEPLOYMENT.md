# Deployment Guide - Wireless Income Ledger

This guide will help you deploy the Wireless Income Ledger to Vercel as an internal tool.

## Prerequisites

- GitHub account (already set up ✅)
- Vercel account (free - sign up at https://vercel.com)
- Supabase credentials (already configured ✅)

## Step-by-Step Deployment to Vercel

### 1. Create a Vercel Account

1. Go to https://vercel.com
2. Click "Sign Up"
3. Choose "Continue with GitHub" (recommended)
4. Authorize Vercel to access your GitHub repositories

### 2. Import Your Project

1. Once logged in to Vercel, click "Add New..." → "Project"
2. Find and select the `wireless-income-ledger` repository
3. Click "Import"

### 3. Configure Your Project

Vercel will automatically detect that this is a Vite project. You'll need to:

1. **Project Name**: Keep it as `wireless-income-ledger` or rename it
2. **Framework Preset**: Should auto-detect as "Vite" ✅
3. **Root Directory**: Leave as `./` (default)
4. **Build Command**: `npm run build` (auto-detected)
5. **Output Directory**: `dist` (auto-detected)

### 4. Add Environment Variables

Click "Environment Variables" and add the following:

| Key | Value |
|-----|-------|
| `VITE_SUPABASE_URL` | `https://hlmbywptyzprgnpodynd.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsbWJ5d3B0eXpwcmducG9keW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNzgzOTcsImV4cCI6MjA3Nzc1NDM5N30.NMxAJ31F1rCo9MCIaKdRgn9Yo10ufKbV6cFnuSMXuOE` |

**Note**: Make sure to add these to all environments (Production, Preview, Development)

### 5. Deploy

1. Click "Deploy"
2. Wait for the build to complete (usually 1-2 minutes)
3. Once complete, you'll get a URL like: `https://wireless-income-ledger.vercel.app`

### 6. Configure Supabase (Important!)

After deployment, you need to add your Vercel domain to Supabase's allowed URLs:

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `hlmbywptyzprgnpodynd`
3. Go to "Authentication" → "URL Configuration"
4. Add your Vercel URL to "Site URL" and "Redirect URLs":
   - `https://wireless-income-ledger.vercel.app` (or your custom domain)
   - `https://wireless-income-ledger.vercel.app/**`

### 7. Test Your Deployment

1. Visit your deployed URL
2. Try logging in with your credentials
3. Test uploading a CSV file
4. Verify all features work correctly

## Custom Domain (Optional)

To use a custom domain:

1. In Vercel, go to your project settings
2. Click "Domains"
3. Add your custom domain (e.g., `commissions.yourcompany.com`)
4. Follow the DNS configuration instructions
5. Update Supabase redirect URLs with your custom domain

## Automatic Deployments

Vercel automatically deploys when you:
- Push to `main` branch (production deployment)
- Open a pull request (preview deployment)

## Troubleshooting

### Build Fails
- Check that all environment variables are set correctly
- Verify Node.js version compatibility (Vercel uses Node 18+ by default)

### Authentication Issues
- Make sure Vercel domain is added to Supabase redirect URLs
- Check that environment variables are correctly set

### 404 Errors on Refresh
- Vercel should handle this automatically with Vite
- If issues persist, create a `vercel.json` with rewrite rules

## Security Notes for Internal Tool

1. **User Access Control**: Only invite authorized users to your Supabase project
2. **Environment Variables**: Never commit `.env` files to git (already in `.gitignore`)
3. **Row Level Security**: Already implemented in Supabase (users can only see their own data)
4. **Password Protection**: Consider adding Vercel's password protection feature:
   - Go to Settings → General → Password Protection
   - Enable and set a password for your team

## Support

- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Project Issues: https://github.com/ZMAWline/wireless-income-ledger/issues

---

**Estimated Setup Time**: 10-15 minutes

Your internal tool will be live at: `https://wireless-income-ledger.vercel.app`
