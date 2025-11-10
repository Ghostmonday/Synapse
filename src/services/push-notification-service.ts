/**
 * Push Notification Service
 * Handles APNs (iOS) and FCM (Android) push notifications
 */

import apn from 'apn';
import { supabase } from '../config/db.js';
import { logError, logInfo } from '../shared/logger.js';
import { getApiKey } from './api-keys-service.js';

// Initialize APNs provider
let apnProvider: apn.Provider | null = null;
let apnProviderPromise: Promise<apn.Provider | null> | null = null;

async function getAPNProvider(): Promise<apn.Provider | null> {
  // Return cached provider if available
  if (apnProvider) {
    return apnProvider;
  }

  // If initialization is in progress, wait for it
  if (apnProviderPromise) {
    return await apnProviderPromise;
  }

  // Start initialization
  apnProviderPromise = initializeAPNProvider();
  const provider = await apnProviderPromise;
  apnProviderPromise = null; // Clear promise after completion
  
  return provider;
}

async function initializeAPNProvider(): Promise<apn.Provider | null> {
  try {
    // Retrieve APN keys from vault
    const [apnKey, apnKeyId, apnTeamId, apnBundleId] = await Promise.all([
      getApiKey('APN_KEY').catch(() => process.env.APN_KEY || null),
      getApiKey('APN_KEY_ID').catch(() => process.env.APN_KEY_ID || null),
      getApiKey('APN_TEAM_ID').catch(() => process.env.APN_TEAM_ID || null),
      getApiKey('APN_BUNDLE_ID').catch(() => process.env.APN_BUNDLE_ID || 'com.sinapse.app')
    ]);

    if (!apnKey || !apnKeyId || !apnTeamId) {
      logError('APNs configuration missing', new Error('APNs not configured - missing required keys'));
      return null;
    }

    // APN key can be either:
    // 1. File path to .p8 file (if starts with / or ./)
    // 2. Key content as string (if contains BEGIN PRIVATE KEY)
    // 3. Base64 encoded key content
    
    let keyContent: string | Buffer = apnKey;
    
    // If it's a file path, read the file
    if (apnKey.startsWith('/') || apnKey.startsWith('./') || apnKey.endsWith('.p8')) {
      try {
        const fs = await import('fs/promises');
        keyContent = await fs.readFile(apnKey, 'utf8');
      } catch (fileError: any) {
        logError('Failed to read APN key file', fileError);
        // Fallback: try using the string as-is (might be key content)
      }
    } else if (!apnKey.includes('BEGIN PRIVATE KEY') && !apnKey.includes('BEGIN RSA PRIVATE KEY')) {
      // Might be base64 encoded, try decoding
      try {
        keyContent = Buffer.from(apnKey, 'base64').toString('utf8');
      } catch {
        // Not base64, use as-is
        keyContent = apnKey;
      }
    }

    apnProvider = new apn.Provider({
      token: {
        key: keyContent,
        keyId: apnKeyId,
        teamId: apnTeamId
      },
      production: process.env.NODE_ENV === 'production'
    });

    logInfo('APNs provider initialized successfully');
    return apnProvider;
  } catch (error: any) {
    logError('Failed to initialize APNs provider', error);
    return null;
  }
}

/**
 * Register device token for push notifications
 */
export async function registerDeviceToken(
  userId: string,
  deviceToken: string,
  platform: 'ios' | 'android',
  deviceId?: string
) {
  try {
    await supabase.from('device_tokens').upsert({
      user_id: userId,
      device_token: deviceToken,
      platform,
      device_id: deviceId,
      last_used_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,device_token'
    });

    logInfo(`Device token registered for user ${userId}, platform ${platform}`);
  } catch (error: any) {
    logError('Failed to register device token', error);
    throw error;
  }
}

/**
 * Send push notification to user
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, any>
) {
  try {
    // Get user's device tokens
    const { data: tokens } = await supabase
      .from('device_tokens')
      .select('device_token, platform')
      .eq('user_id', userId);

    if (!tokens || tokens.length === 0) {
      logInfo(`No device tokens found for user ${userId}`);
      return;
    }

    // Send to iOS devices
    const iosTokens = tokens.filter(t => t.platform === 'ios').map(t => t.device_token);
    if (iosTokens.length > 0) {
      await sendAPNNotification(iosTokens, title, body, data);
    }

    // TODO: Send to Android devices via FCM
    // const androidTokens = tokens.filter(t => t.platform === 'android').map(t => t.device_token);
    // if (androidTokens.length > 0) {
    //   await sendFCMNotification(androidTokens, title, body, data);
    // }

    logInfo(`Push notification sent to user ${userId}`);
  } catch (error: any) {
    logError('Failed to send push notification', error);
    throw error;
  }
}

/**
 * Send APNs notification
 */
async function sendAPNNotification(
  deviceTokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>
) {
  const provider = await getAPNProvider();
  if (!provider) {
    logError('APNs provider not available', new Error('Cannot send notification'));
    return;
  }

  // Get bundle ID from vault or env
  const bundleId = await getApiKey('APN_BUNDLE_ID').catch(() => process.env.APN_BUNDLE_ID || 'com.sinapse.app');
  
  const notification = new apn.Notification();
  notification.alert = { title, body };
  notification.topic = bundleId;
  notification.payload = data || {};
  notification.sound = 'default';
  notification.badge = 1;

  const result = await provider.send(notification, deviceTokens);

  if (result.failed && result.failed.length > 0) {
    logError('APNs send failures', new Error(JSON.stringify(result.failed)));
  }

  logInfo(`APNs notification sent to ${result.sent.length} devices`);
}

/**
 * Send push notification for new message
 */
export async function notifyNewMessage(
  userId: string,
  roomName: string,
  senderName: string,
  messagePreview: string
) {
  await sendPushNotification(
    userId,
    `${senderName} in ${roomName}`,
    messagePreview.substring(0, 100),
    {
      type: 'new_message',
      room_name: roomName
    }
  );
}

