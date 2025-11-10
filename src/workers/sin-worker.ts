/**
 * Sin AI Worker
 * Cron job that scans empty rooms and activates Sin bot via Grok API
 * Runs every 5 minutes
 */

import { supabase } from '../config/db.js';
import { logError, logInfo } from '../shared/logger.js';

const GROK_API_URL = 'https://api.grok.com/v1/chat/completions';
const GROK_API_KEY = process.env.GROK_API_KEY;

interface GrokMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Get last N messages from a room
 */
async function getRoomMessages(roomId: string, limit: number = 20): Promise<GrokMessage[]> {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('sender_id, content_preview')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !messages) {
      return [];
    }

    // Convert to Grok format (reverse for chronological order)
    return messages
      .reverse()
      .map((msg: any) => ({
        role: msg.sender_id === 'sin-bot' ? 'assistant' as const : 'user' as const,
        content: msg.content_preview || '',
      }));
  } catch (error) {
    logError('Failed to get room messages', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Call Grok API to generate Sin's response
 */
async function callGrokAPI(messages: GrokMessage[]): Promise<string> {
  if (!GROK_API_KEY) {
    logError('GROK_API_KEY not configured');
    return '';
  }

  try {
    const systemPrompt: GrokMessage = {
      role: 'system',
      content: 'You are Sin, a friendly guide. Welcome new users, explain rooms, crack jokes. Never say you\'re a bot unless asked.',
    };

    const response = await fetch(GROK_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'grok-beta',
        messages: [systemPrompt, ...messages],
        stream: false,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Grok API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (error) {
    logError('Grok API call failed', error instanceof Error ? error : new Error(String(error)));
    return '';
  }
}

/**
 * Post message as Sin bot
 */
async function postSinMessage(roomId: string, content: string): Promise<void> {
  try {
    const { error } = await supabase.from('messages').insert({
      room_id: roomId,
      sender_id: 'sin-bot',
      content_preview: content.substring(0, 512),
      payload_ref: `raw:${Date.now()}`,
      content_hash: '', // TODO: Generate hash
      audit_hash_chain: '', // TODO: Generate chain
    });

    if (error) {
      logError('Failed to post Sin message', error);
    } else {
      logInfo(`Sin posted message in room ${roomId}`);
    }
  } catch (error) {
    logError('postSinMessage error', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Scan rooms and activate Sin in empty ones
 */
export async function scanAndActivateSin(): Promise<void> {
  try {
    logInfo('Sin worker: Scanning rooms...');

    // Get rooms with user count < 2
    const { data: rooms, error } = await supabase
      .from('rooms')
      .select(`
        id,
        name,
        room_members(count)
      `);

    if (error) {
      logError('Failed to scan rooms', error);
      return;
    }

    if (!rooms || rooms.length === 0) {
      return;
    }

    // Check each room's member count
    for (const room of rooms) {
      const { count } = await supabase
        .from('room_members')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', room.id);

      const memberCount = count || 0;

      if (memberCount < 2) {
        logInfo(`Room ${room.name} has ${memberCount} members - activating Sin`);

        // Get recent messages
        const messages = await getRoomMessages(room.id, 20);

        // Generate Sin's response
        const response = await callGrokAPI(messages);

        if (response) {
          // Post response every 10 seconds (streaming simulation)
          await postSinMessage(room.id, response);
        }
      }
    }

    logInfo('Sin worker: Scan complete');
  } catch (error) {
    logError('Sin worker error', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Start Sin worker cron (runs every 5 minutes)
 */
export function startSinWorker(): void {
  logInfo('Sin worker started - running every 5 minutes');

  // Run immediately
  scanAndActivateSin();

  // Then every 5 minutes
  setInterval(() => {
    scanAndActivateSin();
  }, 5 * 60 * 1000); // 5 minutes
}

