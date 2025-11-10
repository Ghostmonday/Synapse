/**
 * User Control Handler
 * Processes moderation actions (bans, mutes, profile changes)
 * 
 * Constraints:
 * - Text-heavy moderation data
 * - Output LOCKED to JSON format: {user_id: 123, action: 'mute', reason: 'spam'}
 * - NO shell commands, NO scripts, NO sudo
 * - Only returns structured moderation actions
 */

import { getDeepSeekKey } from '../api-keys-service.js';
import { logError, logWarning } from '../../shared/logger.js';
import axios from 'axios';
import { sanitizePrompt } from '../../utils/prompt-sanitizer.js';
import { z } from 'zod';

// Strict schema for moderation action output
const ModerationActionSchema = z.object({
  user_id: z.string().or(z.number()),
  action: z.enum(['mute', 'warn', 'ban', 'none']),
  reason: z.string(),
  duration_minutes: z.number().optional(),
  severity: z.enum(['low', 'medium', 'high']).optional()
});

export type ModerationAction = z.infer<typeof ModerationActionSchema>;

/**
 * Analyze moderation data and return locked JSON format
 * Only returns structured moderation actions - no commands
 */
export async function analyzeUserControl(
  moderationData: {
    content?: string;
    userId?: string;
    roomId?: string;
    violationCount?: number;
    previousActions?: string[];
    context?: Record<string, any>;
  }
): Promise<ModerationAction> {
  try {
    const deepseekKey = await getDeepSeekKey();
    if (!deepseekKey) {
      logWarning('DeepSeek API key not found - user control analysis disabled');
      return {
        user_id: moderationData.userId || 'unknown',
        action: 'none',
        reason: 'Analysis unavailable'
      };
    }

    // Sanitize input
    const sanitizedContent = moderationData.content ? sanitizePrompt(moderationData.content) : '';
    
    // Strict prompt: locked JSON output only
    const prompt = `Analyze this moderation data and determine appropriate action.

Content: ${sanitizedContent}
User ID: ${moderationData.userId || 'unknown'}
Room ID: ${moderationData.roomId || 'unknown'}
Violation Count: ${moderationData.violationCount || 0}
Previous Actions: ${JSON.stringify(moderationData.previousActions || [])}
Context: ${JSON.stringify(moderationData.context || {})}

Output JSON ONLY in this exact format:
{
  "user_id": "string or number",
  "action": "mute" | "warn" | "ban" | "none",
  "reason": "brief explanation",
  "duration_minutes": number (optional, for mute/ban),
  "severity": "low" | "medium" | "high" (optional)
}

CRITICAL RULES:
- Output ONLY this JSON structure
- NO shell commands
- NO scripts
- NO sudo
- NO system operations
- NO other fields
- If no action needed, use action: "none"`;

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
        intent: 'user_control_moderation',
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
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Try to extract JSON from markdown or text
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response');
      }
    }

    // Validate with Zod schema - ensures locked format
    const validated = ModerationActionSchema.safeParse(parsed);
    
    if (!validated.success) {
      logError('User control handler validation failed', validated.error);
      // Return safe default
      return {
        user_id: moderationData.userId || 'unknown',
        action: 'none',
        reason: 'Validation failed - no action taken'
      };
    }

    // Additional security check - ensure no commands in reason field
    const reasonStr = validated.data.reason.toLowerCase();
    const forbiddenPatterns = [
      /sudo/i,
      /rm\s+-rf/i,
      /exec/i,
      /eval/i,
      /system\(/i,
      /shell/i,
      /command/i
    ];

    if (forbiddenPatterns.some(p => p.test(reasonStr))) {
      logError('User control handler detected forbidden content in reason', new Error('Security violation'));
      return {
        user_id: validated.data.user_id,
        action: 'none',
        reason: 'Security check triggered'
      };
    }

    return validated.data;
  } catch (error: any) {
    logError('User control analysis failed', error);
    return {
      user_id: moderationData.userId || 'unknown',
      action: 'none',
      reason: 'Analysis failed'
    };
  }
}

