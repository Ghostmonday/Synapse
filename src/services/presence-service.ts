/**
 * Presence Service
 * Tracks user online/offline status and broadcasts presence updates via Redis
 */

import { getRedisClient } from '../config/db.js';

const redis = getRedisClient();

/**
 * Get the current presence status of a user
 */
export async function getUserPresenceStatus(userId: string): Promise<{ status: string }> {
  const status = await redis.get(`presence:${userId}`); // Silent fail: if Redis down, returns 'offline' (may be wrong)
  return { status: status || 'offline' };
}

/**
 * Update user presence status and broadcast change
 */
export async function updateUserPresenceStatus(userId: string, status: string): Promise<void> {
  // Store presence with 1 hour expiration
  await redis.set(`presence:${userId}`, status, 'EX', 3600); // Race: concurrent updates can overwrite each other
  
  // Broadcast presence change to all subscribers
  await redis.publish( // Silent fail: if Redis down, presence update lost but no error thrown
    'presence_updates',
    JSON.stringify({
      userId,
      status,
      timestamp: Date.now()
    })
  );
}

