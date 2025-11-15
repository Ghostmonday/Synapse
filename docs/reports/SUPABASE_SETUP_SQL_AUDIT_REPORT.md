# Supabase Setup SQL Audit Report

**File Audited:** `supabase-setup.sql`  
**Date:** 2025-01-28  
**Auditor:** Automated SQL Audit  
**Status:** ⚠️ **REQUIRES ATTENTION**

---

## Executive Summary

The `supabase-setup.sql` file is a consolidated setup script intended for quick Supabase initialization. While it provides basic functionality, it contains **significant security vulnerabilities**, **schema inconsistencies**, and **missing critical features** compared to the production schema defined in `sql/01_sinapse_schema.sql` and related migration files.

### Critical Issues: 7
### High Priority Issues: 12
### Medium Priority Issues: 8
### Low Priority Issues: 5

---

## 1. CRITICAL SECURITY VULNERABILITIES

### 1.1 ⚠️ **CRITICAL: Hardcoded Encryption Key**
**Location:** Lines 207-215  
**Severity:** CRITICAL

```207:215:supabase-setup.sql
CREATE OR REPLACE FUNCTION get_encryption_key()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.encryption_key', true);
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'sinapse-api-keys-master-key-CHANGE-THIS-IN-PRODUCTION';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Issue:** Falls back to a hardcoded encryption key if the configuration is missing. This is a **critical security vulnerability** that could expose all encrypted API keys.

**Recommendation:**
- Remove the fallback entirely
- Raise an exception if the key is not configured
- Document that `app.encryption_key` must be set before using API key functions

### 1.2 ⚠️ **CRITICAL: Insufficient RLS Policies**
**Location:** Lines 284-340  
**Severity:** CRITICAL

**Missing RLS Policies:**
- `room_members` - No RLS policies defined (RLS enabled but no policies)
- `room_memberships` - No RLS policies defined
- `reactions` - No RLS enabled
- `threads` - No RLS enabled
- `files` - No RLS enabled
- `ux_telemetry` - No RLS enabled
- `presence_logs` - No RLS enabled
- `pinned_items` - No RLS enabled
- `nicknames` - No RLS enabled
- `config` - No RLS enabled
- `subscriptions` - RLS enabled but no policies defined

**Impact:** Unauthorized access to sensitive data, potential data leaks.

**Recommendation:** Implement comprehensive RLS policies for all tables, following the pattern in `sql/05_rls_policies.sql`.

### 1.3 ⚠️ **CRITICAL: Overly Permissive Message Policies**
**Location:** Lines 311-327  
**Severity:** CRITICAL

```311:327:supabase-setup.sql
DROP POLICY IF EXISTS "Room members can read messages" ON messages;
CREATE POLICY "Room members can read messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM rooms 
      WHERE rooms.id = messages.room_id 
      AND (rooms.is_public = true OR EXISTS (
        SELECT 1 FROM room_members 
        WHERE room_members.room_id = rooms.id 
        AND room_members.user_id = auth.uid()
      ))
    )
  );

DROP POLICY IF EXISTS "Users can create messages" ON messages;
CREATE POLICY "Users can create messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**Issues:**
1. Policy checks `room_members` table but schema also has `room_memberships` (duplicate/conflicting tables)
2. No UPDATE or DELETE policies - users could potentially modify/delete any message
3. No validation that user is actually a member before inserting

**Recommendation:**
- Consolidate `room_members` and `room_memberships` into a single table
- Add UPDATE/DELETE policies with proper authorization checks
- Verify membership before allowing message creation

### 1.4 ⚠️ **CRITICAL: Function Security Issues**
**Location:** Lines 207-282, 329-334  
**Severity:** CRITICAL

**Issues:**
1. `get_encryption_key()` uses `SECURITY DEFINER` but has weak fallback
2. `store_api_key()` and `get_api_key()` use `SECURITY DEFINER` without proper role checks
3. `current_uid()` uses `SECURITY DEFINER` unnecessarily - should use `STABLE` instead

**Recommendation:**
- Add role checks to API key functions (require `service_role`)
- Remove `SECURITY DEFINER` from `current_uid()` and use `STABLE` function
- Add input validation to prevent SQL injection

### 1.5 ⚠️ **CRITICAL: Missing Authentication Context**
**Location:** Throughout RLS policies  
**Severity:** CRITICAL

**Issue:** Policies use `auth.uid()` but there's no verification that:
- Supabase Auth is properly configured
- JWT tokens are validated
- Anonymous access is properly restricted

**Recommendation:**
- Add explicit checks for authenticated users
- Document Supabase Auth setup requirements
- Add validation queries to verify auth context

---

## 2. SCHEMA INCONSISTENCIES

### 2.1 ⚠️ **HIGH: Duplicate Table Definitions**
**Location:** Lines 37-53  
**Severity:** HIGH

```37:53:supabase-setup.sql
CREATE TABLE IF NOT EXISTS room_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);

CREATE TABLE IF NOT EXISTS room_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(room_id, user_id)
);
```

**Issue:** Two nearly identical tables exist. Production schema (`sql/01_sinapse_schema.sql`) only uses `room_memberships` with additional fields (strike_count, probation_until, etc.).

**Recommendation:**
- Remove `room_members` table
- Use only `room_memberships` with full feature set
- Update all references throughout the file

### 2.2 ⚠️ **HIGH: Schema Mismatch with Production**
**Location:** Multiple tables  
**Severity:** HIGH

**Major Differences:**

| Table | Production Schema | Setup File | Impact |
|-------|------------------|------------|--------|
| `users` | Has `federation_id` | Missing | Federation features won't work |
| `rooms` | Has `slug`, `created_by`, `partition_month`, retention fields | Has `name`, `creator_id`, `owner_id`, `ai_moderation`, `room_tier`, `expires_at` | Schema mismatch |
| `messages` | Has `payload_ref`, `content_preview`, `content_hash`, `audit_hash_chain`, `partition_month` | Has `content`, `thread_id`, `is_pinned` | Completely different structure |
| `telemetry` | Has `event`, `risk`, `action`, `features`, `latency_ms`, `precision_recall` | Has `event_type`, `payload` | Different structure |

**Impact:** This setup file creates a **different database schema** than production, making it incompatible with the application code.

**Recommendation:**
- Align schema with `sql/01_sinapse_schema.sql`
- Or clearly document this as a "simplified" schema for testing only

### 2.3 ⚠️ **HIGH: Missing Critical Tables**
**Location:** Throughout  
**Severity:** HIGH

**Missing Tables from Production Schema:**
- `audit_log` - Critical for compliance and security
- `logs_raw` - Required for message ingestion
- `logs_compressed` - Required for storage optimization
- `service.encode_queue` - Required for compression pipeline
- `service.moderation_queue` - Required for moderation pipeline
- `retention_schedule` - Required for data lifecycle management
- `legal_holds` - Required for compliance
- `system_config` - Required for configuration management
- `bots` - Referenced in production code
- `assistants` - Referenced in production code
- `embeddings` - Required for search functionality

**Impact:** Application features will fail if they depend on these tables.

### 2.4 ⚠️ **MEDIUM: Missing Constraints**
**Location:** Multiple tables  
**Severity:** MEDIUM

**Missing Constraints:**
- `users.username` - No CHECK constraint for format validation
- `rooms.name` vs `rooms.slug` - Unclear which is the canonical identifier
- `messages.content` - No length limit (could cause performance issues)
- `subscriptions.tier` - No CHECK constraint for valid values
- `subscriptions.status` - No CHECK constraint for valid values
- `room_members.role` - No CHECK constraint for valid roles

**Recommendation:**
- Add CHECK constraints for enum-like fields
- Add length limits for TEXT fields
- Clarify naming conventions

---

## 3. INDEXING ISSUES

### 3.1 ⚠️ **HIGH: Missing Composite Indexes**
**Location:** Lines 188-205  
**Severity:** HIGH

**Missing Critical Indexes:**
- `messages(room_id, created_at DESC)` - Critical for message pagination
- `messages(user_id, created_at DESC)` - For user message history
- `room_memberships(room_id, user_id)` - Already covered by UNIQUE, but missing (room_id, role) for role queries
- `reactions(message_id, user_id)` - Already covered by UNIQUE, but missing (message_id, emoji) for emoji counts
- `telemetry(event_type, event_time DESC)` - For event queries
- `presence_logs(user_id, created_at DESC)` - For presence history

**Impact:** Poor query performance, especially for pagination and filtering.

### 3.2 ⚠️ **MEDIUM: Missing Partial Indexes**
**Location:** Throughout  
**Severity:** MEDIUM

**Missing Partial Indexes:**
- `messages(room_id, created_at) WHERE is_pinned = true` - For pinned messages
- `rooms(id) WHERE is_public = true` - For public room queries
- `subscriptions(user_id) WHERE status = 'active'` - For active subscription lookups
- `api_keys(key_name) WHERE is_active = true AND environment = 'production'` - Already exists, but could add more

**Impact:** Unnecessary index overhead for common filtered queries.

### 3.3 ⚠️ **LOW: Redundant Indexes**
**Location:** Lines 192-194  
**Severity:** LOW

```192:194:supabase-setup.sql
CREATE INDEX IF NOT EXISTS idx_messages_room ON messages(room_id);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
```

**Issue:** Three separate indexes instead of composite indexes. A composite `(room_id, created_at DESC)` would be more efficient.

**Recommendation:** Replace with composite indexes where queries filter by multiple columns.

---

## 4. FUNCTION ISSUES

### 4.1 ⚠️ **HIGH: API Key Functions Missing Error Handling**
**Location:** Lines 217-282  
**Severity:** HIGH

**Issues:**
1. `store_api_key()` doesn't validate input parameters
2. `get_api_key()` raises generic exceptions without context
3. No transaction handling for atomic operations
4. No logging of API key access (security audit trail)

**Recommendation:**
- Add input validation (non-empty strings, valid categories)
- Add detailed error messages
- Add audit logging for key access
- Use transactions for consistency

### 4.2 ⚠️ **MEDIUM: current_uid() Implementation**
**Location:** Lines 329-334  
**Severity:** MEDIUM

```329:334:supabase-setup.sql
CREATE OR REPLACE FUNCTION current_uid()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Issues:**
1. Uses `SECURITY DEFINER` unnecessarily (should be `STABLE`)
2. Doesn't handle NULL case (when user is not authenticated)
3. Production version uses SQL function with JWT parsing

**Recommendation:**
```sql
CREATE OR REPLACE FUNCTION current_uid()
RETURNS UUID AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'sub')::UUID;
$$ LANGUAGE SQL STABLE;
```

---

## 5. DATA INTEGRITY ISSUES

### 5.1 ⚠️ **HIGH: Missing Foreign Key Constraints**
**Location:** Multiple tables  
**Severity:** HIGH

**Missing Foreign Keys:**
- `threads.root_message_id` - References `messages(id)` but no FK constraint
- `pinned_items.message_id` - References `messages(id)` but no FK constraint
- `pinned_items.pinned_by` - References `users(id)` but no FK constraint
- `nicknames.user_id` and `nicknames.room_id` - References exist but could be more explicit

**Impact:** Data integrity violations, orphaned records.

### 5.2 ⚠️ **MEDIUM: Missing NOT NULL Constraints**
**Location:** Multiple tables  
**Severity:** MEDIUM

**Missing NOT NULL:**
- `rooms.name` - Should be required
- `messages.content` - Already NOT NULL ✓
- `reactions.emoji` - Already NOT NULL ✓
- `subscriptions.tier` - Already NOT NULL ✓
- `subscriptions.status` - Already NOT NULL ✓

**Recommendation:** Review all fields for appropriate NOT NULL constraints.

### 5.3 ⚠️ **MEDIUM: Inconsistent Timestamp Handling**
**Location:** Multiple tables  
**Severity:** MEDIUM

**Issues:**
- Some tables use `created_at`, others don't
- `messages` has both `created_at` and `updated_at`, but `updated_at` is nullable
- No triggers to automatically update `updated_at`

**Recommendation:**
- Standardize timestamp fields across all tables
- Add triggers for `updated_at` where needed
- Consider using `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

---

## 6. PERFORMANCE CONCERNS

### 6.1 ⚠️ **MEDIUM: Missing Partitioning**
**Location:** Tables with time-series data  
**Severity:** MEDIUM

**Tables That Should Be Partitioned:**
- `messages` - High volume, time-series data
- `telemetry` - High volume, time-series data
- `ux_telemetry` - High volume, time-series data
- `presence_logs` - High volume, time-series data

**Impact:** Table bloat, slow queries, expensive maintenance.

**Recommendation:** Implement table partitioning by month/year as in production schema.

### 6.2 ⚠️ **LOW: JSONB Indexing**
**Location:** Tables with JSONB columns  
**Severity:** LOW

**Missing JSONB Indexes:**
- `users.metadata` - No GIN index for JSONB queries
- `users.policy_flags` - No GIN index
- `rooms.metadata` - No GIN index
- `messages.metadata` - No GIN index
- `telemetry.payload` - No GIN index
- `ux_telemetry.event_data` - No GIN index
- `ux_telemetry.performance_data` - No GIN index

**Impact:** Slow JSONB queries if applications filter/search JSONB fields.

**Recommendation:** Add GIN indexes for frequently queried JSONB columns.

---

## 7. BEST PRACTICES VIOLATIONS

### 7.1 ⚠️ **MEDIUM: No Transaction Wrapping**
**Location:** Entire file  
**Severity:** MEDIUM

**Issue:** The entire setup script is not wrapped in a transaction. If any step fails, the database could be left in an inconsistent state.

**Recommendation:**
```sql
BEGIN;
-- All setup statements
COMMIT;
```

### 7.2 ⚠️ **MEDIUM: No Rollback Strategy**
**Location:** Entire file  
**Severity:** MEDIUM

**Issue:** No way to cleanly rollback if setup fails partway through.

**Recommendation:** Add a cleanup/rollback script or use transactions.

### 7.3 ⚠️ **LOW: Inconsistent Naming Conventions**
**Location:** Throughout  
**Severity:** LOW

**Issues:**
- Mix of snake_case and camelCase in some places
- Policy names use quotes (e.g., `"Users can read own data"`) vs unquoted
- Function names inconsistent (some use underscores, some don't)

**Recommendation:** Standardize naming conventions.

### 7.4 ⚠️ **LOW: Missing Comments**
**Location:** Throughout  
**Severity:** LOW

**Issue:** Most tables and functions lack documentation comments explaining their purpose and usage.

**Recommendation:** Add COMMENT statements for tables, columns, and functions.

---

## 8. VALIDATION QUERIES ISSUES

### 8.1 ⚠️ **MEDIUM: Incomplete Validation**
**Location:** Lines 341-424  
**Severity:** MEDIUM

**Missing Validations:**
- No check for RLS policy completeness
- No check for missing indexes
- No check for foreign key constraints
- No check for function security settings
- No check for encryption key configuration

**Recommendation:** Expand validation queries to cover all critical aspects.

### 8.2 ⚠️ **LOW: Test User Cleanup**
**Location:** Lines 401-416  
**Severity:** LOW

**Issue:** Test user creation/deletion in validation could fail silently if there are constraint violations.

**Recommendation:** Add more robust error handling and reporting.

---

## 9. COMPATIBILITY ISSUES

### 9.1 ⚠️ **HIGH: Supabase-Specific Functions**
**Location:** Throughout  
**Severity:** HIGH

**Issues:**
- Uses `auth.uid()` which is Supabase-specific
- Uses `gen_random_uuid()` which requires `pgcrypto` extension
- Uses `uuid_generate_v4()` in one place (line 175) but `gen_random_uuid()` elsewhere

**Impact:** May not work on standard PostgreSQL without Supabase Auth.

**Recommendation:**
- Document Supabase-specific requirements
- Standardize UUID generation (use `gen_random_uuid()` consistently)
- Provide alternative for non-Supabase deployments

---

## 10. RECOMMENDATIONS SUMMARY

### Immediate Actions (Critical)
1. ✅ **Fix hardcoded encryption key fallback** - Remove or raise exception
2. ✅ **Add comprehensive RLS policies** - All tables need proper policies
3. ✅ **Consolidate room_members/room_memberships** - Remove duplicate table
4. ✅ **Fix message RLS policies** - Add UPDATE/DELETE restrictions
5. ✅ **Add missing foreign key constraints** - Ensure data integrity
6. ✅ **Align schema with production** - Or document as "simplified" version
7. ✅ **Add missing critical tables** - Or document limitations

### High Priority
1. Add composite indexes for common query patterns
2. Add input validation to API key functions
3. Add audit logging for API key access
4. Fix `current_uid()` implementation
5. Add missing foreign key constraints
6. Document Supabase-specific requirements

### Medium Priority
1. Add CHECK constraints for enum-like fields
2. Add GIN indexes for JSONB columns
3. Implement table partitioning for time-series tables
4. Wrap setup in transaction
5. Expand validation queries
6. Add table/function comments

### Low Priority
1. Standardize naming conventions
2. Add partial indexes for filtered queries
3. Consolidate redundant indexes
4. Improve test user cleanup in validation

---

## 11. COMPARISON WITH PRODUCTION SCHEMA

### Key Differences

| Aspect | Production (`sql/01_sinapse_schema.sql`) | Setup File | Impact |
|--------|------------------------------------------|------------|--------|
| **Schema Complexity** | Full-featured with partitioning, compression, moderation | Simplified, basic tables | High - Missing features |
| **Security** | Comprehensive RLS policies | Minimal RLS policies | Critical - Security gaps |
| **Data Model** | Optimized for scale (payload_ref, compression) | Traditional (content in messages) | High - Performance issues at scale |
| **Compliance** | Audit logs, legal holds, retention policies | Missing | High - Compliance risk |
| **Moderation** | Queue-based, async processing | Basic flag | Medium - Limited moderation |

### Recommendation

**Option 1:** Update `supabase-setup.sql` to match production schema  
**Option 2:** Rename to `supabase-setup-simplified.sql` and document limitations  
**Option 3:** Create a migration path from simplified to production schema

---

## 12. CONCLUSION

The `supabase-setup.sql` file serves as a quick-start script but **should not be used in production** without significant modifications. It contains:

- ⚠️ **7 Critical security vulnerabilities**
- ⚠️ **12 High-priority issues** requiring immediate attention
- ⚠️ **Significant schema mismatches** with production code

**Recommended Path Forward:**
1. Use production schema files (`sql/01_sinapse_schema.sql` + migrations) for production
2. Keep `supabase-setup.sql` as a simplified test/dev schema with clear documentation
3. Or refactor `supabase-setup.sql` to align with production schema

**Risk Level:** 🔴 **HIGH** - Do not deploy to production without addressing critical issues.

---

**Report Generated:** 2025-01-28  
**Next Review:** After addressing critical issues

