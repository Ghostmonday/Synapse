# UX Telemetry System

**Standalone product observability layer for autonomous AI-driven UX optimization.**

This is a **completely separate telemetry system** from system/infra telemetry. It is designed for product teams (designers, PMs), AI agents, and behavioral analytics — NOT for engineering debugging.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    UX Telemetry System                      │
│                  (Standalone Product Layer)                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Client SDK (client-sdk.ts)                                 │
│  ├─ Zero dependencies (browser + Node.js)                   │
│  ├─ Session/Trace ID management                             │
│  ├─ PII scrubbing (client-side)                             │
│  ├─ Batching + auto-flush                                   │
│  ├─ Retry with exponential backoff                          │
│  ├─ Sampling rules (critical 100%, configurable)            │
│  └─ Consent management                                      │
│                                                             │
│  Server Ingestion (routes/ux-telemetry-routes.ts)          │
│  ├─ POST /api/ux-telemetry (batch endpoint)                 │
│  ├─ Zod schema validation                                   │
│  ├─ Server-side PII redaction (safety net)                  │
│  └─ Stores in ux_telemetry table                            │
│                                                             │
│  Database (ux_telemetry table)                              │
│  ├─ Separate from system telemetry                          │
│  ├─ Category-indexed for LLM queries                        │
│  ├─ RLS policies for designer/PM access                     │
│  └─ Utility views and functions                             │
│                                                             │
│  LLM Observer (llm-observer/)                               │
│  ├─ watchdog.ts - Pattern detection                         │
│  ├─ strategies/ - JSON strategy templates                   │
│  └─ Future: autonomous UX adjustments                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### 1. Initialize SDK (in main App.vue or entry file)

```typescript
import { initializeUXTelemetry } from '@/composables/useUXTelemetry';

// Initialize once on app startup
initializeUXTelemetry({
  endpoint: '/api/ux-telemetry',
  debug: import.meta.env.DEV,
  consent: true, // User has consented
});
```

### 2. Use in Vue Components

```vue
<script setup lang="ts">
import { useUXTelemetry } from '@/composables/useUXTelemetry';
import { UXEventType, UXEventCategory } from '@/types/ux-telemetry';
import { ButtonState } from '@/types/ui-states';

const { logStateTransition, logClick, logValidationError } = useUXTelemetry();

const buttonState = ref(ButtonState.IDLE);

const handleClick = () => {
  const prevState = buttonState.value;
  buttonState.value = ButtonState.LOADING;
  
  // Log state transition
  logStateTransition(
    prevState,
    ButtonState.LOADING,
    UXEventCategory.UI_STATE,
    { buttonType: 'submit' }
  );
  
  // ... perform action
};
</script>
```

### 3. Browser Usage (Standalone)

```typescript
import { initUXTelemetry } from '@/telemetry/ux/client-sdk';

const sdk = initUXTelemetry({
  endpoint: '/api/ux-telemetry',
});

sdk.logEvent(
  UXEventType.UI_CLICK,
  UXEventCategory.CLICKSTREAM,
  { buttonType: 'submit' },
  { componentId: 'SubmitButton' }
);

// Flush immediately
await sdk.flush();
```

## Event Categories

| Category | Purpose | Example Events |
|----------|---------|----------------|
| `ui_state` | Component state transitions | `ui_state_transition` |
| `clickstream` | User clicks and interactions | `ui_click` |
| `validation` | Form validation errors | `ui_validation_error` |
| `system` | Client-side system events | `api_failure`, `client_crash` |
| `performance` | Performance measurements | `latency_bucket` |
| `voice_av` | Voice/video events | `voice_capture_failed` |
| `messaging` | Message lifecycle events | `message_send_attempted`, `message_send_failed` |
| `engagement` | User engagement | `room_entry`, `room_exit` |
| `emotional` | Emotional/sentiment | `message_sentiment` |
| `presence` | Presence tracking | `presence_ping` |
| `threading` | Thread/conversation | `thread_created` |
| `typing` | Typing indicators | `typing_start`, `typing_stop` |
| `feature_use` | Feature usage | `screen_share_start` |

## Event Types

### Core Events (16)
- `ui_state_transition` - Component state changes
- `ui_click` - Button/element clicks
- `ui_validation_error` - Form validation failures
- `api_failure` - API call failures
- `client_crash` - Client crashes/errors
- `latency_bucket` - Performance measurements
- `voice_capture_failed` - Microphone failures
- `message_send_attempted` - User tries to send message
- `message_send_failed` - Message send failures
- `room_entry` - User enters room
- `room_exit` - User exits room
- `message_sentiment` - Message emotional tone
- `presence_ping` - Active presence signal
- `thread_created` - New thread started
- `typing_start` / `typing_stop` - Typing indicators
- `screen_share_start` - Screen sharing initiated

### Speculative/AI-Driven Events (7)
- `message_rollback` - User deletes before sending
- `message_emotion_diff` - Sentiment change pre/post send
- `conversation_arc_shape` - Thread structure analysis
- `presence_sync_lag` - Presence accuracy lag
- `user_flow_abandonment` - User abandons flow
- `ai_disagreement_signal` - User rejects AI suggestion
- `context_overload` - Too many threads/DMs

## PII Handling

### Client-Side Scrubbing
The SDK automatically scrubs:
- Email addresses
- Phone numbers
- Credit card numbers
- Raw message content
- IP addresses

### Server-Side Redaction (Safety Net)
Additional scrubbing on ingestion:
- Recursive metadata scanning
- Sensitive field removal
- Redaction logging

### What Gets Stored
✅ **Allowed**:
- State names (idle, loading, error)
- Component IDs
- Event counts
- Timestamps
- Metadata (scrubbed)
- Device context (anonymized)

❌ **Never Stored**:
- Raw user messages
- Email addresses
- Phone numbers
- Passwords
- Credit card numbers

## Sampling Rules

| Event Type | Sample Rate | Reason |
|-----------|-------------|---------|
| Critical (errors, crashes, failures) | 100% | Never miss critical issues |
| High-frequency (clicks, typing, presence) | 10% | Reduce volume while maintaining insights |
| Standard | 50% | Balance between data and cost |

Configured in `src/types/ux-telemetry.ts`:

```typescript
export const DEFAULT_SAMPLING_CONFIG: SamplingConfig = {
  criticalEventRate: 1.0,      // 100%
  highFrequencyEventRate: 0.1, // 10%
  standardEventRate: 0.5,      // 50%
  // ...
};
```

## LLM Observer

### Watchdog Pattern Detection

The watchdog queries `ux_telemetry` by category and detects patterns:

```typescript
import { runWatchdog } from '@/llm-observer/watchdog';

// Run analysis
const summary = await runWatchdog();

// summary.recommendations includes:
// - "High message rollback rate detected (35.2%). show_draft_recovery_banner"
// - "High validation error rate detected (22.1%). improve_labels_and_validation"
```

### Strategy Templates

Located in `src/llm-observer/strategies/*.json`:

```json
{
  "pattern": "high message_rollback rate",
  "threshold": 0.3,
  "action": "show_draft_recovery_banner",
  "target": "src/components/DraftManager.vue",
  "priority": "high",
  "autonomyRole": "LLM proposes auto-save or undo button"
}
```

## Querying Telemetry

### By Session (User Journey)
```typescript
import { getEventsBySession } from '@/services/ux-telemetry-service';

const events = await getEventsBySession(sessionId);
// Returns all events for a user session in chronological order
```

### By Category (LLM Observer)
```typescript
import { getEventsByCategory } from '@/services/ux-telemetry-service';
import { UXEventCategory } from '@/types/ux-telemetry';

const events = await getEventsByCategory(
  UXEventCategory.VALIDATION,
  24, // last 24 hours
  1000 // limit
);
```

### Summaries
```typescript
import { getRecentSummary, getCategorySummary } from '@/services/ux-telemetry-service';

// Event counts by type (last 24 hours)
const recent = await getRecentSummary();

// Category rollup (last 7 days)
const categories = await getCategorySummary();
```

## Privacy & Compliance

### User Consent
```typescript
import { uxTelemetry } from '@/telemetry/ux/client-sdk';

// Set consent
uxTelemetry.setConsent(true);
```

### Export User Data (GDPR)
```
GET /api/ux-telemetry/export/:userId
```

### Delete User Data (GDPR)
```
DELETE /api/ux-telemetry/user/:userId
```

## Integration with External Tools (Optional)

### PostHog Forwarding
```typescript
import { forwardToPostHog } from '@/telemetry/ux/forwarders/posthog-shim';

// Auto-forwards UX telemetry to PostHog (if configured)
```

### Grafana Faro Forwarding
```typescript
import { forwardToFaro } from '@/telemetry/ux/forwarders/faro-shim';

// Auto-forwards to Grafana Faro (if configured)
```

## Separation from System Telemetry

| System Telemetry | UX Telemetry |
|------------------|--------------|
| `telemetry` table | `ux_telemetry` table |
| Engineering/debugging | Product/UX/AI observability |
| System errors, infra metrics | User behavior, interactions |
| `src/services/telemetry-service.ts` | `src/telemetry/ux/client-sdk.ts` |
| Backend-focused | Frontend-focused |
| Engineers only | Designers, PMs, AI agents |

## File Structure

```
src/
├── telemetry/
│   └── ux/
│       ├── client-sdk.ts          # Zero-dependency SDK
│       ├── __tests__/             # SDK unit tests
│       │   ├── client-sdk.test.ts
│       │   ├── integration.test.ts
│       │   └── privacy.test.ts
│       ├── forwarders/            # Optional external forwarding
│       │   ├── posthog-shim.ts
│       │   └── faro-shim.ts
│       └── README.md              # This file
├── types/
│   ├── ux-telemetry.ts            # Event types and interfaces
│   ├── ui-states.ts               # Component state enums
│   └── connectors.ts              # Component connector interfaces
├── services/
│   ├── ux-telemetry-service.ts    # DB operations
│   └── ux-telemetry-redaction.ts  # PII redaction
├── routes/
│   └── ux-telemetry-routes.ts     # API endpoints
├── composables/
│   └── useUXTelemetry.ts          # Vue composable
└── llm-observer/
    ├── watchdog.ts                # Pattern detection
    └── strategies/                # JSON strategy templates
        ├── message-rollback-strategy.json
        ├── validation-error-strategy.json
        └── ...
```

## Testing

### Unit Tests
```bash
npm test -- src/telemetry/ux/__tests__/client-sdk.test.ts
```

### Integration Tests
```bash
npm test -- src/telemetry/ux/__tests__/integration.test.ts
```

### Privacy Audit Tests
```bash
npm test -- src/telemetry/ux/__tests__/privacy.test.ts
```

## Development

### Enable Debug Mode
```typescript
initializeUXTelemetry({
  debug: true, // Logs all events to console
});
```

### Manual Flush
```typescript
import { uxTelemetry } from '@/telemetry/ux/client-sdk';

uxTelemetry.flush(); // Send events immediately
```

### Reset Session
```typescript
const { resetSession } = useUXTelemetry();

resetSession(); // Start new session (new sessionId)
```

## Design Principles

1. **Modular** - Self-contained, clear boundaries
2. **Typed** - Full TypeScript types, no `any`
3. **Scrubbable** - PII redaction at multiple layers
4. **Queryable** - Category-based filtering, efficient indexes
5. **Separable** - No dependencies on system telemetry
6. **Deterministic** - Consistent behavior, testable
7. **Passive** - Doesn't impact UX performance
8. **Transparent** - Non-engineers can understand the data

## Future Roadmap

- [ ] LLM-triggered autonomous UX adjustments
- [ ] Real-time dashboards for product teams
- [ ] A/B test integration
- [ ] Cohort analysis
- [ ] Funnel visualization
- [ ] Session replay integration
- [ ] AI-generated UX improvement suggestions

---

**Remember**: Build this system as if you'll never touch it again. It's designed for autonomous AI control.

