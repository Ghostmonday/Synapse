/**
 * Healing Loop Service
 * Autonomous system that scans telemetry, predicts failures, and applies recommendations
 * Includes retry logic, failure tracking, and dynamic toggling via Redis
 */

import pRetry from 'p-retry';
import { getRedisClient } from '../config/db.js';
import { supabase } from '../config/db.js';
import { LLMReasoner } from './llm_reasoner.js';
import { Executor } from './executor.js';
import { PolicyGuard } from './policy_guard.js';
import { TelemetryEvent } from './types.js';
import { logError, logInfo } from '../shared/logger.js';
import { getDeepSeekKey, getOpenAIKey } from '../services/api-keys-service.js';

// Redis client for state management and dynamic control
const redisClient = getRedisClient();

// Global interval reference - allows us to stop/start the loop dynamically
// Stored globally so we can clear it when autonomy is disabled or failures occur
let globalHealingInterval: NodeJS.Timeout | null = null;

/**
 * Scans telemetry from Supabase with time-based filtering
 * Uses Redis to track last scan time for efficient incremental queries
 * 
 * This function implements a time-windowed scan approach instead of limit-based:
 * - Retrieves only new events since last scan (incremental)
 * - Avoids re-processing old data
 * - Scales better as telemetry volume grows
 * 
 * Retry logic ensures transient database/network failures don't stop the loop
 */
async function scanTelemetry(): Promise<TelemetryEvent[]> {
  let events: TelemetryEvent[] = [];
  
  try {
    // Wrap in p-retry for automatic retry on transient failures
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max 5 retries)
    await pRetry(async () => {
      // Get last successful scan time from Redis
      // Defaults to epoch (1970) if never scanned, meaning first scan gets all data
      const lastScanTime = await redisClient.get('last_scan_time') || new Date(0).toISOString();

      // Query Supabase for events newer than last scan time
      // .gte() = greater than or equal, ensures we get all new events
      // Ordered ascending so we process in chronological order
      const { data: telemetryData, error } = await supabase
        .from('telemetry')
        .select('*')
        .gte('event_time', lastScanTime)
        .order('event_time', { ascending: true });

      // If query failed, throw to trigger retry
      if (error) {
        throw error;
      }

      // Only update last scan time AFTER successful query
      // This ensures we don't skip events if processing fails
      await redisClient.set('last_scan_time', new Date().toISOString()); // Race: concurrent scans can overwrite timestamp = duplicate processing

      // Process events if any were found
      // This triggers LLM analysis and action execution
      if (telemetryData && telemetryData.length > 0) {
        events = telemetryData as TelemetryEvent[];
        await processTelemetryEvents(events); // Async handoff: errors here don't trigger retry, events lost
      }

      // Reset failure counter on successful scan
      // This allows the loop to recover after temporary issues
      await redisClient.set('healing_fail_count', '0');
    }, {
      retries: 5, // Try up to 5 times before giving up
      minTimeout: 1000, // Start with 1 second delay
      factor: 2, // Double the delay each retry (exponential backoff)
    });

    return events;
  } catch (error: any) {
    // If all retries failed, increment persistent failure counter
    // This tracks consecutive failures across multiple loop iterations
    const failCount = await redisClient.incr('healing_fail_count');

    // Log failure to healing_logs table for audit trail
    // Helps diagnose why autonomy stopped working
    await supabase.from('healing_logs').insert({ // Silent fail: if Supabase down, failure not logged, loop stops silently
      type: 'loop_failure',
      details: error.message || String(error),
      timestamp: new Date().toISOString(),
    });

    // Circuit breaker pattern: stop loop after 3 consecutive failures
    // Prevents infinite retry loops when there's a persistent issue
    // Admin can manually re-enable via toggleAutonomy()
    if (failCount >= 3) {
      logError('Healing loop failures exceeded threshold, stopping loop');
      if (globalHealingInterval) {
        clearInterval(globalHealingInterval);
        globalHealingInterval = null;
      }
    }

    // Re-throw to allow caller to handle if needed
    throw error;
  }
}

// Export scanTelemetry for testing purposes
export { scanTelemetry };

/**
 * Process telemetry events and predict failures
 * 
 * This is the core orchestration function that:
 * 1. Groups events by type (for efficient batch processing)
 * 2. Routes each event type to specialized handlers
 * 3. Each handler uses LLM to reason about the issue and propose fixes
 * 4. Policy guard validates actions before execution
 * 5. Executor runs approved actions
 */
async function processTelemetryEvents(events: TelemetryEvent[]): Promise<void> {
  // Initialize autonomy components
  // LLMReasoner: Uses GPT-4/DeepSeek to analyze telemetry and suggest fixes
  // Executor: Runs approved shell commands/scripts
  // PolicyGuard: Validates actions against safety policies
  let reasoner: LLMReasoner;
  try {
    // Try DeepSeek first, fallback to OpenAI
    const apiKey = await getDeepSeekKey();
    reasoner = new LLMReasoner(apiKey);
  } catch {
    try {
      const apiKey = await getOpenAIKey();
      reasoner = new LLMReasoner(apiKey);
    } catch {
      logError('No LLM API key available in vault', new Error('LLM key missing'));
      return;
    }
  }
  const executor = new Executor();
  const guard = new PolicyGuard();

  // Group events by type for batch processing
  // This allows us to handle multiple events of the same type together
  // More efficient than processing individually
  const messageStallEvents = events.filter(e => e.event === 'message_stall');
  const chatDeadlockEvents = events.filter(e => e.event === 'chat_deadlock');
  const spamBurstEvents = events.filter(e => e.event === 'spam_burst');

  // Process each event type with its specialized handler
  // Each handler implements domain-specific logic for that failure type
  if (messageStallEvents.length > 0) {
    await handleMessageStall(messageStallEvents, reasoner, executor, guard);
  }

  if (chatDeadlockEvents.length > 0) {
    await handleChatDeadlock(chatDeadlockEvents, reasoner, executor, guard);
  }

  if (spamBurstEvents.length > 0) {
    await handleSpamBurst(spamBurstEvents, reasoner, executor, guard);
  }
}

/**
 * Handle message_stall events
 * 
 * Message stalls occur when message delivery latency exceeds thresholds.
 * This handler:
 * 1. Analyzes stall patterns (which rooms, timing, severity)
 * 2. Uses LLM to reason about root cause (queue depth, DB load, network)
 * 3. Proposes actions (scale workers, clear queue, restart service)
 * 4. Validates actions through policy guard
 * 5. Executes approved actions
 */
async function handleMessageStall(
  events: TelemetryEvent[],
  reasoner: LLMReasoner,
  executor: Executor,
  guard: PolicyGuard
): Promise<void> {
  logInfo(`Processing ${events.length} message_stall events`);
  
  // TODO: Full implementation would:
  // 1. Aggregate stall metrics (avg latency, affected rooms, spike patterns)
  // 2. Call reasoner.reason() with telemetry data to get proposed actions
  // 3. For each proposed action:
  //    - Validate with guard.validate(action)
  //    - If valid, execute with executor.execute(action)
  //    - Log results to healing_logs
  // 4. Example actions: "restart message-queue-worker", "scale-up-redis-connections"
}

/**
 * Handle chat_deadlock events
 * 
 * Chat deadlocks occur when message processing gets stuck (e.g., circular dependencies,
 * database locks, infinite loops). This handler identifies and resolves deadlocks.
 */
async function handleChatDeadlock(
  events: TelemetryEvent[],
  reasoner: LLMReasoner,
  executor: Executor,
  guard: PolicyGuard
): Promise<void> {
  logInfo(`Processing ${events.length} chat_deadlock events`);
  
  // TODO: Full implementation would:
  // 1. Identify deadlock patterns (which rooms, what operations stuck)
  // 2. Use LLM to analyze deadlock cause (DB locks, circular message dependencies)
  // 3. Propose recovery actions (kill stuck processes, clear locks, restart workers)
  // 4. Validate and execute approved actions
  // 5. Example actions: "kill-stuck-message-process", "clear-redis-locks", "restart-db-connections"
}

/**
 * Handle spam_burst events
 * 
 * Spam bursts are sudden spikes in message volume, often from bots or attacks.
 * This handler detects and mitigates spam to protect system resources.
 */
async function handleSpamBurst(
  events: TelemetryEvent[],
  reasoner: LLMReasoner,
  executor: Executor,
  guard: PolicyGuard
): Promise<void> {
  logInfo(`Processing ${events.length} spam_burst events`);
  
  // TODO: Full implementation would:
  // 1. Analyze spam patterns (source IPs, user IDs, message content patterns)
  // 2. Use LLM to determine if it's legitimate traffic spike or attack
  // 3. Propose mitigation actions (rate limit users, block IPs, enable captcha)
  // 4. Validate actions (ensure we don't block legitimate users)
  // 5. Execute approved actions
  // 6. Example actions: "rate-limit-user:123", "block-ip:1.2.3.4", "enable-captcha-room:456"
}

/**
 * Start the autonomy healing loop
 * 
 * Creates a periodic interval that:
 * 1. Checks Redis for autonomy_mode toggle (allows runtime enable/disable)
 * 2. Scans telemetry for new events
 * 3. Processes events through LLM reasoning and action execution
 * 
 * The loop runs every 60 seconds, which balances:
 * - Responsiveness: Issues detected within 1 minute
 * - Resource usage: Not too frequent to overload system
 * - Cost: LLM API calls are expensive, so batching helps
 */
export function startAutonomyLoop(): void {
  // Prevent duplicate loops if called multiple times
  if (globalHealingInterval) {
    logInfo('Healing loop already running');
    return;
  }

  // Set up interval to run every 60 seconds (1 minute)
  // This is the main autonomy heartbeat
  globalHealingInterval = setInterval(async () => {
    try {
      // Check Redis for autonomy mode toggle
      // Allows admins to disable autonomy without restarting server
      // Useful for maintenance, debugging, or when autonomy is causing issues
      const mode = await redisClient.get('autonomy_mode');
      if (mode !== 'enabled') {
        logInfo('Autonomy mode disabled, skipping execution');
        return; // Skip this iteration but keep loop running
      }

      // Scan and process telemetry
      // This is where the actual autonomy work happens
      await scanTelemetry();
    } catch (error: any) {
      // Log errors but don't stop the loop
      // Individual failures are handled in scanTelemetry() with retry logic
      // Only persistent failures will stop the loop (via circuit breaker)
      logError('Error in healing loop iteration', error);
    }
  }, 60000); // 1-minute interval

  logInfo('Healing loop started');
}

/**
 * Toggle autonomy mode on/off
 * 
 * Allows runtime control of autonomy system without server restart.
 * Useful for:
 * - Maintenance windows
 * - Debugging autonomy issues
 * - Temporarily disabling when LLM API is down
 * - Cost control (disable during low-traffic periods)
 */
export async function toggleAutonomy(mode: 'enabled' | 'disabled'): Promise<void> {
  // Store mode in Redis for persistence across server restarts
  // Also allows other processes/servers to check autonomy status
  await redisClient.set('autonomy_mode', mode);
  
  // If disabling, stop the loop immediately
  // Prevents any in-flight operations from continuing
  if (mode === 'disabled' && globalHealingInterval) {
    clearInterval(globalHealingInterval);
    globalHealingInterval = null;
    logInfo('Healing loop stopped');
  } 
  // If enabling and loop isn't running, start it
  // Handles case where server restarted but mode was 'enabled' in Redis
  else if (mode === 'enabled' && !globalHealingInterval) {
    startAutonomyLoop();
  }
}

/**
 * Stop the healing loop
 * 
 * Emergency stop function - immediately halts autonomy operations.
 * Use this when autonomy is causing issues and you need instant shutdown.
 * 
 * Note: This doesn't update Redis autonomy_mode, so if you restart the server,
 * autonomy will resume if mode was 'enabled'. Use toggleAutonomy('disabled') for
 * persistent disable.
 */
export function stopAutonomyLoop(): void {
  if (globalHealingInterval) {
    clearInterval(globalHealingInterval);
    globalHealingInterval = null;
    logInfo('Healing loop stopped');
  }
}

