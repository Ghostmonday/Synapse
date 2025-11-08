/**
 * LLM Observer Watchdog
 * 
 * AI agent observer that queries UX telemetry for pattern detection.
 * Matches patterns to strategy templates and prepares autonomous actions.
 * 
 * This is a PLACEHOLDER implementation. Future versions will:
 * - Trigger autonomous UX optimizations
 * - Adjust system parameters based on patterns
 * - Self-tune recommendations based on feedback
 * 
 * @module llm-observer-watchdog
 */

import {
  getEventsByCategory,
  getCategorySummary,
  getRecentSummary,
} from '../services/ux-telemetry-service.js';
import { logInfo, logError } from '../shared/logger.js';
import type { UXEventCategory, UXTelemetryEvent } from '../types/ux-telemetry.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Strategy template interface
 */
export interface StrategyTemplate {
  pattern: string;
  threshold: number;
  action: string;
  target: string;
  priority: 'low' | 'medium' | 'high';
  autonomyRole?: string;
}

/**
 * Pattern detection result
 */
export interface PatternDetection {
  pattern: string;
  matched: boolean;
  value: number;
  threshold: number;
  strategy: StrategyTemplate;
  recommendation: string;
}

/**
 * Watchdog summary
 */
export interface WatchdogSummary {
  timestamp: string;
  categorySummary: any[];
  recentSummary: any[];
  patterns: PatternDetection[];
  recommendations: string[];
  derivableMetrics?: {
    confidenceScorePerAgent: number;
    uxFragilityIndex: number;
    emotionalVolatilityIndex: number;
    pathPredictabilityScore: number;
    uxCompletionRateBySegment: { segment: string; rate: number }[];
    perceivedAIAccuracyByOutcome: number;
  };
}

/**
 * Load strategy templates from JSON files
 */
function loadStrategies(): StrategyTemplate[] {
  const strategiesDir = join(__dirname, 'strategies');
  const strategies: StrategyTemplate[] = [];
  
  try {
    const strategyFiles = [
      'message-rollback-strategy.json',
      'validation-error-strategy.json',
      'flow-abandonment-strategy.json',
      'message-emotion-diff-strategy.json',
      'presence-sync-lag-strategy.json',
      'ai-disagreement-strategy.json',
      'context-overload-strategy.json',
      'conversation-arc-strategy.json',
    ];
    
    for (const file of strategyFiles) {
      try {
        const filePath = join(strategiesDir, file);
        const content = readFileSync(filePath, 'utf-8');
        const strategy = JSON.parse(content) as StrategyTemplate;
        strategies.push(strategy);
      } catch (error) {
        // Strategy file doesn't exist yet - skip
        continue;
      }
    }
    
    logInfo(`[LLM Observer] Loaded ${strategies.length} strategy templates`);
  } catch (error) {
    logError('[LLM Observer] Error loading strategies', error);
  }
  
  return strategies;
}

/**
 * Calculate rollback rate
 */
async function calculateRollbackRate(): Promise<number> {
  const rollbackEvents = await getEventsByCategory('messaging' as UXEventCategory, 24);
  const sendAttempts = await getEventsByCategory('messaging' as UXEventCategory, 24);
  
  if (!rollbackEvents || !sendAttempts) return 0;
  
  const rollbacks = rollbackEvents.filter(e => e.eventType === 'message_rollback').length;
  const attempts = sendAttempts.filter(e => e.eventType === 'message_send_attempted').length;
  
  if (attempts === 0) return 0;
  
  return rollbacks / attempts;
}

/**
 * Calculate validation error rate
 */
async function calculateValidationErrorRate(): Promise<number> {
  const events = await getEventsByCategory('validation' as UXEventCategory, 24);
  
  if (!events) return 0;
  
  const errors = events.filter(e => e.eventType === 'ui_validation_error').length;
  const total = events.length;
  
  if (total === 0) return 0;
  
  return errors / total;
}

/**
 * Calculate abandonment rate
 */
async function calculateAbandonmentRate(): Promise<number> {
  const events = await getEventsByCategory('engagement' as UXEventCategory, 24);
  
  if (!events) return 0;
  
  const abandonments = events.filter(e => e.eventType === 'user_flow_abandonment').length;
  const total = events.length;
  
  if (total === 0) return 0;
  
  return abandonments / total;
}

/**
 * Calculate confidence score per AI agent suggestion
 * From accept/reject ratios
 */
async function calculateConfidenceScorePerAgent(): Promise<number> {
  const aiFeedbackEvents = await getEventsByCategory('ai_feedback' as UXEventCategory, 24 * 7); // 7 days
  
  if (!aiFeedbackEvents || aiFeedbackEvents.length === 0) return 0;
  
  const accepted = aiFeedbackEvents.filter(e => e.eventType === 'ai_suggestion_accepted').length;
  const rejected = aiFeedbackEvents.filter(e => e.eventType === 'ai_suggestion_rejected').length;
  const total = accepted + rejected;
  
  if (total === 0) return 0;
  
  // Confidence score: ratio of accepted to total suggestions
  return accepted / total;
}

/**
 * Calculate UX fragility index
 * Abandon rate post-failure
 */
async function calculateUXFragilityIndex(): Promise<number> {
  const engagementEvents = await getEventsByCategory('engagement' as UXEventCategory, 24 * 7);
  const systemEvents = await getEventsByCategory('system' as UXEventCategory, 24 * 7);
  
  if (!engagementEvents || !systemEvents) return 0;
  
  const abandonments = engagementEvents.filter(e => e.eventType === 'user_flow_abandonment').length;
  const failures = systemEvents.filter(e => e.eventType === 'api_failure' || e.eventType === 'client_crash').length;
  
  if (failures === 0) return 0;
  
  // Fragility: ratio of abandonments after failures
  return abandonments / failures;
}

/**
 * Calculate emotional volatility index
 * Sentiment variance across sessions
 */
async function calculateEmotionalVolatilityIndex(): Promise<number> {
  const emotionalEvents = await getEventsByCategory('cognitive_state' as UXEventCategory, 24 * 7);
  
  if (!emotionalEvents || emotionalEvents.length === 0) return 0;
  
  const sentimentScores = emotionalEvents
    .filter(e => e.eventType === 'message_sentiment_before' || e.eventType === 'message_sentiment_after')
    .map(e => (e.metadata as any).sentimentScore)
    .filter(s => typeof s === 'number');
  
  if (sentimentScores.length < 2) return 0;
  
  // Calculate variance
  const mean = sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length;
  const variance = sentimentScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / sentimentScores.length;
  
  return Math.sqrt(variance); // Return standard deviation
}

/**
 * Calculate path predictability score
 * Navigation entropy based on sequence patterns
 */
async function calculatePathPredictabilityScore(): Promise<number> {
  const journeyEvents = await getEventsByCategory('journey_analytics' as UXEventCategory, 24 * 7);
  
  if (!journeyEvents || journeyEvents.length === 0) return 0;
  
  const sequenceEvents = journeyEvents.filter(e => e.eventType === 'event_sequence_path');
  
  if (sequenceEvents.length === 0) return 0;
  
  // Count unique sequence patterns
  const sequencePatterns = new Map<string, number>();
  sequenceEvents.forEach(event => {
    const sequence = (event.metadata as any).sequencePath;
    if (Array.isArray(sequence)) {
      const pattern = sequence.map((s: any) => s.eventType).join('->');
      sequencePatterns.set(pattern, (sequencePatterns.get(pattern) || 0) + 1);
    }
  });
  
  // Calculate entropy
  const total = Array.from(sequencePatterns.values()).reduce((a, b) => a + b, 0);
  const entropy = Array.from(sequencePatterns.values()).reduce((sum, count) => {
    const p = count / total;
    return sum - p * Math.log2(p);
  }, 0);
  
  // Normalize to 0-1 (higher = more predictable, lower = more chaotic)
  const maxEntropy = Math.log2(sequencePatterns.size);
  return maxEntropy > 0 ? 1 - (entropy / maxEntropy) : 1;
}

/**
 * Calculate UX completion rate by segment
 * Funnel success by user type
 */
async function calculateUXCompletionRateBySegment(): Promise<{ segment: string; rate: number }[]> {
  const journeyEvents = await getEventsByCategory('journey_analytics' as UXEventCategory, 24 * 7);
  
  if (!journeyEvents || journeyEvents.length === 0) return [];
  
  const checkpointEvents = journeyEvents.filter(e => e.eventType === 'funnel_checkpoint_hit');
  const dropoffEvents = journeyEvents.filter(e => e.eventType === 'dropoff_point_detected');
  
  // Group by user (using sessionId as proxy for user segment)
  const sessionCompletions = new Map<string, { checkpoints: number; dropoffs: number }>();
  
  checkpointEvents.forEach(event => {
    const session = event.sessionId;
    if (!sessionCompletions.has(session)) {
      sessionCompletions.set(session, { checkpoints: 0, dropoffs: 0 });
    }
    sessionCompletions.get(session)!.checkpoints++;
  });
  
  dropoffEvents.forEach(event => {
    const session = event.sessionId;
    if (!sessionCompletions.has(session)) {
      sessionCompletions.set(session, { checkpoints: 0, dropoffs: 0 });
    }
    sessionCompletions.get(session)!.dropoffs++;
  });
  
  // Calculate completion rates by segment (simplified: new vs returning)
  const segments = [
    { segment: 'all_users', rate: 0 },
  ];
  
  let totalCheckpoints = 0;
  let totalDropoffs = 0;
  
  sessionCompletions.forEach(data => {
    totalCheckpoints += data.checkpoints;
    totalDropoffs += data.dropoffs;
  });
  
  const total = totalCheckpoints + totalDropoffs;
  segments[0].rate = total > 0 ? totalCheckpoints / total : 0;
  
  return segments;
}

/**
 * Calculate perceived AI accuracy by outcome
 * Outcome vs. suggestion metrics
 */
async function calculatePerceivedAIAccuracyByOutcome(): Promise<number> {
  const aiFeedbackEvents = await getEventsByCategory('ai_feedback' as UXEventCategory, 24 * 7);
  
  if (!aiFeedbackEvents || aiFeedbackEvents.length === 0) return 0;
  
  const autoFixEvents = aiFeedbackEvents.filter(e => e.eventType === 'ai_auto_fix_applied');
  const successfulFixes = autoFixEvents.filter(e => (e.metadata as any).outcome === 'success').length;
  const totalFixes = autoFixEvents.length;
  
  if (totalFixes === 0) return 0;
  
  // Accuracy: ratio of successful AI actions
  return successfulFixes / totalFixes;
}

/**
 * Detect patterns based on strategy templates
 */
async function detectPatterns(strategies: StrategyTemplate[]): Promise<PatternDetection[]> {
  const detections: PatternDetection[] = [];
  
  for (const strategy of strategies) {
    let value = 0;
    let matched = false;
    let recommendation = '';
    
    // Calculate value based on pattern
    if (strategy.pattern.includes('rollback')) {
      value = await calculateRollbackRate();
      matched = value > strategy.threshold;
      recommendation = matched ? 
        `High message rollback rate detected (${(value * 100).toFixed(1)}%). ${strategy.action}` :
        'Message rollback rate is normal.';
    } else if (strategy.pattern.includes('validation')) {
      value = await calculateValidationErrorRate();
      matched = value > strategy.threshold;
      recommendation = matched ?
        `High validation error rate detected (${(value * 100).toFixed(1)}%). ${strategy.action}` :
        'Validation error rate is normal.';
    } else if (strategy.pattern.includes('abandonment')) {
      value = await calculateAbandonmentRate();
      matched = value > strategy.threshold;
      recommendation = matched ?
        `High user flow abandonment detected (${(value * 100).toFixed(1)}%). ${strategy.action}` :
        'User flow abandonment rate is normal.';
    }
    
    detections.push({
      pattern: strategy.pattern,
      matched,
      value,
      threshold: strategy.threshold,
      strategy,
      recommendation,
    });
  }
  
  return detections;
}

/**
 * Run watchdog analysis
 */
export async function runWatchdog(): Promise<WatchdogSummary> {
  logInfo('[LLM Observer] Running watchdog analysis...');
  
  try {
    // Load strategies
    const strategies = loadStrategies();
    
    // Get summary data
    const categorySummary = await getCategorySummary() || [];
    const recentSummary = await getRecentSummary(24) || [];
    
    // Detect patterns
    const patterns = await detectPatterns(strategies);
    
    // Calculate derivable metrics
    logInfo('[LLM Observer] Calculating derivable metrics...');
    const [
      confidenceScorePerAgent,
      uxFragilityIndex,
      emotionalVolatilityIndex,
      pathPredictabilityScore,
      uxCompletionRateBySegment,
      perceivedAIAccuracyByOutcome,
    ] = await Promise.all([
      calculateConfidenceScorePerAgent(),
      calculateUXFragilityIndex(),
      calculateEmotionalVolatilityIndex(),
      calculatePathPredictabilityScore(),
      calculateUXCompletionRateBySegment(),
      calculatePerceivedAIAccuracyByOutcome(),
    ]);
    
    // Extract recommendations from matched patterns
    const recommendations = patterns
      .filter(p => p.matched)
      .map(p => p.recommendation);
    
    const summary: WatchdogSummary = {
      timestamp: new Date().toISOString(),
      categorySummary,
      recentSummary,
      patterns,
      recommendations,
      derivableMetrics: {
        confidenceScorePerAgent,
        uxFragilityIndex,
        emotionalVolatilityIndex,
        pathPredictabilityScore,
        uxCompletionRateBySegment,
        perceivedAIAccuracyByOutcome,
      },
    };
    
    // Log summary
    logInfo(`[LLM Observer] Analysis complete: ${patterns.length} patterns checked, ${recommendations.length} recommendations`);
    logInfo(`[LLM Observer] Derivable Metrics:
      - AI Confidence Score: ${(confidenceScorePerAgent * 100).toFixed(1)}%
      - UX Fragility Index: ${uxFragilityIndex.toFixed(2)}
      - Emotional Volatility: ${emotionalVolatilityIndex.toFixed(2)}
      - Path Predictability: ${(pathPredictabilityScore * 100).toFixed(1)}%
      - AI Accuracy: ${(perceivedAIAccuracyByOutcome * 100).toFixed(1)}%
    `);
    
    if (recommendations.length > 0) {
      logInfo('[LLM Observer] Recommendations:');
      recommendations.forEach((rec, i) => {
        logInfo(`  ${i + 1}. ${rec}`);
      });
    }
    
    return summary;
  } catch (error) {
    logError('[LLM Observer] Error running watchdog', error);
    throw error;
  }
}

/**
 * Start watchdog on interval
 */
export function startWatchdog(intervalMinutes: number = 60): NodeJS.Timeout {
  logInfo(`[LLM Observer] Starting watchdog with ${intervalMinutes} minute interval`);
  
  // Run immediately
  runWatchdog().catch(error => {
    logError('[LLM Observer] Initial watchdog run failed', error);
  });
  
  // Run on interval
  return setInterval(() => {
    runWatchdog().catch(error => {
      logError('[LLM Observer] Watchdog run failed', error);
    });
  }, intervalMinutes * 60 * 1000);
}

