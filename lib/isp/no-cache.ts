/**
 * Headers to prevent caching of inventory/ISP data.
 * Use for all ISP API responses to ensure fresh data.
 */
export const NO_CACHE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
  Expires: '0',
} as const;
