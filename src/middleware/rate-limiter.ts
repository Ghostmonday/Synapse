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
      const key = `rate_limit:${opts.keyGenerator!(req)}`;
      const now = Date.now();

      // Use sliding window log algorithm
      const pipeline = redis.pipeline();
      
      // Remove old entries
      pipeline.zremrangebyscore(key, 0, now - windowMs);
      
      // Count current requests
      pipeline.zcard(key);
      
      // Add current request
      pipeline.zadd(key, now, `${now}-${Math.random()}`);
      
      // Set expiration
      pipeline.expire(key, Math.ceil(windowMs / 1000));
      
      const results = await pipeline.exec();
      const count = results?.[1]?.[1] as number || 0;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', max.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - count - 1).toString());
      res.setHeader('X-RateLimit-Reset', new Date(now + windowMs).toISOString());

      if (count >= max) {
        logWarning(`Rate limit exceeded for ${opts.keyGenerator!(req)}`);
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: opts.message,
          retryAfter: Math.ceil(windowMs / 1000),
        });
      }

      next();
    } catch (error: any) {
      // If Redis fails, allow request but log error
      logWarning('Rate limiter Redis error, allowing request', error);
      next();
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

