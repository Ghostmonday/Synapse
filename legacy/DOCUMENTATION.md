# Sinapse Complete Documentation

**Last Updated**: 2025-01-27  
**Version**: 2.0  
**Status**: Consolidated Master Documentation

---

## Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Architecture](#architecture)
4. [Database Schema](#database-schema)
5. [API Reference](#api-reference)
6. [Telemetry System](#telemetry-system)
7. [AI Integration](#ai-integration)
8. [LLM Parameters & Configuration](#llm-parameters--configuration)
9. [Pricing Tiers](#pricing-tiers)
10. [iOS Frontend](#ios-frontend)
11. [Security & Safeguards](#security--safeguards)
12. [Deployment](#deployment)
13. [Development Guide](#development-guide)
14. [Troubleshooting](#troubleshooting)

---

## Overview

Sinapse is a production-ready communication platform with real-time messaging, voice/video calls, file storage, AI integration, and autonomous operations management.

### Key Features

- **User Authentication**: Apple Sign-In and credential-based authentication with JWT tokens
- **Real-time Messaging**: WebSocket-based messaging with Redis pub/sub for instant message delivery
- **File Storage**: AWS S3 integration for scalable file uploads and retrieval
- **Presence System**: Track user online/offline status
- **AI Assistants**: Configurable AI assistants with multiple model support
- **Telemetry & Observability**: Prometheus metrics and structured logging
- **Autonomous Operations**: Self-healing capabilities via LLM-powered optimizer
- **Subscription System**: Three-tier pricing with usage tracking

### Technology Stack

- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (with ES modules)
- **Database**: Supabase (PostgreSQL via REST API)
- **Cache**: Redis for pub/sub and presence tracking
- **Storage**: AWS S3 for file uploads
- **Observability**: Prometheus + Grafana
- **Authentication**: JWT + Apple Sign-In
- **Frontend**: SwiftUI (iOS), Vue.js (Web)

---

## Quick Start

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- Redis (local or cloud)
- AWS account with S3 bucket (optional, for file storage)

### Installation

1. **Clone and install dependencies:**

```bash
npm install
```

2. **Configure environment variables:**

Create a `.env` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Application Configuration
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key

# AWS S3 (for file storage)
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_S3_BUCKET=your_bucket_name

# LiveKit (for video calls)
LIVEKIT_API_KEY=your_livekit_key
LIVEKIT_API_SECRET=your_livekit_secret

# Apple Sign-In
APPLE_APP_BUNDLE=com.your.app.bundle

# DeepSeek (for optimizer)
DEEPSEEK_API_KEY=your_deepseek_key
```

3. **Initialize database:**

Run the complete schema in Supabase SQL Editor:
```sql
-- Option 1: Run complete schema (recommended)
\i sql/sinapse_complete.sql

-- Option 2: Run migrations in order
\i sql/01_sinapse_schema.sql
\i sql/09_p0_features.sql
\i sql/migrations/migrate-remaining-tables.sql
```

4. **Start the server:**

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

---

## Architecture

### Project Structure

```
Sinapse/
├── src/                     # Source code
│   ├── config/              # Database and Redis configuration
│   ├── services/            # Business logic services
│   ├── routes/              # Express route handlers
│   ├── middleware/          # Express middleware
│   ├── shared/              # Shared utilities
│   ├── ws/                  # WebSocket handlers
│   ├── autonomy/            # Autonomous operations
│   ├── llm-observer/        # LLM observer and watchdog
│   └── telemetry/           # Telemetry system
├── scripts/                 # Organized scripts
│   ├── dev/                # Development scripts
│   └── ops/                # Operations scripts
├── sql/                     # Database files
│   ├── migrations/         # Migration scripts
│   └── *.sql               # Core schema files
├── config/                  # Configuration files
│   ├── prometheus.yml
│   └── rules.yml
├── docs/                    # Documentation
├── frontend/                # Frontend code
│   └── iOS/                # iOS app
└── specs/                   # API specifications
```

### Services Layer

Services contain business logic and database operations. They use shared Supabase helpers for consistent query patterns.

Example service structure:
```typescript
import { findOne, create } from '../shared/supabase-helpers.js';

export async function getUserById(id: string) {
  return await findOne('users', { id });
}
```

### Routes Layer

Routes handle HTTP request/response and call appropriate services. They include telemetry hooks for observability.

---

## Database Schema

The backend uses Supabase (PostgreSQL) with the following main tables:

- `users` - User accounts (with subscription and password_hash)
- `rooms` - Chat rooms
- `messages` - Message history (with reactions, threads, edit history)
- `threads` - Message threads
- `edit_history` - Message edit history
- `files` - File metadata
- `config` - Application configuration
- `usage_stats` - Usage tracking for subscriptions
- `iap_receipts` - In-app purchase receipts
- `bot_endpoints` - Bot API endpoints
- `assistants` - AI assistant configurations
- `bots` - Bot registration
- `embeddings` - Vector embeddings for semantic search
- `ux_telemetry` - UX telemetry events
- `telemetry` - System telemetry events

**Schema Files:**
- `sql/sinapse_complete.sql` - Complete schema (all-in-one)
- `sql/01_sinapse_schema.sql` - Core schema
- `sql/09_p0_features.sql` - P0 features (threads, reactions, search)
- `sql/10_integrated_features.sql` - Integrated features (assistants, bots, embeddings)
- `sql/migrations/` - Migration scripts for updates

See `sql/README.md` for migration order and usage.

For detailed schema documentation, see [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md).

---

## API Reference

### Authentication

- `POST /auth/apple` - Verify Apple Sign-In token
  - Body: `{ "token": "apple_id_token" }`
  - Returns: `{ "jwt": "...", "livekitToken": "..." }`

- `POST /auth/login` - Authenticate with username/password
  - Body: `{ "username": "...", "password": "..." }`
  - Returns: `{ "jwt": "..." }`

### Messaging

- `POST /messaging/send` - Send a message to a room
  - Body: `{ "roomId": "...", "senderId": "...", "content": "..." }`

- `GET /messaging/:roomId` - Get recent messages from a room
  - Returns: Array of messages

### File Storage

- `POST /files/upload` - Upload a file
  - Form-data: `file` (multipart/form-data)
  - Returns: `{ "url": "...", "id": "..." }`

- `GET /files/:id` - Get file URL by ID
  - Returns: `{ "url": "..." }`

- `DELETE /files/:id` - Delete a file

### Presence

- `GET /presence/status?userId=...` - Get user presence status
  - Returns: `{ "status": "online" | "offline" }`

- `POST /presence/update` - Update user presence
  - Body: `{ "userId": "...", "status": "..." }`

### AI Assistants

- `POST /api/assistants` - Invoke AI assistant with SSE streaming
  - Body: `{ "assistantId": "...", "message": "...", "roomId": "..." }`

### Search

- `POST /api/search` - Hybrid semantic + keyword search
  - Body: `{ "query": "...", "roomId": "...", "threshold": 0.78 }`

### Telemetry

- `POST /telemetry/log` - Log a telemetry event
  - Body: `{ "event": "event_name" }`

- `POST /api/ux-telemetry` - Log UX telemetry event
  - Body: `{ "category": "...", "event": "...", "data": {...} }`

### System

- `GET /health` - Health check endpoint
  - Returns: `{ "status": "ok", "ts": "..." }`

- `GET /metrics` - Prometheus metrics endpoint

For complete API specification, see [`specs/api/openapi.yaml`](specs/api/openapi.yaml).

---

## Telemetry System

Sinapse includes two separate telemetry systems:

### System Telemetry

Tracks infrastructure and system-level events:
- API requests/responses
- Database operations
- WebSocket connections
- Error rates and latency
- Resource usage

**Storage**: `telemetry` table  
**Endpoint**: `POST /telemetry/log`

### UX Telemetry

Tracks user behavior and product observability:
- UI state transitions
- User interactions (clicks, gestures)
- Validation errors
- Flow abandonment
- Emotional metrics
- Journey analytics

**Storage**: `ux_telemetry` table  
**Endpoint**: `POST /api/ux-telemetry`

### Event Categories

#### Messaging Events
- `msg_edited`, `msg_deleted`, `msg_flagged`, `msg_pinned`, `msg_reacted`

#### Presence & Sessions
- `user_joined_room`, `user_left_room`, `user_idle`, `user_back`
- `voice_session_start`, `voice_session_end`

#### Bot Activity
- `bot_invoked`, `bot_response`, `bot_failure`, `bot_timeout`, `bot_flagged`

#### Moderation & Admin
- `mod_action_taken`, `mod_appeal_submitted`, `mod_escalated`, `policy_change`

For complete event reference, see [`docs/TELEMETRY_EVENTS.md`](docs/TELEMETRY_EVENTS.md).

For UX telemetry schema, see [`docs/UX_TELEMETRY_SCHEMA.md`](docs/UX_TELEMETRY_SCHEMA.md).

---

## AI Integration

### AI Assistants

AI assistants are configurable per-user with:
- Model selection (GPT-3.5, GPT-4, DeepSeek, Claude)
- Temperature control (0.0-2.0)
- Custom prompts
- Per-assistant settings

**Endpoint**: `POST /api/assistants`

### LLM Observer / Watchdog

The LLM Observer monitors UX telemetry and generates recommendations:
- Pattern detection from telemetry data
- Derivable metrics calculation
- Strategy template matching
- Autonomous action recommendations

**Location**: `src/llm-observer/watchdog.ts`

### Autonomous Operations

The autonomy system includes:
- Self-healing capabilities
- Performance optimization
- Rate limit adjustment
- Cache TTL optimization
- Moderation threshold tuning

**Location**: `src/autonomy/`

For AI safeguards, see [`docs/AI_SAFEGUARDS.md`](docs/AI_SAFEGUARDS.md).

---

## LLM Parameters & Configuration

Sinapse includes a centralized LLM parameter management system with 61 tunable parameters across 12 categories.

### Parameter Categories

1. **LLM Model Selection** (6 params)
2. **Temperature & Creativity** (5 params)
3. **Token Limits & Costs** (7 params)
4. **Rate Limiting** (7 params)
5. **Moderation Thresholds** (11 params)
6. **Performance Boundaries** (4 params)
7. **AI Automation** (5 params)
8. **Semantic Search** (2 params)
9. **Maintenance Window** (3 params)
10. **Subscription Tier Parameters**
11. **Feature Flags** (10 features)
12. **Environment Variables** (3 vars)

### Control Types

- **UI**: User can modify via interface (4 params)
- **AGENT**: LLM agent can modify autonomously (20 params)
- **HYBRID**: Multiple control methods available (6 params)
- **MANUAL**: Requires code/env changes (31 params)

### Configuration Files

- `src/config/llm-params.config.ts` - Centralized parameter definitions
- `src/services/llm-parameter-manager.ts` - Runtime parameter manager
- `config/llm-params-runtime.json` - Runtime configuration persistence

For complete parameter reference, see [`docs/TUNABLE_PARAMETERS.md`](docs/TUNABLE_PARAMETERS.md).

For parameter system architecture, see [`docs/LLM_PARAMETER_SYSTEM.md`](docs/LLM_PARAMETER_SYSTEM.md).

---

## Pricing Tiers

Sinapse offers three subscription tiers:

### 🥉 Starter - $9/month
- 50K tokens/day (~$5/day)
- 500 token responses
- GPT-3.5-turbo only
- 1 AI assistant
- Manual control
- 20 requests/hour

### 🥈 Professional - $29/month
- 250K tokens/day (~$25/day)
- 1,500 token responses
- GPT-4 access
- 5 AI assistants
- Automated recommendations
- A/B testing (5 max)
- 100 requests/hour

### 💎 Enterprise - $99/month
- 1M tokens/day (~$100/day)
- 4,000 token responses
- All models (DeepSeek, Claude)
- Unlimited assistants
- Fully autonomous operations
- Unlimited A/B tests
- 500 requests/hour
- 20% token cost discount

For detailed pricing information, see [`docs/PRICING_TIERS.md`](docs/PRICING_TIERS.md).

---

## iOS Frontend

The Sinapse iOS app is built with SwiftUI and integrates with the backend API.

### Features

- SwiftUI-based interface
- StoreKit 2 for subscriptions
- Apple Speech Recognition (ASR) for voice input
- REST API integration with all backend endpoints
- Real-time messaging support
- iOS 17.0+ deployment target

### Build Instructions

See [`frontend/iOS/README_BUILD.md`](frontend/iOS/README_BUILD.md) for build instructions.

See [`frontend/iOS/XCODE_SETUP.md`](frontend/iOS/XCODE_SETUP.md) for Xcode setup.

### Architecture

- **Views**: SwiftUI views organized by feature
- **ViewModels**: Observable view models for state management
- **Services**: API clients and service layers
- **Managers**: Singleton managers (WebSocket, Subscription, etc.)
- **Models**: Data models with Codable support

---

## Security & Safeguards

### AI Safeguards

All AI automation is wrapped in comprehensive safeguards:

1. **Rate Limiting**: 100 calls per hour (Redis-based sliding window)
2. **Error Backoff**: 5 minute wait on 500 errors
3. **Timeout Wrapper**: 30 second max per analysis
4. **Comprehensive Logging**: All operations logged to audit_log
5. **PolicyGuard**: Validation for agent-controlled changes

### Moderation

- Content filtering with configurable thresholds
- PII detection and scrubbing
- Toxicity scoring
- Spam detection
- Per-room moderation settings

### Authentication

- JWT token-based authentication
- Apple Sign-In support
- Password hashing (bcrypt)
- Session management

For complete safeguards documentation, see [`docs/AI_SAFEGUARDS.md`](docs/AI_SAFEGUARDS.md).

---

## Deployment

### Docker Deployment

1. **Build and run with Docker Compose:**

```bash
docker-compose up --build
```

This starts:
- API server (port 3000)
- Redis (port 6379)
- Prometheus (port 9090)
- Optimizer microservice

2. **Access services:**

- API: `http://localhost:3000`
- Prometheus: `http://localhost:9090`
- Health check: `http://localhost:3000/health`

### Environment Variables

See [Quick Start](#quick-start) for required environment variables.

### Database Migration

Run migrations in order:
1. `sql/01_sinapse_schema.sql` - Core schema
2. `sql/02_compressor_functions.sql` - Compression
3. `sql/03_retention_policy.sql` - Retention
4. `sql/04_moderation_apply.sql` - Moderation
5. `sql/05_rls_policies.sql` - Security
6. `sql/06_partition_management.sql` - Partitioning
7. `sql/07_healing_logs.sql` - Healing
8. `sql/08_enhanced_rls_policies.sql` - Enhanced security
9. `sql/09_p0_features.sql` - Threads, reactions, search
10. `sql/10_integrated_features.sql` - Assistants, bots, embeddings
11. `sql/17_ux_telemetry_schema.sql` - UX telemetry

---

## Development Guide

### Scripts

Development scripts are organized in `scripts/dev/`:
- `setup.sh` - Initial project setup
- `seed.sh` - Database seeding
- `test-endpoints.sh` - API endpoint testing
- `validate-openapi.ts` - OpenAPI schema validation

Operations scripts are in `scripts/ops/`:
- `repair_high_cpu.sh` - CPU issue remediation
- `repair_high_latency.sh` - Latency issue remediation

### Building

```bash
# TypeScript compilation
npm run build

# Output will be in dist/ directory
```

### Development Scripts

- `npm run dev` - Start server in watch mode
- `npm run dev:optimizer` - Start optimizer microservice in watch mode
- `npm run build` - Compile TypeScript
- `npm start` - Start compiled server

### Code Organization

- **Services**: Business logic in `src/services/`
- **Routes**: HTTP handlers in `src/routes/`
- **Middleware**: Express middleware in `src/middleware/`
- **Shared**: Utilities in `src/shared/`
- **Types**: TypeScript types in `src/types/`

---

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct
   - Check Supabase project is active
   - Ensure database tables are initialized

2. **Redis Connection Errors**
   - Verify Redis is running: `redis-cli ping`
   - Check `REDIS_URL` matches your Redis instance

3. **File Upload Errors**
   - Verify AWS credentials are correct
   - Check S3 bucket permissions
   - Ensure bucket name is correct

4. **Build Errors**
   - Ensure Node.js 18+ is installed
   - Run `npm install` to update dependencies
   - Check TypeScript compilation errors

### Observability

### Prometheus Metrics

The server exposes metrics at `/metrics`:
- `http_requests_total` - Total HTTP requests
- `telemetry_events_total` - Telemetry events by type

### Logging

Logs are written to console with structured format:
- `[Sinapse INFO]` - Informational messages
- `[Sinapse ERROR]` - Error messages
- `[Sinapse WARN]` - Warnings

---

## Additional Resources

### Documentation Files

- [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md) - Complete database schema
- [`docs/TELEMETRY_EVENTS.md`](docs/TELEMETRY_EVENTS.md) - Telemetry event reference
- [`docs/UX_TELEMETRY_SCHEMA.md`](docs/UX_TELEMETRY_SCHEMA.md) - UX telemetry schema
- [`docs/AI_SAFEGUARDS.md`](docs/AI_SAFEGUARDS.md) - AI safety system
- [`docs/PRICING_TIERS.md`](docs/PRICING_TIERS.md) - Pricing tier details
- [`docs/TUNABLE_PARAMETERS.md`](docs/TUNABLE_PARAMETERS.md) - Parameter reference
- [`docs/LLM_PARAMETER_SYSTEM.md`](docs/LLM_PARAMETER_SYSTEM.md) - Parameter system architecture
- [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) - Supabase setup guide

### iOS Documentation

- [`frontend/iOS/README_BUILD.md`](frontend/iOS/README_BUILD.md) - iOS build guide
- [`frontend/iOS/XCODE_SETUP.md`](frontend/iOS/XCODE_SETUP.md) - Xcode setup
- [`frontend/iOS/README_AUTONOMY.md`](frontend/iOS/README_AUTONOMY.md) - Autonomy system
- [`frontend/iOS/TAB_POLISH_SUMMARY.md`](frontend/iOS/TAB_POLISH_SUMMARY.md) - UI polish summary

### API Specifications

- [`specs/api/openapi.yaml`](specs/api/openapi.yaml) - OpenAPI specification

---

**Last Updated**: 2025-01-27  
**For questions or support**: Check the respective README files in each component directory.
