# How to Get Your Exact cPanel SMTP Settings

## Step-by-Step Instructions

1. **Log into your cPanel**
   - Go to your hosting provider's cPanel login page
   - Enter your cPanel username and password

2. **Navigate to Email Accounts**
   - In cPanel, go to: **Email** → **Email Accounts**
   - Or search for "Email Accounts" in the search bar

3. **Find your email account**
   - Look for `customers@3iconic.co.ke` in the list
   - Click **"Connect Devices"** button next to it

4. **View Mail Client Manual Settings**
   - Scroll down to the **"Mail Client Manual Settings"** section
   - Look for the **"Secure SSL/TLS Settings (Recommended)"** section

5. **Copy the SMTP Settings**
   You should see something like:
   ```
   SMTP Host: mail.3iconic.co.ke (or 3iconic.co.ke)
   SMTP Port: 587 (or 465)
   SMTP Username: customers@3iconic.co.ke
   SMTP Password: [your password]
   Security: SSL/TLS (or SSL)
   ```

6. **Send me these exact values:**
   - SMTP Host: _______________
   - SMTP Port: _______________
   - Security Type: _______________ (SSL/TLS or SSL)
   - Username format: _______________ (full email or just username)

## What to Look For

The settings will typically show:
- **Incoming Mail Server (IMAP/POP3)**: This is for receiving emails (we don't need this)
- **Outgoing Mail Server (SMTP)**: This is what we need for sending emails

Make sure you're looking at the **SMTP (Outgoing)** settings, not IMAP/POP3.

## Common cPanel SMTP Settings

While waiting, here are the most common configurations:

### Option A (Most Common)
- Host: `mail.3iconic.co.ke`
- Port: `587`
- Security: `TLS` (or `STARTTLS`)
- Username: `customers@3iconic.co.ke` (full email)

### Option B
- Host: `3iconic.co.ke`
- Port: `587`
- Security: `TLS`
- Username: `customers@3iconic.co.ke`

### Option C
- Host: `mail.3iconic.co.ke`
- Port: `465`
- Security: `SSL`
- Username: `customers@3iconic.co.ke`

### Option D
- Host: `3iconic.co.ke`
- Port: `465`
- Security: `SSL`
- Username: `customers@3iconic.co.ke`

## Screenshot Help

If possible, take a screenshot of the "Mail Client Manual Settings" section and share it. That will show me the exact configuration.

