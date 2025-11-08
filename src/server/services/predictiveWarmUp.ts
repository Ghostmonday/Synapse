/**
 * Predictive Warmup Service
 * Tracks typing cadence and room activity to predict when users will join
 * Uses Redis for room heatmap storage
 */

import { getRedisClient } from '../../config/db.js';
import { logError } from '../../shared/logger.js';

const redis = getRedisClient();
const ROOM_HEATMAP_KEY = 'room:heatmap';
const TYPING_CADENCE_KEY = 'typing:cadence';

/**
 * Calculate estimated time to join based on typing cadence
 * @param typingCadence - Messages per second or typing events per second
 * @returns Estimated time in milliseconds until user joins
 */
export function calculateEstimatedTimeToJoin(typingCadence: number): number {
  if (typingCadence > 0) {
    return Math.max(500, 8000 / typingCadence);
  }
  return Infinity;
}

/**
 * Update room heatmap with activity probability
 * @param roomId - Room identifier
 * @param probability - Activity probability (0-1)
 */
export async function updateRoomHeatmap(roomId: string, probability: number): Promise<void> {
  try {
    await redis.hset(ROOM_HEATMAP_KEY, roomId, probability.toString());
    await redis.expire(ROOM_HEATMAP_KEY, 3600); // 1hr max age
  } catch (err) {
    logError('Failed to update room heatmap', err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Get room heatmap probability
 * @param roomId - Room identifier
 * @returns Activity probability or null if not found
 */
export async function getRoomHeatmap(roomId: string): Promise<number | null> {
  try {
    const value = await redis.hget(ROOM_HEATMAP_KEY, roomId);
    return value ? parseFloat(value) : null;
  } catch (err) {
    logError('Failed to get room heatmap', err instanceof Error ? err : new Error(String(err)));
    return null;
  }
}

/**
 * Track typing cadence for a room
 * @param roomId - Room identifier
 * @param timestamp - Current timestamp
 */
export async function trackTypingCadence(roomId: string, timestamp: number = Date.now()): Promise<void> {
  try {
    const key = `${TYPING_CADENCE_KEY}:${roomId}`;
    await redis.lpush(key, timestamp.toString());
    await redis.ltrim(key, 0, 99); // Keep last 100 events
    await redis.expire(key, 300); // 5 minute window
  } catch (err) {
    logError('Failed to track typing cadence', err instanceof Error ? err : new Error(String(err)));
  }
}

/**
 * Calculate typing cadence for a room
 * @param roomId - Room identifier
 * @returns Typing cadence (events per second) or 0
 */
export async function getTypingCadence(roomId: string): Promise<number> {
  try {
    const key = `${TYPING_CADENCE_KEY}:${roomId}`;
    const events = await redis.lrange(key, 0, -1);
    
    if (events.length < 2) return 0;
    
    const timestamps = events.map((e: string) => parseInt(e)).filter((t: number) => !isNaN(t));
    if (timestamps.length < 2) return 0;
    
    const oldest = Math.min(...timestamps);
    const newest = Math.max(...timestamps);
    const duration = (newest - oldest) / 1000; // Convert to seconds
    
    if (duration <= 0) return 0;
    
    return timestamps.length / duration;
  } catch (err) {
    logError('Failed to calculate typing cadence', err instanceof Error ? err : new Error(String(err)));
    return 0;
  }
}

/**
 * Predict warmup for a room based on current activity
 * @param roomId - Room identifier
 * @returns Estimated time to join in milliseconds
 */
export async function predictWarmUp(roomId: string): Promise<number> {
  const typingCadence = await getTypingCadence(roomId);
  const estimatedTimeToJoin = calculateEstimatedTimeToJoin(typingCadence);
  
  // Update heatmap based on activity
  const probability = typingCadence > 0 ? Math.min(1, typingCadence / 10) : 0;
  await updateRoomHeatmap(roomId, probability);
  
  return estimatedTimeToJoin;
}

