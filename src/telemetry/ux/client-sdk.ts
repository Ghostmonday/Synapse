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
          key.toLowerCase().includes('body') ||
          key.toLowerCase().includes('query') ||
          key.toLowerCase().includes('text')) {
        scrubbed[key] = '[REDACTED]';
      } else if (key === 'contextQuery') {
        // For contextQuery, redact fully as it may contain user input
        scrubbed[key] = '[REDACTED_QUERY]';
      } else if (key === 'sentimentScore') {
        // Sentiment score is numeric and safe to keep
        scrubbed[key] = val;
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
  
  // Sequence tracking
  private eventSequencePath: Array<{ eventType: string; timestamp: number }> = [];
  
  // Burst detection
  private recentActions: number[] = [];
  private readonly BURST_THRESHOLD = 5;
  private readonly BURST_WINDOW_MS = 10000; // 10 seconds
  
  // Idle detection
  private lastActivityTime: number = Date.now();
  private idleThresholdMs: number = 30000; // 30 seconds
  private wasIdle: boolean = false;
  
  // State loop detection
  private stateHistory: Array<{ state: string; timestamp: number }> = [];
  private readonly STATE_HISTORY_LIMIT = 20;
  
  // Performance timing
  private performanceMarks: Map<string, number> = new Map();
  
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
    
    // Track activity for idle detection
    this.trackActivity();
    
    // Detect bursts for user actions
    if (category === UXEventCategory.CLICKSTREAM || category === UXEventCategory.UI_STATE) {
      this.detectBurst();
    }
    
    // Detect state loops
    if (options.stateBefore && options.stateAfter) {
      this.detectStateLoop(options.stateBefore, options.stateAfter);
    }
    
    // Track sequence
    this.trackSequence(eventType);
    
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
   * Track activity for idle detection
   */
  private trackActivity(): void {
    const now = Date.now();
    const timeSinceLastActivity = now - this.lastActivityTime;
    
    // Check if user was idle and is now active again
    if (this.wasIdle && timeSinceLastActivity < this.idleThresholdMs) {
      this.logEvent(
        EventType.SESSION_IDLE_THEN_RETRY,
        UXEventCategory.BEHAVIOR_MODELING,
        {
          idleDuration: timeSinceLastActivity,
        }
      );
      this.wasIdle = false;
    }
    
    // Update idle status
    if (timeSinceLastActivity > this.idleThresholdMs) {
      this.wasIdle = true;
    }
    
    this.lastActivityTime = now;
  }
  
  /**
   * Detect and log action bursts
   */
  private detectBurst(): void {
    const now = Date.now();
    
    // Add current action
    this.recentActions.push(now);
    
    // Remove actions outside the window
    this.recentActions = this.recentActions.filter(
      time => now - time < this.BURST_WINDOW_MS
    );
    
    // Detect burst
    if (this.recentActions.length >= this.BURST_THRESHOLD) {
      const burstDuration = now - this.recentActions[0];
      this.logEvent(
        EventType.USER_ACTION_BURST,
        UXEventCategory.BEHAVIOR_MODELING,
        {
          burstCount: this.recentActions.length,
          duration: burstDuration,
        }
      );
      // Reset to avoid duplicate burst events
      this.recentActions = [];
    }
  }
  
  /**
   * Detect state loops (repeated state transitions)
   */
  private detectStateLoop(stateBefore?: string, stateAfter?: string): void {
    if (!stateBefore || !stateAfter) return;
    
    const now = Date.now();
    const stateKey = `${stateBefore}->${stateAfter}`;
    
    // Add to state history
    this.stateHistory.push({ state: stateKey, timestamp: now });
    
    // Keep history limited
    if (this.stateHistory.length > this.STATE_HISTORY_LIMIT) {
      this.stateHistory.shift();
    }
    
    // Detect loops (same transition occurring 3+ times in short succession)
    const recentWindow = now - 30000; // 30 seconds
    const recentTransitions = this.stateHistory.filter(
      h => h.timestamp > recentWindow && h.state === stateKey
    );
    
    if (recentTransitions.length >= 3) {
      const states = this.stateHistory
        .filter(h => h.timestamp > recentWindow)
        .map(h => h.state);
      
      this.logEvent(
        EventType.REPEATED_STATE_LOOP_DETECTED,
        UXEventCategory.JOURNEY_ANALYTICS,
        {
          loopCount: recentTransitions.length,
          statesInLoop: [...new Set(states)],
          pattern: stateKey,
        }
      );
      
      // Clear history to avoid duplicate detections
      this.stateHistory = [];
    }
  }
  
  /**
   * Start performance measurement
   */
  public markPerformanceStart(markId: string): void {
    this.performanceMarks.set(markId, Date.now());
  }
  
  /**
   * End performance measurement and log
   */
  public markPerformanceEnd(
    markId: string,
    metadata: Record<string, unknown> = {}
  ): number | null {
    const startTime = this.performanceMarks.get(markId);
    if (!startTime) return null;
    
    const duration = Date.now() - startTime;
    this.performanceMarks.delete(markId);
    
    this.logEvent(
      EventType.INTERACTION_LATENCY_MS,
      UXEventCategory.PERFORMANCE,
      {
        markId,
        duration,
        ...metadata,
      }
    );
    
    return duration;
  }
  
  /**
   * Log AI suggestion accepted
   */
  public logAISuggestionAccepted(
    suggestionId: string,
    acceptanceMethod: 'click' | 'copy' | 'keyboard',
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.AI_SUGGESTION_ACCEPTED,
      UXEventCategory.AI_FEEDBACK,
      {
        suggestionId,
        acceptanceMethod,
        ...metadata,
      }
    );
  }
  
  /**
   * Log AI suggestion rejected
   */
  public logAISuggestionRejected(
    suggestionId: string,
    rejectionReason?: string,
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.AI_SUGGESTION_REJECTED,
      UXEventCategory.AI_FEEDBACK,
      {
        suggestionId,
        rejectionReason,
        ...metadata,
      }
    );
  }
  
  /**
   * Log AI auto-fix applied
   */
  public logAIAutoFixApplied(
    fixType: string,
    outcome: 'success' | 'fail',
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.AI_AUTO_FIX_APPLIED,
      UXEventCategory.AI_FEEDBACK,
      {
        fixType,
        outcome,
        ...metadata,
      }
    );
  }
  
  /**
   * Log AI edit undone
   */
  public logAIEditUndone(
    undoLatency: number,
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.AI_EDIT_UNDONE,
      UXEventCategory.AI_FEEDBACK,
      {
        undoLatency,
        ...metadata,
      }
    );
  }
  
  /**
   * Log AI help requested
   */
  public logAIHelpRequested(
    contextQuery: string,
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.AI_HELP_REQUESTED,
      UXEventCategory.AI_FEEDBACK,
      {
        contextQuery, // Will be scrubbed by PII detector
        ...metadata,
      }
    );
  }
  
  /**
   * Log agent handoff failed
   */
  public logAgentHandoffFailed(
    failureStage: 'init' | 'partial' | 'complete',
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.AGENT_HANDOFF_FAILED,
      UXEventCategory.AI_FEEDBACK,
      {
        failureStage,
        ...metadata,
      }
    );
  }
  
  /**
   * Log message sentiment
   */
  public logMessageSentiment(
    sentimentScore: number,
    beforeAfter: 'before' | 'after',
    metadata: Record<string, unknown> = {}
  ): void {
    const eventType = beforeAfter === 'before' 
      ? EventType.MESSAGE_SENTIMENT_BEFORE 
      : EventType.MESSAGE_SENTIMENT_AFTER;
    
    this.logEvent(
      eventType,
      UXEventCategory.COGNITIVE_STATE,
      {
        sentimentScore,
        ...metadata,
      }
    );
  }
  
  /**
   * Log session emotion curve
   */
  public logSessionEmotionCurve(
    emotionCurve: Array<{ timestamp: string; score: number }>,
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.SESSION_EMOTION_CURVE,
      UXEventCategory.COGNITIVE_STATE,
      {
        emotionCurve,
        ...metadata,
      }
    );
  }
  
  /**
   * Log message emotion contradiction
   */
  public logMessageEmotionContradiction(
    detectedTone: string,
    inferredIntent: string,
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.MESSAGE_EMOTION_CONTRADICTION,
      UXEventCategory.COGNITIVE_STATE,
      {
        detectedTone,
        inferredIntent,
        ...metadata,
      }
    );
  }
  
  /**
   * Log validation irritation score
   */
  public logValidationIrritationScore(
    errorCount: number,
    retryInterval: number,
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.VALIDATION_REACT_IRRITATION_SCORE,
      UXEventCategory.COGNITIVE_STATE,
      {
        errorCount,
        retryInterval,
        ...metadata,
      }
    );
  }
  
  /**
   * Log funnel checkpoint hit
   */
  public logFunnelCheckpoint(
    checkpointId: string,
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.FUNNEL_CHECKPOINT_HIT,
      UXEventCategory.JOURNEY_ANALYTICS,
      {
        checkpointId,
        ...metadata,
      }
    );
  }
  
  /**
   * Log dropoff point detected
   */
  public logDropoffPoint(
    lastEvent: string,
    sessionDuration: number,
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.DROPOFF_POINT_DETECTED,
      UXEventCategory.JOURNEY_ANALYTICS,
      {
        lastEvent,
        sessionDuration,
        ...metadata,
      }
    );
  }
  
  /**
   * Log perceived vs actual load time
   */
  public logLoadTimeComparison(
    perceivedMs: number,
    actualMs: number,
    componentId?: string,
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.LOAD_TIME_PERCEIVED_VS_ACTUAL,
      UXEventCategory.PERFORMANCE,
      {
        perceivedMs,
        actualMs,
        delta: Math.abs(perceivedMs - actualMs),
        ...metadata,
      },
      { componentId }
    );
  }
  
  /**
   * Log stuttered input
   */
  public logStutteredInput(
    retryCount: number,
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.STUTTERED_INPUT,
      UXEventCategory.PERFORMANCE,
      {
        retryCount,
        ...metadata,
      }
    );
  }
  
  /**
   * Log long state without progress
   */
  public logLongStateWithoutProgress(
    stateDuration: number,
    state: string,
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.LONG_STATE_WITHOUT_PROGRESS,
      UXEventCategory.PERFORMANCE,
      {
        stateDuration,
        state,
        ...metadata,
      }
    );
  }
  
  /**
   * Log first session stall point
   */
  public logFirstSessionStallPoint(
    stallEvent: string,
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.FIRST_SESSION_STALL_POINT,
      UXEventCategory.BEHAVIOR_MODELING,
      {
        stallEvent,
        isFirstSession: true,
        ...metadata,
      }
    );
  }
  
  /**
   * Log retry after error interval
   */
  public logRetryAfterError(
    intervalMs: number,
    errorType: string,
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.RETRY_AFTER_ERROR_INTERVAL,
      UXEventCategory.BEHAVIOR_MODELING,
      {
        intervalMs,
        errorType,
        ...metadata,
      }
    );
  }
  
  /**
   * Log feature toggle hover without use
   */
  public logFeatureToggleHoverNoUse(
    featureId: string,
    hoverDuration: number,
    metadata: Record<string, unknown> = {}
  ): void {
    this.logEvent(
      EventType.FEATURE_TOGGLE_HOVER_NO_USE,
      UXEventCategory.BEHAVIOR_MODELING,
      {
        featureId,
        hoverDuration,
        ...metadata,
      }
    );
  }
  
  /**
   * Add to sequence path
   */
  public trackSequence(eventType: UXEventType): void {
    this.eventSequencePath.push({
      eventType,
      timestamp: Date.now(),
    });
    
    // Keep sequence path limited to last 100 events
    if (this.eventSequencePath.length > 100) {
      this.eventSequencePath.shift();
    }
    
    // Periodically log sequence path
    if (this.eventSequencePath.length % 20 === 0) {
      this.logEvent(
        EventType.EVENT_SEQUENCE_PATH,
        UXEventCategory.JOURNEY_ANALYTICS,
        {
          sequencePath: this.eventSequencePath.slice(-20),
        }
      );
    }
  }
  
  /**
   * Get current sequence path
   */
  public getSequencePath(): Array<{ eventType: string; timestamp: number }> {
    return [...this.eventSequencePath];
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

