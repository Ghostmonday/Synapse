/**
 * LLM Reasoner service using OpenAI/DeepSeek LLM to analyze telemetry and generate reasoned actions
 */

import OpenAI from 'openai';
import { TelemetryData } from './telemetry_collector.js';

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
      const parsed = JSON.parse(content);
      
      return {
        reasoning: parsed.reasoning || 'No reasoning provided',
        proposedActions: Array.isArray(parsed.proposedActions) ? parsed.proposedActions : []
      };
    } catch (error) {
      console.error('LLM reasoning error:', error);
      return {
        reasoning: 'Error during reasoning analysis',
        proposedActions: []
      };
    }
  }
}

