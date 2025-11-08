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

// Initialize Supabase client with enhanced configuration
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Backend doesn't need session persistence
    autoRefreshToken: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: { 'x-application-name': 'sinapse-backend' },
  },
});

// Connection health check state
let lastHealthCheck = Date.now(); // Track last successful health check timestamp
let healthCheckInterval: NodeJS.Timeout | null = null; // Interval reference for cleanup

/**
 * Check Supabase database connectivity
 * 
 * Performs a lightweight query to verify database is reachable and responsive.
 * Used by circuit breaker and monitoring systems.
 * 
 * @returns true if database is healthy, false otherwise
 */
export async function checkSupabaseHealth(): Promise<boolean> {
  try {
    // Perform minimal query: select single ID from users table
    // This is the lightest possible query (no joins, no filters, limit 1)
    // If this fails, database is likely down or unreachable
    const { error } = await supabase
      .from('users')
      .select('id') // Only select ID column (minimal data transfer)
      .limit(1); // Only need 1 row to verify connectivity
    
    if (error) {
      logError('Supabase health check failed', error);
      return false; // Database error indicates unhealthy state
    }
    
    // Update last successful check timestamp
    lastHealthCheck = Date.now();
    return true; // Query succeeded = healthy
  } catch (error: any) {
    // Network errors, timeouts, etc.
    logError('Supabase health check error', error);
    return false; // Any exception = unhealthy
  }
}

// Periodic health check: run every 30 seconds
// Proactively detects database issues before they cause user-facing errors
if (!healthCheckInterval) {
  healthCheckInterval = setInterval(async () => {
    const healthy = await checkSupabaseHealth();
    if (!healthy) {
      logError('Supabase connection unhealthy, triggering circuit breaker');
      // Note: Circuit breaker will be triggered by actual failed requests
      // This health check just provides early warning/logging
    }
  }, 30000); // 30000ms = 30 seconds
}

// Singleton Redis client instance (shared across entire application)
let redisClient = null;

/**
 * Get or create Redis client instance
 * Uses singleton pattern to ensure only one connection pool is created
 */
export function getRedisClient() {
  if (!redisClient) {
    // Get Redis URL from environment or use localhost default
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Create Redis client with retry configuration
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        // Exponential backoff with cap: 50ms, 100ms, 150ms... up to 2000ms max
        // times = number of retry attempts (1, 2, 3, ...)
        // Math.min ensures delay never exceeds 2000ms (2 seconds)
        const delay = Math.min(times * 50, 2000);
        return delay; // Return delay in milliseconds, or null/undefined to stop retrying
      },
      maxRetriesPerRequest: 3, // Max 3 retries per command before giving up
    });

    // Error handler: log but don't crash (Redis failures are non-fatal)
    redisClient.on('error', (err) => {
      logError('Redis connection error', err);
      // Note: Errors are logged but app continues (graceful degradation)
    });

    // Connection success handler
    redisClient.on('connect', () => {
      logInfo('Redis connected');
    });
  }
  // Return existing client if already created (singleton pattern)
  return redisClient;
}

// Database is Supabase-only - no legacy PostgreSQL adapters

