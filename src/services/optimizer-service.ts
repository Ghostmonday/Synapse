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
export async function storeOptimizationRecommendation(recommendation: Record<string, unknown> | string): Promise<void> {
  await pRetry(
    async () => {
      await create('recommendations', { rec: recommendation });
      logInfo('Optimization recommendation stored:', JSON.stringify(recommendation));
      // Note: Actual application of recommendations is handled manually or via admin endpoints
    },
    {
      retries: 5,
      minTimeout: 1000, // Start with 1 second
      maxTimeout: 10000, // Cap at 10 seconds
      factor: 2, // Exponential backoff
      onFailedAttempt: (error: { attemptNumber: number; retriesLeft: number; message: string }) => {
        const errorObj = new Error(error.message || `Attempt ${error.attemptNumber} failed`);
        logError(`Attempt ${error.attemptNumber} failed. ${error.retriesLeft} retries left.`, errorObj);
      },
      // Add jitter to prevent thundering herd
      randomize: true,
    }
  );
}

