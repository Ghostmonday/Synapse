-- ===============================================
-- FILE: 12_telemetry_triggers.sql
-- PURPOSE: Automatic telemetry event logging via triggers
-- DEPENDENCIES: 01_sinapse_schema.sql, 10_integrated_features.sql
-- ===============================================

BEGIN;

-- ===============================================
-- TELEMETRY HELPER FUNCTION
-- ===============================================

CREATE OR REPLACE FUNCTION log_telemetry_event(
  event_type TEXT,
  user_id_param UUID DEFAULT NULL,
  room_id_param UUID DEFAULT NULL,
  metadata_param JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  INSERT INTO telemetry (
    event,
    user_id,
    room_id,
    features,
    event_time
  ) VALUES (
    event_type,
    user_id_param,
    room_id_param,
    metadata_param,
    NOW()
  );
EXCEPTION
  WHEN OTHERS THEN
    -- Silently fail telemetry logging to not break main operations
    NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===============================================
-- MESSAGING EVENTS TRIGGERS
-- ===============================================

-- Trigger: msg_edited
CREATE OR REPLACE FUNCTION trigger_msg_edited_telemetry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_edited = TRUE AND OLD.is_edited = FALSE THEN
    PERFORM log_telemetry_event(
      'msg_edited',
      NEW.sender_id,
      NEW.room_id,
      jsonb_build_object(
        'message_id', NEW.id,
        'content_length', LENGTH(COALESCE(NEW.content_preview, ''))
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_msg_edited_telemetry ON messages;
CREATE TRIGGER trigger_msg_edited_telemetry
  AFTER UPDATE ON messages
  FOR EACH ROW
  WHEN (NEW.is_edited = TRUE AND OLD.is_edited = FALSE)
  EXECUTE FUNCTION trigger_msg_edited_telemetry();

-- Trigger: msg_deleted (via audit_log or soft delete flag)
-- Note: If using soft delete, add is_deleted column and trigger
-- For now, we'll log via application code

-- Trigger: msg_flagged
CREATE OR REPLACE FUNCTION trigger_msg_flagged_telemetry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_flagged = TRUE AND (OLD.is_flagged IS NULL OR OLD.is_flagged = FALSE) THEN
    PERFORM log_telemetry_event(
      'msg_flagged',
      NEW.sender_id,
      NEW.room_id,
      jsonb_build_object(
        'message_id', NEW.id,
        'flags', NEW.flags,
        'toxicity_score', NEW.flags->>'toxicity_score'
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_msg_flagged_telemetry ON messages;
CREATE TRIGGER trigger_msg_flagged_telemetry
  AFTER UPDATE ON messages
  FOR EACH ROW
  WHEN (NEW.is_flagged = TRUE AND (OLD.is_flagged IS NULL OR OLD.is_flagged = FALSE))
  EXECUTE FUNCTION trigger_msg_flagged_telemetry();

-- Trigger: msg_reacted (when reactions change)
CREATE OR REPLACE FUNCTION trigger_msg_reacted_telemetry()
RETURNS TRIGGER AS $$
DECLARE
  old_reaction_count INT;
  new_reaction_count INT;
BEGIN
  old_reaction_count := jsonb_array_length(COALESCE(OLD.reactions, '[]'::jsonb));
  new_reaction_count := jsonb_array_length(COALESCE(NEW.reactions, '[]'::jsonb));
  
  IF new_reaction_count != old_reaction_count THEN
    PERFORM log_telemetry_event(
      'msg_reacted',
      NEW.sender_id,
      NEW.room_id,
      jsonb_build_object(
        'message_id', NEW.id,
        'reaction_count', new_reaction_count,
        'reactions', NEW.reactions
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_msg_reacted_telemetry ON messages;
CREATE TRIGGER trigger_msg_reacted_telemetry
  AFTER UPDATE ON messages
  FOR EACH ROW
  WHEN (NEW.reactions IS DISTINCT FROM OLD.reactions)
  EXECUTE FUNCTION trigger_msg_reacted_telemetry();

-- ===============================================
-- PRESENCE & SESSION EVENTS TRIGGERS
-- ===============================================

-- Trigger: user_joined_room / user_left_room
CREATE OR REPLACE FUNCTION trigger_presence_telemetry()
RETURNS TRIGGER AS $$
DECLARE
  event_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    event_name := 'user_joined_room';
    PERFORM log_telemetry_event(
      event_name,
      NEW.user_id,
      NEW.room_id,
      jsonb_build_object(
        'status', NEW.status,
        'presence_log_id', NEW.id
      )
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Detect status changes
    IF NEW.status != OLD.status THEN
      IF NEW.status = 'offline' AND OLD.status != 'offline' THEN
        PERFORM log_telemetry_event(
          'user_left_room',
          NEW.user_id,
          NEW.room_id,
          jsonb_build_object(
            'previous_status', OLD.status,
            'new_status', NEW.status
          )
        );
      ELSIF NEW.status = 'idle' AND OLD.status != 'idle' THEN
        PERFORM log_telemetry_event(
          'user_idle',
          NEW.user_id,
          NEW.room_id,
          jsonb_build_object('presence_log_id', NEW.id)
        );
      ELSIF NEW.status != 'idle' AND OLD.status = 'idle' THEN
        PERFORM log_telemetry_event(
          'user_back',
          NEW.user_id,
          NEW.room_id,
          jsonb_build_object('presence_log_id', NEW.id)
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_presence_telemetry ON presence_logs;
CREATE TRIGGER trigger_presence_telemetry
  AFTER INSERT OR UPDATE ON presence_logs
  FOR EACH ROW
  EXECUTE FUNCTION trigger_presence_telemetry();

-- ===============================================
-- THREAD EVENTS TRIGGERS
-- ===============================================

-- Trigger: thread_created
CREATE OR REPLACE FUNCTION trigger_thread_created_telemetry()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_telemetry_event(
    'thread_created',
    NEW.created_by,
    NEW.room_id,
    jsonb_build_object(
      'thread_id', NEW.id,
      'parent_message_id', NEW.parent_message_id,
      'title', NEW.title
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_thread_created_telemetry ON threads;
CREATE TRIGGER trigger_thread_created_telemetry
  AFTER INSERT ON threads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_thread_created_telemetry();

-- Trigger: thread_closed
CREATE OR REPLACE FUNCTION trigger_thread_closed_telemetry()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_archived = TRUE AND (OLD.is_archived IS NULL OR OLD.is_archived = FALSE) THEN
    PERFORM log_telemetry_event(
      'thread_closed',
      NEW.created_by,
      NEW.room_id,
      jsonb_build_object(
        'thread_id', NEW.id,
        'message_count', NEW.message_count
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_thread_closed_telemetry ON threads;
CREATE TRIGGER trigger_thread_closed_telemetry
  AFTER UPDATE ON threads
  FOR EACH ROW
  WHEN (NEW.is_archived = TRUE AND (OLD.is_archived IS NULL OR OLD.is_archived = FALSE))
  EXECUTE FUNCTION trigger_thread_closed_telemetry();

-- ===============================================
-- BOT EVENTS (Application-level, but provide helper)
-- ===============================================

-- Note: Bot events are typically logged from application code
-- But we can create a helper function for consistency

CREATE OR REPLACE FUNCTION log_bot_event(
  bot_id_param UUID,
  event_type TEXT,
  user_id_param UUID DEFAULT NULL,
  room_id_param UUID DEFAULT NULL,
  metadata_param JSONB DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
  PERFORM log_telemetry_event(
    event_type,
    user_id_param,
    room_id_param,
    jsonb_build_object(
      'bot_id', bot_id_param
    ) || metadata_param
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMIT;

-- ===============================================
-- NOTES
-- ===============================================
-- Some events are best logged from application code:
-- - msg_deleted (if soft delete, add trigger)
-- - msg_pinned (requires pinning feature)
-- - voice_session_start/end (LiveKit webhooks)
-- - client_connected/disconnected (WebSocket layer)
-- - reconnect_attempt (client-side)
-- - mobile_foreground/background (client-side)
-- - mod_action_taken (application logic)
-- - ai_suggestion_* (application logic)
--
-- Use log_telemetry_event() or log_bot_event() functions
-- from TypeScript for application-level events

