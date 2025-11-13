# Repository Structure & File Listing

This document provides a comprehensive overview of the Synapse repository structure for auditing and navigation purposes.

## 📁 Root Directory Files

```
Synapse/
├── README.md                    # Main project documentation
├── CLEANUP_SUMMARY.md          # Recent cleanup and refactoring summary
├── REPOSITORY_STRUCTURE.md     # This file - comprehensive structure guide
├── MAP.md                       # Feature → module mapping
├── TAGS.md                      # Feature tag glossary
├── package.json                 # Root package.json (TurboRepo workspaces)
├── package-lock.json            # Dependency lock file
├── turbo.json                   # TurboRepo configuration
├── tsconfig.json                # TypeScript configuration
├── hardhat.config.cjs           # Hardhat (Solidity) configuration
├── foundry.toml                 # Foundry configuration
├── docker-compose.yml           # Docker Compose configuration
├── Dockerfile                   # Docker image definition
└── .gitignore                   # Git ignore patterns
```

## 📦 Monorepo Structure

### Apps (`apps/`)

#### `apps/api/` - Backend API
- **Purpose**: Node.js/TypeScript Express API server
- **Status**: Package.json created, migration in progress
- **Files**:
  - `package.json` - API app dependencies and scripts

#### `apps/web/` - Web Frontend
- **Purpose**: Web application (Next.js/Vite)
- **Status**: Ready for implementation

#### `apps/mobile/` - Mobile App
- **Purpose**: Mobile application
- **Status**: Ready for implementation

### Packages (`packages/`)

#### `packages/core/` - Core Shared Package
- **Purpose**: Shared types, utilities, config, validation
- **Files**:
  - `package.json` - Package configuration
  - `src/config/index.ts` - Consolidated configuration (Zod-validated)
  - `src/validation/index.ts` - Zod validation schemas
  - `src/index.ts` - Package exports

#### `packages/livekit/` - LiveKit Wrappers
- **Purpose**: LiveKit SDK wrappers and utilities
- **Status**: Package.json created

#### `packages/supabase/` - Supabase Client
- **Purpose**: Supabase client and type definitions
- **Status**: Package.json created

#### `packages/ai-mod/` - AI Module
- **Purpose**: DeepSeek/AI integration logic
- **Status**: Package.json created

## 🔧 Source Code (`src/`)

### Backend Structure

```
src/
├── server/              # Express server (21 files)
│   ├── index.ts        # Main server entry point
│   ├── middleware/     # Server middleware (4 files)
│   ├── routes/         # Server routes (8 files)
│   ├── services/       # Server services (7 files)
│   └── utils/          # Server utilities (1 file)
├── routes/              # API route handlers (32 files)
│   ├── admin-routes.ts
│   ├── ai-log-routes.ts
│   ├── assistants-routes.ts
│   ├── auth.js
│   ├── bandwidth-routes.ts
│   ├── bots-routes.ts
│   ├── chat-room-config-routes.ts
│   ├── config-routes.ts
│   ├── entitlements-routes.ts
│   ├── file-storage-routes.ts
│   ├── health-routes.ts
│   ├── iap.js
│   ├── message-routes.ts
│   ├── nicknames-routes.ts
│   ├── notify-routes.ts
│   ├── pinned-routes.ts
│   ├── polls-routes.ts
│   ├── presence-routes.ts
│   ├── reactions-routes.ts
│   ├── read-receipts-routes.ts
│   ├── room-routes.ts
│   ├── rooms.js
│   ├── search-routes.ts
│   ├── subscription-routes.ts
│   ├── telemetry-routes.ts
│   ├── threads-routes.ts
│   ├── user-authentication-routes.ts
│   ├── ux-telemetry-routes.ts
│   ├── video/join.ts
│   └── voice-routes.ts
├── services/            # Business logic (46 files)
│   ├── ai-automation.ts
│   ├── ai-handlers/     # AI handlers (3 files)
│   ├── ai-log-classifier.ts
│   ├── ai-log-processor.ts
│   ├── ai-log-router.ts
│   ├── ai-safeguards.ts
│   ├── ai-scheduler.ts
│   ├── api-keys-service.ts
│   ├── apple-iap-service.ts
│   ├── apple-jwks-verifier.ts
│   ├── bandwidth-service.ts
│   ├── bot-invite-service.ts
│   ├── config-service.ts
│   ├── e2e-encryption.ts
│   ├── entitlements.ts
│   ├── file-storage-service.ts
│   ├── livekit-service.ts
│   ├── livekit-token-service.ts
│   ├── llm-parameter-manager.ts
│   ├── llm-service.ts
│   ├── message-queue.ts
│   ├── messages-controller.ts
│   ├── moderation.service.ts
│   ├── nickname-service.ts
│   ├── notifications-service.ts
│   ├── optimizer-service.ts
│   ├── partition-management-service.ts
│   ├── pinned-items-service.ts
│   ├── poll-service.ts
│   ├── presence-service.ts
│   ├── push-notification-service.ts
│   ├── read-receipts-service.ts
│   ├── room-service.ts
│   ├── search-service.ts
│   ├── subscription-service.ts
│   ├── telemetry-service.ts
│   ├── usage-service.ts
│   ├── usageMeter.ts
│   ├── user-authentication-service.ts
│   ├── ux-telemetry-redaction.ts
│   ├── ux-telemetry-service.ts
│   ├── voice-security-service.ts
│   └── webhooks.ts
├── middleware/          # Request middleware (7 files)
│   ├── circuit-breaker.ts
│   ├── file-upload-security.ts
│   ├── input-validation.ts
│   ├── moderation.ts
│   ├── rate-limiter.ts
│   ├── subscription-gate.ts
│   └── ws-rate-limiter.ts
├── ws/                  # WebSocket gateway (6 files)
│   ├── gateway.ts
│   ├── handlers/        # WebSocket handlers
│   └── utils.ts
├── autonomy/            # Autonomous system (7 files)
│   ├── executor.ts
│   ├── healing-loop.ts
│   ├── index.ts
│   ├── llm_reasoner.ts
│   ├── policy_guard.ts
│   ├── telemetry_collector.ts
│   └── types.ts
├── ai/                  # AI components (1 file)
│   └── consensus.ts
├── config/              # Configuration (4 files)
│   ├── db.js
│   ├── db.d.ts
│   ├── llm-params.config.ts
│   └── redis-pubsub.ts
├── types/               # TypeScript types (5 files)
│   ├── auth.types.ts
│   ├── compression.d.ts
│   ├── message.types.ts
│   ├── ux-telemetry.ts
│   └── websocket.types.ts
├── shared/              # Shared utilities (2 files)
│   ├── logger.ts
│   └── supabase-helpers.ts
├── utils/               # Utilities (1 file)
│   └── prompt-sanitizer.ts
├── jobs/                # Background jobs (2 files)
│   ├── expire-temporary-rooms.ts
│   └── partition-management-cron.ts
├── workers/             # Workers (1 file)
│   └── sin-worker.ts
├── telemetry/           # Telemetry (1 file)
│   └── ux/
├── llm-observer/        # LLM observer (14 files)
│   ├── watchdog.ts
│   └── strategies/      # Strategy JSON files (13 files)
├── optimizer/           # Optimizer (1 file)
│   └── index.ts
├── functions/           # Functions (1 file)
│   └── compressAndStore.ts
└── components/          # Vue components (8 files)
    ├── ChatInput.vue
    ├── MessageBubble.vue
    ├── PresenceIndicator.vue
    ├── PresenceOrb.vue
    ├── ProgrammaticUI.vue
    ├── ThreadView.vue
    ├── VoiceRoomView.vue
    └── VoiceVideoPanel.vue
```

## 📱 Frontend (`frontend/iOS/`)

### iOS Application Structure

```
frontend/iOS/
├── Sinapse.xcodeproj/          # Xcode project
├── SinapseApp.swift            # App entry point
├── Views/                      # SwiftUI views
│   ├── Onboarding/
│   ├── Chat/
│   ├── Room/
│   ├── Profile/
│   ├── Settings/
│   ├── Shared/
│   └── Components/
├── ViewModels/                 # View models
├── Models/                     # Data models
├── Services/                   # Business logic
├── Managers/                  # Manager classes
├── Telemetry/                  # Analytics
├── Assets.xcassets/            # Images and assets
└── Info.plist                  # App configuration
```

**Total**: 199 files (118 Swift, 60 PNG, 14 JSON, 7 other)

## 🗄️ Database (`sql/`)

### SQL Files

```
sql/
├── 01_sinapse_schema.sql
├── 02_compressor_functions.sql
├── 03_retention_policy.sql
├── 04_moderation_apply.sql
├── 05_rls_policies.sql
├── 06_partition_management.sql
├── 07_healing_logs.sql
├── 08_enhanced_rls_policies.sql
├── 09_p0_features.sql
├── 10_integrated_features.sql
├── 11_indexing_and_rls.sql
├── 12_telemetry_triggers.sql
├── 12_verify_setup.sql
├── 13_create_missing_ai_views.sql
├── 16_ai_audit_triggers.sql
├── 17_ux_telemetry_schema.sql
├── QUICK_VALIDATION.sql
├── README.md
├── migrations/                 # Versioned migrations (17 files)
└── archive/                    # Legacy SQL (3 files)
```

## ☁️ Supabase Functions (`supabase/functions/`)

```
supabase/functions/
├── api-key-vault/
│   └── index.ts
├── join-room/
│   └── index.ts
└── llm-proxy/
    └── index.ts
```

## 🏗️ Infrastructure (`infra/aws/`)

```
infra/aws/
├── main.tf                     # Main Terraform configuration
├── variables.tf                # Variable definitions
├── outputs.tf                  # Output definitions
├── user_data.sh                # EC2 user data script
└── modules/                    # Terraform modules
    ├── vpc/                    # VPC module
    ├── ec2/                    # EC2 module
    ├── rds/                    # RDS module
    ├── redis/                  # Redis module
    ├── s3/                     # S3 module
    └── alb/                    # ALB module
```

## 📜 Scripts (`scripts/`)

```
scripts/
├── clean-production.js         # Production build cleanup
├── copy_and_rename.py          # Asset copying
├── copy_assets.sh              # Asset copying script
├── deploy.sh                   # Deployment script
├── final_copy_images.sh        # Image copying
├── keygen.ts                   # Key generation
├── setup_assets.py             # Asset setup
├── setup-assets.sh             # Asset setup script
├── supabase-setup.sh           # Supabase setup
├── verify-build.sh             # Build verification
├── dev/                        # Development scripts (8 files)
└── ops/                        # Operations scripts (3 files)
```

## 📚 Documentation (`docs/`)

```
docs/
├── README.md
├── ASSET_GENERATION_GUIDE.md
├── ASSET_OPTIMIZATION_SUMMARY.md
├── ASSET_PLACEMENT_GUIDE.md
├── SCREENS_AND_DATA_DIAGRAM.md
├── threat_model.md
├── reports/                    # Audit reports (7 files)
│   ├── DESIGN_SYSTEM_ERROR_REPORT.md
│   ├── POST_DESIGN_SYSTEM_LAUNCH_FAILURE_INVESTIGATION.md
│   └── UI_UX_AUDIT_REPORT.md
└── implementation/             # Implementation docs
```

## 🔒 Contracts (`contracts/`)

```
contracts/
├── foundry.toml                # Foundry configuration
├── foundry.lock                # Dependency lock
├── README.md
├── src/                        # Solidity source (5 files)
│   ├── Base.sol
│   ├── ContributionTracker.sol
│   ├── Counter.sol
│   ├── EquityDistributor.sol
│   └── NDA.sol
├── test/                       # Tests (2 files)
│   ├── ContributionTracker.t.sol
│   └── Counter.t.sol
├── script/                     # Scripts (1 file)
│   └── Counter.s.sol
├── lib/                        # Dependencies
│   ├── forge-std/
│   ├── openzeppelin-contracts/
│   └── openzeppelin-contracts-upgradeable/
└── out/                        # Build output
```

## 📋 Specifications (`specs/`)

```
specs/
├── api/
│   └── openapi.yaml            # OpenAPI specification
└── proto/
    └── ws_envelope.proto        # WebSocket protocol buffer
```

## 🔧 Configuration Files

- `config/prometheus.yml` - Prometheus configuration
- `config/rules.yml` - Prometheus alerting rules
- `schemas/events.json` - Event schema definitions

## 📊 Key Statistics

- **Total TypeScript/JavaScript files**: ~156 files
- **Total Swift files**: 118 files
- **Total SQL files**: 17+ migration files
- **Total Terraform files**: 4+ configuration files
- **Total documentation files**: 10+ markdown files

## 🔍 Quick Navigation

### Finding Code by Purpose

- **Authentication**: `src/routes/auth.js`, `src/services/user-authentication-service.ts`
- **Messaging**: `src/routes/message-routes.ts`, `src/services/message-service.ts`
- **Voice/Video**: `src/routes/voice-routes.ts`, `src/services/livekit-service.ts`
- **AI/LLM**: `src/services/llm-service.ts`, `src/autonomy/`, `packages/ai-mod/`
- **Database**: `sql/`, `src/config/db.js`
- **WebSocket**: `src/ws/gateway.ts`, `src/ws/handlers/`
- **Telemetry**: `src/telemetry/`, `src/services/telemetry-service.ts`
- **Infrastructure**: `infra/aws/`, `docker-compose.yml`, `Dockerfile`

### Finding Configuration

- **App Config**: `packages/core/src/config/index.ts`
- **Database Config**: `src/config/db.js`
- **Redis Config**: `src/config/redis-pubsub.ts`
- **LLM Config**: `src/config/llm-params.config.ts`
- **Terraform Config**: `infra/aws/main.tf`

## 📝 Notes

- This repository is in transition to a TurboRepo monorepo structure
- Legacy code in `src/` is being migrated to `apps/api/`
- Shared code is being extracted to `packages/`
- See `CLEANUP_SUMMARY.md` for recent refactoring details

