/**
 * Shared Supabase query helpers
 * Provides consistent error handling and simplified query patterns
 */

import { supabase } from '../config/db.js';
import { logError } from '../shared/logger.js';

/**
 * Execute a Supabase select query and return single result
 * 
 * Builds WHERE clause dynamically from filter object.
 * Returns null if no record found (instead of throwing error).
 */
export async function findOne<T = any>(
  table: string,
  filter: Record<string, any>
): Promise<T | null> {
  try {
    // Start with base query: SELECT * FROM table
    let query = supabase.from(table).select('*');
    
    // Build WHERE clause dynamically from filter object
    // Example: filter = { room_id: '123', user_id: '456' }
    // Results in: WHERE room_id = '123' AND user_id = '456'
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value); // eq = equals (WHERE key = value)
    }
    
    // Execute query and expect exactly one result
    // .single() throws if 0 or 2+ rows returned
    const { data, error } = await query.single();
    
    if (error) {
      // PGRST116 = PostgREST error code for "no rows returned"
      // This is expected when record doesn't exist - return null instead of error
      if (error.code === 'PGRST116') {
        // No rows found - return null instead of throwing
        return null;
      }
      // Other errors (permission denied, connection error, etc.) - throw
      throw error;
    }
    
    return data as T;
  } catch (error: any) {
    logError(`findOne failed for table "${table}"`, error);
    throw new Error(error.message || `Failed to find record in ${table}`);
  }
}

/**
 * Execute a Supabase select query and return multiple results
 * 
 * Supports filtering, ordering, and pagination.
 * Returns empty array if no results (never null).
 */
export async function findMany<T = any>(
  table: string,
  options?: {
    filter?: Record<string, any>; // WHERE conditions (key = value pairs)
    orderBy?: { column: string; ascending?: boolean }; // ORDER BY clause
    limit?: number; // LIMIT clause (max rows to return)
  }
): Promise<T[]> {
  try {
    // Start with base query: SELECT * FROM table
    let query = supabase.from(table).select('*');
    
    // Apply filters (WHERE conditions)
    // Builds: WHERE key1 = value1 AND key2 = value2 ...
    if (options?.filter) {
      for (const [key, value] of Object.entries(options.filter)) {
        query = query.eq(key, value); // eq = equals operator
      }
    }
    
    // Apply ordering (ORDER BY clause)
    // ascending: true = ASC, false = DESC
    if (options?.orderBy) {
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending ?? true // Default to ascending if not specified
      });
    }
    
    // Apply limit (LIMIT clause)
    // Prevents returning too many rows (performance protection)
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    // Execute query (returns array, not single result)
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Return empty array if no data (never null)
    // Ensures caller can always iterate over result
    return (data || []) as T[];
  } catch (error: any) {
    logError(`findMany failed for table "${table}"`, error);
    throw new Error(error.message || `Failed to query ${table}`);
  }
}

/**
 * Create a new record in Supabase
 * 
 * Inserts record and returns the created record (with generated fields like id, timestamps).
 * .select() returns the inserted row, .single() ensures exactly one result.
 */
export async function create<T = any>(
  table: string,
  record: Record<string, any>
): Promise<T> {
  try {
    // Insert record and return created row
    // [record] = array format (Supabase insert accepts array for batch inserts)
    // .select() = return inserted data (includes auto-generated fields like id, created_at)
    // .single() = expect exactly one row (throw if 0 or 2+)
    const { data, error } = await supabase
      .from(table)
      .insert([record]) // Array format (allows batch inserts, but we insert one)
      .select() // Return inserted row(s)
      .single(); // Expect exactly one result
    
    if (error) throw error;
    
    // Return created record (includes id, timestamps, etc.)
    return data as T;
  } catch (error: any) {
    logError(`create failed for table "${table}"`, error);
    throw new Error(error.message || `Failed to create record in ${table}`);
  }
}

/**
 * Update a record in Supabase
 */
export async function updateOne<T = any>(
  table: string,
  id: string | number,
  updates: Record<string, any>
): Promise<T> {
  try {
    const { data, error } = await supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return data as T;
  } catch (error: any) {
    logError(`updateOne failed for table "${table}"`, error);
    throw new Error(error.message || `Failed to update record in ${table}`);
  }
}

/**
 * Upsert (insert or update) a record in Supabase
 * 
 * If record with conflictColumn value exists, update it.
 * If not, insert new record.
 * 
 * Uses PostgreSQL ON CONFLICT clause (UPSERT pattern).
 * Useful for idempotent operations (can be called multiple times safely).
 */
export async function upsert<T = any>(
  table: string,
  record: Record<string, any>,
  conflictColumn: string = 'id' // Column to check for conflicts (usually 'id' or unique constraint)
): Promise<T> {
  try {
    // Upsert: INSERT ... ON CONFLICT (conflictColumn) DO UPDATE
    // If record with same conflictColumn exists, update it
    // If not, insert new record
    const { data, error } = await supabase
      .from(table)
      .upsert(record, { onConflict: conflictColumn }) // Conflict resolution: update on duplicate
      .select() // Return upserted row
      .single(); // Expect exactly one result
    
    if (error) throw error;
    
    return data as T;
  } catch (error: any) {
    logError(`upsert failed for table "${table}"`, error);
    throw new Error(error.message || `Failed to upsert record in ${table}`);
  }
}

/**
 * Delete a record from Supabase
 */
export async function deleteOne(
  table: string,
  id: string | number
): Promise<void> {
  try {
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error: any) {
    logError(`deleteOne failed for table "${table}"`, error);
    throw new Error(error.message || `Failed to delete record from ${table}`);
  }
}

