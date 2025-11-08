/**
 * Admin Routes
 * Administrative endpoints including health check and demo seeding
 */

import { Router, type Request, type Response } from 'express';
import { supabase } from '../config/db.js';
import * as optimizerService from '../services/optimizer-service.js';
import { telemetryHook } from '../telemetry/index.js';
import { authMiddleware } from '../server/middleware/auth.js';
import { logError } from '../shared/logger.js';

const router = Router();

/**
 * GET /admin/health
 * Health check endpoint with Supabase connectivity test
 */
router.get('/health', async (_req: Request, res: Response) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) throw error;

    res.json({
      status: 'healthy',
      database: 'Supabase REST',
      timestamp: new Date().toISOString(),
      sample_user_count: data.length,
    });
  } catch (err: unknown) {
    logError('Health check failed', err instanceof Error ? err : new Error(String(err)));
    res.status(503).json({
      status: 'unhealthy',
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

/**
 * POST /admin/demo-seed
 * Seeds demo data: user → room → message
 */
router.post('/demo-seed', async (_req: Request, res: Response) => {
  try {
    // 1. Insert demo user
    const { data: user, error: userErr } = await supabase
      .from('users')
      .insert([{ username: 'DemoUser' }])
      .select()
      .single();
    if (userErr) throw userErr;

    // 2. Insert demo room
    const { data: room, error: roomErr } = await supabase
      .from('rooms')
      .insert([{ name: 'Demo Room', owner_id: user.id }])
      .select()
      .single();
    if (roomErr) throw roomErr;

    // 3. Insert demo message
    const { error: msgErr } = await supabase
      .from('messages')
      .insert([
        {
          room_id: room.id,
          user_id: user.id,
          content: 'Hello from Sinapse backend!',
        },
      ]);
    if (msgErr) throw msgErr;

    res.json({
      status: 'ok',
      user_id: user.id,
      room_id: room.id,
      message: 'Demo data seeded successfully',
    });
  } catch (err: unknown) {
    logError('Demo-seed error', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ 
      status: 'error', 
      message: err instanceof Error ? err.message : String(err) 
    });
  }
});

/**
 * Rate limiter function for room actions
 * Allows up to 5 actions per room_id per minute
 */
async function rateLimitRoomActions(roomId: string): Promise<boolean> {
  const { getRedisClient } = await import('../config/db.js');
  const redisClient = getRedisClient();
  const key = `healing_action:${roomId}`;
  const count = await redisClient.incr(key);
  if (count === 1) {
    await redisClient.expire(key, 60); // 1-minute window
  }
  return count <= 5; // Allow up to 5 actions per minute
}

/**
 * POST /admin/apply-recommendation
 * Store optimization recommendation (requires authentication)
 * Enhanced with input validation, rate limiting, and security
 */
router.post('/apply-recommendation', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const { z } = await import('zod');
    
    // Define Zod schema for input validation with strict typing
    const RecommendationSchema = z.object({
      room_id: z.string().uuid('Invalid room_id format').optional(),
      recommendation: z.union([
        z.record(z.string(), z.unknown()),
        z.string().min(1, 'Recommendation cannot be empty')
      ]),
    }).strict(); // Reject unknown fields

    const validation = RecommendationSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ error: validation.error.message });
    }

    const { room_id, recommendation } = validation.data;

    // Rate limit if room_id is provided
    if (room_id) {
      const allowed = await rateLimitRoomActions(room_id);
      if (!allowed) {
        return res.status(429).json({ error: 'Rate limit exceeded for this room' });
      }
    }

    telemetryHook('admin_apply_start');
    await optimizerService.storeOptimizationRecommendation(recommendation);
    telemetryHook('admin_apply_end');
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
