# Sinapse

Real-time communication platform with AI-powered features, voice/video calls, and autonomous system capabilities.

## Architecture

**Monorepo Structure (TurboRepo):**
```
Sinapse/
├── apps/                   # Applications
│   ├── api/               # Node.js/TypeScript backend API
│   ├── web/               # Web frontend (Next.js/Vite - ready)
│   └── mobile/            # Mobile app (iOS SwiftUI)
├── packages/               # Shared packages
│   ├── core/              # Shared types, utils, config, validation
│   ├── livekit/           # LiveKit wrappers
│   ├── supabase/          # Supabase client + types
│   └── ai-mod/            # DeepSeek/AI logic
├── src/                    # Legacy backend (migrating to apps/api)
│   ├── server/            # Express API server
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic services
│   ├── middleware/        # Request middleware
│   ├── ws/                # WebSocket gateway
│   ├── autonomy/          # Autonomous system components
│   ├── telemetry/         # Telemetry collection
│   └── workers/           # Background workers
├── frontend/               # iOS native app
│   └── iOS/               # SwiftUI application
├── sql/                    # Database migrations
│   ├── migrations/        # Versioned SQL scripts
│   └── archive/           # Legacy SQL files
├── supabase/               # Supabase Edge Functions
│   └── functions/         # Serverless functions
├── scripts/                # Operational scripts
│   ├── dev/               # Development utilities
│   └── ops/               # Production operations
├── infra/                  # Infrastructure as Code
│   └── aws/               # Terraform configurations
├── config/                 # Configuration files
├── docs/                   # Documentation
│   ├── reports/           # Audit reports and summaries
│   └── threat_model.md    # Security documentation
└── specs/                  # API specifications
```

## Tech Stack

**Backend:**
- Node.js + TypeScript
- Express.js (HTTP API)
- WebSocket (real-time)
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

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL (via Supabase)
- Redis
- Xcode 15+ (for iOS)

### Installation

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.template .env
   # Edit .env with your credentials
   ```

3. **Set up database:**
   - Run migrations in Supabase SQL Editor:
     ```sql
     -- Run in order:
     -- 1. sql/migrations/2025-01-27-api-keys-vault.sql
     -- 2. sql/migrations/2025-01-27-populate-only.sql (template - replace placeholders)
     ```

4. **Start development server:**
   ```bash
   npm run dev
   ```

5. **Build for production:**
   ```bash
   npm run build:prod
   npm start
   ```

## Key Features

### Authentication
- Apple Sign-In integration (inline flow, no redirects)
- Google Sign-In integration (FirebaseUI-Auth, inline flow)
- JWT-based session management
- Secure credential storage (database vault)
- Instant auth-bound onboarding - routes to HomeView after successful sign-in

### Real-Time Communication
- WebSocket messaging
- Voice/video calls (LiveKit)
- Presence indicators
- Message reactions
- Emotion pulse monitoring
- Real-time telemetry

### AI Features
- DeepSeek integration (moderation, optimization)
- Autonomous system (healing loop, policy guard)
- LLM parameter management
- AI safeguards
- Emotional state monitoring

### iOS App
- Modern SwiftUI interface with golden synapse theme
- Instant app launch with auth-bound onboarding
- Apple & Google Sign-In buttons (black buttons with white icons)
- Animated launch screen with smooth transitions
- Dashboard with real-time metrics
- Telemetry and analytics integration
- Accessibility support
- Dark mode support
- Zero artificial delays - feels instant and responsive
- Inline authentication flow - no redirects or extra screens

### Data Management
- Encrypted API key vault
- File storage (AWS S3)
- Telemetry collection
- Usage analytics

## Project Structure

### Backend (`src/`)

**Server (`src/server/`)**
- `index.ts` - Main Express server
- `middleware/` - Auth, rate limiting, validation
- `routes/` - Server-specific routes
- `services/` - Server utilities

**Routes (`src/routes/`)**
- `auth.js` - Authentication endpoints
- `message-routes.ts` - Messaging API
- `room-routes.ts` - Room management
- `voice-routes.ts` - Voice/video calls
- `subscription-routes.ts` - IAP handling

**Services (`src/services/`)**
- `api-keys-service.ts` - Key vault access
- `user-authentication-service.ts` - Auth logic
- `livekit-service.ts` - Voice/video management
- `message-service.ts` - Message handling
- `telemetry-service.ts` - Metrics collection

**Middleware (`src/middleware/`)**
- `auth.ts` - JWT verification
- `rate-limiter.ts` - Request throttling
- `moderation.ts` - Content filtering
- `subscription-gate.ts` - Feature gating

**WebSocket (`src/ws/`)**
- `gateway.ts` - WebSocket server
- `handlers/` - Message handlers

**Autonomy (`src/autonomy/`)**
- `healing-loop.ts` - Self-healing system
- `policy_guard.ts` - Policy enforcement
- `llm_reasoner.ts` - AI reasoning

### Frontend (`frontend/iOS/`)

**Views**
- `Views/` - SwiftUI views
- `ViewModels/` - View models
- `Components/` - Reusable components

**Managers**
- `APIClient.swift` - API communication
- `LiveKitRoomManager.swift` - Voice/video
- `MessageManager.swift` - Messaging
- `SubscriptionManager.swift` - IAP

**Services**
- `Services/` - Business logic
- `Telemetry/` - Analytics

### Database (`sql/migrations/`)

- `2025-01-27-api-keys-vault.sql` - Key vault system
- `2025-01-27-populate-only.sql` - Initial data
- Additional migrations for schema updates

### Supabase Functions (`supabase/functions/`)

- `api-key-vault/` - Key retrieval
- `join-room/` - Room joining logic
- `llm-proxy/` - LLM API proxy

## Environment Variables

Required in `.env`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

All other keys (Apple, LiveKit, JWT, AI, AWS) are stored in the database vault.

## Scripts

- `npm run dev` - Start development server
- `npm run dev:optimizer` - Start optimizer worker
- `npm run build` - Compile TypeScript
- `npm run build:prod` - Production build
- `npm start` - Run production server
- `npm run validate` - Validate OpenAPI spec

## Feature Tag Glossary

This codebase uses structured tags in comments to map code → features → contracts → validation gates. This enables:
- **Grok AI** to understand feature boundaries and dependencies
- **Developers** to quickly find related code
- **Automated tooling** to generate documentation and validate gates

**See**: [`TAGS.md`](./TAGS.md) for complete tag definitions and [`MAP.md`](./MAP.md) for feature → module mapping.

### Quick Reference

- **Feature Tags**: `[FEATURE: Paywalls]`, `[FEATURE: Telemetry]`, `[FEATURE: VoiceToCode]`, etc.
- **Gate Tags**: `[GATE]`, `[SEC]`, `[PRIVACY]`, `[PERF]`, `[RELIAB]`
- **Domain Tags**: `[API]`, `[EVENT]`, `[DB]`, `[CHAIN]`, `[LLM]`, `[VOICE]`, `[UI]`

**Example**:
```swift
// [FEATURE: Paywalls] [GATE] [SEC]
// PURPOSE: Verify subscription tier before allowing premium feature access
// GATES: [GATE] unit:test_subscription_gate; integration:paywall_flow
func checkSubscriptionAccess() -> Bool { ... }
```

All source files include module headers and function-level anchors. See any annotated file for the pattern.

## Development

### Adding a New Route

1. Create route file in `src/routes/`
2. Import and register in `src/server/index.ts`
3. Add middleware as needed

### Adding a New Service

1. Create service file in `src/services/`
2. Export functions/types
3. Import where needed

### Database Migrations

1. Create SQL file in `sql/migrations/`
2. Use format: `YYYY-MM-DD-description.sql`
3. Run in Supabase SQL Editor

## Security

- API keys stored in encrypted database vault
- JWT authentication required
- Rate limiting on all endpoints
- Content moderation (AI-powered)
- Input validation and sanitization
- Row-level security (RLS) in Supabase

## Deployment

### Backend

```bash
npm run build:prod
# Deploy dist/ to your server
```

### iOS

```bash
cd frontend/iOS
# Build in Xcode
# Archive and export IPA
```

### Infrastructure

```bash
cd infra/aws
terraform init
terraform plan
terraform apply
```

## License

MIT License - See repository root for details.

## Recent Updates

### Authentication (Latest)
- **Google Sign-In**: Added Google Sign-In using GoogleSignIn SDK with inline flow
- **Apple Sign-In**: Enhanced Apple Sign-In with proper token handling and backend integration
- **Unified Auth Flow**: Both Apple and Google auth route directly to HomeView after successful sign-in
- **No Redirects**: Inline authentication flow - no redirects or extra screens
- **Backend Integration**: AuthService.loginWithGoogle() and AuthService.loginWithApple() handle backend communication

### Performance Optimizations
- **Instant App Launch**: Removed all artificial delays - app feels instant and responsive
- **Auth-Bound Onboarding**: OnboardingView now binds to auth state for instant transition when logged in
- **Zero Loading Delays**: Removed 0.3s-0.5s artificial delays in RoomListView, DashboardView, HomeView, and PricingSheet
- **Faster Animations**: Reduced animation delays from 0.2s to 0.1s for snappier feel
- **Legacy Cleanup**: Removed old LaunchView.swift and legacy/LICENSE file

### iOS App Improvements
- **Modern Launch Screen**: Redesigned onboarding with animated golden glow effects
- **Telemetry Integration**: Enabled emotion pulse monitoring and UX telemetry logging
- **Build Cleanup**: Removed build artifacts from git tracking for cleaner repository
- **Accessibility**: Fixed accessibility issues across chat and room views
- **Code Quality**: Resolved naming conflicts and improved code organization

### Previous Updates
- Backend support for lazy loading messages with `since` parameter
- Complete UI/UX roadmap implementation (Search, Read Receipts, File Upload, Polls, etc.)
- Dark mode support and performance optimizations
- Database vault system for secure API key storage

## Support

For issues and questions, check the repository documentation.

