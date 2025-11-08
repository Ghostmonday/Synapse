-- ===============================================
-- FILE: 17_ux_telemetry_schema.sql
-- PURPOSE: UX Telemetry System - Standalone Product Observability Layer
-- DEPENDENCIES: 01_sinapse_schema.sql (requires users and rooms tables)
-- ===============================================

-- **IMPORTANT**: This is a STANDALONE telemetry system for product/UX observability
-- It is completely SEPARATE from the system/infra telemetry in the `telemetry` table.
-- This data is designed for:
--   - Product teams (designers, PMs)
--   - AI agents (LLM observers for autonomous UX optimization)
--   - Behavioral analytics
-- NOT for engineering debugging or system monitoring.

-- ===============================================
-- UX TELEMETRY TABLE
-- ===============================================

CREATE TABLE IF NOT EXISTS ux_telemetry (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Event tracing and correlation
  trace_id TEXT NOT NULL,           -- Correlates with backend traces
  session_id TEXT NOT NULL,         -- Groups events by user session
  
  -- Event classification
  event_type TEXT NOT NULL,         -- Specific event (ui_click, message_send_failed, etc.)
  category TEXT NOT NULL,           -- Event category (ui_state, clickstream, messaging, etc.)
  
  -- Component and state tracking
  component_id TEXT,                -- UI component identifier
  state_before TEXT,                -- State before transition
  state_after TEXT,                 -- State after transition
  
  -- Event data (PII-scrubbed)
  metadata JSONB DEFAULT '{}'::jsonb,       -- Event-specific data (NO raw user messages)
  device_context JSONB DEFAULT '{}'::jsonb, -- Browser/device info
  
  -- Sampling and privacy
  sampling_flag BOOLEAN DEFAULT false,      -- true = sampled, false = 100% captured
  
  -- User/room context (optional)
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  
  -- Timestamps
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),  -- When event occurred
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()   -- When record was created
);

-- Add table comment to clarify separation
COMMENT ON TABLE ux_telemetry IS 
  'Product/UX telemetry for AI observability and user behavior analysis. '
  'Completely separate from system telemetry. '
  'Designed for designers, PMs, and AI agents - not engineering debugging.';

-- Add column comments for clarity
COMMENT ON COLUMN ux_telemetry.trace_id IS 'Correlates UX events with backend API traces';
COMMENT ON COLUMN ux_telemetry.session_id IS 'Groups events by user session for journey analysis';
COMMENT ON COLUMN ux_telemetry.category IS 'Event category for filtering (ui_state, clickstream, messaging, etc.)';
COMMENT ON COLUMN ux_telemetry.event_type IS 'Specific event type (ui_click, message_rollback, etc.)';
COMMENT ON COLUMN ux_telemetry.metadata IS 'Event metadata - PII-scrubbed, no raw user messages';
COMMENT ON COLUMN ux_telemetry.sampling_flag IS 'true = event was sampled, false = 100% captured';

-- ===============================================
-- INDEXES FOR PERFORMANCE
-- ===============================================

-- Session-based queries (most common for user journey analysis)
CREATE INDEX IF NOT EXISTS idx_ux_telemetry_session 
  ON ux_telemetry (session_id, event_time DESC);

-- Trace-based queries (correlating with backend traces)
CREATE INDEX IF NOT EXISTS idx_ux_telemetry_trace 
  ON ux_telemetry (trace_id, event_time DESC);

-- Category-based queries (CRITICAL for LLM observer pattern detection)
CREATE INDEX IF NOT EXISTS idx_ux_telemetry_category 
  ON ux_telemetry (category);

-- Event type queries (specific event analysis)
CREATE INDEX IF NOT EXISTS idx_ux_telemetry_event_type 
  ON ux_telemetry (event_type);

-- Composite index for category + time (optimized for LLM observer queries)
CREATE INDEX IF NOT EXISTS idx_ux_telemetry_category_time 
  ON ux_telemetry (category, event_time DESC);

-- User-based queries with time (for user-specific analysis)
CREATE INDEX IF NOT EXISTS idx_ux_telemetry_user_time 
  ON ux_telemetry (user_id, event_time DESC) 
  WHERE user_id IS NOT NULL;

-- Room-based queries (for room-specific UX analysis)
CREATE INDEX IF NOT EXISTS idx_ux_telemetry_room_time 
  ON ux_telemetry (room_id, event_time DESC) 
  WHERE room_id IS NOT NULL;

-- Component-based queries (for component-specific analysis)
CREATE INDEX IF NOT EXISTS idx_ux_telemetry_component 
  ON ux_telemetry (component_id, event_time DESC) 
  WHERE component_id IS NOT NULL;

-- ===============================================
-- ROW LEVEL SECURITY (RLS)
-- ===============================================

-- Enable RLS on ux_telemetry table
ALTER TABLE ux_telemetry ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user ID from JWT
CREATE OR REPLACE FUNCTION public.ux_current_uid() RETURNS UUID AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'sub')::UUID,
    NULL
  );
$$ LANGUAGE SQL STABLE;

-- Helper function to get current user role
CREATE OR REPLACE FUNCTION public.ux_current_role() RETURNS TEXT AS $$
  SELECT COALESCE(
    (current_setting('request.jwt.claims', true)::json->>'role')::TEXT,
    'anon'
  );
$$ LANGUAGE SQL STABLE;

-- Policy: Users can read their own UX telemetry
CREATE POLICY ux_telemetry_read_own ON ux_telemetry
  FOR SELECT
  USING (
    user_id = ux_current_uid() 
    OR user_id IS NULL  -- Allow reading anonymous events
  );

-- Policy: Service role can read all UX telemetry (for LLM observer, analytics)
CREATE POLICY ux_telemetry_read_service ON ux_telemetry
  FOR SELECT
  USING (ux_current_role() = 'service_role');

-- Policy: Authenticated users can insert their own events
CREATE POLICY ux_telemetry_insert_own ON ux_telemetry
  FOR INSERT
  WITH CHECK (
    user_id = ux_current_uid() 
    OR user_id IS NULL  -- Allow anonymous events
  );

-- Policy: Service role can insert any event (for server-side ingestion)
CREATE POLICY ux_telemetry_insert_service ON ux_telemetry
  FOR INSERT
  WITH CHECK (ux_current_role() = 'service_role');

-- Policy: No updates allowed (telemetry is immutable)
-- Intentionally no UPDATE policies - events are append-only

-- Policy: Service role can delete (for GDPR compliance, data retention)
CREATE POLICY ux_telemetry_delete_service ON ux_telemetry
  FOR DELETE
  USING (ux_current_role() = 'service_role');

-- ===============================================
-- AGGREGATED VIEWS FOR PRODUCT TEAMS
-- ===============================================

-- View: Recent UX events summary (last 24 hours)
CREATE OR REPLACE VIEW ux_telemetry_recent_summary AS
SELECT
  category,
  event_type,
  COUNT(*) AS event_count,
  COUNT(DISTINCT session_id) AS unique_sessions,
  COUNT(DISTINCT user_id) AS unique_users,
  MIN(event_time) AS first_event,
  MAX(event_time) AS last_event,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE sampling_flag = true) / NULLIF(COUNT(*), 0),
    2
  ) AS sampled_percentage
FROM ux_telemetry
WHERE event_time > NOW() - INTERVAL '24 hours'
GROUP BY category, event_type
ORDER BY event_count DESC;

COMMENT ON VIEW ux_telemetry_recent_summary IS 
  'Aggregated summary of UX events in the last 24 hours. '
  'Safe for product teams and designers to query.';

-- View: Category summary (for LLM observer pattern detection)
CREATE OR REPLACE VIEW ux_telemetry_category_summary AS
SELECT
  category,
  COUNT(*) AS total_events,
  COUNT(DISTINCT event_type) AS unique_event_types,
  COUNT(DISTINCT session_id) AS unique_sessions,
  MIN(event_time) AS earliest_event,
  MAX(event_time) AS latest_event,
  ARRAY_AGG(DISTINCT event_type) AS event_types
FROM ux_telemetry
WHERE event_time > NOW() - INTERVAL '7 days'
GROUP BY category
ORDER BY total_events DESC;

COMMENT ON VIEW ux_telemetry_category_summary IS 
  'Category-level summary for LLM observer queries. '
  'Shows event distribution across categories.';

-- ===============================================
-- UTILITY FUNCTIONS
-- ===============================================

-- Function: Get events by session (for user journey analysis)
CREATE OR REPLACE FUNCTION get_ux_events_by_session(
  p_session_id TEXT,
  p_limit INT DEFAULT 100
)
RETURNS TABLE (
  id UUID,
  trace_id TEXT,
  event_type TEXT,
  category TEXT,
  component_id TEXT,
  state_before TEXT,
  state_after TEXT,
  metadata JSONB,
  event_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.trace_id,
    t.event_type,
    t.category,
    t.component_id,
    t.state_before,
    t.state_after,
    t.metadata,
    t.event_time
  FROM ux_telemetry t
  WHERE t.session_id = p_session_id
  ORDER BY t.event_time ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get events by category (for LLM observer)
CREATE OR REPLACE FUNCTION get_ux_events_by_category(
  p_category TEXT,
  p_hours INT DEFAULT 24,
  p_limit INT DEFAULT 1000
)
RETURNS TABLE (
  id UUID,
  trace_id TEXT,
  session_id TEXT,
  event_type TEXT,
  component_id TEXT,
  state_before TEXT,
  state_after TEXT,
  metadata JSONB,
  event_time TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.trace_id,
    t.session_id,
    t.event_type,
    t.component_id,
    t.state_before,
    t.state_after,
    t.metadata,
    t.event_time
  FROM ux_telemetry t
  WHERE t.category = p_category
    AND t.event_time > NOW() - (p_hours || ' hours')::INTERVAL
  ORDER BY t.event_time DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Delete user's UX telemetry (GDPR compliance)
CREATE OR REPLACE FUNCTION delete_user_ux_telemetry(
  p_user_id UUID
)
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM ux_telemetry
  WHERE user_id = p_user_id;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- DATA RETENTION POLICY
-- ===============================================

-- Function: Clean up old UX telemetry data (run via cron/scheduler)
CREATE OR REPLACE FUNCTION cleanup_old_ux_telemetry(
  p_retention_days INT DEFAULT 90
)
RETURNS INT AS $$
DECLARE
  deleted_count INT;
BEGIN
  DELETE FROM ux_telemetry
  WHERE event_time < NOW() - (p_retention_days || ' days')::INTERVAL;
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_old_ux_telemetry IS 
  'Deletes UX telemetry data older than specified retention period. '
  'Default: 90 days. Run via scheduled job.';

-- ===============================================
-- VERIFICATION QUERIES
-- ===============================================

-- Verify table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'ux_telemetry'
  ) THEN
    RAISE NOTICE '✓ ux_telemetry table created successfully';
  END IF;
END $$;

-- Verify indexes exist
DO $$
DECLARE
  index_count INT;
BEGIN
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename = 'ux_telemetry';
  
  RAISE NOTICE '✓ Created % indexes on ux_telemetry table', index_count;
END $$;

-- Verify RLS is enabled
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE tablename = 'ux_telemetry'
      AND rowsecurity = true
  ) THEN
    RAISE NOTICE '✓ RLS enabled on ux_telemetry table';
  END IF;
END $$;

