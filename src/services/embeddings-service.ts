import { OpenAI } from 'openai';
import { supabase } from '../config/db.js';

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

export async function generateEmbedding(content: string): Promise<number[]> {
  const { data } = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: content,
  });
  return data[0].embedding;
}

export async function storeEmbedding(messageId: string, embedding: number[]): Promise<void> {
  await supabase.from('embeddings').insert({ message_id: messageId, vector: embedding });
}

