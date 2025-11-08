import { rotatePartition } from '../src/functions/admin/rotatePartition.js';
import { runAllCleanup } from '../src/functions/admin/runAllCleanup.js';

async function main() {
  const rotate = await rotatePartition();
  console.log('Rotate:', rotate);

  const oldest = 'messages_' + new Date(Date.now() - 7 * 86400000).toISOString().slice(0,10).replace(/-/g,'');
  const cleanup = await runAllCleanup(oldest);
  console.log('Cleanup:', cleanup);
}

main().catch(console.error);
