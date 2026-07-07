# cPanel SMTP Settings Checklist

## What I Need From You

Please go to your cPanel and get these **exact** values:

### Steps:
1. **cPanel Login** → **Email** → **Email Accounts**
2. Find `customers@3iconic.co.ke`
3. Click **"Connect Devices"**
4. Scroll to **"Mail Client Manual Settings"**
5. Look at **"Secure SSL/TLS Settings (Recommended)"** section
6. Find the **SMTP (Outgoing)** settings

### Copy These Values:

```
SMTP Host: _____________________
SMTP Port: _____________________
SMTP Username: _____________________
SMTP Security: _____________________ (SSL/TLS or SSL)
```

## Current Configurations We've Tried

✅ **Config 1**: `mail.3iconic.co.ke:587` (TLS) - **TIMEOUT**
✅ **Config 2**: `3iconic.co.ke:587` (TLS) - **TIMEOUT**  
🔄 **Config 3**: `3iconic.co.ke:465` (SSL) - **TRYING NOW**

## Next Steps

After you provide the exact settings from cPanel, I'll update the configuration to match exactly what your server expects.

## Alternative: Test SMTP Connection

You can also test if SMTP is working by:

1. **Using Telnet** (if available):
   ```bash
   telnet mail.3iconic.co.ke 587
   # or
   telnet 3iconic.co.ke 465
   ```

2. **Using an online SMTP tester**:
   - https://www.smtper.net/
   - Enter your SMTP settings and test the connection

3. **Contact your hosting provider**:
   - Ask them for the exact SMTP settings for `customers@3iconic.co.ke`
   - Verify that SMTP is enabled for your account
   - Check if there are any IP restrictions

## Common Issues

- **Port blocked by firewall**: Some networks block ports 587 and 465
- **SMTP not enabled**: Your hosting provider might need to enable SMTP
- **IP whitelist required**: Some servers require your server IP to be whitelisted
- **Wrong hostname**: The SMTP host might be different than expected

