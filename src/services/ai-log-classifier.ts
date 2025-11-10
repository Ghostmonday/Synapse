/**
 * AI Log Classifier
 * Routes logs to three distinct buckets with strict safety constraints
 * 
 * Buckets:
 * 1. USER_VOICE - Raw conversation data (transcripts, user input)
 * 2. USER_CONTROL - Moderation actions (bans, mutes, profile changes)
 * 3. SYSTEM_OPS - System metrics (CPU, Redis, DB)
 */

export enum LogBucket {
  USER_VOICE = 'user_voice',
  USER_CONTROL = 'user_control',
  SYSTEM_OPS = 'system_ops',
  UNKNOWN = 'unknown'
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  metadata?: Record<string, any>;
  userId?: string;
  roomId?: string;
  eventType?: string;
  source?: string;
}

/**
 * Classify log entry into appropriate bucket using regex and rule engine
 * Routes BEFORE AI processing to ensure proper constraints
 */
export function classifyLog(entry: LogEntry): LogBucket {
  const { message, metadata, eventType, source } = entry;
  const messageLower = message.toLowerCase();
  const metadataStr = JSON.stringify(metadata || {}).toLowerCase();

  // USER_VOICE: Conversation data patterns
  const userVoicePatterns = [
    /transcript/i,
    /user.*message/i,
    /chat.*content/i,
    /message.*content/i,
    /user.*input/i,
    /voice.*transcript/i,
    /audio.*transcript/i,
    /conversation/i,
    /user.*said/i,
    /user.*typed/i,
    /reaction/i,
    /emoji/i,
    /tone/i,
    /sentiment/i,
    /intent/i,
    /message_id/i,
    /sender_id/i,
    /room.*message/i
  ];

  // USER_CONTROL: Moderation and control actions
  const userControlPatterns = [
    /moderation/i,
    /ban/i,
    /mute/i,
    /warn/i,
    /violation/i,
    /profile.*update/i,
    /user.*ban/i,
    /user.*mute/i,
    /user.*warn/i,
    /moderation.*flag/i,
    /content.*moderated/i,
    /user.*control/i,
    /action.*taken/i,
    /muted_until/i,
    /violation.*count/i,
    /moderation_queue/i,
    /message_violations/i,
    /user_mutes/i
  ];

  // SYSTEM_OPS: System metrics and operations
  const systemOpsPatterns = [
    /prometheus/i,
    /cpu.*usage/i,
    /memory.*usage/i,
    /redis/i,
    /database/i,
    /db.*lock/i,
    /connection.*pool/i,
    /latency/i,
    /throughput/i,
    /metric/i,
    /telemetry/i,
    /system.*health/i,
    /container.*cpu/i,
    /container.*memory/i,
    /http.*request.*duration/i,
    /redis_memory/i,
    /db.*connection/i,
    /system.*ops/i,
    /healing.*loop/i,
    /autonomy/i
  ];

  // Check eventType first (most reliable)
  if (eventType) {
    const eventLower = eventType.toLowerCase();
    if (userVoicePatterns.some(p => p.test(eventLower))) {
      return LogBucket.USER_VOICE;
    }
    if (userControlPatterns.some(p => p.test(eventLower))) {
      return LogBucket.USER_CONTROL;
    }
    if (systemOpsPatterns.some(p => p.test(eventLower))) {
      return LogBucket.SYSTEM_OPS;
    }
  }

  // Check message content
  if (userVoicePatterns.some(p => p.test(messageLower))) {
    return LogBucket.USER_VOICE;
  }
  if (userControlPatterns.some(p => p.test(messageLower))) {
    return LogBucket.USER_CONTROL;
  }
  if (systemOpsPatterns.some(p => p.test(messageLower))) {
    return LogBucket.SYSTEM_OPS;
  }

  // Check metadata
  if (userVoicePatterns.some(p => p.test(metadataStr))) {
    return LogBucket.USER_VOICE;
  }
  if (userControlPatterns.some(p => p.test(metadataStr))) {
    return LogBucket.USER_CONTROL;
  }
  if (systemOpsPatterns.some(p => p.test(metadataStr))) {
    return LogBucket.SYSTEM_OPS;
  }

  // Check source
  if (source) {
    const sourceLower = source.toLowerCase();
    if (sourceLower.includes('message') || sourceLower.includes('chat') || sourceLower.includes('voice')) {
      return LogBucket.USER_VOICE;
    }
    if (sourceLower.includes('moderation') || sourceLower.includes('control')) {
      return LogBucket.USER_CONTROL;
    }
    if (sourceLower.includes('telemetry') || sourceLower.includes('metrics') || sourceLower.includes('prometheus')) {
      return LogBucket.SYSTEM_OPS;
    }
  }

  // Default fallback based on common patterns
  if (metadata?.userId && !metadata?.system) {
    // If it has userId but isn't explicitly system, likely user-related
    if (metadata?.action || metadata?.violation) {
      return LogBucket.USER_CONTROL;
    }
    return LogBucket.USER_VOICE;
  }

  return LogBucket.UNKNOWN;
}

/**
 * Validate that log entry matches its bucket
 * Safety check to prevent misclassification
 */
export function validateClassification(entry: LogEntry, bucket: LogBucket): boolean {
  const classified = classifyLog(entry);
  return classified === bucket || classified === LogBucket.UNKNOWN;
}

