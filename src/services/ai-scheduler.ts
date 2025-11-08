/**
 * AI Scheduler Service
 * Configurable scheduling for LLM analysis and optimizations
 * Supports: continuous (ping), periodic (5min, hourly), and scheduled (daily/weekly/monthly/yearly)
 */

import { supabase } from '../config/db.js';
import { logInfo, logError } from '../shared/logger.js';
import { LLMReasoner } from '../autonomy/llm_reasoner.js';
import { Executor } from '../autonomy/executor.js';
import { PolicyGuard } from '../autonomy/policy_guard.js';
import { safeAIOperation, shouldRunAI, isAutomationDisabled, updateHeartbeat } from './ai-safeguards.js';

export interface ScheduleConfig {
  enabled: boolean;
  interval: number; // milliseconds
  type: 'continuous' | 'periodic' | 'scheduled';
  schedule?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  time?: string; // HH:MM format for scheduled runs
  timezone?: string; // Default: UTC
}

class AIScheduler {
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private reasoner: LLMReasoner;
  private executor: Executor;
  private guard: PolicyGuard;

  constructor() {
    const apiKey = process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY || '';
    this.reasoner = new LLMReasoner(apiKey);
    this.executor = new Executor();
    this.guard = new PolicyGuard();
  }

  /**
   * Start continuous monitoring (ping mode)
   * Runs analysis every N seconds/minutes
   */
  startContinuous(name: string, intervalMs: number, handler: () => Promise<void>): void {
    if (this.intervals.has(name)) {
      logInfo(`Scheduler ${name} already running`);
      return;
    }

    logInfo(`Starting continuous scheduler: ${name} (every ${intervalMs}ms)`);
    
    const interval = setInterval(async () => {
      try {
        // Apply all safeguards
        await safeAIOperation(name, handler, { scheduler: 'continuous', interval: intervalMs });
        await updateHeartbeat(name);
      } catch (error: any) {
        logError(`Error in scheduler ${name}`, error);
      }
    }, intervalMs);

    this.intervals.set(name, interval);
  }

  /**
   * Start periodic analysis (every 5 minutes, hourly, etc.)
   */
  startPeriodic(name: string, intervalMs: number, handler: () => Promise<void>): void {
    this.startContinuous(name, intervalMs, handler);
  }

  /**
   * Schedule daily/weekly/monthly/yearly optimizations
   */
  startScheduled(
    name: string,
    schedule: 'daily' | 'weekly' | 'monthly' | 'yearly',
    time: string, // HH:MM format
    timezone: string = 'UTC',
    handler: () => Promise<void>
  ): void {
    if (this.intervals.has(name)) {
      logInfo(`Scheduler ${name} already running`);
      return;
    }

    logInfo(`Starting scheduled optimizer: ${name} (${schedule} at ${time} ${timezone})`);

    const scheduleNextRun = () => {
      const now = new Date();
      const [hours, minutes] = time.split(':').map(Number);
      
      let nextRun = new Date();
      nextRun.setUTCHours(hours, minutes, 0, 0);

      // Adjust for timezone if needed
      if (timezone !== 'UTC') {
        // Simple timezone offset (for production, use a proper timezone library)
        const offset = this.getTimezoneOffset(timezone);
        nextRun.setUTCHours(nextRun.getUTCHours() - offset);
      }

      // Calculate next occurrence based on schedule
      switch (schedule) {
        case 'daily':
          if (nextRun <= now) {
            nextRun.setUTCDate(nextRun.getUTCDate() + 1);
          }
          break;
        case 'weekly':
          // Next Monday at specified time
          const daysUntilMonday = (8 - nextRun.getUTCDay()) % 7 || 7;
          nextRun.setUTCDate(nextRun.getUTCDate() + daysUntilMonday);
          break;
        case 'monthly':
          nextRun.setUTCMonth(nextRun.getUTCMonth() + 1);
          break;
        case 'yearly':
          nextRun.setUTCFullYear(nextRun.getUTCFullYear() + 1);
          break;
      }

      const msUntilNext = nextRun.getTime() - now.getTime();
      
      logInfo(`Next ${schedule} run scheduled for: ${nextRun.toISOString()} (in ${Math.round(msUntilNext / 1000 / 60)} minutes)`);

      setTimeout(async () => {
        try {
          // Apply all safeguards
          await safeAIOperation(name, handler, { scheduler: 'scheduled', schedule, time });
          await updateHeartbeat(name);
        } catch (error: any) {
          logError(`Error in scheduled optimizer ${name}`, error);
        }
        // Schedule next run
        scheduleNextRun();
      }, msUntilNext);
    };

    scheduleNextRun();
  }

  /**
   * Stop a specific scheduler
   */
  stop(name: string): void {
    const interval = this.intervals.get(name);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(name);
      logInfo(`Stopped scheduler: ${name}`);
    }
  }

  /**
   * Stop all schedulers
   */
  stopAll(): void {
    this.intervals.forEach((interval, name) => {
      clearInterval(interval);
      logInfo(`Stopped scheduler: ${name}`);
    });
    this.intervals.clear();
  }

  /**
   * Get timezone offset (simplified - use proper library in production)
   */
  private getTimezoneOffset(timezone: string): number {
    // Simplified - in production use a library like 'date-fns-tz'
    const offsets: Record<string, number> = {
      'UTC': 0,
      'EST': -5,
      'PST': -8,
      'CET': 1,
      'JST': 9,
    };
    return offsets[timezone] || 0;
  }

  /**
   * Run bot health analysis
   */
  async analyzeBotHealth(): Promise<void> {
    logInfo('Running bot health analysis...');
    
    const { data: bots } = await supabase.rpc('ai_analyze_bot_failures', {
      bot_id_param: null, // Analyze all bots
      hours_back: 24
    });

    if (!bots || bots.length === 0) {
      logInfo('No bot health issues detected');
      return;
    }

    for (const bot of bots) {
      if (bot.recommendation?.includes('high error rate')) {
        logInfo(`Bot ${bot.bot_name} has high error rate - sending to LLM for analysis`);
        
        const analysis = await this.reasoner.analyze({
          context: bot,
          prompt: `Bot ${bot.bot_name} has ${bot.error_count} errors in the last 24 hours. Should it be deactivated?`
        });

        if (analysis.action === 'deactivate') {
          // Policy guard validates before execution
          const approved = this.guard.validate({
            action: analysis.action,
            reasoning: analysis.reasoning
          });
          if (approved) {
            await this.executor.execute(analysis.action, analysis.commands || []);
          }
        }
      }
    }
  }

  /**
   * Run moderation recommendations
   */
  async analyzeModeration(): Promise<void> {
    logInfo('Running moderation analysis...');
    
    const { data: recommendations } = await supabase.rpc('ai_moderation_recommendations', {
      room_id_param: null // Analyze all rooms
    });

    if (!recommendations || recommendations.length === 0) {
      logInfo('No moderation actions needed');
      return;
    }

    for (const rec of recommendations) {
      if (rec.flagged_rate > 10 || rec.avg_toxicity > 0.7) {
        logInfo(`Room ${rec.room_id} needs attention: ${rec.recommendation}`);
        
        // Send to LLM for deeper analysis
        const analysis = await this.reasoner.analyze({
          context: rec,
          prompt: `Room has ${rec.flagged_rate}% flagged messages. ${rec.recommendation}. What action should be taken?`
        });

        // Log recommendation
        await supabase.from('audit_log').insert({
          event_type: 'ai_moderation_recommendation',
          payload: { room_id: rec.room_id, analysis }
        });
      }
    }
  }

  /**
   * Run presence dropout detection
   */
  async detectDropouts(): Promise<void> {
    logInfo('Running presence dropout detection...');
    
    const { data: dropouts } = await supabase.rpc('ai_detect_presence_dropouts', {
      hours_threshold: 2
    });

    if (!dropouts || dropouts.length === 0) {
      logInfo('No dropouts detected');
      return;
    }

    logInfo(`Detected ${dropouts.length} potential dropouts`);
    
    // Analyze patterns
    const analysis = await this.reasoner.analyze({
      context: { dropouts },
      prompt: 'Analyze these user dropouts. Are there patterns? Should we send re-engagement messages?'
    });

    await supabase.from('audit_log').insert({
      event_type: 'ai_dropout_analysis',
      payload: { analysis }
    });
  }

  /**
   * Run daily optimizations
   */
  async runDailyOptimizations(): Promise<void> {
    logInfo('Running daily optimizations...');
    
    // Import automation functions
    const { runAllAutomations } = await import('./ai-automation.js');
    
    // Run all high-priority automations
    await runAllAutomations();
    
    // 1. Analyze query performance
    const { data: slowQueries } = await supabase
      .from('ai_query_performance')
      .select('*')
      .eq('performance_category', 'slow')
      .limit(10);

    if (slowQueries && slowQueries.length > 0) {
      const analysis = await this.reasoner.analyze({
        context: { slowQueries },
        prompt: 'These queries are slow. Recommend index optimizations or query improvements.'
      });
      
      await supabase.from('audit_log').insert({
        event_type: 'ai_daily_optimization',
        payload: { type: 'query_performance', analysis }
      });
    }

    // 2. Analyze telemetry insights
    const { data: insights } = await supabase
      .from('ai_telemetry_insights')
      .select('*')
      .order('event_count', { ascending: false })
      .limit(20);

    if (insights && insights.length > 0) {
      const analysis = await this.reasoner.analyze({
        context: { insights },
        prompt: 'Analyze these telemetry patterns. Are there anomalies or optimization opportunities?'
      });
      
      await supabase.from('audit_log').insert({
        event_type: 'ai_daily_optimization',
        payload: { type: 'telemetry_analysis', analysis }
      });
    }
  }

  /**
   * Run weekly optimizations
   */
  async runWeeklyOptimizations(): Promise<void> {
    logInfo('Running weekly optimizations...');
    
    // Analyze trends over the week
    const { data: trends } = await supabase
      .from('ai_presence_trends')
      .select('*')
      .limit(100);

    const analysis = await this.reasoner.analyze({
      context: { trends },
      prompt: 'Analyze weekly presence trends. Identify patterns, anomalies, and optimization opportunities.'
    });

    await supabase.from('audit_log').insert({
      event_type: 'ai_weekly_optimization',
      payload: { analysis }
    });
  }

  /**
   * Run monthly optimizations
   */
  async runMonthlyOptimizations(): Promise<void> {
    logInfo('Running monthly optimizations...');
    
    // Comprehensive monthly analysis
    const analysis = await this.reasoner.analyze({
      context: {
        message: 'Run comprehensive monthly system analysis'
      },
      prompt: 'Analyze the entire system for the past month. Provide optimization recommendations for: performance, security, user engagement, and cost optimization.'
    });

    await supabase.from('audit_log').insert({
      event_type: 'ai_monthly_optimization',
      payload: { analysis }
    });
  }

  /**
   * Run yearly optimizations
   */
  async runYearlyOptimizations(): Promise<void> {
    logInfo('Running yearly optimizations...');
    
    // Year-end comprehensive analysis
    const analysis = await this.reasoner.analyze({
      context: {
        message: 'Run comprehensive yearly system analysis'
      },
      prompt: 'Provide a comprehensive yearly review with: major trends, system health, optimization opportunities, and strategic recommendations for the next year.'
    });

    await supabase.from('audit_log').insert({
      event_type: 'ai_yearly_optimization',
      payload: { analysis }
    });
  }
}

// Singleton instance
export const aiScheduler = new AIScheduler();

/**
 * Initialize default schedulers
 * Call this from your server startup
 */
export function initializeAISchedulers(): void {
  const config = {
    continuous: process.env.AI_CONTINUOUS_ENABLED === 'true',
    continuousInterval: parseInt(process.env.AI_CONTINUOUS_INTERVAL || '300000'), // 5 minutes default
    periodic5min: process.env.AI_PERIODIC_5MIN_ENABLED === 'true',
    daily: process.env.AI_DAILY_ENABLED === 'true',
    dailyTime: process.env.AI_DAILY_TIME || '02:00', // 2 AM UTC default
    weekly: process.env.AI_WEEKLY_ENABLED === 'true',
    weeklyTime: process.env.AI_WEEKLY_TIME || '03:00', // 3 AM UTC Monday default
    monthly: process.env.AI_MONTHLY_ENABLED === 'true',
    monthlyTime: process.env.AI_MONTHLY_TIME || '04:00', // 4 AM UTC 1st of month
    yearly: process.env.AI_YEARLY_ENABLED === 'true',
    yearlyTime: process.env.AI_YEARLY_TIME || '05:00', // 5 AM UTC Jan 1st
  };

  // Continuous monitoring (every 5 minutes by default)
  if (config.continuous) {
    // Import automation functions dynamically
    import('./ai-automation.js').then(({ optimizeRateLimits, manageBots, adjustModerationThresholds, optimizeCacheTTL }) => {
      aiScheduler.startContinuous('rate-limit-optimization', config.continuousInterval, () => 
        optimizeRateLimits()
      );
      aiScheduler.startContinuous('bot-management', config.continuousInterval, () => 
        manageBots()
      );
      aiScheduler.startContinuous('moderation-adjustment', config.continuousInterval, () => 
        adjustModerationThresholds()
      );
      aiScheduler.startContinuous('cache-optimization', config.continuousInterval, () => 
        optimizeCacheTTL()
      );
    });
    
    aiScheduler.startContinuous('bot-health', config.continuousInterval, () => 
      aiScheduler.analyzeBotHealth()
    );
    aiScheduler.startContinuous('moderation', config.continuousInterval, () => 
      aiScheduler.analyzeModeration()
    );
    aiScheduler.startContinuous('dropouts', config.continuousInterval, () => 
      aiScheduler.detectDropouts()
    );
  }

  // Periodic 5-minute checks
  if (config.periodic5min) {
    aiScheduler.startPeriodic('quick-check', 5 * 60 * 1000, async () => {
      await aiScheduler.analyzeBotHealth();
      await aiScheduler.detectDropouts();
    });
  }

  // Daily optimizations
  if (config.daily) {
    aiScheduler.startScheduled('daily-optimization', 'daily', config.dailyTime, 'UTC', () =>
      aiScheduler.runDailyOptimizations()
    );
  }

  // Weekly optimizations
  if (config.weekly) {
    aiScheduler.startScheduled('weekly-optimization', 'weekly', config.weeklyTime, 'UTC', () =>
      aiScheduler.runWeeklyOptimizations()
    );
  }

  // Monthly optimizations
  if (config.monthly) {
    aiScheduler.startScheduled('monthly-optimization', 'monthly', config.monthlyTime, 'UTC', () =>
      aiScheduler.runMonthlyOptimizations()
    );
  }

  // Yearly optimizations
  if (config.yearly) {
    aiScheduler.startScheduled('yearly-optimization', 'yearly', config.yearlyTime, 'UTC', () =>
      aiScheduler.runYearlyOptimizations()
    );
  }

  logInfo('AI schedulers initialized');
}

