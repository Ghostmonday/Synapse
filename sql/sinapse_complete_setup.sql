-- ===============================================
-- SINAPSE COMPLETE DATABASE SETUP
-- ===============================================
-- This is a single comprehensive SQL file that sets up the entire Sinapse database
-- Run this in your Supabase SQL Editor to set up everything at once
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ===============================================

BEGIN;

-- ===============================================
-- EXTENSIONS
-- ===============================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
CREATE EXTENSION IF NOT EXISTS "vector"; -- For semantic search (pgvector)

-- ===============================================
-- SCHEMAS
-- ===============================================

CREATE SCHEMA IF NOT EXISTS service;

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
  federation_id TEXT UNIQUE
);

-- Rooms: Metadata with partition key and room-level retention overrides
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_public BOOLEAN NOT NULL DEFAULT true,
  partition_month TEXT GENERATED ALWAYS AS (to_char(date_trunc('month', created_at AT TIME ZONE 'UTC'), 'YYYY_MM')) STORED,
  metadata JSONB DEFAULT '{}'::jsonb,
  fed_node_id TEXT,
  retention_hot_days INT,
  retention_cold_days INT,
  active_users INT DEFAULT 0
);

-- Room memberships: Roles, strikes, probation, and ban tracking
CREATE TABLE IF NOT EXISTS room_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  strike_count INT NOT NULL DEFAULT 0,
  probation_until TIMESTAMPTZ,
  last_warning_at TIMESTAMPTZ,
  ban_reason JSONB DEFAULT '{}'::jsonb,
  UNIQUE(room_id, user_id)
);

-- Messages: Minimal canonical records with external payload references
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload_ref TEXT NOT NULL DEFAULT 'raw:' || gen_random_uuid()::text,
  content_preview TEXT,
  content_hash TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  audit_hash_chain TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  flags JSONB DEFAULT '{}'::jsonb,
  is_flagged BOOLEAN NOT NULL DEFAULT FALSE,
  is_exported BOOLEAN NOT NULL DEFAULT FALSE,
  partition_month TEXT NOT NULL GENERATED ALWAYS AS (to_char(date_trunc('month', created_at AT TIME ZONE 'UTC'), 'YYYY_MM')) STORED,
  fed_origin_hash TEXT,
  -- P0 Features columns
  reactions JSONB DEFAULT '[]'::jsonb,
  thread_id UUID,
  reply_to UUID REFERENCES messages(id) ON DELETE SET NULL,
  is_edited BOOLEAN DEFAULT FALSE,
  rendered_html TEXT -- For formatted messages
);

-- Add foreign key for thread_id after threads table is created
-- (Will be added below)

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
  event_type TEXT NOT NULL,
  room_id UUID,
  user_id UUID,
  message_id UUID,
  payload JSONB,
  actor TEXT,
  signature TEXT,
  hash TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  prev_hash TEXT,
  chain_hash TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  node_id TEXT NOT NULL DEFAULT 'local'
);

-- Raw logs: Transient intake before compression
CREATE TABLE IF NOT EXISTS logs_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  payload BYTEA NOT NULL,
  mime_type TEXT NOT NULL,
  length_bytes INT NOT NULL,
  checksum TEXT NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT FALSE
);

-- Compressed logs: Declarative partitioning by partition_month
CREATE TABLE IF NOT EXISTS logs_compressed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL,
  partition_month TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  codec TEXT NOT NULL,
  compressed_payload BYTEA NOT NULL,
  original_length INT NOT NULL,
  checksum TEXT NOT NULL,
  cold_storage_uri TEXT,
  lifecycle_state TEXT NOT NULL DEFAULT 'hot'
) PARTITION BY RANGE (partition_month);

CREATE TABLE IF NOT EXISTS logs_compressed_default PARTITION OF logs_compressed DEFAULT;

-- Encode queue: Tracks compression jobs
CREATE TABLE IF NOT EXISTS service.encode_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  raw_id UUID NOT NULL REFERENCES logs_raw(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Moderation queue: Decouples moderation from ingestion
CREATE TABLE IF NOT EXISTS service.moderation_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Retention schedule: Queued actions for retention lifecycle
CREATE TABLE IF NOT EXISTS retention_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_type TEXT NOT NULL,
  resource_id UUID NOT NULL,
  scheduled_for TIMESTAMPTZ NOT NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  on_hold BOOLEAN NOT NULL DEFAULT false,
  hold_reason TEXT
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
  event TEXT NOT NULL,
  room_id UUID,
  user_id UUID,
  risk NUMERIC,
  action TEXT,
  features JSONB,
  latency_ms INT,
  precision_recall JSONB DEFAULT '{}'::jsonb
);

-- System config: Tunables with JSONB for complex configurations
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===============================================
-- P0 FEATURES TABLES
-- ===============================================

-- Message Threads
CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  title VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  message_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Add foreign key for thread_id in messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'messages_thread_id_fkey'
  ) THEN
    ALTER TABLE messages 
    ADD CONSTRAINT messages_thread_id_fkey 
    FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Edit History
CREATE TABLE IF NOT EXISTS edit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  old_content TEXT NOT NULL,
  edited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  edited_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bot Endpoints
CREATE TABLE IF NOT EXISTS bot_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL,
  endpoint_url VARCHAR(500) NOT NULL,
  webhook_secret VARCHAR(255),
  event_types TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- INTEGRATED FEATURES TABLES
-- ===============================================

-- AI Assistants
CREATE TABLE IF NOT EXISTS assistants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  model VARCHAR(100) NOT NULL DEFAULT 'gpt-4',
  temperature DECIMAL(3,2) DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
  system_prompt TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Bots Table
CREATE TABLE IF NOT EXISTS bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  url VARCHAR(500) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT TRUE,
  permissions JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Update bot_endpoints foreign key
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bot_endpoints') THEN
    ALTER TABLE bot_endpoints 
    DROP CONSTRAINT IF EXISTS bot_endpoints_bot_id_fkey;
    
    ALTER TABLE bot_endpoints 
    ADD CONSTRAINT bot_endpoints_bot_id_fkey 
    FOREIGN KEY (bot_id) REFERENCES bots(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Push Notification Subscriptions
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  push_sub JSONB NOT NULL,
  endpoint VARCHAR(500) NOT NULL,
  p256dh VARCHAR(255),
  auth VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- Vector Embeddings for Search
CREATE TABLE IF NOT EXISTS embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  vector vector(1536) NOT NULL,
  model VARCHAR(100) DEFAULT 'text-embedding-3-small',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metrics Table
CREATE TABLE IF NOT EXISTS metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL,
  value DECIMAL(15,2) NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Presence Logs
CREATE TABLE IF NOT EXISTS presence_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===============================================
-- INDEXES
-- ===============================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_handle ON users (handle);
CREATE INDEX IF NOT EXISTS idx_users_federation_id ON users (federation_id) WHERE federation_id IS NOT NULL;

-- Rooms indexes
CREATE INDEX IF NOT EXISTS idx_rooms_slug ON rooms (slug);
CREATE INDEX IF NOT EXISTS idx_rooms_created_by ON rooms (created_by);
CREATE INDEX IF NOT EXISTS idx_rooms_is_public ON rooms (is_public) WHERE is_public = TRUE;

-- Messages indexes
CREATE INDEX IF NOT EXISTS idx_messages_room_time ON messages (room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_hash ON messages (content_hash);
CREATE INDEX IF NOT EXISTS idx_messages_flagged ON messages (is_flagged) WHERE is_flagged = true;
CREATE INDEX IF NOT EXISTS idx_messages_partition ON messages (partition_month);
CREATE INDEX IF NOT EXISTS idx_messages_reactions ON messages USING GIN (reactions);
CREATE INDEX IF NOT EXISTS idx_messages_thread_id ON messages (thread_id) WHERE thread_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages (reply_to) WHERE reply_to IS NOT NULL;

-- Threads indexes
CREATE INDEX IF NOT EXISTS idx_threads_parent_message ON threads (parent_message_id);
CREATE INDEX IF NOT EXISTS idx_threads_room_id ON threads (room_id) WHERE is_archived = FALSE;
CREATE INDEX IF NOT EXISTS idx_threads_updated_at ON threads (updated_at DESC) WHERE is_archived = FALSE;

-- Edit history indexes
CREATE INDEX IF NOT EXISTS idx_edit_history_message_id ON edit_history (message_id);
CREATE INDEX IF NOT EXISTS idx_edit_history_edited_at ON edit_history (edited_at DESC);

-- Assistants indexes
CREATE INDEX IF NOT EXISTS idx_assistants_owner_id ON assistants (owner_id);
CREATE INDEX IF NOT EXISTS idx_assistants_is_active ON assistants (is_active) WHERE is_active = TRUE;

-- Bots indexes
CREATE INDEX IF NOT EXISTS idx_bots_created_by ON bots (created_by);
CREATE INDEX IF NOT EXISTS idx_bots_token ON bots (token);
CREATE INDEX IF NOT EXISTS idx_bots_is_active ON bots (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_bot_endpoints_bot_id ON bot_endpoints (bot_id);
CREATE INDEX IF NOT EXISTS idx_bot_endpoints_is_active ON bot_endpoints (is_active) WHERE is_active = TRUE;

-- Subscriptions indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_is_active ON subscriptions (is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_subscriptions_endpoint ON subscriptions (endpoint);

-- Embeddings indexes
CREATE INDEX IF NOT EXISTS idx_embeddings_message_id ON embeddings (message_id);
CREATE INDEX IF NOT EXISTS idx_embeddings_vector ON embeddings 
  USING hnsw (vector vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Metrics indexes
CREATE INDEX IF NOT EXISTS idx_metrics_type ON metrics (type);
CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON metrics (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_metrics_type_timestamp ON metrics (type, timestamp DESC);

-- Presence logs indexes
CREATE INDEX IF NOT EXISTS idx_presence_logs_user_id ON presence_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_presence_logs_room_id ON presence_logs (room_id);
CREATE INDEX IF NOT EXISTS idx_presence_logs_created_at ON presence_logs (created_at DESC);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_room_time ON audit_log (room_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_audit_node_chain ON audit_log (node_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_log (event_type);

-- Queue indexes
CREATE INDEX IF NOT EXISTS encode_queue_status_idx ON service.encode_queue (status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS moderation_queue_status_idx ON service.moderation_queue (status) WHERE status = 'pending';

-- ===============================================
-- SEARCH MATERIALIZED VIEW
-- ===============================================

CREATE MATERIALIZED VIEW IF NOT EXISTS message_search_index AS
SELECT
  m.id,
  m.content_preview AS content,
  m.room_id,
  m.sender_id AS user_id,
  m.created_at,
  to_tsvector('english', COALESCE(m.content_preview, '')) AS search_vector
FROM messages m
WHERE m.thread_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_message_search_vector ON message_search_index USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_message_search_room ON message_search_index (room_id);
CREATE INDEX IF NOT EXISTS idx_message_search_created_at ON message_search_index (created_at DESC);

-- ===============================================
-- FUNCTIONS
-- ===============================================

-- Function to update thread metadata
CREATE OR REPLACE FUNCTION update_thread_metadata()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.thread_id IS NOT NULL THEN
    UPDATE threads
    SET
      message_count = message_count + 1,
      updated_at = NOW()
    WHERE id = NEW.thread_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' AND OLD.thread_id IS NOT NULL THEN
    UPDATE threads
    SET
      message_count = GREATEST(message_count - 1, 0),
      updated_at = NOW()
    WHERE id = OLD.thread_id;
    RETURN OLD;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to refresh search index
CREATE OR REPLACE FUNCTION refresh_message_search_index()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW message_search_index;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to mark message as edited
CREATE OR REPLACE FUNCTION mark_message_edited()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.content_preview IS DISTINCT FROM OLD.content_preview THEN
    NEW.is_edited = TRUE;
    INSERT INTO edit_history (message_id, old_content, edited_by)
    VALUES (OLD.id, OLD.content_preview, NEW.sender_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Vector search function for semantic similarity
CREATE OR REPLACE FUNCTION match_messages(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.78,
  match_count int DEFAULT 10,
  filter_room_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  room_id UUID,
  sender_id UUID,
  content_preview TEXT,
  created_at TIMESTAMPTZ,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.room_id,
    m.sender_id,
    m.content_preview,
    m.created_at,
    1 - (e.vector <=> query_embedding) AS similarity
  FROM messages m
  INNER JOIN embeddings e ON e.message_id = m.id
  WHERE 
    (filter_room_id IS NULL OR m.room_id = filter_room_id)
    AND (1 - (e.vector <=> query_embedding)) > match_threshold
  ORDER BY e.vector <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ===============================================
-- TRIGGERS
-- ===============================================

-- Thread metadata trigger
DROP TRIGGER IF EXISTS trigger_thread_metadata_update ON messages;
CREATE TRIGGER trigger_thread_metadata_update
  AFTER INSERT OR DELETE ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_thread_metadata();

-- Search index refresh trigger
DROP TRIGGER IF EXISTS trigger_refresh_search_index ON messages;
CREATE CONSTRAINT TRIGGER trigger_refresh_search_index
  AFTER INSERT OR UPDATE OR DELETE ON messages
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW
  EXECUTE FUNCTION refresh_message_search_index();

-- Edit history trigger
DROP TRIGGER IF EXISTS trigger_mark_message_edited ON messages;
CREATE TRIGGER trigger_mark_message_edited
  BEFORE UPDATE ON messages
  FOR EACH ROW
  WHEN (NEW.content_preview IS DISTINCT FROM OLD.content_preview)
  EXECUTE FUNCTION mark_message_edited();

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_assistants_updated_at ON assistants;
CREATE TRIGGER update_assistants_updated_at
  BEFORE UPDATE ON assistants
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bots_updated_at ON bots;
CREATE TRIGGER update_bots_updated_at
  BEFORE UPDATE ON bots
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===============================================
-- DEFAULT DATA
-- ===============================================

-- Default system configuration
INSERT INTO system_config (key, value) VALUES
  ('retention_policy', jsonb_build_object(
    'hot_retention_days', 30,
    'cold_retention_days', 365
  )),
  ('moderation_thresholds', jsonb_build_object(
    'default', 0.6,
    'illegal', 0.7,
    'threat', 0.6,
    'pii', 0.65,
    'hate', 0.55,
    'adult', 0.0,
    'probation_multiplier', 0.5
  ))
ON CONFLICT (key) DO NOTHING;

COMMIT;

-- ===============================================
-- SETUP COMPLETE
-- ===============================================
-- All tables, indexes, functions, and triggers have been created
-- Next steps:
-- 1. Verify extensions are enabled (especially 'vector' for pgvector)
-- 2. Set up Row Level Security (RLS) policies if needed
-- 3. Configure environment variables in your application
-- ===============================================

