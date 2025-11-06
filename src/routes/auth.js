/**
 * Authentication routes
 * Uses Supabase REST API
 */

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { supabase } from '../config/db.js';
import { logError } from '../shared/logger.js';

const router = Router();

/**
 * POST /auth/login
 * Body: { username, password }
 * Returns: JWT token
 */
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'sinapse_secret_jwt_key',
      { expiresIn: '1d' }
    );

    res.json({ status: 'ok', token, user: { id: user.id, username: user.username } });
  } catch (e) {
    logError('Login error', e instanceof Error ? e : new Error(String(e)));
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) || 'Server error' });
  }
});

export default router;
