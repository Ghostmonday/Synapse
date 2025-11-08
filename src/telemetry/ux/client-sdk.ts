/**
 * UX Telemetry Client SDK
 * 
 * Zero-dependency, standalone SDK for UX telemetry collection.
 * Works in both browser and Node.js environments.
 * 
 * Features:
 * - Session and trace ID management
 * - PII scrubbing (client-side)
 * - Batching and auto-flush
 * - Retry with exponential backoff
 * - Sampling rules (critical events 100%, configurable for others)
 * - Consent management
 * - Device context capture
 * 
 * @module ux-telemetry-sdk
 */

import type {
  UXTelemetryEvent,
  UXTelemetryBatch,
  UXEventType,
  UXEventCategory,
  DeviceContext,
  UXTelemetrySDKConfig,
  SamplingConfig,
  ConsentConfig,
} from '../../types/ux-telemetry.js';
import {
  DEFAULT_SDK_CONFIG,
  DEFAULT_SAMPLING_CONFIG,
  UXEventType as EventType,
} from '../../types/ux-telemetry.js';

/**
 * Generate a unique ID (UUID v4)
 */
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Get current timestamp in ISO format
 */
function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * PII patterns to detect and scrub
 */
const PII_PATTERNS = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
};

/**
 * Scrub PII from a value (recursive for objects)
 */
function scrubPII(value: unknown): unknown {
  if (typeof value === 'string') {
    let scrubbed = value;
    for (const pattern of Object.values(PII_PATTERNS)) {
      scrubbed = scrubbed.replace(pattern, '[REDACTED]');
    }
    return scrubbed;
  }
  
  if (Array.isArray(value)) {
    return value.map(scrubPII);
  }
  
  if (value && typeof value === 'object') {
    const scrubbed: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      // Don't include raw message content or similar sensitive fields
      if (key.toLowerCase().includes('message') || 
          key.toLowerCase().includes('content') ||
          key.toLowerCase().includes('body')) {
        scrubbed[key] = '[REDACTED]';
      } else {
        scrubbed[key] = scrubPII(val);
      }
    }
    return scrubbed;
  }
  
  return value;
}

/**
 * Capture device context
 */
function captureDeviceContext(): DeviceContext {
  if (typeof window === 'undefined') {
    // Node.js environment
    return {
      platform: process.platform,
      userAgent: `Node.js ${process.version}`,
    };
  }
  
  // Browser environment
  return {
    userAgent: navigator.userAgent,
    screenWidth: screen.width,
    screenHeight: screen.height,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
    platform: navigator.platform,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

/**
 * Storage abstraction for session/consent persistence
 */
class Storage {
  private prefix = 'ux_telemetry_';
  
  get(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(this.prefix + key);
    }
    return null;
  }
  
  set(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(this.prefix + key, value);
    }
  }
  
  remove(key: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.prefix + key);
    }
  }
}

/**
 * UX Telemetry SDK
 */
export class UXTelemetrySDK {
  private config: UXTelemetrySDKConfig;
  private storage: Storage;
  private sessionId: string;
  private eventQueue: UXTelemetryEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private retryQueue: { batch: UXTelemetryBatch; attempts: number }[] = [];
  
  constructor(config?: Partial<UXTelemetrySDKConfig>) {
    this.config = { ...DEFAULT_SDK_CONFIG, ...config } as UXTelemetrySDKConfig;
    this.storage = new Storage();
    this.sessionId = this.getOrCreateSessionId();
    
    // Start auto-flush timer
    this.startFlushTimer();
    
    // Flush on page unload (browser only)
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.flush());
    }
  }
  
  /**
   * Get or create session ID
   */
  private getOrCreateSessionId(): string {
    let sessionId = this.storage.get('session_id');
    if (!sessionId) {
      sessionId = generateId();
      this.storage.set('session_id', sessionId);
    }
    return sessionId;
  }
  
  /**
   * Start auto-flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flushTimer = setTimeout(() => {
      this.flush();
      this.startFlushTimer();
    }, this.config.flushInterval);
  }
  
  /**
   * Check if event should be sampled
   */
  private shouldSample(eventType: UXEventType): boolean {
    const sampling = this.config.sampling;
    
    // Critical events always captured
    if (sampling.criticalEvents.includes(eventType)) {
      return false; // false = not sampled, 100% captured
    }
    
    // High-frequency events sampled based on config
    if (sampling.highFrequencyEvents.includes(eventType)) {
      return Math.random() > sampling.highFrequencyEventRate;
    }
    
    // Standard events sampled based on config
    return Math.random() > sampling.standardEventRate;
  }
  
  /**
   * Log a UX telemetry event
   */
  public logEvent(
    eventType: UXEventType,
    category: UXEventCategory,
    metadata: Record<string, unknown> = {},
    options: {
      componentId?: string;
      stateBefore?: string;
      stateAfter?: string;
      userId?: string;
      roomId?: string;
    } = {}
  ): void {
    // Check consent
    if (!this.config.consent.enabled) {
      if (this.config.debug) {
        console.log('[UX Telemetry] Event dropped: consent not given');
      }
      return;
    }
    
    // Check sampling
    const samplingFlag = this.shouldSample(eventType);
    if (samplingFlag) {
      if (this.config.debug) {
        console.log('[UX Telemetry] Event sampled:', eventType);
      }
      return; // Skip this event
    }
    
    // Scrub PII from metadata
    const scrubbedMetadata = scrubPII(metadata) as Record<string, unknown>;
    
    // Create event
    const event: UXTelemetryEvent = {
      traceId: generateId(),
      sessionId: this.sessionId,
      eventType,
      category,
      timestamp: getTimestamp(),
      componentId: options.componentId,
      stateBefore: options.stateBefore,
      stateAfter: options.stateAfter,
      metadata: scrubbedMetadata,
      deviceContext: captureDeviceContext(),
      samplingFlag,
      userId: options.userId,
      roomId: options.roomId,
    };
    
    // Add to queue
    this.eventQueue.push(event);
    
    if (this.config.debug) {
      console.log('[UX Telemetry] Event queued:', event);
    }
    
    // Flush if batch size reached
    if (this.eventQueue.length >= this.config.batchSize) {
      this.flush();
    }
  }
  
  /**
   * Log a state transition
   */
  public logStateTransition(
    componentId: string,
    stateBefore: string,
    stateAfter: string,
    category: UXEventCategory,
    metadata: Record<string, unknown> = {},
    options: {
      userId?: string;
      roomId?: string;
    } = {}
  ): void {
    this.logEvent(
      EventType.UI_STATE_TRANSITION,
      category,
      metadata,
      {
        componentId,
        stateBefore,
        stateAfter,
        ...options,
      }
    );
  }
  
  /**
   * Log a click event
   */
  public logClick(
    componentId: string,
    metadata: Record<string, unknown> = {},
    options: {
      userId?: string;
      roomId?: string;
    } = {}
  ): void {
    this.logEvent(
      EventType.UI_CLICK,
      UXEventCategory.CLICKSTREAM,
      metadata,
      {
        componentId,
        ...options,
      }
    );
  }
  
  /**
   * Log a validation error
   */
  public logValidationError(
    componentId: string,
    errorType: string,
    metadata: Record<string, unknown> = {},
    options: {
      userId?: string;
      roomId?: string;
    } = {}
  ): void {
    this.logEvent(
      EventType.UI_VALIDATION_ERROR,
      UXEventCategory.VALIDATION,
      { errorType, ...metadata },
      {
        componentId,
        ...options,
      }
    );
  }
  
  /**
   * Flush event queue
   */
  public async flush(): Promise<void> {
    if (this.eventQueue.length === 0) {
      return;
    }
    
    const batch: UXTelemetryBatch = {
      events: [...this.eventQueue],
      batchId: generateId(),
      timestamp: getTimestamp(),
    };
    
    // Clear queue
    this.eventQueue = [];
    
    // Send batch
    await this.sendBatch(batch);
  }
  
  /**
   * Send batch to server with retry
   */
  private async sendBatch(batch: UXTelemetryBatch, attempt: number = 0): Promise<void> {
    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      if (this.config.debug) {
        console.log('[UX Telemetry] Batch sent successfully:', batch.batchId);
      }
    } catch (error) {
      console.error('[UX Telemetry] Failed to send batch:', error);
      
      // Retry with exponential backoff
      if (attempt < this.config.maxRetries) {
        const delay = this.config.retryDelay * Math.pow(2, attempt);
        if (this.config.debug) {
          console.log(`[UX Telemetry] Retrying in ${delay}ms (attempt ${attempt + 1}/${this.config.maxRetries})`);
        }
        setTimeout(() => {
          this.sendBatch(batch, attempt + 1);
        }, delay);
      } else {
        console.error('[UX Telemetry] Max retries reached, batch dropped:', batch.batchId);
      }
    }
  }
  
  /**
   * Set user consent
   */
  public setConsent(enabled: boolean): void {
    this.config.consent.enabled = enabled;
    this.config.consent.consentedAt = getTimestamp();
    
    // Persist consent
    this.storage.set('consent', JSON.stringify(this.config.consent));
    
    if (this.config.debug) {
      console.log('[UX Telemetry] Consent updated:', enabled);
    }
    
    // Flush if consent granted
    if (enabled) {
      this.flush();
    }
  }
  
  /**
   * Update sampling configuration
   */
  public setSamplingConfig(sampling: Partial<SamplingConfig>): void {
    this.config.sampling = { ...this.config.sampling, ...sampling };
    
    if (this.config.debug) {
      console.log('[UX Telemetry] Sampling config updated:', this.config.sampling);
    }
  }
  
  /**
   * Get current session ID
   */
  public getSessionId(): string {
    return this.sessionId;
  }
  
  /**
   * Reset session (creates new session ID)
   */
  public resetSession(): void {
    this.sessionId = generateId();
    this.storage.set('session_id', this.sessionId);
    
    if (this.config.debug) {
      console.log('[UX Telemetry] Session reset:', this.sessionId);
    }
  }
  
  /**
   * Destroy SDK instance (cleanup)
   */
  public destroy(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }
    this.flush();
  }
}

/**
 * Singleton instance for convenience
 */
let sdkInstance: UXTelemetrySDK | null = null;

/**
 * Initialize SDK with config
 */
export function initUXTelemetry(config?: Partial<UXTelemetrySDKConfig>): UXTelemetrySDK {
  if (!sdkInstance) {
    sdkInstance = new UXTelemetrySDK(config);
  }
  return sdkInstance;
}

/**
 * Get SDK instance
 */
export function getUXTelemetry(): UXTelemetrySDK {
  if (!sdkInstance) {
    throw new Error('UX Telemetry SDK not initialized. Call initUXTelemetry() first.');
  }
  return sdkInstance;
}

/**
 * Convenience functions for common events
 */
export const uxTelemetry = {
  /**
   * Log an event
   */
  logEvent: (
    eventType: UXEventType,
    category: UXEventCategory,
    metadata?: Record<string, unknown>,
    options?: Parameters<UXTelemetrySDK['logEvent']>[3]
  ) => {
    if (sdkInstance) {
      sdkInstance.logEvent(eventType, category, metadata, options);
    }
  },
  
  /**
   * Log a state transition
   */
  logStateTransition: (
    componentId: string,
    stateBefore: string,
    stateAfter: string,
    category: UXEventCategory,
    metadata?: Record<string, unknown>,
    options?: Parameters<UXTelemetrySDK['logStateTransition']>[5]
  ) => {
    if (sdkInstance) {
      sdkInstance.logStateTransition(componentId, stateBefore, stateAfter, category, metadata, options);
    }
  },
  
  /**
   * Log a click
   */
  logClick: (
    componentId: string,
    metadata?: Record<string, unknown>,
    options?: Parameters<UXTelemetrySDK['logClick']>[2]
  ) => {
    if (sdkInstance) {
      sdkInstance.logClick(componentId, metadata, options);
    }
  },
  
  /**
   * Log a validation error
   */
  logValidationError: (
    componentId: string,
    errorType: string,
    metadata?: Record<string, unknown>,
    options?: Parameters<UXTelemetrySDK['logValidationError']>[3]
  ) => {
    if (sdkInstance) {
      sdkInstance.logValidationError(componentId, errorType, metadata, options);
    }
  },
  
  /**
   * Flush events
   */
  flush: () => {
    if (sdkInstance) {
      sdkInstance.flush();
    }
  },
  
  /**
   * Set consent
   */
  setConsent: (enabled: boolean) => {
    if (sdkInstance) {
      sdkInstance.setConsent(enabled);
    }
  },
};

