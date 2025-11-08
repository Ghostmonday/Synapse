/**
 * AI Safeguards Service
 * Critical safety mechanisms for AI automation:
 * 1. Rate limiting on LLM API calls
 * 2. Error backoff (5 min wait on 500 errors)
 * 3. Timeout wrapper (30s max per analysis)
 * 4. Comprehensive logging
 * 5. Auto-disable during maintenance window (3-5 AM UTC)
 * 6. Metric boundaries (latency, error rate, token spend)
 */

import { logInfo, logError, logWarning } from '../shared/logger.js';
import { getRedisClient } from '../config/db.js';
import { supabase } from '../config/db.js';

const redis = getRedisClient();

// ===============================================
// 1. RATE LIMITING ON LLM API CALLS
// ===============================================

interface RateLimitState {
  count: number;
  resetAt: number;
}

const LLM_RATE_LIMIT_KEY = 'ai:llm:rate_limit';
const LLM_RATE_LIMIT_MAX = 100; // Max calls per hour
const LLM_RATE_LIMIT_WINDOW = 3600000; // 1 hour in ms

/**
 * Check if LLM API call is allowed (rate limited)
 */
export async function checkLLMRateLimit(): Promise<boolean> {
  try {
    const now = Date.now();
    const stateStr = await redis.get(LLM_RATE_LIMIT_KEY);
    
    if (!stateStr) {
      // First call - initialize
      await redis.setex(LLM_RATE_LIMIT_KEY, Math.ceil(LLM_RATE_LIMIT_WINDOW / 1000), JSON.stringify({
        count: 1,
        resetAt: now + LLM_RATE_LIMIT_WINDOW
      }));
      return true;
    }

    const state: RateLimitState = JSON.parse(stateStr);
    
    // Reset if window expired
    if (now >= state.resetAt) {
      await redis.setex(LLM_RATE_LIMIT_KEY, Math.ceil(LLM_RATE_LIMIT_WINDOW / 1000), JSON.stringify({
        count: 1,
        resetAt: now + LLM_RATE_LIMIT_WINDOW
      }));
      return true;
    }

    // Check if limit exceeded
    if (state.count >= LLM_RATE_LIMIT_MAX) {
      logWarning(`LLM rate limit exceeded: ${state.count}/${LLM_RATE_LIMIT_MAX} calls`);
      await logToAudit('ai_rate_limit_exceeded', {
        count: state.count,
        limit: LLM_RATE_LIMIT_MAX,
        resetAt: new Date(state.resetAt).toISOString()
      });
      return false;
    }

    // Increment count
    state.count++;
    await redis.setex(LLM_RATE_LIMIT_KEY, Math.ceil((state.resetAt - now) / 1000), JSON.stringify(state));
    return true;
  } catch (error: any) {
    logError('Rate limit check error', error);
    // Fail open - allow call if Redis fails
    return true;
  }
}

// ===============================================
// 2. ERROR BACKOFF (5 min wait on 500 errors)
// ===============================================

const ERROR_BACKOFF_KEY = 'ai:error_backoff';
const ERROR_BACKOFF_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Check if we should back off due to recent errors
 */
export async function checkErrorBackoff(): Promise<boolean> {
  try {
    const backoffUntil = await redis.get(ERROR_BACKOFF_KEY);
    if (!backoffUntil) {
      return false; // No backoff active
    }

    const backoffTime = parseInt(backoffUntil);
    if (Date.now() < backoffTime) {
      const minutesLeft = Math.ceil((backoffTime - Date.now()) / 60000);
      logWarning(`AI automation in backoff mode - ${minutesLeft} minutes remaining`);
      return true; // Still in backoff
    }

    // Backoff expired
    await redis.del(ERROR_BACKOFF_KEY);
    return false;
  } catch (error: any) {
    logError('Error backoff check failed', error);
    return false; // Fail open
  }
}

/**
 * Trigger error backoff (5 minutes)
 */
export async function triggerErrorBackoff(error: any): Promise<void> {
  try {
    const backoffUntil = Date.now() + ERROR_BACKOFF_DURATION;
    await redis.setex(ERROR_BACKOFF_KEY, Math.ceil(ERROR_BACKOFF_DURATION / 1000), backoffUntil.toString());
    
    logError('AI automation error - entering 5 minute backoff', error);
    await logToAudit('ai_error_backoff_triggered', {
      error: error.message || String(error),
      backoffUntil: new Date(backoffUntil).toISOString(),
      durationMinutes: 5
    });
  } catch (err: any) {
    logError('Failed to trigger error backoff', err);
  }
}

// ===============================================
// 3. TIMEOUT WRAPPER (30s max per analysis)
// ===============================================

const ANALYSIS_TIMEOUT = 30000; // 30 seconds

/**
 * Wrap an async function with timeout
 * Kills analysis if it takes over 30 seconds
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = ANALYSIS_TIMEOUT,
  operationName: string = 'analysis'
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
}

// ===============================================
// 4. COMPREHENSIVE LOGGING
// ===============================================

/**
 * Log everything to audit_log table
 */
async function logToAudit(eventType: string, payload: any): Promise<void> {
  try {
    await supabase.from('audit_log').insert({
      event_type: eventType,
      payload,
      event_time: new Date().toISOString(),
      actor: 'ai_automation'
    });
  } catch (error: any) {
    logError('Failed to log to audit_log', error);
    // Don't throw - logging failures shouldn't break operations
  }
}

/**
 * Log AI operation start
 */
export async function logAIOperationStart(operation: string, context: any): Promise<void> {
  logInfo(`[AI] Starting: ${operation}`);
  await logToAudit('ai_operation_start', {
    operation,
    context,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log AI operation completion
 */
export async function logAIOperationComplete(operation: string, result: any, durationMs: number): Promise<void> {
  logInfo(`[AI] Completed: ${operation} (${durationMs}ms)`);
  await logToAudit('ai_operation_complete', {
    operation,
    result,
    durationMs,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log AI operation error
 */
export async function logAIOperationError(operation: string, error: any): Promise<void> {
  logError(`[AI] Error in ${operation}`, error);
  await logToAudit('ai_operation_error', {
    operation,
    error: error.message || String(error),
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
}

// ===============================================
// 5. AUTO-DISABLE DURING MAINTENANCE WINDOW (3-5 AM UTC)
// ===============================================

/**
 * Check if we're in maintenance window (3-5 AM UTC)
 */
export function isMaintenanceWindow(): boolean {
  const now = new Date();
  const utcHour = now.getUTCHours();
  return utcHour >= 3 && utcHour < 5;
}

/**
 * Check if AI automation should run (not in maintenance window)
 */
export function shouldRunAI(): boolean {
  if (isMaintenanceWindow()) {
    logInfo('[AI] Maintenance window active (3-5 AM UTC) - skipping automation');
    return false;
  }
  return true;
}

// ===============================================
// 6. METRIC BOUNDARIES (Guardrails)
// ===============================================

interface MetricBoundaries {
  latency: { min: number; max: number }; // ms
  errorRate: { min: number; max: number }; // percentage
  tokenSpend: { dailyLimit: number; warningThreshold: number }; // dollars
  apiCalls: { hourlyLimit: number; warningThreshold: number };
}

const DEFAULT_BOUNDARIES: MetricBoundaries = {
  latency: { min: 0, max: 200 }, // Kill if over 200ms
  errorRate: { min: 0, max: 10 }, // Kill if over 10%
  tokenSpend: { dailyLimit: 25, warningThreshold: 22.5 }, // $25/day limit, warn at $22.50
  apiCalls: { hourlyLimit: 100, warningThreshold: 90 }
};

let currentBoundaries = DEFAULT_BOUNDARIES;

/**
 * Set metric boundaries
 */
export function setMetricBoundaries(boundaries: Partial<MetricBoundaries>): void {
  currentBoundaries = { ...currentBoundaries, ...boundaries };
  logInfo('Metric boundaries updated', currentBoundaries);
}

/**
 * Check if metric is within boundaries
 */
export function checkMetricBoundary(metric: keyof MetricBoundaries, value: number): {
  valid: boolean;
  warning: boolean;
  message?: string;
} {
  const boundary = currentBoundaries[metric];

  switch (metric) {
    case 'latency':
      if (value > boundary.max) {
        return {
          valid: false,
          warning: false,
          message: `Latency ${value}ms exceeds maximum ${boundary.max}ms`
        };
      }
      if (value < boundary.min) {
        return {
          valid: false,
          warning: false,
          message: `Latency ${value}ms below minimum ${boundary.min}ms`
        };
      }
      return { valid: true, warning: false };

    case 'errorRate':
      if (value > boundary.max) {
        return {
          valid: false,
          warning: false,
          message: `Error rate ${value}% exceeds maximum ${boundary.max}%`
        };
      }
      return { valid: true, warning: value > boundary.max * 0.8 };

    case 'tokenSpend':
      if (value >= boundary.dailyLimit) {
        return {
          valid: false,
          warning: false,
          message: `Token spend $${value} exceeds daily limit $${boundary.dailyLimit}`
        };
      }
      return {
        valid: true,
        warning: value >= boundary.warningThreshold,
        message: value >= boundary.warningThreshold ? `Token spend $${value} approaching limit` : undefined
      };

    case 'apiCalls':
      if (value >= boundary.hourlyLimit) {
        return {
          valid: false,
          warning: false,
          message: `API calls ${value} exceeds hourly limit ${boundary.hourlyLimit}`
        };
      }
      return {
        valid: true,
        warning: value >= boundary.warningThreshold,
        message: value >= boundary.warningThreshold ? `API calls ${value} approaching limit` : undefined
      };

    default:
      return { valid: true, warning: false };
  }
}

/**
 * Track token spend
 */
const TOKEN_SPEND_KEY = 'ai:token_spend:daily';
const TOKEN_COST_PER_1K = 0.0001; // Approximate cost per 1K tokens (adjust based on provider)

export async function trackTokenSpend(tokens: number): Promise<{
  total: number;
  withinLimit: boolean;
  shouldDisable: boolean;
}> {
  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const key = `${TOKEN_SPEND_KEY}:${today}`;
    
    const cost = (tokens / 1000) * TOKEN_COST_PER_1K;
    const currentSpend = parseFloat((await redis.get(key)) || '0');
    const newSpend = currentSpend + cost;
    
    await redis.setex(key, 86400, newSpend.toString()); // Expire after 24 hours

    const check = checkMetricBoundary('tokenSpend', newSpend);
    
    if (!check.valid) {
      // Disable all AI automation
      await redis.set('ai:automation:disabled', 'true');
      await logToAudit('ai_automation_disabled', {
        reason: 'token_spend_limit',
        spend: newSpend,
        limit: currentBoundaries.tokenSpend.dailyLimit
      });
      logError(`AI automation DISABLED - Token spend $${newSpend} exceeds limit`);
    } else if (check.warning) {
      await logToAudit('ai_token_spend_warning', {
        spend: newSpend,
        threshold: currentBoundaries.tokenSpend.warningThreshold
      });
      logWarning(`AI token spend warning: $${newSpend} (limit: $${currentBoundaries.tokenSpend.dailyLimit})`);
    }

    return {
      total: newSpend,
      withinLimit: check.valid,
      shouldDisable: !check.valid
    };
  } catch (error: any) {
    logError('Token spend tracking error', error);
    return { total: 0, withinLimit: true, shouldDisable: false };
  }
}

/**
 * Check if automation is disabled
 */
export async function isAutomationDisabled(): Promise<boolean> {
  try {
    const disabled = await redis.get('ai:automation:disabled');
    return disabled === 'true';
  } catch (error: any) {
    logError('Check automation disabled error', error);
    return false; // Fail open
  }
}

/**
 * Re-enable automation
 */
export async function enableAutomation(): Promise<void> {
  await redis.del('ai:automation:disabled');
  await logToAudit('ai_automation_enabled', { timestamp: new Date().toISOString() });
  logInfo('AI automation re-enabled');
}

// ===============================================
// 7. HEARTBEAT MONITORING
// ===============================================

const HEARTBEAT_KEY = 'ai:heartbeat';
const HEARTBEAT_TIMEOUT = 30000; // 30 seconds

/**
 * Update heartbeat
 */
export async function updateHeartbeat(operation: string): Promise<void> {
  try {
    await redis.setex(HEARTBEAT_KEY, Math.ceil(HEARTBEAT_TIMEOUT / 1000), JSON.stringify({
      operation,
      timestamp: Date.now()
    }));
  } catch (error: any) {
    logError('Heartbeat update error', error);
  }
}

/**
 * Check if heartbeat is stale (assume dead if no heartbeat in 30s)
 */
export async function checkHeartbeat(): Promise<boolean> {
  try {
    const heartbeatStr = await redis.get(HEARTBEAT_KEY);
    if (!heartbeatStr) {
      return true; // No heartbeat yet - assume OK
    }

    const heartbeat = JSON.parse(heartbeatStr);
    const age = Date.now() - heartbeat.timestamp;

    if (age > HEARTBEAT_TIMEOUT) {
      logError(`AI automation heartbeat stale - last seen ${age}ms ago (operation: ${heartbeat.operation})`);
      await logToAudit('ai_heartbeat_stale', {
        lastOperation: heartbeat.operation,
        ageMs: age,
        threshold: HEARTBEAT_TIMEOUT
      });
      return false; // Heartbeat is stale
    }

    return true; // Heartbeat is fresh
  } catch (error: any) {
    logError('Heartbeat check error', error);
    return true; // Fail open
  }
}

// ===============================================
// 8. SAFE WRAPPER FOR ALL AI OPERATIONS
// ===============================================

/**
 * Safe wrapper that applies all safeguards
 */
export async function safeAIOperation<T>(
  operationName: string,
  operation: () => Promise<T>,
  context?: any
): Promise<T | null> {
  const startTime = Date.now();

  try {
    // 1. Check maintenance window
    if (!shouldRunAI()) {
      await logToAudit('ai_operation_skipped', {
        operation: operationName,
        reason: 'maintenance_window'
      });
      return null;
    }

    // 2. Check if automation is disabled
    if (await isAutomationDisabled()) {
      await logToAudit('ai_operation_skipped', {
        operation: operationName,
        reason: 'automation_disabled'
      });
      return null;
    }

    // 3. Check error backoff
    if (await checkErrorBackoff()) {
      await logToAudit('ai_operation_skipped', {
        operation: operationName,
        reason: 'error_backoff'
      });
      return null;
    }

    // 4. Check rate limit
    if (!(await checkLLMRateLimit())) {
      await logToAudit('ai_operation_skipped', {
        operation: operationName,
        reason: 'rate_limit'
      });
      return null;
    }

    // 5. Log operation start
    await logAIOperationStart(operationName, context);

    // 6. Update heartbeat
    await updateHeartbeat(operationName);

    // 7. Run with timeout
    const result = await withTimeout(operation, ANALYSIS_TIMEOUT, operationName);

    // 8. Calculate duration
    const durationMs = Date.now() - startTime;

    // 9. Check latency boundary
    const latencyCheck = checkMetricBoundary('latency', durationMs);
    if (!latencyCheck.valid) {
      logError(`Operation ${operationName} exceeded latency boundary: ${latencyCheck.message}`);
      await triggerErrorBackoff(new Error(latencyCheck.message));
      return null;
    }

    // 10. Log completion
    await logAIOperationComplete(operationName, result, durationMs);

    return result;
  } catch (error: any) {
    const durationMs = Date.now() - startTime;

    // Check if it's a timeout
    if (error.message?.includes('timed out')) {
      logError(`Operation ${operationName} timed out after ${durationMs}ms`);
      await logAIOperationError(operationName, error);
      await triggerErrorBackoff(error);
      return null;
    }

    // Check if it's a 500 error (server error) or rate limit error
    const isServerError = error.status === 500 || 
                         error.statusCode === 500 ||
                         error.message?.includes('500') ||
                         error.message?.includes('Internal Server Error') ||
                         (error.response && error.response.status === 500);
    
    const isRateLimitError = error.status === 429 ||
                            error.statusCode === 429 ||
                            error.message?.includes('rate limit') ||
                            error.message?.includes('429') ||
                            (error.response && error.response.status === 429);
    
    if (isServerError || isRateLimitError) {
      logError(`Operation ${operationName} failed with ${isServerError ? '500' : '429'} error - triggering 5 minute backoff`);
      await logAIOperationError(operationName, error);
      await triggerErrorBackoff(error);
      return null;
    }

    // Other errors - log but don't trigger backoff
    await logAIOperationError(operationName, error);
    return null;
  }
}

// Export boundaries for configuration
export { currentBoundaries, DEFAULT_BOUNDARIES };
export type { MetricBoundaries };

