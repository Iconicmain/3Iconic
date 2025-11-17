/**
 * Generate a UUID v4 compatible with both Node.js and Edge runtime
 * Uses Web Crypto API when available, falls back to a simple implementation
 */
export function generateUUID(): string {
  // Use Web Crypto API if available (works in both Node.js and Edge runtime)
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation for environments without crypto.randomUUID
  // This is a simple UUID v4 generator
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

