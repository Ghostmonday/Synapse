/**
 * Unit Tests for WebSocket Messaging Handler
 * Tests message handling, Redis publishing, and acknowledgments
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { WebSocket } from 'ws';
import { handleMessaging } from '../messaging.js';
import { getRedisClient } from '../../../config/db.js';

// Mock dependencies
jest.mock('../../../config/db.js');

describe('WebSocket Messaging Handler', () => {
  let mockWebSocket: Partial<WebSocket>;
  let mockRedis: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock WebSocket
    mockWebSocket = {
      send: jest.fn()
    };

    // Mock Redis client
    mockRedis = {
      publish: jest.fn().mockResolvedValue(1)
    };

    (getRedisClient as jest.Mock).mockReturnValue(mockRedis);
  });

  describe('handleMessaging', () => {
    it('should publish message to Redis channel', () => {
      const envelope = {
        room_id: 'room-123',
        msg_id: 'msg-456',
        sender_id: 'user-789',
        content: 'Test message'
      };

      handleMessaging(mockWebSocket as WebSocket, envelope);

      expect(mockRedis.publish).toHaveBeenCalledWith(
        'room:room-123',
        JSON.stringify(envelope)
      );
    });

    it('should send acknowledgment to WebSocket', () => {
      const envelope = {
        room_id: 'room-123',
        msg_id: 'msg-456',
        sender_id: 'user-789',
        content: 'Test message'
      };

      handleMessaging(mockWebSocket as WebSocket, envelope);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'msg_ack',
          msg_id: 'msg-456'
        })
      );
    });

    it('should handle different room IDs', () => {
      const roomIds = ['room-1', 'room-2', 'room-abc'];

      roomIds.forEach(roomId => {
        jest.clearAllMocks();
        const envelope = {
          room_id: roomId,
          msg_id: 'msg-123',
          sender_id: 'user-456',
          content: 'Test'
        };

        handleMessaging(mockWebSocket as WebSocket, envelope);

        expect(mockRedis.publish).toHaveBeenCalledWith(
          `room:${roomId}`,
          expect.any(String)
        );
      });
    });

    it('should include all envelope data in Redis publish', () => {
      const envelope = {
        room_id: 'room-123',
        msg_id: 'msg-456',
        sender_id: 'user-789',
        content: 'Test message',
        metadata: { type: 'text' }
      };

      handleMessaging(mockWebSocket as WebSocket, envelope);

      const publishedData = JSON.parse(mockRedis.publish.mock.calls[0][1]);
      expect(publishedData).toEqual(envelope);
    });

    it('should handle Redis publish failure silently', () => {
      const envelope = {
        room_id: 'room-123',
        msg_id: 'msg-456',
        sender_id: 'user-789',
        content: 'Test'
      };

      mockRedis.publish.mockRejectedValue(new Error('Redis error'));

      // Should not throw - silent fail
      expect(() => {
        handleMessaging(mockWebSocket as WebSocket, envelope);
      }).not.toThrow();

      // Acknowledgment should still be sent
      expect(mockWebSocket.send).toHaveBeenCalled();
    });
  });
});

