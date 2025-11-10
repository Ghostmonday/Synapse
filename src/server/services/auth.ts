/**
 * Auth service: Apple verification + JWT + LiveKit token minting
 * Uses REAL JWKS verification (not stubs)
 * 
 * NOTE: This file is kept for backward compatibility but delegates to
 * the real implementation in src/services/user-authentication-service.ts
 */

import { verifyAppleSignInToken, authenticateWithCredentials } from '../../services/user-authentication-service.js';

/**
 * verifyAppleToken - Real JWKS implementation
 * Delegates to user-authentication-service which uses Apple JWKS
 */
export async function verifyAppleToken(token: string) {
  // Use the real JWKS implementation
  return await verifyAppleSignInToken(token);
}

/**
 * login
 * - username/password authentication using bcrypt password hashing
 * - Delegates to user-authentication-service for secure password verification
 */
export async function login(username: string, password: string) {
  // Use the secure authentication service with bcrypt password hashing
  return await authenticateWithCredentials(username, password);
}
