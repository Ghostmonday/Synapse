/**
 * Admin Routes
 * Administrative endpoints including health check and demo seeding
 */

import { Router, type Request, type Response } from 'express';
import { supabase } from '../config/db.js';
import * as optimizerService from '../services/optimizer-service.js';
import * as adminService from '../server/services/admin.js';
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
 * POST /admin/apply-recommendation
 * Store optimization recommendation (requires authentication)
 */
router.post('/apply-recommendation', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    telemetryHook('admin_apply_start');
    await optimizerService.storeOptimizationRecommendation(req.body.recommendation);
    telemetryHook('admin_apply_end');
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /admin/partitions
 * Get partition metadata including sizes
 */
router.get('/partitions', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const metadata = await adminService.loadPartitionMetadata();
    res.json({ partitions: metadata });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/rotate-partition
 * Rotate partition: Create new partition for current month
 */
router.post('/rotate-partition', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const result = await adminService.rotatePartition();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /admin/cleanup-partitions
 * Clean up old partitions (requires oldestPartitionName in body)
 */
router.post('/cleanup-partitions', authMiddleware, async (req: Request, res: Response, next) => {
  try {
    const { oldestPartitionName } = req.body;
    if (!oldestPartitionName) {
      return res.status(400).json({ error: 'oldestPartitionName is required' });
    }
    const result = await adminService.runAllCleanup(oldestPartitionName);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;
