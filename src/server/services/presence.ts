/**
 * Presence service: Redis-backed presence store + pub/sub notifications
 * Uses Supabase config for Redis client
 */

import { getRedisClient } from '../../config/db.js';

const redis = getRedisClient();

export async function getPresence(userId: string) {
  const status = await redis.get(`presence:${userId}`);
  return { status: status || 'offline' };
}

export async function updatePresence(userId: string, status: string) {
  await redis.set(`presence:${userId}`, status, 'EX', 3600); // expire in 1 hour
  await redis.publish('presence_updates', JSON.stringify({ userId, status, ts: Date.now() }));
}

