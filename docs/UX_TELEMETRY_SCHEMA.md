# UX Telemetry Schema - Complete Event Reference

## Overview

This document provides a complete reference for all UX telemetry event types, including the 23 new Phase 2-3 event types added for AI tuning, emotional tracking, journey analytics, performance linking, and behavior modeling.

## Event Categories

### New Categories (Phase 2-3)

- `ai_feedback` - AI suggestion acceptance/rejection, auto-fixes, help requests
- `cognitive_state` - Sentiment, emotion curves, validation irritation
- `journey_analytics` - Funnel checkpoints, dropoffs, sequence paths, state loops
- `behavior_modeling` - User action bursts, session patterns, retry behavior

## Event Types

### AI Feedback & Trust Signals

#### `ai_suggestion_accepted`
**Category**: `ai_feedback`  
**Trigger**: User applies an LLM-generated suggestion  
**Metadata**:
- `suggestionId` (string): Unique ID of the suggestion
- `acceptanceMethod` ('click' | 'copy' | 'keyboard'): How the user accepted it
**Integration**: Hook in AI suggestion components `onAccept` handler

#### `ai_suggestion_rejected`
**Category**: `ai_feedback`  
**Trigger**: User dismisses or ignores an LLM suggestion  
**Metadata**:
- `suggestionId` (string): Unique ID of the suggestion
- `rejectionReason` (string, optional): User feedback or timeout
**Integration**: Hook in AI suggestion components `onReject` handler or timeout detection

#### `ai_auto_fix_applied`
**Category**: `ai_feedback`  
**Trigger**: User accepts an agent auto-fix  
**Metadata**:
- `fixType` (string): Type of fix applied (e.g., 'code_format', 'bug_fix')
- `outcome` ('success' | 'fail'): Whether the fix worked
**Integration**: Agent handler `onApply` callback

#### `ai_edit_undone`
**Category**: `ai_feedback`  
**Trigger**: User undoes an LLM-driven change  
**Metadata**:
- `undoLatency` (number): Time in ms from change to undo
**Integration**: Undo action watcher post-AI edit

#### `ai_help_requested`
**Category**: `ai_feedback`  
**Trigger**: User invokes AI support (e.g., help button)  
**Metadata**:
- `contextQuery` (string): Scrubbed user input/context
**Integration**: Help button `onClick` handler

#### `agent_handoff_failed`
**Category**: `ai_feedback`  
**Trigger**: User aborts agent takeover  
**Metadata**:
- `failureStage` ('init' | 'partial' | 'complete'): Stage of failure
**Integration**: Agent session `onAbort` callback

---

### Emotional & Cognitive State Signals

#### `message_sentiment_before`
**Category**: `cognitive_state`  
**Trigger**: On message composition start  
**Metadata**:
- `sentimentScore` (number): -1 to 1, placeholder or lightweight NLP
**Integration**: Input watcher on focus/start

#### `message_sentiment_after`
**Category**: `cognitive_state`  
**Trigger**: On message send  
**Metadata**:
- `sentimentScore` (number): -1 to 1
**Integration**: Input watcher on submit

#### `session_emotion_curve`
**Category**: `cognitive_state`  
**Trigger**: Per-session aggregate of sentiment shifts  
**Metadata**:
- `emotionCurve` (Array<{timestamp: string, score: number}>): Sentiment over time
**Integration**: Batch on session end or periodic intervals

#### `message_emotion_contradiction`
**Category**: `cognitive_state`  
**Trigger**: Detected tone vs. intent mismatch  
**Metadata**:
- `detectedTone` (string): e.g., 'positive', 'negative'
- `inferredIntent` (string): e.g., 'complaint', 'praise'
**Integration**: Validation hook with tone analyzer

#### `validation_react_irritation_score`
**Category**: `cognitive_state`  
**Trigger**: Repeated validation errors (3+ errors)  
**Metadata**:
- `errorCount` (number): Number of errors in sequence
- `retryInterval` (number): Average time between retries in ms
**Integration**: Form error loop detector

---

### Sequence & Journey Analytics

#### `event_sequence_path`
**Category**: `journey_analytics`  
**Trigger**: Periodically logged (every 20 events)  
**Metadata**:
- `sequencePath` (Array<{eventType: string, timestamp: number}>): Last 20 events
**Integration**: Auto-tracked by SDK, logged periodically

#### `funnel_checkpoint_hit`
**Category**: `journey_analytics`  
**Trigger**: Key journey milestones (e.g., form start/submit)  
**Metadata**:
- `checkpointId` (string): Identifier for the checkpoint
**Integration**: Define funnels in config, hook on key state changes

#### `dropoff_point_detected`
**Category**: `journey_analytics`  
**Trigger**: Session end without completion  
**Metadata**:
- `lastEvent` (string): Last event type before dropoff
- `sessionDuration` (number): Session length in ms
**Integration**: `onbeforeunload` or session timeout

#### `repeated_state_loop_detected`
**Category**: `journey_analytics`  
**Trigger**: Cycle in state transitions (same transition 3+ times in 30s)  
**Metadata**:
- `loopCount` (number): Number of repetitions
- `statesInLoop` (string[]): Unique states in loop
- `pattern` (string): e.g., 'hover->click->back'
**Integration**: Auto-detected by SDK state tracking

---

### Performance-to-UX Linking

#### `load_time_perceived_vs_actual`
**Category**: `performance`  
**Trigger**: On component mount/complete  
**Metadata**:
- `perceivedMs` (number): User interaction start to perceived complete
- `actualMs` (number): System measurement (Performance API)
- `delta` (number): Absolute difference
**Integration**: Performance API + UX hook (interaction start timestamp)

#### `interaction_latency_ms`
**Category**: `performance`  
**Trigger**: Input to response  
**Metadata**:
- `markId` (string): Performance mark identifier
- `duration` (number): Latency in ms
**Integration**: `markPerformanceStart()` / `markPerformanceEnd()` calls

#### `stuttered_input`
**Category**: `performance`  
**Trigger**: Retries before response  
**Metadata**:
- `retryCount` (number): Number of retries
**Integration**: Input debounce detector

#### `long_state_without_progress`
**Category**: `performance`  
**Trigger**: Loading state > 10s threshold  
**Metadata**:
- `stateDuration` (number): Duration in ms
- `state` (string): State name (e.g., 'loading')
**Integration**: State timer watching loading states

---

### User Archetype / Behavior Modeling

#### `user_action_burst`
**Category**: `behavior_modeling`  
**Trigger**: Rapid interactions (>5 in 10s)  
**Metadata**:
- `burstCount` (number): Number of actions in burst
- `duration` (number): Burst window in ms
**Integration**: Auto-detected by SDK, tracks action frequency

#### `session_idle_then_retry`
**Category**: `behavior_modeling`  
**Trigger**: Idle > threshold then action  
**Metadata**:
- `idleDuration` (number): Idle time in ms
**Integration**: Auto-detected by SDK idle timer

#### `first_session_stall_point`
**Category**: `behavior_modeling`  
**Trigger**: New user dropoff  
**Metadata**:
- `stallEvent` (string): Event type where user stalled
- `isFirstSession` (boolean): Always true for this event
**Integration**: Flag first session, detect early exit

#### `retry_after_error_interval`
**Category**: `behavior_modeling`  
**Trigger**: Post-error reattempt  
**Metadata**:
- `intervalMs` (number): Time from error to retry
- `errorType` (string): Type of error encountered
**Integration**: Error state to next action timer

#### `feature_toggle_hover_no_use`
**Category**: `behavior_modeling`  
**Trigger**: Hover without click  
**Metadata**:
- `featureId` (string): Feature identifier
- `hoverDuration` (number): Time hovered in ms
**Integration**: Hover hook with no-follow detection (track `onMouseEnter` without `onClick`)

---

## Derivable Metrics (Computed, Not Logged)

These are calculated in the watchdog layer from aggregated events:

1. **confidence_score_per_agent_suggestion**: Ratio of accepted to total AI suggestions
2. **UX_fragility_index**: Abandon rate post-failure
3. **emotional_volatility_index**: Standard deviation of sentiment scores
4. **path_predictability_score**: Navigation entropy (1 - normalized entropy)
5. **UX_completion_rate_by_segment**: Funnel success by user type
6. **perceived_ai_accuracy_by_outcome**: Successful AI actions / total

---

## Usage Examples

### Logging AI Suggestion Acceptance

```typescript
import { useUXTelemetry } from '@/composables/useUXTelemetry';

const { logAISuggestionAccepted } = useUXTelemetry();

function handleAcceptSuggestion(suggestionId: string) {
  logAISuggestionAccepted(suggestionId, 'click', {
    suggestionType: 'code_completion',
  });
}
```

### Logging Sentiment

```typescript
const { logSentiment } = useUXTelemetry();

function handleMessageStart() {
  const sentiment = analyzeSentiment(inputText); // Mock or NLP
  logSentiment(sentiment, 'before');
}
```

### Logging Funnel Checkpoint

```typescript
const { logFunnelCheckpoint } = useUXTelemetry();

function handleFormSubmit() {
  logFunnelCheckpoint('onboarding_form_submit');
}
```

---

## Sampling Rules

**Critical Events (100% capture)**:
- `agent_handoff_failed`
- `dropoff_point_detected`
- `first_session_stall_point`
- `validation_react_irritation_score`

**High-Frequency Events (10% sample)**:
- `user_action_burst`
- `event_sequence_path`
- `interaction_latency_ms`
- `stuttered_input`

**Standard Events (50% sample)**:
- All other events

---

## Database Schema

All events stored in `ux_telemetry` table with:
- `trace_id`, `session_id`, `event_type`, `category`
- `component_id`, `state_before`, `state_after`
- `metadata` (JSONB), `device_context` (JSONB)
- `sampling_flag`, `user_id`, `room_id`
- `event_time`, `created_at`

See `sql/17_ux_telemetry_schema.sql` for complete DDL.

---

## Integration Checklist

- [ ] All 23 event types can be logged via SDK
- [ ] All event types integrated in relevant components
- [ ] Sampling rules configured correctly
- [ ] PII redaction for `contextQuery` and message fields
- [ ] Watchdog derivable metrics calculated
- [ ] Stats endpoint exposes all metrics
- [ ] CI/CD tests verify event emission
- [ ] Documentation updated

---

**Last Updated**: Phase 2-3 Telemetry Gap Completion  
**Total Event Types**: 82 (59 original + 23 new)  
**Total Categories**: 17 (13 original + 4 new)

