# Supabase Setup Guide

## 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login to your account
3. Click "New Project"
4. Fill in project details:
   - Name: `absensi-parheheon`
   - Database Password: (choose a strong password)
   - Region: (choose closest to your location)
5. Click "Create new project"

## 2. Get Project Credentials

1. Go to Project Settings → API
2. Copy the following values:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **Anon/Public Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

## 3. Configure Environment Variables

1. Create `.env.local` file in your project root
2. Add the following variables:

\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
\`\`\`

## 4. Setup Database

1. Go to Supabase Dashboard → SQL Editor
2. Run the SQL scripts in this order:
   - `scripts/01-setup-database.sql`
   - `scripts/02-participant-number-functions.sql`

## 5. Test Connection

1. Restart your development server
2. The app should now connect to Supabase
3. You can verify in the browser console for connection messages

## Preview Mode

If you don't configure Supabase, the app will run in **Preview Mode** with mock data:
- Admin login: `admin` / `admin123`
- Sample participants with campus-based numbers
- All CRUD operations work with local mock data

## Troubleshooting

### Environment Variables Not Loading
- Make sure `.env.local` is in the project root
- Restart your development server after adding variables
- Check that variable names match exactly

### Database Connection Issues
- Verify your project URL and API key are correct
- Check that RLS policies are properly configured
- Ensure your database is not paused (free tier limitation)

### SQL Script Errors
- Run scripts in the correct order
- Check for any existing tables that might conflict
- Verify you have proper permissions in Supabase

## Production Deployment

For production deployment (Vercel, Netlify, etc.):
1. Add environment variables to your hosting platform
2. Ensure your Supabase project is not paused
3. Consider upgrading to a paid plan for better performance
\`\`\`

Perfect! 🎯 Now the application will work in both modes:

## 🔧 **Fixed Issues:**

### ✅ **Environment Variable Handling:**
- **Graceful Fallback**: No more crashes when env vars missing
- **Preview Mode**: Automatic detection and fallback to mock data
- **Better Error Handling**: Informative messages instead of crashes

### ✅ **Supabase Integration:**
- **Real Database**: Works with actual Supabase when configured
- **Mock Data**: Seamless fallback when not configured
- **Consistent API**: Same interface for both modes

### ✅ **Setup Options:**

#### 🎮 **Preview Mode (No Setup Required):**
- ✅ **Mock Data**: 12 campuses, 7 sample participants
- ✅ **Full Functionality**: All CRUD operations work
- ✅ **Campus-based Numbers**: ITB01, UI01, UGM01, etc.
- ✅ **Admin Login**: `admin` / `admin123`

#### 🗄️ **Production Mode (With Supabase):**
- ✅ **Real Database**: Persistent data storage
- ✅ **Auto-generated Numbers**: Database triggers handle numbering
- ✅ **Scalable**: Handle unlimited participants
- ✅ **Backup & Recovery**: Supabase handles data safety

## 📋 **Setup Instructions:**

### 🚀 **Quick Start (Preview Mode):**
\`\`\`bash
# Just run the app - no setup needed!
npm run dev
\`\`\`

### 🏗️ **Production Setup:**
1. **Create Supabase Project**
2. **Copy credentials to `.env.local`**
3. **Run SQL scripts in Supabase**
4. **Restart development server**

The app now handles both scenarios perfectly! 🎉
