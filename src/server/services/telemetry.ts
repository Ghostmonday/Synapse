/**
 * Telemetry service writes aggregated counters to prom-client
 */

import client from 'prom-client';

const eventCounter = new client.Counter({
  name: 'telemetry_events_total',
  help: 'Total telemetry events',
  labelNames: ['event']
});

export async function logEvent(event: string) {
  eventCounter.inc({ event });
}

