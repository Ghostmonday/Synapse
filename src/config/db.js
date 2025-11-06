/**
 * Database configuration
 * Provides Supabase client and Redis connection instances
 */

import { createClient } from '@supabase/supabase-js';
import Redis from 'ioredis';
import { logError, logInfo } from '../shared/logger.js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!supabaseUrl) {
  logError('Missing NEXT_PUBLIC_SUPABASE_URL in .env file');
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
}

if (!supabaseKey) {
  logError('Missing SUPABASE_SERVICE_ROLE_KEY in .env file');
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
}

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Backend doesn't need session persistence
    autoRefreshToken: false,
  },
});

let redisClient = null;

export function getRedisClient() {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    redisClient.on('error', (err) => {
      logError('Redis connection error', err);
    });

    redisClient.on('connect', () => {
      logInfo('Redis connected');
    });
  }
  return redisClient;
}

// Database is Supabase-only - no legacy PostgreSQL adapters

