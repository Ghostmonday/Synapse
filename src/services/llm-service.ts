import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

const clients: Record<string, any> = {
  'gpt-4': new OpenAI({ apiKey: process.env.OPENAI_KEY }),
  'claude': new Anthropic({ apiKey: process.env.ANTHROPIC_KEY }),
};

// @llm_param - Generic LLM invocation function. Parameters: model (which LLM to use), prompt (user input), temperature (creativity/randomness control).
export async function invokeLLM(model: string, prompt: string, temperature: number): Promise<AsyncIterable<string>> {
  const client = clients[model];
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

