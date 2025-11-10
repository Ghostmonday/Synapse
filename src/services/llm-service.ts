import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { getOpenAIKey, getApiKey } from './api-keys-service.js';

// Clients initialized lazily
let clients: Record<string, any> = {};

async function getClient(model: string) {
  if (clients[model]) return clients[model];
  
  if (model === 'gpt-4') {
    const apiKey = await getOpenAIKey();
    if (apiKey) {
      clients[model] = new OpenAI({ apiKey });
      return clients[model];
    }
  } else if (model === 'claude') {
    const apiKey = await getApiKey('ANTHROPIC_KEY');
    if (apiKey) {
      clients[model] = new Anthropic({ apiKey });
      return clients[model];
    }
  }
  return null;
}

// @llm_param - Generic LLM invocation function. Parameters: model (which LLM to use), prompt (user input), temperature (creativity/randomness control).
export async function invokeLLM(model: string, prompt: string, temperature: number): Promise<AsyncIterable<string>> {
  const client = await getClient(model);
  if (!client) {
    throw new Error(`LLM client not configured for model: ${model}`);
  }
  
  if (model === 'gpt-4') {
    const stream = await client.chat.completions.create({
      // @llm_param - Model selection for LLM invocation.
      model,
      messages: [{ role: 'user', content: prompt }],
      // @llm_param - Temperature parameter controls output randomness. Higher = more creative, lower = more deterministic.
      temperature,
      stream: true,
    });
    return (async function* () {
      for await (const chunk of stream) {
        yield chunk.choices[0]?.delta?.content || '';
      }
    })();
  }
  // Similar for others
  throw new Error('Unsupported model');
}

