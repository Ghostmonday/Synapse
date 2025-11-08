-- ===============================================
-- FILE: 07_table_size.sql
-- PURPOSE: Table size utility function
-- DEPENDENCIES: None
-- ===============================================

SET search_path TO service, public;

-- Get table size: Returns total size of a table including indexes
CREATE OR REPLACE FUNCTION get_table_size(table_name text)
RETURNS bigint AS $$
  SELECT pg_total_relation_size(table_name);
$$ LANGUAGE sql SECURITY DEFINER;

