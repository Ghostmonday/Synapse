# Sinapse

**Real-time communication platform with AI-powered features, voice/video calls, and autonomous system capabilities.**

Sinapse is a modern, scalable chat application built with TypeScript/Node.js backend and SwiftUI iOS frontend. It features real-time messaging, voice/video calls, AI-powered moderation, subscription management, and comprehensive telemetry.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [API Reference](#api-reference)
- [WebSocket Protocol](#websocket-protocol)
- [Database Schema](#database-schema)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Development](#development)
- [Deployment](#deployment)
- [Security](#security)
- [Monitoring & Observability](#monitoring--observability)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## Quick Start

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **PostgreSQL** (via Supabase)
- **Redis** 6+ (for pub/sub and caching)
- **Xcode** 15+ (for iOS development)
- **npm** or **yarn** package manager

### Installation

```bash
# Clone the repository
git clone https://github.com/Ghostmonday/Synapse.git
cd Synapse

# Install dependencies
npm install

# Configure environment
# Create .env file with required variables (see Environment Variables section)
cp .env.example .env  # If .env.example exists, or create manually

# Set up database (run in Supabase SQL Editor)
# 1. Run core schema: sql/01_sinapse_schema.sql
# 2. Run API keys vault: sql/migrations/2025-01-27-api-keys-vault.sql
# 3. Run age verification: sql/migrations/2025-01-28-add-age-verification.sql
# 4. Run other migrations as needed (see sql/README.md)

# Start development server
npm run dev

# In another terminal, start iOS app (if developing iOS)
cd frontend/iOS
open Sinapse.xcodeproj
# Build and run in Xcode
```

### First Run

1. **Backend**: Server starts on `http://localhost:3000`
2. **Database**: Ensure Supabase is running and migrations are applied
3. **Redis**: Start Redis server (`redis-server` or via Docker)
4. **iOS**: Configure API base URL in `APIClient.swift` for local development

---

## Architecture

### Monorepo Structure

```
Sinapse/
├── src/                          # Backend API (Express + TypeScript)
│   ├── server/                   # Server entry point and middleware
│   │   ├── index.ts              # Main Express app, route registration
│   │   └── utils/                # Server utilities
│   ├── routes/                   # API route handlers (25+ routes)
│   │   ├── user-authentication-routes.ts
│   │   ├── room-routes.ts
│   │   ├── message-routes.ts
│   │   ├── search-routes.ts
│   │   └── ... (see Project Structure)
│   ├── services/                 # Business logic layer (35+ services)
│   │   ├── user-authentication-service.ts
│   │   ├── message-service.ts
│   │   ├── room-service.ts
│   │   └── ... (see Project Structure)
│   ├── middleware/               # Express middleware
│   │   ├── auth.ts               # JWT authentication
│   │   ├── rate-limiter.ts       # Rate limiting (IP + user-based)
│   │   ├── moderation.ts         # Content moderation
│   │   ├── age-verification.ts   # 18+ age gate
│   │   └── ... (see Project Structure)
│   ├── ws/                       # WebSocket gateway
│   │   ├── gateway.ts            # WebSocket server setup
│   │   ├── handlers/             # Message handlers
│   │   └── utils.ts              # WebSocket utilities
│   ├── workers/                  # Background workers
│   │   └── sin-worker.ts         # AI worker for autonomous systems
│   ├── jobs/                     # Scheduled jobs
│   │   ├── partition-management-cron.ts
│   │   └── expire-temporary-rooms.ts
│   ├── shared/                   # Shared utilities
│   │   ├── logger.ts             # Logging utilities
│   │   └── supabase-helpers.ts   # Database query helpers
│   ├── config/                   # Configuration
│   │   ├── db.js                 # Supabase client
│   │   └── redis-pubsub.ts       # Redis client
│   ├── telemetry/                # Telemetry system
│   │   └── index.ts              # Telemetry exports
│   └── types/                    # TypeScript type definitions
│       ├── auth.types.ts
│       ├── message.types.ts
│       └── ux-telemetry.ts
├── frontend/iOS/                 # iOS SwiftUI application
│   ├── Views/                    # SwiftUI views (48 files)
│   ├── Managers/                 # Business logic managers (14 files)
│   ├── Services/                 # Backend integration (10 files)
│   ├── Models/                   # Data models (8 files)
│   ├── Components/              # Reusable components (3 files)
│   ├── DesignSystem/            # Design system (14 Swift files)
│   └── Tests/                   # Unit tests (4 test files)
├── sql/                          # Database schema and migrations
│   ├── migrations/              # Versioned migrations
│   ├── 01_sinapse_schema.sql     # Core schema
│   ├── 02_compressor_functions.sql
│   └── ... (see Database Schema)
├── supabase/functions/          # Supabase Edge Functions
│   └── api-key-vault/           # API key vault function
├── scripts/                      # Development & operations scripts
│   ├── dev/                     # Development scripts
│   ├── ops/                     # Operations scripts
│   └── deploy.sh                # Deployment script
├── infra/aws/                   # Terraform infrastructure
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
├── specs/                        # API specifications
│   ├── api/openapi.yaml         # OpenAPI 3.0 specification
│   └── proto/ws_envelope.proto  # WebSocket protobuf schema
├── docs/                         # Documentation
│   └── threat_model.md          # Security threat model
└── packages/                     # Monorepo packages
    ├── core/                    # Shared core utilities
    ├── ai-mod/                  # AI module
    └── supabase/                # Supabase utilities
```

### System Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   iOS App   │◄───────►│  Express API │◄───────►│  Supabase    │
│  (SwiftUI)  │  HTTP   │   (Node.js)  │  HTTP   │ (PostgreSQL) │
└─────────────┘         └──────────────┘         └─────────────┘
      │                         │                         │
      │ WebSocket               │                         │
      │ (Protobuf)               │                         │
      │                         │                         │
      └─────────────────────────┘                         │
                                                           │
┌─────────────┐         ┌──────────────┐                 │
│   LiveKit   │◄───────►│    Redis     │◄───────────────┘
│ (Voice/Video)│         │  (Pub/Sub)   │
└─────────────┘         └──────────────┘
                               │
                               │
                        ┌──────────────┐
                        │  AWS S3      │
                        │ (File Store) │
                        └──────────────┘
```

---

## Tech Stack

### Backend

- **Runtime**: Node.js 20+ (ES Modules)
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.9+ (strict mode)
- **Database**: PostgreSQL (via Supabase)
- **Cache/Pub-Sub**: Redis 6+
- **Real-time**: WebSocket (ws) with Protobuf
- **Voice/Video**: LiveKit Server SDK 2.2.0
- **Authentication**: JWT (jsonwebtoken), Supabase Auth
- **File Storage**: AWS S3 SDK
- **AI/ML**: DeepSeek API integration
- **Monitoring**: Prometheus (prom-client), Sentry
- **Build Tool**: Turbo (monorepo)

### Frontend (iOS)

- **Framework**: SwiftUI
- **Language**: Swift 5.9+
- **Voice/Video**: LiveKit iOS SDK
- **Networking**: URLSession, WebSocket
- **State Management**: Combine, @StateObject, @ObservedObject
- **Architecture**: MVVM pattern
- **Dependencies**: Swift Package Manager

### Infrastructure

- **Cloud Provider**: AWS (EC2, S3, ElastiCache)
- **Infrastructure as Code**: Terraform
- **Containerization**: Docker
- **CI/CD**: GitHub Actions
- **Database Hosting**: Supabase (PostgreSQL)
- **Monitoring**: Prometheus + Grafana (planned)

---

## Features

### Authentication & Security

- **Apple Sign-In**: Inline flow with JWKS verification, no redirects
- **Google Sign-In**: FirebaseUI-Auth integration
- **Username/Password**: Bcrypt hashing with automatic migration from plaintext
- **JWT Sessions**: 7-day expiration, refresh token support
- **Age Verification**: 18+ gate enforced on room access (required checkbox during signup)
- **API Key Vault**: Encrypted credential storage in database (pgcrypto)
- **Rate Limiting**: Multi-tier (IP-based: 1000/min, User-based: configurable per endpoint)
- **Content Moderation**: AI-powered toxicity scoring (DeepSeek integration)
- **Input Sanitization**: XSS protection, SQL injection prevention
- **CORS**: Restricted to allowed origins only (`sinapse.app`, `localhost:3000`)
- **Security Headers**: Helmet.js with strict CSP, HSTS, XSS filter

### Real-Time Communication

- **WebSocket Messaging**: Protobuf-encoded binary messages for efficiency
- **Message Types**: Text, reactions, threads, read receipts, edits, deletes
- **Presence System**: Online/offline/away status with real-time updates
- **Room Broadcasting**: Efficient room-based message distribution
- **Connection Management**: Ping/pong health checks, automatic reconnection
- **Voice/Video Calls**: LiveKit integration with token-based authentication
- **Bandwidth Management**: Adaptive quality based on connection speed

### Rooms & Messaging

- **Room Types**: Public, private, temporary (auto-expire)
- **Age-Gated Access**: 18+ verification required for all rooms
- **Message Features**:
  - Send/receive messages
  - Edit messages (with edit history)
  - Delete messages (soft delete)
  - Pin important messages
  - Thread replies
  - Emoji reactions
  - Read receipts (delivered, read, seen)
- **Search**: Full-text search across messages and rooms (PostgreSQL tsvector)
- **File Uploads**: Secure file storage (AWS S3) with metadata tracking
- **Nicknames**: Custom room-specific nicknames
- **Room Configuration**: Customizable room settings (moderation, tiers)

### iOS App Features

- **SwiftUI Interface**: Modern golden synapse theme with dark mode
- **Instant Launch**: Auth-bound onboarding, zero delays
- **Real-Time Updates**: WebSocket connection with automatic reconnection
- **Voice/Video**: LiveKit integration for calls
- **Accessibility**: VoiceOver support, accessibility labels
- **Telemetry**: UX analytics and performance monitoring
- **Offline Support**: Message queuing for offline scenarios
- **Push Notifications**: (Planned) APNs integration

### AI Features

- **Content Moderation**: Real-time toxicity scoring with configurable thresholds
- **Autonomous Systems**: Self-healing capabilities for system operations
- **LLM Parameter Management**: Dynamic AI configuration via database
- **AI Log Classification**: Three-bucket system (USER_VOICE, USER_CONTROL, SYSTEM_OPS)
- **Smart Routing**: AI-powered log analysis and remediation suggestions

### Monetization

- **Subscriptions**: Apple IAP integration with webhook validation
- **Usage Tracking**: Per-user usage metrics and quotas
- **Tier Management**: Free, Pro, Enterprise tiers with feature gating
- **Entitlements**: Subscription-based feature access control

### Observability

- **Telemetry**: Dual logging (Prometheus + Supabase)
- **UX Telemetry**: User interaction tracking with PII redaction
- **Performance Metrics**: Latency tracking, error rates
- **Health Checks**: `/health` endpoint with dependency checks
- **Debug Endpoint**: `/debug/stats` for aggregated metrics (auth-gated)

---

## API Reference

### Authentication Endpoints

#### `POST /auth/apple`
Verify Apple ID token and issue JWT.

**Request:**
```json
{
  "token": "apple_id_token_string",
  "ageVerified": true
}
```

**Response:**
```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "livekitToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Rate Limit**: 5 requests per 15 minutes

#### `POST /auth/login`
Authenticate with username and password.

**Request:**
```json
{
  "username": "user123",
  "password": "secure_password"
}
```

**Response:**
```json
{
  "jwt": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Room Endpoints

#### `POST /chat-rooms`
Create a new chat room (age-gated).

**Headers**: `Authorization: Bearer <jwt>`

**Request:**
```json
{
  "name": "My Room",
  "description": "Room description",
  "is_private": false,
  "room_tier": "free"
}
```

**Response:**
```json
{
  "id": "room-uuid",
  "name": "My Room",
  "created_at": "2025-01-28T12:00:00Z"
}
```

#### `POST /chat-rooms/:id/join`
Join a room (requires age verification).

**Headers**: `Authorization: Bearer <jwt>`

**Response:**
```json
{
  "success": true,
  "room_id": "room-uuid"
}
```

### Messaging Endpoints

#### `POST /messaging/send`
Send a message to a room.

**Headers**: `Authorization: Bearer <jwt>`

**Request:**
```json
{
  "room_id": "room-uuid",
  "content": "Hello, world!",
  "thread_id": null
}
```

**Rate Limit**: 100 requests per minute

#### `GET /messaging/:roomId`
Get messages for a room (paginated).

**Query Parameters:**
- `limit`: Number of messages (default: 50, max: 100)
- `before`: Message ID to fetch messages before (for pagination)

**Response:**
```json
{
  "messages": [
    {
      "id": "msg-uuid",
      "user_id": "user-uuid",
      "content": "Hello!",
      "created_at": "2025-01-28T12:00:00Z",
      "edited_at": null
    }
  ],
  "has_more": false
}
```

### Search Endpoints

#### `GET /api/search`
Full-text search across messages and rooms.

**Query Parameters:**
- `query`: Search query string
- `type`: `messages` or `rooms` (optional)
- `room_id`: Limit search to specific room (optional)
- `limit`: Results limit (default: 20)

**Response:**
```json
{
  "results": [
    {
      "type": "message",
      "id": "msg-uuid",
      "content": "Found message...",
      "room_id": "room-uuid",
      "score": 0.95
    }
  ]
}
```

### File Storage Endpoints

#### `POST /files/upload`
Upload a file to S3.

**Headers**: `Authorization: Bearer <jwt>`, `Content-Type: multipart/form-data`

**Form Data:**
- `file`: File binary data
- `room_id`: (optional) Associate file with room

**Response:**
```json
{
  "id": "file-uuid",
  "url": "https://s3.amazonaws.com/bucket/file.png",
  "mime_type": "image/png",
  "file_size": 12345
}
```

#### `GET /files/:id`
Get file URL by ID.

#### `DELETE /files/:id`
Delete a file (removes from S3 and database).

### Presence Endpoints

#### `GET /presence/status`
Get presence status for users in a room.

**Query Parameters:**
- `room_id`: Room ID (required)

**Response:**
```json
{
  "users": [
    {
      "user_id": "user-uuid",
      "status": "online",
      "last_seen": "2025-01-28T12:00:00Z"
    }
  ]
}
```

#### `POST /presence/update`
Update user presence status.

**Request:**
```json
{
  "room_id": "room-uuid",
  "status": "online" // "online", "away", "offline"
}
```

### Subscription Endpoints

#### `GET /subscription/status`
Get user subscription status.

**Response:**
```json
{
  "tier": "pro",
  "expires_at": "2025-12-31T23:59:59Z",
  "features": ["voice_calls", "video_calls", "unlimited_messages"]
}
```

#### `POST /subscription/verify`
Verify Apple IAP receipt (webhook endpoint).

### Reactions Endpoints

#### `POST /api/reactions`
Add a reaction to a message.

**Request:**
```json
{
  "message_id": "msg-uuid",
  "emoji": "👍"
}
```

#### `DELETE /api/reactions/:messageId/:emoji`
Remove a reaction.

### Threads Endpoints

#### `POST /api/threads`
Create a thread (reply to message).

**Request:**
```json
{
  "parent_message_id": "msg-uuid",
  "content": "Reply message"
}
```

#### `GET /api/threads/:messageId`
Get thread replies.

### Read Receipts Endpoints

#### `POST /api/read-receipts/read`
Mark message as read.

**Request:**
```json
{
  "message_id": "msg-uuid",
  "room_id": "room-uuid"
}
```

#### `GET /api/read-receipts/:messageId`
Get read receipt status for a message.

### Health & Admin Endpoints

#### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "ts": "2025-01-28T12:00:00Z"
}
```

#### `GET /metrics`
Prometheus metrics endpoint (for monitoring).

#### `GET /debug/stats`
Debug statistics (auth-gated, requires `DEBUG_TOKEN` query param in production).

---

## WebSocket Protocol

Sinapse uses **Protobuf-encoded WebSocket messages** for efficient binary communication.

### Connection

**URL**: `ws://localhost:3000` (dev) or `wss://sinapse.app` (production)

**Authentication**: JWT token passed in initial connection (handshake)

### Message Format

All messages use the `WSEnvelope` protobuf schema (`specs/proto/ws_envelope.proto`):

```protobuf
message WSEnvelope {
  string type = 1;           // Message type: "presence", "messaging", "read_receipt"
  string room_id = 2;        // Room ID for routing
  bytes payload = 3;         // Message-specific payload
}
```

### Message Types

#### Presence Updates (`type: "presence"`)

**Client → Server:**
```json
{
  "action": "update",
  "room_id": "room-uuid",
  "status": "online" // "online", "away", "offline"
}
```

**Server → Client:**
```json
{
  "type": "presence_update",
  "user_id": "user-uuid",
  "status": "online",
  "room_id": "room-uuid"
}
```

#### Messaging (`type: "messaging"`)

**Client → Server:**
```json
{
  "action": "send",
  "room_id": "room-uuid",
  "content": "Hello!",
  "thread_id": null
}
```

**Server → Client (Broadcast):**
```json
{
  "type": "message",
  "id": "msg-uuid",
  "user_id": "user-uuid",
  "content": "Hello!",
  "room_id": "room-uuid",
  "created_at": "2025-01-28T12:00:00Z"
}
```

#### Read Receipts (`type: "read_receipt"`)

**Client → Server:**
```json
{
  "action": "mark_read",
  "message_id": "msg-uuid",
  "room_id": "room-uuid"
}
```

**Server → Client (Broadcast):**
```json
{
  "type": "read_receipt",
  "message_id": "msg-uuid",
  "user_id": "user-uuid",
  "status": "read",
  "timestamp": "2025-01-28T12:00:00Z"
}
```

### Connection Lifecycle

1. **Connect**: Client establishes WebSocket connection
2. **Authenticate**: JWT token validated (if required)
3. **Join Room**: Client sends presence update to join room
4. **Receive Messages**: Server broadcasts messages to room participants
5. **Ping/Pong**: Server sends ping every 30s, client responds with pong
6. **Disconnect**: Client closes connection or server terminates stale connections (>60s no pong)

### Error Handling

**Error Message Format:**
```json
{
  "type": "error",
  "msg": "error_description"
}
```

**Common Errors:**
- `"proto not loaded"` - Protobuf schema not loaded (server issue)
- `"invalid envelope"` - Malformed message
- `"unknown type"` - Unsupported message type
- `"unauthorized"` - Authentication failed

---

## Database Schema

### Core Tables

#### `users`
User accounts and authentication.

**Columns:**
- `id` (UUID, PK)
- `username` (TEXT, UNIQUE)
- `email` (TEXT)
- `password_hash` (TEXT) - Bcrypt hash
- `age_verified` (BOOLEAN) - 18+ verification flag
- `subscription` (TEXT) - Subscription tier: "free", "pro", "enterprise"
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

#### `rooms`
Chat rooms.

**Columns:**
- `id` (UUID, PK)
- `name` (TEXT)
- `description` (TEXT)
- `is_private` (BOOLEAN)
- `room_tier` (TEXT) - Room tier for moderation
- `ai_moderation` (BOOLEAN) - Enable AI moderation
- `created_by` (UUID, FK → users.id)
- `created_at` (TIMESTAMPTZ)
- `expires_at` (TIMESTAMPTZ, nullable) - For temporary rooms

#### `messages`
Chat messages (partitioned by month).

**Columns:**
- `id` (UUID, PK)
- `room_id` (UUID, FK → rooms.id)
- `user_id` (UUID, FK → users.id)
- `content` (TEXT)
- `thread_id` (UUID, nullable, FK → messages.id) - For threaded replies
- `edited_at` (TIMESTAMPTZ, nullable)
- `deleted_at` (TIMESTAMPTZ, nullable) - Soft delete
- `created_at` (TIMESTAMPTZ) - Partition key

**Indexes:**
- `idx_messages_room_created` (room_id, created_at DESC)
- `idx_messages_thread` (thread_id)
- Full-text search index on `content`

#### `api_keys`
Encrypted API key vault.

**Columns:**
- `id` (UUID, PK)
- `key_name` (VARCHAR(100), UNIQUE) - e.g., "APPLE_TEAM_ID"
- `key_category` (VARCHAR(50)) - e.g., "apple", "livekit"
- `encrypted_value` (BYTEA) - pgcrypto encrypted
- `environment` (VARCHAR(20)) - "development", "staging", "production"
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMPTZ)
- `last_accessed_at` (TIMESTAMPTZ)

**Security**: Encrypted with `pgcrypto`, decrypted via RPC function `get_api_key()`

### Supporting Tables

- `reactions` - Message emoji reactions
- `read_receipts` - Message read tracking
- `threads` - Thread metadata
- `pinned_items` - Pinned messages
- `nicknames` - Room-specific user nicknames
- `files` - File upload metadata
- `telemetry` - System telemetry events
- `ux_telemetry` - UX analytics (separate from system telemetry)
- `moderation_flags` - Content moderation records
- `subscriptions` - Subscription records
- `usage_stats` - Usage tracking

### Migrations

Migrations are in `sql/migrations/` with format: `YYYY-MM-DD-description.sql`

**Key Migrations:**
- `2025-01-27-api-keys-vault.sql` - API key vault setup
- `2025-01-28-add-age-verification.sql` - Age verification column
- `2025-11-12-subscriptions-usage.sql` - Subscription and usage tracking

**Run Migrations:**
```bash
# Via Supabase SQL Editor (recommended)
# Or via psql:
psql $DATABASE_URL -f sql/migrations/2025-01-27-api-keys-vault.sql
```

### Row-Level Security (RLS)

All tables have RLS policies enforcing:
- Users can only read their own data
- Users can only write to rooms they're members of
- Admins have elevated permissions
- Age verification required for room access

---

## Project Structure

### Backend Routes (`src/routes/`)

Complete list of route files:

- `user-authentication-routes.ts` - Auth endpoints (Apple, Google, login, register)
- `room-routes.ts` - Room creation/joining (age-gated)
- `message-routes.ts` - Messaging API (send, get, edit, delete)
- `agora-routes.ts` - Voice/video room management (mute, video toggle, members, leave)
- `search-routes.ts` - Full-text search
- `subscription-routes.ts` - In-app purchases and subscription management
- `file-storage-routes.ts` - File uploads (S3)
- `reactions-routes.ts` - Message reactions
- `threads-routes.ts` - Conversation threading
- `read-receipts-routes.ts` - Read receipt tracking
- `presence-routes.ts` - User presence (online/offline)
- `nicknames-routes.ts` - Room nicknames
- `pinned-routes.ts` - Pinned messages
- `bandwidth-routes.ts` - Bandwidth management
- `chat-room-config-routes.ts` - Room configuration
- `config-routes.ts` - Application configuration
- `telemetry-routes.ts` - System telemetry
- `ux-telemetry-routes.ts` - UX analytics
- `admin-routes.ts` - Admin endpoints
- `voice-routes.ts` - Voice call management
- `entitlements-routes.ts` - Feature entitlements
- `health-routes.ts` - Health checks
- `notify-routes.ts` - Notifications
- `video/join.ts` - Video room joining

### Backend Services (`src/services/`)

Complete list of service files:

- `user-authentication-service.ts` - Authentication logic (Apple, Google, credentials)
- `room-service.ts` - Room management (create, join, list)
- `message-service.ts` - Message handling (send, get, edit, delete)
- `presence-service.ts` - User presence tracking
- `subscription-service.ts` - Subscription management (IAP, tiers)
- `search-service.ts` - Full-text search functionality
- `file-storage-service.ts` - File uploads (S3 integration)
- `moderation.service.ts` - Content moderation (toxicity scoring)
- `telemetry-service.ts` - System telemetry logging
- `ux-telemetry-service.ts` - UX analytics service
- `ux-telemetry-redaction.ts` - PII redaction for UX telemetry
- `api-keys-service.ts` - API key vault access
- `livekit-service.ts` - LiveKit integration
- `livekit-token-service.ts` - LiveKit token generation
- `agora-service.ts` - Agora (legacy) voice/video
- `bandwidth-service.ts` - Bandwidth management
- `notifications-service.ts` - Push notifications
- `nickname-service.ts` - Room nicknames
- `pinned-items-service.ts` - Pinned messages
- `read-receipts-service.ts` - Read receipt tracking
- `poll-service.ts` - Poll creation and voting
- `bot-invite-service.ts` - Bot invitations
- `compression-service.ts` - Data compression
- `config-service.ts` - Configuration management
- `entitlements.ts` - Feature entitlements
- `e2e-encryption.ts` - End-to-end encryption utilities
- `message-queue.ts` - Message queuing system
- `messages-controller.ts` - Message controller
- `partition-management-service.ts` - Database partition management
- `usage-service.ts` - Usage tracking
- `usageMeter.ts` - Usage metering
- `webhooks.ts` - Webhook handlers (Apple IAP)
- `apple-iap-service.ts` - Apple IAP integration
- `apple-jwks-verifier.ts` - Apple JWKS token verification

### Middleware (`src/middleware/`)

- `auth.ts` - JWT authentication (cached secret, 5min TTL)
- `age-verification.ts` - 18+ age gate middleware
- `rate-limiter.ts` - Rate limiting (IP-based, user-based, WebSocket)
- `moderation.ts` - Content moderation middleware
- `subscription-gate.ts` - Feature gating based on subscription tier
- `input-validation.ts` - Input sanitization (XSS, SQL injection prevention)
- `file-upload-security.ts` - File upload validation (MIME type, size limits)
- `cache.ts` - Response caching middleware
- `circuit-breaker.ts` - Circuit breaker pattern for external services
- `error.ts` - Error handling middleware (never exposes internal errors)
- `telemetry.ts` - Request telemetry middleware
- `ws-rate-limiter.ts` - WebSocket-specific rate limiting

### WebSocket (`src/ws/`)

- `gateway.ts` - WebSocket server setup, protobuf handling
- `handlers/presence.ts` - Presence update handler
- `handlers/messaging.ts` - Message handler
- `handlers/read-receipts.ts` - Read receipt handler
- `handlers/reactions-threads.ts` - Reactions and threads handler
- `utils.ts` - WebSocket utilities (room registration, broadcasting)

### Frontend iOS (`frontend/iOS/`)

**Views** (48 Swift files):
- `OnboardingView.swift` - Sign-in with age verification
- `HomeView.swift` - Main dashboard
- `ChatView.swift` - Messaging interface
- `RoomListView.swift` - Room browser
- Additional views for settings, profile, etc.

**Managers** (14 Swift files):
- `APIClient.swift` - HTTP API client
- `WebSocketManager.swift` - WebSocket connection management
- `LiveKitRoomManager.swift` - Voice/video calls
- `MessageManager.swift` - Message handling
- `SubscriptionManager.swift` - IAP handling
- `PresenceViewModel.swift` - Presence state management
- Additional managers for various features

**Services** (10 Swift files):
- `AuthService.swift` - Authentication
- `RoomService.swift` - Room operations
- `MessageService.swift` - Message operations
- Additional services for backend integration

**Models** (8 Swift files):
- User, Room, Message, Reaction, Thread models
- Type definitions matching backend types

**Design System** (14 Swift files):
- Color themes, typography, components
- Golden synapse theme implementation

---

## Environment Variables

### Required Variables

Create a `.env` file in the project root:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# Server Configuration
PORT=3000
NODE_ENV=development

# Redis Configuration
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your_jwt_secret_here_min_32_chars

# Optional: Debug Token (for /debug/stats endpoint in production)
DEBUG_TOKEN=your_debug_token_here
```

### API Keys (Stored in Database Vault)

**Note**: The following API keys are stored in the encrypted database vault (`api_keys` table), NOT in `.env`:

- **Apple**: Team ID, Key ID, Private Key (for Sign-In)
- **Google**: Client ID, Client Secret (for Sign-In)
- **LiveKit**: API Key, API Secret (for voice/video)
- **AWS**: Access Key ID, Secret Access Key, Bucket Name (for S3)
- **DeepSeek**: API Key (for AI moderation)

**To add API keys to vault:**
1. Run migration: `sql/migrations/2025-01-27-api-keys-vault.sql`
2. Use Supabase SQL Editor to insert encrypted keys:
```sql
-- Example (use get_encryption_key() function)
INSERT INTO api_keys (key_name, key_category, encrypted_value, environment)
VALUES ('APPLE_TEAM_ID', 'apple', pgp_sym_encrypt('your_value', get_encryption_key()), 'production');
```

### Environment-Specific Configuration

- **Development**: Uses `localhost` URLs, verbose logging
- **Staging**: Uses staging Supabase project, test API keys
- **Production**: Uses production URLs, minimal logging, strict security

---

## Development

### Code Style

- **TypeScript**: Strict mode enabled (`strict: true` in `tsconfig.json`)
- **Async/Await**: Use async/await, avoid callbacks
- **Error Handling**: Always use try/catch, never swallow errors
- **Logging**: Use `logInfo()`, `logError()` from `src/shared/logger.ts`
- **Type Safety**: Avoid `any` types, use proper TypeScript types

### Adding a New Route

1. **Create route file** in `src/routes/`:
```typescript
// src/routes/my-feature-routes.ts
import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limiter.js';

const router = express.Router();

router.post('/my-endpoint', authMiddleware, rateLimit({ max: 10 }), async (req, res, next) => {
  try {
    // Your logic here
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
```

2. **Register route** in `src/server/index.ts`:
```typescript
import myFeatureRoutes from './routes/my-feature-routes.js';
app.use('/api/my-feature', myFeatureRoutes);
```

3. **Add middleware** as needed (auth, rate limiting, validation)

### Adding a New Service

1. **Create service file** in `src/services/`:
```typescript
// src/services/my-service.ts
import { findOne, create } from '../shared/supabase-helpers.js';
import { logError } from '../shared/logger.js';

export async function myServiceFunction(param: string): Promise<Result> {
  try {
    // Your business logic here
    return result;
  } catch (error) {
    logError('My service error', error);
    throw error;
  }
}
```

2. **Import and use** in routes or other services

### Database Migrations

1. **Create migration file** in `sql/migrations/`:
```sql
-- sql/migrations/2025-01-29-add-my-feature.sql
BEGIN;

CREATE TABLE IF NOT EXISTS my_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_my_table_name ON my_table(name);

COMMIT;
```

2. **Run migration** in Supabase SQL Editor
3. **Test** in development before production

### Testing

```bash
# Run all tests
npm test

# Type check without building
npm run typecheck

# Lint code
npm run lint

# Validate (typecheck + lint)
npm run validate
```

**Note**: Test suite is currently being developed. Add tests in `src/**/__tests__/` directories.

### Debugging

**Local Development:**
- Server logs to console (stdout)
- Use `console.log()` for debugging (removed in production builds)
- Check Redis connection: `redis-cli ping`
- Check Supabase connection: Verify `NEXT_PUBLIC_SUPABASE_URL` is correct

**Debug Endpoint:**
- `GET /debug/stats?token=<DEBUG_TOKEN>` - Aggregated metrics (development only, or requires token in production)

---

## Deployment

### Backend Deployment

#### Prerequisites
- Node.js 20+ installed on server
- PostgreSQL database (Supabase)
- Redis server running
- AWS S3 bucket configured
- Environment variables set

#### Steps

1. **Build the application:**
```bash
npm run build
# Outputs to dist/ directory
```

2. **Deploy to server:**
```bash
# Copy dist/ to server
scp -r dist/ user@server:/path/to/sinapse/

# Copy package.json and install production dependencies
scp package.json user@server:/path/to/sinapse/
ssh user@server "cd /path/to/sinapse && npm install --production"
```

3. **Set environment variables** on server (`.env` file or system environment)

4. **Run database migrations:**
```bash
# Via Supabase SQL Editor (recommended)
# Or via psql:
psql $DATABASE_URL -f sql/migrations/2025-01-27-api-keys-vault.sql
```

5. **Start the server:**
```bash
# Using PM2 (recommended)
pm2 start dist/server/index.js --name sinapse

# Or using systemd
# Create /etc/systemd/system/sinapse.service
```

6. **Configure reverse proxy** (Nginx):
```nginx
server {
  listen 80;
  server_name sinapse.app;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

### iOS Deployment

1. **Open project** in Xcode:
```bash
cd frontend/iOS
open Sinapse.xcodeproj
```

2. **Configure signing**:
   - Select your development team
   - Configure bundle identifier
   - Set up provisioning profiles

3. **Update API URL** in `APIClient.swift`:
```swift
static var baseURL: String {
    #if DEBUG
    return "http://localhost:3000"
    #else
    return "https://sinapse.app"  // Production URL
    #endif
}
```

4. **Archive and export**:
   - Product → Archive
   - Distribute App → App Store Connect
   - Upload to App Store

### Infrastructure (AWS)

#### Terraform Deployment

```bash
cd infra/aws

# Initialize Terraform
terraform init

# Review changes
terraform plan

# Apply infrastructure
terraform apply
```

**Infrastructure includes:**
- EC2 instances (auto-scaling group)
- RDS PostgreSQL (optional, if not using Supabase)
- ElastiCache Redis
- S3 bucket for file storage
- Load balancer
- Security groups

#### Docker Deployment

```bash
# Build Docker image
docker build -t sinapse:latest .

# Run container
docker run -d \
  --name sinapse \
  -p 3000:3000 \
  --env-file .env \
  sinapse:latest
```

---

## Security

### Authentication

- **JWT Tokens**: 7-day expiration, signed with secret from vault
- **Token Storage**: iOS Keychain (secure storage)
- **Token Refresh**: Client must re-authenticate on expiration (no auto-refresh)

### API Key Management

- **Vault System**: All API keys encrypted in database (`api_keys` table)
- **Encryption**: PostgreSQL `pgcrypto` extension
- **Access Control**: Keys retrieved via RPC function with proper permissions
- **Rotation**: Keys can be rotated without code changes (update in database)

### Rate Limiting

- **IP-Based**: 1000 requests per minute (DDoS protection)
- **User-Based**: Configurable per endpoint (default: 100/min for messaging)
- **WebSocket**: 5 concurrent connections per IP
- **Fail-Open**: If Redis fails, requests are allowed (prevents Redis outages from breaking API)

### Content Moderation

- **AI-Powered**: DeepSeek API integration for toxicity scoring
- **Thresholds**: Configurable per room (`room_tier`)
- **Actions**: Warning, mute, ban based on score
- **Logging**: All moderation actions logged to `moderation_flags` table

### Input Validation

- **Sanitization**: All inputs sanitized via `sanitizeInput` middleware
- **XSS Prevention**: HTML entities escaped, script tags removed
- **SQL Injection**: Parameterized queries only (Supabase client)
- **File Uploads**: MIME type validation, size limits, virus scanning (planned)

### CORS

- **Allowed Origins**: `https://sinapse.app`, `http://localhost:3000`
- **Credentials**: Enabled for authenticated requests
- **Methods**: GET, POST, PUT, DELETE, OPTIONS
- **Headers**: `authorization`, `content-type`

### Security Headers (Helmet.js)

- **Content-Security-Policy**: Strict CSP, no inline scripts
- **HSTS**: 1 year max-age, includeSubDomains, preload
- **X-Content-Type-Options**: `nosniff`
- **X-Frame-Options**: `DENY` (no iframes)
- **X-XSS-Protection**: Enabled
- **Referrer-Policy**: `strict-origin-when-cross-origin`

### Row-Level Security (RLS)

All database tables have RLS policies:
- Users can only access their own data
- Room access requires membership
- Age verification required for room access
- Admins have elevated permissions

---

## Monitoring & Observability

### Telemetry

**Dual Logging System:**
1. **Prometheus** (real-time metrics)
   - Counter: `telemetry_events_total{event="event_name"}`
   - Histogram: Request latency (planned)
   - Gauge: Active connections (planned)

2. **Supabase** (persistent storage)
   - Table: `telemetry`
   - Columns: `event`, `user_id`, `room_id`, `features` (JSONB), `event_time`

### Metrics Endpoint

**`GET /metrics`** - Prometheus metrics (exposed for scraping)

**Example:**
```
# HELP telemetry_events_total Total number of telemetry events recorded
# TYPE telemetry_events_total counter
telemetry_events_total{event="message_sent"} 1234
telemetry_events_total{event="user_login"} 567
```

### Health Checks

**`GET /health`** - Basic health check

**Response:**
```json
{
  "status": "ok",
  "ts": "2025-01-28T12:00:00Z"
}
```

**Planned Enhancements:**
- Database connectivity check
- Redis connectivity check
- External service availability (LiveKit, AWS)

### Debug Endpoint

**`GET /debug/stats?token=<DEBUG_TOKEN>`** - Aggregated statistics

**Response:**
```json
{
  "timestamp": "2025-01-28T12:00:00Z",
  "recent_summary": [...],
  "category_summary": [...],
  "performance_linking": {
    "avg_load_time_ms": 123,
    "avg_interaction_latency_ms": 45,
    "stutter_rate": 0.01
  }
}
```

**Security**: Requires `DEBUG_TOKEN` query parameter in production.

### Logging

**Structured Logging:**
- Format: `[Sinapse LEVEL] message`
- Levels: `INFO`, `WARN`, `ERROR`
- Stack traces: Included in development, excluded in production

**Log Functions:**
- `logInfo(message, ...args)` - Info logs
- `logWarning(message, ...args)` - Warning logs
- `logError(message, error)` - Error logs with stack traces

### Error Tracking

**Sentry Integration:**
- Error breadcrumbs added for context
- JWT failures tracked
- Database errors tracked
- Rate limiter failures tracked

---

## Troubleshooting

### Common Issues

#### Server Won't Start

**Issue**: Port already in use
```bash
# Check what's using port 3000
lsof -i :3000

# Kill the process or change PORT in .env
```

**Issue**: Missing environment variables
```bash
# Verify .env file exists and has all required variables
cat .env
```

#### Database Connection Failed

**Issue**: Supabase URL incorrect
```bash
# Verify NEXT_PUBLIC_SUPABASE_URL is correct
echo $NEXT_PUBLIC_SUPABASE_URL
```

**Issue**: Service role key invalid
```bash
# Verify SUPABASE_SERVICE_ROLE_KEY is correct
# Get from Supabase dashboard → Settings → API
```

#### Redis Connection Failed

**Issue**: Redis not running
```bash
# Start Redis
redis-server

# Or via Docker
docker run -d -p 6379:6379 redis:6-alpine
```

**Issue**: Redis URL incorrect
```bash
# Verify REDIS_URL format: redis://localhost:6379
redis-cli -u $REDIS_URL ping
```

#### WebSocket Connection Failed

**Issue**: Protobuf schema not loaded
- Check server logs for "proto not loaded" errors
- Verify `specs/proto/ws_envelope.proto` exists
- Restart server

**Issue**: CORS blocking WebSocket
- Verify WebSocket URL uses `ws://` (dev) or `wss://` (prod)
- Check CORS configuration in `src/server/index.ts`

#### Authentication Failing

**Issue**: JWT secret not found
- Verify API key vault is set up: `sql/migrations/2025-01-27-api-keys-vault.sql`
- Check `JWT_SECRET` key exists in `api_keys` table
- Verify `get_api_key()` RPC function works

**Issue**: Token expired
- Tokens expire after 7 days
- Client must re-authenticate (no auto-refresh)

#### Rate Limiting Too Aggressive

**Issue**: Hitting rate limits in development
- Adjust limits in `src/middleware/rate-limiter.ts`
- Or disable rate limiting in development (not recommended)

### Performance Issues

#### Slow Database Queries

- Check indexes exist: `sql/11_indexing_and_rls.sql`
- Use `EXPLAIN ANALYZE` in Supabase SQL Editor
- Consider adding indexes for frequently queried columns

#### High Memory Usage

- Check for memory leaks in long-running processes
- Monitor with `node --inspect` and Chrome DevTools
- Consider implementing connection pooling limits

#### WebSocket Connection Drops

- Check ping/pong interval (30s)
- Verify network stability
- Check server logs for connection errors

### Getting Help

1. **Check Logs**: Server logs, Supabase logs, Redis logs
2. **Verify Configuration**: Environment variables, database migrations
3. **Test Components**: Database connection, Redis connection, API endpoints
4. **Open Issue**: GitHub issues with:
   - Error messages
   - Steps to reproduce
   - Environment details (Node version, OS, etc.)

---

## Contributing

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/my-feature`
3. **Make changes**: Follow code style guidelines
4. **Test**: Run `npm run validate` and `npm test`
5. **Commit**: Use conventional commits (`feat:`, `fix:`, `docs:`, etc.)
6. **Push**: `git push origin feature/my-feature`
7. **Open Pull Request**: Describe changes and link related issues

### Code Style

- **TypeScript**: Strict mode, no `any` types
- **Formatting**: Use Prettier (if configured)
- **Naming**: camelCase for variables, PascalCase for classes
- **Comments**: JSDoc for public functions
- **Error Handling**: Always use try/catch, never swallow errors

### Commit Messages

Use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Test additions/changes
- `chore:` - Maintenance tasks

**Example:**
```
feat: add message editing endpoint

- Add PUT /messaging/:id endpoint
- Add edit history tracking
- Update OpenAPI spec
```

---

## License

MIT License - see LICENSE file for details

---

## Support

- **Documentation**: Check this README and `docs/` directory
- **API Spec**: `specs/api/openapi.yaml`
- **Issues**: GitHub Issues
- **Security**: Report security issues privately (do not open public issues)

---

**Built with ❤️ by the Sinapse team**
