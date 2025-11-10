# AI Scheduler Guide - Configuring LLM Analysis Intervals

## Overview

The AI Scheduler service allows you to configure when and how often the LLM analyzes your system. You can set up:

- **Continuous monitoring** - Runs every N seconds/minutes (ping mode)
- **Periodic analysis** - Every 5 minutes, hourly, etc.
- **Scheduled optimizations** - Daily, weekly, monthly, yearly

## How It Works

### Current System

Your system already has an **autonomy healing loop** that runs every **60 seconds** (1 minute) by default. It:
1. Scans telemetry for events
2. Uses LLM to analyze issues
3. Proposes fixes
4. Executes approved actions

**Location**: `src/autonomy/healing-loop.ts`

### New AI Scheduler

The new scheduler (`src/services/ai-scheduler.ts`) provides more flexible configuration:

## Configuration Options

### Environment Variables

Add these to your `.env` file:

```bash
# Continuous monitoring (ping mode)
AI_CONTINUOUS_ENABLED=true
AI_CONTINUOUS_INTERVAL=300000  # 5 minutes in milliseconds

# Periodic 5-minute checks
AI_PERIODIC_5MIN_ENABLED=true

# Daily optimizations
AI_DAILY_ENABLED=true
AI_DAILY_TIME=02:00  # 2 AM UTC

# Weekly optimizations
AI_WEEKLY_ENABLED=true
AI_WEEKLY_TIME=03:00  # 3 AM UTC (Monday)

# Monthly optimizations
AI_MONTHLY_ENABLED=true
AI_MONTHLY_TIME=04:00  # 4 AM UTC (1st of month)

# Yearly optimizations
AI_YEARLY_ENABLED=true
AI_YEARLY_TIME=05:00  # 5 AM UTC (Jan 1st)
```

## Usage Examples

### 1. Continuous Monitoring (Every 5 Minutes)

```typescript
import { aiScheduler } from './services/ai-scheduler.js';

// Start continuous bot health monitoring (every 5 minutes)
aiScheduler.startContinuous(
  'bot-health',
  5 * 60 * 1000, // 5 minutes in milliseconds
  () => aiScheduler.analyzeBotHealth()
);

// Start continuous moderation checks (every 5 minutes)
aiScheduler.startContinuous(
  'moderation',
  5 * 60 * 1000,
  () => aiScheduler.analyzeModeration()
);
```

### 2. Periodic Analysis (Every 5 Minutes)

```typescript
// Quick checks every 5 minutes
aiScheduler.startPeriodic(
  'quick-check',
  5 * 60 * 1000, // 5 minutes
  async () => {
    await aiScheduler.analyzeBotHealth();
    await aiScheduler.detectDropouts();
  }
);
```

### 3. Daily Optimizations (2 AM UTC)

```typescript
// Run daily optimizations at 2 AM UTC
aiScheduler.startScheduled(
  'daily-optimization',
  'daily',
  '02:00', // 2 AM
  'UTC',
  () => aiScheduler.runDailyOptimizations()
);
```

### 4. Weekly Optimizations (Monday 3 AM UTC)

```typescript
// Run weekly optimizations every Monday at 3 AM UTC
aiScheduler.startScheduled(
  'weekly-optimization',
  'weekly',
  '03:00', // 3 AM
  'UTC',
  () => aiScheduler.runWeeklyOptimizations()
);
```

### 5. Monthly Optimizations (1st of month, 4 AM UTC)

```typescript
// Run monthly optimizations on the 1st of each month at 4 AM UTC
aiScheduler.startScheduled(
  'monthly-optimization',
  'monthly',
  '04:00', // 4 AM
  'UTC',
  () => aiScheduler.runMonthlyOptimizations()
);
```

### 6. Yearly Optimizations (Jan 1st, 5 AM UTC)

```typescript
// Run yearly optimizations on January 1st at 5 AM UTC
aiScheduler.startScheduled(
  'yearly-optimization',
  'yearly',
  '05:00', // 5 AM
  'UTC',
  () => aiScheduler.runYearlyOptimizations()
);
```

## Integration with Server

### Initialize on Server Start

Add to your `src/server/index.ts`:

```typescript
import { initializeAISchedulers } from '../services/ai-scheduler.js';

// Initialize AI schedulers on server start
initializeAISchedulers();
```

### Manual Control

```typescript
import { aiScheduler } from './services/ai-scheduler.js';

// Stop a specific scheduler
aiScheduler.stop('bot-health');

// Stop all schedulers
aiScheduler.stopAll();

// Start a custom scheduler
aiScheduler.startContinuous('custom', 60000, async () => {
  // Your custom analysis
});
```

## What Each Optimization Does

### Continuous/Periodic (Every 5 Minutes)
- **Bot Health**: Analyzes bot failures and recommends deactivation if needed
- **Moderation**: Checks for rooms needing moderation attention
- **Dropouts**: Detects users who may have left

### Daily Optimizations (2 AM UTC)
- **Query Performance**: Analyzes slow queries and recommends index optimizations
- **Telemetry Insights**: Identifies anomalies and optimization opportunities
- **System Health**: Overall daily health check

### Weekly Optimizations (Monday 3 AM UTC)
- **Presence Trends**: Analyzes weekly user behavior patterns
- **Engagement Analysis**: Identifies engagement opportunities
- **Weekly Report**: Comprehensive weekly analysis

### Monthly Optimizations (1st of Month, 4 AM UTC)
- **Comprehensive Analysis**: Full system review
- **Performance Trends**: Month-over-month performance analysis
- **Cost Optimization**: Identifies cost-saving opportunities
- **Strategic Recommendations**: High-level optimization suggestions

### Yearly Optimizations (Jan 1st, 5 AM UTC)
- **Year-End Review**: Comprehensive yearly analysis
- **Major Trends**: Identifies major patterns over the year
- **Strategic Planning**: Recommendations for the next year
- **System Evolution**: Long-term optimization opportunities

## Cost Considerations

### LLM API Costs

- **Continuous (5 min)**: ~288 API calls/day = ~$2-5/day (depending on provider)
- **Daily**: 1 API call/day = ~$0.01/day
- **Weekly**: 1 API call/week = ~$0.01/week
- **Monthly**: 1 API call/month = ~$0.01/month
- **Yearly**: 1 API call/year = ~$0.01/year

**Total**: ~$2-5/day for continuous monitoring

### Optimization Tips

1. **Disable continuous during low-traffic hours**:
   ```typescript
   // Only run during business hours
   const hour = new Date().getUTCHours();
   if (hour >= 9 && hour <= 17) {
     // Run analysis
   }
   ```

2. **Batch multiple analyses**:
   ```typescript
   // Run all quick checks together
   aiScheduler.startPeriodic('all-checks', 5 * 60 * 1000, async () => {
     await Promise.all([
       aiScheduler.analyzeBotHealth(),
       aiScheduler.analyzeModeration(),
       aiScheduler.detectDropouts()
     ]);
   });
   ```

3. **Use cheaper models for routine checks**:
   - Set `DEEPSEEK_API_KEY` (cheaper) for continuous monitoring
   - Use `OPENAI_API_KEY` (more expensive) for critical analyses

## Monitoring Scheduler Activity

All scheduler runs are logged to:
- **Console logs**: Check server logs for scheduler activity
- **Audit log**: `audit_log` table with `event_type` like:
  - `ai_moderation_recommendation`
  - `ai_dropout_analysis`
  - `ai_daily_optimization`
  - `ai_weekly_optimization`
  - `ai_monthly_optimization`
  - `ai_yearly_optimization`

## Example: Full Configuration

```typescript
// src/server/index.ts

import { initializeAISchedulers } from '../services/ai-scheduler.js';

// Start server
const app = express();
// ... server setup ...

// Initialize AI schedulers
initializeAISchedulers();

app.listen(3000, () => {
  console.log('Server running with AI schedulers enabled');
});
```

## Troubleshooting

### Scheduler Not Running

1. Check environment variables are set correctly
2. Check server logs for initialization messages
3. Verify LLM API keys are configured
4. Check Redis connection (for autonomy mode toggle)

### High API Costs

1. Increase interval times
2. Disable continuous monitoring during off-hours
3. Use cheaper LLM providers (DeepSeek vs OpenAI)
4. Batch multiple analyses together

### Scheduler Errors

All errors are logged but don't stop the scheduler. Check:
- Server logs for error messages
- `audit_log` table for failed runs
- LLM API key validity
- Database connectivity

## Next Steps

1. ✅ Add `src/services/ai-scheduler.ts` to your project
2. ✅ Add environment variables to `.env`
3. ✅ Call `initializeAISchedulers()` in your server startup
4. ✅ Monitor logs and audit_log table
5. ✅ Adjust intervals based on your needs

