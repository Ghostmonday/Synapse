# AI Log Classification System

## Overview

Three-bucket classification system for routing logs to AI handlers with strict safety constraints. Each bucket has distinct input/output rules to prevent command injection and ensure proper data handling.

## Architecture

### 1. Log Classifier (`ai-log-classifier.ts`)
Routes logs to appropriate buckets using regex patterns and rule engine:
- **USER_VOICE**: Conversation data (transcripts, user input)
- **USER_CONTROL**: Moderation actions (bans, mutes, profile changes)
- **SYSTEM_OPS**: System metrics (CPU, Redis, DB)

### 2. Three Handlers

#### User Voice Handler (`user-voice-handler.ts`)
- **Input**: Raw transcripts with stutters, emojis, tone shifts preserved
- **Output**: Analysis only (intent, sarcasm, toxicity scores, sentiment, summary)
- **Constraints**: NO shell commands, NO actions, pure analysis

#### User Control Handler (`user-control-handler.ts`)
- **Input**: Moderation data (content, violation counts, context)
- **Output**: Locked JSON format: `{user_id, action, reason, duration_minutes?, severity?}`
- **Constraints**: NO shell commands, NO scripts, structured moderation actions only

#### System Ops Handler (`system-ops-handler.ts`)
- **Input**: Prometheus JSON metrics: `{timestamp, metric_name, value}`
- **Output**: Remediation phrases only (e.g., "resize cache", "scale compute")
- **Constraints**: NO commands, NO scripts, phrases only - escalates to human operator

### 3. Router (`ai-log-router.ts`)
Main orchestration layer that:
1. Classifies log entry
2. Validates classification
3. Routes to appropriate handler
4. Returns structured result

## Usage

### API Endpoints

#### Route Single Log
```bash
POST /api/ai-logs/route
{
  "message": "User message content",
  "level": "info",
  "metadata": {
    "userId": "123",
    "roomId": "456"
  }
}
```

#### Route Batch Logs
```bash
POST /api/ai-logs/route-batch
{
  "entries": [
    {
      "message": "User transcript...",
      "level": "info",
      "metadata": {...}
    }
  ]
}
```

### Programmatic Usage

```typescript
import { routeLog } from './services/ai-log-router.js';
import { LogEntry } from './services/ai-log-classifier.js';

const entry: LogEntry = {
  timestamp: new Date().toISOString(),
  level: 'info',
  message: 'User transcript with emojis 🎉',
  userId: '123',
  roomId: '456',
  eventType: 'user_message'
};

const result = await routeLog(entry);
// result.bucket = LogBucket.USER_VOICE
// result.result = UserVoiceAnalysis
```

## Safety Features

1. **Pre-classification**: Logs are classified BEFORE AI processing
2. **Output validation**: All handlers validate output for forbidden patterns
3. **Zod schemas**: User Control handler uses Zod for strict JSON validation
4. **Command detection**: Regex patterns detect and block shell commands
5. **Escalation**: System Ops handler escalates critical issues to humans

## Integration Points

- **Winston Logger**: Can hook into Winston via `createAIRoutingTransport()`
- **Moderation Service**: Can use User Control handler for moderation decisions
- **Telemetry**: System Ops handler processes Prometheus metrics
- **Message Processing**: User Voice handler analyzes conversation data

## Security Constraints

### Forbidden Patterns (detected and blocked):
- `sudo`
- `rm -rf`
- `exec`, `eval`
- `system(`
- Shell commands
- Script execution
- User control actions in User Voice handler

### Output Format Locking:
- **User Voice**: Analysis objects only
- **User Control**: Strict JSON schema enforced
- **System Ops**: Remediation phrases only (no executable code)

## Example Outputs

### User Voice Handler
```json
{
  "intent": "User wants to know about pricing",
  "sarcasm": false,
  "toxicity": {
    "score": 0.1,
    "isToxic": false,
    "flags": []
  },
  "sentiment": "neutral",
  "summary": "Inquiry about service pricing",
  "tone": "polite"
}
```

### User Control Handler
```json
{
  "user_id": "123",
  "action": "mute",
  "reason": "spam detected",
  "duration_minutes": 60,
  "severity": "medium"
}
```

### System Ops Handler
```json
{
  "status": "warning",
  "issues": ["redis_memory_used > 90%"],
  "remediations": ["REMEDIATION: resize cache"],
  "escalation_required": false
}
```

