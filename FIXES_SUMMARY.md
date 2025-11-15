# 5 Critical SQL Errors - Fix Summary

Based on 4 audit reports, here are the 5 SQL execution errors that need fixing:

## Error 1: Line 339 - auth.role() doesn't exist
**Current (WRONG):**
```sql
CREATE POLICY "api_keys_service_role_only" ON api_keys
  FOR ALL
  USING (auth.role() = 'service_role');
```

**Fixed:**
```sql
CREATE POLICY "api_keys_service_role_only" ON api_keys
  FOR ALL
  TO service_role
  USING (true);
```

## Error 2: Line 298 - UPDATE policy missing WITH CHECK
**Current (WRONG):**
```sql
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id);
```

**Fixed:**
```sql
CREATE POLICY "Users can update own data" ON users
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
```

## Error 3: Line 332 - current_uid() wrong implementation
**Current (WRONG):**
```sql
CREATE OR REPLACE FUNCTION current_uid()
RETURNS UUID AS $$
BEGIN
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Fixed:**
```sql
CREATE OR REPLACE FUNCTION current_uid()
RETURNS UUID AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'sub')::UUID;
$$ LANGUAGE SQL STABLE;
```

## Error 4: Line 302 - Public rooms policy missing TO public
**Current (WRONG):**
```sql
CREATE POLICY "Public rooms are readable" ON rooms
  FOR SELECT USING (is_public = true);
```

**Fixed:**
```sql
CREATE POLICY "Public rooms are readable" ON rooms
  FOR SELECT TO public USING (is_public = true);
```

## Error 5: Line 175 - uuid_generate_v4() inconsistency
**Current (WRONG):**
```sql
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ...
);
```

**Fixed:**
```sql
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ...
);
```

