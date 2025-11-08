/**
 * Unit Tests for UX Telemetry Client SDK
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { UXTelemetrySDK } from '../client-sdk.js';
import { UXEventType, UXEventCategory } from '../../../types/ux-telemetry.js';

// Mock fetch
global.fetch = vi.fn();

describe('UX Telemetry Client SDK', () => {
  let sdk: UXTelemetrySDK;
  
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    
    sdk = new UXTelemetrySDK({
      endpoint: '/api/ux-telemetry',
      batchSize: 2, // Small batch for testing
      flushInterval: 1000,
      debug: false,
    });
  });
  
  afterEach(() => {
    sdk?.destroy();
  });
  
  describe('Session Management', () => {
    it('generates a session ID on init', () => {
      const sessionId = sdk.getSessionId();
      expect(sessionId).toBeTruthy();
      expect(sessionId.length).toBeGreaterThan(0);
    });
    
    it('persists session ID', () => {
      const sessionId1 = sdk.getSessionId();
      
      // Create new SDK instance
      const sdk2 = new UXTelemetrySDK();
      const sessionId2 = sdk2.getSessionId();
      
      // Should be the same session (persisted)
      expect(sessionId1).toBe(sessionId2);
      
      sdk2.destroy();
    });
    
    it('resets session on demand', () => {
      const sessionId1 = sdk.getSessionId();
      sdk.resetSession();
      const sessionId2 = sdk.getSessionId();
      
      expect(sessionId1).not.toBe(sessionId2);
    });
  });
  
  describe('Event Logging', () => {
    it('logs events to queue', () => {
      sdk.logEvent(
        UXEventType.UI_CLICK,
        UXEventCategory.CLICKSTREAM,
        { buttonType: 'primary' },
        { componentId: 'PrimaryButton' }
      );
      
      // Event should be queued (not sent yet)
      expect(global.fetch).not.toHaveBeenCalled();
    });
    
    it('auto-flushes when batch size reached', () => {
      sdk.logEvent(
        UXEventType.UI_CLICK,
        UXEventCategory.CLICKSTREAM,
        { buttonType: 'primary' },
        { componentId: 'Button1' }
      );
      
      sdk.logEvent(
        UXEventType.UI_CLICK,
        UXEventCategory.CLICKSTREAM,
        { buttonType: 'secondary' },
        { componentId: 'Button2' }
      );
      
      // Should auto-flush after 2 events (batch size = 2)
      expect(global.fetch).toHaveBeenCalled();
    });
  });
  
  describe('PII Scrubbing', () => {
    it('scrubs email addresses from metadata', () => {
      sdk.logEvent(
        UXEventType.UI_VALIDATION_ERROR,
        UXEventCategory.VALIDATION,
        { email: 'user@example.com' },
        { componentId: 'EmailInput' }
      );
      
      sdk.flush();
      
      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      const event = body.events[0];
      
      expect(event.metadata.email).toBe('[REDACTED]');
    });
    
    it('scrubs sensitive field names', () => {
      sdk.logEvent(
        UXEventType.MESSAGE_SEND_ATTEMPTED,
        UXEventCategory.MESSAGING,
        { message: 'User message content' },
        { componentId: 'ChatInput' }
      );
      
      sdk.flush();
      
      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      const event = body.events[0];
      
      expect(event.metadata.message).toBe('[REDACTED]');
    });
  });
  
  describe('Sampling', () => {
    it('never samples critical events', () => {
      const criticalEvents = [
        UXEventType.UI_VALIDATION_ERROR,
        UXEventType.API_FAILURE,
        UXEventType.CLIENT_CRASH,
      ];
      
      for (const eventType of criticalEvents) {
        sdk.logEvent(eventType, UXEventCategory.SYSTEM, {});
      }
      
      sdk.flush();
      
      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      
      // All critical events should have samplingFlag = false
      body.events.forEach((event: any) => {
        expect(event.samplingFlag).toBe(false);
      });
    });
  });
  
  describe('Batching', () => {
    it('batches multiple events', () => {
      sdk.logEvent(UXEventType.UI_CLICK, UXEventCategory.CLICKSTREAM, {});
      sdk.logEvent(UXEventType.UI_CLICK, UXEventCategory.CLICKSTREAM, {});
      
      sdk.flush();
      
      const callArgs = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(callArgs[1].body);
      
      expect(body.events.length).toBe(2);
      expect(body.batchId).toBeTruthy();
    });
  });
  
  describe('Retry Logic', () => {
    it('retries on failure with exponential backoff', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));
      
      sdk.logEvent(UXEventType.UI_CLICK, UXEventCategory.CLICKSTREAM, {});
      sdk.logEvent(UXEventType.UI_CLICK, UXEventCategory.CLICKSTREAM, {});
      
      await sdk.flush();
      
      // Wait for retry
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Should have retried
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('Consent Management', () => {
    it('respects user consent', () => {
      sdk.setConsent(false);
      
      sdk.logEvent(UXEventType.UI_CLICK, UXEventCategory.CLICKSTREAM, {});
      
      sdk.flush();
      
      // Should not send events if consent is false
      expect(global.fetch).not.toHaveBeenCalled();
    });
    
    it('sends events when consent is granted', () => {
      sdk.setConsent(true);
      
      sdk.logEvent(UXEventType.UI_CLICK, UXEventCategory.CLICKSTREAM, {});
      
      sdk.flush();
      
      expect(global.fetch).toHaveBeenCalled();
    });
  });
});

