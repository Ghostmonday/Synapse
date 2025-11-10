/**
 * Authentication routes
 * Uses secure bcrypt password hashing via user-authentication-service
 */

import { Router } from 'express';
import { authenticateWithCredentials } from '../services/user-authentication-service.js';
import { logError } from '../shared/logger.js';

const router = Router();

/**
 * POST /auth/login
 * Body: { username, password }
 * Returns: JWT token
 * 
 * SECURITY: Uses bcrypt password hashing - never compares plain text passwords
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    // Use secure authentication service with bcrypt password verification
    const { jwt: token } = await authenticateWithCredentials(username, password);

    // Get user info for response (without password)
    const { findOne } = await import('../shared/supabase-helpers.js');
    const user = await findOne('users', { username }, ['id', 'username']);

    res.json({ status: 'ok', token, user: { id: user?.id, username: user?.username } });
  } catch (e) {
    logError('Login error', e instanceof Error ? e : new Error(String(e)));
    const errorMessage = e instanceof Error ? e.message : String(e) || 'Server error';
    
    // Don't leak specific error details for security
    if (errorMessage.includes('Invalid') || errorMessage.includes('credentials')) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
