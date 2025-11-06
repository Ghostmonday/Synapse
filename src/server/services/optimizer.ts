/**
 * Optimizer service: stores recommendations in Supabase
 * This is the receiver for the optimizer microservice
 * Uses Supabase REST API
 */

import { supabase } from '../../config/db.js';
import { logInfo, logError } from '../../shared/logger.js';

/**
 * Apply/store optimizer recommendation
 */
export async function applyRecommendation(recommendation: Record<string, unknown>) {
  try {
    // Store recommendation in Supabase for auditing
    const { error } = await supabase
      .from('recommendations')
      .insert([{ rec: recommendation }]);

    if (error) throw error;

    logInfo('Recommendation stored:', JSON.stringify(recommendation));
    // Optionally apply changes to config table here (manual override recommended)
  } catch (e: unknown) {
    logError('applyRecommendation error', e instanceof Error ? e : new Error(String(e)));
    throw new Error(e instanceof Error ? e.message : 'Failed to apply recommendation');
  }
}
