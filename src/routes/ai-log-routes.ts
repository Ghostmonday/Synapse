/**
 * AI Log Routes
 * API endpoints for manual log processing through the three-bucket system
 */

import { Router } from 'express';
import { routeLog, routeLogs } from '../services/ai-log-router.js';
import { LogEntry } from '../services/ai-log-classifier.js';
import { authMiddleware } from '../server/middleware/auth.js';
import { AuthenticatedRequest } from '../types/auth.types.js';
import { logError } from '../shared/logger.js';

const router = Router();

/**
 * POST /api/ai-logs/route
 * Route a single log entry through the classification system
 */
router.post('/route', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { timestamp, level, message, metadata, userId, roomId, eventType, source } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }

    const entry: LogEntry = {
      timestamp: timestamp || new Date().toISOString(),
      level: level || 'info',
      message,
      metadata,
      userId: userId || req.user?.userId,
      roomId,
      eventType,
      source
    };

    const result = await routeLog(entry);

    res.json(result);
  } catch (error: any) {
    logError('Log routing failed', error);
    res.status(500).json({ error: 'Log routing failed', message: error.message });
  }
});

/**
 * POST /api/ai-logs/route-batch
 * Route multiple log entries in batch
 */
router.post('/route-batch', authMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { entries } = req.body;

    if (!Array.isArray(entries)) {
      return res.status(400).json({ error: 'entries must be an array' });
    }

    const logEntries: LogEntry[] = entries.map((e: any) => ({
      timestamp: e.timestamp || new Date().toISOString(),
      level: e.level || 'info',
      message: e.message || '',
      metadata: e.metadata,
      userId: e.userId || req.user?.userId,
      roomId: e.roomId,
      eventType: e.eventType || e.event,
      source: e.source
    }));

    const results = await routeLogs(logEntries);

    res.json({ results });
  } catch (error: any) {
    logError('Batch log routing failed', error);
    res.status(500).json({ error: 'Batch log routing failed', message: error.message });
  }
});

export default router;

