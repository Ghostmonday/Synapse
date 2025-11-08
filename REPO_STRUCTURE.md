# Repository Structure

## 📁 Directory Organization

```
Sinapse/
├── config/              # Configuration files
│   ├── prometheus.yml   # Prometheus config
│   └── rules.yml        # Alerting rules
│
├── docs/                # Documentation
│   ├── FEATURE_STATUS_REPORT.md
│   └── QUICK_START_IMPLEMENTATION.md
│
├── frontend/            # Frontend code
│   └── iOS/             # iOS app
│
├── scripts/             # Organized scripts
│   ├── dev/             # Development scripts
│   │   ├── seed.sh
│   │   ├── setup.sh
│   │   ├── test-endpoints.sh
│   │   ├── validate-openapi.ts
│   │   └── check-supabase-readiness.sh
│   │
│   └── ops/             # Operations scripts
│       ├── entrypoint.sh
│       ├── repair_high_cpu.sh
│       └── repair_high_latency.sh
│
├── sql/                 # Database files
│   ├── migrations/      # Migration scripts
│   │   ├── migrate-remaining-tables.sql
│   │   ├── migrate-subscription-support.sql
│   │   ├── test-supabase-schema.sql
│   │   └── verify-supabase-schema.sql
│   │
│   ├── 01_sinapse_schema.sql
│   ├── 02_compressor_functions.sql
│   ├── 03_retention_policy.sql
│   ├── 04_moderation_apply.sql
│   ├── 05_rls_policies.sql
│   ├── 06_partition_management.sql
│   ├── 07_healing_logs.sql
│   ├── 08_enhanced_rls_policies.sql
│   ├── 09_p0_features.sql
│   ├── init-db.sql
│   └── sinapse_complete.sql
│
├── src/                 # Source code
│   ├── api/             # API types
│   ├── autonomy/        # Autonomy system
│   ├── config/          # Configuration
│   ├── middleware/      # Express middleware
│   ├── routes/          # API routes
│   ├── services/        # Business logic
│   ├── shared/          # Shared utilities
│   ├── types/           # TypeScript types
│   └── ws/              # WebSocket handlers
│
├── specs/               # Specifications
│   ├── api/             # OpenAPI specs
│   └── proto/           # Protobuf specs
│
├── .github/             # GitHub workflows
├── dist/                # Compiled output
├── logs/                # Log files (gitignored)
├── node_modules/        # Dependencies (gitignored)
│
├── Dockerfile           # Docker configuration
├── docker-compose.yml   # Docker Compose config
├── index.ts            # Entry point
├── package.json        # Node.js dependencies
├── README.md           # Main documentation
└── tsconfig.json       # TypeScript config
```

## 🗂️ Key Directories

### `scripts/`
- **`dev/`** - Development and testing scripts
- **`ops/`** - Production operations and maintenance scripts

### `sql/`
- **Root** - Core schema files (numbered for execution order)
- **`migrations/`** - Migration scripts for schema updates

### `config/`
- Service configuration files (Prometheus, etc.)

### `src/`
- Main application source code
- Organized by feature/concern

## 📝 Notes

- `Sinapse_Heavy_Patch_v2/` - Archived (gitignored)
- `logs/` - Runtime logs (gitignored)
- `dist/` - Build output (gitignored)

