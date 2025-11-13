/**
 * User Authentication Routes
 * Handles Apple Sign-In and credential-based authentication endpoints
 */

import { Router } from 'express';
import * as authenticationService from '../services/user-authentication-service.js';
import { telemetryHook } from '../telemetry/index.js';
import { rateLimit } from '../middleware/rate-limiter.js';

const router = Router();

// SECURITY: Apply strict rate limiting to authentication endpoints
// Prevents brute force attacks - 5 attempts per 15 minutes per IP
router.use(rateLimit({ max: 5, windowMs: 15 * 60 * 1000 }));

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

/**
 * POST /auth/register
 * Register a new user with username and password
 */
router.post('/register', async (req, res, next) => {
  try {
    telemetryHook('auth_register_start');
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const result = await authenticationService.registerUser(username, password);
    telemetryHook('auth_register_end');
    res.json(result);
  } catch (error) {
    next(error);
  }
});

export default router;

