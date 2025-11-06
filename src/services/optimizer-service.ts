/**
 * Optimizer Service
 * Receives and stores optimization recommendations from the optimizer microservice
 */

import { create } from '../shared/supabase-helpers.js';
import { logInfo, logError } from '../shared/logger.js';

/**
 * Store an optimization recommendation
 * Used by the optimizer microservice to persist recommendations for auditing
 */
export async function storeOptimizationRecommendation(recommendation: any): Promise<void> {
  try {
    await create('recommendations', { rec: recommendation });
    logInfo('Optimization recommendation stored:', JSON.stringify(recommendation));
    // Note: Actual application of recommendations is handled manually or via admin endpoints
  } catch (error: any) {
    logError('Failed to store optimization recommendation', error);
    throw new Error(error.message || 'Failed to store recommendation');
  }
}

