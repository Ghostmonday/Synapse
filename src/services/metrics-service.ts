import client from 'prom-client';
import express from 'express';

const register = new client.Registry();
client.collectDefaultMetrics({ register });

export const messageCounter = new client.Counter({
  name: 'sinapse_messages_total',
  help: 'Total messages',
  registers: [register],
});

export const latencyHistogram = new client.Histogram({
  name: 'sinapse_request_latency_seconds',
  help: 'Request latency',
  buckets: [0.1, 0.5, 1, 5],
  registers: [register],
});

const router = express.Router();
router.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

export default router;

