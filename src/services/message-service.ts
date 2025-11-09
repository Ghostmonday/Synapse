/**
 * Message Service
 * Handles message persistence and real-time broadcasting
 */

import { create, findMany } from '../shared/supabase-helpers.js';
import { getRedisClient } from '../config/db.js';
import { logError } from '../shared/logger.js';
import { analyzeMessage, logFlag, getRoomById } from './moderation.service.js';
import { supabase } from '../config/db.js';

const redis = getRedisClient();

/**
 * Send a message to a room
 * Persists message to database and broadcasts via Redis pub/sub
 * Includes AI moderation for enterprise rooms
 */
export async function sendMessageToRoom(data: {
  roomId: string | number;
  senderId: string;
  content: string;
}): Promise<void> {
  try {
    // Handle roomId type conversion: if string, try parseInt; if that fails (NaN), use original string
    // This handles both numeric IDs (legacy) and UUID strings (new schema)
    const roomIdValue = typeof data.roomId === 'string' 
      ? (parseInt(data.roomId) || data.roomId) // Try parse, fallback to string if not numeric
      : data.roomId; // Already a number

    // Check if room has AI moderation enabled (enterprise only)
    const room = await getRoomById(String(roomIdValue));
    
    if (room?.ai_moderation && room.room_tier === 'enterprise') {
      // Analyze message for toxicity
      const { score, label } = await analyzeMessage(data.content);
      
      if (label === 'toxic') {
        let action = 'flag';
        let messageId: string | null = null;
        
        if (score > 0.85) {
          // Hard threshold: block the message completely
          action = 'remove';
          await logFlag(String(roomIdValue), data.senderId, null, score, action);
          throw new Error('Message removed - content violates moderation policy');
        } else {
          // Soft threshold: warn but allow message
          action = 'warn';
          // Message will be inserted, then we'll log the flag
        }
        
        // Log the moderation flag
        // Note: messageId will be null if removed, set after insert if warned
        if (action === 'warn') {
          // Insert message first, then log flag with message ID
          const { data: insertedMessage, error: insertError } = await supabase
            .from('messages')
            .insert({
              room_id: roomIdValue,
              sender_id: data.senderId,
              content: data.content
            })
            .select('id')
            .single();
          
          if (insertError) throw insertError;
          
          messageId = insertedMessage.id;
          await logFlag(String(roomIdValue), data.senderId, messageId, score, action);
          
          // Send warning message via system notification
          // This could be enhanced to send a DM or in-room notification
          logError(`Moderation warning: room=${roomIdValue}, user=${data.senderId}, score=${score.toFixed(2)}`);
        } else {
          // Already logged above for remove action
          return; // Don't insert or broadcast
        }
      } else {
        // Safe message - proceed with normal insert
        await create('messages', {
          room_id: roomIdValue,
          sender_id: data.senderId,
          content: data.content
        });
      }
    } else {
      // No moderation - normal flow
      await create('messages', {
        room_id: roomIdValue,
        sender_id: data.senderId,
        content: data.content
      });
    }

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

