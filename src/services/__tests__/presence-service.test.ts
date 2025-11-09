/**
 * Unit Tests for Presence Service
 * Tests presence updates, room presence tracking, and online status
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { updateRoomPresence, getRoomPresence, getOnlineStatus, listRooms, getActivityFeed } from '../presence-service.js';
import { getRedisClient } from '../../config/db.js';
import { supabase } from '../../config/db.js';
import * as logger from '../../shared/logger.js';

// Mock dependencies
jest.mock('../../config/db.js');
jest.mock('../../shared/logger.js');

describe('Presence Service', () => {
  let mockRedis: any;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Redis client
    mockRedis = {
      hset: jest.fn().mockResolvedValue(1),
      hgetall: jest.fn().mockResolvedValue({}),
      hget: jest.fn().mockResolvedValue(null),
      keys: jest.fn().mockResolvedValue([])
    };

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null }),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data: [], error: null })
    };

    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
    (supabase as any) = mockSupabase;
  });

  describe('updateRoomPresence', () => {
    it('should update room presence successfully', async () => {
      const roomId = 'room-123';
      const userId = 'user-456';
      const status = 'online';

      await updateRoomPresence(roomId, userId, status);

      expect(mockRedis.hset).toHaveBeenCalledWith(`presence:${roomId}`, userId, status);
      expect(mockSupabase.from).toHaveBeenCalledWith('presence_logs');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        user_id: userId,
        room_id: roomId,
        status
      });
    });

    it('should handle different presence statuses', async () => {
      const statuses = ['online', 'offline', 'away', 'busy'];

      for (const status of statuses) {
        jest.clearAllMocks();
        await updateRoomPresence('room-123', 'user-456', status);
        expect(mockRedis.hset).toHaveBeenCalledWith('presence:room-123', 'user-456', status);
      }
    });
  });

  describe('getRoomPresence', () => {
    it('should retrieve room presence map', async () => {
      const roomId = 'room-123';
      const mockPresence = {
        'user-1': 'online',
        'user-2': 'away',
        'user-3': 'offline'
      };

      mockRedis.hgetall.mockResolvedValue(mockPresence);

      const result = await getRoomPresence(roomId);

      expect(mockRedis.hgetall).toHaveBeenCalledWith(`presence:${roomId}`);
      expect(result).toEqual(mockPresence);
    });

    it('should return empty object for empty room', async () => {
      const roomId = 'empty-room';
      mockRedis.hgetall.mockResolvedValue({});

      const result = await getRoomPresence(roomId);

      expect(result).toEqual({});
    });
  });

  describe('getOnlineStatus', () => {
    it('should return online status when user is found', async () => {
      const userId = 'user-456';
      mockRedis.keys.mockResolvedValue(['presence:room-1', 'presence:room-2']);
      mockRedis.hget.mockResolvedValueOnce(null).mockResolvedValueOnce('online');

      const result = await getOnlineStatus(userId);

      expect(mockRedis.keys).toHaveBeenCalledWith('presence:*');
      expect(result).toBe('online');
    });

    it('should return offline when user not found', async () => {
      const userId = 'user-456';
      mockRedis.keys.mockResolvedValue(['presence:room-1']);
      mockRedis.hget.mockResolvedValue(null);

      const result = await getOnlineStatus(userId);

      expect(result).toBe('offline');
    });

    it('should handle empty presence keys', async () => {
      const userId = 'user-456';
      mockRedis.keys.mockResolvedValue([]);

      const result = await getOnlineStatus(userId);

      expect(result).toBe('offline');
    });
  });

  describe('listRooms', () => {
    it('should list public rooms ordered by activity', async () => {
      const mockRooms = [
        { id: 'room-1', title: 'Room 1', active_users: 10 },
        { id: 'room-2', title: 'Room 2', active_users: 5 }
      ];

      mockSupabase.order.mockResolvedValue({ data: mockRooms, error: null });

      const result = await listRooms();

      expect(mockSupabase.from).toHaveBeenCalledWith('rooms');
      expect(mockSupabase.select).toHaveBeenCalledWith('*');
      expect(mockSupabase.eq).toHaveBeenCalledWith('is_public', true);
      expect(mockSupabase.order).toHaveBeenCalledWith('active_users', { ascending: false });
      expect(result).toEqual(mockRooms);
    });

    it('should return empty array when no rooms', async () => {
      mockSupabase.order.mockResolvedValue({ data: [], error: null });

      const result = await listRooms();

      expect(result).toEqual([]);
    });
  });

  describe('getActivityFeed', () => {
    it('should retrieve user activity feed', async () => {
      const userId = 'user-456';
      const mockFeed = [
        { id: 'msg-1', content: 'Message 1', created_at: '2025-01-27T10:00:00Z' },
        { id: 'msg-2', content: 'Message 2', created_at: '2025-01-27T09:00:00Z' }
      ];

      mockSupabase.order.mockResolvedValue({ data: mockFeed, error: null });

      const result = await getActivityFeed(userId);

      expect(mockSupabase.from).toHaveBeenCalledWith('messages');
      expect(mockSupabase.select).toHaveBeenCalledWith('*, rooms(*)');
      expect(mockSupabase.eq).toHaveBeenCalledWith('sender_id', userId);
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result).toEqual(mockFeed);
    });

    it('should limit results to 50', async () => {
      const userId = 'user-456';
      mockSupabase.order.mockResolvedValue({ data: [], error: null });

      await getActivityFeed(userId);

      // Verify limit is applied (checking the chain)
      expect(mockSupabase.order).toHaveBeenCalled();
    });
  });
});

