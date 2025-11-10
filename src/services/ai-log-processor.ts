/**
 * AI Log Processor
 * Integrates the three-bucket classification system into the existing log pipeline
 * 
 * This service hooks into Winston logger and automatically routes logs
 * to the appropriate AI handlers based on classification.
 */

import { routeLog, routeLogs, RoutedLogResult } from './ai-log-router.js';
import { LogEntry, LogBucket } from './ai-log-classifier.js';
import { logInfo, logError } from '../shared/logger.js';
import { safeAIOperation } from './ai-safeguards.js';

/**
 * Process a single log entry through the AI classification system
 * Wrapped with safety safeguards
 */
export async function processLogEntry(
  entry: LogEntry
): Promise<RoutedLogResult | null> {
  return await safeAIOperation(
    'log_classification',
    async () => {
      return await routeLog(entry);
    },
    { entry }
  );
}

/**
 * Process multiple log entries in batch
 * More efficient for bulk processing
 */
export async function processLogEntries(
  entries: LogEntry[]
): Promise<RoutedLogResult[]> {
  try {
    return await routeLogs(entries);
  } catch (error: any) {
    logError('Batch log processing failed', error);
    return entries.map(() => ({
      bucket: LogBucket.UNKNOWN,
      result: null,
      error: error.message || 'Processing failed'
    }));
  }
}

/**
 * Convert Winston log format to LogEntry format
 */
export function winstonToLogEntry(
  info: any,
  message: string
): LogEntry {
  return {
    timestamp: info.timestamp || new Date().toISOString(),
    level: info.level || 'info',
    message: message || info.message || '',
    metadata: {
      ...info,
      service: info.service,
      userId: info.userId,
      roomId: info.roomId,
      event: info.event,
      eventType: info.eventType || info.event
    },
    userId: info.userId,
    roomId: info.roomId,
    eventType: info.eventType || info.event,
    source: info.service || 'winston'
  };
}

/**
 * Hook into Winston logger to automatically route logs
 * This creates a custom transport that routes logs to AI handlers
 */
export function createAIRoutingTransport() {
  const { createLogger, transports } = require('winston');
  
  class AIRoutingTransport extends transports.Stream {
    constructor() {
      super({
        stream: {
          write: async (chunk: string) => {
            try {
              const info = JSON.parse(chunk);
              const entry = winstonToLogEntry(info, info.message);
              
              // Route log asynchronously (don't block logging)
              processLogEntry(entry).catch(err => {
                logError('Auto-routing failed', err);
              });
            } catch (error) {
              // Ignore parse errors - not all logs are JSON
            }
          }
        }
      });
    }
  }
  
  return AIRoutingTransport;
}

