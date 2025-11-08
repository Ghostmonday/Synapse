-- Check if AI views exist
SELECT 
  'AI VIEWS COUNT' AS check_type,
  COUNT(*)::TEXT AS count,
  CASE WHEN COUNT(*) >= 7 THEN '✅ PASS' ELSE '❌ FAIL - Expected 7 views' END AS status
FROM pg_views
WHERE schemaname = 'public' AND viewname LIKE 'ai_%';

-- List all AI views that exist
SELECT 
  'EXISTING AI VIEWS' AS info,
  viewname AS view_name,
  '✅ EXISTS' AS status
FROM pg_views
WHERE schemaname = 'public' AND viewname LIKE 'ai_%'
ORDER BY viewname;

-- Check which expected views are missing
SELECT 
  'MISSING VIEWS' AS info,
  expected.vw_name AS view_name,
  CASE 
    WHEN v.viewname IS NOT NULL THEN '✅ EXISTS'
    ELSE '❌ MISSING'
  END AS status
FROM (
  VALUES 
    ('ai_bot_monitoring'),
    ('ai_telemetry_insights'),
    ('ai_message_quality'),
    ('ai_presence_trends'),
    ('ai_audit_summary'),
    ('ai_query_performance'),
    ('ai_moderation_suggestions')
) AS expected(vw_name)
LEFT JOIN pg_views v ON v.viewname = expected.vw_name
  AND v.schemaname = 'public'
ORDER BY expected.vw_name;

