# Environment Variables Setup

Create a `.env.local` file in the root directory with the following variables:

```env
# MongoDB Connection (if not already set)
MONGODB_URI=your_mongodb_connection_string_here

# NextAuth Configuration (v5 beta supports both naming conventions)
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret_here_generate_a_random_string
# Alternative for NextAuth v5:
# AUTH_URL=http://localhost:3000
# AUTH_SECRET=your_nextauth_secret_here_generate_a_random_string

# Google OAuth
GOOGLE_CLIENT_ID=44264577690-4a7ck3n5bp8r68sqd42nlm0ujge5jm3j.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
# Alternative for NextAuth v5:
# AUTH_GOOGLE_ID=44264577690-4a7ck3n5bp8r68sqd42nlm0ujge5jm3j.apps.googleusercontent.com
# AUTH_GOOGLE_SECRET=your_google_client_secret_here
```

## How to get your Google Client Secret:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project (or create a new one)
3. Navigate to "APIs & Services" > "Credentials"
4. Find your OAuth 2.0 Client ID (the one with the Client ID you provided)
5. Click on it to view details
6. Copy the "Client secret" value
7. Add it to your `.env.local` file as `GOOGLE_CLIENT_SECRET`

## Generate NEXTAUTH_SECRET:

You can generate a random secret using:
- Online: https://generate-secret.vercel.app/32
- Or run: `openssl rand -base64 32` in your terminal

## Important Notes:

- Never commit `.env.local` to version control
- Make sure your Google OAuth consent screen is configured
- Add these authorized redirect URIs in Google Console:
  - `http://localhost:3000/api/auth/callback/google` (for local development)
  - `https://3iconic.co.ke/api/auth/callback/google` (for production)
  - `https://www.3iconic.co.ke/api/auth/callback/google` (for production with www)
  
  **IMPORTANT:** The redirect URI must be the exact callback path `/api/auth/callback/google`, not just the base URL!
- For production, update `NEXTAUTH_URL` to your production domain

