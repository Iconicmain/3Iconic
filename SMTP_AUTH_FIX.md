# SMTP Authentication Error Fix

## Current Issue
**Error**: `535 Incorrect authentication data`
**Status**: Connection successful, but authentication fails

## What's Working
✅ SMTP server connection: `rs5.rcnoc.com:465` - **SUCCESS**
✅ SSL/TLS handshake - **SUCCESS**
✅ Server accepts connection - **SUCCESS**

## What's Failing
❌ Authentication with `customers@3iconic.co.ke` - **FAILED**

## Possible Causes

### 1. **Incorrect Password**
The password `@Iconic@hr.co.ke` might be incorrect. Verify:
- Log into cPanel
- Go to Email Accounts
- Find `customers@3iconic.co.ke`
- Click "Change Password" or "Manage"
- Verify the actual password

### 2. **Password Contains Special Characters**
The password `@Iconic@hr.co.ke` has special characters (`@`) that might need:
- URL encoding
- Different escaping
- Or the password might actually be different

### 3. **Username Format**
Some SMTP servers require:
- Full email: `customers@3iconic.co.ke` ✅ (current)
- Or just username: `customers` (try this if full email doesn't work)

## Solutions

### Solution 1: Verify Password in cPanel
1. Log into cPanel
2. Email → Email Accounts
3. Find `customers@3iconic.co.ke`
4. Click "Change Password" or check current password
5. Update `.env.local` with the correct password

### Solution 2: Try Username Instead of Full Email
Update `.env.local`:
```env
SMTP_USER=customers
```
Instead of:
```env
SMTP_USER=customers@3iconic.co.ke
```

### Solution 3: Check if Password Needs Quotes
If password has special characters, try:
```env
SMTP_PASSWORD="@Iconic@hr.co.ke"
```
(With quotes)

### Solution 4: Reset Email Password
If unsure, reset the password in cPanel:
1. Email → Email Accounts
2. Find `customers@3iconic.co.ke`
3. Click "Change Password"
4. Set a new password (preferably without special characters)
5. Update `.env.local` with new password

## Next Steps

1. **Verify the password** in cPanel is exactly `@Iconic@hr.co.ke`
2. **Try username format**: Change `SMTP_USER` to just `customers`
3. **Reset password** if needed to something simpler (e.g., `IconicHr2024`)
4. **Restart server** after any changes

## Current Configuration
```
SMTP_HOST=rs5.rcnoc.com ✅
SMTP_PORT=465 ✅
SMTP_SECURE=true ✅
SMTP_USER=customers@3iconic.co.ke ❓ (might need to be just "customers")
SMTP_PASSWORD=@Iconic@hr.co.ke ❓ (verify this is correct)
```

