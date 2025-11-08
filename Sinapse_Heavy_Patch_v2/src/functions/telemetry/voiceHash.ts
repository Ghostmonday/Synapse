import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

export async function encodeVoiceHash(audioBuffer: Buffer, userId: string): Promise<Buffer> {
  const hash = require('crypto').createHash('sha256').update(userId + Date.now()).digest('hex');
  const metadata = Buffer.from(JSON.stringify({ sinapse_hash: hash }), 'utf8');
  const padded = Buffer.alloc(128, 0);
  metadata.copy(padded);
  return Buffer.concat([padded, audioBuffer]);
}

export async function verifyVoiceHash(audioBuffer: Buffer, expectedUserId: string): Promise<boolean> {
  const metadata = audioBuffer.slice(0, 128).toString('utf8').trim();
  try {
    const { sinapse_hash } = JSON.parse(metadata);
    const expected = require('crypto').createHash('sha256').update(expectedUserId + Date.now()).digest('hex');
    return sinapse_hash === expected;
  } catch {
    return false;
  }
}
