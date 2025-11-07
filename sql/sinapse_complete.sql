-- ===============================================
-- FILE: sinapse_complete.sql
-- PURPOSE: Complete Sinapse Communication Ledger and Moderation Pipeline Database Setup
-- DESCRIPTION: This file combines all 6 SQL modules into a single executable script
--              Run this file in Supabase SQL Editor or via psql to initialize the database
-- DEPENDENCIES: None (all-in-one)
-- ===============================================

-- ===============================================
-- PART 1: CORE SCHEMA (01_sinapse_schema.sql)
-- ===============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- Create service schema for privileged operations
CREATE SCHEMA IF NOT EXISTS service;

-- ===============================================
-- DROP EXISTING TABLES (if they exist with wrong schema)
-- ===============================================
-- Drop tables in reverse dependency order to avoid foreign key conflicts

DROP TABLE IF EXISTS service.moderation_queue CASCADE;
DROP TABLE IF EXISTS service.encode_queue CASCADE;
DROP TABLE IF EXISTS message_receipts CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS logs_compressed CASCADE;
DROP TABLE IF EXISTS logs_raw CASCADE;
DROP TABLE IF EXISTS audit_log CASCADE;
DROP TABLE IF EXISTS retention_schedule CASCADE;
DROP TABLE IF EXISTS legal_holds CASCADE;
DROP TABLE IF EXISTS telemetry CASCADE;
DROP TABLE IF EXISTS room_memberships CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS system_config CASCADE;

-- Drop existing functions that will be recreated
DROP FUNCTION IF EXISTS partition_month_from_timestamp(TIMESTAMPTZ) CASCADE;

-- ===============================================
-- IMMUTABLE HELPER FUNCTION FOR PARTITION MONTH
-- ===============================================

-- Create immutable function for partition_month generation
CREATE OR REPLACE FUNCTION partition_month_from_timestamp(ts TIMESTAMPTZ)
RETURNS TEXT AS $$
  SELECT to_char(timezone('UTC', ts)::date, 'YYYY_MM');
$$ LANGUAGE SQL IMMUTABLE STRICT;

-- ===============================================
-- CORE TABLES
-- ===============================================

-- Users: Profiles with trust metadata and federation support
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  handle TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_verified BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  policy_flags JSONB DEFAULT '{}'::jsonb,
  last_seen TIMESTAMPTZ,
  federation_id TEXT UNIQUE -- For cross-node user mapping
);

-- Rooms: Metadata with partition key and room-level retention overrides
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_public BOOLEAN NOT NULL DEFAULT true,
  partition_month TEXT GENERATED ALWAYS AS (partition_month_from_timestamp(created_at)) STORED,
  metadata JSONB DEFAULT '{}'::jsonb,
  fed_node_id TEXT, -- Origin node for federated rooms
  retention_hot_days INT, -- Room-level override (NULL = use system default)
  retention_cold_days INT -- Room-level override (NULL = use system default)
);

-- Room memberships: Roles, strikes, probation, and ban tracking
CREATE TABLE IF NOT EXISTS room_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, mod, member, banned
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  strike_count INT NOT NULL DEFAULT 0,
  probation_until TIMESTAMPTZ,
  last_warning_at TIMESTAMPTZ,
  ban_reason JSONB DEFAULT '{}'::jsonb, -- Audit details for bans
  UNIQUE(room_id, user_id)
);

-- Messages: Minimal canonical records with external payload references
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload_ref TEXT NOT NULL, -- 'raw:{id}', 'cmp:{id}', or 'cold:{uri}'
  content_preview TEXT, -- <=512 chars for search/UX
  content_hash TEXT NOT NULL, -- SHA256 of normalized payload
  audit_hash_chain TEXT NOT NULL, -- Tamper-evident chain
  flags JSONB DEFAULT '{}'::jsonb, -- {labels: [], scores: [], features: {}}
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  is_exported BOOLEAN NOT NULL DEFAULT FALSE,
  partition_month TEXT NOT NULL GENERATED ALWAYS AS (partition_month_from_timestamp(created_at)) STORED,
  fed_origin_hash TEXT -- For federated message verification
);

-- Message receipts: Delivery and read states
CREATE TABLE IF NOT EXISTS message_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  UNIQUE(message_id, user_id)
);

-- Audit log: Append-only, immutable events with chained hashes
CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_type TEXT NOT NULL, -- 'moderation_flag', 'ingest', 'export', 'fed_verify', 'cold_storage_transition'
  room_id UUID,
  user_id UUID,
  message_id UUID,
  payload JSONB,
  actor TEXT, -- 'grok-moderator', 'system', 'legal', 'fed_node'
  signature TEXT, -- Ed25519 signature for federation
  hash TEXT NOT NULL, -- SHA256 of canonical event
  prev_hash TEXT, -- Previous audit chain hash
  chain_hash TEXT NOT NULL, -- Chained SHA256
  node_id TEXT NOT NULL DEFAULT 'local' -- Node-specific for federation (set via app.node_id setting in application)
);

-- Raw logs: Transient intake before compression
CREATE TABLE IF NOT EXISTS logs_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload BYTEA NOT NULL,
  mime_type TEXT NOT NULL,
  length_bytes INT NOT NULL,
  checksum TEXT NOT NULL, -- SHA256
  processed BOOLEAN NOT NULL DEFAULT FALSE
);

-- Compressed logs: Declarative partitioning by partition_month
-- Non-FK room_id for partition flexibility (validated via soft-reference jobs)
CREATE TABLE IF NOT EXISTS logs_compressed (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL, -- Non-FK; validated via soft-reference jobs
  partition_month TEXT NOT NULL, -- 'YYYY_MM' format
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  codec TEXT NOT NULL, -- 'lz4' or 'gzip'
  compressed_payload BYTEA NOT NULL,
  original_length INT NOT NULL,
  checksum TEXT NOT NULL, -- SHA256 of compressed payload
  cold_storage_uri TEXT, -- S3 URI when moved to cold storage
  lifecycle_state TEXT NOT NULL DEFAULT 'hot', -- 'hot', 'cold', 'deleted'
  PRIMARY KEY (id, partition_month)
) PARTITION BY RANGE (partition_month);

-- Default partition for overflow
CREATE TABLE IF NOT EXISTS logs_compressed_default PARTITION OF logs_compressed DEFAULT;

-- Encode queue: Tracks compression jobs with status and retry logic
CREATE TABLE IF NOT EXISTS service.encode_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_id UUID NOT NULL REFERENCES logs_raw(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'done', 'failed'
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Moderation queue: Decouples moderation from ingestion for SLO compliance
CREATE TABLE IF NOT EXISTS service.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'done', 'failed'
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Retention schedule: Queued actions for retention lifecycle
CREATE TABLE IF NOT EXISTS retention_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL, -- 'logs_compressed', 'audit_log', 'messages'
  resource_id UUID NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  action TEXT NOT NULL, -- 'move_to_cold', 'delete'
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'done', 'failed', 'on_hold'
  on_hold BOOLEAN NOT NULL DEFAULT false,
  hold_reason TEXT -- For legal holds
);

-- Legal holds: Prevents disposal of resources under legal hold
CREATE TABLE IF NOT EXISTS legal_holds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  hold_until TIMESTAMPTZ NOT NULL,
  reason TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Telemetry: Metrics for optimization and SLO monitoring
CREATE TABLE IF NOT EXISTS telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  event TEXT NOT NULL, -- 'moderation_flag', 'compression', 'backlog_size', 'fallback_codec', etc.
  room_id UUID,
  user_id UUID,
  risk NUMERIC,
  action TEXT,
  features JSONB,
  latency_ms INT,
  precision_recall JSONB DEFAULT '{}'::jsonb -- For optimizer tuning
);

-- System config: Tunables with JSONB for complex configurations
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===============================================
-- INDEXES
-- ===============================================

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_room_time ON messages (room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_hash ON messages (content_hash);
CREATE INDEX IF NOT EXISTS idx_messages_flagged ON messages (is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_messages_partition ON messages (partition_month);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_room_time ON audit_log (room_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_audit_node_chain ON audit_log (node_id, id DESC); -- For per-node chain verification
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log (event_type);

-- Raw logs indexes
CREATE INDEX IF NOT EXISTS idx_logs_raw_room_month ON logs_raw (room_id, created_at DESC);

-- Compressed logs indexes
CREATE INDEX IF NOT EXISTS idx_logs_compressed_room_month ON logs_compressed (room_id, partition_month, created_at DESC);

-- Telemetry indexes
CREATE INDEX IF NOT EXISTS idx_telemetry_event_time ON telemetry (event_time DESC);

-- Queue indexes for efficient claiming
CREATE INDEX IF NOT EXISTS encode_queue_status_idx ON service.encode_queue (status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS moderation_queue_status_idx ON service.moderation_queue (status) WHERE status = 'pending';

-- Room retention override index
CREATE INDEX IF NOT EXISTS rooms_retention_idx ON rooms (retention_hot_days, retention_cold_days) WHERE retention_hot_days IS NOT NULL OR retention_cold_days IS NOT NULL;

-- ===============================================
-- DEFAULT SYSTEM CONFIG
-- ===============================================

-- Insert default system configuration
INSERT INTO system_config (key, value) VALUES
  ('retention_policy', jsonb_build_object(
    'hot_retention_days', 30,
    'cold_retention_days', 365
  )),
  ('cold_storage', jsonb_build_object(
    'bucket', 'sinapse-cold',
    'provider', 's3'
  )),
  ('moderation_thresholds', jsonb_build_object(
    'default', 0.6,
    'illegal', 0.7,
    'threat', 0.6,
    'pii', 0.65,
    'hate', 0.55,
    'adult', 0.0,
    'probation_multiplier', 0.5
  )),
  ('codec', jsonb_build_object(
    'preferences', jsonb_build_object(
      'text/plain', 'lz4',
      'text/*', 'lz4',
      'application/json', 'lz4',
      'application/*', 'gzip',
      'image/*', 'gzip',
      'video/*', 'gzip',
      'audio/*', 'gzip',
      'default', 'gzip'
    )
  ))
ON CONFLICT (key) DO NOTHING;

-- Set default node_id if not already set
DO $$
BEGIN
  IF current_setting('app.node_id', true) IS NULL THEN
    PERFORM set_config('app.node_id', 'local', false);
  END IF;
END $$;

-- ===============================================
-- PART 2: COMPRESSOR FUNCTIONS (02_compressor_functions.sql)
-- ===============================================

SET search_path TO service, public;

-- ===============================================
-- UTILITY FUNCTIONS
-- ===============================================

-- SHA256 hex helper: Immutable hash function
-- Note: Ensure search_path includes public for pgcrypto functions
CREATE OR REPLACE FUNCTION sha256_hex(data bytea) RETURNS TEXT 
LANGUAGE SQL IMMUTABLE STRICT
SET search_path = public
AS $$
  SELECT encode(digest($1, 'sha256'::text), 'hex');
$$;

-- ===============================================
-- INTAKE STAGE
-- ===============================================

-- Intake log: Insert raw payload and return UUID for enqueueing
CREATE OR REPLACE FUNCTION intake_log(
  room UUID,
  payload BYTEA,
  mime TEXT
) RETURNS UUID AS $$
DECLARE
  rid UUID;
  csum TEXT;
BEGIN
  csum := sha256_hex(payload);
  INSERT INTO logs_raw (room_id, payload, mime_type, length_bytes, checksum)
  VALUES (room, payload, mime, octet_length(payload), csum)
  RETURNING id INTO rid;
  RETURN rid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- ===============================================
-- ENCODE QUEUE MANAGEMENT
-- ===============================================

-- Enqueue encode: Add raw log to compression queue
CREATE OR REPLACE FUNCTION enqueue_encode(raw_id UUID) RETURNS UUID AS $$
DECLARE
  queue_id UUID;
BEGIN
  INSERT INTO service.encode_queue (raw_id, status)
  VALUES (raw_id, 'pending')
  RETURNING id INTO queue_id;
  RETURN queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- Claim encode batch: Atomically claim pending items with enriched data
-- Returns JSONB array with id, raw_id, mime_type for efficient sorting
CREATE OR REPLACE FUNCTION claim_encode_batch(p_limit INT)
RETURNS SETOF JSONB AS $$
BEGIN
  RETURN QUERY
  WITH cte AS (
    SELECT eq.id, eq.raw_id
    FROM service.encode_queue eq
    WHERE eq.status = 'pending'
      AND eq.attempts < eq.max_attempts
    ORDER BY eq.created_at ASC
    LIMIT p_limit
    FOR UPDATE SKIP LOCKED
  ),
  upd AS (
    UPDATE service.encode_queue q
    SET status = 'processing',
        last_attempt_at = now(),
        attempts = attempts + 1
    FROM cte
    WHERE q.id = cte.id
    RETURNING q.id, q.raw_id, q.attempts, q.max_attempts
  )
  SELECT jsonb_build_object(
    'id', upd.id,
    'raw_id', upd.raw_id,
    'mime_type', lr.mime_type,
    'attempts', upd.attempts,
    'max_attempts', upd.max_attempts
  )
  FROM upd
  JOIN logs_raw lr ON lr.id = upd.raw_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- Mark encode done: Update queue status after successful compression
CREATE OR REPLACE FUNCTION mark_encode_done(
  queue_id UUID,
  compressed_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE service.encode_queue
  SET status = 'done',
      last_attempt_at = now()
  WHERE id = queue_id;
  
  -- Mark raw log as processed
  UPDATE logs_raw
  SET processed = TRUE
  WHERE id = (SELECT raw_id FROM service.encode_queue WHERE id = queue_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- Mark encode failed: Record error and handle retry logic
CREATE OR REPLACE FUNCTION mark_encode_failed(
  queue_id UUID,
  error_msg TEXT
) RETURNS VOID AS $$
DECLARE
  v_attempts INT;
  v_max_attempts INT;
BEGIN
  SELECT attempts, max_attempts INTO v_attempts, v_max_attempts
  FROM service.encode_queue
  WHERE id = queue_id;
  
  IF v_attempts >= v_max_attempts THEN
    UPDATE service.encode_queue
    SET status = 'failed',
        error = error_msg,
        last_attempt_at = now()
    WHERE id = queue_id;
  ELSE
    UPDATE service.encode_queue
    SET status = 'pending', -- Retry
        error = error_msg,
        last_attempt_at = now()
    WHERE id = queue_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- ===============================================
-- ENCODE STAGE
-- ===============================================

-- Encode raw to compressed: Insert pre-compressed payload from Edge
-- Edge Function compresses payload, this function stores it
CREATE OR REPLACE FUNCTION encode_raw_to_compressed(
  raw_id UUID,
  codec TEXT DEFAULT 'lz4',
  compressed bytea
) RETURNS UUID AS $$
DECLARE
  raw_row RECORD;
  cmp_id UUID;
  csum TEXT;
BEGIN
  SELECT * INTO STRICT raw_row
  FROM logs_raw
  WHERE id = raw_id
  FOR UPDATE;
  
  IF raw_row.processed THEN
    RAISE EXCEPTION 'raw_id % already processed', raw_id;
  END IF;
  
  csum := sha256_hex(compressed);
  
  INSERT INTO logs_compressed (
    room_id,
    partition_month,
    codec,
    compressed_payload,
    original_length,
    checksum
  )
  VALUES (
    raw_row.room_id,
    to_char(raw_row.created_at, 'YYYY_MM'),
    codec,
    compressed,
    raw_row.length_bytes,
    csum
  )
  RETURNING id INTO cmp_id;
  
  RETURN cmp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- ===============================================
-- ACCESS STAGE
-- ===============================================

-- Fetch compressed: Return compressed payload for Edge decompression
CREATE OR REPLACE FUNCTION fetch_compressed(compressed_id UUID)
RETURNS bytea AS $$
DECLARE
  row RECORD;
BEGIN
  SELECT compressed_payload INTO STRICT row
  FROM logs_compressed
  WHERE id = compressed_id;
  
  RETURN row.compressed_payload;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- ===============================================
-- DISPOSAL STAGE
-- ===============================================

-- Dispose compressed: Mark for deletion or secure purge
CREATE OR REPLACE FUNCTION dispose_compressed(
  compressed_id UUID,
  purge BOOLEAN DEFAULT FALSE
) RETURNS VOID AS $$
BEGIN
  IF purge THEN
    UPDATE logs_compressed
    SET compressed_payload = '\\x',
        lifecycle_state = 'deleted',
        cold_storage_uri = NULL
    WHERE id = compressed_id;
  ELSE
    UPDATE logs_compressed
    SET lifecycle_state = 'deleted'
    WHERE id = compressed_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- ===============================================
-- AUDIT CHAIN (Race-Safe)
-- ===============================================

-- Audit append: Race-safe append with per-node advisory lock
-- Uses pg_try_advisory_xact_lock to prevent concurrent chain appends
CREATE OR REPLACE FUNCTION audit_append(
  evt_type TEXT,
  room UUID,
  usr UUID,
  msg UUID,
  pload JSONB,
  actor TEXT DEFAULT 'system',
  sig TEXT DEFAULT NULL
) RETURNS BIGINT AS $$
DECLARE
  p_hash TEXT;
  h TEXT;
  prev_chain TEXT;
  canonical TEXT;
  new_id BIGINT;
  lock_key BIGINT;
  node_id_val TEXT;
BEGIN
  -- Get or set node_id
  node_id_val := current_setting('app.node_id', true);
  IF node_id_val IS NULL OR node_id_val = '' THEN
    node_id_val := 'local';
    PERFORM set_config('app.node_id', node_id_val, false);
  END IF;
  
  -- Per-node advisory lock (hash of node_id)
  lock_key := hashtext(node_id_val);
  
  IF NOT pg_try_advisory_xact_lock(lock_key) THEN
    RAISE EXCEPTION 'Audit chain lock contention for node_id: %', node_id_val;
  END IF;
  
  -- Get previous chain hash for this node
  SELECT chain_hash INTO prev_chain
  FROM audit_log
  WHERE node_id = node_id_val
  ORDER BY id DESC
  LIMIT 1;
  
  IF prev_chain IS NULL THEN
    prev_chain := 'genesis';
  END IF;
  
  -- Canonicalize event
  canonical := jsonb_build_object(
    'event_time', now(),
    'event_type', evt_type,
    'room_id', room,
    'user_id', usr,
    'message_id', msg,
    'payload', pload,
    'actor', actor,
    'signature', sig,
    'node_id', node_id_val
  )::text;
  
  -- Compute hash
  h := sha256_hex(canonical::bytea);
  
  -- Chain hash: sha256(prev_chain || current_hash)
  p_hash := sha256_hex((prev_chain || h)::bytea);
  
  -- Insert audit entry
  INSERT INTO audit_log (
    event_type,
    room_id,
    user_id,
    message_id,
    payload,
    actor,
    signature,
    hash,
    prev_hash,
    chain_hash,
    node_id
  )
  VALUES (
    evt_type,
    room,
    usr,
    msg,
    pload,
    actor,
    sig,
    h,
    prev_chain,
    p_hash,
    node_id_val
  )
  RETURNING id INTO new_id;
  
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- ===============================================
-- PART 3: RETENTION POLICY (03_retention_policy.sql)
-- ===============================================

SET search_path TO service, public;

-- ===============================================
-- RETENTION SCHEDULING
-- ===============================================

-- Schedule retention: Enqueue hot→cold and cold→delete transitions
-- Respects room-level retention overrides and legal holds
CREATE OR REPLACE FUNCTION schedule_retention() RETURNS JSONB AS $$
DECLARE
  conf JSONB;
  hot_days INT;
  cold_days INT;
  hot_count INT := 0;
  cold_count INT := 0;
  r RECORD;
BEGIN
  -- Get system defaults
  SELECT value INTO conf
  FROM system_config
  WHERE key = 'retention_policy';
  
  hot_days := COALESCE((conf->>'hot_retention_days')::INT, 30);
  cold_days := COALESCE((conf->>'cold_retention_days')::INT, 365);
  
  -- Schedule hot→cold transitions
  -- Join with rooms to get room-level overrides
  FOR r IN
    SELECT lc.id, lc.room_id, lc.created_at,
           COALESCE(r.retention_hot_days, hot_days) AS effective_hot_days
    FROM logs_compressed lc
    LEFT JOIN rooms r ON r.id = lc.room_id
    WHERE lc.lifecycle_state = 'hot'
      AND lc.created_at < now() - make_interval(days => COALESCE(r.retention_hot_days, hot_days))
      AND lc.id NOT IN (
        SELECT resource_id
        FROM retention_schedule
        WHERE resource_type = 'logs_compressed'
          AND resource_id = lc.id
      )
      AND lc.id NOT IN (
        SELECT resource_id
        FROM legal_holds
        WHERE resource_type = 'logs_compressed'
          AND resource_id = lc.id
          AND hold_until > now()
      )
  LOOP
    INSERT INTO retention_schedule (
      resource_type,
      resource_id,
      scheduled_for,
      action
    )
    VALUES (
      'logs_compressed',
      r.id,
      now(),
      'move_to_cold'
    )
    ON CONFLICT DO NOTHING;
    
    hot_count := hot_count + 1;
  END LOOP;
  
  -- Schedule cold→delete transitions
  FOR r IN
    SELECT lc.id, lc.room_id, lc.created_at,
           COALESCE(r.retention_cold_days, cold_days) AS effective_cold_days
    FROM logs_compressed lc
    LEFT JOIN rooms r ON r.id = lc.room_id
    WHERE lc.lifecycle_state = 'cold'
      AND lc.created_at < now() - make_interval(days => COALESCE(r.retention_cold_days, cold_days))
      AND lc.id NOT IN (
        SELECT resource_id
        FROM retention_schedule
        WHERE resource_type = 'logs_compressed'
          AND resource_id = lc.id
      )
      AND lc.id NOT IN (
        SELECT resource_id
        FROM legal_holds
        WHERE resource_type = 'logs_compressed'
          AND resource_id = lc.id
          AND hold_until > now()
      )
  LOOP
    INSERT INTO retention_schedule (
      resource_type,
      resource_id,
      scheduled_for,
      action
    )
    VALUES (
      'logs_compressed',
      r.id,
      now(),
      'delete'
    )
    ON CONFLICT DO NOTHING;
    
    cold_count := cold_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'hot_scheduled', hot_count,
    'cold_scheduled', cold_count,
    'timestamp', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- ===============================================
-- COLD STORAGE MANAGEMENT
-- ===============================================

-- Mark cold storage: Update lifecycle state and S3 URI after upload
CREATE OR REPLACE FUNCTION mark_cold_storage(
  compressed_id UUID,
  uri TEXT
) RETURNS VOID AS $$
BEGIN
  UPDATE logs_compressed
  SET cold_storage_uri = uri,
      lifecycle_state = 'cold'
  WHERE id = compressed_id
    AND lifecycle_state = 'hot'; -- Idempotent: only if still hot
  
  -- Update retention schedule status
  UPDATE retention_schedule
  SET status = 'done'
  WHERE resource_type = 'logs_compressed'
    AND resource_id = compressed_id
    AND action = 'move_to_cold';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- ===============================================
-- LEGAL HOLDS
-- ===============================================

-- Apply legal hold: Prevent disposal of resources under legal hold
CREATE OR REPLACE FUNCTION apply_legal_hold(
  resource_type TEXT,
  resource_id UUID,
  hold_until TIMESTAMPTZ,
  reason TEXT,
  actor TEXT
) RETURNS VOID AS $$
BEGIN
  -- Insert legal hold
  INSERT INTO legal_holds (
    resource_type,
    resource_id,
    hold_until,
    reason,
    actor
  )
  VALUES (
    resource_type,
    resource_id,
    hold_until,
    reason,
    actor
  )
  ON CONFLICT DO NOTHING;
  
  -- Mark retention schedule as on hold
  UPDATE retention_schedule
  SET on_hold = TRUE,
      hold_reason = reason,
      status = 'on_hold'
  WHERE resource_type = apply_legal_hold.resource_type
    AND resource_id = apply_legal_hold.resource_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- Release legal hold: Allow normal retention processing
CREATE OR REPLACE FUNCTION release_legal_hold(
  resource_type TEXT,
  resource_id UUID
) RETURNS VOID AS $$
BEGIN
  -- Delete legal hold
  DELETE FROM legal_holds
  WHERE resource_type = release_legal_hold.resource_type
    AND resource_id = release_legal_hold.resource_id;
  
  -- Release retention schedule hold
  UPDATE retention_schedule
  SET on_hold = FALSE,
      hold_reason = NULL,
      status = 'pending'
  WHERE resource_type = release_legal_hold.resource_type
    AND resource_id = release_legal_hold.resource_id
    AND on_hold = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- ===============================================
-- PART 4: MODERATION APPLY (04_moderation_apply.sql)
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

-- ===============================================
-- PART 5: RLS POLICIES (05_rls_policies.sql)
-- ===============================================

SET search_path TO service, public;

-- ===============================================
-- AUDIT LOG (Append-Only, Immutable)
-- ===============================================

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Service role can insert audit entries
CREATE POLICY audit_insert_service ON audit_log
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role can select audit entries
CREATE POLICY audit_select_service ON audit_log
  FOR SELECT
  TO service_role
  USING (true);

-- Deny all updates (immutability)
CREATE POLICY audit_no_update ON audit_log
  FOR UPDATE
  TO public
  USING (false);

-- Deny all deletes (immutability)
CREATE POLICY audit_no_delete ON audit_log
  FOR DELETE
  TO public
  USING (false);

-- ===============================================
-- MESSAGES
-- ===============================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Authenticated users can insert messages
CREATE POLICY messages_insert_auth ON messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can select messages in rooms they're members of
-- TODO: Refine to check room_memberships in production
CREATE POLICY messages_select_room ON messages
  FOR SELECT
  TO authenticated
  USING (true);

-- Restrict updates: audit_hash_chain and content_hash are immutable
CREATE POLICY messages_update_restrict ON messages
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (
    audit_hash_chain = OLD.audit_hash_chain
    AND content_hash = OLD.content_hash
  );

-- ===============================================
-- LOGS_RAW (Service Role Only)
-- ===============================================

ALTER TABLE logs_raw ENABLE ROW LEVEL SECURITY;

CREATE POLICY logs_raw_service_only ON logs_raw
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny all access to non-service roles
CREATE POLICY logs_raw_deny_others ON logs_raw
  FOR ALL
  TO public
  USING (false);

-- ===============================================
-- LOGS_COMPRESSED
-- ===============================================

ALTER TABLE logs_compressed ENABLE ROW LEVEL SECURITY;

-- Service role for lifecycle operations
CREATE POLICY logs_compressed_service_lifecycle ON logs_compressed
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can select for fetch operations
CREATE POLICY logs_compressed_select_auth ON logs_compressed
  FOR SELECT
  TO authenticated
  USING (true);

-- ===============================================
-- ENCODE_QUEUE (Service Role Only)
-- ===============================================

ALTER TABLE service.encode_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY encode_queue_service_only ON service.encode_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY encode_queue_deny_others ON service.encode_queue
  FOR ALL
  TO public
  USING (false);

-- ===============================================
-- MODERATION_QUEUE (Service Role Only)
-- ===============================================

ALTER TABLE service.moderation_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY moderation_queue_service_only ON service.moderation_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY moderation_queue_deny_others ON service.moderation_queue
  FOR ALL
  TO public
  USING (false);

-- ===============================================
-- RETENTION_SCHEDULE (Service Role Only)
-- ===============================================

ALTER TABLE retention_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY retention_schedule_service_only ON retention_schedule
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY retention_schedule_deny_others ON retention_schedule
  FOR ALL
  TO public
  USING (false);

-- ===============================================
-- LEGAL_HOLDS (Service Role Only)
-- ===============================================

ALTER TABLE legal_holds ENABLE ROW LEVEL SECURITY;

CREATE POLICY legal_holds_service_only ON legal_holds
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY legal_holds_deny_others ON legal_holds
  FOR ALL
  TO public
  USING (false);

-- ===============================================
-- SYSTEM_CONFIG (Service Role Only)
-- ===============================================

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY system_config_service_only ON system_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY system_config_deny_others ON system_config
  FOR ALL
  TO public
  USING (false);

-- ===============================================
-- TELEMETRY (Service Role Only)
-- ===============================================

ALTER TABLE telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY telemetry_service_only ON telemetry
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY telemetry_deny_others ON telemetry
  FOR ALL
  TO public
  USING (false);

-- ===============================================
-- USERS, ROOMS, ROOM_MEMBERSHIPS
-- ===============================================

-- Users: Authenticated can read, service can manage
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_select_auth ON users
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY users_all_service ON users
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Rooms: Authenticated can read, service can manage
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY rooms_select_auth ON rooms
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY rooms_all_service ON rooms
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Room memberships: Authenticated can read own, service can manage
ALTER TABLE room_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY room_memberships_select_auth ON room_memberships
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY room_memberships_all_service ON room_memberships
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ===============================================
-- PART 6: PARTITION MANAGEMENT (06_partition_management.sql)
-- ===============================================

SET search_path TO service, public;

-- ===============================================
-- PARTITION CREATION
-- ===============================================

-- Create partition if needed: Idempotent partition creation
-- Called by compression worker before inserting to ensure partition exists
CREATE OR REPLACE FUNCTION create_partition_if_needed(partition_month TEXT)
RETURNS TEXT AS $$
DECLARE
  partition_name TEXT;
  start_date DATE;
  end_date DATE;
  start_bound TEXT;
  end_bound TEXT;
BEGIN
  -- Validate partition_month format (YYYY_MM)
  IF partition_month !~ '^\d{4}_\d{2}$' THEN
    RAISE EXCEPTION 'Invalid partition_month format: %. Expected YYYY_MM', partition_month;
  END IF;
  
  -- Convert to date bounds
  start_date := to_date(replace(partition_month, '_', '-') || '-01', 'YYYY-MM-DD');
  end_date := (start_date + INTERVAL '1 month')::DATE;
  
  start_bound := partition_month || '_01';
  end_bound := to_char(end_date, 'YYYY_MM') || '_01';
  
  partition_name := 'logs_compressed_' || replace(partition_month, '_', '');
  
  -- Create partition if it doesn't exist
  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF logs_compressed
     FOR VALUES FROM (%L) TO (%L)',
    partition_name,
    start_bound,
    end_bound
  );
  
  -- Create index on partition if it doesn't exist
  EXECUTE format(
    'CREATE INDEX IF NOT EXISTS idx_%I_room_month
     ON %I (room_id, partition_month, created_at DESC)',
    partition_name,
    partition_name
  );
  
  RETURN partition_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- ===============================================
-- PARTITION UTILITIES
-- ===============================================

-- List all partitions: Returns partition names and row counts
CREATE OR REPLACE FUNCTION list_partitions()
RETURNS TABLE (
  partition_name TEXT,
  partition_month TEXT,
  row_count BIGINT,
  total_size TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    schemaname || '.' || tablename AS partition_name,
    tablename AS partition_month,
    n_live_tup AS row_count,
    pg_size_pretty(pg_total_relation_size(schemaname || '.' || tablename)) AS total_size
  FROM pg_stat_user_tables
  WHERE tablename LIKE 'logs_compressed_%'
    AND tablename != 'logs_compressed_default'
  ORDER BY tablename DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- Drop old partition: Safely drop partition after data migration
-- TODO: Add validation to ensure partition is empty or migrated
CREATE OR REPLACE FUNCTION drop_partition(partition_month TEXT)
RETURNS VOID AS $$
DECLARE
  partition_name TEXT;
BEGIN
  partition_name := 'logs_compressed_' || replace(partition_month, '_', '');
  
  -- Safety check: Only drop if partition exists and is not default
  IF partition_name = 'logs_compressed_default' THEN
    RAISE EXCEPTION 'Cannot drop default partition';
  END IF;
  
  EXECUTE format('DROP TABLE IF EXISTS %I', partition_name);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = service, public;

-- ===============================================
-- COMPLETE
-- ===============================================
-- All 6 SQL modules have been successfully combined.
-- The database is now initialized with:
--   1. Core schema (tables, indexes, system config)
--   2. Compression pipeline functions
--   3. Retention policy functions
--   4. Moderation governance functions
--   5. Row-Level Security policies
--   6. Partition management functions
-- ===============================================

