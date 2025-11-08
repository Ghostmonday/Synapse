-- ===============================================
-- FILE: 12_verify_setup_direct.sql
-- PURPOSE: Direct verification with guaranteed visible output
-- ===============================================

-- Check if migration has been run
SELECT 
  'MIGRATION STATUS' AS check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_uid' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
    THEN '✅ Migration has been run'
    ELSE '❌ Migration NOT run - Run sql/11_indexing_and_rls.sql first'
  END AS status;

-- 1. INDEX COUNT (will show 0 if not run)
SELECT 
  'INDEXES' AS component,
  COUNT(*)::INTEGER AS actual_count,
  31 AS expected_count,
  CASE 
    WHEN COUNT(*) >= 30 THEN '✅ PASS'
    WHEN COUNT(*) > 0 THEN '⚠️  PARTIAL'
    ELSE '❌ FAIL - Run migration first'
  END AS status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';

-- 2. RLS ENABLED TABLES
SELECT 
  'RLS ENABLED TABLES' AS component,
  COUNT(*)::INTEGER AS actual_count,
  10 AS expected_count,
  CASE 
    WHEN COUNT(*) >= 10 THEN '✅ PASS'
    WHEN COUNT(*) > 0 THEN '⚠️  PARTIAL'
    ELSE '❌ FAIL - Run migration first'
  END AS status
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public'
  AND c.relrowsecurity = TRUE
  AND t.tablename IN (
    'telemetry', 'messages', 'bots', 'audit_log', 'presence_logs',
    'embeddings', 'subscriptions', 'assistants', 'threads', 'room_memberships'
  );

-- 3. RLS POLICIES COUNT
SELECT 
  'RLS POLICIES' AS component,
  COUNT(*)::INTEGER AS actual_count,
  23 AS expected_count,
  CASE 
    WHEN COUNT(*) >= 20 THEN '✅ PASS'
    WHEN COUNT(*) > 0 THEN '⚠️  PARTIAL'
    ELSE '❌ FAIL - Run migration first'
  END AS status
FROM pg_policies
WHERE schemaname = 'public';

-- 4. HELPER FUNCTIONS
SELECT 
  'HELPER FUNCTIONS' AS component,
  COUNT(*)::INTEGER AS actual_count,
  4 AS expected_count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ PASS'
    WHEN COUNT(*) > 0 THEN '⚠️  PARTIAL'
    ELSE '❌ FAIL - Run migration first'
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('current_uid', 'current_role', 'is_moderator', 'allowed_bots');

-- 5. AI VIEWS
SELECT 
  'AI VIEWS' AS component,
  COUNT(*)::INTEGER AS actual_count,
  7 AS expected_count,
  CASE 
    WHEN COUNT(*) >= 7 THEN '✅ PASS'
    WHEN COUNT(*) > 0 THEN '⚠️  PARTIAL'
    ELSE '❌ FAIL - Run migration first'
  END AS status
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE 'ai_%';

-- 6. AI FUNCTIONS
SELECT 
  'AI FUNCTIONS' AS component,
  COUNT(*)::INTEGER AS actual_count,
  3 AS expected_count,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS'
    WHEN COUNT(*) > 0 THEN '⚠️  PARTIAL'
    ELSE '❌ FAIL - Run migration first'
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE 'ai_%';

-- List specific indexes that should exist
SELECT 
  'EXPECTED INDEXES' AS info,
  indexname AS index_name,
  tablename AS table_name,
  CASE 
    WHEN indexname IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status
FROM (
  VALUES 
    ('idx_telemetry_event', 'telemetry'),
    ('idx_telemetry_event_time', 'telemetry'),
    ('idx_bots_created_by', 'bots'),
    ('idx_messages_sender_created', 'messages'),
    ('idx_room_memberships_room_user', 'room_memberships')
) AS expected(idx_name, tbl_name)
LEFT JOIN pg_indexes i ON i.indexname = expected.idx_name 
  AND i.tablename = expected.tbl_name
  AND i.schemaname = 'public'
ORDER BY expected.tbl_name, expected.idx_name;

-- List specific functions that should exist
SELECT 
  'EXPECTED FUNCTIONS' AS info,
  proname AS function_name,
  CASE 
    WHEN proname IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status
FROM (
  VALUES 
    ('current_uid'),
    ('current_role'),
    ('is_moderator'),
    ('allowed_bots')
) AS expected(func_name)
LEFT JOIN pg_proc p ON p.proname = expected.func_name
  AND p.pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY expected.func_name;

-- List specific views that should exist
SELECT 
  'EXPECTED VIEWS' AS info,
  viewname AS view_name,
  CASE 
    WHEN viewname IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status
FROM (
  VALUES 
    ('ai_bot_monitoring'),
    ('ai_telemetry_insights'),
    ('ai_message_quality'),
    ('ai_moderation_suggestions')
) AS expected(vw_name)
LEFT JOIN pg_views v ON v.viewname = expected.vw_name
  AND v.schemaname = 'public'
ORDER BY expected.vw_name;

-- Final summary
SELECT 
  '🎉 VERIFICATION COMPLETE' AS title,
  'Review all results above' AS message,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_uid' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
    THEN '✅ Migration appears to be run - check counts above'
    ELSE '❌ Migration NOT detected - Run sql/11_indexing_and_rls.sql first'
  END AS note;

