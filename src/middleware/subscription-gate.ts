/**
 * Subscription Gate Middleware
 * Enforces subscription tier requirements for routes
 */

import { Request, Response, NextFunction } from 'express';
import { getUserSubscription, SubscriptionTier } from '../services/subscription-service.js';

export const requirePro = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tier = await getUserSubscription(userId);
    if (tier === SubscriptionTier.FREE) {
      return res.status(403).json({
        error: 'Pro subscription required',
        upgrade_url: '/subscription/upgrade',
        current_tier: tier
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to check subscription' });
  }
};

export const requireTeam = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const tier = await getUserSubscription(userId);
    if (tier !== SubscriptionTier.TEAM) {
      return res.status(403).json({
        error: 'Team subscription required',
        upgrade_url: '/subscription/upgrade',
        current_tier: tier
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ error: 'Failed to check subscription' });
  }
};

