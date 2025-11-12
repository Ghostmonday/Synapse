# SQL Database Setup

This directory contains all SQL scripts for setting up and maintaining the Sinapse database.

## Directory Structure

- **`migrations/`** - Versioned migration files (run in order)
- **`01_sinapse_schema.sql`** through **`17_ux_telemetry_schema.sql`** - Modular schema files
- **`QUICK_VALIDATION.sql`** - Quick validation queries
- **`archive/legacy/`** - Deprecated setup files (kept for reference)

## Setup Instructions

### For New Databases

Run migrations in chronological order:

```bash
# Run all migrations in order
psql $DATABASE_URL -f migrations/2025-01-27-complete-setup.sql
psql $DATABASE_URL -f migrations/2025-11-12-subscriptions-usage.sql
# ... continue with other migrations
```

### For Existing Databases

1. Check which migrations have already been applied
2. Run only the new migrations in order
3. Use `QUICK_VALIDATION.sql` to verify setup

## Migration Files

- **`2025-01-27-*`** - Initial setup and API keys vault
- **`2025-11-*`** - Feature enhancements and monetization
- **`migrate-*`** - Legacy migration helpers

## Schema Files

The numbered schema files (`01_*` through `17_*`) represent modular components:
- `01_sinapse_schema.sql` - Core tables
- `02_compressor_functions.sql` - Compression utilities
- `03_retention_policy.sql` - Data retention
- `04_moderation_apply.sql` - Moderation system
- `05_rls_policies.sql` - Row Level Security
- `06_partition_management.sql` - Partitioning
- `07_healing_logs.sql` - Healing system
- `08_enhanced_rls_policies.sql` - Enhanced security
- `09_p0_features.sql` - P0 features
- `10_integrated_features.sql` - Integrated features
- `11_indexing_and_rls.sql` - Indexing
- `12_telemetry_triggers.sql` - Telemetry
- `13_create_missing_ai_views.sql` - AI views
- `16_ai_audit_triggers.sql` - AI auditing
- `17_ux_telemetry_schema.sql` - UX telemetry

## Notes

- All migrations use `IF NOT EXISTS` where possible for idempotency
- Always backup before running migrations
- Test migrations in a staging environment first

