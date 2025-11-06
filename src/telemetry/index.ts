/**
 * Small telemetry glue that exposes telemetryHook used across codebase.
 * It increments a prom-client Counter exported here (registry is in server index).
 */

import client from 'prom-client';

const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path'],
});

export function telemetryHook(event: string) {
  // event format: request_METHOD_path_like_this
  const parts = event.split('_');
  const method = parts[1] || 'UNKNOWN';
  const path = parts.slice(2).join('_') || '/';
  httpRequestCounter.inc({ method, path });
  // Keep function minimal; add logging if needed
}

