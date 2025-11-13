/**
 * User Authentication Service
 * Handles Apple Sign-In verification, username/password login, and JWT token generation
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { findOne, upsert, create } from '../shared/supabase-helpers.js';
import { logError, logInfo } from '../shared/logger.js';
import { verifyAppleTokenWithJWKS } from './apple-jwks-verifier.js';
import { getJwtSecret, getLiveKitKeys } from './api-keys-service.js';

// LiveKit token generation helper (optional - requires @livekit/server-sdk package)
async function createLiveKitToken(userId: string, roomId?: string): Promise<string> {
  try {
    const livekitModule = await import('@livekit/server-sdk') as { TokenGenerator?: new (apiKey: string, apiSecret: string) => { createToken: (grants: unknown, options: unknown) => string } };
    const TokenGenerator = livekitModule.TokenGenerator;
    if (TokenGenerator) {
      const livekitKeys = await getLiveKitKeys();
      if (livekitKeys.apiKey && livekitKeys.apiSecret) {
        const tokenGenerator = new TokenGenerator(livekitKeys.apiKey, livekitKeys.apiSecret);
        const room = roomId || 'default';
        return tokenGenerator.createToken({ video: { roomJoin: true, room } }, { identity: userId });
      }
    }
  } catch {
    logInfo('LiveKit SDK not available - video token generation disabled');
  }
  return '';
}

/**
 * Verify Apple ID token using Apple's JWKS and create user session
 * Returns JWT token and LiveKit room token
 */
export async function verifyAppleSignInToken(token: string, ageVerified?: boolean): Promise<{ jwt: string; livekitToken: string }> {
  try {
    if (!token) {
      throw new Error('Apple authentication token is required');
    }

    // Verify Apple ID token using JWKS
    const payload = await verifyAppleTokenWithJWKS(token);
    
    const appleUserId = payload.sub;

    // Create or update user record with age verification
    try {
      const userData: Record<string, unknown> = { id: appleUserId };
      if (ageVerified !== undefined) {
        userData.age_verified = ageVerified;
      }
      await upsert('users', userData, 'id'); // Race: concurrent sign-ins can conflict
    } catch (upsertError: unknown) {
      // Non-critical: user might already exist
      logInfo('User record update (non-critical):', upsertError instanceof Error ? upsertError.message : String(upsertError)); // Silent fail: user creation fails but JWT still issued
    }

    // Generate application JWT token (from vault)
    const jwtSecret = await getJwtSecret();
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not found in vault');
    }

    const applicationToken = jwt.sign(
      { userId: appleUserId },
      jwtSecret,
      { expiresIn: '7d' } // JWT renewal: no refresh token, user must re-auth after 7 days
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
    const user = await findOne<{ id: string; password_hash?: string; password?: string }>('users', {
      username
    });

    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Check if user has password_hash (new system) or password (legacy)
    let isValid = false;
    if (user.password_hash) {
      // New system: verify bcrypt hash
      isValid = await bcrypt.compare(password, user.password_hash);
    } else if (user.password) {
      // Legacy system: migrate to hash
      isValid = password === user.password;
      if (isValid) {
        // Migrate to hashed password
        const password_hash = await bcrypt.hash(password, 10);
        await upsert('users', { id: user.id, password_hash }, 'id');
        logInfo('User password migrated to hash', user.id);
      }
    } else {
      throw new Error('Invalid username or password');
    }

    if (!isValid) {
      throw new Error('Invalid username or password');
    }

    // Get JWT secret from vault
    const jwtSecret = await getJwtSecret();
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not found in vault');
    }

    const applicationToken = jwt.sign(
      { userId: user.id },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return { jwt: applicationToken };
  } catch (error: unknown) {
    logError('Credential authentication failed', error instanceof Error ? error : new Error(String(error)));
    throw new Error(error instanceof Error ? error.message : 'Login failed');
  }
}

/**
 * Register a new user with username and password
 * Returns JWT token for the new user
 */
export async function registerUser(
  username: string,
  password: string,
  ageVerified?: boolean
): Promise<{ jwt: string }> {
  try {
    // Check if user already exists
    const existingUser = await findOne('users', { username });
    if (existingUser) {
      throw new Error('Username already exists');
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Create user
    const userData: Record<string, unknown> = {
      username,
      password_hash,
      subscription: 'free'
    };
    if (ageVerified !== undefined) {
      userData.age_verified = ageVerified;
    }
    const user = await create('users', userData);

    // Get JWT secret from vault
    const jwtSecret = await getJwtSecret();
    if (!jwtSecret) {
      throw new Error('JWT_SECRET not found in vault');
    }

    const applicationToken = jwt.sign(
      { userId: user.id },
      jwtSecret,
      { expiresIn: '7d' }
    );

    return { jwt: applicationToken };
  } catch (error: unknown) {
    logError('Registration failed', error instanceof Error ? error : new Error(String(error)));
    throw new Error(error instanceof Error ? error.message : 'Registration failed');
  }
}

