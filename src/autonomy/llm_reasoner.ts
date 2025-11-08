/**
 * LLM Reasoner service using OpenAI/DeepSeek LLM to analyze telemetry and generate reasoned actions
 * 
 * This service acts as the "brain" of the autonomy system:
 * - Takes raw telemetry data (CPU, memory, latency metrics)
 * - Uses LLM to reason about what's wrong and why
 * - Generates actionable repair recommendations
 * - Validates LLM output with Zod to ensure safety
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { TelemetryData } from './telemetry_collector.js';
import { PredictionOutput } from './types.js';
import { supabase } from '../config/db.js';
import { logError } from '../shared/logger.js';

// Zod schema validates LLM output structure
// Prevents malformed JSON or missing fields from causing runtime errors
// All fields optional because LLM might not always provide everything
const PredictionSchema = z.object({
  failures: z.array(z.string()).optional(), // List of detected failure types
  recommendations: z.string().optional(), // Human-readable recommendation text
  reasoning: z.string().optional(), // LLM's explanation of the problem
  proposedActions: z.array(z.string()).optional(), // Actionable commands/scripts to run
});

export class LLMReasoner {
  // OpenAI client instance - works with both OpenAI and DeepSeek APIs
  // (DeepSeek is OpenAI-compatible)
  private client: OpenAI;

  constructor(apiKey: string) {
    // Initialize OpenAI client with API key
    // Falls back to empty string if not provided (will fail gracefully on API call)
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Main reasoning method - analyzes telemetry and generates repair actions
   * 
   * Flow:
   * 1. Format telemetry data into prompt
   * 2. Call LLM with structured prompt
   * 3. Parse JSON response
   * 4. Validate with Zod schema
   * 5. Return validated reasoning and actions
   */
  async reason(telemetry: TelemetryData): Promise<{ reasoning: string; proposedActions: string[] }> {
    // Build prompt with telemetry data
    // LLM needs context about what metrics mean and what to suggest
    const prompt = `Analyze telemetry: ${JSON.stringify(telemetry)}. Suggest repairs for Sinaps backend issues like high latency or resource exhaustion. Output JSON: {reasoning, proposedActions}.`;
    
    try {
      // Call LLM API with structured request
      const response = await this.client.chat.completions.create({ // No timeout - can hang if LLM API slow
        model: 'gpt-4', // Can be changed to 'deepseek-chat' for DeepSeek
        messages: [
          // System message sets LLM's role and output format expectations
          { role: 'system', content: 'You are an AI operations agent. Analyze telemetry and suggest repair actions. Always return valid JSON with "reasoning" and "proposedActions" fields.' },
          // User message contains the actual telemetry data to analyze
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' }, // Force JSON output (OpenAI feature)
        temperature: 0.0, // Deterministic output (no randomness)
        max_tokens: 800 // Limit response length to control costs // Load spike: LLM calls expensive, can spike costs under load
      });
      
      // Extract content from response
      // Fallback to empty JSON if response is malformed
      const content = response.choices[0]?.message?.content || '{}'; // Silent fail: empty response treated as valid
      
      try {
        // Parse JSON string to object
        const parsed = JSON.parse(content); // Silent fail: malformed JSON throws, no retry
        
        // Validate structure with Zod schema
        // Catches missing fields, wrong types, etc.
        const validated = PredictionSchema.safeParse(parsed);

        if (!validated.success) {
          // Schema validation failed - LLM returned wrong structure
          throw new Error(`Validation failed: ${validated.error.message}`); // Retry: p-retry will retry, but LLM may return same invalid format
        }

        // Return validated data with safe defaults
        // Ensures we always return valid data even if LLM omits fields
        return {
          reasoning: validated.data.reasoning || 'No reasoning provided',
          proposedActions: Array.isArray(validated.data.proposedActions) ? validated.data.proposedActions : []
        };
      } catch (parseError: any) {
        // JSON parse or validation failed
        // Log to healing_logs for debugging and audit trail
        await supabase.from('healing_logs').insert({
          type: 'llm_parse_error',
          details: parseError.message || String(parseError),
          timestamp: new Date().toISOString(),
        });

        logError('LLM JSON parse/validation error', parseError);
        throw parseError; // Re-throw to caller
      }
    } catch (error: any) {
      // API call failed or other error
      logError('LLM reasoning error', error);
      
      // Log to healing_logs if not already logged (avoid duplicate logs)
      // Check error message to avoid logging parse errors twice
      if (!error.message?.includes('Validation failed') && !error.message?.includes('parse')) {
        await supabase.from('healing_logs').insert({
          type: 'llm_reasoning_error',
          details: error.message || String(error),
          timestamp: new Date().toISOString(),
        });
      }
      
      // Return safe fallback instead of throwing
      // Allows autonomy system to continue even if LLM is down
      return {
        reasoning: 'Error during reasoning analysis',
        proposedActions: []
      };
    }
  }

  /**
   * Predict failures from telemetry events (alternative method)
   * 
   * Similar to reason() but returns more detailed PredictionOutput.
   * Used when you need both failure predictions AND recommendations.
   * 
   * Difference from reason():
   * - Returns full PredictionOutput with failures array
   * - More focused on prediction than action generation
   * - Throws errors instead of returning fallback (caller handles)
   */
  async predict(input: string): Promise<PredictionOutput> {
    try {
      // Call LLM with prediction-focused prompt
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          // System prompt emphasizes failure prediction
          { role: 'system', content: 'You are an AI operations agent. Analyze telemetry and predict failures. Always return valid JSON with "failures" (array of strings) and "recommendations" (string) fields.' },
          { role: 'user', content: input }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.0, // Deterministic
        max_tokens: 800
      });

      const content = response.choices[0]?.message?.content || '{}';
      
      try {
        // Parse and validate same as reason() method
        const parsed = JSON.parse(content);
        const validated = PredictionSchema.safeParse(parsed);

        if (!validated.success) {
          throw new Error(`Validation failed: ${validated.error.message}`);
        }

        // Return full PredictionOutput structure
        return {
          failures: validated.data.failures || [],
          recommendations: validated.data.recommendations || '',
          reasoning: validated.data.reasoning,
          proposedActions: validated.data.proposedActions,
        };
      } catch (parseError: any) {
        // Log parse/validation errors for debugging
        await supabase.from('healing_logs').insert({
          type: 'llm_parse_error',
          details: parseError.message || String(parseError),
          timestamp: new Date().toISOString(),
        });

        logError('LLM predict parse/validation error', parseError);
        throw parseError; // Re-throw (caller must handle)
      }
    } catch (error: any) {
      // API or other errors
      logError('LLM predict error', error);
      throw error; // Re-throw (caller must handle)
    }
  }
}

