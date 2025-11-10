/**
 * Push Notification Service
 * Handles APNs (iOS) and FCM (Android) push notifications
 */

import apn from 'apn';
import { supabase } from '../config/db.js';
import { logError, logInfo } from '../shared/logger.js';

// Initialize APNs provider
let apnProvider: apn.Provider | null = null;

function getAPNProvider(): apn.Provider | null {
  if (apnProvider) {
    return apnProvider;
  }

  const apnKey = process.env.APN_KEY;
  const apnKeyId = process.env.APN_KEY_ID;
  const apnTeamId = process.env.APN_TEAM_ID;
  const apnBundleId = process.env.APN_BUNDLE_ID;

  if (!apnKey || !apnKeyId || !apnTeamId || !apnBundleId) {
    logError('APNs configuration missing', new Error('APNs not configured'));
    return null;
  }

  try {
    apnProvider = new apn.Provider({
      token: {
        key: apnKey,
        keyId: apnKeyId,
        teamId: apnTeamId
      },
      production: process.env.NODE_ENV === 'production'
    });

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
  const provider = getAPNProvider();
  if (!provider) {
    return;
  }

  const notification = new apn.Notification();
  notification.alert = { title, body };
  notification.topic = process.env.APN_BUNDLE_ID || 'com.sinapse.app';
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

