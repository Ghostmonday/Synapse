/**
 * Vue Composable for UX Telemetry
 * 
 * Wraps the UX telemetry client SDK for easy use in Vue components.
 * Auto-captures component context, route information, and user session.
 * 
 * @module useUXTelemetry
 */

import { getCurrentInstance, onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import { UXTelemetrySDK, initUXTelemetry, getUXTelemetry } from '../telemetry/ux/client-sdk.js';
import type { UXEventType, UXEventCategory } from '../types/ux-telemetry.js';

/**
 * Initialize UX Telemetry SDK (call once in App.vue or main entry)
 */
export function initializeUXTelemetry(options?: {
  endpoint?: string;
  debug?: boolean;
  consent?: boolean;
}): UXTelemetrySDK {
  return initUXTelemetry({
    endpoint: options?.endpoint || '/api/ux-telemetry',
    debug: options?.debug || false,
    consent: {
      enabled: options?.consent !== false, // Default to enabled
    },
  });
}

/**
 * Use UX Telemetry in Vue components
 */
export function useUXTelemetry() {
  const instance = getCurrentInstance();
  const route = useRoute ? useRoute() : null;
  
  // Get component name
  const componentId = instance?.type?.__name || instance?.type?.name || 'UnknownComponent';
  
  // Get current route path
  const getCurrentRoute = () => route?.path || window.location.pathname;
  
  /**
   * Get SDK instance
   */
  const sdk = (() => {
    try {
      return getUXTelemetry();
    } catch {
      // Auto-initialize if not initialized
      return initializeUXTelemetry();
    }
  })();
  
  /**
   * Log a UX telemetry event
   */
  function logEvent(
    eventType: UXEventType,
    category: UXEventCategory,
    metadata: Record<string, unknown> = {},
    options: {
      componentIdOverride?: string;
      stateBefore?: string;
      stateAfter?: string;
      userId?: string;
      roomId?: string;
    } = {}
  ): void {
    sdk.logEvent(
      eventType,
      category,
      {
        route: getCurrentRoute(),
        ...metadata,
      },
      {
        componentId: options.componentIdOverride || componentId,
        stateBefore: options.stateBefore,
        stateAfter: options.stateAfter,
        userId: options.userId,
        roomId: options.roomId,
      }
    );
  }
  
  /**
   * Log a state transition
   */
  function logStateTransition(
    stateBefore: string,
    stateAfter: string,
    category: UXEventCategory,
    metadata: Record<string, unknown> = {},
    options: {
      componentIdOverride?: string;
      userId?: string;
      roomId?: string;
    } = {}
  ): void {
    sdk.logStateTransition(
      options.componentIdOverride || componentId,
      stateBefore,
      stateAfter,
      category,
      {
        route: getCurrentRoute(),
        ...metadata,
      },
      {
        userId: options.userId,
        roomId: options.roomId,
      }
    );
  }
  
  /**
   * Log a click event
   */
  function logClick(
    metadata: Record<string, unknown> = {},
    options: {
      componentIdOverride?: string;
      userId?: string;
      roomId?: string;
    } = {}
  ): void {
    sdk.logClick(
      options.componentIdOverride || componentId,
      {
        route: getCurrentRoute(),
        ...metadata,
      },
      {
        userId: options.userId,
        roomId: options.roomId,
      }
    );
  }
  
  /**
   * Log a validation error
   */
  function logValidationError(
    errorType: string,
    metadata: Record<string, unknown> = {},
    options: {
      componentIdOverride?: string;
      userId?: string;
      roomId?: string;
    } = {}
  ): void {
    sdk.logValidationError(
      options.componentIdOverride || componentId,
      errorType,
      {
        route: getCurrentRoute(),
        ...metadata,
      },
      {
        userId: options.userId,
        roomId: options.roomId,
      }
    );
  }
  
  /**
   * Flush events immediately
   */
  function flush(): void {
    sdk.flush();
  }
  
  /**
   * Set user consent
   */
  function setConsent(enabled: boolean): void {
    sdk.setConsent(enabled);
  }
  
  /**
   * Get session ID
   */
  function getSessionId(): string {
    return sdk.getSessionId();
  }
  
  /**
   * Reset session (start new session)
   */
  function resetSession(): void {
    sdk.resetSession();
  }
  
  /**
   * Log AI suggestion accepted
   */
  function logAISuggestionAccepted(
    suggestionId: string,
    acceptanceMethod: 'click' | 'copy' | 'keyboard',
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logAISuggestionAccepted(suggestionId, acceptanceMethod, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log AI suggestion rejected
   */
  function logAISuggestionRejected(
    suggestionId: string,
    rejectionReason?: string,
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logAISuggestionRejected(suggestionId, rejectionReason, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log AI auto-fix applied
   */
  function logAIAutoFixApplied(
    fixType: string,
    outcome: 'success' | 'fail',
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logAIAutoFixApplied(fixType, outcome, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log AI edit undone
   */
  function logAIEditUndone(
    undoLatency: number,
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logAIEditUndone(undoLatency, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log AI help requested
   */
  function logAIHelpRequested(
    contextQuery: string,
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logAIHelpRequested(contextQuery, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log agent handoff failed
   */
  function logAgentHandoffFailed(
    failureStage: 'init' | 'partial' | 'complete',
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logAgentHandoffFailed(failureStage, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log message sentiment
   */
  function logSentiment(
    sentimentScore: number,
    beforeAfter: 'before' | 'after',
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logMessageSentiment(sentimentScore, beforeAfter, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log session emotion curve
   */
  function logEmotionCurve(
    emotionCurve: Array<{ timestamp: string; score: number }>,
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logSessionEmotionCurve(emotionCurve, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log message emotion contradiction
   */
  function logEmotionContradiction(
    detectedTone: string,
    inferredIntent: string,
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logMessageEmotionContradiction(detectedTone, inferredIntent, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log validation irritation score
   */
  function logValidationIrritationScore(
    errorCount: number,
    retryInterval: number,
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logValidationIrritationScore(errorCount, retryInterval, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log funnel checkpoint hit
   */
  function logFunnelCheckpoint(
    checkpointId: string,
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logFunnelCheckpoint(checkpointId, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log dropoff point detected
   */
  function logDropoffPoint(
    lastEvent: string,
    sessionDuration: number,
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logDropoffPoint(lastEvent, sessionDuration, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log perceived vs actual load time
   */
  function logPerformance(
    perceivedMs: number,
    actualMs: number,
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logLoadTimeComparison(perceivedMs, actualMs, componentId, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log stuttered input
   */
  function logStutteredInput(
    retryCount: number,
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logStutteredInput(retryCount, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log long state without progress
   */
  function logLongStateWithoutProgress(
    stateDuration: number,
    state: string,
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logLongStateWithoutProgress(stateDuration, state, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log first session stall point
   */
  function logFirstSessionStallPoint(
    stallEvent: string,
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logFirstSessionStallPoint(stallEvent, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log retry after error interval
   */
  function logRetryAfterError(
    intervalMs: number,
    errorType: string,
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logRetryAfterError(intervalMs, errorType, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Log feature toggle hover without use
   */
  function logFeatureToggleHoverNoUse(
    featureId: string,
    hoverDuration: number,
    metadata: Record<string, unknown> = {}
  ): void {
    sdk.logFeatureToggleHoverNoUse(featureId, hoverDuration, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  /**
   * Track sequence
   */
  function trackSequence(eventType: UXEventType): void {
    sdk.trackSequence(eventType);
  }
  
  /**
   * Get sequence path
   */
  function getSequencePath(): Array<{ eventType: string; timestamp: number }> {
    return sdk.getSequencePath();
  }
  
  /**
   * Start performance measurement
   */
  function markPerformanceStart(markId: string): void {
    sdk.markPerformanceStart(markId);
  }
  
  /**
   * End performance measurement
   */
  function markPerformanceEnd(
    markId: string,
    metadata: Record<string, unknown> = {}
  ): number | null {
    return sdk.markPerformanceEnd(markId, {
      route: getCurrentRoute(),
      ...metadata,
    });
  }
  
  // Auto-flush on component unmount
  onUnmounted(() => {
    flush();
  });
  
  return {
    logEvent,
    logStateTransition,
    logClick,
    logValidationError,
    flush,
    setConsent,
    getSessionId,
    resetSession,
    componentId,
    // AI Feedback
    logAISuggestionAccepted,
    logAISuggestionRejected,
    logAIAutoFixApplied,
    logAIEditUndone,
    logAIHelpRequested,
    logAgentHandoffFailed,
    // Emotional & Cognitive State
    logSentiment,
    logEmotionCurve,
    logEmotionContradiction,
    logValidationIrritationScore,
    // Journey Analytics
    logFunnelCheckpoint,
    logDropoffPoint,
    trackSequence,
    getSequencePath,
    // Performance
    logPerformance,
    logStutteredInput,
    logLongStateWithoutProgress,
    markPerformanceStart,
    markPerformanceEnd,
    // Behavior Modeling
    logFirstSessionStallPoint,
    logRetryAfterError,
    logFeatureToggleHoverNoUse,
  };
}

/**
 * Track component lifecycle with telemetry
 */
export function useComponentLifecycleTelemetry(
  category: UXEventCategory = 'ui_state' as UXEventCategory
) {
  const { logEvent, componentId } = useUXTelemetry();
  
  onMounted(() => {
    logEvent(
      'ui_state_transition' as UXEventType,
      category,
      { lifecycle: 'mounted' },
      {
        stateBefore: 'unmounted',
        stateAfter: 'mounted',
      }
    );
  });
  
  onUnmounted(() => {
    logEvent(
      'ui_state_transition' as UXEventType,
      category,
      { lifecycle: 'unmounted' },
      {
        stateBefore: 'mounted',
        stateAfter: 'unmounted',
      }
    );
  });
  
  return {
    componentId,
  };
}

