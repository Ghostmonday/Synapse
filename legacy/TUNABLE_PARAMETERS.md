# Tunable Parameters & Control Variables

**Date**: 2025-01-27  
**Status**: Complete Reference

---

## Overview

This document lists all tunable parameters and control variables in the Sinapse system, organized by category and control type.

**Control Types:**
- **UI**: User can modify via interface
- **AGENT**: LLM agent can modify autonomously
- **MANUAL**: Requires manual code/env override
- **HYBRID**: Multiple control methods available

---

## 1. LLM Model Selection 🧠

| Parameter | Default | Range | Control | Adjustable By |
|-----------|---------|-------|---------|---------------|
| `models.reasoning` | `gpt-4` | Any OpenAI/DeepSeek model | HYBRID | User, Agent, Environment |
| `models.prediction` | `gpt-4` | Any OpenAI/DeepSeek model | HYBRID | User, Agent, Environment |
| `models.automation` | `deepseek-chat` | Any OpenAI/DeepSeek model | HYBRID | User, Agent, Environment |
| `models.optimizer` | `gpt-4` | Any OpenAI/DeepSeek model | HYBRID | User, Agent, Environment |
| `models.assistants` | `gpt-4` | Per tier: Starter (gpt-3.5), Pro (gpt-4), Enterprise (all) | **UI** | **User** |
| `models.embeddings` | `text-embedding-3-small` | OpenAI embedding models | HYBRID | User, Agent, Environment |

---

## 2. Temperature & Creativity 🌡️

| Parameter | Default | Range | Control | Adjustable By |
|-----------|---------|-------|---------|---------------|
| `temperature.reasoning` | `0.0` | 0.0 - 2.0 | HYBRID | User, Agent |
| `temperature.prediction` | `0.0` | 0.0 - 2.0 | HYBRID | User, Agent |
| `temperature.automation` | `0.3` | 0.0 - 2.0 | HYBRID | User, Agent |
| `temperature.assistants` | `0.7` | 0.0 - 2.0 | **UI** | **User** |
| `temperature.optimizer` | `0.0` | 0.0 - 2.0 | HYBRID | User, Agent |

**Tier-Based Limits:**
- **Starter**: 0.3 - 0.9 (no extreme creativity)
- **Professional**: 0.0 - 1.5 (full creative range)
- **Enterprise**: 0.0 - 2.0 (experimental creativity)

---

## 3. Token Limits & Costs 💰

| Parameter | Default | Range | Control | Adjustable By |
|-----------|---------|-------|---------|---------------|
| `tokens.maxTokensReasoning` | `800` | 100 - 4000 | AGENT | Agent |
| `tokens.maxTokensPrediction` | `800` | 100 - 4000 | AGENT | Agent |
| `tokens.maxTokensAutomation` | `1000` | 100 - 4000 | AGENT | Agent |
| `tokens.maxTokensOptimizer` | `800` | 100 - 4000 | AGENT | Agent |
| `tokens.costPer1k` | `0.0001` | Fixed | MANUAL | Manual |
| `tokens.dailySpendLimit` | `25` | 5 - 100 | AGENT | Agent |
| `tokens.warningThreshold` | `22.5` | 90% of limit | AGENT | Agent |

**Tier-Based Limits:**
- **Starter**: 500 tokens max, $5/day limit
- **Professional**: 1,500 tokens max, $25/day limit
- **Enterprise**: 4,000 tokens max, $100/day limit

---

## 4. Rate Limiting & Throttling ⏱️

| Parameter | Default | Range | Control | Adjustable By |
|-----------|---------|-------|---------|---------------|
| `rateLimits.maxCallsPerHour` | `100` | 20 - 500 | AGENT | Agent |
| `rateLimits.windowMs` | `3600000` | Fixed (1 hour) | MANUAL | Manual |
| `rateLimits.hourlyLimit` | `100` | 20 - 500 | AGENT | Agent |
| `rateLimits.warningThreshold` | `90` | 80% - 95% of limit | AGENT | Agent |
| `rateLimits.errorBackoffMs` | `300000` | Fixed (5 min) | **MANUAL** | Manual (Safety) |
| `rateLimits.analysisTimeoutMs` | `30000` | Fixed (30 sec) | **MANUAL** | Manual (Safety) |
| `rateLimits.heartbeatTimeoutMs` | `30000` | Fixed (30 sec) | **MANUAL** | Manual (Safety) |

**Tier-Based Limits:**
- **Starter**: 20 requests/hour
- **Professional**: 100 requests/hour
- **Enterprise**: 500 requests/hour

---

## 5. Moderation Thresholds 🛡️

| Parameter | Default | Range | Control | Adjustable By |
|-----------|---------|-------|---------|---------------|
| `moderation.thresholds.default` | `0.6` | 0.0 - 1.0 | AGENT | Agent |
| `moderation.thresholds.illegal` | `0.7` | **0.7 - 1.0** | AGENT | Agent (Min: 0.7) |
| `moderation.thresholds.threat` | `0.6` | **0.6 - 1.0** | AGENT | Agent (Min: 0.6) |
| `moderation.thresholds.pii` | `0.65` | **0.65 - 1.0** | AGENT | Agent (Min: 0.65) |
| `moderation.thresholds.hate` | `0.55` | 0.0 - 1.0 | AGENT | Agent |
| `moderation.thresholds.adult` | `0.0` | 0.0 - 1.0 | AGENT | Agent (Disabled) |
| `moderation.thresholds.probationMultiplier` | `0.5` | 0.0 - 1.0 | AGENT | Agent |
| `moderation.thresholds.toxicityHigh` | `0.8` | 0.0 - 1.0 | AGENT | Agent |
| `moderation.thresholds.toxicityModerate` | `0.6` | 0.0 - 1.0 | AGENT | Agent |
| `moderation.maxRepetition` | `20` | 1 - 100 | AGENT | Agent |
| `moderation.maxContentLength` | `50000` | Fixed | **MANUAL** | Manual (Safety) |

**Safety Note**: Illegal, threat, and PII thresholds have minimum values that cannot be decreased.

---

## 6. Performance Boundaries ⚡

| Parameter | Default | Range | Control | Adjustable By |
|-----------|---------|-------|---------|---------------|
| `performance.latencyMax` | `200` | 100 - 1000 ms | AGENT | Agent |
| `performance.latencyMin` | `0` | 0 - 100 ms | AGENT | Agent |
| `performance.errorRateMax` | `10` | 1 - 20% | AGENT | Agent |
| `performance.errorRateMin` | `0` | 0 - 5% | AGENT | Agent |

---

## 7. AI Automation Parameters 🤖

| Parameter | Default | Range | Control | Adjustable By |
|-----------|---------|-------|---------|---------------|
| `automation.rateLimits.global` | `100` | 50 - 500 /min | AGENT | Agent |
| `automation.rateLimits.ip` | `1000` | 500 - 5000 /min | AGENT | Agent |
| `automation.rateLimits.user` | `100` | 50 - 500 /min | AGENT | Agent |
| `automation.cacheTTLs.l1` | `60000` | 30000 - 300000 ms | AGENT | Agent |
| `automation.cacheTTLs.l2` | `300000` | 60000 - 1800000 ms | AGENT | Agent |

---

## 8. Semantic Search Parameters 🔍

| Parameter | Default | Range | Control | Adjustable By |
|-----------|---------|-------|---------|---------------|
| `search.matchThreshold` | `0.78` | 0.1 - 1.0 | **HYBRID** | **User, Agent** |
| `search.matchCount` | `10` | 1 - 100 | **HYBRID** | **User, Agent** |

**Tier-Based Limits:**
- **Starter**: 5 results max, threshold 0.85
- **Professional**: 20 results max, threshold 0.5-0.95 (user-configurable)
- **Enterprise**: 100 results max, threshold 0.0-1.0 (fully configurable)

---

## 9. Maintenance Window 🕐

| Parameter | Default | Range | Control | Adjustable By |
|-----------|---------|-------|---------|---------------|
| `maintenance.windowStartHour` | `3` | 0 - 23 | **MANUAL** | Manual (Safety) |
| `maintenance.windowEndHour` | `5` | 0 - 23 | **MANUAL** | Manual (Safety) |
| `maintenance.timezone` | `UTC` | Any timezone | **MANUAL** | Manual (Safety) |

**Safety Note**: Cannot be auto-adjusted. Requires manual override and restart.

---

## 10. Subscription Tier Parameters 💎

### Starter Tier ($9/month)
- **Daily Tokens**: 50K (~$5/day)
- **Max Response Length**: 500 tokens
- **Available Models**: GPT-3.5-turbo only
- **Max Assistants**: 1
- **Autonomy Level**: DISABLED
- **A/B Testing**: View-only
- **Temperature Range**: 0.3 - 0.9
- **Search Depth**: 5 results max
- **Search Threshold**: 0.85

### Professional Tier ($29/month)
- **Daily Tokens**: 250K (~$25/day)
- **Max Response Length**: 1,500 tokens
- **Available Models**: GPT-3.5-turbo, GPT-4
- **Max Assistants**: 5
- **Autonomy Level**: RECOMMENDATIONS
- **A/B Testing**: Create up to 5 concurrent
- **Temperature Range**: 0.0 - 1.5
- **Search Depth**: 20 results max
- **Search Threshold**: 0.5 - 0.95 (user-configurable)
- **Burst Allowance**: 2x daily limit for 3 days/month

### Enterprise Tier ($99/month)
- **Daily Tokens**: 1M (~$100/day)
- **Max Response Length**: 4,000 tokens
- **Available Models**: All (GPT-3.5, GPT-4, DeepSeek, Claude)
- **Max Assistants**: Unlimited
- **Autonomy Level**: FULL_AUTO
- **A/B Testing**: Unlimited
- **Temperature Range**: 0.0 - 2.0 (experimental)
- **Search Depth**: 100 results max
- **Search Threshold**: 0.0 - 1.0 (fully configurable)
- **Burst Allowance**: Unlimited (with monitoring)
- **Token Cost**: $0.00008 per 1K (20% discount)

---

## 11. Feature Flags 🚩

### Feature Access (Tier-Based)
| Feature | Starter | Professional | Enterprise |
|---------|---------|--------------|------------|
| `feature.abTesting` | ❌ | ✅ (5 max) | ✅ (Unlimited) |
| `feature.gpt4Access` | ❌ | ✅ | ✅ |
| `feature.advancedEmotionalMonitoring` | ❌ | ✅ | ✅ |
| `feature.predictiveAnalytics` | ❌ | ❌ | ✅ |
| `feature.customEmbeddings` | ❌ | ❌ | ✅ |
| `feature.prioritySupport` | ❌ | ❌ | ✅ |
| `feature.autonomyExecutor` | ❌ | ✅ (Recommendations) | ✅ (Full Auto) |
| `feature.fullAutonomy` | ❌ | ❌ | ✅ |
| `feature.multipleAssistants` | ❌ (1) | ✅ (5) | ✅ (Unlimited) |
| `feature.enterpriseModels` | ❌ | ❌ | ✅ |

---

## 12. Environment Variables 🔧

| Variable | Default | Description | Control |
|----------|---------|-------------|---------|
| `DEEPSEEK_API_KEY` | None | Enables DeepSeek model access | Environment |
| `OPENAI_API_KEY` | Required | OpenAI API key | Environment |
| `BLOCKED_WORDS` | Environment | Blocked words list for moderation | Environment |

---

## Parameter Adjustment Summary

### User-Configurable (UI) ✅
- Assistant model selection (`models.assistants`)
- Assistant temperature (`temperature.assistants`)
- Semantic search threshold (`search.matchThreshold`)
- Semantic search result count (`search.matchCount`)

### LLM Agent-Configurable (AGENT) ✅
- Rate limits (global, IP, user)
- Cache TTLs (L1, L2)
- Moderation thresholds (all categories, with minimums)
- Toxicity thresholds (per-room)
- Token spending limits
- API call limits
- Performance boundaries (latency, error rate)
- Model selection (reasoning, prediction, automation, optimizer)

### Manual/Code-Configurable (MANUAL) ⚠️
- Maintenance window hours
- Content length limits
- Error backoff duration
- Analysis timeout
- Heartbeat timeout
- Token cost per 1K
- Blocked words list

### Critical Parameters (Never Auto-Adjust) 🚨
- ❌ `maintenance.windowStartHour` / `windowEndHour`
- ❌ `rateLimits.analysisTimeoutMs`
- ❌ `rateLimits.heartbeatTimeoutMs`
- ❌ `rateLimits.errorBackoffMs`
- ❌ `moderation.maxContentLength`
- ❌ `moderation.thresholds.illegal` (minimum: 0.7)
- ❌ `moderation.thresholds.threat` (minimum: 0.6)
- ❌ `moderation.thresholds.pii` (minimum: 0.65)

---

## Quick Reference

### Total Parameters: **61**
- **User-Configurable**: 4
- **LLM Agent-Configurable**: 20
- **Environment-Configurable**: 3
- **Manual/Code-Configurable**: 34

### Configuration Files
- `src/config/llm-params.config.ts` - Centralized parameter definitions
- `src/services/llm-parameter-manager.ts` - Runtime parameter manager
- `config/llm-params-runtime.json` - Runtime configuration persistence
- `frontend/iOS/Models/SubscriptionTier.swift` - Tier-based feature gates

---

## Usage Notes

1. **Search for parameters**: Use `@llm_param` comment tag in codebase
2. **Adjust via UI**: User-configurable parameters have UI controls
3. **Adjust via Agent**: LLM agents can modify agent-configurable parameters via `ai-automation.ts`
4. **Safety boundaries**: Critical parameters have minimum/maximum values enforced
5. **Tier limits**: Subscription tier determines maximum values for many parameters

---

**Last Updated**: 2025-01-27

