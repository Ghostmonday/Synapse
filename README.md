# Sinapse

A production-ready communication platform with real-time messaging, voice/video calls, file storage, AI integration, and autonomous operations management.

## 🚀 Status

✅ **Schema Ready** - Database fully migrated and tested  
✅ **Core Features** - Messaging, threads, reactions, search  
✅ **Monetization** - Subscription system with usage tracking  
✅ **Security** - Password hashing, file upload validation  
✅ **Voice/Video** - LiveKit integration with quality enhancement  
✅ **AI Integration** - LLM-powered assistants and autonomous operations  
✅ **Telemetry** - Comprehensive system and UX telemetry  
✅ **AI Moderation** - Enterprise-grade content moderation with warnings-first approach

## Overview

Sinapse Backend is built with Node.js, Express, TypeScript, and Supabase. It provides RESTful APIs for user management, real-time messaging via WebSockets, file storage with AWS S3, and integrated observability with Prometheus.

### Key Features

- **User Authentication**: Apple Sign-In and credential-based authentication with JWT tokens
- **Real-time Messaging**: WebSocket-based messaging with Redis pub/sub for instant message delivery
- **File Storage**: AWS S3 integration for scalable file uploads and retrieval
- **Presence System**: Track user online/offline status
- **Configuration Management**: Dynamic application configuration storage
- **Telemetry & Observability**: Prometheus metrics and structured logging
- **Autonomous Operations**: Self-healing capabilities via LLM-powered optimizer

## Architecture

### Technology Stack

- **Runtime**: Node.js with Express.js
- **Language**: TypeScript (with ES modules)
- **Database**: Supabase (PostgreSQL via REST API)
- **Cache**: Redis for pub/sub and presence tracking
- **Storage**: AWS S3 for file uploads
- **Observability**: Prometheus + Grafana
- **Authentication**: JWT + Apple Sign-In

### Project Structure

```
Sinapse/
├── src/                     # Source code
│   ├── config/              # Database and Redis configuration
│   ├── services/            # Business logic services
│   │   ├── user-authentication-service.ts
│   │   ├── message-service.ts
│   │   ├── subscription-service.ts
│   │   ├── usage-service.ts
│   │   └── telemetry-service.ts
│   ├── routes/              # Express route handlers
│   │   ├── user-authentication-routes.ts
│   │   ├── message-routes.ts
│   │   ├── subscription-routes.ts
│   │   └── telemetry-routes.ts
│   ├── middleware/          # Express middleware
│   │   ├── auth.ts
│   │   ├── file-upload-security.ts
│   │   └── subscription-gate.ts
│   ├── shared/              # Shared utilities
│   │   ├── supabase-helpers.ts
│   │   └── logger.ts
│   ├── ws/                  # WebSocket handlers
│   └── autonomy/            # Autonomous operations
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

Or use the migration scripts in `sql/migrations/` for incremental updates.

4. **Start the server:**

```bash
# Development mode (with hot reload)
npm run dev

# Production mode
npm run build
npm start
```

The server will start on `http://localhost:3000` (or your configured PORT).

## API Endpoints

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

### AI Moderation (Enterprise-Only)

AI-powered content moderation is available for Enterprise-tier rooms. This feature uses DeepSeek LLM to analyze messages for toxicity.

**Features:**
- **Opt-in only** - No free user gets policed
- **Enterprise tier required** - Only rooms with `room_tier = 'enterprise'` can enable moderation
- **Automatic flagging** - Messages with toxicity score > 0.65 are flagged
- **Hard threshold** - Messages with score > 0.85 are automatically removed
- **Soft threshold** - Messages with score 0.65-0.85 trigger warnings but are allowed
- **Audit logging** - All moderation actions are logged to `moderation_flags` table

**Endpoints:**

- `GET /chat_rooms/:id/config` - Get room configuration including moderation settings
  - Returns: `{ id, ai_moderation, room_tier, expires_at }`
  - Requires: Room owner authentication

- `POST /chat_rooms/:id/config` - Update room configuration
  - Body: `{ "ai_moderation": true }` (enterprise only)
  - Requires: Room owner authentication + Enterprise subscription
  - Automatically sets `room_tier` to `'enterprise'` when moderation is enabled

**Testing:**

Test moderation analysis:
```bash
npx tsx scripts/test-moderation.ts "your message here" --threshold=0.65
```

**Configuration:**

Add to your `.env`:
```env
DEEPSEEK_API_KEY=your_deepseek_api_key
```

**Room Expiry:**

Pro-tier rooms automatically expire after 24 hours. Expired rooms are cleaned up by the cron job:
```bash
npx tsx src/jobs/expire-temporary-rooms.ts
```

Schedule via Supabase Edge Functions, cron-job.org, or your preferred scheduler.

**Future: Hosting Partner Integration**

Enterprise rooms can be self-hosted on partner infrastructure (e.g., DigitalOcean droplets) for full control and compliance.

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

### Configuration

- `GET /config` - Get all configuration
  - Returns: Configuration object

- `PUT /config` - Update configuration
  - Body: `{ "key": "value", ... }`

### Admin

- `POST /admin/apply-recommendation` - Store optimization recommendation (requires auth)
  - Body: `{ "recommendation": {...} }`
  - Headers: `Authorization: Bearer <token>`

### Telemetry

- `POST /telemetry/log` - Log a telemetry event
  - Body: `{ "event": "event_name" }`

### System

- `GET /health` - Health check endpoint
  - Returns: `{ "status": "ok", "ts": "..." }`

- `GET /metrics` - Prometheus metrics endpoint

## Development

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

### Running Tests

```bash
# Run endpoint tests
curl http://localhost:3000/health
curl http://localhost:3000/api/test
```

### Development Scripts

- `npm run dev` - Start server in watch mode
- `npm run dev:optimizer` - Start optimizer microservice in watch mode
- `npm run build` - Compile TypeScript
- `npm start` - Start compiled server

## Docker Deployment

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

**Schema Files:**
- `sql/sinapse_complete.sql` - Complete schema (all-in-one)
- `sql/01_sinapse_schema.sql` - Core schema
- `sql/09_p0_features.sql` - P0 features (threads, reactions, search)
- `sql/migrations/` - Migration scripts for updates

See `sql/README.md` for migration order and usage.

## Code Organization

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

### Shared Utilities

- `supabase-helpers.ts` - Reusable database query functions (findOne, findMany, create, update, delete)
- `logger.ts` - Structured logging functions

## Observability

### Prometheus Metrics

The server exposes metrics at `/metrics`:
- `http_requests_total` - Total HTTP requests
- `telemetry_events_total` - Telemetry events by type

### Logging

Logs are written to console with structured format:
- `[Sinapse INFO]` - Informational messages
- `[Sinapse ERROR]` - Error messages
- `[Sinapse WARN]` - Warnings

## Security Considerations

1. **JWT Tokens**: Use strong `JWT_SECRET` in production
2. **Supabase Service Role Key**: Keep this secret, never expose to client
3. **AWS Credentials**: Use IAM roles in production, not hardcoded keys
4. **Environment Variables**: Never commit `.env` files
5. **Rate Limiting**: Consider adding rate limiting middleware for production

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

## Contributing

When adding new features:

1. Create service in `src/services/` with descriptive name
2. Create routes in `src/routes/` following naming convention
3. Update this README with new endpoints
4. Add telemetry hooks for observability
5. Use shared Supabase helpers for database operations

## Documentation

For complete documentation, see [`DOCUMENTATION.md`](DOCUMENTATION.md) which includes:
- Complete API reference
- Database schema documentation
- Telemetry system guide
- AI integration and LLM parameters
- Pricing tiers and feature gating
- iOS frontend development guide
- Security and safeguards
- Deployment instructions

## iOS Frontend

The Sinapse iOS app is built with SwiftUI and integrates with this backend API. For iOS development and build instructions, see:

- **iOS Build Guide**: [`frontend/iOS/README_BUILD.md`](frontend/iOS/README_BUILD.md)
- **Xcode Setup**: [`frontend/iOS/XCODE_SETUP.md`](frontend/iOS/XCODE_SETUP.md)

### iOS Features

- SwiftUI-based interface
- StoreKit 2 for subscriptions
- Apple Speech Recognition (ASR) for voice input
- REST API integration with all backend endpoints
- Real-time messaging support
- iOS 17.0+ deployment target

---

## Roadmap

### Current (v0.1.0)
- ✅ AI Moderation (Enterprise-only, warnings-first)
- ✅ Room Tiers (Temp for Pro, Permanent for Enterprise)
- ✅ Self-hosting documentation
- ✅ iOS native app with SwiftUI

### Next Up
- 🔄 **Android App** - Native Android client (Kotlin/Compose)
- 🔄 **Hosting Partnerships** - One-click deployment via DigitalOcean/AWS
- 🔄 **Advanced Moderation** - Custom rules, keyword filtering
- 🔄 **Federation** - Cross-instance room sharing

### Future
- 📋 **Video Calls** - Enhanced LiveKit integration with recording
- 📋 **End-to-End Encryption** - Optional E2EE for enterprise rooms
- 📋 **AI Assistants** - Customizable AI bots per room
- 📋 **Analytics Dashboard** - Built-in analytics for room owners
- 📋 **API Marketplace** - Third-party integrations and plugins

### Partnerships
We're exploring partnerships with hosting providers for one-click enterprise deployment. Interested? Contact: enterprise@sinapse.app

---

## Additional Resources

- **Complete Documentation**: [`DOCUMENTATION.md`](DOCUMENTATION.md) - Consolidated master documentation
- **Database Schema**: [`docs/DATABASE_SCHEMA.md`](docs/DATABASE_SCHEMA.md)
- **Telemetry Events**: [`docs/TELEMETRY_EVENTS.md`](docs/TELEMETRY_EVENTS.md)
- **Pricing Tiers**: [`docs/PRICING_TIERS.md`](docs/PRICING_TIERS.md)
- **LLM Parameters**: [`docs/TUNABLE_PARAMETERS.md`](docs/TUNABLE_PARAMETERS.md)
- **API Specification**: [`specs/api/openapi.yaml`](specs/api/openapi.yaml)

**For questions or support**: Check [`DOCUMENTATION.md`](DOCUMENTATION.md) or the respective README files in each component directory.
