/**
 * Redis Pub/Sub helpers for real-time events
 */

import { getRedisClient } from './db.js';
import { logError, logInfo } from '../shared/logger.js';

// Publisher instance (for sending messages)
const publisher = getRedisClient();

// Subscriber instance (separate connection for subscribing)
let subscriber: any = null;

export function getRedisPublisher(): any {
  return publisher;
}

export function getRedisSubscriber(): any {
  if (!subscriber) {
    // Use dynamic import to avoid TypeScript issues
    const Redis = require('ioredis');
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    subscriber = new Redis(redisUrl, {
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

    subscriber.on('error', (err: Error) => {
      logError('Redis subscriber error', err);
    });

    subscriber.on('connect', () => {
      logInfo('Redis subscriber connected');
    });
  }
  return subscriber;
}

// Export for convenience
export const redisPublisher = getRedisPublisher();
export const redisSubscriber = getRedisSubscriber();

