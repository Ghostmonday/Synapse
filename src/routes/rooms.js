/**
 * Rooms routes
 * Uses Supabase REST API
 */

import { Router } from 'express';
import { supabase } from '../config/db.js';
import { logError } from '../shared/logger.js';

const router = Router();

/**
 * POST /rooms/create
 * Body: { name, owner_id, is_public? }
 * Returns: Created room object
 */
router.post('/create', async (req, res) => {
  const { name, owner_id, is_public } = req.body;

  if (!name || !owner_id) {
    return res.status(400).json({ error: 'name and owner_id required' });
  }

  try {
    const { data, error } = await supabase
      .from('rooms')
      .insert([{ name, owner_id, is_public: is_public || false }])
      .select()
      .single();

    if (error) throw error;

    res.json({ status: 'ok', room: data });
  } catch (e) {
    logError('Create room error', e instanceof Error ? e : new Error(String(e)));
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) || 'Server error' });
  }
});

/**
 * GET /rooms/list
 * Query: { userId? }
 * Returns: List of rooms (public or owned by userId)
 */
router.get('/list', async (req, res) => {
  const { userId } = req.query;

  try {
    let query = supabase.from('rooms').select('*');

    // If userId provided, filter by public OR owned by user
    if (userId) {
      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .or(`is_public.eq.true,owner_id.eq.${userId}`);

      if (error) throw error;
      return res.json({ status: 'ok', rooms: data || [] });
    }

    // Otherwise return all public rooms
    const { data, error } = await query.eq('is_public', true);

    if (error) throw error;

    res.json({ status: 'ok', rooms: data || [] });
  } catch (e) {
    logError('List rooms error', e instanceof Error ? e : new Error(String(e)));
    res.status(500).json({ error: e instanceof Error ? e.message : String(e) || 'Server error' });
  }
});

export default router;
