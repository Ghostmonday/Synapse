-- Quick check: AI Views and Functions
SELECT 
  'AI VIEWS' AS type,
  COUNT(*)::TEXT AS count,
  CASE WHEN COUNT(*) >= 7 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM pg_views
WHERE schemaname = 'public' AND viewname LIKE 'ai_%'
UNION ALL
SELECT 
  'AI FUNCTIONS' AS type,
  COUNT(*)::TEXT AS count,
  CASE WHEN COUNT(*) >= 3 THEN '✅ PASS' ELSE '❌ FAIL' END AS status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'ai_%';

-- List all AI views
SELECT 'AI VIEWS LIST' AS info, viewname AS view_name
FROM pg_views
WHERE schemaname = 'public' AND viewname LIKE 'ai_%'
ORDER BY viewname;

-- List all AI functions
SELECT 'AI FUNCTIONS LIST' AS info, p.proname AS function_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'ai_%'
ORDER BY p.proname;

