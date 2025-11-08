CREATE OR REPLACE FUNCTION get_table_size(table_name text)
RETURNS bigint AS $$
  SELECT pg_total_relation_size(table_name);
$$ LANGUAGE sql SECURITY DEFINER;
