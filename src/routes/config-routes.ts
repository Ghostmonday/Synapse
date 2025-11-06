/**
 * Configuration Routes
 * Handles application configuration retrieval and updates
 */

import { Router } from 'express';
import * as configService from '../services/config-service.js';
import { telemetryHook } from '../telemetry/index.js';

const router = Router();

/**
 * GET /config
 * Retrieve all configuration
 */
router.get('/', async (req, res, next) => {
  try {
    telemetryHook('config_get_start');
    const config = await configService.getAllConfiguration();
    telemetryHook('config_get_end');
    res.json(config);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /config
 * Update configuration values
 */
router.put('/', async (req, res, next) => {
  try {
    telemetryHook('config_update_start');
    await configService.updateConfiguration(req.body);
    telemetryHook('config_update_end');
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

export default router;

