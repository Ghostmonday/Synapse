// REPLACE pg_table_size with:
const sizeResult = await supabase.rpc('get_table_size', { table_name: partition.partition_name });
