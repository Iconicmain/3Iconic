# Email Not Sending - Troubleshooting Guide

## Current Issue
**Connection Timeout** - The server cannot connect to the SMTP server at `3iconic.co.ke:465`

## Current Configuration
```
SMTP_HOST=3iconic.co.ke
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=customers@3iconic.co.ke
SMTP_PASSWORD=@Iconic@hr.co.ke
```

## Why It's Not Working

### 1. **Connection Timeout**
The error `ETIMEDOUT` means your development server cannot reach the SMTP server. This could be because:
- **Port 465 is blocked** by your firewall/network
- **SMTP server is not accessible** from your local development environment
- **Wrong SMTP host** - might need `mail.3iconic.co.ke` instead
- **SMTP not enabled** for your cPanel account

### 2. **Network Restrictions**
Many ISPs and networks block SMTP ports (25, 465, 587) to prevent spam. Your local development environment might be blocked.

## Solutions

### Solution 1: Get Exact SMTP Settings from cPanel ⭐ RECOMMENDED

1. **Log into cPanel**
2. Go to **Email** → **Email Accounts**
3. Find `customers@3iconic.co.ke` → Click **"Connect Devices"**
4. Scroll to **"Mail Client Manual Settings"**
5. Copy the **exact SMTP settings** shown there
6. Update `.env.local` with those exact values

**Common cPanel SMTP Settings:**
- Host: Usually `mail.yourdomain.com` or `yourdomain.com`
- Port: `587` (TLS) or `465` (SSL)
- Security: `TLS` or `SSL`

### Solution 2: Try Different Ports

**Option A: Port 587 with TLS**
```env
SMTP_HOST=mail.3iconic.co.ke
SMTP_PORT=587
SMTP_SECURE=false
```

**Option B: Port 25 (if allowed)**
```env
SMTP_HOST=mail.3iconic.co.ke
SMTP_PORT=25
SMTP_SECURE=false
```

### Solution 3: Use a Third-Party Email Service ⭐ EASIEST

Instead of cPanel SMTP, use a dedicated email service:

#### Option A: Resend (Recommended - Free tier available)
1. Sign up at https://resend.com
2. Get API key
3. Update `.env.local`:
```env
RESEND_API_KEY=re_your_api_key_here
```
4. Update `lib/email.ts` to use Resend instead of nodemailer

#### Option B: SendGrid
1. Sign up at https://sendgrid.com (free tier: 100 emails/day)
2. Get API key
3. Use SendGrid API instead of SMTP

#### Option C: Mailgun
1. Sign up at https://mailgun.com (free tier: 5,000 emails/month)
2. Get API key
3. Use Mailgun API

### Solution 4: Test SMTP Connection

**Using Telnet (if available):**
```bash
telnet 3iconic.co.ke 465
# or
telnet mail.3iconic.co.ke 587
```

If connection fails, the port is blocked or server is unreachable.

**Using Online Tool:**
- https://www.smtper.net/ - Test SMTP connection online

### Solution 5: Contact Hosting Provider

Ask your hosting provider:
1. Is SMTP enabled for my account?
2. What is the exact SMTP host and port?
3. Are there any IP restrictions?
4. Do I need to whitelist my IP address?

## Current Status

✅ **Applications ARE being saved** to MongoDB database
❌ **Email notifications are failing** (but not blocking submissions)

You can view all applications in the database:
```javascript
// In MongoDB
db.job_applications.find().sort({ createdAt: -1 })
```

## Quick Fix: Use Resend (5 minutes setup)

1. **Sign up**: https://resend.com/signup
2. **Get API key** from dashboard
3. **Install Resend**:
   ```bash
   npm install resend
   ```
4. **Update email.ts** to use Resend API instead of SMTP
5. **Add to .env.local**:
   ```env
   RESEND_API_KEY=re_your_key_here
   ```

This will work immediately and is more reliable than SMTP.

## Recommendation

For production, I recommend using **Resend** or **SendGrid** instead of cPanel SMTP because:
- ✅ More reliable (no connection timeouts)
- ✅ Better deliverability
- ✅ Free tiers available
- ✅ Easy to set up
- ✅ Works from anywhere (no firewall issues)

Would you like me to implement Resend integration?

