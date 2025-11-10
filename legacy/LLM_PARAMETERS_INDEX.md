# LLM Parameters Index

**Date**: 2025-01-27  
**Status**: ✅ **COMPLETE**

---

## Overview

This document catalogs all LLM-controlled variables, constants, enums, and configuration structures in the Sinapse codebase. These parameters influence AI behavior, response style, content filtering, generation pacing, temperature, and can be adjusted by users, LLM agents, or feedback loops.

All parameters are marked with `// @llm_param` comments in the source code for easy identification.

---

## Parameter Categories

### 1. **LLM Model Selection** 🧠

Parameters that control which AI model is used for different operations.

| Parameter | Location | Default | Description | Adjustable By |
|-----------|----------|---------|-------------|---------------|
| `model` (reasoning) | `src/autonomy/llm_reasoner.ts:57` | `'gpt-4'` | LLM model for telemetry analysis and repair suggestions | Environment, Code |
| `model` (prediction) | `src/autonomy/llm_reasoner.ts:145` | `'gpt-4'` | LLM model for failure prediction | Environment, Code |
| `model` (automation) | `src/autonomy/llm_reasoner.ts:235` | `'deepseek-chat'` or `'gpt-4'` | Model for AI automation analysis (auto-selects DeepSeek if available) | Environment |
| `model` (optimizer) | `src/optimizer/index.ts:34` | `'gpt-4'` | Model for Prometheus metrics optimization | Code |
| `model` (assistants) | `sql/10_integrated_features.sql:19` | `'gpt-4'` | Per-assistant model selection (user-configurable) | **User (UI)** |
| `model` (embeddings) | `src/services/embeddings-service.ts:9` | `'text-embedding-3-small'` | Embedding model for semantic search | Code |
| `model` (embeddings DB) | `sql/10_integrated_features.sql:92` | `'text-embedding-3-small'` | Embedding model stored per embedding | Database |

---

### 2. **Temperature & Creativity** 🌡️

Parameters that control randomness and creativity in LLM outputs.

| Parameter | Location | Default | Range | Description | Adjustable By |
|-----------|----------|---------|-------|-------------|---------------|
| `temperature` (reasoning) | `src/autonomy/llm_reasoner.ts:67` | `0.0` | 0.0-2.0 | Deterministic output for reasoning (no randomness) | Code |
| `temperature` (prediction) | `src/autonomy/llm_reasoner.ts:154` | `0.0` | 0.0-2.0 | Deterministic predictions | Code |
| `temperature` (automation) | `src/autonomy/llm_reasoner.ts:245` | `0.3` | 0.0-2.0 | Slight creativity for better problem-solving | Code |
| `temperature` (assistants) | `sql/10_integrated_features.sql:21` | `0.7` | 0.0-2.0 | Per-assistant temperature (user-configurable) | **User (UI)** |
| `temperature` (invokeLLM) | `src/services/llm-service.ts:18` | Variable | 0.0-2.0 | Temperature parameter for generic LLM invocation | Function parameter |
| `temperature` (optimizer) | `src/optimizer/index.ts:42` | `0.0` | 0.0-2.0 | Deterministic optimizer recommendations | Code |

---

### 3. **Token Limits & Costs** 💰

Parameters that control response length and cost management.

| Parameter | Location | Default | Description | Adjustable By |
|-----------|----------|---------|-------------|---------------|
| `max_tokens` (reasoning) | `src/autonomy/llm_reasoner.ts:69` | `800` | Maximum tokens for reasoning responses | Code |
| `max_tokens` (prediction) | `src/autonomy/llm_reasoner.ts:156` | `800` | Maximum tokens for failure prediction | Code |
| `max_tokens` (automation) | `src/autonomy/llm_reasoner.ts:247` | `1000` | Maximum tokens for automation analysis | Code |
| `max_tokens` (optimizer) | `src/optimizer/index.ts:40` | `800` | Maximum tokens for optimizer recommendations | Code |
| `TOKEN_COST_PER_1K` | `src/services/ai-safeguards.ts:355` | `0.0001` | Cost per 1K tokens for spend tracking | Code |
| `tokenSpend.dailyLimit` | `src/services/ai-safeguards.ts:264` | `25` | Daily token spending limit in dollars | **LLM Agent** |
| `tokenSpend.warningThreshold` | `src/services/ai-safeguards.ts:264` | `22.5` | Warning threshold (90% of limit) | **LLM Agent** |

---

### 4. **Rate Limiting & Throttling** ⏱️

Parameters that control API call frequency and prevent abuse.

| Parameter | Location | Default | Description | Adjustable By |
|-----------|----------|---------|-------------|---------------|
| `LLM_RATE_LIMIT_MAX` | `src/services/ai-safeguards.ts:29` | `100` | Maximum LLM API calls per hour | **LLM Agent** |
| `LLM_RATE_LIMIT_WINDOW` | `src/services/ai-safeguards.ts:31` | `3600000` | Rate limit window in milliseconds (1 hour) | **LLM Agent** |
| `apiCalls.hourlyLimit` | `src/services/ai-safeguards.ts:266` | `100` | Hourly API call limit | **LLM Agent** |
| `apiCalls.warningThreshold` | `src/services/ai-safeguards.ts:266` | `90` | Warning threshold (90% of limit) | **LLM Agent** |
| `ERROR_BACKOFF_DURATION` | `src/services/ai-safeguards.ts:89` | `300000` | Wait time after errors (5 minutes) | **LLM Agent** |
| `ANALYSIS_TIMEOUT` | `src/services/ai-safeguards.ts:141` | `30000` | Maximum time for LLM analysis (30 seconds) | **LLM Agent** |
| `HEARTBEAT_TIMEOUT` | `src/services/ai-safeguards.ts:430` | `30000` | Maximum time without heartbeat (30 seconds) | **LLM Agent** |

---

### 5. **Moderation Thresholds** 🛡️

Parameters that control content filtering and moderation sensitivity.

| Parameter | Location | Default | Description | Adjustable By |
|-----------|----------|---------|-------------|---------------|
| `moderation_thresholds.default` | `sql/01_sinapse_schema.sql:250` | `0.6` | Default moderation threshold | **LLM Agent** |
| `moderation_thresholds.illegal` | `sql/01_sinapse_schema.sql:252` | `0.7` | Illegal content threshold | **LLM Agent** |
| `moderation_thresholds.threat` | `sql/01_sinapse_schema.sql:254` | `0.6` | Threat detection threshold | **LLM Agent** |
| `moderation_thresholds.pii` | `sql/01_sinapse_schema.sql:256` | `0.65` | PII detection threshold | **LLM Agent** |
| `moderation_thresholds.hate` | `sql/01_sinapse_schema.sql:258` | `0.55` | Hate speech threshold | **LLM Agent** |
| `moderation_thresholds.adult` | `sql/01_sinapse_schema.sql:260` | `0.0` | Adult content threshold (0.0 = disabled) | **LLM Agent** |
| `moderation_thresholds.probation_multiplier` | `sql/01_sinapse_schema.sql:262` | `0.5` | Multiplier for users on probation (lower = stricter) | **LLM Agent** |
| `toxicity_threshold` (room) | `src/services/ai-automation.ts:224` | Variable | Per-room toxicity threshold (LLM-adjusted) | **LLM Agent** |
| `toxicity_score > 0.7` | `sql/11_indexing_and_rls.sql:299` | `0.7` | High-risk classification threshold | Code |
| `toxicity_score > 0.8` | `sql/11_indexing_and_rls.sql:432` | `0.8` | High toxicity recommendation threshold | Code |
| `toxicity_score > 0.6` | `sql/11_indexing_and_rls.sql:433` | `0.6` | Moderate toxicity monitoring threshold | Code |
| `maxRepetition` | `src/middleware/moderation.ts:53` | `20` | Maximum word repetition for spam detection | Code |
| `content.length` | `src/middleware/moderation.ts:18` | `50000` | Maximum content length for moderation | Code |
| `BLOCKED_WORDS` | `src/middleware/moderation.ts:24` | Environment | Blocked words list for content filtering | Environment |

---

### 6. **Performance Boundaries** ⚡

Parameters that control operation performance and resource limits.

| Parameter | Location | Default | Description | Adjustable By |
|-----------|----------|---------|-------------|---------------|
| `latency.max` | `src/services/ai-safeguards.ts:260` | `200` | Maximum allowed latency in milliseconds | **LLM Agent** |
| `latency.min` | `src/services/ai-safeguards.ts:260` | `0` | Minimum allowed latency | **LLM Agent** |
| `errorRate.max` | `src/services/ai-safeguards.ts:262` | `10` | Maximum allowed error rate percentage | **LLM Agent** |
| `errorRate.min` | `src/services/ai-safeguards.ts:262` | `0` | Minimum allowed error rate | **LLM Agent** |

---

### 7. **AI Automation Parameters** 🤖

Parameters that LLM agents can adjust for system optimization.

| Parameter | Location | Default | Description | Adjustable By |
|-----------|----------|---------|-------------|---------------|
| `currentLimits.global` | `src/services/ai-automation.ts:56` | `100` | Global rate limit (per minute) | **LLM Agent** |
| `currentLimits.ip` | `src/services/ai-automation.ts:57` | `1000` | IP-based rate limit (per minute) | **LLM Agent** |
| `currentLimits.user` | `src/services/ai-automation.ts:58` | `100` | User-based rate limit (per minute) | **LLM Agent** |
| `currentTTLs.l1` | `src/services/ai-automation.ts:296` | `60000` | Level 1 cache TTL (1 minute) | **LLM Agent** |
| `currentTTLs.l2` | `src/services/ai-automation.ts:297` | `300000` | Level 2 cache TTL (5 minutes) | **LLM Agent** |

---

### 8. **Semantic Search Parameters** 🔍

Parameters that control vector similarity search.

| Parameter | Location | Default | Description | Adjustable By |
|-----------|----------|---------|-------------|---------------|
| `match_threshold` | `sql/10_integrated_features.sql:142` | `0.78` | Similarity threshold for semantic search (higher = stricter) | **User, LLM Agent** |
| `match_count` | `sql/10_integrated_features.sql:144` | `10` | Maximum number of matching messages to return | **User, LLM Agent** |

---

### 9. **Maintenance Window** 🕐

Parameters that control when AI automation runs.

| Parameter | Location | Default | Description | Adjustable By |
|-----------|----------|---------|-------------|---------------|
| `maintenance_window` | `src/services/ai-safeguards.ts:227` | `3-5 AM UTC` | Hours when AI automation is disabled | Code |

---

## Parameter Adjustment Methods

### **User-Configurable** (via UI)
- ✅ Assistant model selection (`assistants.model`)
- ✅ Assistant temperature (`assistants.temperature`)
- ✅ Semantic search threshold (`match_threshold`)
- ✅ Semantic search result count (`match_count`)

### **LLM Agent-Configurable** (via AI automation)
- ✅ Rate limits (global, IP, user)
- ✅ Cache TTLs (L1, L2)
- ✅ Moderation thresholds (all categories)
- ✅ Toxicity thresholds (per-room)
- ✅ Token spending limits
- ✅ API call limits
- ✅ Error backoff duration
- ✅ Analysis timeout
- ✅ Latency boundaries
- ✅ Error rate boundaries

### **Environment-Configurable**
- ✅ Blocked words list (`BLOCKED_WORDS`)
- ✅ Model selection (via `DEEPSEEK_API_KEY`)

### **Code-Configurable** (requires code changes)
- ✅ Model selection (hardcoded)
- ✅ Temperature (hardcoded)
- ✅ Max tokens (hardcoded)
- ✅ Maintenance window hours
- ✅ Content length limits
- ✅ Spam detection thresholds

---

## Files with LLM Parameters

### TypeScript/JavaScript Files
1. `src/services/ai-safeguards.ts` - 10 parameters
2. `src/autonomy/llm_reasoner.ts` - 6 parameters
3. `src/services/llm-service.ts` - 2 parameters
4. `src/optimizer/index.ts` - 3 parameters
5. `src/routes/assistants-routes.ts` - 1 parameter
6. `src/services/embeddings-service.ts` - 1 parameter
7. `src/middleware/moderation.ts` - 3 parameters
8. `src/services/ai-automation.ts` - 5 parameters

### SQL Files
1. `sql/01_sinapse_schema.sql` - 7 parameters (moderation thresholds)
2. `sql/04_moderation_apply.sql` - 2 parameters (threshold application)
3. `sql/10_integrated_features.sql` - 4 parameters (assistants, embeddings, search)
4. `sql/11_indexing_and_rls.sql` - 3 parameters (toxicity thresholds)
5. `sql/13_create_missing_ai_views.sql` - 3 parameters (toxicity thresholds)

---

## Summary Statistics

- **Total Parameters Found**: 61
- **User-Configurable**: 4
- **LLM Agent-Configurable**: 20
- **Environment-Configurable**: 2
- **Code-Configurable**: 35

---

## Usage Guidelines

### For Developers
- All LLM parameters are marked with `// @llm_param` comments
- Search codebase for `@llm_param` to find all parameters
- Parameters marked as "LLM Agent-Configurable" can be adjusted by AI automation
- Parameters marked as "User-Configurable" should have UI controls

### For LLM Agents
- Parameters marked as "LLM Agent-Configurable" can be adjusted via `ai-automation.ts` functions
- All adjustments must pass `PolicyGuard` validation
- All adjustments are logged to `audit_log`
- Adjustments should respect safety boundaries

### For Users
- Assistant model and temperature can be configured per assistant
- Semantic search thresholds can be adjusted per query
- Moderation thresholds are system-wide (not user-configurable)

---

## Safety Considerations

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

---

**Index Complete**: All LLM parameters identified and documented.

