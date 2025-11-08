/**
 * Privacy Audit Tests for UX Telemetry
 * 
 * Ensures no PII is stored in the UX telemetry system.
 */

import { describe, it, expect } from 'vitest';
import { validateNoPII, redactUXTelemetryEvent } from '../../../services/ux-telemetry-redaction.js';
import { UXEventType, UXEventCategory } from '../../../types/ux-telemetry.js';
import type { UXTelemetryEvent } from '../../../types/ux-telemetry.js';

describe('UX Telemetry Privacy Audit', () => {
  describe('PII Detection', () => {
    it('detects email addresses in metadata', () => {
      const event: UXTelemetryEvent = {
        traceId: '123',
        sessionId: '456',
        eventType: UXEventType.UI_CLICK,
        category: UXEventCategory.CLICKSTREAM,
        timestamp: new Date().toISOString(),
        metadata: {
          userEmail: 'test@example.com',
        },
        samplingFlag: false,
      };
      
      const { valid, violations } = validateNoPII(event);
      expect(valid).toBe(false);
      expect(violations).toContain('email found in metadata');
    });
    
    it('detects phone numbers in metadata', () => {
      const event: UXTelemetryEvent = {
        traceId: '123',
        sessionId: '456',
        eventType: UXEventType.UI_CLICK,
        category: UXEventCategory.CLICKSTREAM,
        timestamp: new Date().toISOString(),
        metadata: {
          contact: '555-123-4567',
        },
        samplingFlag: false,
      };
      
      const { valid, violations } = validateNoPII(event);
      expect(valid).toBe(false);
      expect(violations).toContain('phone found in metadata');
    });
    
    it('detects credit card numbers', () => {
      const event: UXTelemetryEvent = {
        traceId: '123',
        sessionId: '456',
        eventType: UXEventType.UI_CLICK,
        category: UXEventCategory.CLICKSTREAM,
        timestamp: new Date().toISOString(),
        metadata: {
          card: '4532-1234-5678-9010',
        },
        samplingFlag: false,
      };
      
      const { valid, violations } = validateNoPII(event);
      expect(valid).toBe(false);
      expect(violations).toContain('credit_card found in metadata');
    });
  });
  
  describe('PII Redaction', () => {
    it('redacts email addresses', () => {
      const event: UXTelemetryEvent = {
        traceId: '123',
        sessionId: '456',
        eventType: UXEventType.UI_CLICK,
        category: UXEventCategory.CLICKSTREAM,
        timestamp: new Date().toISOString(),
        metadata: {
          userEmail: 'test@example.com',
        },
        samplingFlag: false,
      };
      
      const { event: redacted, stats } = redactUXTelemetryEvent(event);
      
      expect(redacted.metadata.userEmail).toBe('[REDACTED]');
      expect(stats.wasModified).toBe(true);
      expect(stats.piiTypesDetected).toContain('email');
    });
    
    it('redacts sensitive field names', () => {
      const event: UXTelemetryEvent = {
        traceId: '123',
        sessionId: '456',
        eventType: UXEventType.MESSAGE_SEND_ATTEMPTED,
        category: UXEventCategory.MESSAGING,
        timestamp: new Date().toISOString(),
        metadata: {
          message: 'User typed message content here',
        },
        samplingFlag: false,
      };
      
      const { event: redacted, stats } = redactUXTelemetryEvent(event);
      
      expect(redacted.metadata.message).toBe('[REDACTED]');
      expect(stats.wasModified).toBe(true);
    });
    
    it('does not modify clean events', () => {
      const event: UXTelemetryEvent = {
        traceId: '123',
        sessionId: '456',
        eventType: UXEventType.UI_CLICK,
        category: UXEventCategory.CLICKSTREAM,
        timestamp: new Date().toISOString(),
        metadata: {
          buttonType: 'primary',
          action: 'click',
        },
        samplingFlag: false,
      };
      
      const { event: redacted, stats } = redactUXTelemetryEvent(event);
      
      expect(redacted.metadata).toEqual(event.metadata);
      expect(stats.wasModified).toBe(false);
    });
  });
  
  describe('No Raw User Content', () => {
    it('ensures message content is never stored', () => {
      const event: UXTelemetryEvent = {
        traceId: '123',
        sessionId: '456',
        eventType: UXEventType.MESSAGE_SEND_ATTEMPTED,
        category: UXEventCategory.MESSAGING,
        timestamp: new Date().toISOString(),
        metadata: {
          content: 'User message here',
          body: 'User message body',
          text: 'User text here',
        },
        samplingFlag: false,
      };
      
      const { event: redacted } = redactUXTelemetryEvent(event);
      
      expect(redacted.metadata.content).toBe('[REDACTED]');
      expect(redacted.metadata.body).toBe('[REDACTED]');
      expect(redacted.metadata.text).toBe('[REDACTED]');
    });
  });
  
  describe('Nested PII Scrubbing', () => {
    it('redacts PII in nested objects', () => {
      const event: UXTelemetryEvent = {
        traceId: '123',
        sessionId: '456',
        eventType: UXEventType.UI_VALIDATION_ERROR,
        category: UXEventCategory.VALIDATION,
        timestamp: new Date().toISOString(),
        metadata: {
          formData: {
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
        samplingFlag: false,
      };
      
      const { event: redacted, stats } = redactUXTelemetryEvent(event);
      
      expect((redacted.metadata.formData as any).email).toBe('[REDACTED]');
      expect(stats.wasModified).toBe(true);
    });
    
    it('redacts PII in arrays', () => {
      const event: UXTelemetryEvent = {
        traceId: '123',
        sessionId: '456',
        eventType: UXEventType.UI_VALIDATION_ERROR,
        category: UXEventCategory.VALIDATION,
        timestamp: new Date().toISOString(),
        metadata: {
          contacts: ['alice@example.com', 'bob@example.com'],
        },
        samplingFlag: false,
      };
      
      const { event: redacted, stats } = redactUXTelemetryEvent(event);
      
      expect((redacted.metadata.contacts as any)[0]).toBe('[REDACTED]');
      expect((redacted.metadata.contacts as any)[1]).toBe('[REDACTED]');
      expect(stats.wasModified).toBe(true);
    });
  });
});

