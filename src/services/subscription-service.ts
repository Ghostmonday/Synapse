/**
 * Subscription Service
 * Manages user subscription tiers and limits
 */

import { findOne, updateOne } from '../shared/supabase-helpers.js';
import { logError } from '../shared/logger.js';

export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  TEAM = 'team'
}

export interface SubscriptionLimits {
  aiMessages: number; // -1 = unlimited
  maxRooms: number; // -1 = unlimited
  storageMB: number;
  voiceCallMinutes: number; // -1 = unlimited
}

const TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  [SubscriptionTier.FREE]: {
    aiMessages: 10,
    maxRooms: 5,
    storageMB: 100,
    voiceCallMinutes: 30
  },
  [SubscriptionTier.PRO]: {
    aiMessages: -1,
    maxRooms: -1,
    storageMB: 10240, // 10GB
    voiceCallMinutes: -1
  },
  [SubscriptionTier.TEAM]: {
    aiMessages: -1,
    maxRooms: -1,
    storageMB: 102400, // 100GB
    voiceCallMinutes: -1
  }
};

export async function getUserSubscription(userId: string): Promise<SubscriptionTier> {
  try {
    const user = await findOne<{ subscription: string }>('users', { id: userId });
    if (!user) return SubscriptionTier.FREE;
    
    const tier = user.subscription as SubscriptionTier;
    return Object.values(SubscriptionTier).includes(tier) ? tier : SubscriptionTier.FREE;
  } catch (error) {
    logError('Failed to get user subscription', error instanceof Error ? error : new Error(String(error)));
    return SubscriptionTier.FREE;
  }
}

export async function getSubscriptionLimits(userId: string): Promise<SubscriptionLimits> {
  const tier = await getUserSubscription(userId);
  return TIER_LIMITS[tier];
}

export async function updateSubscription(userId: string, tier: SubscriptionTier): Promise<void> {
  try {
    await updateOne('users', userId, { subscription: tier });
  } catch (error) {
    logError('Failed to update subscription', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

