#!/usr/bin/env node

/**
 * Enhanced test runner with better output and reporting
 */

const { spawn } = require('child_process');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const testType = args[0] || 'all';

// Define test configurations
const testConfigs = {
  all: {
    command: 'jest',
    args: ['--runInBand'],
    description: 'Running all tests',
  },
  unit: {
    command: 'jest',
    args: ['--testPathPattern=tests/unit', '--runInBand'],
    description: 'Running unit tests',
  },
  integration: {
    command: 'jest',
    args: ['--testPathPattern=tests/integration', '--runInBand'],
    description: 'Running integration tests',
  },
  coverage: {
    command: 'jest',
    args: ['--coverage', '--runInBand'],
    description: 'Running tests with coverage',
  },
  watch: {
    command: 'jest',
    args: ['--watch'],
    description: 'Running tests in watch mode',
  },
  ci: {
    command: 'jest',
    args: ['--coverage', '--runInBand', '--ci', '--maxWorkers=2'],
    description: 'Running tests in CI mode',
  },
};

// Get configuration
const config = testConfigs[testType];

if (!config) {
  console.error(`❌ Unknown test type: ${testType}`);
  console.log('\nAvailable test types:');
  Object.keys(testConfigs).forEach((type) => {
    console.log(`  - ${type}: ${testConfigs[type].description}`);
  });
  process.exit(1);
}

// Print header
console.log('═'.repeat(70));
console.log(`🧪 ${config.description}`);
console.log('═'.repeat(70));
console.log('');

// Run tests
const testProcess = spawn('npx', [config.command, ...config.args], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
});

testProcess.on('close', (code) => {
  console.log('');
  console.log('═'.repeat(70));

  if (code === 0) {
    console.log('✅ All tests passed!');
    
    // If coverage was run, check thresholds
    if (testType === 'coverage' || testType === 'ci') {
      console.log('📊 Checking coverage thresholds...');
      const checkCoverage = spawn('node', [path.join(__dirname, 'check-coverage.js')], {
        cwd: path.join(__dirname, '..'),
        stdio: 'inherit',
        shell: true,
      });
      
      checkCoverage.on('close', (coverageCode) => {
        process.exit(coverageCode);
      });
    } else {
      console.log('═'.repeat(70));
      process.exit(0);
    }
  } else {
    console.log('❌ Tests failed!');
    console.log('═'.repeat(70));
    process.exit(code);
  }
});

testProcess.on('error', (error) => {
  console.error('❌ Error running tests:', error.message);
  process.exit(1);
});
