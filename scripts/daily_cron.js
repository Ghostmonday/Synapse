/**
 * Daily Cron Script
 * Runs partition rotation and cleanup tasks
 * Should be scheduled to run daily (e.g., via cron or scheduled job)
 */

import { rotatePartition } from '../src/server/services/admin.js';
import { runAllCleanup } from '../src/server/services/admin.js';

async function main() {
  try {
    // Rotate partition: Create new partition for current month if needed
    const rotate = await rotatePartition();
    console.log('Rotate:', rotate);

    // Calculate oldest partition to keep (7 days ago)
    const oldest = 'messages_' + new Date(Date.now() - 7 * 86400000).toISOString().slice(0,10).replace(/-/g,'');
    
    // Run cleanup: Drop partitions older than 7 days
    const cleanup = await runAllCleanup(oldest);
    console.log('Cleanup:', cleanup);
  } catch (error) {
    console.error('Daily cron error:', error);
    process.exit(1);
  }
}

main().catch(console.error);

