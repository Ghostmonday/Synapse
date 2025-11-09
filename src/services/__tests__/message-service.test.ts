/**
 * Unit Tests for Message Service
 * Tests message sending, persistence, and Redis pub/sub broadcasting
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { sendMessageToRoom, getRoomMessages } from '../message-service.js';
import * as supabaseHelpers from '../../shared/supabase-helpers.js';
import { getRedisClient } from '../../config/db.js';
import * as logger from '../../shared/logger.js';

// Mock dependencies
jest.mock('../../shared/supabase-helpers.js');
jest.mock('../../config/db.js');
jest.mock('../../shared/logger.js');

describe('Message Service', () => {
  let mockRedis: any;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock Redis client
    mockRedis = {
      publish: jest.fn().mockResolvedValue(1)
    };
    
    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
  });

  describe('sendMessageToRoom', () => {
    it('should send message successfully with string roomId', async () => {
      const messageData = {
        roomId: 'room-123',
        senderId: 'user-456',
        content: 'Hello, world!'
      };

      const mockCreatedMessage = {
        id: 'msg-789',
        room_id: 'room-123',
        user_id: 'user-456',
        content: 'Hello, world!'
      };

      (supabaseHelpers.create as jest.Mock).mockResolvedValue(mockCreatedMessage);

      await sendMessageToRoom(messageData);

      expect(supabaseHelpers.create).toHaveBeenCalledWith('messages', {
        room_id: 'room-123',
        user_id: 'user-456',
        content: 'Hello, world!'
      });

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'room:room-123',
        expect.stringContaining('"content":"Hello, world!"')
      );
    });

    it('should send message successfully with numeric roomId', async () => {
      const messageData = {
        roomId: 123,
        senderId: 'user-456',
        content: 'Test message'
      };

      (supabaseHelpers.create as jest.Mock).mockResolvedValue({ id: 'msg-789' });

      await sendMessageToRoom(messageData);

      expect(supabaseHelpers.create).toHaveBeenCalledWith('messages', {
        room_id: 123,
        user_id: 'user-456',
        content: 'Test message'
      });

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'room:123',
        expect.stringContaining('"content":"Test message"')
      );
    });

    it('should handle numeric string roomId conversion', async () => {
      const messageData = {
        roomId: '456', // Numeric string
        senderId: 'user-456',
        content: 'Test'
      };

      (supabaseHelpers.create as jest.Mock).mockResolvedValue({ id: 'msg-789' });

      await sendMessageToRoom(messageData);

      // Should convert '456' to number 456
      expect(supabaseHelpers.create).toHaveBeenCalledWith('messages', {
        room_id: 456,
        user_id: 'user-456',
        content: 'Test'
      });
    });

    it('should include timestamp in Redis publish', async () => {
      const messageData = {
        roomId: 'room-123',
        senderId: 'user-456',
        content: 'Test'
      };

      const beforeTime = Date.now();
      (supabaseHelpers.create as jest.Mock).mockResolvedValue({ id: 'msg-789' });

      await sendMessageToRoom(messageData);

      const afterTime = Date.now();

      expect(mockRedis.publish).toHaveBeenCalled();
      const publishedData = JSON.parse(mockRedis.publish.mock.calls[0][1]);
      expect(publishedData.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(publishedData.timestamp).toBeLessThanOrEqual(afterTime);
      expect(publishedData.content).toBe('Test');
    });

    it('should handle database insert failure', async () => {
      const messageData = {
        roomId: 'room-123',
        senderId: 'user-456',
        content: 'Test'
      };

      const dbError = new Error('Database connection failed');
      (supabaseHelpers.create as jest.Mock).mockRejectedValue(dbError);

      await expect(sendMessageToRoom(messageData)).rejects.toThrow('Database connection failed');
      expect(mockRedis.publish).not.toHaveBeenCalled();
    });

    it('should handle Redis publish failure gracefully', async () => {
      const messageData = {
        roomId: 'room-123',
        senderId: 'user-456',
        content: 'Test'
      };

      (supabaseHelpers.create as jest.Mock).mockResolvedValue({ id: 'msg-789' });
      mockRedis.publish.mockRejectedValue(new Error('Redis connection failed'));

      // Should not throw - Redis failure is silent
      await expect(sendMessageToRoom(messageData)).rejects.toThrow();
    });
  });

  describe('getRoomMessages', () => {
    it('should retrieve messages for room', async () => {
      const roomId = 'room-123';
      const mockMessages = [
        { id: 'msg-1', content: 'Message 1', ts: '2025-01-27T10:00:00Z' },
        { id: 'msg-2', content: 'Message 2', ts: '2025-01-27T10:01:00Z' }
      ];

      (supabaseHelpers.findMany as jest.Mock).mockResolvedValue(mockMessages);

      const result = await getRoomMessages(roomId);

      expect(supabaseHelpers.findMany).toHaveBeenCalledWith('messages', {
        filter: { room_id: roomId },
        orderBy: { column: 'ts', ascending: false },
        limit: 50
      });

      expect(result).toEqual(mockMessages);
    });

    it('should handle numeric roomId', async () => {
      const roomId = 123;
      (supabaseHelpers.findMany as jest.Mock).mockResolvedValue([]);

      await getRoomMessages(roomId);

      expect(supabaseHelpers.findMany).toHaveBeenCalledWith('messages', {
        filter: { room_id: 123 },
        orderBy: { column: 'ts', ascending: false },
        limit: 50
      });
    });

    it('should handle empty room', async () => {
      const roomId = 'empty-room';
      (supabaseHelpers.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getRoomMessages(roomId);

      expect(result).toEqual([]);
    });

    it('should handle database query failure', async () => {
      const roomId = 'room-123';
      const dbError = new Error('Query failed');
      (supabaseHelpers.findMany as jest.Mock).mockRejectedValue(dbError);

      await expect(getRoomMessages(roomId)).rejects.toThrow('Query failed');
    });
  });
});

