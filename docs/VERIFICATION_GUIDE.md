# Database Setup Verification Guide

## Quick Verification

After running `sql/11_indexing_and_rls.sql`, run the verification script:

```bash
# In Supabase SQL Editor, run:
sql/12_verify_setup.sql
```

Or via CLI:
```bash
supabase db push --file sql/12_verify_setup.sql
```

## What Gets Verified

### ✅ Indexes (30+)
- Telemetry indexes
- Logs indexes
- Audit log indexes
- Metrics indexes
- Users indexes
- Presence logs indexes
- Room memberships indexes
- Bots indexes
- Bot endpoints indexes
- Composite indexes
- Embeddings indexes

### ✅ RLS (Row Level Security)
- RLS enabled on 10 tables
- 23 RLS policies verified

### ✅ Helper Functions
- `current_uid()` - Get current user ID from JWT
- `current_role()` - Get current user role from JWT
- `is_moderator()` - Check if user is moderator/admin
- `allowed_bots()` - Get user's allowed bot IDs

### ✅ AI Views (7)
- `ai_bot_monitoring` - Bot failure analysis
- `ai_message_quality` - Content quality control
- `ai_presence_trends` - Behavior patterns
- `ai_audit_summary` - User actions summary
- `ai_query_performance` - Slow query detection
- `ai_moderation_suggestions` - Policy analysis
- `ai_telemetry_insights` - Aggregated events

### ✅ AI Functions (3)
- `ai_analyze_bot_failures()` - Analyze bot errors
- `ai_moderation_recommendations()` - Get moderation suggestions
- `ai_detect_presence_dropouts()` - Detect inactive users

## Expected Output

When verification runs successfully, you'll see:

```
✅ ALL 31 INDEXES VERIFIED
✅ ALL 10 TABLES HAVE RLS ENABLED
✅ ALL 23 RLS POLICIES VERIFIED
✅ ALL 4 HELPER FUNCTIONS VERIFIED
✅ ALL 7 AI VIEWS VERIFIED
✅ ALL 3 AI FUNCTIONS VERIFIED
```

## Manual Testing

### Test AI Views

```sql
-- Bot monitoring
SELECT * FROM ai_bot_monitoring LIMIT 5;

-- Telemetry insights
SELECT * FROM ai_telemetry_insights ORDER BY event_count DESC LIMIT 10;

-- Message quality
SELECT * FROM ai_message_quality WHERE quality_status = 'flagged' LIMIT 5;

-- Moderation suggestions
SELECT * FROM ai_moderation_suggestions;
```

### Test Helper Functions

```sql
-- Get current user ID (requires JWT context)
SELECT current_uid();

-- Get current role
SELECT current_role();

-- Check if user is moderator
SELECT is_moderator('user-uuid-here');

-- Get allowed bots
SELECT allowed_bots('user-uuid-here');
```

### Test AI Functions

```sql
-- Analyze bot failures
SELECT * FROM ai_analyze_bot_failures('bot-uuid-here', 24);

-- Get moderation recommendations
SELECT * FROM ai_moderation_recommendations('room-uuid-here');

-- Detect presence dropouts
SELECT * FROM ai_detect_presence_dropouts(2);
```

## Troubleshooting

### Missing Indexes
If indexes are missing, re-run:
```sql
-- Re-run indexing section from 11_indexing_and_rls.sql
```

### RLS Not Enabled
If RLS is not enabled:
```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
```

### Functions Not Found
If functions are missing:
```sql
-- Re-run helper functions section from 11_indexing_and_rls.sql
```

### Views Don't Work
If views return errors, check:
1. Base tables exist
2. Column names match schema
3. Permissions are correct

## Next Steps

After verification passes:

1. ✅ **Test with real data** - Insert sample data and query views
2. ✅ **Set up AI service role** - Create dedicated role for AI access
3. ✅ **Monitor performance** - Check query performance with indexes
4. ✅ **Review RLS policies** - Test access control with real users

## Summary Statistics

The verification script outputs summary counts:
- Total indexes created
- Total RLS policies
- Total AI views
- Total helper functions
- Total AI functions

All should match expected counts from the migration script.

