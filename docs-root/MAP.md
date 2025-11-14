# Codebase Feature Map

**Purpose**: Quick reference for mapping code → features → validation gates.  
**For**: Grok AI, developers, and automated tooling.

## Where to Start

**New Contributors**: Start with `README.md`, then explore:
1. `src/server/index.ts` - Main API entry point
2. `frontend/iOS/SinapseApp.swift` - iOS app entry
3. `src/ws/gateway.ts` - WebSocket real-time layer
4. `src/autonomy/` - Autonomous system components

**Grok**: Use tags `[FEATURE:*]` to find related code. Check [`TAGS.md`](./TAGS.md) for tag definitions.

## Feature → Module Mapping

### [FEATURE: Paywalls] - Subscription & Payment Gating
**Modules**:
- `frontend/iOS/Managers/SubscriptionManager.swift` - StoreKit 2 subscription manager
- `frontend/iOS/Models/SubscriptionTier.swift` - Tier definitions (Starter/Pro/Enterprise)
- `frontend/iOS/Views/SubscriptionView.swift` - Subscription UI
- `frontend/iOS/Views/Profile/PricingSheet.swift` - Pricing display
- `src/services/subscription-service.ts` - Backend subscription logic
- `src/routes/subscription-routes.ts` - Subscription API endpoints
- `src/middleware/subscription-gate.ts` - Feature gating middleware
- `src/services/apple-iap-service.ts` - Apple IAP verification

**Key Functions**:
- `SubscriptionManager.purchaseTier()` - Purchase subscription
- `subscription-service.getUserSubscription()` - Get user tier
- `subscription-gate.ts` - Enforce tier requirements

**Events**: `[EVENT] subscription_purchased`, `[EVENT] subscription_updated`

**Tests**: `frontend/iOS/Tests/` (subscription tests), `backend/tests/subscription-service.test.ts`

**Gates**: `[GATE] IAP verification; tier enforcement; StoreKit integration`

---

### [FEATURE: Telemetry] - Analytics & Monitoring
**Modules**:
- `src/telemetry/` - Telemetry collection
- `src/services/telemetry-service.ts` - Telemetry service
- `src/services/ux-telemetry-service.ts` - UX telemetry
- `frontend/iOS/Telemetry/Telemetry.swift` - iOS telemetry client
- `frontend/iOS/Services/UXTelemetryService.swift` - UX event tracking
- `frontend/iOS/Models/UXEventType.swift` - Event type definitions

**Key Functions**:
- `UXTelemetryService.logEvent()` - Log UX events
- `telemetry-service.collect()` - Collect metrics
- `Telemetry.logEvent()` - iOS telemetry

**Events**: `[EVENT] ui_click`, `[EVENT] ui_state_transition`, `[EVENT] performance_metric`

**Tests**: `frontend/iOS/Tests/DashboardTelemetryTests.swift`

**Gates**: `[GATE] event schema validation; privacy redaction; batch upload`

---

### [FEATURE: MainCollabUI] - Main Collaboration Interface
**Modules**:
- `frontend/iOS/Views/DashboardView.swift` - Main dashboard
- `frontend/iOS/Views/ChatView.swift` - Chat interface
- `frontend/iOS/Views/VoiceRoomView.swift` - Voice/video room
- `frontend/iOS/Views/MainTabView.swift` - Tab navigation
- `frontend/iOS/Views/HomeView.swift` - Home screen

**Key Functions**:
- `DashboardView.loadMetrics()` - Load dashboard data
- `ChatView.sendMessage()` - Send message
- `VoiceRoomView.joinRoom()` - Join voice room

**Events**: `[EVENT] room_entry`, `[EVENT] message_sent`, `[EVENT] voice_joined`

**Tests**: `frontend/iOS/Tests/DashboardViewTests.swift`, `frontend/iOS/UITests/`

**Gates**: `[GATE] UI responsiveness; accessibility; dark mode`

---

### [FEATURE: VoiceToCode] - Voice & Audio Processing
**Modules**:
- `src/services/livekit-service.ts` - LiveKit integration
- `frontend/iOS/Managers/LiveKitRoomManager.swift` - Room management
- `frontend/iOS/Managers/SpeechManager.swift` - Speech recognition
- `src/routes/voice-routes.ts` - Voice API endpoints

**Key Functions**:
- `LiveKitRoomManager.joinRoom()` - Join voice room
- `SpeechManager.startRecording()` - Start voice recording
- `livekit-service.createRoom()` - Create voice room

**Events**: `[EVENT] voice_joined`, `[EVENT] voice_left`, `[EVENT] audio_level`

**Tests**: Voice integration tests

**Gates**: `[GATE] audio quality; latency; permissions`

---

### [FEATURE: Governance] - Room & Access Control
**Modules**:
- `src/services/room-service.ts` - Room management
- `src/routes/room-routes.ts` - Room API
- `frontend/iOS/Managers/RoomManager.swift` - iOS room manager
- `src/services/moderation.service.ts` - Content moderation

**Key Functions**:
- `room-service.createRoom()` - Create room
- `moderation.service.moderate()` - Moderate content
- `RoomManager.fetchRooms()` - Fetch user rooms

**Events**: `[EVENT] room_created`, `[EVENT] room_updated`, `[EVENT] moderation_applied`

**Tests**: `backend/tests/services/room-service.test.ts`

**Gates**: `[GATE] RBAC checks; moderation rules; room limits`

---

### [FEATURE: ImmutableLog] - Audit & Logging
**Modules**:
- `src/services/ai-log-classifier.ts` - Log classification
- `src/services/ai-log-processor.ts` - Log processing
- `sql/07_healing_logs.sql` - Logging schema

**Key Functions**:
- `ai-log-classifier.classify()` - Classify log entry
- `ai-log-processor.process()` - Process log

**Events**: `[EVENT] log_classified`, `[EVENT] log_processed`

**Tests**: Log processing tests

**Gates**: `[GATE] append-only; privacy redaction; audit trail`

---

### [FEATURE: SessionRecording] - Session Capture
**Modules**:
- `src/services/message-service.ts` - Message storage
- `src/ws/handlers/messaging.ts` - Real-time messaging
- `frontend/iOS/Managers/MessageManager.swift` - Message management

**Key Functions**:
- `message-service.createMessage()` - Create message
- `MessageManager.sendMessage()` - Send message
- `messaging-handler.handleMessage()` - Handle WebSocket message

**Events**: `[EVENT] message_sent`, `[EVENT] message_received`, `[EVENT] message_updated`

**Tests**: `backend/tests/services/message-service.test.ts`

**Gates**: `[GATE] message validation; rate limiting; encryption`

---

### [FEATURE: WalletAuth] - Authentication
**Modules**:
- `src/services/user-authentication-service.ts` - Auth service
- `src/routes/auth.js` - Auth endpoints
- `frontend/iOS/Managers/AppleAuthHelper.swift` - Apple Sign-In
- `frontend/iOS/Managers/GoogleAuthHelper.swift` - Google Sign-In
- `frontend/iOS/Services/AuthService.swift` - iOS auth service

**Key Functions**:
- `user-authentication-service.login()` - User login
- `AppleAuthHelper.signIn()` - Apple Sign-In
- `GoogleAuthHelper.signIn()` - Google Sign-In

**Events**: `[EVENT] user_logged_in`, `[EVENT] user_logged_out`

**Tests**: Auth integration tests

**Gates**: `[GATE] JWT validation; OAuth flow; session management`

---

### [FEATURE: DeptRouter] - LLM Routing & Classification
**Modules**:
- `src/services/ai-log-router.ts` - Log routing
- `src/services/ai-handlers/` - Handler buckets
- `src/services/llm-service.ts` - LLM integration

**Key Functions**:
- `ai-log-router.route()` - Route log entry
- `llm-service.generate()` - LLM generation

**Events**: `[EVENT] llm_request`, `[EVENT] llm_response`

**Tests**: LLM routing tests

**Gates**: `[GATE] classification accuracy; latency; cost limits`

---

### [FEATURE: ContractAssist] - AI Assistance
**Modules**:
- `src/autonomy/llm_reasoner.ts` - AI reasoning
- `src/services/ai-automation.ts` - AI automation
- `frontend/iOS/Managers/AIReasoner.swift` - iOS AI client

**Key Functions**:
- `llm_reasoner.reason()` - AI reasoning
- `ai-automation.execute()` - Execute automation

**Events**: `[EVENT] ai_suggestion`, `[EVENT] ai_action`

**Tests**: AI integration tests

**Gates**: `[GATE] safety checks; policy compliance; cost limits`

---

## API Endpoints Quick Reference

### Authentication
- `POST /api/auth/login` - User login [API] [FEATURE: WalletAuth]
- `POST /api/auth/apple` - Apple Sign-In [API] [FEATURE: WalletAuth]
- `POST /api/auth/google` - Google Sign-In [API] [FEATURE: WalletAuth]

### Subscriptions
- `GET /api/subscription/status` - Get subscription status [API] [FEATURE: Paywalls]
- `POST /api/subscription/verify` - Verify IAP receipt [API] [FEATURE: Paywalls]

### Rooms
- `GET /api/rooms` - List rooms [API] [FEATURE: Governance]
- `POST /api/rooms` - Create room [API] [FEATURE: Governance]
- `GET /api/rooms/:id` - Get room [API] [FEATURE: Governance]

### Messages
- `POST /api/messages` - Send message [API] [FEATURE: SessionRecording]
- `GET /api/messages/:roomId` - Get messages [API] [FEATURE: SessionRecording]

### Voice
- `POST /api/voice/join` - Join voice room [API] [FEATURE: VoiceToCode]
- `POST /api/voice/leave` - Leave voice room [API] [FEATURE: VoiceToCode]

### Telemetry
- `POST /api/telemetry` - Submit telemetry [API] [FEATURE: Telemetry]
- `POST /api/ux-telemetry` - Submit UX telemetry [API] [FEATURE: Telemetry]

## Database Schema Quick Reference

### Core Tables
- `users` - User accounts [DB] [FEATURE: WalletAuth]
- `rooms` - Chat rooms [DB] [FEATURE: Governance]
- `messages` - Messages [DB] [FEATURE: SessionRecording]
- `subscriptions` - Subscription records [DB] [FEATURE: Paywalls]
- `telemetry` - Telemetry data [DB] [FEATURE: Telemetry]

### Key Columns
- `users.subscription` - Subscription tier [DB] [FEATURE: Paywalls]
- `messages.content` - Message content [DB] [FEATURE: SessionRecording]
- `rooms.ai_moderation` - AI moderation flag [DB] [FEATURE: Governance]

## Event Schema Reference

See `schemas/events.example.json` for full event schemas. Key events:

- `user_logged_in` - User authentication [EVENT] [FEATURE: WalletAuth]
- `room_entry` - Room join [EVENT] [FEATURE: Governance]
- `message_sent` - Message sent [EVENT] [FEATURE: SessionRecording]
- `subscription_purchased` - Subscription purchase [EVENT] [FEATURE: Paywalls]
- `ui_click` - UI interaction [EVENT] [FEATURE: Telemetry]

## Test Coverage

### Frontend Tests
- `frontend/iOS/Tests/DashboardViewTests.swift` - Dashboard tests
- `frontend/iOS/Tests/PresenceViewModelTests.swift` - Presence tests
- `frontend/iOS/Tests/WebSocketManagerTests.swift` - WebSocket tests
- `frontend/iOS/UITests/SinapseUITests.swift` - UI tests

### Backend Tests
- `backend/tests/services/message-service.test.ts` - Message service
- `backend/tests/services/room-service.test.ts` - Room service
- `backend/tests/subscription-service.test.ts` - Subscription service

## Security & Privacy Notes

- `[SEC]` JWT tokens expire after 24h
- `[PRIVACY]` PII redacted from telemetry logs
- `[SEC]` API keys stored in encrypted vault
- `[SEC]` Rate limiting on all endpoints
- `[PRIVACY]` Messages encrypted at rest

## Performance Targets

- `[PERF]` API response time p95 < 200ms
- `[PERF]` WebSocket latency < 50ms
- `[PERF]` iOS app launch < 1s
- `[PERF]` Voice room join < 2s

## Cost Optimization

- `[COST]` LLM calls cached for 5min
- `[COST]` Telemetry batched every 5s
- `[COST]` Subscription tier limits API usage

