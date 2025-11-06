/**
 * Presence endpoints
 */

import { Router } from 'express';
import * as presenceService from '../services/presence.js';
import { telemetryHook } from '../../telemetry/index.js';

const router = Router();

router.get('/status', async (req, res, next) => {
  try {
    telemetryHook('presence_status_start');
    const result = await presenceService.getPresence(req.query.userId as string);
    telemetryHook('presence_status_end');
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/update', async (req, res, next) => {
  try {
    telemetryHook('presence_update_start');
    await presenceService.updatePresence(req.body.userId, req.body.status);
    telemetryHook('presence_update_end');
    res.status(200).send();
  } catch (err) { next(err); }
});

export default router;

