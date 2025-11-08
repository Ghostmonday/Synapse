/**
 * LLM Reasoner service using OpenAI/DeepSeek LLM to analyze telemetry and generate reasoned actions
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { TelemetryData } from './telemetry_collector.js';
import { PredictionOutput } from './types.js';
import { supabase } from '../config/db.js';
import { logError } from '../shared/logger.js';

// Define Zod schema for prediction output
const PredictionSchema = z.object({
  failures: z.array(z.string()).optional(),
  recommendations: z.string().optional(),
  reasoning: z.string().optional(),
  proposedActions: z.array(z.string()).optional(),
});

export class LLMReasoner {
  private client: OpenAI;

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  async reason(telemetry: TelemetryData): Promise<{ reasoning: string; proposedActions: string[] }> {
    const prompt = `Analyze telemetry: ${JSON.stringify(telemetry)}. Suggest repairs for Sinaps backend issues like high latency or resource exhaustion. Output JSON: {reasoning, proposedActions}.`;
    
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an AI operations agent. Analyze telemetry and suggest repair actions. Always return valid JSON with "reasoning" and "proposedActions" fields.' },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.0,
        max_tokens: 800
      });
      
      const content = response.choices[0]?.message?.content || '{}';
      
      try {
        const parsed = JSON.parse(content);
        const validated = PredictionSchema.safeParse(parsed);

        if (!validated.success) {
          throw new Error(`Validation failed: ${validated.error.message}`);
        }

        return {
          reasoning: validated.data.reasoning || 'No reasoning provided',
          proposedActions: Array.isArray(validated.data.proposedActions) ? validated.data.proposedActions : []
        };
      } catch (parseError: any) {
        // Log LLM parse error to healing_logs
        await supabase.from('healing_logs').insert({
          type: 'llm_parse_error',
          details: parseError.message || String(parseError),
          timestamp: new Date().toISOString(),
        });

        logError('LLM JSON parse/validation error', parseError);
        throw parseError;
      }
    } catch (error: any) {
      logError('LLM reasoning error', error);
      
      // Log to healing_logs if not already logged
      if (!error.message?.includes('Validation failed') && !error.message?.includes('parse')) {
        await supabase.from('healing_logs').insert({
          type: 'llm_reasoning_error',
          details: error.message || String(error),
          timestamp: new Date().toISOString(),
        });
      }
      
      return {
        reasoning: 'Error during reasoning analysis',
        proposedActions: []
      };
    }
  }

  /**
   * Predict failures from telemetry events (alternative method)
   */
  async predict(input: string): Promise<PredictionOutput> {
    try {
      const response = await this.client.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are an AI operations agent. Analyze telemetry and predict failures. Always return valid JSON with "failures" (array of strings) and "recommendations" (string) fields.' },
          { role: 'user', content: input }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.0,
        max_tokens: 800
      });

      const content = response.choices[0]?.message?.content || '{}';
      
      try {
        const parsed = JSON.parse(content);
        const validated = PredictionSchema.safeParse(parsed);

        if (!validated.success) {
          throw new Error(`Validation failed: ${validated.error.message}`);
        }

        return {
          failures: validated.data.failures || [],
          recommendations: validated.data.recommendations || '',
          reasoning: validated.data.reasoning,
          proposedActions: validated.data.proposedActions,
        };
      } catch (parseError: any) {
        // Log LLM parse error
        await supabase.from('healing_logs').insert({
          type: 'llm_parse_error',
          details: parseError.message || String(parseError),
          timestamp: new Date().toISOString(),
        });

        logError('LLM predict parse/validation error', parseError);
        throw parseError;
      }
    } catch (error: any) {
      logError('LLM predict error', error);
      throw error;
    }
  }
}

