# API Keys Vault System Guide

## Overview

The API Keys Vault system stores all API keys and secrets securely in the database using encryption at rest. This eliminates the need for hardcoded environment variables and provides centralized key management.

## Features

- ✅ **Encryption at Rest**: All keys encrypted using pgcrypto
- ✅ **Environment Separation**: Dev/staging/production keys
- ✅ **Access Control**: RLS policies restrict access to service_role only
- ✅ **Audit Trail**: Tracks access count and last accessed time
- ✅ **Caching**: Client-side caching reduces database calls
- ✅ **Easy Retrieval**: Simple functions to get keys by name or category

## Setup

### 1. Run the Migration

```sql
-- Run in Supabase SQL Editor
\i sql/migrations/2025-01-27-api-keys-vault.sql
```

### 2. Set Master Encryption Key

**Option A: Use Supabase Vault (Recommended)**

```sql
-- Store master key in Supabase Vault
-- Via Supabase Dashboard → Vault → Add Secret
-- Name: api_keys_master_key
-- Value: [32-byte hex-encoded key]
```

**Option B: Database Setting**

```sql
-- Generate a 32-byte key
SELECT encode(gen_random_bytes(32), 'hex');
-- Copy the output, then:

ALTER DATABASE postgres SET app.encryption_key = 'your-hex-encoded-key-here';
```

### 3. Populate Your Keys

Edit `sql/migrations/2025-01-27-populate-api-keys.sql` with your actual keys, then run:

```sql
\i sql/migrations/2025-01-27-populate-api-keys.sql
```

Or use the functions directly:

```sql
-- Store a key
SELECT store_api_key(
    'APPLE_TEAM_ID',           -- key name
    'apple',                   -- category
    'ABC123DEF456',            -- actual value
    'Apple Team ID',           -- description
    'production'               -- environment
);
```

## Usage in Code

### Basic Usage

```typescript
import { getApiKey, getAppleKeys, getLiveKitKeys } from './services/api-keys-service.js';

// Get a single key
const jwtSecret = await getApiKey('JWT_SECRET');

// Get all Apple keys
const appleKeys = await getAppleKeys();
console.log(appleKeys.teamId);
console.log(appleKeys.privateKey);

// Get all LiveKit keys
const livekitKeys = await getLiveKitKeys();
console.log(livekitKeys.apiKey);
```

### Replace Environment Variables

**Before:**
```typescript
const apiKey = process.env.APPLE_TEAM_ID;
```

**After:**
```typescript
import { getApiKey } from './services/api-keys-service.js';
const apiKey = await getApiKey('APPLE_TEAM_ID');
```

### Example: Update Apple Authentication Service

```typescript
import { getAppleKeys } from '../services/api-keys-service.js';

export async function verifyAppleSignInToken(token: string) {
  // Get keys from vault instead of process.env
  const appleKeys = await getAppleKeys();
  
  // Use appleKeys.teamId, appleKeys.keyId, appleKeys.privateKey
  // ... rest of implementation
}
```

## Available Functions

### Database Functions

```sql
-- Store/update a key
SELECT store_api_key(
    'KEY_NAME', 'category', 'value', 'description', 'production'
);

-- Retrieve a key
SELECT get_api_key('APPLE_TEAM_ID', 'production');

-- Get all keys in a category
SELECT * FROM get_api_keys_by_category('apple', 'production');

-- List all keys (metadata only)
SELECT * FROM list_api_keys('production');

-- Deactivate a key
SELECT deactivate_api_key('OLD_KEY', 'production');
```

### TypeScript Service Functions

```typescript
// Single key
getApiKey(keyName: string, environment?: string): Promise<string>

// By category
getApiKeysByCategory(category: string, environment?: string): Promise<Record<string, string>>

// Convenience functions
getAppleKeys(): Promise<{ teamId, serviceId, keyId, privateKey, clientId }>
getLiveKitKeys(): Promise<{ apiKey, apiSecret, url, host }>
getSupabaseKeys(): Promise<{ url, serviceRoleKey }>
getJwtSecret(): Promise<string>
getDeepSeekKey(): Promise<string>
getGrokKey(): Promise<string>
getOpenAIKey(): Promise<string>
getAwsKeys(): Promise<{ accessKeyId, secretAccessKey, bucket, region }>

// Cache management
clearKeyCache(): void
initializeApiKeys(): Promise<void>
```

## Key Categories

- `apple` - Apple Sign-In keys
- `supabase` - Supabase configuration
- `livekit` - LiveKit video/audio
- `auth` - JWT secrets
- `ai` - AI/LLM API keys (DeepSeek, Grok, OpenAI, Anthropic)
- `aws` - AWS S3 credentials
- `redis` - Redis configuration
- `notifications` - VAPID keys for push notifications
- `app` - Application configuration

## Security Best Practices

1. **Master Key Storage**
   - Store master encryption key in Supabase Vault (not in code)
   - Rotate master key periodically
   - Never commit master key to git

2. **Access Control**
   - Only service_role can access keys (RLS enforced)
   - Never expose `get_api_key()` to client-side code
   - Use only in backend/server-side functions

3. **Key Rotation**
   - Rotate keys periodically
   - Deactivate old keys before removing
   - Update keys via `store_api_key()` function

4. **Monitoring**
   - Check `access_count` and `last_accessed_at` regularly
   - Monitor for unusual access patterns
   - Review `api_keys_metadata` view

5. **Environment Separation**
   - Use different keys for dev/staging/production
   - Never mix environments
   - Test key retrieval in each environment

## Migration from Environment Variables

### Step 1: Populate Database

Run the populate script with your actual keys.

### Step 2: Update Code

Replace `process.env.KEY_NAME` with `await getApiKey('KEY_NAME')`.

### Step 3: Test

Verify all functionality works with database keys.

### Step 4: Remove .env Keys (Optional)

Once verified, you can remove keys from `.env` (keep only database connection keys).

## Troubleshooting

### "API key not found" Error

1. Check key exists: `SELECT * FROM api_keys WHERE key_name = 'KEY_NAME';`
2. Verify environment matches
3. Check `is_active = true`

### "Encryption key not found" Error

1. Set master key in Supabase Vault or database setting
2. Verify `get_encryption_key()` function works

### Performance Issues

- Keys are cached for 5 minutes
- Use `getApiKeysByCategory()` for multiple keys
- Pre-load keys with `initializeApiKeys()`

## Example: Complete Migration

```typescript
// Before
import jwt from 'jsonwebtoken';
const token = jwt.sign(payload, process.env.JWT_SECRET!);

// After
import jwt from 'jsonwebtoken';
import { getJwtSecret } from './services/api-keys-service.js';
const jwtSecret = await getJwtSecret();
const token = jwt.sign(payload, jwtSecret);
```

## Next Steps

1. ✅ Run migration SQL
2. ✅ Set master encryption key
3. ✅ Populate keys with actual values
4. ✅ Update code to use `api-keys-service.ts`
5. ✅ Test all functionality
6. ✅ Remove keys from `.env` (optional)

---

**Status**: Ready for use ✅

