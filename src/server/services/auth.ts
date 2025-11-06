/**
 * Auth service: Apple verification + JWT + LiveKit token minting
 * Uses Supabase REST API
 *
 * NOTE: apple-signin-auth verifyIdToken requires Apple key and proper audience
 * and @livekit/server-sdk TokenGenerator is used to mint room tokens.
 */

import appleSignin from 'apple-signin-auth';
import jwt from 'jsonwebtoken';
import { supabase } from '../../config/db.js';
import { logInfo, logError } from '../../shared/logger.js';

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
 * verifyAppleToken
 * - verify Apple token
 * - ensure user exists in DB
 * - return { jwt, livekitToken }
 */
export async function verifyAppleToken(token: string) {
  try {
    // Defensive: if token missing, throw
    if (!token) throw new Error('Missing Apple token');

    // verifyIdToken will throw if invalid
    const payload = await appleSignin.verifyIdToken(token, { audience: process.env.APPLE_APP_BUNDLE || 'com.your.app' });
    const userId = (payload as { sub: string }).sub;

    // Persist user stub: create if not exists (using Supabase upsert pattern)
    const { error: userError } = await supabase
      .from('users')
      .upsert({ id: userId }, { onConflict: 'id', ignoreDuplicates: true });

    if (userError) {
      logInfo('User upsert error (non-critical):', userError.message);
      // Continue even if upsert fails (user might already exist)
    }

    // Issue JWT
    const appJwt = jwt.sign({ userId }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });

    // Mint LiveKit token for default room (if available)
    const livekitToken = await createLiveKitToken(userId);

    return { jwt: appJwt, livekitToken };
  } catch (e: unknown) {
    logError('verifyAppleToken error', e instanceof Error ? e : new Error(String(e)));
    throw new Error(e instanceof Error ? e.message : 'Apple token verification failed');
  }
}

/**
 * login
 * - username/password authentication using Supabase
 */
export async function login(username: string, password: string) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      throw new Error('Invalid credentials');
    }

    const token = jwt.sign({ userId: data.id }, process.env.JWT_SECRET || 'dev_secret', { expiresIn: '7d' });
    return { jwt: token };
  } catch (e: unknown) {
    logError('Login error', e instanceof Error ? e : new Error(String(e)));
    throw new Error(e instanceof Error ? e.message : 'Login failed');
  }
}
