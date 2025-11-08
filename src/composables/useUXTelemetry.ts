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

