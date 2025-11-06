/**
 * User Authentication Routes
 * Handles Apple Sign-In and credential-based authentication endpoints
 */

import { Router } from 'express';
import * as authenticationService from '../services/user-authentication-service.js';
import { telemetryHook } from '../telemetry/index.js';

const router = Router();

/**
 * POST /auth/apple
 * Verify Apple ID token and create user session
 */
router.post('/apple', async (req, res, next) => {
  try {
    telemetryHook('auth_apple_start');
    const result = await authenticationService.verifyAppleSignInToken(req.body.token);
    telemetryHook('auth_apple_end');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /auth/login
 * Authenticate with username and password
 */
router.post('/login', async (req, res, next) => {
  try {
    telemetryHook('auth_login_start');
    const result = await authenticationService.authenticateWithCredentials(
      req.body.username,
      req.body.password
    );
    telemetryHook('auth_login_end');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

