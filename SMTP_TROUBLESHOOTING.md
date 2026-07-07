# SMTP Connection Timeout Troubleshooting

## Current Error
```
Error: connect ETIMEDOUT 216.198.79.1:587
```

This means the server cannot connect to `mail.3iconic.co.ke` on port 587.

## Solutions to Try

### Option 1: Try Different SMTP Host
The host might be `3iconic.co.ke` instead of `mail.3iconic.co.ke`

Update `.env.local`:
```env
SMTP_HOST=3iconic.co.ke
SMTP_PORT=587
SMTP_SECURE=false
```

### Option 2: Try Port 465 (SSL)
Some cPanel servers use port 465 with SSL instead of 587 with TLS.

Update `.env.local`:
```env
SMTP_HOST=mail.3iconic.co.ke
SMTP_PORT=465
SMTP_SECURE=true
```

Or try:
```env
SMTP_HOST=3iconic.co.ke
SMTP_PORT=465
SMTP_SECURE=true
```

### Option 3: Check cPanel Email Settings
1. Log into your cPanel
2. Go to **Email Accounts** → Click **Connect Devices** next to `customers@3iconic.co.ke`
3. Check the **Mail Client Manual Settings** section
4. Note the exact:
   - **SMTP Host** (might be `mail.3iconic.co.ke`, `3iconic.co.ke`, or something else)
   - **SMTP Port** (usually 587 or 465)
   - **Security** (SSL/TLS)

### Option 4: Test SMTP Connection
You can test the SMTP connection using a tool like:
- **Telnet**: `telnet mail.3iconic.co.ke 587` (or port 465)
- **Online SMTP tester**: https://www.smtper.net/

### Option 5: Check Firewall/Network
- Port 587 or 465 might be blocked by your firewall
- Your hosting provider might require whitelisting your server IP
- Some networks block SMTP ports

### Option 6: Contact Hosting Provider
If none of the above work, contact your hosting provider to:
- Verify SMTP is enabled for your account
- Get the correct SMTP host and port
- Check if there are any IP restrictions
- Verify the email account credentials

## Quick Test Configurations

Try these one by one in your `.env.local`:

**Config 1:**
```env
SMTP_HOST=3iconic.co.ke
SMTP_PORT=587
SMTP_SECURE=false
```

**Config 2:**
```env
SMTP_HOST=mail.3iconic.co.ke
SMTP_PORT=465
SMTP_SECURE=true
```

**Config 3:**
```env
SMTP_HOST=3iconic.co.ke
SMTP_PORT=465
SMTP_SECURE=true
```

After each change, **restart your server** and try submitting an application again.

