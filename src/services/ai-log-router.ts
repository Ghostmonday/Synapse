/**
 * AI Log Router
 * Routes classified logs to appropriate handlers with strict safety constraints
 * 
 * This is the main entry point for AI log processing.
 * It ensures logs are classified and routed to the correct handler
 * before any AI processing occurs.
 */

import { classifyLog, LogBucket, LogEntry, validateClassification } from './ai-log-classifier.js';
import { analyzeUserVoice, UserVoiceAnalysis } from './ai-handlers/user-voice-handler.js';
import { analyzeUserControl, ModerationAction } from './ai-handlers/user-control-handler.js';
import { analyzeSystemOps, SystemOpsAnalysis, PrometheusMetric } from './ai-handlers/system-ops-handler.js';
import { logError, logInfo } from '../shared/logger.js';

export interface RoutedLogResult {
  bucket: LogBucket;
  result: UserVoiceAnalysis | ModerationAction | SystemOpsAnalysis | null;
  error?: string;
}

/**
 * Route log entry to appropriate handler based on classification
 * This is the main function that orchestrates the three-bucket system
 */
export async function routeLog(entry: LogEntry): Promise<RoutedLogResult> {
  try {
    // Step 1: Classify log entry
    const bucket = classifyLog(entry);
    
    // Step 2: Validate classification
    if (!validateClassification(entry, bucket)) {
      logError(`Classification mismatch for log entry: ${entry.message}`);
      return {
        bucket: LogBucket.UNKNOWN,
        result: null,
        error: 'Classification validation failed'
      };
    }

    // Step 3: Route to appropriate handler
    switch (bucket) {
      case LogBucket.USER_VOICE:
        return await handleUserVoice(entry);
      
      case LogBucket.USER_CONTROL:
        return await handleUserControl(entry);
      
      case LogBucket.SYSTEM_OPS:
        return await handleSystemOps(entry);
      
      case LogBucket.UNKNOWN:
      default:
        logInfo(`Unclassified log entry: ${entry.message}`);
        return {
          bucket: LogBucket.UNKNOWN,
          result: null
        };
    }
  } catch (error: any) {
    logError('Log routing failed', error);
    return {
      bucket: LogBucket.UNKNOWN,
      result: null,
      error: error.message || 'Unknown error'
    };
  }
}

/**
 * Handle USER_VOICE bucket
 * Extracts transcript/content and analyzes for intent, sarcasm, toxicity
 */
async function handleUserVoice(entry: LogEntry): Promise<RoutedLogResult> {
  try {
    // Extract transcript from message or metadata
    const transcript = entry.message || entry.metadata?.content || entry.metadata?.transcript || '';
    
    if (!transcript) {
      return {
        bucket: LogBucket.USER_VOICE,
        result: null,
        error: 'No transcript content found'
      };
    }

    const analysis = await analyzeUserVoice(transcript, {
      userId: entry.userId || entry.metadata?.userId,
      roomId: entry.roomId || entry.metadata?.roomId,
      timestamp: entry.timestamp
    });

    return {
      bucket: LogBucket.USER_VOICE,
      result: analysis
    };
  } catch (error: any) {
    logError('User voice handling failed', error);
    return {
      bucket: LogBucket.USER_VOICE,
      result: null,
      error: error.message || 'User voice analysis failed'
    };
  }
}

/**
 * Handle USER_CONTROL bucket
 * Extracts moderation data and returns locked JSON format
 */
async function handleUserControl(entry: LogEntry): Promise<RoutedLogResult> {
  try {
    // Extract moderation data from metadata
    const moderationData = {
      content: entry.metadata?.content || entry.message,
      userId: entry.userId || entry.metadata?.userId,
      roomId: entry.roomId || entry.metadata?.roomId,
      violationCount: entry.metadata?.violationCount || entry.metadata?.violation_count,
      previousActions: entry.metadata?.previousActions || entry.metadata?.previous_actions,
      context: entry.metadata
    };

    const action = await analyzeUserControl(moderationData);

    return {
      bucket: LogBucket.USER_CONTROL,
      result: action
    };
  } catch (error: any) {
    logError('User control handling failed', error);
    return {
      bucket: LogBucket.USER_CONTROL,
      result: null,
      error: error.message || 'User control analysis failed'
    };
  }
}

/**
 * Handle SYSTEM_OPS bucket
 * Extracts Prometheus metrics and analyzes for remediation phrases
 */
async function handleSystemOps(entry: LogEntry): Promise<RoutedLogResult> {
  try {
    // Extract metrics from metadata or message
    let metrics: PrometheusMetric[] = [];
    
    if (entry.metadata?.metrics) {
      metrics = Array.isArray(entry.metadata.metrics) 
        ? entry.metadata.metrics 
        : [entry.metadata.metrics];
    } else if (entry.metadata?.prometheus) {
      metrics = Array.isArray(entry.metadata.prometheus)
        ? entry.metadata.prometheus
        : [entry.metadata.prometheus];
    } else {
      // Try to parse from message if it's JSON
      try {
        const parsed = JSON.parse(entry.message);
        if (Array.isArray(parsed)) {
          metrics = parsed;
        } else if (parsed.metrics) {
          metrics = Array.isArray(parsed.metrics) ? parsed.metrics : [parsed.metrics];
        }
      } catch {
        // Not JSON, skip
      }
    }

    if (metrics.length === 0) {
      return {
        bucket: LogBucket.SYSTEM_OPS,
        result: null,
        error: 'No Prometheus metrics found'
      };
    }

    const analysis = await analyzeSystemOps(metrics);

    return {
      bucket: LogBucket.SYSTEM_OPS,
      result: analysis
    };
  } catch (error: any) {
    logError('System ops handling failed', error);
    return {
      bucket: LogBucket.SYSTEM_OPS,
      result: null,
      error: error.message || 'System ops analysis failed'
    };
  }
}

/**
 * Batch route multiple log entries
 * Useful for processing logs in bulk
 */
export async function routeLogs(entries: LogEntry[]): Promise<RoutedLogResult[]> {
  const results = await Promise.allSettled(
    entries.map(entry => routeLog(entry))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      logError(`Log routing failed for entry ${index}`, result.reason);
      return {
        bucket: LogBucket.UNKNOWN,
        result: null,
        error: result.reason?.message || 'Unknown error'
      };
    }
  });
}

