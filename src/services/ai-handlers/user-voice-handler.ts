/**
 * User Voice Handler
 * Processes raw conversation data (transcripts, user input)
 * 
 * Constraints:
 * - Receives raw transcripts with all stutters, emojis, tone shifts preserved
 * - Detects intent, sarcasm, toxicity
 * - Outputs ONLY summaries or flags - NO shell commands ever
 * - No user control actions - pure analysis only
 */

import { getDeepSeekKey } from '../api-keys-service.js';
import { logError, logWarning } from '../../shared/logger.js';
import axios from 'axios';
import { sanitizePrompt } from '../../utils/prompt-sanitizer.js';

export interface UserVoiceAnalysis {
  intent?: string;
  sarcasm?: boolean;
  toxicity?: {
    score: number;
    isToxic: boolean;
    flags: string[];
  };
  sentiment?: 'positive' | 'negative' | 'neutral';
  summary?: string;
  tone?: string;
}

/**
 * Analyze user voice/conversation data
 * Preserves all raw data, outputs analysis only
 */
export async function analyzeUserVoice(
  transcript: string,
  metadata?: {
    userId?: string;
    roomId?: string;
    timestamp?: string;
  }
): Promise<UserVoiceAnalysis> {
  try {
    const deepseekKey = await getDeepSeekKey();
    if (!deepseekKey) {
      logWarning('DeepSeek API key not found - user voice analysis disabled');
      return {};
    }

    // Preserve raw transcript - no sanitization of content itself
    // Only sanitize the prompt wrapper to prevent injection
    const sanitizedTranscript = sanitizePrompt(transcript);
    
    // Strict prompt: analysis only, no actions
    const prompt = `This is conversation data. Analyze the following transcript preserving all stutters, emojis, and tone shifts.

Transcript: ${sanitizedTranscript}

Detect:
1. Intent - what is the user trying to communicate?
2. Sarcasm - is the message sarcastic?
3. Toxicity - score 0-1, is it toxic/hateful/spam?
4. Sentiment - positive, negative, or neutral
5. Tone - describe the tone

Output JSON ONLY with this structure:
{
  "intent": "brief description",
  "sarcasm": true/false,
  "toxicity": {
    "score": 0.0-1.0,
    "isToxic": true/false,
    "flags": ["flag1", "flag2"]
  },
  "sentiment": "positive|negative|neutral",
  "summary": "brief summary",
  "tone": "description"
}

CRITICAL: Output ONLY analysis. NO commands, NO actions, NO shell scripts, NO user control actions.`;

    // Use Supabase Edge Function proxy
    const { getSupabaseKeys } = await import('../api-keys-service.js');
    const supabaseKeys = await getSupabaseKeys();
    const supabaseUrl = supabaseKeys.url;
    const supabaseAnonKey = supabaseKeys.anonKey;

    const response = await axios.post(
      `${supabaseUrl}/functions/v1/llm-proxy`,
      {
        prompt,
        model: 'deepseek-chat',
        intent: 'user_voice_analysis',
      },
      {
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const raw = response.data?.choices?.[0]?.message?.content?.trim() || '{}';
    
    // Parse JSON response
    let result: UserVoiceAnalysis;
    try {
      result = JSON.parse(raw);
    } catch {
      // Try to extract JSON from markdown or text
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response');
      }
    }

    // Validate output - ensure no commands or actions
    const outputStr = JSON.stringify(result).toLowerCase();
    const forbiddenPatterns = [
      /sudo/i,
      /rm\s+-rf/i,
      /exec/i,
      /eval/i,
      /system\(/i,
      /shell/i,
      /command/i,
      /action.*mute/i,
      /action.*ban/i,
      /action.*warn/i
    ];

    if (forbiddenPatterns.some(p => p.test(outputStr))) {
      logError('User voice handler detected forbidden content in output', new Error('Security violation'));
      return {
        summary: 'Analysis failed - security check triggered',
        toxicity: { score: 0, isToxic: false, flags: [] }
      };
    }

    return result;
  } catch (error: any) {
    logError('User voice analysis failed', error);
    return {
      summary: 'Analysis failed',
      toxicity: { score: 0, isToxic: false, flags: [] }
    };
  }
}

