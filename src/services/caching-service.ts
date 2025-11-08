/**
 * Multi-Layer Caching Service
 * Implements L1 (in-memory), L2 (Redis), L3 (Supabase) caching cascade
 */

import { getRedisClient } from '../config/db.js';
import { supabase } from '../config/db.js';
import { logInfo, logError } from '../shared/logger.js';

const redis = getRedisClient();

// L1 Cache: In-memory Map with TTL
class L1Cache {
  private cache: Map<string, { data: any; expires: number }> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Cleanup expired entries every minute
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (value.expires < now) {
          this.cache.delete(key);
        }
      }
    }, 60000);
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (entry.expires < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }

  set(key: string, data: any, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + ttlMs,
    });
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

const l1Cache = new L1Cache();

export interface CacheOptions {
  l1Ttl?: number; // L1 cache TTL in milliseconds (default: 60000 = 1 minute)
  l2Ttl?: number; // L2 cache TTL in seconds (default: 300 = 5 minutes)
  skipL1?: boolean; // Skip L1 cache
  skipL2?: boolean; // Skip L2 cache
}

const defaultOptions: CacheOptions = {
  l1Ttl: 60000, // 1 minute
  l2Ttl: 300, // 5 minutes
};

/**
 * Get data from cache cascade (L1 → L2 → L3)
 */
export async function getCached<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: CacheOptions = {}
): Promise<T> {
  const opts = { ...defaultOptions, ...options };

  // Try L1 cache
  if (!opts.skipL1) {
    const l1Data = l1Cache.get(key);
    if (l1Data !== null) {
      logInfo(`Cache HIT L1: ${key}`);
      return l1Data as T;
    }
  }

  // Try L2 cache (Redis)
  if (!opts.skipL2) {
    try {
      const l2Data = await redis.get(key);
      if (l2Data) {
        logInfo(`Cache HIT L2: ${key}`);
        const parsed = JSON.parse(l2Data);
        
        // Populate L1 cache
        if (!opts.skipL1) {
          l1Cache.set(key, parsed, opts.l1Ttl!);
        }
        
        return parsed as T;
      }
    } catch (error) {
      logError(`L2 cache error for ${key}`, error);
      // Continue to L3 if L2 fails
    }
  }

  // Fetch from L3 (database)
  logInfo(`Cache MISS: ${key}, fetching from database`);
  const data = await fetchFn();

  // Populate caches
  try {
    if (!opts.skipL2) {
      await redis.setex(key, opts.l2Ttl!, JSON.stringify(data));
    }
    if (!opts.skipL1) {
      l1Cache.set(key, data, opts.l1Ttl!);
    }
  } catch (error) {
    logError(`Cache set error for ${key}`, error);
    // Don't fail if cache set fails
  }

  return data;
}

/**
 * Invalidate cache entry
 */
export async function invalidateCache(key: string): Promise<void> {
  l1Cache.delete(key);
  try {
    await redis.del(key);
  } catch (error) {
    logError(`Cache invalidation error for ${key}`, error);
  }
}

/**
 * Invalidate cache pattern (e.g., all user:* keys)
 */
export async function invalidateCachePattern(pattern: string): Promise<void> {
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
    
    // Also clear matching L1 entries
    for (const key of keys) {
      l1Cache.delete(key);
    }
  } catch (error) {
    logError(`Cache pattern invalidation error for ${pattern}`, error);
  }
}

/**
 * Cached user lookup
 */
export async function getCachedUser(userId: string) {
  return getCached(
    `user:${userId}`,
    async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      l1Ttl: 60000, // 1 minute
      l2Ttl: 300, // 5 minutes
    }
  );
}

/**
 * Cached room lookup
 */
export async function getCachedRoom(roomId: string) {
  return getCached(
    `room:${roomId}`,
    async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();
      
      if (error) throw error;
      return data;
    },
    {
      l1Ttl: 60000, // 1 minute
      l2Ttl: 600, // 10 minutes (rooms change less frequently)
    }
  );
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    l1Size: l1Cache['cache'].size,
    // L2 stats would require Redis INFO command
  };
}

