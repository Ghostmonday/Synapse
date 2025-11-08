/**
 * Voice Hash Telemetry
 * Encodes and verifies voice audio with hash metadata for integrity checking
 */

import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

/**
 * Encode voice audio buffer with hash metadata
 * Prepends 128-byte metadata containing hash information
 */
export async function encodeVoiceHash(audioBuffer: Buffer, userId: string): Promise<Buffer> {
  const hash = crypto.createHash('sha256').update(userId + Date.now()).digest('hex');
  const metadata = Buffer.from(JSON.stringify({ sinapse_hash: hash }), 'utf8');
  const padded = Buffer.alloc(128, 0);
  metadata.copy(padded);
  return Buffer.concat([padded, audioBuffer]);
}

/**
 * Verify voice audio buffer hash matches expected user
 * Extracts metadata from first 128 bytes and validates hash
 */
export async function verifyVoiceHash(audioBuffer: Buffer, expectedUserId: string): Promise<boolean> {
  const metadata = audioBuffer.slice(0, 128).toString('utf8').trim();
  try {
    const { sinapse_hash } = JSON.parse(metadata);
    const expected = crypto.createHash('sha256').update(expectedUserId + Date.now()).digest('hex');
    return sinapse_hash === expected;
  } catch {
    return false;
  }
}

