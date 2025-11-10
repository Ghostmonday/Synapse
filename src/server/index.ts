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
import chatRoomConfigRoutes from '../routes/chat-room-config-routes.js';
import roomRoutes from '../routes/room-routes.js';
import aiLogRoutes from '../routes/ai-log-routes.js';
import readReceiptsRoutes from '../routes/read-receipts-routes.js';
import pollsRoutes from '../routes/polls-routes.js';
import nicknamesRoutes from '../routes/nicknames-routes.js';
import pinnedRoutes from '../routes/pinned-routes.js';
import bandwidthRoutes from '../routes/bandwidth-routes.js';
import botInvitesRoutes from '../routes/bot-invites-routes.js';
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
const allowedOrigins = [
  'https://sinapse.app',
  'http://localhost:3000',
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', 'authorization, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

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
app.use('/api', adminRoutes); // Also mount admin routes at /api for health and demo-seed
app.use('/api/aiops', aiopsRoutes);
app.use('/api/assistants', assistantsRoutes);
app.use('/api/bots', botsRoutes);
app.use('/api/notify', notifyRoutes);
app.use('/api/reactions', reactionsRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/threads', threadsRoutes);
app.use('/api/ux-telemetry', uxTelemetryRoutes); // UX Telemetry (separate from system telemetry)
app.use('/api/ai-logs', aiLogRoutes); // AI log classification and routing
app.use('/api/read-receipts', readReceiptsRoutes); // Read receipts endpoints
app.use('/api/polls', pollsRoutes); // Polls endpoints
app.use('/api/nicknames', nicknamesRoutes); // Nicknames endpoints
app.use('/api/pinned', pinnedRoutes); // Pinned items endpoints
app.use('/api/bandwidth', bandwidthRoutes); // Bandwidth mode endpoints
app.use('/api/bot-invites', botInvitesRoutes); // Bot invites endpoints
app.use('/chat_rooms', chatRoomConfigRoutes); // Room configuration endpoints
app.use('/', roomRoutes); // Room creation and join endpoints (POST /chat-rooms, POST /chat-rooms/:id/join)
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
    
    // Import UX telemetry service and watchdog dynamically
    const { 
      getRecentSummary, 
      getCategorySummary,
      getAISuggestionMetrics,
      getSentimentMetrics,
      getFunnelMetrics,
      getPerformanceMetrics,
    } = await import('../services/ux-telemetry-service.js');
    
    const { runWatchdog } = await import('../llm-observer/watchdog.js');
    
    // Get aggregated metrics
    const recentSummary = await getRecentSummary(24);
    const categorySummary = await getCategorySummary();
    
    // Get new category-specific metrics
    const [
      aiSuggestionMetrics,
      sentimentMetrics,
      funnelMetrics,
      performanceMetrics,
    ] = await Promise.all([
      getAISuggestionMetrics(168), // 7 days
      getSentimentMetrics(168),
      getFunnelMetrics(168),
      getPerformanceMetrics(24),
    ]);
    
    // Get watchdog analysis with derivable metrics
    let watchdogSummary = null;
    try {
      watchdogSummary = await runWatchdog();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Stats Endpoint] Watchdog failed:', errorMessage);
    }
    
    return res.json({
      timestamp: new Date().toISOString(),
      recent_summary: recentSummary,
      category_summary: categorySummary,
      
      // AI Feedback Metrics
      ai_feedback: {
        suggestion_acceptance_rate: aiSuggestionMetrics?.acceptanceRate || 0,
        total_suggestions: aiSuggestionMetrics?.totalSuggestions || 0,
        accepted: aiSuggestionMetrics?.accepted || 0,
        rejected: aiSuggestionMetrics?.rejected || 0,
      },
      
      // Emotional Tracking
      emotional_tracking: {
        avg_sentiment: sentimentMetrics?.avgSentiment || 0,
        volatility: sentimentMetrics?.volatility || 0,
        positive_trend: sentimentMetrics?.positiveTrend || false,
      },
      
      // Journey Analytics
      journey_analytics: {
        funnel_completion_rate: funnelMetrics?.completionRate || 0,
        total_checkpoints: funnelMetrics?.totalCheckpoints || 0,
        total_dropoffs: funnelMetrics?.totalDropoffs || 0,
      },
      
      // Performance Linking
      performance_linking: {
        avg_load_time_ms: performanceMetrics?.avgLoadTime || 0,
        avg_interaction_latency_ms: performanceMetrics?.avgInteractionLatency || 0,
        stutter_rate: performanceMetrics?.stutterRate || 0,
        long_state_count: performanceMetrics?.longStateCount || 0,
      },
      
      // Watchdog Derivable Metrics
      derivable_metrics: watchdogSummary?.derivableMetrics || {
        confidenceScorePerAgent: 0,
        uxFragilityIndex: 0,
        emotionalVolatilityIndex: 0,
        pathPredictabilityScore: 0,
        uxCompletionRateBySegment: [],
        perceivedAIAccuracyByOutcome: 0,
      },
      
      // Watchdog Recommendations
      watchdog_recommendations: watchdogSummary?.recommendations || [],
      
      note: 'UX Telemetry stats - separate from system telemetry. Includes AI feedback, emotional tracking, journey analytics, performance linking, and watchdog derivable metrics.',
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

