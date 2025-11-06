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
    await create('messages', {
      room_id: typeof data.roomId === 'string' ? parseInt(data.roomId) || data.roomId : data.roomId,
      user_id: data.senderId,
      content: data.content
    });

    // Broadcast message via Redis for real-time updates
    await redis.publish(
      `room:${data.roomId}`,
      JSON.stringify({
        ...data,
        timestamp: Date.now()
      })
    );
  } catch (error: any) {
    logError('Failed to send message', error);
    throw new Error(error.message || 'Failed to send message');
  }
}

/**
 * Retrieve recent messages from a room
 * Returns up to 50 most recent messages, ordered by timestamp
 */
export async function getRoomMessages(roomId: string | number): Promise<any[]> {
  try {
    const messages = await findMany('messages', {
      filter: { room_id: roomId },
      orderBy: { column: 'ts', ascending: false },
      limit: 50
    });

    return messages;
  } catch (error: any) {
    logError('Failed to retrieve room messages', error);
    throw new Error(error.message || 'Failed to get messages');
  }
}

