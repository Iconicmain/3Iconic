# LibreSpeed Speed Test Setup Guide

This guide will help you set up a real speed test using LibreSpeed for Iconic Fibre.

## What is LibreSpeed?

LibreSpeed is an open-source speed test that you can host yourself. It's perfect for ISPs because:
- ✅ You control the server (brandable)
- ✅ Tests ping, download, upload, and jitter
- ✅ Works from browser (no plugins needed)
- ✅ Can be styled to match your brand

## Setup Options

### Option 1: Self-Hosted LibreSpeed Server (Recommended)

**Best for:** Full control, branding, and accurate results

1. **Install LibreSpeed Server:**
   ```bash
   # Using Docker (easiest)
   docker run -d \
     --name librespeed \
     -p 8080:80 \
     -e MODE=standalone \
     adolfintel/speedtest
   ```

2. **Or install manually:**
   - Download from: https://github.com/librespeed/speedtest
   - Follow their installation guide
   - Configure your server URL

3. **Set Environment Variable:**
   Add to your `.env.local`:
   ```env
   LIBRESPEED_SERVER_URL=http://your-server-ip:8080
   ```

4. **Update Frontend:**
   The speed test component is already configured to use `/api/speedtest` which proxies to your server.

### Option 2: Use Public LibreSpeed Instance

**Best for:** Quick testing without server setup

1. Find a public LibreSpeed server (check LibreSpeed's server list)
2. Update the API routes to point to the public server
3. Note: Less control, may have rate limits

### Option 3: Use LibreSpeed's Official JavaScript Library

**Best for:** Direct integration without API proxy

1. Install the library:
   ```bash
   npm install librespeed-js
   ```

2. Update `components/isp/sections/speed-test-section.tsx` to use the library directly

## Current Implementation

The speed test is already integrated with:
- ✅ Real-time progress updates
- ✅ Ping, Download, Upload testing
- ✅ Beautiful UI matching your brand
- ✅ Error handling with fallbacks
- ✅ Mobile responsive

## Configuration

### Environment Variables

Add to `.env.local`:
```env
# Your LibreSpeed server URL
LIBRESPEED_SERVER_URL=http://localhost:8080

# Or for production
LIBRESPEED_SERVER_URL=https://speedtest.iconicfibre.co.ke
```

### Frontend Configuration

The component uses:
```typescript
const LIBRESPEED_SERVER = process.env.NEXT_PUBLIC_LIBRESPEED_SERVER || '/api/speedtest'
```

You can set `NEXT_PUBLIC_LIBRESPEED_SERVER` to point directly to your server if you prefer.

## Testing

1. **Without Server (Fallback Mode):**
   - The speed test will work with simulated results
   - Good for development/testing

2. **With Server:**
   - Real measurements from your network
   - Accurate ping, download, upload speeds

## Customization

### Branding
- Colors already match Iconic Fibre theme
- Logo can be added to the gauge
- Customize in `speed-test-section.tsx`

### Server Location
- Deploy LibreSpeed server close to your users
- Multiple servers for different regions
- Update API routes to route to nearest server

## Troubleshooting

### "Speed test failed" error
- Check if LibreSpeed server is running
- Verify `LIBRESPEED_SERVER_URL` is correct
- Check server logs
- Fallback mode will activate automatically

### Slow results
- Ensure server has good bandwidth
- Check server location vs user location
- Consider CDN for test files

### CORS errors
- Configure LibreSpeed server CORS headers
- Or use API proxy (already implemented)

## Next Steps

1. ✅ Speed test UI is ready
2. ⏳ Set up LibreSpeed server
3. ⏳ Configure environment variables
4. ⏳ Test with real connections
5. ⏳ Deploy to production

## Resources

- LibreSpeed GitHub: https://github.com/librespeed/speedtest
- Docker Image: https://hub.docker.com/r/adolfintel/speedtest
- Documentation: https://github.com/librespeed/speedtest/wiki

---

**Note:** The current implementation includes fallback mode, so the speed test will work even without a LibreSpeed server (using simulated results for development).

