import { OpenAI } from 'openai';
import { supabase } from '../config/db.js';
import { getOpenAIKey } from './api-keys-service.js';

let openai: OpenAI | null = null;

async function getOpenAIClient(): Promise<OpenAI> {
  if (!openai) {
    const apiKey = await getOpenAIKey();
    openai = new OpenAI({ apiKey });
  }
  return openai;
}

export async function generateEmbedding(content: string): Promise<number[]> {
  const client = await getOpenAIClient();
  const { data } = await client.embeddings.create({
    // @llm_param - Embedding model selection. Controls which model generates vector embeddings for semantic search.
    model: 'text-embedding-3-small',
    input: content,
  });
  return data[0].embedding;
}

export async function storeEmbedding(messageId: string, embedding: number[]): Promise<void> {
  await supabase.from('embeddings').insert({ message_id: messageId, vector: embedding });
}

