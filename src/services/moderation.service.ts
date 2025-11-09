/**
 * Moderation Service
 * AI-powered content moderation using DeepSeek API
 * Enterprise-only feature for room-level moderation
 */

import axios from 'axios';
import { logError, logWarning, logInfo } from '../shared/logger.js';
import { supabase } from '../config/db.js';

/**
 * Analyze message content for toxicity using DeepSeek LLM
 * Returns score (0-1) and label ('safe' | 'toxic')
 */
export async function analyzeMessage(content: string): Promise<{ score: number; label: 'safe' | 'toxic' }> {
  if (!process.env.DEEPSEEK_API_KEY) {
    logWarning('DeepSeek API key not configured - moderation disabled');
    return { score: 0, label: 'safe' };
  }

  const prompt = `Rate this message for toxicity (0 = safe, 1 = extremely toxic). Respond ONLY with JSON: {"score":0.72}
Message: ${content}`;

  try {
    const res = await axios.post(
      'https://api.deepseek.com/v1/chat/completions',
      {
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
      }
    );

    const raw = res.data.choices[0]?.message?.content?.trim() || '{"score":0}';
    
    // Extract score from JSON response
    const scoreMatch = raw.match(/{\s*"score"\s*:\s*([0-9.]+)\s*}/);
    const score = parseFloat(scoreMatch?.[1] || '0');
    
    // Clamp score between 0 and 1
    const clampedScore = Math.max(0, Math.min(1, score));
    const label: 'safe' | 'toxic' = clampedScore > 0.65 ? 'toxic' : 'safe';

    return { score: clampedScore, label };
  } catch (err: any) {
    logError('LLM moderation analysis failed', err);
    // Fail-safe: return safe if API fails
    return { score: 0, label: 'safe' };
  }
}

/**
 * Log moderation flag to database
 */
export async function logFlag(
  roomId: string,
  userId: string,
  messageId: string | null,
  score: number,
  action: string
): Promise<void> {
  try {
    const { error } = await supabase.from('moderation_flags').insert({
      room_id: roomId,
      user_id: userId,
      message_id: messageId,
      score,
      label: score > 0.65 ? 'toxic' : 'safe',
      action_taken: action,
    });

    if (error) {
      logError('Failed to log moderation flag', error);
    } else {
      logInfo(`Moderation flag logged: room=${roomId}, action=${action}, score=${score.toFixed(2)}`);
    }
  } catch (err: any) {
    logError('Error logging moderation flag', err);
  }
}

/**
 * Get room configuration including moderation settings
 */
export async function getRoomById(roomId: string): Promise<{ 
  id: string; 
  ai_moderation: boolean; 
  room_tier: string;
  expires_at?: string | null;
} | null> {
  try {
    const { data, error } = await supabase
      .from('rooms')
      .select('id, ai_moderation, room_tier, expires_at')
      .eq('id', roomId)
      .single();

    if (error || !data) {
      logError('Failed to fetch room', error);
      return null;
    }

    return {
      id: data.id,
      ai_moderation: data.ai_moderation || false,
      room_tier: data.room_tier || 'free',
      expires_at: data.expires_at,
    };
  } catch (err: any) {
    logError('Error fetching room', err);
    return null;
  }
}

