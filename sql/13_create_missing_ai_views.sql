-- ===============================================
-- FILE: 13_create_missing_ai_views.sql
-- PURPOSE: Create missing AI views and functions
-- USAGE: Run this to complete the migration
-- ===============================================

BEGIN;

-- ===============================================
-- AI VIEWS (7 views)
-- ===============================================

-- View for Bot Monitoring (failure analysis)
CREATE OR REPLACE VIEW ai_bot_monitoring AS
SELECT 
  b.id AS bot_id,
  b.name AS bot_name,
  b.created_by,
  COUNT(be.id) AS endpoint_count,
  COUNT(CASE WHEN be.is_active = FALSE THEN 1 END) AS inactive_endpoints,
  (SELECT COUNT(*) FROM audit_log 
   WHERE payload->>'bot_id' = b.id::text 
   AND event_type = 'bot_error'
   AND event_time > NOW() - INTERVAL '24 hours') AS errors_24h
FROM bots b
LEFT JOIN bot_endpoints be ON be.bot_id = b.id
GROUP BY b.id, b.name, b.created_by;

-- View for Message Quality Control (content analysis)
CREATE OR REPLACE VIEW ai_message_quality AS
SELECT 
  m.id,
  m.room_id,
  m.sender_id,
  m.content_preview,
  m.is_flagged,
  m.flags,
  m.created_at,
  (SELECT COUNT(*) FROM message_receipts WHERE message_id = m.id) AS receipt_count,
  CASE 
    WHEN m.is_flagged = TRUE THEN 'flagged'
    WHEN m.flags->>'toxicity_score' IS NOT NULL 
      AND (m.flags->>'toxicity_score')::float > 0.7 THEN 'high_risk'
    ELSE 'normal'
  END AS quality_status
FROM messages m
WHERE m.created_at > NOW() - INTERVAL '7 days';

-- View for Presence Trends (behavior patterns)
CREATE OR REPLACE VIEW ai_presence_trends AS
SELECT 
  pl.user_id,
  pl.room_id,
  pl.status,
  DATE_TRUNC('hour', pl.created_at) AS hour_bucket,
  COUNT(*) AS status_count,
  AVG(EXTRACT(EPOCH FROM (NOW() - pl.created_at))) AS avg_age_seconds
FROM presence_logs pl
WHERE pl.created_at > NOW() - INTERVAL '30 days'
GROUP BY pl.user_id, pl.room_id, pl.status, DATE_TRUNC('hour', pl.created_at);

-- View for Audit Trail Analysis (user actions summary)
CREATE OR REPLACE VIEW ai_audit_summary AS
SELECT 
  al.user_id,
  al.event_type,
  COUNT(*) AS event_count,
  MIN(al.event_time) AS first_occurrence,
  MAX(al.event_time) AS last_occurrence,
  COUNT(*) FILTER (WHERE al.event_time > NOW() - INTERVAL '24 hours') AS recent_count
FROM audit_log al
WHERE al.event_time > NOW() - INTERVAL '30 days'
GROUP BY al.user_id, al.event_type;

-- View for Query Performance (slow query detection)
CREATE OR REPLACE VIEW ai_query_performance AS
SELECT 
  t.event_time,
  t.event,
  t.latency_ms,
  t.room_id,
  t.user_id,
  CASE 
    WHEN t.latency_ms > 1000 THEN 'slow'
    WHEN t.latency_ms > 500 THEN 'moderate'
    ELSE 'fast'
  END AS performance_category
FROM telemetry t
WHERE t.event LIKE '%query%' OR t.event LIKE '%db%'
ORDER BY t.latency_ms DESC;

-- View for Moderation Suggestions (policy analysis)
CREATE OR REPLACE VIEW ai_moderation_suggestions AS
SELECT 
  m.room_id,
  COUNT(*) FILTER (WHERE m.is_flagged = TRUE) AS flagged_count,
  COUNT(*) AS total_messages,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE m.is_flagged = TRUE) / NULLIF(COUNT(*), 0),
    2
  ) AS flag_percentage,
  AVG((m.flags->>'toxicity_score')::float) AS avg_toxicity,
  MAX(m.created_at) AS last_message_time
FROM messages m
WHERE m.created_at > NOW() - INTERVAL '7 days'
GROUP BY m.room_id
HAVING COUNT(*) FILTER (WHERE m.is_flagged = TRUE) > 5;

-- View for Telemetry Insights (aggregated events)
CREATE OR REPLACE VIEW ai_telemetry_insights AS
SELECT 
  t.event,
  DATE_TRUNC('hour', t.event_time) AS hour_bucket,
  COUNT(*) AS event_count,
  AVG(t.latency_ms) AS avg_latency,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY t.latency_ms) AS p95_latency,
  COUNT(DISTINCT t.user_id) AS unique_users,
  COUNT(DISTINCT t.room_id) AS unique_rooms
FROM telemetry t
WHERE t.event_time > NOW() - INTERVAL '24 hours'
GROUP BY t.event, DATE_TRUNC('hour', t.event_time)
ORDER BY event_count DESC;

-- ===============================================
-- AI FUNCTIONS (3 functions)
-- ===============================================

-- Function for AI to analyze bot failures
CREATE OR REPLACE FUNCTION ai_analyze_bot_failures(bot_id_param UUID, hours_back INT DEFAULT 24)
RETURNS TABLE (
  bot_name TEXT,
  error_count BIGINT,
  last_error TIMESTAMPTZ,
  error_types JSONB,
  recommendation TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.name::TEXT,
    COUNT(*)::BIGINT,
    MAX(al.event_time)::TIMESTAMPTZ,
    jsonb_object_agg(al.event_type, COUNT(*))::JSONB,
    CASE 
      WHEN COUNT(*) > 10 THEN 'Consider deactivating bot - high error rate'
      WHEN COUNT(*) > 5 THEN 'Review bot configuration - moderate error rate'
      ELSE 'Bot operating normally'
    END::TEXT AS recommendation
  FROM bots b
  LEFT JOIN audit_log al ON al.payload->>'bot_id' = b.id::text
    AND al.event_type LIKE '%error%'
    AND al.event_time > NOW() - (hours_back || ' hours')::INTERVAL
  WHERE b.id = bot_id_param
  GROUP BY b.id, b.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for AI to get moderation recommendations
CREATE OR REPLACE FUNCTION ai_moderation_recommendations(room_id_param UUID DEFAULT NULL)
RETURNS TABLE (
  room_id UUID,
  flagged_rate NUMERIC,
  avg_toxicity NUMERIC,
  recommendation TEXT,
  suggested_action TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.room_id,
    ROUND(100.0 * COUNT(*) FILTER (WHERE m.is_flagged = TRUE) / NULLIF(COUNT(*), 0), 2) AS flagged_rate,
    (AVG((m.flags->>'toxicity_score')::float))::NUMERIC AS avg_toxicity,
    CASE 
      WHEN AVG((m.flags->>'toxicity_score')::float) > 0.8 THEN 'High toxicity detected - consider stricter moderation'
      WHEN AVG((m.flags->>'toxicity_score')::float) > 0.6 THEN 'Moderate toxicity - monitor closely'
      ELSE 'Normal activity'
    END::TEXT AS recommendation,
    CASE 
      WHEN COUNT(*) FILTER (WHERE m.is_flagged = TRUE) > 10 THEN 'Enable auto-moderation for this room'
      WHEN COUNT(*) FILTER (WHERE m.is_flagged = TRUE) > 5 THEN 'Increase moderation frequency'
      ELSE 'Current moderation sufficient'
    END::TEXT AS suggested_action
  FROM messages m
  WHERE m.created_at > NOW() - INTERVAL '7 days'
    AND (room_id_param IS NULL OR m.room_id = room_id_param)
  GROUP BY m.room_id
  HAVING COUNT(*) > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for AI to detect presence dropouts
CREATE OR REPLACE FUNCTION ai_detect_presence_dropouts(hours_threshold INT DEFAULT 2)
RETURNS TABLE (
  user_id UUID,
  room_id UUID,
  last_seen TIMESTAMPTZ,
  hours_absent NUMERIC,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    pl.user_id,
    pl.room_id,
    MAX(pl.created_at)::TIMESTAMPTZ AS last_seen,
    EXTRACT(EPOCH FROM (NOW() - MAX(pl.created_at))) / 3600.0 AS hours_absent,
    CASE 
      WHEN EXTRACT(EPOCH FROM (NOW() - MAX(pl.created_at))) / 3600.0 > hours_threshold THEN 'potential_dropout'
      ELSE 'active'
    END::TEXT AS status
  FROM presence_logs pl
  WHERE pl.status = 'online'
  GROUP BY pl.user_id, pl.room_id
  HAVING MAX(pl.created_at) < NOW() - (hours_threshold || ' hours')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ===============================================
-- VERIFICATION
-- ===============================================

SELECT 
  'AI VIEWS CREATED' AS status,
  COUNT(*)::TEXT AS count
FROM pg_views
WHERE schemaname = 'public' AND viewname LIKE 'ai_%';

SELECT 
  'AI FUNCTIONS CREATED' AS status,
  COUNT(*)::TEXT AS count
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'ai_%';

