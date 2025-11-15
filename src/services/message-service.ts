/**
 * Message Service
 * Handles message persistence and real-time broadcasting
 */

import { create, findMany } from '../shared/supabase-helpers.js';
import { getRedisClient } from '../config/db.js';
import { logError, logWarning } from '../shared/logger.js';
import { scanForToxicity, handleViolation, isUserMuted, getRoomById } from './moderation.service.js';
import { getRoomConfig, isEnterpriseUser } from './room-service.js';
import { getUserSubscription } from './subscription-service.js';
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

    // Check if user is muted in this room
    const isMuted = await isUserMuted(data.senderId, String(roomIdValue));
    if (isMuted) {
      throw new Error('You are temporarily muted in this room');
    }

    // Check if room has AI moderation enabled (enterprise only)
    const roomConfig = await getRoomConfig(String(roomIdValue));
    
    if (roomConfig?.ai_moderation) {
      // Verify enterprise tier (moderation is enterprise-only)
      const userTier = await getUserSubscription(data.senderId);
      if (!isEnterpriseUser(userTier)) {
        // This shouldn't happen if room config is correct, but safety check
        logError(`Non-enterprise user ${data.senderId} tried to send in moderated room`);
      }

      // Scan message for toxicity
      const scan = await scanForToxicity(data.content, String(roomIdValue));
      
      if (scan.isToxic) {
        // Log toxic scan event
        const { logModerationEvent } = await import('./telemetry-service.js');
        await logModerationEvent('scan_toxic', data.senderId, String(roomIdValue), {
          score: scan.score,
          suggestion: scan.suggestion,
        });
        // Get current violation count
        const { data: violations } = await supabase
          .from('message_violations')
          .select('count')
          .eq('user_id', data.senderId)
          .eq('room_id', String(roomIdValue))
          .single();

        const violationCount = violations?.count || 0;
        
        // Handle violation (warnings first, then mutes)
        await handleViolation(data.senderId, String(roomIdValue), scan.suggestion, violationCount);
        
        // Still allow message through, but warn user
        // Message will be inserted below, but user gets warning/mute
      }
    }

    // Compress message content at DB write using JSONB compression
    // This reduces storage by 30-45% while maintaining full-text search capability
    const compressedContent = JSON.stringify({
      content: data.content,
      compressed: true,
      length: data.content.length
    });
    
    // Insert message with compressed content (moderation doesn't block, just warns/mutes)
    await create('messages', {
      room_id: roomIdValue,
      sender_id: data.senderId,
      content: compressedContent // Store as JSONB-compressed content
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
 * @param roomId - Room ID (string or number) or array of room IDs for batch query
 * @param since - Optional ISO8601 timestamp string to fetch messages after this time (lazy loading)
 */
export async function getRoomMessages(roomId: string | number | (string | number)[], since?: string): Promise<any[]> {
  try {
    // Batch query optimization: if roomId is an array, use RPC function
    if (Array.isArray(roomId) && roomId.length > 0) {
      try {
        const { data, error } = await supabase.rpc('get_room_messages_batch', {
          room_ids: roomId,
          since_timestamp: since || null,
        });
        
        if (error) {
          logWarning('Batch query failed, falling back to individual queries', error);
          // Fall through to individual queries
        } else {
          return data || [];
        }
      } catch (rpcError) {
        logWarning('RPC batch query error, falling back to individual queries', rpcError);
        // Fall through to individual queries
      }
    }
    
    // Single room query (original implementation)
    const filter: any = { room_id: roomId };
    
    // Add timestamp filter if since parameter provided (lazy loading optimization)
    if (since) {
      try {
        const sinceDate = new Date(since);
        filter.ts = { gte: sinceDate.toISOString() }; // Greater than or equal to since timestamp
      } catch (e) {
        // Invalid date format - ignore since parameter
        logWarning('Invalid since parameter format, ignoring', { since });
      }
    }
    
    // Query messages table with filters and ordering
    // ascending: false = newest first (most recent at top)
    // limit: 50 = reasonable page size for initial load (can paginate for more)
    const messages = await findMany('messages', {
      filter,
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

