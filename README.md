# Sinapse Backend

A production-ready backend API for the Sinapse platform, providing real-time messaging, file storage, user authentication, and autonomous operations management.

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
sinapse-backend/
├── src/
│   ├── config/              # Database and Redis configuration
│   ├── services/            # Business logic services
│   │   ├── user-authentication-service.ts
│   │   ├── message-service.ts
│   │   ├── file-storage-service.ts
│   │   ├── presence-service.ts
│   │   ├── config-service.ts
│   │   ├── optimizer-service.ts
│   │   └── telemetry-service.ts
│   ├── routes/              # Express route handlers
│   │   ├── user-authentication-routes.ts
│   │   ├── message-routes.ts
│   │   ├── file-storage-routes.ts
│   │   ├── presence-routes.ts
│   │   ├── config-routes.ts
│   │   ├── admin-routes.ts
│   │   └── telemetry-routes.ts
│   ├── server/              # Server setup and middleware
│   │   ├── middleware/      # Express middleware
│   │   └── index.ts         # Main server entry point
│   ├── shared/              # Shared utilities
│   │   ├── supabase-helpers.ts  # Database query helpers
│   │   └── logger.ts            # Logging utilities
│   ├── ws/                  # WebSocket handlers
│   ├── telemetry/           # Telemetry hooks
│   └── autonomy/            # Autonomous operations
├── scripts/                 # Utility scripts
├── sql/                     # Database schema
├── specs/                   # API specifications
├── server.js               # Entry point (for compatibility)
├── package.json
└── tsconfig.json
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

Run the SQL schema from `sql/init-db.sql` in your Supabase SQL editor.

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

- `users` - User accounts
- `rooms` - Chat rooms
- `messages` - Message history
- `files` - File metadata
- `config` - Application configuration
- `recommendations` - Optimization recommendations
- `iap_receipts` - In-app purchase receipts

See `sql/init-db.sql` for the complete schema.

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

## License

[Your License Here]
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

**For questions or support**: Check the respective README files in each component directory.
