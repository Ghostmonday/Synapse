/**
 * Shared Supabase query helpers
 * Provides consistent error handling and simplified query patterns
 */

import { supabase } from '../config/db.js';
import { logError } from '../shared/logger.js';

/**
 * Execute a Supabase select query and return single result
 */
export async function findOne<T = any>(
  table: string,
  filter: Record<string, any>
): Promise<T | null> {
  try {
    let query = supabase.from(table).select('*');
    
    for (const [key, value] of Object.entries(filter)) {
      query = query.eq(key, value);
    }
    
    const { data, error } = await query.single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found - return null instead of throwing
        return null;
      }
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
 */
export async function findMany<T = any>(
  table: string,
  options?: {
    filter?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
): Promise<T[]> {
  try {
    let query = supabase.from(table).select('*');
    
    if (options?.filter) {
      for (const [key, value] of Object.entries(options.filter)) {
        query = query.eq(key, value);
      }
    }
    
    if (options?.orderBy) {
      query = query.order(options.orderBy.column, { 
        ascending: options.orderBy.ascending ?? true 
      });
    }
    
    if (options?.limit) {
      query = query.limit(options.limit);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    return (data || []) as T[];
  } catch (error: any) {
    logError(`findMany failed for table "${table}"`, error);
    throw new Error(error.message || `Failed to query ${table}`);
  }
}

/**
 * Create a new record in Supabase
 */
export async function create<T = any>(
  table: string,
  record: Record<string, any>
): Promise<T> {
  try {
    const { data, error } = await supabase
      .from(table)
      .insert([record])
      .select()
      .single();
    
    if (error) throw error;
    
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
 */
export async function upsert<T = any>(
  table: string,
  record: Record<string, any>,
  conflictColumn: string = 'id'
): Promise<T> {
  try {
    const { data, error } = await supabase
      .from(table)
      .upsert(record, { onConflict: conflictColumn })
      .select()
      .single();
    
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

