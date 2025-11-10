# Supabase Database Setup Guide

This guide will help you set up the Sinapse database schema in Supabase.

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Supabase CLI**: Install via npm:
   ```bash
   npm install -g supabase
   ```
3. **Supabase Project**: Create a new project in the Supabase dashboard

## Quick Setup (Automated)

Run the automated setup script:

```bash
chmod +x scripts/supabase-setup.sh
./scripts/supabase-setup.sh
```

## Manual Setup

### Step 1: Install Supabase CLI

```bash
npm install -g supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link Your Project

Get your project reference ID from the Supabase dashboard (Settings → General → Reference ID), then:

```bash
supabase link --project-ref YOUR_PROJECT_REF
```

### Step 4: Run Migrations

Run migrations in order:

```bash
# Core schema
supabase db push --file sql/01_sinapse_schema.sql

# Compression functions
supabase db push --file sql/02_compressor_functions.sql

# Retention policies
supabase db push --file sql/03_retention_policy.sql

# Moderation
supabase db push --file sql/04_moderation_apply.sql

# RLS policies
supabase db push --file sql/05_rls_policies.sql

# Partition management
supabase db push --file sql/06_partition_management.sql

# Healing logs
supabase db push --file sql/07_healing_logs.sql

# Enhanced RLS
supabase db push --file sql/08_enhanced_rls_policies.sql

# P0 features (threads, reactions, search)
supabase db push --file sql/09_p0_features.sql

# Integrated features (assistants, bots, subscriptions, embeddings, metrics)
supabase db push --file sql/10_integrated_features.sql
```

### Step 5: Enable Extensions

Some features require PostgreSQL extensions. Enable them in Supabase dashboard:

1. Go to **Database** → **Extensions**
2. Enable:
   - `pgcrypto` (for UUID generation and encryption)
   - `pg_stat_statements` (for query statistics)
   - `vector` (for semantic search - pgvector)

**Note**: pgvector may need to be enabled via SQL:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

### Step 6: Verify Schema

Run the verification script:

```bash
supabase db push --file sql/migrations/verify-supabase-schema.sql
```

## Required Environment Variables

Add these to your `.env` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Redis
REDIS_URL=redis://localhost:6379

# LiveKit
LIVEKIT_HOST=your-livekit-host
LIVEKIT_API_KEY=your-api-key
LIVEKIT_API_SECRET=your-api-secret

# OpenAI (for embeddings and LLM)
OPENAI_KEY=your-openai-api-key

# Anthropic (optional, for Claude)
ANTHROPIC_KEY=your-anthropic-api-key

# Web Push (for notifications)
VAPID_SUBJECT=mailto:your-email@example.com
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# JWT Secret
JWT_SECRET=your-jwt-secret-key

# Moderation
BLOCKED_WORDS=word1,word2,word3
```

## Database Tables Created

### Core Tables
- `users` - User profiles
- `rooms` - Chat rooms
- `room_memberships` - Room membership and roles
- `messages` - Message records
- `message_receipts` - Delivery/read receipts
- `audit_log` - Audit trail

### Feature Tables
- `threads` - Message threads
- `edit_history` - Message edit history
- `assistants` - AI assistants
- `bots` - Bot registrations
- `bot_endpoints` - Bot webhook endpoints
- `subscriptions` - Push notification subscriptions
- `embeddings` - Vector embeddings for search
- `metrics` - Analytics metrics
- `presence_logs` - User presence tracking

## Row Level Security (RLS)

RLS policies are defined in `sql/05_rls_policies.sql` and `sql/08_enhanced_rls_policies.sql`.

**Important**: Review and adjust RLS policies based on your security requirements.

## Testing the Setup

1. **Test Database Connection**:
   ```bash
   npm run dev
   # Check logs for database connection status
   ```

2. **Test API Endpoints**:
   ```bash
   # Health check
   curl http://localhost:3000/healthz

   # Test authentication
   curl -X POST http://localhost:3000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"username":"test","password":"test"}'
   ```

3. **Verify Tables**:
   ```sql
   -- Run in Supabase SQL Editor
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   ORDER BY table_name;
   ```

## Troubleshooting

### pgvector Extension Not Found

If you get an error about the `vector` extension:

1. Check if pgvector is available in your Supabase plan
2. Enable it via SQL:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. If still not available, contact Supabase support or use a different vector solution

### Migration Errors

If a migration fails:

1. Check the error message in Supabase dashboard → Database → Logs
2. Some migrations may need to be run in the Supabase SQL Editor directly
3. Check for dependency issues (migrations must run in order)

### RLS Policy Issues

If you're getting permission errors:

1. Verify RLS is enabled: `SELECT * FROM pg_policies;`
2. Check your service role key is set correctly
3. Review RLS policies in `sql/05_rls_policies.sql`

## Next Steps

1. **Set up Redis**: Install and configure Redis for caching and pub/sub
2. **Configure LiveKit**: Set up LiveKit for voice/video features
3. **Set up Monitoring**: Configure Prometheus metrics endpoint
4. **Review Security**: Audit RLS policies and API security

## Support

For issues or questions:
- Check the [Supabase Documentation](https://supabase.com/docs)
- Review migration files in `sql/` directory
- Check logs in Supabase dashboard

