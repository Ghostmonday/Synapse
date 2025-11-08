-- ===============================================
-- VERIFY SINAPSE DATABASE SETUP
-- ===============================================
-- Run this to verify all tables, functions, and triggers were created successfully
-- ===============================================

-- Check extensions
SELECT 
  extname AS extension_name,
  extversion AS version
FROM pg_extension
WHERE extname IN ('pgcrypto', 'pg_stat_statements', 'vector')
ORDER BY extname;

-- Check core tables
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'users', 'rooms', 'room_memberships', 'messages', 
    'message_receipts', 'audit_log', 'logs_raw', 'logs_compressed',
    'threads', 'edit_history', 'bot_endpoints',
    'assistants', 'bots', 'subscriptions', 'embeddings', 
    'metrics', 'presence_logs', 'telemetry', 'system_config'
  )
ORDER BY table_name;

-- Check functions
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN (
    'update_thread_metadata',
    'refresh_message_search_index',
    'mark_message_edited',
    'match_messages',
    'update_updated_at_column'
  )
ORDER BY routine_name;

-- Check triggers
SELECT 
  trigger_name,
  event_object_table AS table_name,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name IN (
    'trigger_thread_metadata_update',
    'trigger_refresh_search_index',
    'trigger_mark_message_edited',
    'update_assistants_updated_at',
    'update_bots_updated_at',
    'update_subscriptions_updated_at'
  )
ORDER BY trigger_name, event_object_table;

-- Check indexes (sample of important ones)
SELECT 
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname
LIMIT 20;

-- Check materialized view
SELECT 
  schemaname,
  matviewname,
  hasindexes
FROM pg_matviews
WHERE matviewname = 'message_search_index';

-- Summary counts
SELECT 
  'Tables' AS object_type,
  COUNT(*) AS count
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
  'Functions' AS object_type,
  COUNT(*) AS count
FROM information_schema.routines
WHERE routine_schema = 'public'
UNION ALL
SELECT 
  'Triggers' AS object_type,
  COUNT(*) AS count
FROM information_schema.triggers
WHERE trigger_schema = 'public'
UNION ALL
SELECT 
  'Indexes' AS object_type,
  COUNT(*) AS count
FROM pg_indexes
WHERE schemaname = 'public';

