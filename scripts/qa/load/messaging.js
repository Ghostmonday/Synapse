/**
 * k6 Load Test for Messaging Endpoints
 * Ramp 500 VUs, assert p95 < 300ms
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const messageLatency = new Trend('message_latency');

export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp up to 100 VUs
    { duration: '2m', target: 500 },   // Ramp up to 500 VUs
    { duration: '5m', target: 500 },    // Stay at 500 VUs
    { duration: '1m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% of requests under 300ms
    errors: ['rate<0.01'],             // Error rate < 1%
    message_latency: ['p(95)<300'],    // Message latency p95 < 300ms
  },
};

const BASE_URL = __ENV.API_URL || 'https://staging-api.sinapse.app';
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token';

export default function () {
  const headers = {
    'Authorization': `Bearer ${AUTH_TOKEN}`,
    'Content-Type': 'application/json',
  };

  // Test message sending endpoint
  const messagePayload = JSON.stringify({
    roomId: `room-${Math.floor(Math.random() * 1000)}`,
    senderId: `user-${Math.floor(Math.random() * 10000)}`,
    content: `Load test message ${Date.now()}`,
  });

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/messages`, messagePayload, { headers });
  const latency = Date.now() - startTime;

  messageLatency.add(latency);

  const success = check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 300ms': (r) => r.timings.duration < 300,
    'has message ID': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id !== undefined;
      } catch {
        return false;
      }
    },
  });

  errorRate.add(!success);

  sleep(1); // 1 request per second per VU
}

