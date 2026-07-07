# Troubleshooting Email Configuration

## Issue: "Email configuration is missing"

If you see this error, it means the environment variables are not being loaded by Next.js.

## Solution Steps

### 1. Verify .env.local File
Make sure your `.env.local` file in the root directory contains:
```env
SMTP_HOST=mail.3iconic.co.ke
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=customers@3iconic.co.ke
SMTP_PASSWORD=@Iconic@hr.co.ke
CAREERS_EMAIL=careers@3iconic.co.ke
```

### 2. Restart the Development Server
**IMPORTANT**: After adding or modifying `.env.local`, you MUST restart your Next.js development server:

1. Stop the current server (Ctrl+C in the terminal)
2. Start it again: `npm run dev` or `pnpm dev`

Environment variables are only loaded when the server starts, not during hot reload.

### 3. Check Server Console
After restarting, try submitting an application again. You should see debug logs in the server console showing:
```
Email config check: {
  SMTP_HOST: 'mail.3iconic.co.ke',
  SMTP_PORT: '587',
  SMTP_USER: 'SET',
  SMTP_PASSWORD: 'SET',
  ...
}
```

If you see "NOT SET" for any variable, the environment variable is not being loaded.

### 4. Verify File Location
The `.env.local` file must be in the **root directory** of your project (same level as `package.json`, `next.config.mjs`, etc.)

### 5. Check for Syntax Errors
Make sure there are no syntax errors in `.env.local`:
- No spaces around the `=` sign
- No quotes needed (unless the value contains spaces)
- Each variable on its own line
- No trailing spaces

### 6. Alternative: Use .env File
If `.env.local` doesn't work, try creating a `.env` file with the same content (though `.env.local` is preferred as it's git-ignored).

### 7. Production Deployment
For production (Vercel, etc.), add these environment variables in your hosting platform's dashboard:
- Go to your project settings
- Find "Environment Variables" section
- Add each variable manually

## Common Issues

### Issue: Variables show as "NOT SET" after restart
- Check that `.env.local` is in the root directory
- Verify there are no typos in variable names
- Make sure there are no special characters causing issues
- Try removing and re-adding the variables

### Issue: Works locally but not in production
- Environment variables must be set in your hosting platform
- `.env.local` is only for local development
- Use your hosting platform's environment variable settings

### Issue: Password contains special characters
If your password contains special characters like `@`, `#`, `$`, etc., they should work fine in `.env.local` without quotes. However, if you have issues, you can try:
- Escaping special characters
- Using quotes: `SMTP_PASSWORD="@Iconic@hr.co.ke"` (though usually not needed)

## Testing

After fixing the configuration:
1. Restart the server
2. Check server console for the debug output
3. Submit a test application
4. Check server logs for any email sending errors

