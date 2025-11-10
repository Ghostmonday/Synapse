# SQL Directory

Database schema and migration files.

## Structure

### Core Schema Files
- `01_sinapse_schema.sql` - Core tables (users, rooms, messages)
- `02_compressor_functions.sql` - Compression functions
- `03_retention_policy.sql` - Data retention policies
- `04_moderation_apply.sql` - Moderation functions
- `05_rls_policies.sql` - Row-level security policies
- `06_partition_management.sql` - Partition management
- `07_healing_logs.sql` - Healing logs table
- `08_enhanced_rls_policies.sql` - Enhanced RLS policies
- `09_p0_features.sql` - P0 features (threads, reactions, search)
- `init-db.sql` - Simple initialization (legacy)
- `sinapse_complete.sql` - Complete schema (all-in-one)

### `migrations/` - Migration Scripts
- `migrate-remaining-tables.sql` - Add missing tables/columns
- `migrate-subscription-support.sql` - Subscription support
- `test-supabase-schema.sql` - Schema verification tests
- `verify-supabase-schema.sql` - Schema verification

## Usage

### Initial Setup
```sql
-- Run complete schema
\i sql/sinapse_complete.sql

-- Or run individual files in order
\i sql/01_sinapse_schema.sql
\i sql/02_compressor_functions.sql
-- ... etc
```

### Migrations
```sql
-- Run migrations
\i sql/migrations/migrate-remaining-tables.sql

-- Verify schema
\i sql/migrations/test-supabase-schema.sql
```

## Migration Order

1. Core schema (`01_sinapse_schema.sql`)
2. Functions (`02-04_*.sql`)
3. Policies (`05_rls_policies.sql`, `08_enhanced_rls_policies.sql`)
4. Features (`09_p0_features.sql`)
5. Migrations (`migrations/*.sql`)

