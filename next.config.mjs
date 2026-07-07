/** @type {import('next').NextConfig} */
const nextConfig = {
  // Unique build ID per deploy - forces phones to fetch fresh assets after deploy
  generateBuildId: async () => {
    return `build-${Date.now()}`;
  },
  // Force no-cache on HTML pages so phones get fresh app after deploy
  async headers() {
    return [
      {
        // Apply to pages & API; exclude _next/static (has content hashes, cacheable)
        source: '/((?!_next/static|_next/image).*)',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, max-age=0' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
        ],
      },
    ];
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Suppress source map warnings (harmless development warnings)
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
}

export default nextConfig
