/**
 * Rooms routes
 * Uses Supabase REST API
 */

import { Router } from 'express';
import { supabase } from '../config/db.js';
import { logError } from '../shared/logger.js';
import { authMiddleware } from '../server/middleware/auth.js';
import { checkUsageLimit, trackUsage } from '../services/usage-service.js';

const router = Router();

/**
 * POST /rooms/create
 * Body: { name, owner_id, is_public? }
 * Returns: Created room object
 */
router.post('/create', authMiddleware, async (req, res) => {
  const userId = (req as any).user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name, is_public } = req.body;
  const owner_id = userId; // Use authenticated user ID

  if (!name) {
    return res.status(400).json({ error: 'name is required' });
  }

  try {
    // Check room limit
    const limitCheck = await checkUsageLimit(userId, 'maxRooms');
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: 'Room limit reached',
        upgrade_url: '/subscription/upgrade',
        limit: limitCheck.limit,
        used: limitCheck.used,
        message: `You've created ${limitCheck.used} of ${limitCheck.limit} rooms. Upgrade to Pro for unlimited rooms.`
      });
    }

    const { data, error } = await supabase
      .from('rooms')
      .insert([{ name, owner_id, is_public: is_public || false }])
      .select()
      .single();

    if (error) throw error;

    // Track usage
    await trackUsage(userId, 'room_created', 1, { room_id: data.id });

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
