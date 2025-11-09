/**
 * Rooms routes
 * Uses Supabase REST API
 */

import { Router } from 'express';
import { supabase } from '../config/db.js';
import { logError } from '../shared/logger.js';
import { authMiddleware } from '../server/middleware/auth.js';
import { checkUsageLimit, trackUsage } from '../services/usage-service.js';
import { getUserSubscription, SubscriptionTier } from '../services/subscription-service.js';
import { createRoom, getRoomConfig } from '../services/room-service.js';
import { updateOne } from '../shared/supabase-helpers.js';

const router = Router();

/**
 * POST /rooms/create
 * Body: { name, is_public?, type?: 'temp' | 'permanent' }
 * Returns: Created room object
 */
router.post('/create', authMiddleware, async (req, res) => {
  const userId = (req as any).user?.userId;
  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { name, is_public, type } = req.body;
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

    // Determine room type based on tier or explicit type
    const subscriptionTier = await getUserSubscription(userId);
    let roomType: 'temp' | 'permanent' = 'permanent';
    
    if (type) {
      roomType = type;
    } else if (subscriptionTier === SubscriptionTier.PRO) {
      roomType = 'temp'; // Pro defaults to temp
    }

    // Create room using room service
    const room = await createRoom(userId, roomType);

    // Track usage
    await trackUsage(userId, 'room_created', 1, { room_id: room.id });

    res.json({ 
      status: 'ok', 
      room: {
        ...room,
        expires_at: room.expires_at || null
      }
    });
  } catch (e) {
    logError('Create room error', e instanceof Error ? e : new Error(String(e)));
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) || 'Server error' });
  }
});

/**
 * GET /rooms/:id/config
 * Get room configuration
 */
router.get('/:id/config', authMiddleware, async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = (req as any).user?.userId;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = await getRoomConfig(roomId);
    if (!config || config.created_by !== userId) {
      return res.status(403).json({ error: 'Not yours' });
    }

    res.json(config);
  } catch (e) {
    logError('Get room config error', e instanceof Error ? e : new Error(String(e)));
    res.status(500).json({ error: 'Failed to get room config' });
  }
});

/**
 * PUT /rooms/:id/config
 * Update room configuration (AI moderation toggle - enterprise only)
 */
router.put('/:id/config', authMiddleware, async (req, res) => {
  try {
    const roomId = req.params.id;
    const userId = (req as any).user?.userId;
    const { ai_moderation } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const config = await getRoomConfig(roomId);
    if (!config || config.created_by !== userId) {
      return res.status(403).json({ error: 'Not yours' });
    }

    // Check enterprise requirement for moderation
    const subscriptionTier = await getUserSubscription(userId);
    if (ai_moderation && subscriptionTier !== SubscriptionTier.TEAM) {
      return res.status(403).json({
        error: 'Enterprise subscription required for AI moderation',
        upgrade_url: '/subscription/upgrade',
      });
    }

    // Update room config
    const updates: any = {};
    if (typeof ai_moderation === 'boolean') {
      updates.ai_moderation = ai_moderation;
      if (ai_moderation) {
        updates.room_tier = 'enterprise';
      }
    }

    await updateOne('rooms', roomId, updates);
    res.json({ success: true });
  } catch (e) {
    logError('Update room config error', e instanceof Error ? e : new Error(String(e)));
    res.status(500).json({ error: 'Failed to update room config' });
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
