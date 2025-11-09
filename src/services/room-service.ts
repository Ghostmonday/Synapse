/**
 * Room Service
 * Manages room creation, configuration, and tier-based features
 * Supports temp rooms (Pro) and permanent rooms (Enterprise)
 */

import { findOne, create, updateOne } from '../shared/supabase-helpers.js';
import { logError, logInfo } from '../shared/logger.js';
import { supabase } from '../config/db.js';
import { getUserSubscription, SubscriptionTier } from './subscription-service.js';

export type RoomType = 'temp' | 'permanent';

/**
 * Create a room with tier-based restrictions
 * Pro: Temp rooms (auto-expire after 24h)
 * Enterprise: Permanent rooms
 */
export async function createRoom(
  creatorId: string,
  type: RoomType,
  expiresAfter?: number
): Promise<any> {
  try {
    const tier = await getUserSubscription(creatorId);

    // Validate tier requirements
    if (type === 'permanent' && tier !== SubscriptionTier.TEAM) {
      // Note: Adjust this check if you have an 'enterprise' tier
      // For now, TEAM maps to enterprise
      throw new Error('Permanent rooms are enterprise-only');
    }

    if (type === 'temp' && tier !== SubscriptionTier.PRO) {
      throw new Error('Temp rooms are pro-only');
    }

    const roomData: any = {
      created_by: creatorId,
      type: type,
      ai_moderation: false, // Default off, opt-in only
      room_tier: tier === SubscriptionTier.TEAM ? 'enterprise' : tier === SubscriptionTier.PRO ? 'pro' : 'free',
    };

    // Set expiry for temp rooms (default 24 hours)
    if (type === 'temp') {
      const expiryMs = expiresAfter || 86400000; // 24 hours default
      roomData.expires_at = new Date(Date.now() + expiryMs).toISOString();
    }

    const room = await create('rooms', roomData);
    logInfo(`Room created: ${room.id}, type: ${type}, tier: ${roomData.room_tier}`);

    return room;
  } catch (error: any) {
    logError('Failed to create room', error);
    throw error;
  }
}

/**
 * Get room configuration
 */
export async function getRoomConfig(roomId: string): Promise<any | null> {
  try {
    return await findOne('rooms', { id: roomId });
  } catch (error: any) {
    logError('Failed to get room config', error);
    return null;
  }
}

/**
 * Get user subscription tier
 */
export async function getUserTier(userId: string): Promise<string> {
  try {
    const tier = await getUserSubscription(userId);
    return tier;
  } catch {
    return SubscriptionTier.FREE;
  }
}

/**
 * Purge expired temp rooms
 * Call this from cron job or autonomy optimizer
 */
export async function purgeExpiredRooms(): Promise<number> {
  try {
    const now = new Date().toISOString();
    
    const { data: expiredRooms, error } = await supabase
      .from('rooms')
      .select('id')
      .lt('expires_at', now)
      .eq('room_tier', 'pro');

    if (error) {
      logError('Failed to fetch expired rooms', error);
      return 0;
    }

    if (!expiredRooms || expiredRooms.length === 0) {
      return 0;
    }

    const roomIds = expiredRooms.map(r => r.id);
    const { error: deleteError } = await supabase
      .from('rooms')
      .delete()
      .in('id', roomIds);

    if (deleteError) {
      logError('Failed to delete expired rooms', deleteError);
      return 0;
    }

    logInfo(`Purged ${roomIds.length} temp rooms`);
    return roomIds.length;
  } catch (error: any) {
    logError('Error purging expired rooms', error);
    return 0;
  }
}

/**
 * Check if user can access enterprise features
 */
export function isEnterpriseUser(tier: string): boolean {
  return tier === SubscriptionTier.TEAM || tier === 'enterprise';
}

