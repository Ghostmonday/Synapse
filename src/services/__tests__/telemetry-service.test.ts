/**
 * Unit Tests for Telemetry Service
 * Tests telemetry event logging, Prometheus metrics, and database persistence
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { logTelemetryEvent, logMessageEdited, logMessageDeleted, logUserJoinedRoom } from '../telemetry-service.js';
import { supabase } from '../../config/db.js';
import * as logger from '../../shared/logger.js';
import client from 'prom-client';

// Mock dependencies
jest.mock('../../config/db.js');
jest.mock('../../shared/logger.js');
jest.mock('prom-client');

describe('Telemetry Service', () => {
  let mockSupabase: any;
  let mockCounter: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Prometheus counter
    mockCounter = {
      inc: jest.fn()
    };

    (client.Counter as jest.Mock).mockImplementation(() => mockCounter);

    // Mock Supabase client
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockResolvedValue({ error: null })
    };

    (supabase as any) = mockSupabase;
  });

  describe('logTelemetryEvent', () => {
    it('should log event successfully', async () => {
      const eventType = 'test_event';
      const options = {
        userId: 'user-123',
        roomId: 'room-456',
        metadata: { key: 'value' }
      };

      await logTelemetryEvent(eventType, options);

      expect(mockCounter.inc).toHaveBeenCalledWith({ event: eventType });
      expect(mockSupabase.from).toHaveBeenCalledWith('telemetry');
      expect(mockSupabase.insert).toHaveBeenCalledWith({
        event: eventType,
        user_id: 'user-123',
        room_id: 'room-456',
        features: { key: 'value' },
        event_time: expect.any(String),
        risk: null,
        action: null,
        latency_ms: null
      });
    });

    it('should handle event without userId or roomId', async () => {
      const eventType = 'system_event';

      await logTelemetryEvent(eventType, { metadata: {} });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event: eventType,
          user_id: null,
          room_id: null
        })
      );
    });

    it('should include metadata fields in insert', async () => {
      const eventType = 'test_event';
      const metadata = {
        risk: 0.5,
        action: 'blocked',
        latency_ms: 100
      };

      await logTelemetryEvent(eventType, { metadata });

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          risk: 0.5,
          action: 'blocked',
          latency_ms: 100
        })
      );
    });

    it('should handle database insert failure gracefully', async () => {
      const eventType = 'test_event';
      mockSupabase.insert.mockResolvedValue({ error: new Error('DB error') });

      // Should not throw
      await expect(logTelemetryEvent(eventType)).resolves.not.toThrow();
      expect(mockCounter.inc).toHaveBeenCalled(); // Prometheus still increments
    });

    it('should handle database exception gracefully', async () => {
      const eventType = 'test_event';
      mockSupabase.insert.mockRejectedValue(new Error('Connection failed'));

      // Should not throw
      await expect(logTelemetryEvent(eventType)).resolves.not.toThrow();
    });
  });

  describe('logMessageEdited', () => {
    it('should log message edited event', async () => {
      const messageId = 'msg-123';
      const userId = 'user-456';
      const roomId = 'room-789';

      await logMessageEdited(messageId, userId, roomId);

      expect(mockCounter.inc).toHaveBeenCalledWith({ event: 'msg_edited' });
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'msg_edited',
          user_id: userId,
          room_id: roomId,
          features: expect.objectContaining({
            message_id: messageId
          })
        })
      );
    });

    it('should include additional metadata', async () => {
      const messageId = 'msg-123';
      const userId = 'user-456';
      const roomId = 'room-789';
      const metadata = { reason: 'typo' };

      await logMessageEdited(messageId, userId, roomId, metadata);

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          features: expect.objectContaining({
            message_id: messageId,
            reason: 'typo'
          })
        })
      );
    });
  });

  describe('logMessageDeleted', () => {
    it('should log message deleted event', async () => {
      const messageId = 'msg-123';
      const userId = 'user-456';
      const roomId = 'room-789';
      const reason = 'user_request';

      await logMessageDeleted(messageId, userId, roomId, reason);

      expect(mockCounter.inc).toHaveBeenCalledWith({ event: 'msg_deleted' });
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'msg_deleted',
          features: expect.objectContaining({
            message_id: messageId,
            reason
          })
        })
      );
    });
  });

  describe('logUserJoinedRoom', () => {
    it('should log user joined room event', async () => {
      const userId = 'user-123';
      const roomId = 'room-456';

      await logUserJoinedRoom(userId, roomId);

      expect(mockCounter.inc).toHaveBeenCalledWith({ event: 'user_joined_room' });
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          event: 'user_joined_room',
          user_id: userId,
          room_id: roomId
        })
      );
    });
  });
});

