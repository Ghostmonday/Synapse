/**
 * User Authentication Service
 * Handles Apple Sign-In verification, username/password login, and JWT token generation
 */

import appleSignin from 'apple-signin-auth';
import jwt from 'jsonwebtoken';
import { findOne, upsert } from '../shared/supabase-helpers.js';
import { logError, logInfo } from '../shared/logger.js';

// LiveKit token generation helper (optional - requires @livekit/server-sdk package)
async function createLiveKitToken(userId: string): Promise<string> {
  try {
    const livekitModule = await import('@livekit/server-sdk') as { TokenGenerator?: new (apiKey: string, apiSecret: string) => { createToken: (grants: unknown, options: unknown) => string } };
    const TokenGenerator = livekitModule.TokenGenerator;
    if (TokenGenerator && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET) {
      const tokenGenerator = new TokenGenerator(process.env.LIVEKIT_API_KEY, process.env.LIVEKIT_API_SECRET);
      return tokenGenerator.createToken({ video: { roomJoin: true, room: 'default' } }, { identity: userId });
    }
  } catch {
    logInfo('LiveKit SDK not available - video token generation disabled');
  }
  return '';
}

/**
 * Verify Apple ID token and create user session
 * Returns JWT token and LiveKit room token
 */
export async function verifyAppleSignInToken(token: string): Promise<{ jwt: string; livekitToken: string }> {
  try {
    if (!token) {
      throw new Error('Apple authentication token is required');
    }

    // Verify Apple ID token
    const payload = await appleSignin.verifyIdToken(token, {
      audience: process.env.APPLE_APP_BUNDLE || 'com.your.app'
    });
    
    const appleUserId = (payload as { sub: string }).sub;

    // Create or update user record
    try {
      await upsert('users', { id: appleUserId }, 'id');
    } catch (upsertError: unknown) {
      // Non-critical: user might already exist
      logInfo('User record update (non-critical):', upsertError instanceof Error ? upsertError.message : String(upsertError));
    }

    // Generate application JWT token
    const applicationToken = jwt.sign(
      { userId: appleUserId },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    // Generate LiveKit room token for video calls (if available)
    const liveKitRoomToken = await createLiveKitToken(appleUserId);

    return {
      jwt: applicationToken,
      livekitToken: liveKitRoomToken
    };
  } catch (error: unknown) {
    logError('Apple Sign-In verification failed', error instanceof Error ? error : new Error(String(error)));
    throw new Error(error instanceof Error ? error.message : 'Failed to verify Apple authentication token');
  }
}

/**
 * Authenticate user with username and password
 * Returns JWT token for the authenticated user
 */
export async function authenticateWithCredentials(
  username: string,
  password: string
): Promise<{ jwt: string }> {
  try {
    const user = await findOne<{ id: string }>('users', {
      username,
      password // Note: In production, use password_hash with bcrypt
    });

    if (!user) {
      throw new Error('Invalid username or password');
    }

    const applicationToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    return { jwt: applicationToken };
  } catch (error: unknown) {
    logError('Credential authentication failed', error instanceof Error ? error : new Error(String(error)));
    throw new Error(error instanceof Error ? error.message : 'Login failed');
  }
}

