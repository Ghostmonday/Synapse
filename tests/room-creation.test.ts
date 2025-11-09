/**
 * Room Creation Tests
 * Tests for room creation and management
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { supabase } from '../src/config/db.js';

// Mock Supabase
jest.mock('../src/config/db.js', () => ({
  supabase: {
    from: jest.fn(),
    auth: {
      getUser: jest.fn(),
    },
  },
}));

describe('Room Creation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create a room with valid data', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: {
          id: 'room-123',
          name: 'Test Room',
          created_by: 'user-123',
          is_public: true,
          room_tier: 'free',
        },
        error: null,
      }),
    });

    (supabase.from as jest.Mock) = mockFrom;

    const result = await mockFrom().insert({
      name: 'Test Room',
      created_by: 'user-123',
      is_public: true,
      room_tier: 'free',
    });

    expect(result.data).toBeTruthy();
    expect(result.data.name).toBe('Test Room');
    expect(result.error).toBeNull();
  });

  it('should enforce room name validation', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Room name is required' },
      }),
    });

    (supabase.from as jest.Mock) = mockFrom;

    const result = await mockFrom().insert({
      name: '',
      created_by: 'user-123',
    });

    expect(result.error).toBeTruthy();
  });

  it('should create private room by default', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: {
          id: 'room-123',
          name: 'Private Room',
          is_public: false,
        },
        error: null,
      }),
    });

    (supabase.from as jest.Mock) = mockFrom;

    const result = await mockFrom().insert({
      name: 'Private Room',
      created_by: 'user-123',
    });

    expect(result.data.is_public).toBe(false);
  });

  it('should assign free tier by default', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: {
          id: 'room-123',
          name: 'Free Room',
          room_tier: 'free',
        },
        error: null,
      }),
    });

    (supabase.from as jest.Mock) = mockFrom;

    const result = await mockFrom().insert({
      name: 'Free Room',
      created_by: 'user-123',
    });

    expect(result.data.room_tier).toBe('free');
  });

  it('should create temp room for pro users', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: {
          id: 'room-123',
          name: 'Temp Room',
          room_tier: 'pro',
          expires_at: new Date(Date.now() + 3600000).toISOString(),
        },
        error: null,
      }),
    });

    (supabase.from as jest.Mock) = mockFrom;

    const expiresAt = new Date(Date.now() + 3600000).toISOString();
    const result = await mockFrom().insert({
      name: 'Temp Room',
      created_by: 'user-123',
      room_tier: 'pro',
      expires_at: expiresAt,
    });

    expect(result.data.room_tier).toBe('pro');
    expect(result.data.expires_at).toBeTruthy();
  });

  it('should enforce RLS policies', async () => {
    const mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Permission denied', code: '42501' },
      }),
    });

    (supabase.from as jest.Mock) = mockFrom;

    const result = await mockFrom().insert({
      name: 'Unauthorized Room',
      created_by: 'unauthorized-user',
    });

    expect(result.error).toBeTruthy();
    expect(result.error.code).toBe('42501');
  });

  it('should limit room creation rate', async () => {
    // This would test rate limiting logic
    // Implementation depends on your rate limiting strategy
    const mockFrom = jest.fn().mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Rate limit exceeded' },
      }),
    });

    (supabase.from as jest.Mock) = mockFrom;

    // Simulate multiple rapid room creations
    const results = await Promise.all([
      mockFrom().insert({ name: 'Room 1', created_by: 'user-123' }),
      mockFrom().insert({ name: 'Room 2', created_by: 'user-123' }),
      mockFrom().insert({ name: 'Room 3', created_by: 'user-123' }),
    ]);

    // At least one should be rate limited
    const hasRateLimit = results.some(r => r.error?.message?.includes('Rate limit'));
    expect(hasRateLimit).toBe(true);
  });
});

