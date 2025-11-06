/**
 * Auth routes: /auth/*
 *
 * Depends on services in src/server/services/auth.ts
 */

import { Router } from 'express';
import * as authService from '../services/auth.js';
import { telemetryHook } from '../../telemetry/index.js';

const router = Router();

/**
 * POST /auth/apple
 * Body: { token }
 * Verifies Apple ID token, registers user, returns JWT + LiveKit token
 */
router.post('/apple', async (req, res, next) => {
  try {
    telemetryHook('auth_apple_start');
    const result = await authService.verifyAppleToken(req.body.token);
    telemetryHook('auth_apple_end');
    res.json(result);
  } catch (err) { next(err); }
});

/**
 * POST /auth/login
 * Body: { username, password }
 */
router.post('/login', async (req, res, next) => {
  try {
    telemetryHook('auth_login_start');
    const result = await authService.login(req.body.username, req.body.password);
    telemetryHook('auth_login_end');
    res.json(result);
  } catch (err) { next(err); }
});

export default router;

