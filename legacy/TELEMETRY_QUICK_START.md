# Telemetry Quick Start Guide

## Overview

Sinapse has comprehensive telemetry logging for all events. Events are logged to:
1. **Prometheus** - Real-time metrics (fast, in-memory)
2. **Supabase** - Persistent storage (queryable, historical)

## Quick Usage

### Import Functions

```typescript
import {
  logMessageEdited,
  logBotInvoked,
  logUserJoinedRoom,
  // ... or use the generic function
  logTelemetryEvent,
} from './services/telemetry-service.js';
```

### Basic Example

```typescript
// Log a message edit
await logMessageEdited(messageId, userId, roomId);

// Log bot invocation
await logBotInvoked(botId, userId, roomId, {
  prompt: 'user prompt',
  model: 'gpt-4',
});

// Generic event logging
await logTelemetryEvent('custom_event', {
  userId: 'user-123',
  roomId: 'room-456',
  metadata: { custom_field: 'value' },
});
```

## All Available Functions

### Messaging
- `logMessageEdited(messageId, userId, roomId, metadata?)`
- `logMessageDeleted(messageId, userId, roomId, reason?)`
- `logMessageFlagged(messageId, userId, roomId, flags)`
- `logMessagePinned(messageId, userId, roomId, pinned)`
- `logMessageReacted(messageId, userId, roomId, emoji, action)`

### Presence
- `logUserJoinedRoom(userId, roomId, metadata?)`
- `logUserLeftRoom(userId, roomId, reason?)`
- `logUserIdle(userId, roomId)`
- `logUserBack(userId, roomId)`
- `logVoiceSessionStart(userId, roomId, sessionId)`
- `logVoiceSessionEnd(userId, roomId, sessionId, durationMs?)`

### Bots
- `logBotInvoked(botId, userId, roomId, metadata?)`
- `logBotResponse(botId, userId, roomId, responseTimeMs, metadata?)`
- `logBotFailure(botId, userId, roomId, error, metadata?)`
- `logBotTimeout(botId, userId, roomId, timeoutMs)`
- `logBotFlagged(botId, userId, roomId, reason)`

### Moderation
- `logModActionTaken(moderatorId, targetUserId, roomId, action, reason?)`
- `logModAppealSubmitted(userId, roomId, appealReason)`
- `logModEscalated(moderatorId, targetUserId, roomId, escalationReason)`
- `logPolicyChange(userId, policyType, oldValue, newValue)`

### Threads
- `logThreadCreated(threadId, userId, roomId, parentMessageId)`
- `logThreadClosed(threadId, userId, roomId, messageCount)`
- `logReactionSummaryUpdated(messageId, userId, roomId, reactionCount)`

### Connectivity
- `logClientConnected(userId, deviceType?, metadata?)`
- `logClientDisconnected(userId, reason?, metadata?)`
- `logReconnectAttempt(userId, attemptNumber, success)`
- `logMobileForeground(userId)`
- `logMobileBackground(userId)`

### AI Operations
- `logAISuggestionApplied(userId, suggestionId, suggestionType)`
- `logAISuggestionRejected(userId, suggestionId, suggestionType, reason?)`
- `logAIPolicyOverride(userId, policyType, overrideReason)`
- `logAIFlag(userId, roomId, flagType, severity, details)`

### Batch Logging
- `logTelemetryBatch(events[])` - Log multiple events efficiently

## Automatic Logging (Database Triggers)

Some events are automatically logged via SQL triggers (after running `sql/12_telemetry_triggers.sql`):

✅ **Automatic**:
- `msg_edited` - When `is_edited` changes
- `msg_flagged` - When `is_flagged` changes  
- `msg_reacted` - When `reactions` JSONB changes
- `user_joined_room` - On `presence_logs` INSERT
- `user_left_room` - On `presence_logs` UPDATE (status change)
- `user_idle` / `user_back` - On status changes
- `thread_created` - On `threads` INSERT
- `thread_closed` - When `is_archived` changes

❌ **Manual** (call from code):
- All other events listed above

## Integration Examples

### In Message Routes

```typescript
import { logMessageDeleted } from '../services/telemetry-service.js';

router.delete('/messages/:id', async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;
  
  // Delete message
  await deleteMessage(id);
  
  // Log deletion
  await logMessageDeleted(id, userId, roomId, 'user_request');
  
  res.json({ success: true });
});
```

### In Bot Service

```typescript
import { logBotInvoked, logBotResponse, logBotFailure } from './telemetry-service.js';

async function invokeBot(botId: string, prompt: string, userId: string, roomId: string) {
  const startTime = Date.now();
  
  await logBotInvoked(botId, userId, roomId, { prompt });
  
  try {
    const response = await callBotAPI(botId, prompt);
    const responseTime = Date.now() - startTime;
    
    await logBotResponse(botId, userId, roomId, responseTime);
    return response;
  } catch (error: any) {
    await logBotFailure(botId, userId, roomId, error.message);
    throw error;
  }
}
```

### In WebSocket Gateway

```typescript
import { logClientConnected, logClientDisconnected } from '../services/telemetry-service.js';

wss.on('connection', (ws, req) => {
  const userId = getUserIdFromRequest(req);
  const deviceType = req.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'web';
  
  logClientConnected(userId, deviceType, {
    ip: req.socket.remoteAddress,
  });
  
  ws.on('close', () => {
    logClientDisconnected(userId, 'normal_close');
  });
});
```

## Querying Telemetry

### Recent Events
```sql
SELECT * FROM telemetry
WHERE event = 'msg_reacted'
ORDER BY event_time DESC
LIMIT 100;
```

### User Activity
```sql
SELECT event, COUNT(*) as count
FROM telemetry
WHERE user_id = 'user-uuid'
GROUP BY event
ORDER BY count DESC;
```

### Bot Failures (Last 24h)
```sql
SELECT 
  features->>'bot_id' as bot_id,
  COUNT(*) as failures
FROM telemetry
WHERE event = 'bot_failure'
  AND event_time > NOW() - INTERVAL '24 hours'
GROUP BY features->>'bot_id';
```

## Next Steps

1. ✅ Run `sql/12_telemetry_triggers.sql` for automatic logging
2. ✅ Import telemetry functions in your routes/services
3. ✅ Add logging calls at key points
4. ✅ Query via `ai_telemetry_insights` view for AI analysis

See `docs/TELEMETRY_EVENTS.md` for complete reference.

