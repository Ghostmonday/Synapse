/**
 * Partition Management Cron Job
 * Runs daily to rotate partitions and clean up old data
 * 
 * Schedule: Daily at 2 AM UTC (configurable via environment)
 * 
 * Tasks:
 * 1. Rotate partition (create new partition for current month)
 * 2. Clean up old partitions (drop partitions older than retention period)
 */

import { rotatePartition, runAllCleanup } from '../services/partition-management-service.js';
import { logInfo, logError } from '../shared/logger.js';

/**
 * Calculate oldest partition month to keep
 * Default: 7 days retention (configurable via PARTITION_RETENTION_DAYS)
 */
function getOldestPartitionMonth(): string {
  const retentionDays = parseInt(process.env.PARTITION_RETENTION_DAYS || '7', 10);
  const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  
  const year = cutoffDate.getFullYear();
  const month = String(cutoffDate.getMonth() + 1).padStart(2, '0');
  
  return `messages_${year}${month}`;
}

/**
 * Run partition management tasks
 */
export async function runPartitionManagement(): Promise<void> {
  try {
    logInfo('Starting partition management cron job');
    
    // Step 1: Rotate partition (create new partition for current month)
    const rotateResult = await rotatePartition();
    
    if (rotateResult.success) {
      logInfo('Partition rotation completed', { partitionName: rotateResult.partitionName });
    } else {
      logError('Partition rotation failed', new Error(rotateResult.error || 'Unknown error'));
      // Continue with cleanup even if rotation fails
    }
    
    // Step 2: Clean up old partitions
    const oldestPartitionMonth = getOldestPartitionMonth();
    const cleanupResult = await runAllCleanup(oldestPartitionMonth);
    
    if (cleanupResult.success) {
      logInfo('Partition cleanup completed', { 
        dropped: cleanupResult.dropped,
        oldestPartitionMonth 
      });
    } else {
      logError('Partition cleanup had errors', new Error(cleanupResult.errors.join('; ')));
    }
    
    logInfo('Partition management cron job completed', {
      rotationSuccess: rotateResult.success,
      cleanupDropped: cleanupResult.dropped,
      cleanupErrors: cleanupResult.errors.length
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Partition management cron job failed', error instanceof Error ? error : new Error(errorMessage));
    throw error;
  }
}

/**
 * Schedule partition management to run daily
 * Uses setInterval for simplicity (consider node-cron for production)
 */
export function schedulePartitionManagement(): void {
  const intervalHours = parseInt(process.env.PARTITION_MANAGEMENT_INTERVAL_HOURS || '24', 10);
  const intervalMs = intervalHours * 60 * 60 * 1000;
  
  logInfo('Scheduling partition management', { intervalHours });
  
  // Run immediately on startup
  runPartitionManagement().catch(err => {
    logError('Initial partition management run failed', err);
  });
  
  // Schedule recurring runs
  setInterval(() => {
    runPartitionManagement().catch(err => {
      logError('Scheduled partition management run failed', err);
    });
  }, intervalMs);
}

