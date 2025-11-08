/**
 * Main API server
 * - Express HTTP API
 * - WebSocket gateway
 * - Prometheus metrics endpoint
 *
 * Note: TypeScript -> compiled to dist/server/index.js for production.
 */

import express from 'express';
import dotenv from 'dotenv';
import http from 'http';
import { WebSocketServer } from 'ws';
import client from 'prom-client';
import { setupWebSocketGateway } from '../ws/gateway.js';
import userAuthenticationRoutes from '../routes/user-authentication-routes.js';
import fileStorageRoutes from '../routes/file-storage-routes.js';
import presenceRoutes from '../routes/presence-routes.js';
import messageRoutes from '../routes/message-routes.js';
import configRoutes from '../routes/config-routes.js';
import telemetryRoutes from '../routes/telemetry-routes.js';
import adminRoutes from '../routes/admin-routes.js';
import voiceRoutes from '../routes/voice-routes.js';
import aiopsRoutes from './routes/aiops.js';
import subscriptionRoutes from '../routes/subscription-routes.js';
import { telemetryMiddleware } from './middleware/telemetry.js';
import { errorMiddleware } from './middleware/error.js';
import { rateLimit, ipRateLimit } from '../middleware/rate-limiter.js';
import helmet from 'helmet';
import { logInfo } from '../shared/logger.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// collect node metrics for Prometheus
client.collectDefaultMetrics();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow WebSocket connections
}));

// Rate limiting - IP-based DDoS protection
app.use(ipRateLimit(1000, 60000)); // 1000 requests per minute per IP

// Middleware
app.use(express.json({ limit: '10mb' })); // Limit request size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(telemetryMiddleware);

// Routes
app.use('/auth', userAuthenticationRoutes);
app.use('/files', fileStorageRoutes);
app.use('/presence', presenceRoutes);
app.use('/messaging', messageRoutes);
app.use('/config', configRoutes);
app.use('/telemetry', telemetryRoutes);
app.use('/admin', adminRoutes);
app.use('/voice', voiceRoutes);
app.use('/subscription', subscriptionRoutes);
app.use('/api', adminRoutes); // Also mount admin routes at /api for health and demo-seed
app.use('/api/aiops', aiopsRoutes);

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', client.register.contentType);
  res.send(await client.register.metrics()); // No timeout - can hang if metrics collection slow
});

// Websocket gateway
setupWebSocketGateway(wss);

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logInfo(`Server running on port ${PORT}`);
});

// Attach error middleware after routes
app.use(errorMiddleware);

