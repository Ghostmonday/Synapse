/**
 * Telemetry Service
 * Logs application events to Prometheus metrics
 */

import client from 'prom-client';

const telemetryEventCounter = new client.Counter({
  name: 'telemetry_events_total',
  help: 'Total number of telemetry events recorded',
  labelNames: ['event']
});

/**
 * Record a telemetry event
 * Increments the Prometheus counter for observability
 */
export async function recordTelemetryEvent(eventName: string): Promise<void> {
  telemetryEventCounter.inc({ event: eventName });
}

