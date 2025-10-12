interface CacheEntry<T> {
  data: T;
  timestamp: number;
  key: string;
}

class SimpleCache {
  private static instance: SimpleCache;
  private cache: Map<string, CacheEntry<any>> = new Map();

  static getInstance(): SimpleCache {
    if (!SimpleCache.instance) {
      SimpleCache.instance = new SimpleCache();
    }
    return SimpleCache.instance;
  }

  set<T>(key: string, data: T, ttlMinutes: number = 5): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      key,
    };

    this.cache.set(key, entry);

    // Also save to localStorage for persistence across tabs
    try {
      localStorage.setItem(`cache_${key}`, JSON.stringify({
        data,
        timestamp: entry.timestamp,
        ttlMinutes,
      }));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  get<T>(key: string, ttlMinutes: number = 5): T | null {
    // First check memory cache
    const memoryEntry = this.cache.get(key);
    if (memoryEntry && this.isValid(memoryEntry.timestamp, ttlMinutes)) {
      return memoryEntry.data;
    }

    // Then check localStorage
    try {
      const stored = localStorage.getItem(`cache_${key}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (this.isValid(parsed.timestamp, ttlMinutes)) {
          // Restore to memory cache
          this.cache.set(key, {
            data: parsed.data,
            timestamp: parsed.timestamp,
            key,
          });
          return parsed.data;
        } else {
          // Expired, remove it
          localStorage.removeItem(`cache_${key}`);
        }
      }
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
    }

    return null;
  }

  clear(key: string): void {
    this.cache.delete(key);
    try {
      localStorage.removeItem(`cache_${key}`);
    } catch (error) {
      console.warn('Failed to remove from localStorage:', error);
    }
  }

  clearAll(): void {
    this.cache.clear();
    try {
      // Clear all cache entries from localStorage
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('cache_')) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
    }
  }

  private isValid(timestamp: number, ttlMinutes: number): boolean {
    const now = Date.now();
    const ttlMs = ttlMinutes * 60 * 1000;
    return (now - timestamp) < ttlMs;
  }
}

export const cache = SimpleCache.getInstance();
