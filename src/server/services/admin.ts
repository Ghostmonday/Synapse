/**
 * Admin Service
 * Partition rotation and cleanup operations
 */

import { supabase } from '../../config/db.js';
import { logError, logInfo } from '../../shared/logger.js';

/**
 * Load partition metadata including size information
 */
export async function loadPartitionMetadata() {
  try {
    const { data, error } = await supabase.rpc('list_partitions');
    
    if (error) throw error;

    // Enhance with size information using get_table_size
    const enhanced = await Promise.all(
      (data || []).map(async (partition: any) => {
        try {
          const { data: sizeData, error: sizeError } = await supabase.rpc('get_table_size', {
            table_name: partition.partition_name
          });
          
          if (sizeError) {
            logError('Failed to get partition size', sizeError);
            return { ...partition, size_bytes: null };
          }
          
          return {
            ...partition,
            size_bytes: sizeData || null
          };
        } catch (err) {
          logError('Error getting partition size', err);
          return { ...partition, size_bytes: null };
        }
      })
    );

    return enhanced;
  } catch (err: unknown) {
    logError('loadPartitionMetadata error', err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}

/**
 * Rotate partition: Create new partition for current month if needed
 */
export async function rotatePartition() {
  try {
    const currentMonth = new Date().toISOString().slice(0, 7).replace('-', '_'); // YYYY_MM format
    
    const { data, error } = await supabase.rpc('create_partition_if_needed', {
      partition_month: currentMonth
    });

    if (error) throw error;

    logInfo(`Partition rotation completed: ${data}`);
    return { success: true, partition_name: data };
  } catch (err: unknown) {
    logError('rotatePartition error', err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}

/**
 * Run cleanup for partitions older than specified date
 * Drops partitions older than the provided partition name
 */
export async function runAllCleanup(oldestPartitionName: string) {
  try {
    // Get all partitions
    const { data: partitions, error: listError } = await supabase.rpc('list_partitions');
    
    if (listError) throw listError;

    if (!partitions || partitions.length === 0) {
      logInfo('No partitions to clean up');
      return { success: true, dropped: [] };
    }

    // Extract date from partition name (format: messages_YYYYMMDD or logs_compressed_YYYYMM)
    const oldestDate = oldestPartitionName.replace(/^[^_]+_/, '');
    
    const dropped: string[] = [];
    const errors: string[] = [];

    for (const partition of partitions) {
      const partitionMonth = partition.partition_month || partition.partition_name;
      const partitionDate = partitionMonth.replace(/^[^_]+_/, '').replace(/_/g, '');
      
      // Compare dates (assuming YYYYMM format)
      if (partitionDate < oldestDate) {
        try {
          // Extract month format (YYYY_MM) from partition name
          const monthMatch = partitionMonth.match(/(\d{4})_?(\d{2})/);
          if (monthMatch) {
            const monthFormat = `${monthMatch[1]}_${monthMatch[2]}`;
            const { error: dropError } = await supabase.rpc('drop_partition', {
              partition_month: monthFormat
            });
            
            if (dropError) {
              errors.push(`${partition.partition_name}: ${dropError.message}`);
            } else {
              dropped.push(partition.partition_name);
              logInfo(`Dropped partition: ${partition.partition_name}`);
            }
          }
        } catch (err) {
          errors.push(`${partition.partition_name}: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    return {
      success: errors.length === 0,
      dropped,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (err: unknown) {
    logError('runAllCleanup error', err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}

