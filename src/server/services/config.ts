/**
 * Config service: store key/value in config table using Supabase REST API
 * DB table: config(key TEXT PRIMARY KEY, value JSONB)
 */

import { supabase } from '../../config/db.js';
import { logError } from '../../shared/logger.js';

/**
 * Get all config as a single object
 */
export async function getConfig() {
  try {
    const { data, error } = await supabase
      .from('config')
      .select('key, value');

    if (error) throw error;

    // Convert array to object
    interface ConfigRow {
      key: string;
      value: unknown;
    }
    const config: Record<string, unknown> = {};
    (data || [] as ConfigRow[]).forEach((row: ConfigRow) => {
      config[row.key] = row.value;
    });

    return config;
  } catch (e: unknown) {
    logError('getConfig error', e instanceof Error ? e : new Error(String(e)));
    throw new Error(e instanceof Error ? e.message : 'Failed to get config');
  }
}

/**
 * Update config (upsert pattern)
 */
export async function updateConfig(data: Record<string, unknown>) {
  try {
    for (const [key, value] of Object.entries(data)) {
      const { error } = await supabase
        .from('config')
        .upsert({ key, value }, { onConflict: 'key' });

      if (error) throw error;
    }
  } catch (e: unknown) {
    logError('updateConfig error', e instanceof Error ? e : new Error(String(e)));
    throw new Error(e instanceof Error ? e.message : 'Failed to update config');
  }
}
