/**
 * Message Service
 * Handles message persistence and real-time broadcasting
 */

import { create, findMany } from '../shared/supabase-helpers.js';
import { getRedisClient } from '../config/db.js';
import { logError } from '../shared/logger.js';

const redis = getRedisClient();

/**
 * Send a message to a room
 * Persists message to database and broadcasts via Redis pub/sub
 */
export async function sendMessageToRoom(data: {
  roomId: string | number;
  senderId: string;
  content: string;
}): Promise<void> {
  try {
    // Save message to database
    // Handle roomId type conversion: if string, try parseInt; if that fails (NaN), use original string
    // This handles both numeric IDs (legacy) and UUID strings (new schema)
    const roomIdValue = typeof data.roomId === 'string' 
      ? (parseInt(data.roomId) || data.roomId) // Try parse, fallback to string if not numeric
      : data.roomId; // Already a number
    
    await create('messages', {
      room_id: roomIdValue,
      user_id: data.senderId,
      content: data.content
    });

    // Broadcast message via Redis pub/sub for real-time delivery to connected clients
    // Channel format: "room:{roomId}" - all clients subscribed to this room receive the message
    // Includes timestamp for client-side ordering/display
    await redis.publish( // Silent fail: if Redis down, message saved but not broadcast
      `room:${data.roomId}`,
      JSON.stringify({
        ...data,
        timestamp: Date.now() // Unix timestamp in milliseconds
      })
    );
  } catch (error: any) {
    logError('Failed to send message', error);
    // Preserve original error message if available, otherwise use generic message
    throw new Error(error.message || 'Failed to send message'); // DB insert may have succeeded - partial failure
  }
}

/**
 * Retrieve recent messages from a room
 * Returns up to 50 most recent messages, ordered by timestamp (newest first)
 */
export async function getRoomMessages(roomId: string | number): Promise<any[]> {
  try {
    // Query messages table with filters and ordering
    // ascending: false = newest first (most recent at top)
    // limit: 50 = reasonable page size for initial load (can paginate for more)
    const messages = await findMany('messages', {
      filter: { room_id: roomId }, // Only messages from this room
      orderBy: { column: 'ts', ascending: false }, // 'ts' = timestamp column, newest first
      limit: 50 // Max 50 messages per request (prevents large payloads)
    });

    return messages;
  } catch (error: any) {
    logError('Failed to retrieve room messages', error);
    // Preserve original error message for debugging
    throw new Error(error.message || 'Failed to get messages');
  }
}

