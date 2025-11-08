import { getRedisClient } from '../config/db.js';
import { logError } from '../shared/logger.js';
import crypto from 'crypto';

const redis = getRedisClient();
const CACHE_TTL = 300; // 5 min
const MAX_CACHE_SIZE = 1000; // LRU size

export async function getCached(key: string): Promise<any | null> {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error: any) {
    logError('Cache get failed', error);
    return null;
  }
}

export async function setCached(key: string, value: any, ttl = CACHE_TTL): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttl);
    // Simple LRU: track keys
    await redis.lpush('lru_keys', key);
    const len = await redis.llen('lru_keys');
    if (len > MAX_CACHE_SIZE) {
      const evictKey = await redis.rpop('lru_keys');
      if (evictKey) await redis.del(evictKey);
    }
  } catch (error: any) {
    logError('Cache set failed', error);
  }
}

// ETag: use hash of data as ETag
export function generateETag(data: any): string {
  return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
}

