/**
 * Messaging endpoints
 */

import { Router } from 'express';
import * as messagingService from '../services/messaging.js';
import { telemetryHook } from '../../telemetry/index.js';

const router = Router();

router.post('/send', async (req, res, next) => {
  try {
    telemetryHook('messaging_send_start');
    await messagingService.sendMessage(req.body);
    telemetryHook('messaging_send_end');
    res.status(200).send();
  } catch (err) { next(err); }
});

router.get('/:roomId', async (req, res, next) => {
  try {
    telemetryHook('messaging_get_start');
    const messages = await messagingService.getMessages(req.params.roomId);
    telemetryHook('messaging_get_end');
    res.json(messages);
  } catch (err) { next(err); }
});

export default router;

