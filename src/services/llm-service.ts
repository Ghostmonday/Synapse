import { OpenAI } from 'openai';
import { Anthropic } from '@anthropic-ai/sdk';

const clients: Record<string, any> = {
  'gpt-4': new OpenAI({ apiKey: process.env.OPENAI_KEY }),
  'claude': new Anthropic({ apiKey: process.env.ANTHROPIC_KEY }),
};

export async function invokeLLM(model: string, prompt: string, temperature: number): Promise<AsyncIterable<string>> {
  const client = clients[model];
  if (model === 'gpt-4') {
    const stream = await client.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
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

