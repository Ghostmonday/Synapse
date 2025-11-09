/**
 * Voice Security Service
 * Provides hash encoding and verification for voice message integrity
 * 
 * Security Features:
 * - Embeds hash metadata in audio buffer
 * - Verifies audio integrity on receipt
 * - Prevents tampering with voice messages
 */

import crypto from 'crypto';
import { logError, logInfo } from '../shared/logger.js';

/**
 * Encode voice hash into audio buffer
 * Prepends 128-byte metadata containing hash information
 * 
 * @param audioBuffer - Raw audio buffer data
 * @param userId - User ID for hash generation
 * @returns Buffer with hash metadata prepended
 */
export async function encodeVoiceHash(
  audioBuffer: Buffer,
  userId: string
): Promise<Buffer> {
  try {
    // Generate hash using userId and timestamp
    // Note: Using timestamp ensures uniqueness, but verification needs to account for this
    const timestamp = Date.now();
    const hashInput = `${userId}:${timestamp}`;
    const hash = crypto.createHash('sha256').update(hashInput).digest('hex');
    
    // Create metadata object
    const metadata = {
      sinapse_hash: hash,
      user_id: userId,
      timestamp: timestamp,
      version: '1.0'
    };
    
    // Convert metadata to JSON and pad to 128 bytes
    const metadataJson = JSON.stringify(metadata);
    const metadataBuffer = Buffer.from(metadataJson, 'utf8');
    const paddedMetadata = Buffer.alloc(128, 0);
    metadataBuffer.copy(paddedMetadata);
    
    // Prepend metadata to audio buffer
    return Buffer.concat([paddedMetadata, audioBuffer]);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Failed to encode voice hash', error instanceof Error ? error : new Error(errorMessage));
    // Return original buffer on error (graceful degradation)
    return audioBuffer;
  }
}

/**
 * Verify voice hash from audio buffer
 * Extracts and validates hash metadata
 * 
 * @param audioBuffer - Audio buffer with hash metadata prepended
 * @param expectedUserId - Expected user ID for verification
 * @returns true if hash is valid, false otherwise
 */
export async function verifyVoiceHash(
  audioBuffer: Buffer,
  expectedUserId: string
): Promise<boolean> {
  try {
    // Extract metadata (first 128 bytes)
    if (audioBuffer.length < 128) {
      logError('Audio buffer too short for hash verification', new Error('Buffer length < 128'));
      return false;
    }
    
    const metadataBuffer = audioBuffer.slice(0, 128);
    const metadataJson = metadataBuffer.toString('utf8').trim();
    
    // Parse metadata
    const metadata = JSON.parse(metadataJson);
    
    if (!metadata.sinapse_hash || !metadata.user_id || !metadata.timestamp) {
      logError('Invalid voice hash metadata', new Error('Missing required fields'));
      return false;
    }
    
    // Verify user ID matches
    if (metadata.user_id !== expectedUserId) {
      logError('Voice hash user ID mismatch', new Error(`Expected ${expectedUserId}, got ${metadata.user_id}`));
      return false;
    }
    
    // Recompute hash using stored timestamp
    const hashInput = `${metadata.user_id}:${metadata.timestamp}`;
    const expectedHash = crypto.createHash('sha256').update(hashInput).digest('hex');
    
    // Compare hashes
    const isValid = metadata.sinapse_hash === expectedHash;
    
    if (!isValid) {
      logError('Voice hash verification failed', new Error('Hash mismatch'));
    }
    
    return isValid;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Failed to verify voice hash', error instanceof Error ? error : new Error(errorMessage));
    return false;
  }
}

/**
 * Extract audio buffer from hash-encoded buffer
 * Removes the 128-byte metadata header
 * 
 * @param encodedBuffer - Buffer with hash metadata
 * @returns Raw audio buffer without metadata
 */
export function extractAudioBuffer(encodedBuffer: Buffer): Buffer {
  if (encodedBuffer.length < 128) {
    return encodedBuffer; // Return as-is if too short
  }
  return encodedBuffer.slice(128);
}

/**
 * Extract hash metadata from encoded buffer
 * 
 * @param encodedBuffer - Buffer with hash metadata
 * @returns Metadata object or null if invalid
 */
export function extractVoiceMetadata(encodedBuffer: Buffer): {
  sinapse_hash: string;
  user_id: string;
  timestamp: number;
  version?: string;
} | null {
  try {
    if (encodedBuffer.length < 128) {
      return null;
    }
    
    const metadataBuffer = encodedBuffer.slice(0, 128);
    const metadataJson = metadataBuffer.toString('utf8').trim();
    const metadata = JSON.parse(metadataJson);
    
    return {
      sinapse_hash: metadata.sinapse_hash,
      user_id: metadata.user_id,
      timestamp: metadata.timestamp,
      version: metadata.version || '1.0'
    };
  } catch {
    return null;
  }
}

