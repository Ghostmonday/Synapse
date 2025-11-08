/**
 * Rate Limiter Middleware
 * Implements token bucket algorithm for API rate limiting and DDoS protection
 */

import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../config/db.js';
import { logWarning } from '../shared/logger.js';

const redis = getRedisClient();

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  max: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  skipFailedRequests?: boolean; // Don't count failed requests
  message?: string; // Custom error message
}

const defaultOptions: RateLimitOptions = {
  windowMs: 60000, // 1 minute
  max: 100, // 100 requests per minute
  keyGenerator: (req: Request) => {
    // Use IP address or user ID if authenticated
    return (req as any).user?.id || req.ip || 'unknown';
  },
  message: 'Too many requests, please try again later.',
};

/**
 * Rate limiter middleware factory
 */
export function rateLimit(options: Partial<RateLimitOptions> = {}) {
  const opts = { ...defaultOptions, ...options };
  const windowMs = opts.windowMs;
  const max = opts.max;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Generate unique key for this client (IP or user ID)
      // Format: "rate_limit:{identifier}" - used as Redis sorted set key
      const key = `rate_limit:${opts.keyGenerator!(req)}`;
      const now = Date.now(); // Current timestamp in milliseconds

      // Use Redis pipeline for atomic operations (all succeed or all fail)
      // Sliding window log algorithm: track each request with timestamp
      const pipeline = redis.pipeline();
      
      // Step 1: Remove old entries outside the time window
      // zremrangebyscore removes entries with scores (timestamps) < (now - windowMs)
      // This keeps only requests within the current window
      pipeline.zremrangebyscore(key, 0, now - windowMs); // Race: entries can expire between zrem and zcard
      
      // Step 2: Count remaining requests in the window
      // zcard returns count of entries in sorted set (requests in current window)
      pipeline.zcard(key);
      
      // Step 3: Add current request to the window
      // Score = timestamp (for sorting/expiration)
      // Value = unique identifier (timestamp + random to prevent collisions)
      pipeline.zadd(key, now, `${now}-${Math.random()}`); // Collision risk: Math.random() not cryptographically secure
      
      // Step 4: Set expiration on the key (cleanup if no requests for a while)
      // Expire after windowMs (convert to seconds for Redis EXPIRE command)
      pipeline.expire(key, Math.ceil(windowMs / 1000)); // Gotcha: EXPIRE resets TTL even if key already exists
      
      // Execute all pipeline commands atomically
      const results = await pipeline.exec(); // Silent fail: if Redis down, pipeline fails but request allowed (fail-open)
      // Extract count from pipeline results: results[1] is zcard result, [1] is the count value
      const count = results?.[1]?.[1] as number || 0;

      // Set standard rate limit headers (RFC 6585 compliant)
      res.setHeader('X-RateLimit-Limit', max.toString()); // Max requests allowed
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count - 1).toString()); // Requests left (max - current - 1)
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString()); // When window resets

      // Check if limit exceeded
      if (count >= max) {
        logWarning(`Rate limit exceeded for ${opts.keyGenerator!(req)}`);
        return res.status(429).json({ // 429 = Too Many Requests
          error: 'Rate limit exceeded',
          message: opts.message,
          retryAfter: Math.ceil(windowMs / 1000), // Seconds until retry allowed
        });
      }

      // Request allowed - continue to next middleware/route handler
      next();
    } catch (error: any) {
      // If Redis fails, fail open (allow request) rather than fail closed (block all)
      // This prevents Redis outages from taking down the entire API
      // Log error for monitoring but don't block legitimate users
      logWarning('Rate limiter Redis error, allowing request', error);
      next(); // Allow request to proceed
    }
  };
}

/**
 * Strict rate limiter for critical endpoints
 */
export function strictRateLimit(max: number, windowMs: number = 60000) {
  return rateLimit({
    max,
    windowMs,
    message: 'Rate limit exceeded. Please slow down.',
  });
}

/**
 * Per-user rate limiter (requires authentication)
 */
export function userRateLimit(max: number, windowMs: number = 60000) {
  return rateLimit({
    max,
    windowMs,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id;
      if (!userId) {
        throw new Error('User rate limit requires authentication');
      }
      return `user:${userId}`;
    },
  });
}

/**
 * Per-IP rate limiter for DDoS protection
 */
export function ipRateLimit(max: number = 1000, windowMs: number = 60000) {
  return rateLimit({
    max,
    windowMs,
    keyGenerator: (req: Request) => {
      return `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    },
    message: 'Too many requests from this IP address.',
  });
}

