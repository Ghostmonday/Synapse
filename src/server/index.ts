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
import subscriptionRoutes from '../routes/subscription-routes.js';
import entitlementsRoutes from '../routes/entitlements-routes.js';
import healthRoutes from '../routes/health-routes.js';
import notifyRoutes from '../routes/notify-routes.js';
import reactionsRoutes from '../routes/reactions-routes.js';
import searchRoutes from '../routes/search-routes.js';
import threadsRoutes from '../routes/threads-routes.js';
import uxTelemetryRoutes from '../routes/ux-telemetry-routes.js';
import chatRoomConfigRoutes from '../routes/chat-room-config-routes.js';
import roomRoutes from '../routes/room-routes.js';
import agoraRoutes from '../routes/agora-routes.js';
import readReceiptsRoutes from '../routes/read-receipts-routes.js';
import nicknamesRoutes from '../routes/nicknames-routes.js';
import pinnedRoutes from '../routes/pinned-routes.js';
import bandwidthRoutes from '../routes/bandwidth-routes.js';
import { telemetryMiddleware } from './middleware/telemetry.js';
import { errorMiddleware } from './middleware/error.js';
import { rateLimit, ipRateLimit } from '../middleware/rate-limiter.js';
import { sanitizeInput } from '../middleware/input-validation.js';
import { fileUploadSecurity } from '../middleware/file-upload-security.js';
import helmet from 'helmet';
import { logInfo } from '../shared/logger.js';
import { LIMIT_REQUESTS_PER_MIN } from './utils/config.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// collect node metrics for Prometheus
client.collectDefaultMetrics();

// CORS configuration - locked to synapse.app and localhost:3000
// SECURITY: Never use wildcard (*) with credentials: true
const allowedOrigins = [
  'https://sinapse.app',
  'http://localhost:3000',
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  // SECURITY: Only set CORS headers if origin is in allowed list
  // Never use '*' with credentials: true (prevents credential leakage)
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else if (origin) {
    // Log unauthorized origin attempts for security monitoring
    logInfo(`Blocked CORS request from unauthorized origin: ${origin}`);
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Security middleware - Helmet with strict CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // 'unsafe-inline' needed for some UI frameworks
      scriptSrc: ["'self'"], // No inline scripts - XSS protection
      imgSrc: ["'self'", "data:", "https:"], // Allow images from HTTPS sources
      connectSrc: ["'self'", "wss:", "ws:"], // WebSocket connections
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"], // Block plugins
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"], // Block iframes
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [], // Upgrade HTTP to HTTPS
    },
  },
  crossOriginEmbedderPolicy: false, // Allow WebSocket connections
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
  noSniff: true, // Prevent MIME type sniffing
  xssFilter: true, // Enable XSS filter
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// Rate limiting - IP-based DDoS protection
app.use(ipRateLimit(LIMIT_REQUESTS_PER_MIN, 60000));

// Middleware
app.use(express.json({ limit: '10mb' })); // Limit request size
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(sanitizeInput); // SECURITY: Sanitize all input before processing
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
app.use('/entitlements', entitlementsRoutes);
import { appStoreWebhook } from '../services/webhooks.js';
app.post('/appstore-webhook', appStoreWebhook);
app.use('/api', adminRoutes); // Also mount admin routes at /api for health and demo-seed
app.use('/api/notify', notifyRoutes);
app.use('/api/reactions', reactionsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/threads', threadsRoutes);
app.use('/api/ux-telemetry', uxTelemetryRoutes); // UX Telemetry (separate from system telemetry)
app.use('/api/read-receipts', readReceiptsRoutes); // Read receipts endpoints
app.use('/api/nicknames', nicknamesRoutes); // Nicknames endpoints
app.use('/api/pinned', pinnedRoutes); // Pinned items endpoints
app.use('/api/bandwidth', bandwidthRoutes); // Bandwidth mode endpoints
app.use('/chat_rooms', chatRoomConfigRoutes); // Room configuration endpoints
app.use('/', roomRoutes); // Room creation and join endpoints (POST /chat-rooms, POST /chat-rooms/:id/join)
app.use('/rooms', agoraRoutes); // Agora room management (mute, video, members, leave)
app.use(healthRoutes); // Mount health routes at root level

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.setHeader('Content-Type', client.register.contentType);
  res.send(await client.register.metrics()); // No timeout - can hang if metrics collection slow
});

// Websocket gateway
setupWebSocketGateway(wss);

// Partition management cron job (if enabled)
if (process.env.ENABLE_PARTITION_MANAGEMENT !== 'false') {
  const { schedulePartitionManagement } = await import('../jobs/partition-management-cron.js');
  schedulePartitionManagement();
}

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
    const { 
      getRecentSummary, 
      getCategorySummary,
      getPerformanceMetrics,
    } = await import('../services/ux-telemetry-service.js');
    
    // Get aggregated metrics
    const recentSummary = await getRecentSummary(24);
    const categorySummary = await getCategorySummary();
    
    // Get performance metrics
    const performanceMetrics = await getPerformanceMetrics(24);
    
    return res.json({
      timestamp: new Date().toISOString(),
      recent_summary: recentSummary,
      category_summary: categorySummary,
      
      // Performance Linking
      performance_linking: {
        avg_load_time_ms: performanceMetrics?.avgLoadTime || 0,
        avg_interaction_latency_ms: performanceMetrics?.avgInteractionLatency || 0,
        stutter_rate: performanceMetrics?.stutterRate || 0,
        long_state_count: performanceMetrics?.longStateCount || 0,
      },
      
      note: 'UX Telemetry stats - separate from system telemetry. Includes performance linking metrics.',
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return res.status(500).json({ 
      error: 'Failed to fetch stats',
      message: errorMessage,
    });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logInfo(`Server running on port ${PORT}`);
});

// Initialize Sin AI worker
import('../workers/sin-worker.js').then(({ startSinWorker }) => {
  startSinWorker();
  logInfo('Sin AI worker started');
}).catch((error) => {
  logInfo('Sin worker not available', error);
});


// Attach error middleware after routes
app.use(errorMiddleware);

