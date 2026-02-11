#!/usr/bin/env npx tsx

/**
 * AgenticAiHome Test Suite Runner
 * 
 * Runs all critical path tests and provides detailed reporting.
 * 
 * Usage:
 *   npx tsx tests/run.ts
 *   npm run test (if configured in package.json)
 */

import escrowTests from './escrow.test';
import taskLifecycleTests from './taskLifecycle.test';
import egoTests from './ego.test';
import safetyTests from './safety.test';
import ergPriceTests from './ergPrice.test';

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  error?: string;
}

async function runTestSuite(name: string, testFn: () => Promise<boolean>): Promise<TestResult> {
  const startTime = Date.now();
  
  try {
    console.log(`\n🧪 Running ${name} tests...`);
    const passed = await testFn();
    const duration = Date.now() - startTime;
    
    return {
      name,
      passed,
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    
    return {
      name,
      passed: false,
      duration,
      error: (error as Error).message,
    };
  }
}

function printResults(results: TestResult[]) {
  console.log('\n' + '='.repeat(60));
  console.log('🏁 TEST SUITE RESULTS');
  console.log('='.repeat(60));

  let totalDuration = 0;
  let passedCount = 0;

  results.forEach((result) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const duration = `${result.duration}ms`;
    
    console.log(`${status} ${result.name.padEnd(20)} (${duration})`);
    
    if (result.error) {
      console.log(`    └─ ${result.error}`);
    }

    totalDuration += result.duration;
    if (result.passed) passedCount++;
  });

  console.log('─'.repeat(60));
  console.log(`📊 Summary: ${passedCount}/${results.length} tests passed in ${totalDuration}ms`);

  if (passedCount === results.length) {
    console.log('🎉 ALL TESTS PASSED! AgenticAiHome is ready for production.');
  } else {
    console.log('💥 SOME TESTS FAILED! Please review and fix before deployment.');
  }
}

function printSystemInfo() {
  console.log('🔬 AgenticAiHome Test Suite');
  console.log('─'.repeat(30));
  console.log(`Node.js: ${process.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
  console.log(`Working Directory: ${process.cwd()}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);
  
  // Check if we're in the right directory
  const expectedPath = 'agenticaihome';
  if (!process.cwd().includes(expectedPath)) {
    console.log('⚠️  Warning: Not running from agenticaihome directory');
  }
}

async function main() {
  printSystemInfo();

  const testSuites = [
    { name: 'Escrow Transactions', fn: escrowTests },
    { name: 'Task Lifecycle', fn: taskLifecycleTests },
    { name: 'EGO Score System', fn: egoTests },
    { name: 'Safety System', fn: safetyTests },
    { name: 'ERG Price Utility', fn: ergPriceTests },
  ];

  const results: TestResult[] = [];

  for (const suite of testSuites) {
    const result = await runTestSuite(suite.name, suite.fn);
    results.push(result);
    
    // Add a small delay between test suites for readability
    if (result !== results[results.length - 1]) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  printResults(results);

  // Exit with appropriate code
  const allPassed = results.every(r => r.passed);
  process.exit(allPassed ? 0 : 1);
}

// Handle uncaught errors gracefully
process.on('uncaughtException', (error) => {
  console.error('\n💥 Uncaught Exception:', error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('\n💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run the test suite
if (require.main === module) {
  main().catch((error) => {
    console.error('\n💥 Test runner failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
}

export default main;