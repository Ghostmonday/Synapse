/**
 * Optimizer Service
 * Receives and stores optimization recommendations from the optimizer microservice
 * Enhanced with p-retry, exponential backoff, and jitter for resilience
 */

import pRetry from 'p-retry';
import { create } from '../shared/supabase-helpers.js';
import { logInfo, logError } from '../shared/logger.js';

/**
 * Store an optimization recommendation with retry logic
 * Used by the optimizer microservice to persist recommendations for auditing
 * Includes exponential backoff with jitter for better resilience
 */
/**
 * Store optimization recommendation with retry logic
 * 
 * Wraps database insert in p-retry for resilience against transient failures.
 * Uses exponential backoff with jitter to prevent thundering herd problem.
 */
export async function storeOptimizationRecommendation(recommendation: Record<string, unknown> | string): Promise<void> {
  await pRetry(
    async () => {
      // Attempt to store recommendation in database
      // 'rec' column stores the recommendation (JSONB in database)
      await create('recommendations', { rec: recommendation });
      logInfo('Optimization recommendation stored:', JSON.stringify(recommendation));
      // Note: Actual application of recommendations is handled manually or via admin endpoints
    },
    {
      retries: 5, // Try up to 5 times before giving up
      minTimeout: 1000, // Initial delay: 1 second before first retry
      maxTimeout: 10000, // Maximum delay: 10 seconds (cap exponential growth)
      factor: 2, // Exponential backoff: delays are 1s, 2s, 4s, 8s, 10s (capped)
      onFailedAttempt: (error: { attemptNumber: number; retriesLeft: number; message: string }) => {
        // Callback fired on each failed attempt (before retry)
        // Logs attempt number and remaining retries for monitoring
        const errorObj = new Error(error.message || `Attempt ${error.attemptNumber} failed`);
        logError(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`, errorObj);
      },
      // Add jitter (randomization) to prevent thundering herd
      // When multiple services retry simultaneously, jitter spreads them out
      // Prevents all retries from hitting database at exact same time
      randomize: true, // Adds random 0-1000ms to each delay
    }
  );
}

