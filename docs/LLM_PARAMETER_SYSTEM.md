# LLM Parameter Runtime Configuration System

**Date**: 2025-01-27  
**Status**: ✅ **COMPLETE**

---

## Overview

A fully modular LLM runtime configuration system that centralizes all AI parameter management, validation, and control. This system replaces scattered hardcoded values with a unified, type-safe, and observable parameter management layer.

---

## Architecture

### Core Components

1. **`src/config/llm-params.config.ts`**
   - Defines all LLM parameters with types, defaults, validation rules, and control types
   - Categorizes parameters (MODEL, TEMPERATURE, TOKEN, RATE_LIMIT, MODERATION, PERFORMANCE, AUTOMATION, SEARCH, MAINTENANCE)
   - Marks control types: UI, AGENT, MANUAL, HYBRID

2. **`src/services/llm-parameter-manager.ts`**
   - Centralized service (`LLMParameterManager`) for resolving, validating, and exposing parameters
   - Runtime configuration persistence (`config/llm-params-runtime.json`)
   - Event emission for parameter changes
   - PolicyGuard integration for agent-controlled changes
   - Authorization checks based on control types

---

## Parameter Categories

### 1. Model Selection (`llm.models`)
- **Reasoning**: `gpt-4` (default)
- **Prediction**: `gpt-4` (default)
- **Automation**: `deepseek-chat` (default, auto-selects DeepSeek if available)
- **Optimizer**: `gpt-4` (default)
- **Assistants**: `gpt-4` (default, user-configurable)
- **Embeddings**: `text-embedding-3-small` (default)
- **Control**: HYBRID (user, agent, environment)

### 2. Temperature (`llm.temperature`)
- **Reasoning**: `0.0` (deterministic)
- **Prediction**: `0.0` (deterministic)
- **Automation**: `0.3` (slight creativity)
- **Assistants**: `0.7` (user-configurable)
- **Optimizer**: `0.0` (deterministic)
- **Range**: 0.0 - 2.0
- **Control**: HYBRID (user, agent)

### 3. Token Limits (`llm.tokens`)
- **Max Tokens (Reasoning)**: `800`
- **Max Tokens (Prediction)**: `800`
- **Max Tokens (Automation)**: `1000`
- **Max Tokens (Optimizer)**: `800`
- **Cost per 1K**: `0.0001`
- **Daily Spend Limit**: `$25`
- **Warning Threshold**: `$22.50` (90%)
- **Control**: AGENT

### 4. Rate Limiting (`llm.rateLimits`)
- **Max Calls/Hour**: `100`
- **Window (ms)**: `3600000` (1 hour)
- **Hourly Limit**: `100`
- **Warning Threshold**: `90` (90%)
- **Error Backoff (ms)**: `300000` (5 minutes)
- **Analysis Timeout (ms)**: `30000` (30 seconds)
- **Heartbeat Timeout (ms)**: `30000` (30 seconds)
- **Control**: AGENT

### 5. Moderation (`llm.moderation`)
- **Default Threshold**: `0.6`
- **Illegal**: `0.7`
- **Threat**: `0.6`
- **PII**: `0.65`
- **Hate**: `0.55`
- **Adult**: `0.0` (disabled)
- **Probation Multiplier**: `0.5`
- **Toxicity High**: `0.8`
- **Toxicity Moderate**: `0.6`
- **Max Repetition**: `20`
- **Max Content Length**: `50000`
- **Control**: AGENT

### 6. Performance Boundaries (`llm.performance`)
- **Latency Min**: `0ms`
- **Latency Max**: `200ms`
- **Error Rate Min**: `0%`
- **Error Rate Max**: `10%`
- **Control**: AGENT (critical)

### 7. Automation (`llm.automation`)
- **Rate Limits**:
  - Global: `100`/minute
  - IP: `1000`/minute
  - User: `100`/minute
- **Cache TTLs**:
  - L1: `60000ms` (1 minute)
  - L2: `300000ms` (5 minutes)
- **Control**: AGENT

### 8. Semantic Search (`llm.search`)
- **Match Threshold**: `0.78`
- **Match Count**: `10`
- **Control**: HYBRID (user, agent)

### 9. Maintenance Window (`llm.maintenance`)
- **Start Hour**: `3` (UTC)
- **End Hour**: `5` (UTC)
- **Timezone**: `UTC`
- **Control**: MANUAL (critical)

---

## Control Types

### UI Control
- User-configurable via interface
- Examples: Assistant model/temperature, semantic search threshold

### AGENT Control
- LLM agents can modify autonomously
- Requires PolicyGuard validation
- Examples: Rate limits, cache TTLs, moderation thresholds

### MANUAL Control
- Requires code/environment override
- Examples: Maintenance window, critical safety parameters

### HYBRID Control
- Multiple control methods available
- Examples: Model selection (user, agent, environment)

---

## Usage Examples

### Getting Parameter Values

```typescript
import { llmParamManager } from './services/llm-parameter-manager';

// Get specific config
const models = llmParamManager.getModels();
const temperature = llmParamManager.getTemperature();
const rateLimits = llmParamManager.getRateLimits();

// Use in LLM calls
const response = await client.chat.completions.create({
  model: models.reasoning,
  temperature: temperature.reasoning,
  max_tokens: tokenConfig.maxTokensReasoning
});
```

### Setting Parameter Values (Agent)

```typescript
// Agent-controlled change (requires PolicyGuard approval)
await llmParamManager.set(
  'llm.rateLimits',
  { maxCallsPerHour: 150, windowMs: 3600000, ... },
  'agent',
  'Traffic spike detected, increasing rate limit'
);
```

### Setting Parameter Values (User)

```typescript
// User-controlled change (UI)
await llmParamManager.set(
  'llm.temperature',
  { assistants: 0.8, ... },
  'user',
  'User preference for more creative responses'
);
```

### Listening to Parameter Changes

```typescript
import { ParameterEvent } from './services/llm-parameter-manager';

llmParamManager.on(ParameterEvent.PARAMETER_CHANGED, (change) => {
  console.log(`Parameter ${change.parameterId} changed:`, change);
});
```

---

## Refactored Files

All references to hardcoded LLM parameters have been refactored to use the centralized system:

1. ✅ `src/autonomy/llm_reasoner.ts` - All model, temperature, and token parameters
2. ✅ `src/services/ai-safeguards.ts` - Rate limits, timeouts, boundaries, token costs
3. ✅ `src/optimizer/index.ts` - Optimizer model, temperature, max tokens
4. ✅ `src/services/ai-automation.ts` - Rate limits, cache TTLs

---

## Runtime Configuration

The system persists runtime overrides to `config/llm-params-runtime.json`:

```json
{
  "llm.rateLimits": {
    "maxCallsPerHour": 150,
    "windowMs": 3600000,
    ...
  },
  "llm.temperature": {
    "assistants": 0.8,
    ...
  }
}
```

Only parameters that differ from defaults are stored.

---

## Safety & Validation

### Critical Parameters (Never Auto-Adjust)
- ❌ `maintenance_window` - System maintenance schedule
- ❌ `ANALYSIS_TIMEOUT` - Prevents hanging operations
- ❌ `HEARTBEAT_TIMEOUT` - Dead loop detection
- ❌ `latency.max` - Safety boundary (kills operations)

### Safe to Auto-Adjust (with Monitoring)
- ✅ Rate limits (with policy guard)
- ✅ Cache TTLs (with policy guard)
- ✅ Moderation thresholds (with policy guard)
- ✅ Token spending limits (with warnings)

### Validation Rules
- Type checking (matches default value type)
- Range validation (min/max values)
- Custom validators (parameter-specific rules)
- Allowed values (enum-like constraints)
- PolicyGuard approval (for agent changes)

---

## Integration Points

### PolicyGuard Integration
All agent-controlled parameter changes must pass `PolicyGuard` validation:

```typescript
const isApproved = await policyGuard.validateAction({
  action: 'parameter_adjustment',
  target: parameterId,
  newValue: value,
  context: { reason, category: param.category }
});
```

### Audit Logging
All parameter changes are logged to `audit_log` table with:
- Parameter ID
- Old/New values
- Changed by (user/agent/manual/system)
- Timestamp
- Reason (if provided)

### Event Emission
The manager emits events for:
- `PARAMETER_CHANGED` - Any parameter change
- `VALIDATION_FAILED` - Validation error
- `OVERRIDE_APPLIED` - Manual override
- `AGENT_ADJUSTMENT` - Agent-controlled change

---

## Benefits

1. **Centralized Control**: Single source of truth for all LLM parameters
2. **Type Safety**: Full TypeScript typing prevents errors
3. **Observability**: Event emission and audit logging
4. **Flexibility**: Multiple control types (UI, agent, manual)
5. **Safety**: Validation, PolicyGuard, and critical parameter protection
6. **Persistence**: Runtime configuration survives restarts
7. **Modularity**: Clean separation of concerns

---

## Migration Notes

### Before
```typescript
// Hardcoded values scattered across files
const model = 'gpt-4';
const temperature = 0.0;
const maxTokens = 800;
```

### After
```typescript
// Centralized config
const models = llmParamManager.getModels();
const temperature = llmParamManager.getTemperature();
const tokenConfig = llmParamManager.getTokenConfig();
```

---

## Future Enhancements

1. **UI Dashboard**: Admin interface for parameter management
2. **Parameter History**: Track all changes over time
3. **A/B Testing**: Support for parameter experiments
4. **Environment-Specific Configs**: Dev/staging/prod overrides
5. **Parameter Templates**: Pre-configured parameter sets
6. **Rollback Support**: Revert to previous parameter values

---

**System Complete**: All LLM parameters are now managed through the centralized configuration system.
