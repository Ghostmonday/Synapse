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
    };
    
    // Log summary
    logInfo(`[LLM Observer] Analysis complete: ${patterns.length} patterns checked, ${recommendations.length} recommendations`);
    
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

