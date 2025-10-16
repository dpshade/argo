// Test script to verify Wayfinder gateway selection
import {
  getOptimalGatewayHostname,
  getOptimalGatewayUrl,
  buildGatewayUrl,
  getGatewayHostnameSync
} from './src/helpers/gatewayService.js';

console.log('=== Testing Wayfinder Gateway Service ===\n');

// Test 1: Check synchronous value before initialization
console.log('1. Synchronous gateway (before init):', getGatewayHostnameSync());

// Test 2: Initialize and get optimal gateway
console.log('\n2. Initializing Wayfinder and selecting optimal gateway...');
const startTime = Date.now();

try {
  const hostname = await getOptimalGatewayHostname();
  const duration = Date.now() - startTime;

  console.log(`✅ Optimal gateway selected: ${hostname}`);
  console.log(`   Selection took: ${duration}ms`);

  // Test 3: Verify it's not just the default
  if (hostname === 'arweave.net') {
    console.log('⚠️  WARNING: Using arweave.net (could be default fallback or actual fastest gateway)');
  } else {
    console.log('✅ Using AR.IO Network gateway:', hostname);
  }

  // Test 4: Get full URL
  const fullUrl = await getOptimalGatewayUrl();
  console.log('\n3. Full gateway URL:', fullUrl);

  // Test 5: Build a transaction URL
  const txId = 'xwOgX-MmqN5_-Ny_zNu2A8o-PnTGsoRb_3FrtiMAkuw'; // Example tx
  const txUrl = await buildGatewayUrl(txId);
  console.log('\n4. Example transaction URL:', txUrl);

  // Test 6: Verify synchronous value after initialization
  console.log('\n5. Synchronous gateway (after init):', getGatewayHostnameSync());

  console.log('\n=== All tests completed successfully ===');
  process.exit(0);

} catch (error) {
  console.error('❌ Error during gateway selection:', error);
  console.error('   Stack:', error.stack);
  process.exit(1);
}
