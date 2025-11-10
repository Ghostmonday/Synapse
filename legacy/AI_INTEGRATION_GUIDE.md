# AI Integration Guide - DeepSeek & LLM Control Zones

This guide documents the AI-integration hotspots and control points in the Sinapse database.

## Overview

The database is configured with:
1. **Performance Indexes** - Optimized for AI queries and analytics
2. **RLS Policies** - Security controls for AI access
3. **AI Views & Functions** - Pre-aggregated data for LLM analysis

## 1. Table Indexing Requirements

All critical tables have been indexed for:
- **Performance**: Fast joins and lookups
- **Search**: Full-text and vector search
- **Telemetry**: Event tracking and analysis
- **AI Queries**: Aggregated analytics

### Key Indexes Created

| Table | Indexes | Purpose |
|-------|---------|---------|
| `telemetry` | event_type, event_time, user_id, partial (msg_sent) | Event analysis |
| `audit_log` | event_type, entity_id, timestamp | Audit trail queries |
| `metrics` | type, target_id, timestamp | Metrics aggregation |
| `presence_logs` | room_id, user_id, created_at (composite) | Presence tracking |
| `room_memberships` | room_id, user_id, role | Access control |
| `bots` | name, owner_id, is_active | Bot management |
| `embeddings` | vector (HNSW), message_id | Semantic search |

## 2. RLS & Control Points

### Access Control Matrix

| Table | LLM Access Role | RLS Policy | Use Case |
|-------|----------------|------------|----------|
| `telemetry` | Read-only | `user_id = auth.uid()` | Surface activity spikes |
| `messages` | Read/write (bots) | `sender_id = auth.uid() OR bot_id IN allowed_bots()` | Flag toxicity, retry generations |
| `bots` | Admin only | `owner_id = auth.uid()` | Recommend bot deactivation |
| `audit_log` | View (moderators) | `auth.role() = 'moderator'` | Explain permission escalations |
| `presence_logs` | Read-only | `user_id = auth.uid() OR room_id IN public_rooms` | Visualize drop-off patterns |
| `embeddings` | Read/write (AI layer) | `content.owner_id = auth.uid()` | Validate content similarity |
| `subscriptions` | Write (user-owned) | `user_id = auth.uid()` | Suggest frequency changes |

### Helper Functions

- `auth.uid()` - Gets current user ID from JWT
- `auth.role()` - Gets user role (user, moderator, admin)
- `is_moderator(user_id)` - Checks if user is moderator/admin
- `allowed_bots(user_id)` - Returns array of bot IDs user can control

## 3. AI-Integration Hotspots

### Available Views for LLM Analysis

#### `ai_bot_monitoring`
**Purpose**: Monitor bot health and failures
```sql
SELECT * FROM ai_bot_monitoring WHERE errors_24h > 5;
```
**DeepSeek Actions**:
- Reason over failure logs
- Halt bot if repeated failures
- Flag problematic prompts

#### `ai_message_quality`
**Purpose**: Analyze message content stream
```sql
SELECT * FROM ai_message_quality WHERE quality_status = 'high_risk';
```
**DeepSeek Actions**:
- Flag disallowed tone
- Auto-rewrite suggestions
- Detect spam patterns

#### `ai_presence_trends`
**Purpose**: Analyze behavior patterns
```sql
SELECT * FROM ai_presence_trends WHERE status_count < 5;
```
**DeepSeek Actions**:
- Detect room dropouts
- Identify burnout indicators
- Suggest engagement improvements

#### `ai_audit_summary`
**Purpose**: Summarize user actions
```sql
SELECT * FROM ai_audit_summary WHERE event_count > 100;
```
**DeepSeek Actions**:
- Detect abnormal behavior
- Identify conflicts
- Recommend moderation actions

#### `ai_query_performance`
**Purpose**: Analyze slow queries
```sql
SELECT * FROM ai_query_performance WHERE performance_category = 'slow';
```
**DeepSeek Actions**:
- Recommend new partial indexes
- Suggest query optimizations
- Identify bottlenecks

#### `ai_moderation_suggestions`
**Purpose**: Policy analysis
```sql
SELECT * FROM ai_moderation_suggestions WHERE flag_percentage > 10;
```
**DeepSeek Actions**:
- Recommend new policies
- Suggest shadowbans
- Identify problematic rooms

#### `ai_telemetry_insights`
**Purpose**: Aggregate events
```sql
SELECT * FROM ai_telemetry_insights ORDER BY event_count DESC;
```
**DeepSeek Actions**:
- Recommend throttling
- Suggest caching strategies
- Identify retry patterns

### AI Functions

#### `ai_analyze_bot_failures(bot_id, hours_back)`
Analyzes bot error patterns and returns recommendations.

**Example**:
```sql
SELECT * FROM ai_analyze_bot_failures('bot-uuid-here', 24);
```

**Returns**:
- Error count
- Last error timestamp
- Error types breakdown
- Recommendation (normal/moderate/high risk)

#### `ai_moderation_recommendations(room_id)`
Provides moderation suggestions based on message analysis.

**Example**:
```sql
SELECT * FROM ai_moderation_recommendations('room-uuid-here');
-- Or for all rooms:
SELECT * FROM ai_moderation_recommendations(NULL);
```

**Returns**:
- Flagged message rate
- Average toxicity score
- Recommendation text
- Suggested action

#### `ai_detect_presence_dropouts(hours_threshold)`
Detects users who may have dropped out of rooms.

**Example**:
```sql
SELECT * FROM ai_detect_presence_dropouts(2); -- Users offline > 2 hours
```

**Returns**:
- User and room IDs
- Last seen timestamp
- Hours absent
- Status (active/potential_dropout)

## Usage Examples

### Example 1: Bot Health Check
```sql
-- Check all bots with high error rates
SELECT 
  bot_name,
  errors_24h,
  recommendation
FROM ai_bot_monitoring
WHERE errors_24h > 5
ORDER BY errors_24h DESC;
```

### Example 2: Message Quality Analysis
```sql
-- Find high-risk messages in last hour
SELECT 
  id,
  content_preview,
  quality_status,
  flags
FROM ai_message_quality
WHERE quality_status IN ('flagged', 'high_risk')
  AND created_at > NOW() - INTERVAL '1 hour';
```

### Example 3: Presence Dropout Detection
```sql
-- Find users who dropped out in last 24 hours
SELECT 
  user_id,
  room_id,
  hours_absent,
  status
FROM ai_detect_presence_dropouts(24)
WHERE status = 'potential_dropout';
```

### Example 4: Moderation Recommendations
```sql
-- Get moderation suggestions for all rooms
SELECT 
  room_id,
  flagged_rate,
  avg_toxicity,
  recommendation,
  suggested_action
FROM ai_moderation_recommendations(NULL)
WHERE flagged_rate > 5;
```

## Security Considerations

1. **RLS Policies**: All AI views respect Row Level Security
2. **Function Security**: AI functions use `SECURITY DEFINER` for controlled access
3. **Service Role**: Consider creating dedicated `ai_service` role for LLM access
4. **Audit Trail**: All AI queries can be logged via `audit_log` table

## Setting Up AI Service Access

To grant dedicated access to an AI service:

```sql
-- Create AI service role
CREATE ROLE ai_service WITH LOGIN PASSWORD 'your-secure-password';

-- Grant read access to AI views
GRANT SELECT ON 
  ai_bot_monitoring,
  ai_message_quality,
  ai_presence_trends,
  ai_audit_summary,
  ai_query_performance,
  ai_moderation_suggestions,
  ai_telemetry_insights
TO ai_service;

-- Grant execute on AI functions
GRANT EXECUTE ON FUNCTION 
  ai_analyze_bot_failures,
  ai_moderation_recommendations,
  ai_detect_presence_dropouts
TO ai_service;
```

## Integration with DeepSeek API

### Recommended Workflow

1. **Query AI Views**: Use views for aggregated insights
2. **Call AI Functions**: Use functions for specific analysis
3. **Process Recommendations**: Implement suggested actions
4. **Log Actions**: Record AI decisions in `audit_log`

### Example Integration Pattern

```typescript
// Pseudo-code for DeepSeek integration
async function analyzeBotHealth(botId: string) {
  // Query AI view
  const monitoring = await supabase
    .from('ai_bot_monitoring')
    .select('*')
    .eq('bot_id', botId)
    .single();
  
  // Call AI function for detailed analysis
  const analysis = await supabase.rpc('ai_analyze_bot_failures', {
    bot_id_param: botId,
    hours_back: 24
  });
  
  // Send to DeepSeek for reasoning
  const recommendation = await deepseek.analyze({
    context: analysis,
    prompt: 'Should this bot be deactivated?'
  });
  
  // Log AI decision
  await supabase.from('audit_log').insert({
    event_type: 'ai_recommendation',
    payload: { bot_id: botId, recommendation }
  });
}
```

## Next Steps

1. Run `sql/11_indexing_and_rls.sql` to apply all indexes and RLS policies
2. Test AI views with sample queries
3. Set up AI service role if using dedicated LLM access
4. Integrate with DeepSeek API using the provided patterns
5. Monitor AI query performance via `ai_query_performance` view

