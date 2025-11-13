# Synapse Repository Index

**Quick navigation guide for auditors and developers**

## 📖 Start Here

1. **[README.md](./README.md)** - Main project documentation, architecture overview, quick start
2. **[REPOSITORY_STRUCTURE.md](./REPOSITORY_STRUCTURE.md)** - Complete file listing and directory structure
3. **[CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md)** - Recent refactoring and cleanup summary

## 🔍 Key Documentation

### Architecture & Design
- **[README.md](./README.md)** - Architecture overview, tech stack, project structure
- **[MAP.md](./MAP.md)** - Feature → module mapping
- **[TAGS.md](./TAGS.md)** - Feature tag glossary and conventions
- **[docs/SCREENS_AND_DATA_DIAGRAM.md](./docs/SCREENS_AND_DATA_DIAGRAM.md)** - iOS app screens and data flow

### Security & Compliance
- **[docs/threat_model.md](./docs/threat_model.md)** - Security threat model
- **[docs/reports/](./docs/reports/)** - Audit reports and investigations

### Development Guides
- **[sql/README.md](./sql/README.md)** - Database schema and migrations
- **[docs/ASSET_PLACEMENT_GUIDE.md](./docs/ASSET_PLACEMENT_GUIDE.md)** - Asset management guide

## 📁 Directory Quick Links

### Code
- **[apps/](./apps/)** - Monorepo applications (API, web, mobile)
- **[packages/](./packages/)** - Shared packages (core, livekit, supabase, ai-mod)
- **[src/](./src/)** - Legacy backend code (migrating to apps/api)
- **[frontend/iOS/](./frontend/iOS/)** - iOS SwiftUI application

### Infrastructure
- **[infra/aws/](./infra/aws/)** - Terraform infrastructure as code
- **[docker-compose.yml](./docker-compose.yml)** - Docker Compose configuration
- **[Dockerfile](./Dockerfile)** - Docker image definition

### Database
- **[sql/](./sql/)** - Database migrations and schema
- **[sql/migrations/](./sql/migrations/)** - Versioned SQL migrations

### Configuration
- **[config/](./config/)** - Configuration files (Prometheus, etc.)
- **[packages/core/src/config/](./packages/core/src/config/)** - Application config (Zod-validated)

### Scripts & Tools
- **[scripts/](./scripts/)** - Operational scripts
- **[scripts/dev/](./scripts/dev/)** - Development utilities
- **[scripts/ops/](./scripts/ops/)** - Production operations

### API & Specs
- **[specs/api/openapi.yaml](./specs/api/openapi.yaml)** - OpenAPI specification
- **[specs/proto/](./specs/proto/)** - Protocol buffer definitions

## 🎯 Common Audit Tasks

### Finding Authentication Code
- Routes: `src/routes/auth.js`, `src/routes/user-authentication-routes.ts`
- Services: `src/services/user-authentication-service.ts`
- Middleware: `src/server/middleware/auth.ts`

### Finding API Endpoints
- All routes: `src/routes/` (32 files)
- Route registration: `src/server/index.ts`
- API spec: `specs/api/openapi.yaml`

### Finding Database Schema
- Schema files: `sql/01_sinapse_schema.sql` through `sql/17_ux_telemetry_schema.sql`
- Migrations: `sql/migrations/` (17 files)
- Database config: `src/config/db.js`

### Finding Security Code
- Threat model: `docs/threat_model.md`
- Middleware: `src/middleware/` (rate limiting, validation, moderation)
- Encryption: `src/services/e2e-encryption.ts`
- API keys: `src/services/api-keys-service.ts`

### Finding AI/LLM Code
- LLM service: `src/services/llm-service.ts`
- AI handlers: `src/services/ai-handlers/`
- Autonomy: `src/autonomy/`
- AI module: `packages/ai-mod/`

### Finding Frontend Code
- iOS app: `frontend/iOS/`
- Views: `frontend/iOS/Views/`
- Components: `frontend/iOS/Views/Shared/Components/`

## 📊 Repository Statistics

- **Total files**: ~500+ source files
- **TypeScript/JavaScript**: ~156 files
- **Swift**: 118 files
- **SQL migrations**: 17+ files
- **Documentation**: 10+ markdown files

## 🔗 External Resources

- **GitHub Repository**: https://github.com/Ghostmonday/Synapse
- **Dev Branch**: https://github.com/Ghostmonday/Synapse/tree/dev
- **CI/CD**: `.github/workflows/ci.yml`

## 📝 Recent Changes

See **[CLEANUP_SUMMARY.md](./CLEANUP_SUMMARY.md)** for:
- Monorepo restructure (TurboRepo)
- Dead code removal (20+ files)
- Config consolidation
- CI/CD setup
- Validation schemas

---

**Last Updated**: 2025-01-27  
**Branch**: `dev`  
**Status**: Active development, migrating to monorepo structure

