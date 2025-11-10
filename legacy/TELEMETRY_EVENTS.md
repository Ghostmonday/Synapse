# Telemetry Events Reference

Complete reference for all telemetry events tracked in Sinapse.

## Event Categories

### 🎙 Messaging Events

| Event | Description | Parameters |
|-------|-------------|------------|
| `msg_edited` | Message was edited | `message_id`, `content_length` |
| `msg_deleted` | Message was deleted | `message_id`, `reason` |
| `msg_flagged` | Message was flagged for moderation | `message_id`, `flags`, `toxicity_score` |
| `msg_pinned` | Message was pinned/unpinned | `message_id`, `pinned` (boolean) |
| `msg_reacted` | Reaction added/removed | `message_id`, `emoji`, `action` (add/remove) |

### 🧑 Presence & Sessions

| Event | Description | Parameters |
|-------|-------------|------------|
| `user_joined_room` | User joined a room | `status`, `presence_log_id` |
| `user_left_room` | User left a room | `previous_status`, `new_status` |
| `user_idle` | User went idle | `presence_log_id` |
| `user_back` | User returned from idle | `presence_log_id` |
| `voice_session_start` | LiveKit voice session started | `session_id` |
| `voice_session_end` | LiveKit voice session ended | `session_id`, `duration_ms` |

### 🤖 Bot Activity

| Event | Description | Parameters |
|-------|-------------|------------|
| `bot_invoked` | Bot/LLM invocation started | `bot_id`, additional metadata |
| `bot_response` | Bot response delivered | `bot_id`, `response_time_ms` |
| `bot_failure` | Bot API or logic error | `bot_id`, `error` |
| `bot_timeout` | Bot request timed out | `bot_id`, `timeout_ms` |
| `bot_flagged` | Bot flagged by user or LLM | `bot_id`, `reason` |

### 🛠️ Moderation & Admin

| Event | Description | Parameters |
|-------|-------------|------------|
| `mod_action_taken` | Moderation action executed | `target_user_id`, `action`, `reason` |
| `mod_appeal_submitted` | User submitted appeal | `appeal_reason` |
| `mod_escalated` | Moderation escalated to admin/LLM | `target_user_id`, `escalation_reason` |
| `policy_change` | Moderation policy changed | `policy_type`, `old_value`, `new_value` |

### 💬 Thread & Reaction

| Event | Description | Parameters |
|-------|-------------|------------|
| `thread_created` | New thread created | `thread_id`, `parent_message_id`, `title` |
| `thread_closed` | Thread archived/deactivated | `thread_id`, `message_count` |
| `reaction_summary_updated` | Bulk reaction change | `message_id`, `reaction_count` |

### 📡 Connectivity & Device

| Event | Description | Parameters |
|-------|-------------|------------|
| `client_connected` | WebSocket client connected | `device_type`, additional metadata |
| `client_disconnected` | WebSocket client disconnected | `reason` |
| `reconnect_attempt` | Client reconnect attempt | `attempt_number`, `success` |
| `mobile_foreground` | Mobile app moved to foreground | `app_state: 'foreground'` |
| `mobile_background` | Mobile app moved to background | `app_state: 'background'` |

### 🧩 AI & LLM Ops

| Event | Description | Parameters |
|-------|-------------|------------|
| `ai_suggestion_applied` | User accepted AI suggestion | `suggestion_id`, `suggestion_type` |
| `ai_suggestion_rejected` | User rejected AI suggestion | `suggestion_id`, `suggestion_type`, `reason` |
| `ai_policy_override` | LLM bypassed human rule | `policy_type`, `override_reason` |
| `ai_flag` | LLM raised internal risk flag | `flag_type`, `severity`, additional details |

## Usage Examples

### TypeScript/JavaScript

```typescript
import {
  logMessageEdited,
  logBotInvoked,
  logUserJoinedRoom,
  logTelemetryBatch,
} from './services/telemetry-service.js';

// Single event
await logMessageEdited(messageId, userId, roomId, {
  content_length: 150,
});

// Bot event
await logBotInvoked(botId, userId, roomId, {
  prompt: 'user prompt here',
  model: 'gpt-4',
});

// Presence event
await logUserJoinedRoom(userId, roomId);

// Batch logging (more efficient)
await logTelemetryBatch([
  {
    eventType: 'msg_reacted',
    userId,
    roomId,
    metadata: { message_id: msgId, emoji: '👍' },
  },
  {
    eventType: 'user_idle',
    userId,
    roomId,
  },
]);
```

### SQL (via triggers)

Some events are automatically logged via database triggers:
- `msg_edited` - Triggered when `is_edited` changes
- `msg_flagged` - Triggered when `is_flagged` changes
- `msg_reacted` - Triggered when `reactions` JSONB changes
- `user_joined_room` - Triggered on `presence_logs` INSERT
- `user_left_room` - Triggered on `presence_logs` UPDATE
- `user_idle` / `user_back` - Triggered on status changes
- `thread_created` - Triggered on `threads` INSERT
- `thread_closed` - Triggered when `is_archived` changes

## Automatic vs Manual Logging

### Automatic (Database Triggers)
- Message edits, flags, reactions
- Presence changes
- Thread creation/closing

### Manual (Application Code)
- Message deletion (soft delete)
- Message pinning
- Bot events (invoked, response, failure)
- Moderation actions
- Connectivity events
- AI operations

## Querying Telemetry

### Recent events by type
```sql
SELECT * FROM telemetry
WHERE event = 'msg_reacted'
ORDER BY event_time DESC
LIMIT 100;
```

### User activity summary
```sql
SELECT 
  event,
  COUNT(*) as count,
  MIN(event_time) as first,
  MAX(event_time) as last
FROM telemetry
WHERE user_id = 'user-uuid-here'
GROUP BY event
ORDER BY count DESC;
```

### Bot failure analysis
```sql
SELECT 
  features->>'bot_id' as bot_id,
  COUNT(*) as failure_count,
  MAX(event_time) as last_failure
FROM telemetry
WHERE event = 'bot_failure'
  AND event_time > NOW() - INTERVAL '24 hours'
GROUP BY features->>'bot_id'
ORDER BY failure_count DESC;
```

## Integration Points

### In Routes
```typescript
import { logMessageDeleted } from '../services/telemetry-service.js';

router.delete('/messages/:id', async (req, res) => {
  // ... delete logic ...
  await logMessageDeleted(messageId, userId, roomId, 'user_request');
});
```

### In Services
```typescript
import { logBotInvoked, logBotResponse, logBotFailure } from './telemetry-service.js';

async function invokeBot(botId, prompt) {
  const startTime = Date.now();
  await logBotInvoked(botId, userId, roomId);
  
  try {
    const response = await callBotAPI(botId, prompt);
    await logBotResponse(botId, userId, roomId, Date.now() - startTime);
    return response;
  } catch (error) {
    await logBotFailure(botId, userId, roomId, error.message);
    throw error;
  }
}
```

### In WebSocket Handlers
```typescript
import { logClientConnected, logClientDisconnected } from '../services/telemetry-service.js';

wss.on('connection', (ws, req) => {
  const userId = getUserIdFromRequest(req);
  logClientConnected(userId, 'web', { ip: req.socket.remoteAddress });
  
  ws.on('close', () => {
    logClientDisconnected(userId, 'normal_close');
  });
});
```

## Performance Considerations

1. **Batch Logging**: Use `logTelemetryBatch()` for multiple events
2. **Async**: All logging functions are async but don't block
3. **Error Handling**: Failures are logged but don't throw
4. **Indexes**: Telemetry table is indexed for fast queries

## Next Steps

1. Run `sql/12_telemetry_triggers.sql` to enable automatic logging
2. Integrate manual logging in your routes/services
3. Query telemetry via AI views (`ai_telemetry_insights`)
4. Set up alerts based on event patterns

