/**
 * Simple localStorage-based cache for YouTube API responses.
 * TTL: 10 minutes for most content, 30 minutes for channel thumbnails.
 */

const CACHE_PREFIX = "yt_cache_";
const DEFAULT_TTL_MS = 10 * 60 * 1000; // 10 min
const CHANNEL_TTL_MS = 30 * 60 * 1000; // 30 min

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

export function cacheGet<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() > entry.expiry) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function cacheSet<T>(
  key: string,
  data: T,
  ttlMs: number = DEFAULT_TTL_MS,
): void {
  try {
    const entry: CacheEntry<T> = { data, expiry: Date.now() + ttlMs };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Storage quota exceeded — clear old cache entries and retry
    clearOldCacheEntries();
    try {
      const entry: CacheEntry<T> = { data, expiry: Date.now() + ttlMs };
      localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
    } catch {
      // ignore
    }
  }
}

export function clearOldCacheEntries(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) {
        try {
          const raw = localStorage.getItem(k);
          if (raw) {
            const entry = JSON.parse(raw);
            if (Date.now() > entry.expiry) toRemove.push(k);
          }
        } catch {
          toRemove.push(k || "");
        }
      }
    }
    for (const k of toRemove) {
      localStorage.removeItem(k);
    }
  } catch {
    // ignore
  }
}

export { CHANNEL_TTL_MS, DEFAULT_TTL_MS };
