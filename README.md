# Sinapse

Real-time communication platform with AI-powered features, voice/video calls, and autonomous system capabilities.

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL (via Supabase)
- Redis
- Xcode 15+ (for iOS development)

### Installation

```bash
# Install dependencies
npm install

# Configure environment
# Create .env file with required variables (see Environment Variables section)
# Copy from .env.example if available, or create manually

# Set up database (run in Supabase SQL Editor)
# 1. sql/migrations/2025-01-27-api-keys-vault.sql
# 2. sql/migrations/2025-01-28-add-age-verification.sql
# 3. Other migrations as needed

# Start development server
npm run dev
```

## Architecture

**Monorepo Structure:**
```
Sinapse/
├── src/                    # Backend API (Express + TypeScript)
│   ├── server/            # Server entry point
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic
│   ├── middleware/        # Auth, validation, rate limiting
│   ├── ws/                # WebSocket gateway
│   └── workers/           # Background workers
├── frontend/iOS/          # iOS SwiftUI application
├── sql/migrations/        # Database migrations
├── supabase/functions/    # Supabase Edge Functions
├── scripts/               # Development & operations scripts
├── infra/aws/             # Terraform infrastructure
└── docs/                  # Documentation
```

## Tech Stack

**Backend:**
- Node.js + TypeScript
- Express.js (HTTP API)
- WebSocket (real-time messaging)
- Supabase (PostgreSQL + Auth)
- LiveKit (voice/video)
- Redis (pub/sub, caching)

**Frontend:**
- SwiftUI (iOS)
- LiveKit SDK

**Infrastructure:**
- AWS (S3, EC2)
- Terraform
- Docker

## Key Features

### Authentication & Security
- **Apple Sign-In** - Inline flow, no redirects
- **Google Sign-In** - FirebaseUI-Auth integration
- **JWT-based sessions** - Secure token management
- **Age Verification** - 18+ gate for room access (required checkbox on signup)
- **API Key Vault** - Encrypted credential storage in database
- **Rate Limiting** - Request throttling on all endpoints
- **Content Moderation** - AI-powered filtering

### Real-Time Communication
- **WebSocket messaging** - Instant message delivery
- **Voice/Video calls** - LiveKit integration
- **Presence indicators** - Online/offline status
- **Message reactions** - Emoji reactions
- **Read receipts** - Message read tracking
- **Threads** - Conversation threading
- **Search** - Full-text search across messages and rooms

### Rooms & Messaging
- **Room creation** - Public and private rooms
- **Age-gated access** - 18+ verification required
- **Message queuing** - Reliable message delivery
- **File uploads** - Secure file storage (AWS S3)
- **Pinned messages** - Important message pinning
- **Nicknames** - Custom room nicknames

### iOS App
- **SwiftUI interface** - Modern golden synapse theme
- **Instant launch** - Auth-bound onboarding, zero delays
- **Dark mode** - Full dark mode support
- **Accessibility** - VoiceOver and accessibility features
- **Telemetry** - UX analytics and performance monitoring

### AI Features
- **DeepSeek integration** - Moderation and optimization
- **Autonomous systems** - Self-healing capabilities
- **LLM parameter management** - Dynamic AI configuration

## Project Structure

### Backend (`src/`)

**Routes (`src/routes/`)** - API endpoints
- `user-authentication-routes.ts` - Auth (Apple, Google, register, login)
- `room-routes.ts` - Room creation/joining (age-gated)
- `message-routes.ts` - Messaging API
- `agora-routes.ts` - Voice/video room management
- `search-routes.ts` - Full-text search
- `subscription-routes.ts` - In-app purchases
- `file-storage-routes.ts` - File uploads
- `reactions-routes.ts` - Message reactions
- `threads-routes.ts` - Conversation threading
- `read-receipts-routes.ts` - Read receipt tracking

**Services (`src/services/`)** - Business logic
- `user-authentication-service.ts` - Authentication logic
- `room-service.ts` - Room management
- `message-service.ts` - Message handling
- `presence-service.ts` - User presence tracking
- `subscription-service.ts` - Subscription management
- `search-service.ts` - Search functionality

**Middleware (`src/middleware/`)** - Request processing
- `auth.ts` - JWT verification
- `age-verification.ts` - 18+ age gate
- `rate-limiter.ts` - Request throttling
- `moderation.ts` - Content filtering
- `subscription-gate.ts` - Feature gating
- `input-validation.ts` - Input sanitization

**WebSocket (`src/ws/`)** - Real-time gateway
- `gateway.ts` - WebSocket server
- `handlers/` - Message handlers

### Frontend (`frontend/iOS/`)

**Views** - SwiftUI screens
- `OnboardingView.swift` - Sign-in with age verification
- `HomeView.swift` - Main dashboard
- `ChatView.swift` - Messaging interface
- `RoomListView.swift` - Room browser

**Managers** - Business logic
- `APIClient.swift` - API communication
- `LiveKitRoomManager.swift` - Voice/video
- `MessageManager.swift` - Messaging
- `SubscriptionManager.swift` - IAP handling

**Services** - Backend integration
- `AuthService.swift` - Authentication
- `RoomService.swift` - Room operations
- `MessageService.swift` - Message operations

### Database (`sql/migrations/`)

Key migrations:
- `2025-01-27-api-keys-vault.sql` - Encrypted API key storage
- `2025-01-28-add-age-verification.sql` - Age verification column
- Additional migrations for schema updates

## Environment Variables

Required in `.env`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Server
PORT=3000
NODE_ENV=development

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your_jwt_secret
```

**Note:** API keys (Apple, Google, LiveKit, AWS, AI) are stored in the encrypted database vault, not in `.env`.

## Scripts

```bash
npm run dev          # Start development server
npm run build        # Compile TypeScript
npm run typecheck    # Type check without building
npm run lint         # Run linter
npm run test         # Run tests
npm run validate     # Type check + lint
```

## Development

### Adding a New Route

1. Create route file in `src/routes/` (e.g., `my-feature-routes.ts`)
2. Import and register in `src/server/index.ts`:
   ```typescript
   import myFeatureRoutes from './routes/my-feature-routes.js';
   app.use('/api/my-feature', myFeatureRoutes);
   ```
3. Add middleware as needed (auth, rate limiting, etc.)

### Adding a New Service

1. Create service file in `src/services/` (e.g., `my-service.ts`)
2. Export functions/types
3. Import where needed

### Database Migrations

1. Create SQL file in `sql/migrations/`
2. Use format: `YYYY-MM-DD-description.sql`
3. Include `BEGIN;` and `COMMIT;` for transactions
4. Run in Supabase SQL Editor

### Age Verification

The age verification gate requires:
- Users to check "I confirm I'm 18+" during signup
- `age_verified` column in `users` table (via migration)
- Middleware on room-related endpoints
- iOS checkbox in `OnboardingView.swift`

## Security

- **API keys** - Stored in encrypted database vault
- **JWT authentication** - Required for all protected endpoints
- **Rate limiting** - Prevents abuse
- **Content moderation** - AI-powered filtering
- **Input validation** - Sanitization on all inputs
- **Row-level security** - RLS policies in Supabase
- **Age verification** - 18+ gate for room access

## Deployment

### Backend

```bash
npm run build
# Deploy dist/ to your server
# Ensure environment variables are set
# Run database migrations
```

### iOS

```bash
cd frontend/iOS
# Open Sinapse.xcodeproj in Xcode
# Archive and export IPA
# Or use: xcodegen generate (if using XcodeGen)
```

### Infrastructure

```bash
cd infra/aws
terraform init
terraform plan
terraform apply
```

## Development Guidelines

### Code Style
- TypeScript strict mode enabled
- Use async/await (no callbacks)
- Services handle business logic, routes handle HTTP
- Middleware for cross-cutting concerns (auth, validation, rate limiting)

### Testing
- Unit tests: `npm test`
- Type checking: `npm run typecheck`
- Linting: `npm run lint`

### Database Migrations
- Create migration files in `sql/migrations/` with format: `YYYY-MM-DD-description.sql`
- Always wrap in `BEGIN;` / `COMMIT;` transactions
- Test migrations in development before production
- Run migrations via Supabase SQL Editor or CLI

### Adding Features
1. Create service in `src/services/`
2. Create route in `src/routes/`
3. Register route in `src/server/index.ts`
4. Add middleware as needed (auth, rate limiting, validation)
5. Update OpenAPI spec if adding new endpoints
6. Add database migrations if schema changes needed

## Documentation

- **API Specification**: `specs/api/openapi.yaml` - OpenAPI 3.0 specification
- **Threat Model**: `docs/threat_model.md` - Security threat analysis
- **Database Schema**: `sql/` - Schema definitions and migrations

## Security

- **API keys** - Stored in encrypted database vault (not in `.env`)
- **JWT authentication** - Required for all protected endpoints
- **Rate limiting** - Prevents abuse (IP-based and user-based)
- **Content moderation** - AI-powered filtering with toxicity scoring
- **Input validation** - Sanitization on all inputs
- **Row-level security** - RLS policies in Supabase
- **Age verification** - 18+ gate for room access
- **CORS** - Restricted to allowed origins only
- **Helmet** - Security headers (CSP, HSTS, XSS protection)

## License

MIT License

## Support

For issues and questions, check the repository documentation or open an issue.
