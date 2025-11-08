/**
 * Telemetry Service
 * Logs application events to both Prometheus metrics and Supabase for persistence
 */

import client from 'prom-client';
import { supabase } from '../config/db.js';
import { logError } from '../shared/logger.js';

// Prometheus counter metric for telemetry events
// Counter = monotonically increasing metric (only goes up)
// labelNames: ['event'] = allows filtering by event type in Prometheus queries
const telemetryEventCounter = new client.Counter({
  name: 'telemetry_events_total', // Metric name (convention: _total suffix for counters)
  help: 'Total number of telemetry events recorded', // Description for Prometheus UI
  labelNames: ['event'] // Label dimension: allows grouping by event type
});

/**
 * Record a telemetry event
 * 
 * Dual logging strategy:
 * 1. Prometheus counter (fast, in-memory, for real-time monitoring)
 * 2. Supabase database (persistent, queryable, for historical analysis)
 * 
 * If Supabase insert fails, we still have Prometheus metrics (graceful degradation)
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
  // Increment Prometheus counter (synchronous, non-blocking, very fast)
  // This happens first so we have metrics even if database insert fails
  // Label 'event' allows querying: telemetry_events_total{event="message_sent"}
  telemetryEventCounter.inc({ event: eventName });

  // Persist to Supabase telemetry table (async, can fail)
  // This provides persistent storage for historical analysis and autonomy system
  try {
    await supabase.from('telemetry').insert({
      event: eventName, // Event type identifier (e.g., 'message_sent', 'reaction_added')
      event_time: new Date().toISOString(), // ISO 8601 timestamp (PostgreSQL TIMESTAMPTZ)
      room_id: metadata?.room_id || null, // Optional: which room (if applicable)
      user_id: metadata?.user_id || null, // Optional: which user (if applicable)
      risk: metadata?.risk || null, // Optional: risk score 0.0-1.0 (for spam detection, etc.)
      action: metadata?.action || null, // Optional: action taken (for moderation, etc.)
      features: metadata?.features || null, // Optional: JSONB metadata (flexible schema)
      latency_ms: metadata?.latency_ms || null, // Optional: performance metric in milliseconds
    });
  } catch (error) {
    // Log error but don't throw (fail gracefully)
    // Prometheus counter already incremented, so we have partial telemetry
    // This prevents telemetry failures from breaking application flow
    logError('Failed to persist telemetry to Supabase', error);
  }
}

