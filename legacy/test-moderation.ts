#!/usr/bin/env tsx
/**
 * Test script for AI moderation
 * Usage: npx tsx scripts/test-moderation.ts "message text" --threshold=0.65
 */

import { analyzeMessage } from '../src/services/moderation.service.js';

const args = process.argv.slice(2);
const input = args.find(arg => !arg.startsWith('--'));
const thresholdArg = args.find(arg => arg.startsWith('--threshold='));
const threshold = thresholdArg ? parseFloat(thresholdArg.split('=')[1]) : 0.65;

if (!input) {
  console.log('Usage: npx tsx scripts/test-moderation.ts "<message>" [--threshold=0.65]');
  console.log('');
  console.log('Examples:');
  console.log('  npx tsx scripts/test-moderation.ts "hello world"');
  console.log('  npx tsx scripts/test-moderation.ts "kill yourself" --threshold=0.65');
  process.exit(1);
}

async function main() {
  try {
    const { score, label } = await analyzeMessage(input);
    
    console.log(`\n📊 Moderation Analysis:`);
    console.log(`   Message: "${input}"`);
    console.log(`   Score: ${score.toFixed(3)} (0 = safe, 1 = extremely toxic)`);
    console.log(`   Label: ${label.toUpperCase()}`);
    console.log(`   Threshold: ${threshold}`);
    
    if (score > threshold) {
      console.log(`\n⚠️  → Would trigger moderation action`);
      if (score > 0.85) {
        console.log(`   → Action: REMOVE (hard threshold)`);
      } else {
        console.log(`   → Action: WARN (soft threshold)`);
      }
    } else {
      console.log(`\n✅ → Safe message`);
    }
    
    process.exit(0);
  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();

