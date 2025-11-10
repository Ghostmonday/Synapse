/**
 * AI Automation Service
 * Implements high-priority AI automations for system optimization
 * 
 * Priority 1 Automations:
 * 1. Dynamic Rate Limiting
 * 2. Bot Auto-Deactivation
 * 3. Moderation Threshold Adjustment
 * 4. Cache TTL Optimization
 * 5. Database Index Management
 */

import { supabase } from '../config/db.js';
import { getRedisClient } from '../config/db.js';
import { LLMReasoner } from '../autonomy/llm_reasoner.js';
import { PolicyGuard } from '../autonomy/policy_guard.js';
import { logInfo, logError, logWarning } from '../shared/logger.js';
import { safeAIOperation, checkLLMRateLimit, trackTokenSpend, shouldRunAI, isAutomationDisabled } from './ai-safeguards.js';
import { llmParamManager } from './llm-parameter-manager';
import { getDeepSeekKey, getOpenAIKey } from './api-keys-service.js';

const redis = getRedisClient();
let reasoner: LLMReasoner | null = null;
const guard = new PolicyGuard();

async function getReasoner(): Promise<LLMReasoner> {
  if (!reasoner) {
    // Try DeepSeek first, fallback to OpenAI
    try {
      const apiKey = await getDeepSeekKey();
      reasoner = new LLMReasoner(apiKey);
    } catch {
      try {
        const apiKey = await getOpenAIKey();
        reasoner = new LLMReasoner(apiKey);
      } catch {
        throw new Error('No LLM API key available in vault');
      }
    }
  }
  return reasoner;
}

/**
 * 1. Dynamic Rate Limiting
 * Adjusts rate limits based on traffic patterns and attack detection
 */
export async function optimizeRateLimits(): Promise<void> {
  return safeAIOperation('optimizeRateLimits', async () => {
    // Check rate limit before making LLM call
    if (!(await checkLLMRateLimit())) {
      logWarning('LLM rate limit exceeded - skipping rate limit optimization');
      return;
    }

    logInfo('Running rate limit optimization...');

    // Get rate limit telemetry
    const { data: rateLimitEvents } = await supabase
      .from('telemetry')
      .select('*')
      .eq('event', 'rate_limit_exceeded')
      .gte('event_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!rateLimitEvents || rateLimitEvents.length === 0) {
      logInfo('No rate limit events to analyze');
      return;
    }

    // Analyze with LLM (with token tracking)
    const reasonerInstance = await getReasoner();
    const analysis = await reasonerInstance.analyze({
      context: {
        events: rateLimitEvents,
        currentLimits: llmParamManager.getAutomation().rateLimits // Get from centralized config
      },
      prompt: `Analyze these rate limit events. Are they legitimate users being blocked (false positives) or actual attacks? 
      Should we increase or decrease rate limits? Provide reasoning and recommended limits.`
    });

    // Track token spend (approximate - adjust based on actual usage)
    await trackTokenSpend(500); // Approximate tokens used

    if (analysis.action === 'adjust_rate_limit' && analysis.recommendedLimits) {
      // Validate with policy guard
      const approved = guard.validate({ 
        action: 'adjust_rate_limit', 
        reasoning: analysis.reasoning 
      });
      if (!approved) {
        logWarning('Rate limit adjustment rejected by policy guard');
        return;
      }

      // Apply new limits
      const newLimits = analysis.recommendedLimits;
      await redis.set('rate_limit:global:max', newLimits.global || 100);
      await redis.set('rate_limit:ip:max', newLimits.ip || 1000);
      await redis.set('rate_limit:user:max', newLimits.user || 100);

      // Log action
      await supabase.from('audit_log').insert({
        event_type: 'ai_rate_limit_adjustment',
        payload: {
          old_limits: { global: 100, ip: 1000, user: 100 },
          new_limits: newLimits,
          reasoning: analysis.reasoning,
          confidence: analysis.confidence
        }
      });

      logInfo(`Rate limits adjusted: ${JSON.stringify(newLimits)}`);
    }
  }, { operation: 'rate_limit_optimization' }) || undefined;
}

/**
 * 2. Bot Auto-Deactivation
 * Automatically deactivates bots with high error rates
 */
export async function manageBots(): Promise<void> {
  return safeAIOperation('manageBots', async () => {
    // Check rate limit
    if (!(await checkLLMRateLimit())) {
      return;
    }

    logInfo('Running bot management...');

    // Get bot failure analysis
    const { data: bots } = await supabase
      .from('bots')
      .select('id, name, is_active');

    if (!bots || bots.length === 0) {
      return;
    }

    for (const bot of bots) {
      const { data: analysis } = await supabase.rpc('ai_analyze_bot_failures', {
        bot_id_param: bot.id,
        hours_back: 24
      });

      if (!analysis || analysis.length === 0) continue;

      const botAnalysis = analysis[0];
      
      // Check if bot should be deactivated
      if (botAnalysis.recommendation?.includes('deactivate') && bot.is_active) {
        // Validate with policy guard
        const approved = guard.validate({
          action: 'deactivate_bot',
          bot_id: bot.id,
          error_count: botAnalysis.error_count,
          reasoning: botAnalysis.recommendation
        });

        if (!approved) {
          logWarning(`Bot deactivation rejected for ${bot.name}`);
          continue;
        }

        // Deactivate bot
        await supabase.from('bots').update({ is_active: false })
          .eq('id', bot.id);

        // Log action
        await supabase.from('audit_log').insert({
          event_type: 'ai_bot_deactivated',
          payload: {
            bot_id: bot.id,
            bot_name: bot.name,
            error_count: botAnalysis.error_count,
            reasoning: botAnalysis.recommendation
          }
        });

        logInfo(`Bot deactivated: ${bot.name} (${botAnalysis.error_count} errors)`);
        
        // Track token spend
        await trackTokenSpend(300);
      }

      // Check if bot should be reactivated (after fixes)
      if (botAnalysis.recommendation?.includes('operating normally') && !bot.is_active) {
        // Only reactivate if manually flagged for reactivation
        // (safer to require manual intervention)
        const reactivationFlag = await redis.get(`bot:${bot.id}:reactivate`);
        if (reactivationFlag === 'true') {
          await supabase.from('bots').update({ is_active: true })
            .eq('id', bot.id);
          await redis.del(`bot:${bot.id}:reactivate`);
          logInfo(`Bot reactivated: ${bot.name}`);
        }
      }
    }
  }, { operation: 'bot_management' }) || undefined;
}

/**
 * 3. Moderation Threshold Adjustment
 * Adjusts moderation settings per room based on health metrics
 */
export async function adjustModerationThresholds(): Promise<void> {
  return safeAIOperation('adjustModerationThresholds', async () => {
    // Check rate limit
    if (!(await checkLLMRateLimit())) {
      return;
    }

    logInfo('Running moderation threshold adjustment...');

    // Get moderation recommendations
    const { data: recommendations } = await supabase.rpc('ai_moderation_recommendations', {
      room_id_param: null // All rooms
    });

    if (!recommendations || recommendations.length === 0) {
      return;
    }

    for (const rec of recommendations) {
      // Check if auto-moderation should be enabled
      if (rec.suggested_action?.includes('auto-moderation')) {
        // Get current room settings
        const { data: room } = await supabase
          .from('rooms')
          .select('id, metadata')
          .eq('id', rec.room_id)
          .single();

        if (!room) continue;

        const currentMetadata = room.metadata || {};
        const newMetadata = {
          ...currentMetadata,
          auto_moderation: true,
          // @llm_param - Toxicity threshold for auto-moderation. LLM adjusts this based on room health metrics.
          toxicity_threshold: Math.max(0.5, (rec.avg_toxicity || 0.7) * 0.9), // Lower threshold
          moderation_enabled_at: new Date().toISOString()
        };

        // Validate with policy guard
        const approved = guard.validate({
          action: 'enable_auto_moderation',
          room_id: rec.room_id,
          flagged_rate: rec.flagged_rate,
          avg_toxicity: rec.avg_toxicity,
          reasoning: rec.recommendation
        });

        if (!approved) {
          logWarning(`Auto-moderation enablement rejected for room ${rec.room_id}`);
          continue;
        }

        // Update room settings
        await supabase.from('rooms').update({ metadata: newMetadata })
          .eq('id', rec.room_id);

        // Log action
        await supabase.from('audit_log').insert({
          event_type: 'ai_moderation_enabled',
          payload: {
            room_id: rec.room_id,
            flagged_rate: rec.flagged_rate,
            avg_toxicity: rec.avg_toxicity,
            new_threshold: newMetadata.toxicity_threshold,
            reasoning: rec.recommendation
          }
        });

        logInfo(`Auto-moderation enabled for room ${rec.room_id} (threshold: ${newMetadata.toxicity_threshold})`);
        
        // Track token spend
        await trackTokenSpend(400);
      }
    }
  }, { operation: 'moderation_threshold_adjustment' }) || undefined;
}

/**
 * 4. Cache TTL Optimization
 * Adjusts cache TTLs based on hit rates and data freshness needs
 */
export async function optimizeCacheTTL(): Promise<void> {
  return safeAIOperation('optimizeCacheTTL', async () => {
    // Check rate limit
    if (!(await checkLLMRateLimit())) {
      return;
    }

    logInfo('Running cache TTL optimization...');

    // Get cache metrics
    const { data: cacheMetrics } = await supabase
      .from('metrics')
      .select('*')
      .eq('type', 'cache_hit_rate')
      .gte('timestamp', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (!cacheMetrics || cacheMetrics.length === 0) {
      return;
    }

    // Analyze with LLM
    const analysis = await reasoner.analyze({
      context: {
        metrics: cacheMetrics,
        currentTTLs: llmParamManager.getAutomation().cacheTTLs // Get from centralized config
      },
      prompt: `Analyze cache hit rates. Should we increase or decrease TTLs? 
      Consider: high hit rate = increase TTL, low hit rate = decrease TTL, stale data complaints = decrease TTL.`
    });

    if (analysis.action === 'adjust_cache_ttl' && analysis.recommendedTTLs) {
      // Validate with policy guard
      const approved = guard.validate({
        action: 'adjust_cache_ttl',
        reasoning: analysis.reasoning
      });
      if (!approved) {
        logWarning('Cache TTL adjustment rejected by policy guard');
        return;
      }

      // Apply new TTLs
      const newTTLs = analysis.recommendedTTLs;
      await redis.set('cache:ttl:l1', newTTLs.l1 || 60000);
      await redis.set('cache:ttl:l2', newTTLs.l2 || 300000);

      // Log action
      await supabase.from('audit_log').insert({
        event_type: 'ai_cache_ttl_adjustment',
        payload: {
          old_ttls: { l1: 60000, l2: 300000 },
          new_ttls: newTTLs,
          reasoning: analysis.reasoning
        }
      });

      logInfo(`Cache TTLs adjusted: L1=${newTTLs.l1}ms, L2=${newTTLs.l2}ms`);
      
      // Track token spend
      await trackTokenSpend(400);
    }
  }, { operation: 'cache_ttl_optimization' }) || undefined;
}

/**
 * 5. Database Index Management
 * Creates indexes for slow queries, removes unused indexes
 */
export async function optimizeIndexes(): Promise<void> {
  return safeAIOperation('optimizeIndexes', async () => {
    // Check rate limit
    if (!(await checkLLMRateLimit())) {
      return;
    }

    logInfo('Running index optimization...');

    // Get slow queries
    const { data: slowQueries } = await supabase
      .from('ai_query_performance')
      .select('*')
      .eq('performance_category', 'slow')
      .limit(10);

    if (!slowQueries || slowQueries.length === 0) {
      return;
    }

    for (const query of slowQueries) {
      // Analyze query pattern
      const analysis = await reasoner.analyze({
        context: {
          query: query.event,
          latency: query.latency_ms,
          room_id: query.room_id
        },
        prompt: `This query is slow (${query.latency_ms}ms). What database index should we create to optimize it? 
        Provide: table_name, columns (array), index_name, index_type (btree/gin/gist).`
      });

      if (analysis.action === 'create_index' && analysis.index) {
        // Validate with policy guard
        const approved = guard.validate({
          action: 'create_index',
          table: analysis.index.table_name,
          columns: analysis.index.columns,
          reasoning: analysis.reasoning
        });

        if (!approved) {
          logWarning(`Index creation rejected: ${analysis.index.index_name}`);
          continue;
        }

        // Create index via SQL function (would need to be created)
        // For now, log recommendation
        await supabase.from('audit_log').insert({
          event_type: 'ai_index_recommendation',
          payload: {
            query: query.event,
            latency: query.latency_ms,
            recommended_index: analysis.index,
            reasoning: analysis.reasoning,
            sql: `CREATE INDEX IF NOT EXISTS ${analysis.index.index_name} ON ${analysis.index.table_name} (${analysis.index.columns.join(', ')}) USING ${analysis.index.index_type}`
          }
        });

        logInfo(`Index recommended: ${analysis.index.index_name} on ${analysis.index.table_name}`);
        
        // Track token spend
        await trackTokenSpend(600);
      }
    }
  }, { operation: 'index_optimization' }) || undefined;
}

/**
 * Run all automations
 */
export async function runAllAutomations(): Promise<void> {
  logInfo('Running all AI automations...');
  
  await Promise.all([
    optimizeRateLimits(),
    manageBots(),
    adjustModerationThresholds(),
    optimizeCacheTTL(),
    optimizeIndexes()
  ]);
  
  logInfo('All AI automations completed');
}

