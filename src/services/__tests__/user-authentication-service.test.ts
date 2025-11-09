/**
 * Unit Tests for User Authentication Service
 * Tests Apple Sign-In, credential authentication, and JWT generation
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { verifyAppleSignInToken, authenticateWithCredentials, registerUser } from '../user-authentication-service.js';
import * as supabaseHelpers from '../../shared/supabase-helpers.js';
import * as logger from '../../shared/logger.js';

// Mock dependencies
jest.mock('../../shared/supabase-helpers.js');
jest.mock('../../shared/logger.js');
jest.mock('apple-signin-auth');
jest.mock('bcrypt');
jest.mock('jsonwebtoken');

import appleSignin from 'apple-signin-auth';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

describe('User Authentication Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyAppleSignInToken', () => {
    it('should verify valid Apple token and return JWT', async () => {
      const mockToken = 'valid-apple-token';
      const mockAppleUserId = 'apple-user-123';
      const mockJWT = 'generated-jwt-token';
      const mockLiveKitToken = 'livekit-token';

      // Mock Apple Sign-In verification
      (appleSignin.verifyIdToken as jest.Mock).mockResolvedValue({
        sub: mockAppleUserId
      });

      // Mock user upsert
      (supabaseHelpers.upsert as jest.Mock).mockResolvedValue({ id: mockAppleUserId });

      // Mock JWT generation
      (jwt.sign as jest.Mock).mockReturnValue(mockJWT);

      // Mock LiveKit token (optional)
      process.env.LIVEKIT_API_KEY = 'test-key';
      process.env.LIVEKIT_API_SECRET = 'test-secret';

      const result = await verifyAppleSignInToken(mockToken);

      expect(appleSignin.verifyIdToken).toHaveBeenCalledWith(mockToken, {
        audience: process.env.APPLE_APP_BUNDLE || 'com.your.app'
      });
      expect(supabaseHelpers.upsert).toHaveBeenCalledWith('users', { id: mockAppleUserId }, 'id');
      expect(result.jwt).toBe(mockJWT);
    });

    it('should throw error for missing token', async () => {
      await expect(verifyAppleSignInToken('')).rejects.toThrow('Apple authentication token is required');
    });

    it('should handle invalid Apple token', async () => {
      const mockToken = 'invalid-token';

      (appleSignin.verifyIdToken as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      await expect(verifyAppleSignInToken(mockToken)).rejects.toThrow();
    });

    it('should handle user upsert failure gracefully', async () => {
      const mockToken = 'valid-token';
      const mockAppleUserId = 'apple-user-123';
      const mockJWT = 'generated-jwt';

      (appleSignin.verifyIdToken as jest.Mock).mockResolvedValue({ sub: mockAppleUserId });
      (supabaseHelpers.upsert as jest.Mock).mockRejectedValue(new Error('User exists'));
      (jwt.sign as jest.Mock).mockReturnValue(mockJWT);

      // Should still succeed and return JWT even if upsert fails
      const result = await verifyAppleSignInToken(mockToken);
      expect(result.jwt).toBe(mockJWT);
    });
  });

  describe('authenticateWithCredentials', () => {
    it('should authenticate valid credentials', async () => {
      const username = 'testuser';
      const password = 'password123';
      const hashedPassword = '$2b$10$hashed';
      const userId = 'user-123';
      const mockJWT = 'jwt-token';

      // Mock user lookup
      (supabaseHelpers.findOne as jest.Mock).mockResolvedValue({
        id: userId,
        password_hash: hashedPassword
      });

      // Mock password verification
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      // Mock JWT generation
      (jwt.sign as jest.Mock).mockReturnValue(mockJWT);

      const result = await authenticateWithCredentials(username, password);

      expect(supabaseHelpers.findOne).toHaveBeenCalledWith('users', { username });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result.jwt).toBe(mockJWT);
    });

    it('should reject invalid username', async () => {
      const username = 'nonexistent';
      const password = 'password123';

      (supabaseHelpers.findOne as jest.Mock).mockResolvedValue(null);

      await expect(authenticateWithCredentials(username, password)).rejects.toThrow('Invalid username or password');
    });

    it('should reject invalid password', async () => {
      const username = 'testuser';
      const password = 'wrongpassword';
      const hashedPassword = '$2b$10$hashed';
      const userId = 'user-123';

      (supabaseHelpers.findOne as jest.Mock).mockResolvedValue({
        id: userId,
        password_hash: hashedPassword
      });

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(authenticateWithCredentials(username, password)).rejects.toThrow('Invalid username or password');
    });

    it('should handle missing password hash (legacy user)', async () => {
      const username = 'legacyuser';
      const password = 'password123';
      const userId = 'user-123';

      (supabaseHelpers.findOne as jest.Mock).mockResolvedValue({
        id: userId,
        password_hash: null
      });

      await expect(authenticateWithCredentials(username, password)).rejects.toThrow('Account needs password reset');
    });
  });

  describe('registerUser', () => {
    it('should register new user with hashed password', async () => {
      const username = 'newuser';
      const password = 'password123';
      const hashedPassword = '$2b$10$hashed';
      const userId = 'user-123';
      const mockJWT = 'jwt-token';

      // Mock password hashing
      (bcrypt.hash as jest.Mock).mockResolvedValue(hashedPassword);

      // Mock user creation
      (supabaseHelpers.create as jest.Mock).mockResolvedValue({
        id: userId,
        username,
        password_hash: hashedPassword,
        subscription: 'free'
      });

      // Mock JWT generation
      (jwt.sign as jest.Mock).mockReturnValue(mockJWT);

      const result = await registerUser(username, password);

      expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
      expect(supabaseHelpers.create).toHaveBeenCalledWith('users', {
        username,
        password_hash: hashedPassword,
        subscription: 'free'
      });
      expect(result.jwt).toBe(mockJWT);
    });

    it('should handle registration errors', async () => {
      const username = 'newuser';
      const password = 'password123';

      (bcrypt.hash as jest.Mock).mockResolvedValue('$2b$10$hashed');
      (supabaseHelpers.create as jest.Mock).mockRejectedValue(new Error('Username already exists'));

      await expect(registerUser(username, password)).rejects.toThrow();
    });
  });
});

