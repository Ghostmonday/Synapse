/**
 * Apple IAP Verification Service
 * Verifies Apple App Store receipts and updates subscriptions
 */

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

