/**
 * Config endpoints
 */

import { Router } from 'express';
import * as configService from '../services/config.js';
import { telemetryHook } from '../../telemetry/index.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    telemetryHook('config_get_start');
    const config = await configService.getConfig();
    telemetryHook('config_get_end');
    res.json(config);
  } catch (err) { next(err); }
});

router.put('/', async (req, res, next) => {
  try {
    telemetryHook('config_update_start');
    await configService.updateConfig(req.body);
    telemetryHook('config_update_end');
    res.status(200).send();
  } catch (err) { next(err); }
});

export default router;

