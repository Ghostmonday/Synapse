import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';
import { getOpenAIKey, getApiKey, getDeepSeekKey } from './api-keys-service.js';

// Clients initialized lazily
let clients: Record<string, OpenAI | Anthropic | null> = {};

async function getClient(model: string): Promise<OpenAI | Anthropic | null> {
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
  } else if (model === 'deepseek-chat') {
    // DeepSeek uses OpenAI-compatible API
    const apiKey = await getDeepSeekKey();
    if (apiKey) {
      clients[model] = new OpenAI({ 
        apiKey,
        baseURL: 'https://api.deepseek.com/v1'
      });
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
  
  // OpenAI-compatible API (OpenAI, DeepSeek)
  if (model === 'gpt-4' || model === 'deepseek-chat') {
    const openaiClient = client as OpenAI;
    const stream = await openaiClient.chat.completions.create({
      // @llm_param - Model selection for LLM invocation.
      model: model === 'deepseek-chat' ? 'deepseek-chat' : model,
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
  
  // Anthropic Claude
  if (model === 'claude') {
    const claudeClient = client as Anthropic;
    const stream = await claudeClient.messages.stream({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });
    
    return (async function* () {
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          yield chunk.delta.text;
        }
      }
    })();
  }
  
  throw new Error(`Unsupported model: ${model}`);
}

