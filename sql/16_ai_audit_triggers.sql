-- ===============================================
-- FILE: 16_ai_audit_triggers.sql
-- PURPOSE: Database-level triggers for AI operation audit logging
-- DEPENDENCIES: 01_sinapse_schema.sql, 11_indexing_and_rls.sql
-- ===============================================
-- 
-- This provides a database-level safety net for AI operations.
-- Even if application code fails, these triggers ensure audit logging.
-- 
-- Note: Application code in ai-safeguards.ts already logs to audit_log,
-- but these triggers provide defense-in-depth for critical operations.
-- ===============================================

BEGIN;

-- ===============================================
-- HELPER FUNCTION: Generate audit log entry
-- ===============================================

CREATE OR REPLACE FUNCTION log_ai_audit_event(
  event_type_param TEXT,
  payload_param JSONB DEFAULT '{}'::jsonb,
  actor_param TEXT DEFAULT 'ai_automation'
)
RETURNS void AS $$
DECLARE
  prev_hash_val TEXT;
  chain_hash_val TEXT;
  hash_val TEXT;
BEGIN
  -- Get previous chain hash
  SELECT chain_hash INTO prev_hash_val
  FROM audit_log
  WHERE actor = actor_param
  ORDER BY event_time DESC
  LIMIT 1;

  -- Generate hash for this event
  hash_val := encode(
    digest(
      event_type_param || 
      COALESCE(payload_param::text, '') || 
      COALESCE(prev_hash_val, '') || 
      NOW()::text,
      'sha256'
    ),
    'hex'
  );

  -- Generate chain hash
  chain_hash_val := encode(
    digest(
      COALESCE(prev_hash_val, '') || hash_val,
      'sha256'
    ),
    'hex'
  );

  -- Insert audit log entry
  INSERT INTO audit_log (
    event_time,
    event_type,
    payload,
    actor,
    hash,
    prev_hash,
    chain_hash,
    node_id
  ) VALUES (
    NOW(),
    event_type_param,
    payload_param,
    actor_param,
    hash_val,
    prev_hash_val,
    chain_hash_val,
    current_setting('app.node_id', true)::text
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail to not break main operations
    -- Application code will handle logging
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- TRIGGER: Bot status changes (AI-driven)
-- ===============================================

CREATE OR REPLACE FUNCTION trigger_bot_ai_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if status changed and it's likely AI-driven
  IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
    PERFORM log_ai_audit_event(
      CASE 
        WHEN NEW.is_active = FALSE THEN 'ai_bot_deactivated'
        ELSE 'ai_bot_activated'
      END,
      jsonb_build_object(
        'bot_id', NEW.id,
        'bot_name', NEW.name,
        'previous_status', OLD.is_active,
        'new_status', NEW.is_active,
        'created_by', NEW.created_by,
        'triggered_by', 'ai_automation'
      ),
      'ai_automation'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_bot_ai_status_change ON bots;
CREATE TRIGGER trigger_bot_ai_status_change
  AFTER UPDATE OF is_active ON bots
  FOR EACH ROW
  WHEN (OLD.is_active IS DISTINCT FROM NEW.is_active)
  EXECUTE FUNCTION trigger_bot_ai_status_change();

-- ===============================================
-- TRIGGER: Room metadata changes (AI-driven moderation)
-- ===============================================

CREATE OR REPLACE FUNCTION trigger_room_ai_moderation_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log if moderation settings changed (likely AI-driven)
  IF OLD.metadata->>'toxicity_threshold' IS DISTINCT FROM NEW.metadata->>'toxicity_threshold' THEN
    PERFORM log_ai_audit_event(
      'ai_moderation_threshold_adjusted',
      jsonb_build_object(
        'room_id', NEW.id,
        'room_slug', NEW.slug,
        'previous_threshold', OLD.metadata->>'toxicity_threshold',
        'new_threshold', NEW.metadata->>'toxicity_threshold',
        'triggered_by', 'ai_automation'
      ),
      'ai_automation'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_room_ai_moderation_change ON rooms;
CREATE TRIGGER trigger_room_ai_moderation_change
  AFTER UPDATE OF metadata ON rooms
  FOR EACH ROW
  WHEN (
    OLD.metadata->>'toxicity_threshold' IS DISTINCT FROM NEW.metadata->>'toxicity_threshold'
  )
  EXECUTE FUNCTION trigger_room_ai_moderation_change();

-- ===============================================
-- TRIGGER: System config changes (AI-driven rate limits, cache TTLs)
-- ===============================================

CREATE OR REPLACE FUNCTION trigger_system_config_ai_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log AI-driven config changes
  IF NEW.key LIKE 'ai_%' OR NEW.key LIKE 'rate_limit_%' OR NEW.key LIKE 'cache_ttl_%' THEN
    PERFORM log_ai_audit_event(
      'ai_config_updated',
      jsonb_build_object(
        'config_key', NEW.key,
        'previous_value', OLD.value,
        'new_value', NEW.value,
        'updated_at', NEW.updated_at,
        'triggered_by', 'ai_automation'
      ),
      'ai_automation'
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_system_config_ai_change ON system_config;
CREATE TRIGGER trigger_system_config_ai_change
  AFTER UPDATE ON system_config
  FOR EACH ROW
  WHEN (
    (NEW.key LIKE 'ai_%' OR NEW.key LIKE 'rate_limit_%' OR NEW.key LIKE 'cache_ttl_%')
    AND OLD.value IS DISTINCT FROM NEW.value
  )
  EXECUTE FUNCTION trigger_system_config_ai_change();

-- ===============================================
-- VIEW: AI Operation Audit Summary
-- ===============================================

CREATE OR REPLACE VIEW ai_audit_operations_summary AS
SELECT 
  DATE_TRUNC('hour', event_time) AS hour_bucket,
  event_type,
  COUNT(*) AS operation_count,
  COUNT(DISTINCT payload->>'operation') AS unique_operations,
  AVG((payload->>'durationMs')::numeric) AS avg_duration_ms,
  COUNT(*) FILTER (WHERE payload->>'error' IS NOT NULL) AS error_count,
  COUNT(*) FILTER (WHERE payload->>'error' IS NULL) AS success_count
FROM audit_log
WHERE actor = 'ai_automation'
  AND event_time > NOW() - INTERVAL '7 days'
GROUP BY DATE_TRUNC('hour', event_time), event_type
ORDER BY hour_bucket DESC, operation_count DESC;

-- ===============================================
-- FUNCTION: Get AI operation errors in last N hours
-- ===============================================

CREATE OR REPLACE FUNCTION get_ai_operation_errors(hours_back INT DEFAULT 24)
RETURNS TABLE (
  event_time TIMESTAMPTZ,
  event_type TEXT,
  operation TEXT,
  error_message TEXT,
  context JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.event_time,
    al.event_type,
    al.payload->>'operation' AS operation,
    al.payload->>'error' AS error_message,
    al.payload AS context
  FROM audit_log al
  WHERE al.actor = 'ai_automation'
    AND al.event_type = 'ai_operation_error'
    AND al.event_time > NOW() - (hours_back || ' hours')::INTERVAL
  ORDER BY al.event_time DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- FUNCTION: Get AI token spend summary
-- ===============================================

CREATE OR REPLACE FUNCTION get_ai_token_spend_summary(days_back INT DEFAULT 7)
RETURNS TABLE (
  date DATE,
  total_spend NUMERIC,
  operation_count BIGINT,
  avg_tokens_per_operation NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(al.event_time) AS date,
    SUM((al.payload->>'spend')::numeric) AS total_spend,
    COUNT(*) AS operation_count,
    AVG((al.payload->>'tokens')::numeric) AS avg_tokens_per_operation
  FROM audit_log al
  WHERE al.event_type = 'ai_token_spend_tracking'
    AND al.event_time > NOW() - (days_back || ' days')::INTERVAL
  GROUP BY DATE(al.event_time)
  ORDER BY date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- INDEXES FOR AI AUDIT QUERIES
-- ===============================================

CREATE INDEX IF NOT EXISTS idx_audit_log_ai_actor_time 
  ON audit_log (actor, event_time DESC) 
  WHERE actor = 'ai_automation';

CREATE INDEX IF NOT EXISTS idx_audit_log_ai_event_type_time 
  ON audit_log (event_type, event_time DESC) 
  WHERE actor = 'ai_automation' 
  AND event_type LIKE 'ai_%';

CREATE INDEX IF NOT EXISTS idx_audit_log_ai_payload_operation 
  ON audit_log USING GIN (payload) 
  WHERE actor = 'ai_automation' 
  AND payload ? 'operation';

-- ===============================================
-- GRANTS (if using dedicated AI service role)
-- ===============================================

-- Uncomment if you create a dedicated AI service role:
-- CREATE ROLE ai_service WITH LOGIN;
-- GRANT SELECT ON ai_audit_operations_summary TO ai_service;
-- GRANT EXECUTE ON FUNCTION get_ai_operation_errors TO ai_service;
-- GRANT EXECUTE ON FUNCTION get_ai_token_spend_summary TO ai_service;

COMMIT;

-- ===============================================
-- NOTES
-- ===============================================
-- 1. These triggers provide defense-in-depth for AI operations
-- 2. Application code in ai-safeguards.ts is the primary logging mechanism
-- 3. These triggers ensure logging even if application code fails
-- 4. All AI operations are logged with chained hashes for audit integrity
-- 5. Views and functions provide easy querying of AI operation history
-- 6. Indexes optimize queries for AI audit analysis

