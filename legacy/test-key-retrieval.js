#!/usr/bin/env node

/**
 * Test API Key Retrieval from Database Vault
 * Tests that keys can be retrieved and decrypted correctly
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env');
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testKeyRetrieval() {
  console.log('🧪 Testing API Key Retrieval from Database Vault\n');
  console.log('='.repeat(60));

  const tests = [
    {
      name: 'Test 1: Retrieve APPLE_TEAM_ID',
      key: 'APPLE_TEAM_ID',
      expected: 'R7KX4HNBFY',
    },
    {
      name: 'Test 2: Retrieve APPLE_KEY_ID',
      key: 'APPLE_KEY_ID',
      expected: '2D3E4F5G6H7I8J9K0L1M2',
    },
    {
      name: 'Test 3: Retrieve JWT_SECRET',
      key: 'JWT_SECRET',
      expected: '22b535f33e962ec929111875334a9911d12ea843b73137cfa8ff0162a8ec10d3',
    },
    {
      name: 'Test 4: Retrieve LIVEKIT_API_KEY',
      key: 'LIVEKIT_API_KEY',
      expected: 'APIXwuVneVRyb42',
    },
    {
      name: 'Test 5: Retrieve APPLE_PRIVATE_KEY (check format)',
      key: 'APPLE_PRIVATE_KEY',
      expected: '-----BEGIN PRIVATE KEY-----',
      partial: true, // Just check it starts with this
    },
    {
      name: 'Test 6: Retrieve DEEPSEEK_API_KEY',
      key: 'DEEPSEEK_API_KEY',
      expected: 'sk-e7d0fbdb5bad4db484ff9036c39f54ac',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      console.log(`\n${test.name}`);
      console.log('-'.repeat(60));

      const { data, error } = await supabase.rpc('get_api_key', {
        p_key_name: test.key,
        p_environment: 'production',
      });

      if (error) {
        console.error(`❌ Error: ${error.message}`);
        failed++;
        continue;
      }

      if (!data) {
        console.error(`❌ No data returned`);
        failed++;
        continue;
      }

      const retrieved = data;
      console.log(`✅ Retrieved: ${test.partial ? retrieved.substring(0, 50) + '...' : retrieved}`);

      if (test.partial) {
        if (retrieved.startsWith(test.expected)) {
          console.log(`✅ Format check passed`);
          passed++;
        } else {
          console.error(`❌ Format check failed - doesn't start with expected value`);
          failed++;
        }
      } else {
        if (retrieved === test.expected) {
          console.log(`✅ Value matches expected`);
          passed++;
        } else {
          console.error(`❌ Value mismatch!`);
          console.error(`   Expected: ${test.expected}`);
          console.error(`   Got:      ${retrieved}`);
          failed++;
        }
      }
    } catch (error) {
      console.error(`❌ Exception: ${error.message}`);
      failed++;
    }
  }

  // Test category retrieval
  console.log(`\n${'='.repeat(60)}`);
  console.log('Test 7: Retrieve All Apple Keys by Category');
  console.log('-'.repeat(60));

  try {
    const { data, error } = await supabase.rpc('get_api_keys_by_category', {
      p_category: 'apple',
      p_environment: 'production',
    });

    if (error) {
      console.error(`❌ Error: ${error.message}`);
      failed++;
    } else {
      console.log(`✅ Retrieved ${data?.length || 0} Apple keys:`);
      if (data && Array.isArray(data)) {
        data.forEach((item) => {
          const keyName = item.result_key_name || item.key_name;
          const keyValue = item.result_key_value || item.key_value;
          console.log(`   - ${keyName}: ${keyValue.substring(0, 30)}...`);
        });
        passed++;
      } else {
        console.error(`❌ Invalid response format`);
        failed++;
      }
    }
  } catch (error) {
    console.error(`❌ Exception: ${error.message}`);
    failed++;
  }

  // Test LiveKit category
  console.log(`\n${'='.repeat(60)}`);
  console.log('Test 8: Retrieve All LiveKit Keys by Category');
  console.log('-'.repeat(60));

  try {
    const { data, error } = await supabase.rpc('get_api_keys_by_category', {
      p_category: 'livekit',
      p_environment: 'production',
    });

    if (error) {
      console.error(`❌ Error: ${error.message}`);
      failed++;
    } else {
      console.log(`✅ Retrieved ${data?.length || 0} LiveKit keys:`);
      if (data && Array.isArray(data)) {
        data.forEach((item) => {
          const keyName = item.result_key_name || item.key_name;
          const keyValue = item.result_key_value || item.key_value;
          const displayValue = keyName.includes('SECRET') || keyName.includes('KEY')
            ? keyValue.substring(0, 20) + '...'
            : keyValue;
          console.log(`   - ${keyName}: ${displayValue}`);
        });
        passed++;
      } else {
        console.error(`❌ Invalid response format`);
        failed++;
      }
    }
  } catch (error) {
    console.error(`❌ Exception: ${error.message}`);
    failed++;
  }

  // Test error handling
  console.log(`\n${'='.repeat(60)}`);
  console.log('Test 9: Error Handling (Non-existent Key)');
  console.log('-'.repeat(60));

  try {
    const { data, error } = await supabase.rpc('get_api_key', {
      p_key_name: 'NON_EXISTENT_KEY_12345',
      p_environment: 'production',
    });

    if (error) {
      console.log(`✅ Correctly raised error: ${error.message}`);
      passed++;
    } else if (data === null) {
      console.log(`✅ Correctly returned null for non-existent key`);
      passed++;
    } else {
      console.error(`❌ Should have raised an error or returned null`);
      failed++;
    }
  } catch (error) {
    console.log(`✅ Correctly raised exception: ${error.message}`);
    passed++;
  }

  // Summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Total:  ${passed + failed}`);
  console.log(`🎯 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Key retrieval is working correctly.');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    process.exit(1);
  }
}

// Run tests
testKeyRetrieval().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

