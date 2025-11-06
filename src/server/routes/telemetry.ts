/**
 * Telemetry ingestion
 */

import { Router } from 'express';
import * as telemetryService from '../services/telemetry.js';
import { telemetryHook } from '../../telemetry/index.js';

const router = Router();

router.post('/log', async (req, res, next) => {
  try {
    telemetryHook('telemetry_log_start');
    await telemetryService.logEvent(req.body.event);
    telemetryHook('telemetry_log_end');
    res.status(200).send();
  } catch (err) { next(err); }
});

export default router;

