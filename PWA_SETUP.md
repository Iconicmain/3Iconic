# PWA Setup for 3Iconic Admin Dashboard

## ✅ What's Been Set Up

1. **Manifest File** (`/public/manifest.json`)
   - Configured for standalone display mode
   - Set to start at `/admin` route
   - Includes shortcuts for Tickets and Dashboard
   - Branded with 3Iconic colors (#059669)

2. **Icons Created**
   - `/public/icon.svg` - Main favicon (32x32)
   - `/public/icon-192x192.svg` - PWA icon (192x192)
   - `/public/icon-512x512.svg` - PWA icon (512x512)

3. **Metadata Configuration**
   - Updated `app/layout.tsx` with PWA metadata
   - Theme color set to emerald green (#059669)
   - Apple Web App configuration added

## 📱 How to Install as Web App

### On Mobile (iOS):
1. Open Safari and navigate to your admin dashboard
2. Tap the Share button
3. Select "Add to Home Screen"
4. The app will appear with the 3Iconic icon

### On Mobile (Android):
1. Open Chrome and navigate to your admin dashboard
2. Tap the menu (3 dots)
3. Select "Add to Home Screen" or "Install App"
4. The app will appear with the 3Iconic icon

### On Desktop (Chrome/Edge):
1. Look for the install icon in the address bar
2. Click "Install" when prompted
3. The app will open in a standalone window

## 🎨 Icon Optimization (Optional)

For best PWA support, you may want to convert SVG icons to PNG:

1. **Using Online Tools:**
   - Visit https://cloudconvert.com/svg-to-png
   - Upload `icon-192x192.svg` and convert to 192x192 PNG
   - Upload `icon-512x512.svg` and convert to 512x512 PNG
   - Save as `icon-192x192.png` and `icon-512x512.png` in `/public/`

2. **Update manifest.json:**
   - Change icon `type` from `image/svg+xml` to `image/png`
   - Change icon `src` from `.svg` to `.png`

## ✨ Features

- **Standalone Mode**: Opens without browser UI
- **Offline Ready**: Can be enhanced with service worker
- **App Shortcuts**: Quick access to Tickets and Dashboard
- **Branded**: Uses 3Iconic emerald green theme
- **Responsive**: Works on all device sizes

## 🔧 Testing

1. Open Chrome DevTools (F12)
2. Go to "Application" tab
3. Check "Manifest" section to verify configuration
4. Test "Add to Home Screen" functionality

## 📝 Notes

- The app is scoped to `/admin` routes only
- Theme color matches your brand (#059669)
- Icons use the "3I" branding with "ADMIN" text
- Display mode is set to "standalone" for app-like experience

