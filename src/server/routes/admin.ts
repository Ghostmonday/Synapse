/**
 * Admin endpoints (protected)
 */

import { Router } from 'express';
import * as optimizerService from '../services/optimizer.js';
import { telemetryHook } from '../../telemetry/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

router.post('/apply-recommendation', authMiddleware, async (req, res, next) => {
  try {
    telemetryHook('admin_apply_start');
    await optimizerService.applyRecommendation(req.body.recommendation);
    telemetryHook('admin_apply_end');
    res.status(200).send();
  } catch (err) { next(err); }
});

export default router;

