# ⚡ Quick Start: Copy-Paste Implementation Guide

**Goal**: Get critical features working ASAP  
**Approach**: Copy code, modify, test, ship

---

## 🔥 START HERE: Critical Code to Write

### 1. Password Hashing (30 minutes)

#### Install Dependency
```bash
npm install bcrypt @types/bcrypt
```

#### Update Authentication Service
```typescript
// File: src/services/user-authentication-service.ts
// ADD at top:
import bcrypt from 'bcrypt';

// REPLACE authenticateWithCredentials function:
export async function authenticateWithCredentials(
  username: string,
  password: string
): Promise<{ jwt: string }> {
  try {
    const user = await findOne<{ id: string; password_hash: string }>('users', {
      username
    });

    if (!user) {
      throw new Error('Invalid username or password');
    }

    // Verify password hash
    if (!user.password_hash) {
      // Legacy user without hash - migrate
      throw new Error('Account needs password reset');
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw new Error('Invalid username or password');
    }

    const applicationToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    return { jwt: applicationToken };
  } catch (error: unknown) {
    logError('Credential authentication failed', error instanceof Error ? error : new Error(String(error)));
    throw new Error(error instanceof Error ? error.message : 'Login failed');
  }
}

// ADD new function for registration:
export async function registerUser(
  username: string,
  password: string
): Promise<{ jwt: string }> {
  try {
    const password_hash = await bcrypt.hash(password, 10);
    
    const user = await create('users', {
      username,
      password_hash,
      subscription: 'free'
    });

    const applicationToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET || 'dev_secret',
      { expiresIn: '7d' }
    );

    return { jwt: applicationToken };
  } catch (error: unknown) {
    logError('Registration failed', error instanceof Error ? error : new Error(String(error)));
    throw new Error(error instanceof Error ? error.message : 'Registration failed');
  }
}
```

---

### 2. Subscription Service (1 hour)

#### Create Subscription Service
```typescript
// File: src/services/subscription-service.ts (CREATE NEW FILE)
import { findOne, update } from '../shared/supabase-helpers.js';
import { logError } from '../shared/logger.js';

export enum SubscriptionTier {
  FREE = 'free',
  PRO = 'pro',
  TEAM = 'team'
}

export interface SubscriptionLimits {
  aiMessages: number; // -1 = unlimited
  maxRooms: number;
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
    await update('users', { id: userId }, { subscription: tier });
  } catch (error) {
    logError('Failed to update subscription', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}
```

---

### 3. Usage Tracking Service (45 minutes)

```typescript
// File: src/services/usage-service.ts (CREATE NEW FILE)
import { create, findMany } from '../shared/supabase-helpers.js';
import { logError } from '../shared/logger.js';

export async function trackUsage(
  userId: string,
  eventType: string,
  amount: number = 1,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await create('usage_stats', {
      user_id: userId,
      event_type: eventType,
      metadata: { amount, ...metadata },
      ts: new Date().toISOString()
    });
  } catch (error) {
    logError('Failed to track usage', error instanceof Error ? error : new Error(String(error)));
    // Don't throw - usage tracking shouldn't break the app
  }
}

export async function getUsageCount(
  userId: string,
  eventType: string,
  period: 'month' | 'day' = 'month'
): Promise<number> {
  try {
    const now = new Date();
    const startDate = period === 'month'
      ? new Date(now.getFullYear(), now.getMonth(), 1)
      : new Date(now.setHours(0, 0, 0, 0));

    const stats = await findMany<{ metadata: { amount?: number } }>('usage_stats', {
      filter: {
        user_id: userId,
        event_type: eventType,
        ts: { gte: startDate.toISOString() }
      }
    });

    return stats.reduce((sum, stat) => {
      return sum + (stat.metadata?.amount || 1);
    }, 0);
  } catch (error) {
    logError('Failed to get usage count', error instanceof Error ? error : new Error(String(error)));
    return 0;
  }
}

export async function checkUsageLimit(
  userId: string,
  limitType: 'aiMessages' | 'maxRooms' | 'storageMB' | 'voiceCallMinutes',
  currentUsage?: number
): Promise<{ allowed: boolean; limit: number; used: number }> {
  try {
    const { getSubscriptionLimits } = await import('./subscription-service.js');
    const limits = await getSubscriptionLimits(userId);
    const limit = limits[limitType];

    if (limit === -1) {
      return { allowed: true, limit: -1, used: 0 };
    }

    let used = currentUsage;
    if (used === undefined) {
      const eventTypeMap: Record<string, string> = {
        aiMessages: 'ai_message',
        maxRooms: 'room_created',
        storageMB: 'file_upload',
        voiceCallMinutes: 'voice_call'
      };
      used = await getUsageCount(userId, eventTypeMap[limitType] || limitType, 'month');
    }

    return {
      allowed: used < limit,
      limit,
      used
    };
  } catch (error) {
    logError('Failed to check usage limit', error instanceof Error ? error : new Error(String(error)));
    return { allowed: false, limit: 0, used: 0 };
  }
}
```

---

### 4. Feature Gating Middleware (30 minutes)

```typescript
// File: src/middleware/subscription-gate.ts (CREATE NEW FILE)
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
```

---

### 5. Apple IAP Verification (1 hour)

```typescript
// File: src/services/apple-iap-service.ts (CREATE NEW FILE)
import https from 'https';
import { updateSubscription, SubscriptionTier } from './subscription-service.js';
import { create } from '../shared/supabase-helpers.js';
import { logError, logInfo } from '../shared/logger.js';

interface AppleReceiptResponse {
  status: number;
  receipt: {
    in_app: Array<{
      product_id: string;
      transaction_id: string;
      purchase_date_ms: string;
    }>;
  };
}

export async function verifyAppleReceipt(
  receiptData: string,
  userId: string
): Promise<{ verified: boolean; tier?: SubscriptionTier }> {
  const isProduction = process.env.NODE_ENV === 'production';
  const verifyURL = isProduction
    ? 'https://buy.itunes.apple.com/verifyReceipt'
    : 'https://sandbox.itunes.apple.com/verifyReceipt';

  const payload = JSON.stringify({
    'receipt-data': receiptData,
    'password': process.env.APPLE_SHARED_SECRET || '',
    'exclude-old-transactions': true
  });

  return new Promise((resolve) => {
    const req = https.request(
      verifyURL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', async () => {
          try {
            const result: AppleReceiptResponse = JSON.parse(data);

            if (result.status === 0) {
              // Valid receipt
              const productId = result.receipt.in_app[0]?.product_id;

              if (productId === 'com.sinapse.pro.monthly') {
                // Update subscription
                await updateSubscription(userId, SubscriptionTier.PRO);

                // Store receipt
                await create('iap_receipts', {
                  user_id: userId,
                  receipt_data: receiptData,
                  verified: true,
                  transaction_id: result.receipt.in_app[0].transaction_id,
                  product_id: productId
                });

                logInfo('Apple IAP', `Subscription verified for user ${userId}`);
                resolve({ verified: true, tier: SubscriptionTier.PRO });
              } else {
                resolve({ verified: false });
              }
            } else if (result.status === 21007) {
              // Sandbox receipt sent to production - retry with sandbox
              logInfo('Apple IAP', 'Retrying with sandbox URL');
              const sandboxResult = await verifyAppleReceipt(receiptData, userId);
              resolve(sandboxResult);
            } else {
              logError('Apple IAP', `Verification failed with status ${result.status}`);
              resolve({ verified: false });
            }
          } catch (error) {
            logError('Apple IAP', `Parse error: ${error instanceof Error ? error.message : String(error)}`);
            resolve({ verified: false });
          }
        });
      }
    );

    req.on('error', (error) => {
      logError('Apple IAP', `Request error: ${error.message}`);
      resolve({ verified: false });
    });

    req.write(payload);
    req.end();
  });
}
```

---

### 6. Subscription Routes (45 minutes)

```typescript
// File: src/routes/subscription-routes.ts (CREATE NEW FILE)
import { Router } from 'express';
import { authMiddleware } from '../server/middleware/auth.js';
import {
  getUserSubscription,
  getSubscriptionLimits,
  updateSubscription,
  SubscriptionTier
} from '../services/subscription-service.js';
import { getUsageCount, checkUsageLimit } from '../services/usage-service.js';
import { verifyAppleReceipt } from '../services/apple-iap-service.js';

const router = Router();
router.use(authMiddleware);

router.get('/status', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const tier = await getUserSubscription(userId);
    const limits = await getSubscriptionLimits(userId);
    const usage = {
      aiMessages: await getUsageCount(userId, 'ai_message'),
      rooms: await getUsageCount(userId, 'room_created'),
      storageMB: await getUsageCount(userId, 'file_upload')
    };

    res.json({ tier, limits, usage });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get subscription status' });
  }
});

router.post('/verify-receipt', async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { receiptData } = req.body;

    if (!receiptData) {
      return res.status(400).json({ error: 'receiptData required' });
    }

    const result = await verifyAppleReceipt(receiptData, userId);
    if (result.verified) {
      res.json({ status: 'verified', tier: result.tier });
    } else {
      res.status(400).json({ error: 'Invalid receipt' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify receipt' });
  }
});

router.get('/plans', async (req, res) => {
  res.json({
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        features: ['10 AI messages/month', '5 rooms', '100MB storage', '30 min voice calls']
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 9.99,
        features: [
          'Unlimited AI messages',
          'Unlimited rooms',
          '10GB storage',
          'Unlimited voice calls',
          'Screen sharing',
          'Priority support'
        ]
      },
      {
        id: 'team',
        name: 'Team',
        price: 29.99,
        features: [
          'All Pro features',
          'Team management',
          '100GB storage',
          'API access',
          'Advanced moderation'
        ]
      }
    ]
  });
});

export default router;
```

---

### 7. Wire Up Routes (15 minutes)

```typescript
// File: src/server/index.ts
// ADD these imports:
import subscriptionRoutes from '../routes/subscription-routes.js';

// ADD this route:
app.use('/subscription', subscriptionRoutes);
```

---

### 8. Enforce Limits on AI Endpoint (30 minutes)

```typescript
// File: src/routes/ai.js
// ADD imports:
import { checkUsageLimit, trackUsage } from '../services/usage-service.js';

// MODIFY /chat endpoint:
router.post('/chat', authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).user.userId;
    const { message, roomId } = req.body;

    if (!message || !roomId) {
      return res.status(400).json({ error: 'message and roomId are required' });
    }

    // Check AI message limit
    const limitCheck = await checkUsageLimit(userId, 'aiMessages');
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: 'AI message limit reached',
        upgrade_url: '/subscription/upgrade',
        limit: limitCheck.limit,
        used: limitCheck.used
      });
    }

    // Track usage BEFORE processing (so failed requests don't count)
    await trackUsage(userId, 'ai_message', 1);

    // TODO: Integrate with OpenAI/DeepSeek API for actual AI responses
    const aiResponse = `AI response to: ${message}`; // Placeholder

    res.json({
      status: 'ok',
      message: aiResponse,
      usage: {
        used: limitCheck.used + 1,
        limit: limitCheck.limit
      }
    });
  } catch (err: unknown) {
    logError('AI chat error', err instanceof Error ? err : new Error(String(err)));
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) || 'Server error' });
  }
});
```

---

## 🎯 NEXT: iOS Implementation

### iOS Subscription View (Copy from SPRINT_TO_LAUNCH.md)

See `docs/SPRINT_TO_LAUNCH.md` for complete iOS code.

---

## ✅ TESTING CHECKLIST

After implementing, test:

1. **Registration/Login**
   ```bash
   curl -X POST http://localhost:3000/auth/register \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"test123"}'
   ```

2. **Subscription Status**
   ```bash
   curl http://localhost:3000/subscription/status \
     -H "Authorization: Bearer $TOKEN"
   ```

3. **AI Message (with limit)**
   ```bash
   curl -X POST http://localhost:3000/ai/chat \
     -H "Authorization: Bearer $TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"message":"Hello","roomId":"room123"}'
   ```

---

## 🚀 DEPLOYMENT CHECKLIST

Before submitting to App Store:

- [ ] All code implemented
- [ ] Tested on real device
- [ ] IAP works in sandbox
- [ ] No crashes
- [ ] Privacy policy URL works
- [ ] Terms of service URL works
- [ ] App Store screenshots ready
- [ ] App description written

---

**Time Estimate**: 8-10 hours of focused coding  
**Priority**: Security → Monetization → Limits → iOS → Test → Submit

