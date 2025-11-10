# AI Safeguards - Complete Safety System

## Overview

All AI automation is wrapped in comprehensive safeguards to prevent runaway costs, API abuse, and system failures.

## 🛡️ Safeguards Implemented

### 1. Rate Limiting on DeepSeek/OpenAI Client
**Prevents**: API spam and blacklisting
- **Limit**: 100 calls per hour
- **Enforcement**: Redis-based sliding window
- **Action**: Blocks calls when limit exceeded, logs to audit

### 2. Error Backoff (5 Minute Wait on 500 Errors)
**Prevents**: Retry storms and API hammering
- **Trigger**: 500 server errors or timeouts
- **Duration**: 5 minutes
- **Action**: All automation paused, auto-resumes after backoff

### 3. Timeout Wrapper (30 Second Max)
**Prevents**: Hanging threads and stuck operations
- **Timeout**: 30 seconds per analysis
- **Action**: Kills operation, triggers backoff, logs error

### 4. Comprehensive Logging
**Prevents**: Silent failures and untracked operations
- **Logs**: Every operation start, completion, error
- **Storage**: `audit_log` table + console logs
- **Includes**: Duration, context, results, errors

### 5. Auto-Disable During Maintenance Window (3-5 AM UTC)
**Prevents**: Issues during low-traffic hours
- **Window**: 3-5 AM UTC daily
- **Action**: All automation skipped, logged

### 6. Metric Boundaries (Guardrails)
**Prevents**: Uncontrolled metrics and runaway costs

#### Latency Boundary
- **Max**: 200ms
- **Action**: Kills loop if exceeded

#### Error Rate Boundary
- **Max**: 10%
- **Action**: Kills loop if exceeded

#### Token Spend Boundary
- **Daily Limit**: $25
- **Warning**: $22.50 (90%)
- **Action**: Disables all automation if limit hit

#### API Calls Boundary
- **Hourly Limit**: 100 calls
- **Warning**: 90 calls (90%)
- **Action**: Blocks calls if limit exceeded

### 7. Heartbeat Monitoring
**Prevents**: Dead loops and silent failures
- **Timeout**: 30 seconds
- **Action**: Assumes dead if no heartbeat, logs alert

## 📋 Usage

### All Operations Wrapped

Every AI operation automatically includes:
```typescript
await safeAIOperation('operation-name', async () => {
  // Your operation code
  return result;
}, { context: 'additional info' });
```

### Manual Checks

```typescript
import { 
  shouldRunAI, 
  isAutomationDisabled, 
  checkLLMRateLimit,
  checkErrorBackoff 
} from './services/ai-safeguards.js';

// Check before running
if (!shouldRunAI()) return; // Maintenance window
if (await isAutomationDisabled()) return; // Disabled
if (!(await checkLLMRateLimit())) return; // Rate limited
if (await checkErrorBackoff()) return; // In backoff
```

## 🔧 Configuration

### Adjust Boundaries

```typescript
import { setMetricBoundaries } from './services/ai-safeguards.js';

setMetricBoundaries({
  latency: { min: 0, max: 200 },
  errorRate: { min: 0, max: 10 },
  tokenSpend: { dailyLimit: 25, warningThreshold: 22.5 },
  apiCalls: { hourlyLimit: 100, warningThreshold: 90 }
});
```

### Re-enable Automation

```typescript
import { enableAutomation } from './services/ai-safeguards.js';

// After fixing issues
await enableAutomation();
```

## 📊 Monitoring

### Check Token Spend

```sql
-- View daily token spend
SELECT 
  DATE(event_time) as date,
  SUM((payload->>'spend')::numeric) as total_spend
FROM audit_log
WHERE event_type = 'ai_token_spend_tracking'
GROUP BY DATE(event_time)
ORDER BY date DESC;
```

### Check Rate Limit Status

```typescript
import { checkLLMRateLimit } from './services/ai-safeguards.js';
const allowed = await checkLLMRateLimit();
```

### Check Automation Status

```typescript
import { isAutomationDisabled, checkHeartbeat } from './services/ai-safeguards.js';
const disabled = await isAutomationDisabled();
const heartbeatOk = await checkHeartbeat();
```

## 🚨 Emergency Controls

### Disable All Automation

```bash
# Via Redis
redis-cli SET ai:automation:disabled true

# Or via code
import { isAutomationDisabled } from './services/ai-safeguards.js';
await redis.set('ai:automation:disabled', 'true');
```

### Clear Error Backoff

```bash
redis-cli DEL ai:error_backoff
```

### Reset Rate Limit

```bash
redis-cli DEL ai:llm:rate_limit
```

## ✅ What's Protected

- ✅ **API Rate Limiting** - Prevents spam
- ✅ **Error Backoff** - Prevents retry storms  
- ✅ **Timeouts** - Prevents hanging threads
- ✅ **Logging** - Tracks everything
- ✅ **Maintenance Window** - Auto-disable 3-5 AM UTC
- ✅ **Metric Boundaries** - Latency, error rate, token spend, API calls
- ✅ **Heartbeat** - Detects dead loops

## 🎯 Default Boundaries

```typescript
{
  latency: { min: 0, max: 200 },        // Kill if > 200ms
  errorRate: { min: 0, max: 10 },       // Kill if > 10%
  tokenSpend: { 
    dailyLimit: 25,                      // Disable if > $25/day
    warningThreshold: 22.5               // Warn at $22.50
  },
  apiCalls: {
    hourlyLimit: 100,                    // Block if > 100/hour
    warningThreshold: 90                  // Warn at 90
  }
}
```

## 📝 All Operations Logged

Every operation logs:
- **Start**: Operation name, context, timestamp
- **Complete**: Result, duration, success
- **Error**: Error message, stack trace, context
- **Boundary Violations**: Metric, value, limit
- **Rate Limits**: Count, limit, reset time
- **Backoffs**: Trigger reason, duration

## 🔍 Audit Log Queries

```sql
-- All AI operations today
SELECT * FROM audit_log 
WHERE event_type LIKE 'ai_%' 
  AND DATE(event_time) = CURRENT_DATE
ORDER BY event_time DESC;

-- Token spend warnings
SELECT * FROM audit_log 
WHERE event_type = 'ai_token_spend_warning'
ORDER BY event_time DESC;

-- Automation disabled events
SELECT * FROM audit_log 
WHERE event_type = 'ai_automation_disabled'
ORDER BY event_time DESC;

-- Rate limit exceeded
SELECT * FROM audit_log 
WHERE event_type = 'ai_rate_limit_exceeded'
ORDER BY event_time DESC;
```

## ✅ Status: FULLY PROTECTED

All AI operations are now wrapped in safeguards. Nothing can run uncontrolled.

