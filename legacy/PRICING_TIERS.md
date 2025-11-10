# Sinapse AI Pricing Tiers

**Date**: 2025-01-27  
**Status**: Recommended Pricing Strategy

---

## Overview

Three-tier pricing model balancing accessibility, value, and premium features while maintaining safety guardrails across all tiers.

---

## 🥉 **STARTER TIER** - $9/month

*"Essential AI for Personal Use"*

### Token Usage
- **Daily Token Limit**: $5 worth (~50K tokens)
- **Monthly Total**: ~1.5M tokens
- **Token Cost**: Standard rate ($0.0001 per 1K)

### Response Capabilities
- **Max Response Length**: 500 tokens
- **Model Access**: GPT-3.5-turbo only
- **Temperature Range**: 0.3-0.9 (no extreme creativity)
- **Rate Limit**: 20 requests/hour

### Search & Discovery
- **Semantic Search Depth**: 5 results max
- **Search Threshold**: 0.85 (higher precision, fewer results)
- **Embedding Model**: text-embedding-3-small

### Automation
- **Autonomy Executor**: Disabled
- **A/B Testing**: View-only (see experiments, no creation)
- **Emotional Monitoring**: Basic metrics only
- **Watchdog Recommendations**: Read-only

### Features
- ✅ 1 AI Assistant
- ✅ Basic moderation (standard thresholds)
- ✅ Manual label smoothing
- ✅ Basic telemetry dashboard
- ❌ Custom models
- ❌ Automation actions
- ❌ Priority support

---

## 🥈 **PROFESSIONAL TIER** - $29/month

*"Advanced AI for Teams"*

### Token Usage
- **Daily Token Limit**: $25 worth (~250K tokens)
- **Monthly Total**: ~7.5M tokens
- **Token Cost**: Standard rate ($0.0001 per 1K)
- **Burst Allowance**: 2x daily limit for 3 days/month

### Response Capabilities
- **Max Response Length**: 1,500 tokens
- **Model Access**: GPT-4, GPT-3.5-turbo
- **Temperature Range**: 0.0-1.5 (full creative range)
- **Rate Limit**: 100 requests/hour

### Search & Discovery
- **Semantic Search Depth**: 20 results max
- **Search Threshold**: User-configurable (0.5-0.95)
- **Embedding Model**: text-embedding-3-small or text-embedding-ada-002
- **Multi-query Search**: Up to 3 parallel searches

### Automation
- **Autonomy Executor**: Enabled (recommendations only)
- **A/B Testing**: Create up to 5 concurrent experiments
- **Emotional Monitoring**: Real-time curves with alerts
- **Watchdog Recommendations**: Applied with approval
- **Rollback Protection**: Automatic checkpoints

### Features
- ✅ 5 AI Assistants
- ✅ Custom temperature per assistant
- ✅ Adjustable moderation thresholds
- ✅ Auto label smoothing on dropoffs
- ✅ Advanced telemetry with derivable metrics
- ✅ Journey analytics
- ✅ Performance monitoring
- ❌ Fully autonomous actions
- ❌ Custom embeddings

---

## 💎 **ENTERPRISE TIER** - $99/month

*"Autonomous AI Operations"*

### Token Usage
- **Daily Token Limit**: $100 worth (~1M tokens)
- **Monthly Total**: ~30M tokens
- **Token Cost**: Discounted rate ($0.00008 per 1K) - 20% savings
- **Burst Allowance**: Unlimited burst with monitoring
- **Overage Protection**: Soft limits with alerts

### Response Capabilities
- **Max Response Length**: 4,000 tokens
- **Model Access**: All models including DeepSeek, Claude (when integrated)
- **Temperature Range**: 0.0-2.0 (experimental creativity)
- **Rate Limit**: 500 requests/hour
- **Priority Queue**: Jump ahead of other tiers

### Search & Discovery
- **Semantic Search Depth**: 100 results max
- **Search Threshold**: Fully configurable (0.0-1.0)
- **Embedding Model**: Choice of any available model
- **Multi-query Search**: Unlimited parallel searches
- **Custom Embeddings**: Train on your data
- **Hybrid Search**: Combine semantic + keyword

### Automation
- **Autonomy Executor**: Fully autonomous mode
- **A/B Testing**: Unlimited experiments
- **Emotional Monitoring**: Predictive analytics
- **Watchdog Recommendations**: Auto-applied with ML confidence
- **Rollback Protection**: Time-travel to any checkpoint
- **Custom Strategy Templates**: Define your own patterns
- **Automation Frequency**: Real-time (no polling delay)

### Features
- ✅ Unlimited AI Assistants
- ✅ Custom models per assistant
- ✅ Full parameter control (all 61 parameters)
- ✅ ML-driven threshold optimization
- ✅ Predictive dropoff prevention
- ✅ Custom watchdog strategies
- ✅ White-label telemetry
- ✅ API access for automation
- ✅ Dedicated support channel
- ✅ SLA guarantees

---

## Feature Gating Strategy

### Code-Level Gates

```typescript
// Token limits
const TOKEN_LIMITS = {
  STARTER: 5,      // $5/day
  PROFESSIONAL: 25, // $25/day
  ENTERPRISE: 100   // $100/day
};

// Response length
const MAX_TOKENS = {
  STARTER: 500,
  PROFESSIONAL: 1500,
  ENTERPRISE: 4000
};

// Model access
const AVAILABLE_MODELS = {
  STARTER: ['gpt-3.5-turbo'],
  PROFESSIONAL: ['gpt-3.5-turbo', 'gpt-4'],
  ENTERPRISE: ['gpt-3.5-turbo', 'gpt-4', 'deepseek-chat', 'claude-3']
};

// Automation levels
const AUTONOMY_LEVEL = {
  STARTER: 'DISABLED',
  PROFESSIONAL: 'RECOMMENDATIONS',
  ENTERPRISE: 'FULL_AUTO'
};
```

### UI-Level Gates

1. **Starter**: Hide automation controls, show "Upgrade" CTAs
2. **Professional**: Show controls with approval workflows
3. **Enterprise**: Full control panel with ML insights

---

## Parameters That Stay Flat (Safety)

These parameters remain constant across all tiers for safety:

### Always Fixed
- ❌ `ANALYSIS_TIMEOUT`: 30 seconds (prevents hanging)
- ❌ `HEARTBEAT_TIMEOUT`: 30 seconds (dead loop detection)
- ❌ `ERROR_BACKOFF_DURATION`: 5 minutes (prevents cascading failures)
- ❌ `maintenance_window`: 3-5 AM UTC (system maintenance)
- ❌ `content.length`: 50,000 chars (prevents abuse)
- ❌ `BLOCKED_WORDS`: Same list for all (legal compliance)

### Minimum Thresholds (Can Increase, Not Decrease)
- `moderation_thresholds.illegal`: 0.7 minimum
- `moderation_thresholds.threat`: 0.6 minimum
- `moderation_thresholds.pii`: 0.65 minimum

---

## Parameters That Justify Premium Pricing

### 🌟 **High-Value Parameters** (Enterprise Only)

1. **Full Autonomy Control**
   - `AUTONOMY_LEVEL`: 'FULL_AUTO'
   - Worth $40+/month alone
   - Saves hours of manual optimization

2. **Unlimited Token Burst**
   - No hard caps, only monitoring
   - Worth $20+/month for power users

3. **Custom Model Selection**
   - Access to DeepSeek, Claude, custom fine-tunes
   - Worth $15+/month for quality

4. **Real-time Automation**
   - No polling delays, instant reactions
   - Worth $10+/month for responsiveness

### 💰 **Mid-Value Parameters** (Professional+)

1. **A/B Testing Creation**
   - Create and manage experiments
   - Worth $10/month

2. **Adjustable Search Thresholds**
   - Fine-tune precision/recall
   - Worth $5/month

3. **Multi-Assistant Support**
   - 5 assistants vs 1
   - Worth $5/month

### 📊 **Base-Value Parameters** (All Tiers)

1. **Read-Only Telemetry**
   - View metrics but not act
   - Included in base price

2. **Standard Moderation**
   - Same safety for all
   - Included in base price

---

## Upgrade Incentives

### Starter → Professional
- "Your validation error rate is 35%. Upgrade to auto-smooth labels!"
- "You've hit your daily token limit 3 times this week. Go Pro for 5x more!"
- "Unlock GPT-4 for 10x better responses"

### Professional → Enterprise
- "Your A/B test shows 40% improvement. Go Enterprise for auto-deployment!"
- "Emotional volatility detected. Enterprise predicts and prevents dropoffs!"
- "Save $0.00002 per token with Enterprise volume pricing"

---

## Implementation Priority

### Phase 1 (Week 1)
- [ ] Implement token limit gating
- [ ] Gate model selection
- [ ] Create billing integration

### Phase 2 (Week 2)
- [ ] Gate automation features
- [ ] Implement A/B test limits
- [ ] Add upgrade CTAs

### Phase 3 (Week 3)
- [ ] Add usage analytics
- [ ] Implement soft limits
- [ ] Create downgrade flows

---

## Revenue Projections

Assuming 1,000 users:
- 70% Starter (700 × $9) = $6,300/month
- 25% Professional (250 × $29) = $7,250/month
- 5% Enterprise (50 × $99) = $4,950/month
- **Total MRR**: $18,500

## Key Differentiators

1. **Safety First**: Critical parameters locked across all tiers
2. **Value Scaling**: Each tier unlocks exponentially more value
3. **Usage-Based**: Token limits prevent abuse while allowing growth
4. **Automation Journey**: Natural progression from manual → assisted → autonomous
5. **Transparent Limits**: Users see exactly what they get

---

**Recommendation**: Launch with these three tiers and monitor upgrade/downgrade patterns. Adjust token limits and feature gates based on actual usage data.
