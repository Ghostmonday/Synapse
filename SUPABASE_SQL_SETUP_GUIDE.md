# 🗄️ Supabase SQL Setup & Validation Guide

This guide will help you set up and validate your Sinapse database in Supabase using the SQL Editor.

## 📋 Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Supabase Project**: Create a new project in the Supabase dashboard
3. **Access to SQL Editor**: Go to your project → SQL Editor

## 🚀 Quick Setup (Recommended)

### Option 1: Run Complete Setup File (Easiest)

1. Open **Supabase Dashboard** → **SQL Editor**
2. Click **New Query**
3. Copy and paste the contents of `sql/sinapse_complete_setup.sql`
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. Wait for completion (may take 1-2 minutes)

### Option 2: Run Individual Files in Order

If you prefer to run files individually, execute them in this exact order:

1. `sql/01_sinapse_schema.sql` - Core tables (users, rooms, messages)
2. `sql/02_compressor_functions.sql` - Compression functions
3. `sql/03_retention_policy.sql` - Data retention policies
4. `sql/04_moderation_apply.sql` - Moderation functions
5. `sql/05_rls_policies.sql` - Row-level security policies
6. `sql/06_partition_management.sql` - Partition management
7. `sql/07_healing_logs.sql` - Healing logs table
8. `sql/08_enhanced_rls_policies.sql` - Enhanced RLS policies
9. `sql/09_p0_features.sql` - P0 features (threads, reactions, search)
10. `sql/10_integrated_features.sql` - Integrated features (assistants, bots, subscriptions)
11. `sql/11_indexing_and_rls.sql` - Indexes and additional RLS
12. `sql/12_telemetry_triggers.sql` - Telemetry triggers
13. `sql/13_create_missing_ai_views.sql` - AI views
14. `sql/16_ai_audit_triggers.sql` - AI audit triggers
15. `sql/17_ux_telemetry_schema.sql` - UX telemetry schema

## ✅ Validation Steps

### Step 1: Enable Required Extensions

Run this first in the SQL Editor:

```sql
-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Enable vector extension (for semantic search)
-- Note: pgvector may not be available on all Supabase plans
-- If this fails, you can skip it - semantic search will be disabled
CREATE EXTENSION IF NOT EXISTS "vector";
```

### Step 2: Verify Core Tables Exist

Run this query to check if all core tables were created:

```sql
-- Check core tables
SELECT 
    table_name,
    CASE 
        WHEN table_name IN ('users', 'rooms', 'messages', 'room_memberships', 'message_receipts') 
        THEN '✅ CRITICAL'
        ELSE '📋 OPTIONAL'
    END as status
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_name IN (
        'users', 'rooms', 'messages', 'room_memberships', 
        'message_receipts', 'audit_log', 'telemetry', 
        'threads', 'assistants', 'bots', 'subscriptions',
        'embeddings', 'metrics', 'presence_logs'
    )
ORDER BY 
    CASE 
        WHEN table_name IN ('users', 'rooms', 'messages', 'room_memberships', 'message_receipts') 
        THEN 1 
        ELSE 2 
    END,
    table_name;
```

**Expected Result**: You should see at least 5 tables marked as "✅ CRITICAL"

### Step 3: Verify RLS is Enabled

Check if Row Level Security is enabled on critical tables:

```sql
-- Check RLS status
SELECT 
    tablename,
    CASE 
        WHEN relrowsecurity THEN '✅ ENABLED'
        ELSE '❌ DISABLED'
    END as rls_status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
    AND tablename IN ('users', 'rooms', 'messages', 'telemetry', 'audit_log')
ORDER BY tablename;
```

**Expected Result**: All tables should show "✅ ENABLED"

### Step 4: Verify RLS Policies Exist

Check if RLS policies are created:

```sql
-- Count RLS policies
SELECT 
    schemaname,
    tablename,
    COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY policy_count DESC, tablename;
```

**Expected Result**: You should see multiple policies (at least 10-15)

### Step 5: Verify Indexes Exist

Check if indexes were created:

```sql
-- Check indexes
SELECT 
    indexname,
    tablename,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname
LIMIT 20;
```

**Expected Result**: You should see many indexes (30+)

### Step 6: Run Comprehensive Verification

Run the complete verification script:

```sql
-- Copy and paste the entire contents of sql/12_verify_setup.sql
-- This will check indexes, RLS policies, functions, and views
```

Or run this quick verification:

```sql
-- Quick verification summary
SELECT 
    'Tables' as component,
    COUNT(*)::TEXT as count
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
    'RLS Policies' as component,
    COUNT(*)::TEXT as count
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT 
    'Indexes' as component,
    COUNT(*)::TEXT as count
FROM pg_indexes
WHERE schemaname = 'public'
    AND indexname LIKE 'idx_%'
UNION ALL
SELECT 
    'Functions' as component,
    COUNT(*)::TEXT as count
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public';
```

**Expected Results**:
- Tables: 15-20+
- RLS Policies: 20-30+
- Indexes: 30-40+
- Functions: 10-15+

## 🔍 Troubleshooting

### Issue: "Extension vector does not exist"

**Solution**: The `vector` extension (pgvector) may not be available on your Supabase plan. This is OK - semantic search features will be disabled, but everything else will work.

```sql
-- Skip vector extension if it fails
-- The rest of the setup will work without it
```

### Issue: "Table already exists" errors

**Solution**: This is normal if you're re-running the setup. The scripts use `IF NOT EXISTS` so they're safe to run multiple times.

### Issue: "Permission denied" errors

**Solution**: Make sure you're running queries as the `postgres` role (default in SQL Editor). Check your role:

```sql
SELECT current_user, current_role;
```

### Issue: RLS policies not working

**Solution**: Verify RLS is enabled and policies exist:

```sql
-- Check if RLS is enabled
SELECT tablename, relrowsecurity 
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE schemaname = 'public' AND tablename = 'messages';

-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'messages';
```

## 📊 Post-Setup Checklist

After running the setup, verify:

- [ ] Core tables exist (users, rooms, messages)
- [ ] RLS is enabled on all tables
- [ ] RLS policies are created
- [ ] Indexes are created
- [ ] Functions are created (current_uid, is_moderator, etc.)
- [ ] Extensions are enabled (pgcrypto, pg_stat_statements)
- [ ] No errors in Supabase logs

## 🧪 Test Queries

After setup, test with these queries:

### Test 1: Create a test user

```sql
INSERT INTO users (handle, display_name)
VALUES ('testuser', 'Test User')
RETURNING id, handle, created_at;
```

### Test 2: Create a test room

```sql
INSERT INTO rooms (slug, title, created_by, is_public)
VALUES ('test-room', 'Test Room', (SELECT id FROM users LIMIT 1), true)
RETURNING id, slug, title;
```

### Test 3: Verify helper functions

```sql
-- Test current_uid() (may return NULL without JWT context)
SELECT current_uid();

-- Test current_role()
SELECT current_role();

-- Test is_moderator() (with NULL user - should return false)
SELECT is_moderator(NULL::UUID);
```

## 📝 Next Steps

1. **Set Environment Variables**: Add Supabase credentials to your `.env` file
2. **Configure RLS**: Review and adjust RLS policies as needed
3. **Set Up Edge Functions**: Deploy Supabase Edge Functions
4. **Test API**: Test your API endpoints with the database

## 🆘 Need Help?

If you encounter issues:

1. Check the **Supabase Dashboard** → **Database** → **Logs** for errors
2. Review the verification script output (`sql/12_verify_setup.sql`)
3. Check that all SQL files ran without errors
4. Verify your Supabase project has the required permissions

---

**Ready to proceed?** Start with Step 1 (Enable Extensions) and work through each validation step!

