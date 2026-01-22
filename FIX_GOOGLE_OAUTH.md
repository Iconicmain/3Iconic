# Fix Google OAuth "invalid_client" Error

## Problem
The error `"invalid_client"` with `"Unauthorized"` means your Google Client Secret is missing or incorrect.

## Current Status
Your `.env.local` has:
```
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
```

This is a **placeholder** - you need the **actual secret** from Google Cloud Console.

## Solution

### Step 1: Get Your Google Client Secret

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Select Your Project**
   - If you don't have a project, create one
   - Make sure it's the same project where your OAuth Client ID was created

3. **Navigate to Credentials**
   - Go to: **APIs & Services** → **Credentials**
   - Or use the search bar: search for "Credentials"

4. **Find Your OAuth 2.0 Client ID**
   - Look for the Client ID: `44264577690-4a7ck3n5bp8r68sqd42nlm0ujge5jm3j.apps.googleusercontent.com`
   - Click on it to view details

5. **Copy the Client Secret**
   - You'll see a "Client secret" field
   - Click "Show" or the eye icon to reveal it
   - Copy the entire secret (it's a long string)

### Step 2: Update .env.local

1. **Open `.env.local`** in your project root
2. **Find this line:**
   ```
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   ```
3. **Replace it with:**
   ```
   GOOGLE_CLIENT_SECRET=your_actual_secret_from_google_console
   ```
   (Replace `your_actual_secret_from_google_console` with the secret you copied)

### Step 3: Verify Redirect URIs

Make sure these redirect URIs are added in Google Cloud Console:

1. **In Google Cloud Console** → **APIs & Services** → **Credentials**
2. **Click on your OAuth 2.0 Client ID**
3. **Under "Authorized redirect URIs"**, make sure you have:
   - `http://localhost:3000/api/auth/callback/google` (for local development)
   - `https://3iconic.co.ke/api/auth/callback/google` (for production)
   - `https://www.3iconic.co.ke/api/auth/callback/google` (if you use www)

4. **Click "Save"**

### Step 4: Restart Your Server

After updating `.env.local`:
1. **Stop your development server** (Ctrl+C)
2. **Start it again:**
   ```bash
   npm run dev
   ```
   or
   ```bash
   pnpm dev
   ```

### Step 5: Test

1. Try logging in with Google again
2. The error should be gone
3. You should be able to authenticate successfully

## Common Issues

### "I can't find my Client Secret"
- If you just created the OAuth Client ID, the secret is shown only once
- If you lost it, you'll need to create a new OAuth Client ID and get a new secret

### "The redirect URI doesn't match"
- Make sure the redirect URI in Google Console **exactly** matches: `/api/auth/callback/google`
- It must include the full path, not just the domain

### "Still getting errors after updating"
- Make sure you **restarted the server** after updating `.env.local`
- Check that there are no extra spaces or quotes in the secret
- Verify the secret is the complete string (usually starts with `GOCSPX-`)

## Security Note

⚠️ **Never commit your `.env.local` file to version control!**
- The Google Client Secret is sensitive information
- Keep it private and secure

