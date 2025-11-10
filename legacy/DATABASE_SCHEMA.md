# Sinapse Database Schema

## Entity Relationship Diagram

```mermaid
erDiagram
    users ||--o{ rooms : creates
    users ||--o{ room_memberships : "has membership"
    users ||--o{ messages : sends
    users ||--o{ assistants : owns
    users ||--o{ bots : creates
    users ||--o{ subscriptions : has
    users ||--o{ presence_logs : tracks
    users ||--o{ edit_history : edits
    
    rooms ||--o{ room_memberships : contains
    rooms ||--o{ messages : contains
    rooms ||--o{ threads : contains
    rooms ||--o{ logs_raw : contains
    rooms ||--o{ presence_logs : tracks
    
    messages ||--o{ message_receipts : has
    messages ||--o{ edit_history : has
    messages ||--o{ embeddings : has
    messages ||--o{ threads : "parent of"
    messages ||--o{ messages : "replies to"
    
    threads ||--o{ messages : contains
    
    bots ||--o{ bot_endpoints : has
    
    logs_raw ||--o{ service_encode_queue : queues
    
    messages ||--o{ service_moderation_queue : queues
    
    users {
        uuid id PK
        text handle UK
        text display_name
        timestamptz created_at
        boolean is_verified
        jsonb metadata
        jsonb policy_flags
        timestamptz last_seen
        text federation_id UK
    }
    
    rooms {
        uuid id PK
        text slug UK
        text title
        uuid created_by FK
        timestamptz created_at
        boolean is_public
        text partition_month
        jsonb metadata
        text fed_node_id
        int retention_hot_days
        int retention_cold_days
        int active_users
    }
    
    room_memberships {
        uuid id PK
        uuid room_id FK
        uuid user_id FK
        text role
        timestamptz joined_at
        int strike_count
        timestamptz probation_until
        timestamptz last_warning_at
        jsonb ban_reason
    }
    
    messages {
        uuid id PK
        uuid room_id FK
        uuid sender_id FK
        timestamptz created_at
        text payload_ref
        text content_preview
        text content_hash
        text audit_hash_chain
        jsonb flags
        boolean is_flagged
        boolean is_exported
        text partition_month
        text fed_origin_hash
        jsonb reactions
        uuid thread_id FK
        uuid reply_to FK
        boolean is_edited
        text rendered_html
    }
    
    message_receipts {
        uuid id PK
        uuid message_id FK
        uuid user_id FK
        timestamptz delivered_at
        timestamptz read_at
    }
    
    threads {
        uuid id PK
        uuid parent_message_id FK
        uuid room_id FK
        varchar title
        timestamptz created_at
        timestamptz updated_at
        int message_count
        boolean is_archived
        uuid created_by FK
    }
    
    edit_history {
        uuid id PK
        uuid message_id FK
        text old_content
        uuid edited_by FK
        timestamptz edited_at
    }
    
    assistants {
        uuid id PK
        uuid owner_id FK
        varchar name
        text description
        varchar model
        decimal temperature
        text system_prompt
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
        jsonb metadata
    }
    
    bots {
        uuid id PK
        varchar name
        varchar url
        varchar token UK
        uuid created_by FK
        boolean is_active
        jsonb permissions
        jsonb metadata
        timestamptz created_at
        timestamptz updated_at
    }
    
    bot_endpoints {
        uuid id PK
        uuid bot_id FK
        varchar endpoint_url
        varchar webhook_secret
        text[] event_types
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }
    
    subscriptions {
        uuid id PK
        uuid user_id FK
        jsonb push_sub
        varchar endpoint
        varchar p256dh
        varchar auth
        timestamptz created_at
        timestamptz updated_at
        timestamptz expires_at
        boolean is_active
    }
    
    embeddings {
        uuid id PK
        uuid message_id FK
        vector vector
        varchar model
        timestamptz created_at
    }
    
    metrics {
        uuid id PK
        varchar type
        decimal value
        jsonb metadata
        timestamptz timestamp
    }
    
    presence_logs {
        uuid id PK
        uuid user_id FK
        uuid room_id FK
        varchar status
        timestamptz created_at
    }
    
    audit_log {
        bigserial id PK
        timestamptz event_time
        text event_type
        uuid room_id
        uuid user_id
        uuid message_id
        jsonb payload
        text actor
        text signature
        text hash
        text prev_hash
        text chain_hash
        text node_id
    }
    
    logs_raw {
        uuid id PK
        uuid room_id FK
        timestamptz created_at
        bytea payload
        text mime_type
        int length_bytes
        text checksum
        boolean processed
    }
    
    logs_compressed {
        uuid id PK
        uuid room_id
        text partition_month
        timestamptz created_at
        text codec
        bytea compressed_payload
        int original_length
        text checksum
        text cold_storage_uri
        text lifecycle_state
    }
    
    telemetry {
        uuid id PK
        timestamptz event_time
        text event
        uuid room_id
        uuid user_id
        numeric risk
        text action
        jsonb features
        int latency_ms
        jsonb precision_recall
    }
    
    system_config {
        text key PK
        jsonb value
        timestamptz updated_at
    }
    
    service_encode_queue {
        uuid id PK
        uuid raw_id FK
        text status
        int attempts
        int max_attempts
        timestamptz last_attempt_at
        text error
        timestamptz created_at
    }
    
    service_moderation_queue {
        uuid id PK
        uuid message_id FK
        text status
        int attempts
        int max_attempts
        timestamptz last_attempt_at
        text error
        timestamptz created_at
    }
```

## Table Descriptions

### Core Tables

#### `users`
User profiles with trust metadata and federation support.
- **Primary Key**: `id` (UUID)
- **Unique**: `handle`, `federation_id`
- **Key Fields**: handle, display_name, is_verified, metadata, policy_flags

#### `rooms`
Chat rooms with partition keys and retention overrides.
- **Primary Key**: `id` (UUID)
- **Unique**: `slug`
- **Key Fields**: slug, title, is_public, partition_month, retention settings

#### `room_memberships`
User memberships in rooms with roles and moderation tracking.
- **Primary Key**: `id` (UUID)
- **Unique**: (room_id, user_id)
- **Key Fields**: role, strike_count, probation_until, ban_reason

#### `messages`
Message records with content references and metadata.
- **Primary Key**: `id` (UUID)
- **Key Fields**: room_id, sender_id, content_preview, content_hash, reactions, thread_id, reply_to

### Feature Tables

#### `threads`
Message threads for nested conversations.
- **Primary Key**: `id` (UUID)
- **Key Fields**: parent_message_id, room_id, title, message_count, is_archived

#### `edit_history`
History of message edits.
- **Primary Key**: `id` (UUID)
- **Key Fields**: message_id, old_content, edited_by, edited_at

#### `assistants`
AI assistant configurations.
- **Primary Key**: `id` (UUID)
- **Key Fields**: owner_id, name, model, temperature, system_prompt, is_active

#### `bots`
Bot registrations with webhook URLs.
- **Primary Key**: `id` (UUID)
- **Unique**: `token`
- **Key Fields**: name, url, token, created_by, permissions, is_active

#### `bot_endpoints`
Webhook endpoints for bots.
- **Primary Key**: `id` (UUID)
- **Key Fields**: bot_id, endpoint_url, webhook_secret, event_types, is_active

#### `subscriptions`
Push notification subscriptions.
- **Primary Key**: `id` (UUID)
- **Key Fields**: user_id, push_sub (JSONB), endpoint, is_active

#### `embeddings`
Vector embeddings for semantic search.
- **Primary Key**: `id` (UUID)
- **Key Fields**: message_id, vector (1536-dim), model
- **Index**: HNSW index on vector for fast similarity search

#### `metrics`
Analytics and metrics tracking.
- **Primary Key**: `id` (UUID)
- **Key Fields**: type, value, metadata, timestamp

#### `presence_logs`
User presence tracking.
- **Primary Key**: `id` (UUID)
- **Key Fields**: user_id, room_id, status, created_at

### System Tables

#### `audit_log`
Append-only audit trail with chained hashes.
- **Primary Key**: `id` (BIGSERIAL)
- **Key Fields**: event_type, hash, chain_hash, node_id

#### `logs_raw`
Raw log payloads before compression.
- **Primary Key**: `id` (UUID)
- **Key Fields**: room_id, payload, mime_type, checksum, processed

#### `logs_compressed`
Compressed logs with partitioning.
- **Primary Key**: `id` (UUID)
- **Partitioned By**: `partition_month`
- **Key Fields**: room_id, codec, compressed_payload, lifecycle_state

#### `telemetry`
System telemetry and metrics.
- **Primary Key**: `id` (UUID)
- **Key Fields**: event, risk, action, features, latency_ms

#### `system_config`
System configuration key-value store.
- **Primary Key**: `key` (TEXT)
- **Value**: JSONB

### Service Schema Tables

#### `service.encode_queue`
Compression job queue.
- **Primary Key**: `id` (UUID)
- **Key Fields**: raw_id, status, attempts, max_attempts

#### `service.moderation_queue`
Moderation job queue.
- **Primary Key**: `id` (UUID)
- **Key Fields**: message_id, status, attempts, max_attempts

## Key Relationships

1. **Users ↔ Rooms**: Many-to-many via `room_memberships`
2. **Rooms ↔ Messages**: One-to-many
3. **Messages ↔ Threads**: One-to-many (threads have parent_message_id)
4. **Messages ↔ Messages**: Self-referential via `reply_to` for direct replies
5. **Users ↔ Assistants**: One-to-many (users own assistants)
6. **Users ↔ Bots**: One-to-many (users create bots)
7. **Bots ↔ Bot Endpoints**: One-to-many
8. **Messages ↔ Embeddings**: One-to-one (each message can have one embedding)

## Indexes

### Performance Indexes
- **Messages**: room_id + created_at (DESC), content_hash, reactions (GIN), thread_id
- **Threads**: room_id, parent_message_id, updated_at (DESC)
- **Embeddings**: HNSW index on vector for cosine similarity
- **Search**: GIN index on search_vector in materialized view

### Foreign Key Indexes
- All foreign keys have corresponding indexes for join performance

## Functions

1. **`update_thread_metadata()`**: Updates thread message_count and updated_at
2. **`refresh_message_search_index()`**: Refreshes search materialized view
3. **`mark_message_edited()`**: Tracks message edits in edit_history
4. **`match_messages()`**: Vector similarity search using pgvector
5. **`update_updated_at_column()`**: Auto-updates updated_at timestamps

## Triggers

1. **`trigger_thread_metadata_update`**: Updates thread metadata on message insert/delete
2. **`trigger_refresh_search_index`**: Refreshes search index (deferred)
3. **`trigger_mark_message_edited`**: Tracks edits when content changes
4. **`update_*_updated_at`**: Auto-updates updated_at for assistants, bots, subscriptions

## Materialized Views

### `message_search_index`
Full-text search index for messages.
- **Columns**: id, content, room_id, user_id, created_at, search_vector
- **Index**: GIN index on search_vector
- **Refresh**: Triggered automatically on message changes (deferred)

## Notes

- **Partitioning**: `logs_compressed` is partitioned by `partition_month`
- **Vector Search**: Uses pgvector extension with HNSW indexing
- **Audit Trail**: `audit_log` uses chained hashes for tamper-evident logging
- **Federation**: Tables support federation via `federation_id` and `fed_node_id` fields
- **Retention**: Room-level and system-level retention policies supported

