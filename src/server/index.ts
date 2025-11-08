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
import path from 'path';
import { fileURLToPath } from 'url';
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
import assistantsRoutes from '../routes/assistants-routes.js';
import botsRoutes from '../routes/bots-routes.js';
import healthRoutes from '../routes/health-routes.js';
import notifyRoutes from '../routes/notify-routes.js';
import reactionsRoutes from '../routes/reactions-routes.js';
import searchRoutes from '../routes/search-routes.js';
import threadsRoutes from '../routes/threads-routes.js';
import uxTelemetryRoutes from '../routes/ux-telemetry-routes.js';
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
app.use('/api/assistants', assistantsRoutes);
app.use('/api/bots', botsRoutes);
app.use('/api/notify', notifyRoutes);
app.use('/api/reactions', reactionsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/threads', threadsRoutes);
app.use('/api/ux-telemetry', uxTelemetryRoutes); // UX Telemetry (separate from system telemetry)
app.use(healthRoutes); // Mount health routes at root level

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', client.register.contentType);
  res.send(await client.register.metrics()); // No timeout - can hang if metrics collection slow
});

// Websocket gateway
setupWebSocketGateway(wss);

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Programmatic UI Demo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.get('/ui', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/programmatic-ui-demo.html'));
});

// Debug Stats Endpoint (auth-gated)
app.get('/debug/stats', async (req, res) => {
  try {
    // TODO: Add authentication check
    // For now, require a debug token in environment
    const debugToken = req.query.token;
    if (process.env.NODE_ENV === 'production' && debugToken !== process.env.DEBUG_TOKEN) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    
    // Import UX telemetry service dynamically
    const { getRecentSummary, getCategorySummary } = await import('../services/ux-telemetry-service.js');
    
    // Get aggregated metrics
    const recentSummary = await getRecentSummary(24);
    const categorySummary = await getCategorySummary();
    
    return res.json({
      timestamp: new Date().toISOString(),
      recent_summary: recentSummary,
      category_summary: categorySummary,
      note: 'UX Telemetry stats - separate from system telemetry',
    });
  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Failed to fetch stats',
      message: error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logInfo(`Server running on port ${PORT}`);
});

// Initialize AI schedulers (if enabled)
if (process.env.AI_CONTINUOUS_ENABLED === 'true' || 
    process.env.AI_DAILY_ENABLED === 'true' || 
    process.env.AI_WEEKLY_ENABLED === 'true') {
  import('../services/ai-scheduler.js').then(({ initializeAISchedulers }) => {
    initializeAISchedulers();
    logInfo('AI schedulers initialized');
  }).catch((error) => {
    logInfo('AI schedulers not available (optional feature)');
  });
}

// Attach error middleware after routes
app.use(errorMiddleware);

