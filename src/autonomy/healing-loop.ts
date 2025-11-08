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

const redisClient = getRedisClient();
let globalHealingInterval: NodeJS.Timeout | null = null;

/**
 * Scans telemetry from Supabase with time-based filtering
 * Uses Redis to track last scan time for efficient incremental queries
 */
async function scanTelemetry(): Promise<TelemetryEvent[]> {
  let events: TelemetryEvent[] = [];
  
  try {
    await pRetry(async () => {
      const lastScanTime = await redisClient.get('last_scan_time') || new Date(0).toISOString();

      const { data: telemetryData, error } = await supabase
        .from('telemetry')
        .select('*')
        .gte('event_time', lastScanTime)
        .order('event_time', { ascending: true });

      if (error) {
        throw error;
      }

      // Update last scan time on success
      await redisClient.set('last_scan_time', new Date().toISOString());

      // Process telemetry events
      if (telemetryData && telemetryData.length > 0) {
        events = telemetryData as TelemetryEvent[];
        await processTelemetryEvents(events);
      }

      // Reset failure count on success
      await redisClient.set('healing_fail_count', '0');
    }, {
      retries: 5,
      minTimeout: 1000, // Exponential backoff starts from 1 second
      factor: 2,
    });

    return events;
  } catch (error: any) {
    // Increment failure count
    const failCount = await redisClient.incr('healing_fail_count');

    // Log to Supabase healing_logs
    await supabase.from('healing_logs').insert({
      type: 'loop_failure',
      details: error.message || String(error),
      timestamp: new Date().toISOString(),
    });

    // Clear interval if failures hit 3
    if (failCount >= 3) {
      logError('Healing loop failures exceeded threshold, stopping loop');
      if (globalHealingInterval) {
        clearInterval(globalHealingInterval);
        globalHealingInterval = null;
      }
    }

    throw error;
  }
}

// Export scanTelemetry for testing purposes
export { scanTelemetry };

/**
 * Process telemetry events and predict failures
 */
async function processTelemetryEvents(events: TelemetryEvent[]): Promise<void> {
  const reasoner = new LLMReasoner(process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '');
  const executor = new Executor();
  const guard = new PolicyGuard();

  // Group events by type for processing
  const messageStallEvents = events.filter(e => e.event === 'message_stall');
  const chatDeadlockEvents = events.filter(e => e.event === 'chat_deadlock');
  const spamBurstEvents = events.filter(e => e.event === 'spam_burst');

  // Process each type
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
 */
async function handleMessageStall(
  events: TelemetryEvent[],
  reasoner: LLMReasoner,
  executor: Executor,
  guard: PolicyGuard
): Promise<void> {
  logInfo(`Processing ${events.length} message_stall events`);
  // Implementation for message stall handling
  // This would call the LLM reasoner and execute approved actions
}

/**
 * Handle chat_deadlock events
 */
async function handleChatDeadlock(
  events: TelemetryEvent[],
  reasoner: LLMReasoner,
  executor: Executor,
  guard: PolicyGuard
): Promise<void> {
  logInfo(`Processing ${events.length} chat_deadlock events`);
  // Implementation for chat deadlock handling
}

/**
 * Handle spam_burst events
 */
async function handleSpamBurst(
  events: TelemetryEvent[],
  reasoner: LLMReasoner,
  executor: Executor,
  guard: PolicyGuard
): Promise<void> {
  logInfo(`Processing ${events.length} spam_burst events`);
  // Implementation for spam burst handling
}

/**
 * Start the autonomy healing loop
 * Checks Redis autonomy_mode before each execution
 */
export function startAutonomyLoop(): void {
  if (globalHealingInterval) {
    logInfo('Healing loop already running');
    return;
  }

  globalHealingInterval = setInterval(async () => {
    try {
      const mode = await redisClient.get('autonomy_mode');
      if (mode !== 'enabled') {
        logInfo('Autonomy mode disabled, skipping execution');
        return;
      }

      await scanTelemetry();
    } catch (error: any) {
      logError('Error in healing loop iteration', error);
    }
  }, 60000); // 1-minute interval

  logInfo('Healing loop started');
}

/**
 * Toggle autonomy mode on/off
 */
export async function toggleAutonomy(mode: 'enabled' | 'disabled'): Promise<void> {
  await redisClient.set('autonomy_mode', mode);
  
  if (mode === 'disabled' && globalHealingInterval) {
    clearInterval(globalHealingInterval);
    globalHealingInterval = null;
    logInfo('Healing loop stopped');
  } else if (mode === 'enabled' && !globalHealingInterval) {
    startAutonomyLoop();
  }
}

/**
 * Stop the healing loop
 */
export function stopAutonomyLoop(): void {
  if (globalHealingInterval) {
    clearInterval(globalHealingInterval);
    globalHealingInterval = null;
    logInfo('Healing loop stopped');
  }
}

