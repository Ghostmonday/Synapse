/**
 * Messaging service: persist messages to Supabase and broadcast via Redis pub/sub
 * Uses Supabase REST API
 */

import { supabase } from '../../config/db.js';
import { getRedisClient } from '../../config/db.js';
import { logError } from '../../shared/logger.js';

const redis = getRedisClient();

/**
 * Send message: persist to Supabase and broadcast via Redis
 */
export async function sendMessage(data: { roomId: string; senderId: string; content: string }) {
  try {
    // Insert message into Supabase (note: schema uses user_id not sender_id)
    const { error: dbError } = await supabase
      .from('messages')
      .insert([{ 
        room_id: parseInt(data.roomId) || data.roomId,
        user_id: data.senderId,
        content: data.content 
      }]);

    if (dbError) throw dbError;

    // Broadcast via Redis pub/sub (transient presence/broadcast only)
    await redis.publish(`room:${data.roomId}`, JSON.stringify({ ...data, ts: Date.now() }));
  } catch (e: unknown) {
    logError('sendMessage error', e instanceof Error ? e : new Error(String(e)));
    throw new Error(e instanceof Error ? e.message : 'Failed to send message');
  }
}

/**
 * Get messages for a room from Supabase
 */
export async function getMessages(roomId: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('ts', { ascending: false })
      .limit(50);

    if (error) throw error;

    return data || [];
  } catch (e: unknown) {
    logError('getMessages error', e instanceof Error ? e : new Error(String(e)));
    throw new Error(e instanceof Error ? e.message : 'Failed to get messages');
  }
}
