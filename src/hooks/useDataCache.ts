import { useState, useEffect, useCallback, useRef } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isLoading: boolean;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds (default: 5 minutes)
  key: string;
}

export function useDataCache<T>(
  fetchFunction: () => Promise<T>,
  options: CacheOptions
) {
  const { ttl = 5 * 60 * 1000, key } = options; // 5 minutes default

  const [cache, setCache] = useState<CacheEntry<T> | null>(null);
  const [currentKey, setCurrentKey] = useState(key);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<CacheEntry<T> | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    cacheRef.current = cache;
  }, [cache]);

  // Load cache when component mounts or key changes
  useEffect(() => {
    if (key !== currentKey) {
      // Key changed, clear current cache and load new one
      setCurrentKey(key);
      setCache(null);
      setIsLoading(true);
    }

    // Try to load from localStorage
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem(`cache-${key}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          const now = Date.now();

          // Check if cache is still valid
          if (now - parsed.timestamp < ttl) {
            setCache({
              data: parsed.data,
              timestamp: parsed.timestamp,
              isLoading: false,
            });
            setIsLoading(false);
            return;
          }
        }
      } catch (error) {
        console.warn("Failed to load cache:", error);
      }
    }

    // No valid cache found, will trigger fetch in next effect
    setCache(null);
  }, [key, currentKey, ttl]);

  const fetchData = useCallback(
    async (force = false) => {
      const now = Date.now();
      const currentCache = cacheRef.current;

      // If we have valid cache and not forcing refresh, return cached data
      if (!force && currentCache && now - currentCache.timestamp < ttl) {
        return currentCache.data;
      }

      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchFunction();
        const newCache: CacheEntry<T> = {
          data,
          timestamp: now,
          isLoading: false,
        };

        setCache(newCache);

        // Save to localStorage
        try {
          localStorage.setItem(
            `cache-${key}`,
            JSON.stringify({
              data,
              timestamp: now,
            })
          );
        } catch (error) {
          console.warn("Failed to save cache:", error);
        }

        setIsLoading(false);
        return data;
      } catch (err) {
        const error = err as Error;
        setError(error);
        setIsLoading(false);
        throw error;
      }
    },
    [ttl, key] // Remove fetchFunction from dependencies to prevent infinite loops
  );

  // Initial fetch if no cache (with debounce to prevent rapid calls)
  useEffect(() => {
    if (!cacheRef.current) {
      const timeoutId = setTimeout(() => {
        fetchData().catch((error) => {
          // Silently handle errors on initial fetch
          console.warn("Initial data fetch failed:", error);
        });
      }, 100); // 100ms debounce

      return () => clearTimeout(timeoutId);
    }
  }, [fetchData]);

  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const clearCache = useCallback(() => {
    setCache(null);
    localStorage.removeItem(`cache-${key}`);
  }, [key]);

  return {
    data: cache?.data,
    isLoading,
    error,
    refresh,
    clearCache,
    lastUpdated: cache?.timestamp,
  };
}
