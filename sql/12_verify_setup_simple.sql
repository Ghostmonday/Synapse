-- ===============================================
-- FILE: 12_verify_setup_simple.sql
-- PURPOSE: Simple verification that returns visible results (not NOTICE messages)
-- USAGE: Run after 11_indexing_and_rls.sql to see verification results
-- ===============================================

-- ===============================================
-- VERIFICATION RESULTS (Visible Output)
-- ===============================================

-- 1. INDEX COUNT
SELECT 
  'INDEXES' AS component,
  COUNT(*)::TEXT AS count,
  CASE 
    WHEN COUNT(*) >= 30 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 30+ indexes'
  END AS status
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%';

-- 2. RLS ENABLED TABLES
SELECT 
  'RLS ENABLED TABLES' AS component,
  COUNT(*)::TEXT AS count,
  CASE 
    WHEN COUNT(*) >= 10 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 10+ tables'
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
  COUNT(*)::TEXT AS count,
  CASE 
    WHEN COUNT(*) >= 20 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 20+ policies'
  END AS status
FROM pg_policies
WHERE schemaname = 'public';

-- 4. HELPER FUNCTIONS
SELECT 
  'HELPER FUNCTIONS' AS component,
  COUNT(*)::TEXT AS count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 4 functions'
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('current_uid', 'current_role', 'is_moderator', 'allowed_bots');

-- 5. AI VIEWS
SELECT 
  'AI VIEWS' AS component,
  COUNT(*)::TEXT AS count,
  CASE 
    WHEN COUNT(*) >= 7 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 7 views'
  END AS status
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE 'ai_%';

-- 6. AI FUNCTIONS
SELECT 
  'AI FUNCTIONS' AS component,
  COUNT(*)::TEXT AS count,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS'
    ELSE '❌ FAIL - Expected 3 functions'
  END AS status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE 'ai_%';

-- ===============================================
-- DETAILED BREAKDOWN
-- ===============================================

-- List all indexes
SELECT 
  'INDEX DETAILS' AS info,
  indexname AS index_name,
  tablename AS table_name
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- List all RLS policies
SELECT 
  'RLS POLICY DETAILS' AS info,
  policyname AS policy_name,
  tablename AS table_name,
  cmd AS command_type
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- List all AI views
SELECT 
  'AI VIEW DETAILS' AS info,
  viewname AS view_name,
  definition AS view_definition
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE 'ai_%'
ORDER BY viewname;

-- List all helper functions
SELECT 
  'HELPER FUNCTION DETAILS' AS info,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('current_uid', 'current_role', 'is_moderator', 'allowed_bots')
ORDER BY p.proname;

-- List all AI functions
SELECT 
  'AI FUNCTION DETAILS' AS info,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  pg_get_function_result(p.oid) AS return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname LIKE 'ai_%'
ORDER BY p.proname;

-- ===============================================
-- QUICK TEST QUERIES
-- ===============================================

-- Test if views are queryable (will show error if they don't exist)
SELECT 
  'VIEW TEST' AS test_type,
  'ai_bot_monitoring' AS view_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'ai_bot_monitoring' AND schemaname = 'public')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status;

SELECT 
  'VIEW TEST' AS test_type,
  'ai_telemetry_insights' AS view_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'ai_telemetry_insights' AND schemaname = 'public')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status;

SELECT 
  'VIEW TEST' AS test_type,
  'ai_moderation_suggestions' AS view_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'ai_moderation_suggestions' AND schemaname = 'public')
    THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status;

-- ===============================================
-- FINAL SUMMARY
-- ===============================================

SELECT 
  '🎉 VERIFICATION SUMMARY' AS title,
  'All checks completed. Review results above.' AS message,
  'If all statuses show ✅ PASS, your setup is complete!' AS note;

