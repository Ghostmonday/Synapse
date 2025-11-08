/**
 * Telemetry Service
 * Logs application events to both Prometheus metrics and Supabase for persistence
 */

import client from 'prom-client';
import { supabase } from '../config/db.js';
import { logError } from '../shared/logger.js';

const telemetryEventCounter = new client.Counter({
  name: 'telemetry_events_total',
  help: 'Total number of telemetry events recorded',
  labelNames: ['event']
});

/**
 * Record a telemetry event
 * Increments the Prometheus counter and persists to Supabase telemetry table
 */
export async function recordTelemetryEvent(
  eventName: string,
  metadata?: {
    room_id?: string;
    user_id?: string;
    risk?: number;
    action?: string;
    features?: Record<string, unknown>;
    latency_ms?: number;
  }
): Promise<void> {
  // Increment Prometheus counter (non-blocking)
  telemetryEventCounter.inc({ event: eventName });

  // Persist to Supabase telemetry table
  try {
    await supabase.from('telemetry').insert({
      event: eventName,
      event_time: new Date().toISOString(),
      room_id: metadata?.room_id || null,
      user_id: metadata?.user_id || null,
      risk: metadata?.risk || null,
      action: metadata?.action || null,
      features: metadata?.features || null,
      latency_ms: metadata?.latency_ms || null,
    });
  } catch (error) {
    // Log error but don't fail the operation (Prometheus logging succeeded)
    logError('Failed to persist telemetry to Supabase', error);
  }
}

