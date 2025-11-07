-- ===============================================
-- FILE: 04_moderation_apply.sql
-- PURPOSE: Moderation governance with strike escalation and probation
-- DEPENDENCIES: 01_sinapse_schema.sql, 02_compressor_functions.sql
-- ===============================================

SET search_path TO service, public;

-- ===============================================
-- MODERATION APPLICATION
-- ===============================================

-- Moderation apply: Apply AI moderation flags with strike escalation
-- Race-safe with FOR UPDATE on messages and room_memberships
CREATE OR REPLACE FUNCTION moderation_apply(
  msg_id UUID,
  lbls JSONB,
  scrs JSONB,
  feats JSONB
) RETURNS VOID AS $$
DECLARE
  msg RECORD;
  mem RECORD;
  thresh JSONB;
  prob_mult NUMERIC := 1.0;
  max_score NUMERIC := 0;
  strike_inc INT := 0;
  pre_state JSONB;
  post_state JSONB;
  key TEXT;
BEGIN
  -- Lock message for update
  SELECT * INTO STRICT msg
  FROM messages
  WHERE id = msg_id
  FOR UPDATE;
  
  -- Get moderation thresholds from system_config
  SELECT value INTO thresh
  FROM system_config
  WHERE key = 'moderation_thresholds';
  
  IF thresh IS NULL THEN
    RAISE EXCEPTION 'moderation_thresholds not found in system_config';
  END IF;
  
  -- Lock membership for update (create if not exists)
  SELECT * INTO mem
  FROM room_memberships
  WHERE room_id = msg.room_id
    AND user_id = msg.sender_id
  FOR UPDATE;
  
  -- Capture pre-state for audit
  IF mem IS NOT NULL THEN
    pre_state := row_to_json(mem)::jsonb;
  ELSE
    pre_state := '{}'::jsonb;
  END IF;
  
  -- Apply probation multiplier if user is on probation
  IF mem IS NOT NULL AND mem.probation_until IS NOT NULL AND mem.probation_until > now() THEN
    prob_mult := COALESCE((thresh->>'probation_multiplier')::NUMERIC, 0.5);
  END IF;
  
  -- Find maximum score from scores JSONB
  SELECT COALESCE(MAX(value::NUMERIC), 0) INTO max_score
  FROM jsonb_each_text(scrs);
  
  -- Apply threshold check (with probation multiplier)
  IF max_score >= (COALESCE((thresh->>'default')::NUMERIC, 0.6) * prob_mult) THEN
    -- Flag message
    UPDATE messages
    SET is_flagged = TRUE,
        flags = jsonb_build_object(
          'labels', lbls,
          'scores', scrs,
          'features', feats
        )
    WHERE id = msg_id;
    
    -- Calculate strike increment from labels
    -- Check each label against threshold config
    FOR key IN SELECT jsonb_object_keys(lbls)
    LOOP
      IF key IN ('illegal', 'threat', 'pii', 'hate') THEN
        strike_inc := strike_inc + COALESCE((thresh->key->>'strike')::INT, 1);
      END IF;
    END LOOP;
    
    -- Apply strikes
    IF strike_inc > 0 THEN
      IF mem IS NULL THEN
        -- Create membership with initial strikes
        INSERT INTO room_memberships (
          room_id,
          user_id,
          role,
          strike_count
        )
        VALUES (
          msg.room_id,
          msg.sender_id,
          'member',
          strike_inc
        )
        RETURNING * INTO mem;
      ELSE
        -- Increment strikes
        UPDATE room_memberships
        SET strike_count = strike_count + strike_inc
        WHERE id = mem.id
        RETURNING * INTO mem;
      END IF;
      
      -- Refresh mem record for escalation logic
      SELECT * INTO mem FROM room_memberships WHERE id = mem.id;
    END IF;
    
    -- Escalate based on strike count
    IF mem IS NOT NULL THEN
      IF mem.strike_count >= 4 THEN
        -- Permanent ban
        UPDATE room_memberships
        SET role = 'banned',
            probation_until = now() + INTERVAL '100 years',
            ban_reason = jsonb_build_object('cause', lbls, 'strikes', mem.strike_count)
        WHERE id = mem.id;
      ELSIF mem.strike_count >= 3 THEN
        -- 3-month probation
        UPDATE room_memberships
        SET probation_until = now() + INTERVAL '3 months'
        WHERE id = mem.id;
      ELSIF mem.strike_count >= 2 THEN
        -- 1-month probation
        UPDATE room_memberships
        SET probation_until = now() + INTERVAL '1 month'
        WHERE id = mem.id;
      END IF;
      
      -- Update warning timestamp if cooldown passed
      IF mem.last_warning_at IS NULL OR mem.last_warning_at < now() - INTERVAL '24 hours' THEN
        UPDATE room_memberships
        SET last_warning_at = now()
        WHERE id = mem.id;
      END IF;
      
      -- Refresh for post-state
      SELECT * INTO mem FROM room_memberships WHERE id = mem.id;
    END IF;
  END IF;
  
  -- Capture post-state for audit
  IF mem IS NOT NULL THEN
    post_state := row_to_json(mem)::jsonb;
  ELSE
    post_state := '{}'::jsonb;
  END IF;
  
  -- Audit moderation action
  PERFORM audit_append(
    'moderation_flag',
    msg.room_id,
    msg.sender_id,
    msg_id,
    jsonb_build_object(
      'labels', lbls,
      'scores', scrs,
      'features', feats,
      'max_score', max_score,
      'strike_increment', strike_inc,
      'pre_state', pre_state,
      'post_state', post_state
    ),
    'grok-moderator'
  );
  
  -- Insert telemetry for optimizer
  INSERT INTO telemetry (
    event,
    room_id,
    user_id,
    risk,
    action,
    features
  )
  VALUES (
    'moderation_flag',
    msg.room_id,
    msg.sender_id,
    max_score,
    'flag',
    feats
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- ===============================================
-- MODERATION QUEUE MANAGEMENT
-- ===============================================

-- Enqueue moderation: Add message to moderation queue
CREATE OR REPLACE FUNCTION enqueue_moderation(message_id UUID) RETURNS UUID AS $$
DECLARE
  queue_id UUID;
BEGIN
  INSERT INTO service.moderation_queue (message_id, status)
  VALUES (message_id, 'pending')
  RETURNING id INTO queue_id;
  RETURN queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- Claim moderation batch: Atomically claim pending moderation items
CREATE OR REPLACE FUNCTION claim_moderation_batch(p_limit INT)
RETURNS SETOF JSONB AS $$
BEGIN
  RETURN QUERY
  WITH cte AS (
    SELECT mq.id, mq.message_id
    FROM service.moderation_queue mq
    WHERE mq.status = 'pending'
      AND mq.attempts < mq.max_attempts
    ORDER BY mq.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ),
  upd AS (
    UPDATE service.moderation_queue q
    SET status = 'processing',
        last_attempt_at = now(),
        attempts = attempts + 1
    FROM cte
    WHERE q.id = cte.id
    RETURNING q.id, q.message_id, q.attempts, q.max_attempts
  )
  SELECT jsonb_build_object(
    'id', upd.id,
    'message_id', upd.message_id,
    'attempts', upd.attempts,
    'max_attempts', upd.max_attempts
  )
  FROM upd;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- Mark moderation done: Update queue status after processing
CREATE OR REPLACE FUNCTION mark_moderation_done(queue_id UUID) RETURNS VOID AS $$
BEGIN
  UPDATE service.moderation_queue
  SET status = 'done',
      last_attempt_at = now()
  WHERE id = queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- Mark moderation failed: Record error and handle retry logic
CREATE OR REPLACE FUNCTION mark_moderation_failed(
  queue_id UUID,
  error_msg TEXT
) RETURNS VOID AS $$
DECLARE
  v_attempts INT;
  v_max_attempts INT;
BEGIN
  SELECT attempts, max_attempts INTO v_attempts, v_max_attempts
  FROM service.moderation_queue
  WHERE id = queue_id;
  
  IF v_attempts >= v_max_attempts THEN
    UPDATE service.moderation_queue
    SET status = 'failed',
        error = error_msg,
        last_attempt_at = now()
    WHERE id = queue_id;
  ELSE
    UPDATE service.moderation_queue
    SET status = 'pending', -- Retry
        error = error_msg,
        last_attempt_at = now()
    WHERE id = queue_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

