/**
 * Webhooks Service
 * Handles App Store Server Notifications for subscription updates
 */

import { Request, Response } from 'express';
import { updateSubscription } from './entitlements.js';
import { logError, logInfo } from '../shared/logger.js';
import { logTelemetryEvent } from './telemetry-service.js';
import crypto from 'crypto';

/**
 * Verify App Store Server Notification signature
 * Note: In production, use proper App Store certificate verification
 * For now, we'll validate the structure and use environment-based auth
 */
function verifyAppStoreSignature(notification: any, signature?: string): boolean {
  // Basic validation - check required fields
  if (!notification || !notification.signedPayload) {
    return false;
  }

  // In production, verify JWS signature using App Store root certificate
  // For now, use environment variable for webhook secret
  const webhookSecret = process.env.APP_STORE_WEBHOOK_SECRET;
  if (webhookSecret && signature) {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(notification))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  }

  // If no secret configured, allow (for development)
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }

  return false;
}

/**
 * Parse App Store Server Notification
 * Extracts user ID, transaction info, and status
 */
function parseNotification(notification: any): {
  transactionId?: string;
  userId?: string;
  status: string;
  productId?: string;
  renewalDate?: Date;
} {
  try {
    // App Store Server Notifications v2 structure
    const data = notification.data || notification;
    
    // Extract transaction info
    const transactionInfo = data.signedTransactionInfo || data.transactionInfo;
    const renewalInfo = data.signedRenewalInfo || data.renewalInfo;
    
    // Parse JWS payload if needed (simplified - in production use proper JWS library)
    let transactionData: any = {};
    if (typeof transactionInfo === 'string') {
      // In production, decode JWS properly
      try {
        const payload = JSON.parse(Buffer.from(transactionInfo.split('.')[1], 'base64').toString());
        transactionData = payload;
      } catch {
        // Fallback: assume it's already parsed
        transactionData = transactionInfo;
      }
    } else {
      transactionData = transactionInfo;
    }

    // Determine status from notification type
    const notificationType = notification.notificationType || data.notification_type;
    let status = 'active';
    
    switch (notificationType) {
      case 'DID_RENEW':
      case 'SUBSCRIBED':
        status = 'active';
        break;
      case 'DID_FAIL_TO_RENEW':
      case 'EXPIRED':
        status = 'expired';
        break;
      case 'DID_CANCEL':
      case 'REFUND':
        status = 'cancelled';
        break;
      case 'GRACE_PERIOD_EXPIRED':
        status = 'expired';
        break;
      default:
        status = 'active';
    }

    return {
      transactionId: transactionData.transactionId || transactionData.originalTransactionId,
      userId: transactionData.appAccountToken || data.user_id, // App Account Token contains user ID
      status,
      productId: transactionData.productId || renewalInfo?.productId,
      renewalDate: transactionData.expiresDate 
        ? new Date(transactionData.expiresDate) 
        : undefined,
    };
  } catch (error) {
    logError('Failed to parse notification', error instanceof Error ? error : new Error(String(error)));
    return { status: 'unknown' };
  }
}

/**
 * App Store webhook handler
 * Processes App Store Server Notifications and updates subscription status
 */
export async function appStoreWebhook(req: Request, res: Response): Promise<void> {
  try {
    const notification = req.body;
    const signature = req.headers['x-apple-request-signature'] as string;

    // Verify signature
    if (!verifyAppStoreSignature(notification, signature)) {
      logError('Invalid App Store webhook signature', new Error('Signature verification failed'));
      res.status(401).send('Unauthorized');
      return;
    }

    // Parse notification
    const parsed = parseNotification(notification);
    
    if (!parsed.userId || !parsed.transactionId) {
      logError('Missing required fields in notification', new Error('userId or transactionId missing'));
      res.status(400).send('Bad Request');
      return;
    }

    // Determine plan from productId
    let plan = 'free';
    if (parsed.productId) {
      if (parsed.productId.includes('monthly')) {
        plan = 'pro_monthly';
      } else if (parsed.productId.includes('annual')) {
        plan = 'pro_annual';
      } else {
        plan = parsed.productId;
      }
    }

    // Update subscription in database
    await updateSubscription(
      parsed.userId,
      plan,
      parsed.status,
      parsed.renewalDate,
      { productId: parsed.productId, transactionId: parsed.transactionId },
      parsed.transactionId,
      parsed.productId
    );

    logInfo(`App Store webhook processed: ${parsed.status} for user ${parsed.userId}, product ${parsed.productId}`);
    
    // Log telemetry event
    await logTelemetryEvent('subscription_webhook_received', {
      userId: parsed.userId,
      status: parsed.status,
      productId: parsed.productId,
      transactionId: parsed.transactionId,
      notificationType: notification.notificationType || notification.data?.notification_type,
    }).catch(() => {
      // Don't fail if telemetry fails
    });
    
    res.status(200).send('OK');
  } catch (error) {
    logError('App Store webhook error', error instanceof Error ? error : new Error(String(error)));
    res.status(500).send('Internal Server Error');
  }
}

