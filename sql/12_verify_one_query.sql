-- ===============================================
-- FILE: 12_verify_one_query.sql
-- PURPOSE: Single query that shows ALL verification results
-- ===============================================

-- SINGLE COMPREHENSIVE VERIFICATION QUERY
SELECT 
  'MIGRATION STATUS' AS check_type,
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_uid' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public'))
    THEN '✅ Migration has been run'
    ELSE '❌ Migration NOT run - Run sql/11_indexing_and_rls.sql first'
  END AS status,
  NULL::TEXT AS details
UNION ALL
SELECT 
  'INDEXES' AS check_type,
  CASE 
    WHEN COUNT(*) >= 30 THEN '✅ PASS (' || COUNT(*)::TEXT || ' found)'
    WHEN COUNT(*) > 0 THEN '⚠️  PARTIAL (' || COUNT(*)::TEXT || ' found, expected 30+)'
    ELSE '❌ FAIL (0 found, expected 30+)'
  END AS status,
  'Expected: idx_telemetry_event, idx_bots_created_by, etc.' AS details
FROM pg_indexes
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'
UNION ALL
SELECT 
  'RLS ENABLED TABLES' AS check_type,
  CASE 
    WHEN COUNT(*) >= 10 THEN '✅ PASS (' || COUNT(*)::TEXT || ' tables)'
    WHEN COUNT(*) > 0 THEN '⚠️  PARTIAL (' || COUNT(*)::TEXT || ' tables, expected 10)'
    ELSE '❌ FAIL (0 tables, expected 10)'
  END AS status,
  'Tables: telemetry, messages, bots, audit_log, etc.' AS details
FROM pg_tables t
JOIN pg_class c ON c.relname = t.tablename
WHERE t.schemaname = 'public' AND c.relrowsecurity = TRUE
  AND t.tablename IN ('telemetry', 'messages', 'bots', 'audit_log', 'presence_logs', 'embeddings', 'subscriptions', 'assistants', 'threads', 'room_memberships')
UNION ALL
SELECT 
  'RLS POLICIES' AS check_type,
  CASE 
    WHEN COUNT(*) >= 20 THEN '✅ PASS (' || COUNT(*)::TEXT || ' policies)'
    WHEN COUNT(*) > 0 THEN '⚠️  PARTIAL (' || COUNT(*)::TEXT || ' policies, expected 23)'
    ELSE '❌ FAIL (0 policies, expected 23)'
  END AS status,
  'Policies: telemetry_read_own, messages_read_own, etc.' AS details
FROM pg_policies
WHERE schemaname = 'public'
UNION ALL
SELECT 
  'HELPER FUNCTIONS' AS check_type,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ PASS (' || COUNT(*)::TEXT || ' functions)'
    WHEN COUNT(*) > 0 THEN '⚠️  PARTIAL (' || COUNT(*)::TEXT || ' functions, expected 4)'
    ELSE '❌ FAIL (0 functions, expected 4)'
  END AS status,
  'Functions: current_uid, current_role, is_moderator, allowed_bots' AS details
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('current_uid', 'current_role', 'is_moderator', 'allowed_bots')
UNION ALL
SELECT 
  'AI VIEWS' AS check_type,
  CASE 
    WHEN COUNT(*) >= 7 THEN '✅ PASS (' || COUNT(*)::TEXT || ' views)'
    WHEN COUNT(*) > 0 THEN '⚠️  PARTIAL (' || COUNT(*)::TEXT || ' views, expected 7)'
    ELSE '❌ FAIL (0 views, expected 7)'
  END AS status,
  'Views: ai_bot_monitoring, ai_telemetry_insights, etc.' AS details
FROM pg_views
WHERE schemaname = 'public' AND viewname LIKE 'ai_%'
UNION ALL
SELECT 
  'AI FUNCTIONS' AS check_type,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS (' || COUNT(*)::TEXT || ' functions)'
    WHEN COUNT(*) > 0 THEN '⚠️  PARTIAL (' || COUNT(*)::TEXT || ' functions, expected 3)'
    ELSE '❌ FAIL (0 functions, expected 3)'
  END AS status,
  'Functions: ai_analyze_bot_failures, ai_moderation_recommendations, ai_detect_presence_dropouts' AS details
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'ai_%'
ORDER BY check_type;

