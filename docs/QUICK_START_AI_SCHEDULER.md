# Quick Start: AI Scheduler Integration

## ✅ What's Been Done

1. ✅ **AI Scheduler Service** (`src/services/ai-scheduler.ts`) - Created
2. ✅ **AI Automation Service** (`src/services/ai-automation.ts`) - Created  
3. ✅ **Enhanced Policy Guard** (`src/autonomy/policy_guard.ts`) - Updated for AI actions
4. ✅ **Server Integration** (`src/server/index.ts`) - Added initialization

## 🚀 Enable AI Schedulers

### Step 1: Add Environment Variables

Add to your `.env` file:

```bash
# Enable AI schedulers
AI_CONTINUOUS_ENABLED=true
AI_CONTINUOUS_INTERVAL=300000  # 5 minutes (300000ms)

# Optional: Scheduled optimizations
AI_DAILY_ENABLED=true
AI_DAILY_TIME=02:00  # 2 AM UTC

AI_WEEKLY_ENABLED=true
AI_WEEKLY_TIME=03:00  # 3 AM UTC Monday

AI_MONTHLY_ENABLED=true
AI_MONTHLY_TIME=04:00  # 4 AM UTC 1st of month
```

### Step 2: Restart Server

The scheduler will automatically initialize when the server starts (already integrated in `src/server/index.ts`).

### Step 3: Verify It's Running

Check server logs for:
```
AI schedulers initialized
Starting continuous scheduler: rate-limit-optimization (every 300000ms)
Starting continuous scheduler: bot-management (every 300000ms)
...
```

## 📊 What Runs Automatically

### Every 5 Minutes (Continuous)
- ✅ Rate limit optimization
- ✅ Bot management (auto-deactivate bad bots)
- ✅ Moderation threshold adjustment
- ✅ Cache TTL optimization
- ✅ Bot health analysis
- ✅ Moderation analysis
- ✅ Dropout detection

### Daily (2 AM UTC)
- ✅ All continuous optimizations
- ✅ Query performance analysis
- ✅ Telemetry insights analysis
- ✅ Index recommendations

### Weekly (Monday 3 AM UTC)
- ✅ Presence trends analysis
- ✅ Engagement analysis

### Monthly (1st, 4 AM UTC)
- ✅ Comprehensive system review
- ✅ Cost optimization recommendations

## 🔍 Monitoring

### Check Audit Logs

```sql
-- View AI automation actions
SELECT * FROM audit_log 
WHERE event_type LIKE 'ai_%' 
ORDER BY event_time DESC 
LIMIT 20;
```

### Check Scheduler Status

```typescript
// In your code or via API
import { aiScheduler } from './services/ai-scheduler.js';

// Check if schedulers are running
console.log('Schedulers:', Array.from(aiScheduler.intervals.keys()));
```

## 🛡️ Safety Features

All AI actions are validated by PolicyGuard:
- ✅ Whitelist of safe actions
- ✅ Blacklist of dangerous actions
- ✅ Reasoning required for sensitive actions
- ✅ All actions logged to audit_log

## 🧪 Testing

### Test Rate Limit Optimization

```typescript
import { optimizeRateLimits } from './services/ai-automation.js';
await optimizeRateLimits();
```

### Test Bot Management

```typescript
import { manageBots } from './services/ai-automation.js';
await manageBots();
```

### Test All Automations

```typescript
import { runAllAutomations } from './services/ai-automation.js';
await runAllAutomations();
```

## 🐛 Troubleshooting

### Schedulers Not Starting

1. Check `.env` has `AI_CONTINUOUS_ENABLED=true`
2. Check server logs for errors
3. Verify `DEEPSEEK_API_KEY` or `OPENAI_API_KEY` is set
4. Check Redis connection (for rate limit storage)

### Actions Being Rejected

1. Check `audit_log` for rejection reasons
2. Verify PolicyGuard whitelist includes your action type
3. Ensure reasoning is provided for sensitive actions

### High API Costs

1. Increase `AI_CONTINUOUS_INTERVAL` (default: 5 minutes)
2. Disable continuous monitoring: `AI_CONTINUOUS_ENABLED=false`
3. Use cheaper LLM provider (DeepSeek vs OpenAI)

## ✅ Ready to Launch

Everything is integrated and ready. Just:
1. Add environment variables
2. Restart server
3. Monitor audit logs

The AI will automatically optimize your system! 🚀

