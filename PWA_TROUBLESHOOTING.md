# PWA Installation Troubleshooting Guide

## ✅ What I've Fixed

1. **Service Worker Added** (`/public/sw.js`)
   - Required for PWA install prompt on Android/Chrome
   - Automatically registered when you visit the site

2. **PWA Installer Component** (`/components/pwa/pwa-installer.tsx`)
   - Shows install button when browser supports PWA
   - Automatically appears on supported devices

3. **Updated Manifest**
   - Fixed start_url with query parameter
   - All icons properly configured

## 🔧 How to Test & Fix Installation Issues

### Step 1: Check HTTPS
**IMPORTANT:** PWAs require HTTPS (or localhost for development)

- ✅ **Localhost**: Works automatically (http://localhost:3000)
- ✅ **Production**: Must use HTTPS (https://www.3iconic.co.ke)
- ❌ **HTTP on production**: Won't work - must use HTTPS

### Step 2: Clear Browser Cache
1. Open Chrome DevTools (F12)
2. Go to "Application" tab
3. Click "Clear storage" → "Clear site data"
4. Refresh the page

### Step 3: Verify Service Worker
1. Open Chrome DevTools (F12)
2. Go to "Application" tab → "Service Workers"
3. Check if `/sw.js` is registered
4. If not, check console for errors

### Step 4: Check Manifest
1. Open Chrome DevTools (F12)
2. Go to "Application" tab → "Manifest"
3. Verify:
   - ✅ Name: "3Iconic Admin Dashboard"
   - ✅ Start URL: "/admin?utm_source=pwa"
   - ✅ Icons are loading (no 404 errors)
   - ✅ Display: "standalone"

### Step 5: Test Installation

**On Android Phone:**
1. Open Chrome browser
2. Navigate to your admin dashboard
3. Look for:
   - Install banner at bottom of screen, OR
   - Menu (3 dots) → "Install app" or "Add to Home Screen"
4. If install button appears in the PWA installer component (bottom right), click it

**On iPhone (Safari):**
1. Open Safari
2. Navigate to your admin dashboard
3. Tap Share button (square with arrow)
4. Select "Add to Home Screen"
5. Note: iOS doesn't show install prompt automatically - must use Share menu

**On Desktop Chrome:**
1. Look for install icon (⊕) in address bar
2. Or check if install banner appears
3. Or use the PWA installer component button

## 🐛 Common Issues & Solutions

### Issue: "Install" option not showing

**Solution 1: Check if already installed**
- If app is already installed, install option won't show
- Uninstall first, then try again

**Solution 2: Check HTTPS**
- Must be on HTTPS (or localhost)
- HTTP won't work on production

**Solution 3: Check Service Worker**
- Open DevTools → Application → Service Workers
- Should see `/sw.js` registered
- If not, check console for errors

**Solution 4: Check Manifest**
- Open DevTools → Application → Manifest
- Should see no errors
- All icons should load (check Network tab)

**Solution 5: Wait a few seconds**
- Sometimes browser needs time to detect PWA
- Refresh page and wait 5-10 seconds

### Issue: Service Worker not registering

**Check:**
1. Is the file at `/public/sw.js`?
2. Check browser console for errors
3. Make sure you're on HTTPS (or localhost)

**Fix:**
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Check if file is accessible at: `https://yourdomain.com/sw.js`

### Issue: Icons not loading

**Check:**
1. Open DevTools → Network tab
2. Refresh page
3. Look for 404 errors on icon files

**Fix:**
- Verify files exist in `/public/` folder:
  - `/public/icon.svg`
  - `/public/icon-192x192.svg`
  - `/public/icon-512x512.svg`

## 📱 Manual Installation (If Auto-Install Doesn't Work)

### Android Chrome:
1. Open Chrome menu (3 dots)
2. Select "Add to Home Screen"
3. Confirm installation

### iPhone Safari:
1. Tap Share button
2. Scroll down
3. Tap "Add to Home Screen"
4. Customize name if needed
5. Tap "Add"

### Desktop Chrome:
1. Click menu (3 dots)
2. Select "Install 3Iconic Admin Dashboard"
3. Confirm installation

## ✅ Verification Checklist

Before reporting issues, verify:

- [ ] Site is on HTTPS (or localhost)
- [ ] Service Worker is registered (DevTools → Application → Service Workers)
- [ ] Manifest loads without errors (DevTools → Application → Manifest)
- [ ] All icons load (no 404 errors in Network tab)
- [ ] Browser supports PWA (Chrome, Edge, Safari iOS)
- [ ] Not already installed
- [ ] Cleared browser cache
- [ ] Hard refreshed page (Ctrl+Shift+R)

## 🚀 Quick Test

1. Open site in Chrome (mobile or desktop)
2. Open DevTools (F12)
3. Go to "Application" tab
4. Check:
   - ✅ Service Workers: `/sw.js` registered
   - ✅ Manifest: Shows "3Iconic Admin Dashboard"
   - ✅ Storage: No errors
5. Look for install prompt or use menu to install

## 📞 Still Not Working?

If install option still doesn't appear:

1. **Check browser compatibility:**
   - Chrome/Edge: Full support ✅
   - Safari iOS: Manual install only (Share → Add to Home Screen)
   - Firefox: Limited support

2. **Check PWA requirements:**
   - HTTPS ✅
   - Valid manifest ✅
   - Service worker ✅
   - Icons ✅
   - Start URL accessible ✅

3. **Try different device/browser:**
   - Test on Android Chrome
   - Test on desktop Chrome
   - Test on iPhone Safari (manual install)

