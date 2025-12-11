#!/usr/bin/env node

/**
 * Script to check test coverage and enforce quality gates
 */

const fs = require('fs');
const path = require('path');

const COVERAGE_FILE = path.join(__dirname, '../coverage/coverage-summary.json');
const REQUIRED_COVERAGE = {
  lines: 80,
  statements: 80,
  functions: 80,
  branches: 80,
};

function checkCoverage() {
  console.log('🔍 Checking test coverage...\n');

  // Check if coverage file exists
  if (!fs.existsSync(COVERAGE_FILE)) {
    console.error('❌ Coverage file not found. Run "npm run test:coverage" first.');
    process.exit(1);
  }

  // Read coverage data
  const coverageData = JSON.parse(fs.readFileSync(COVERAGE_FILE, 'utf8'));
  const totalCoverage = coverageData.total;

  // Check each metric
  let passed = true;
  const results = [];

  for (const [metric, threshold] of Object.entries(REQUIRED_COVERAGE)) {
    const actual = totalCoverage[metric].pct;
    const status = actual >= threshold ? '✅' : '❌';
    const diff = actual - threshold;
    const diffStr = diff >= 0 ? `+${diff.toFixed(2)}%` : `${diff.toFixed(2)}%`;

    results.push({
      metric,
      actual,
      threshold,
      status,
      diff: diffStr,
    });

    if (actual < threshold) {
      passed = false;
    }
  }

  // Print results
  console.log('Coverage Results:');
  console.log('─'.repeat(70));
  console.log(
    `${'Metric'.padEnd(15)} ${'Actual'.padEnd(12)} ${'Required'.padEnd(12)} ${'Diff'.padEnd(12)} Status`
  );
  console.log('─'.repeat(70));

  results.forEach((result) => {
    console.log(
      `${result.metric.padEnd(15)} ${`${result.actual.toFixed(2)}%`.padEnd(12)} ${`${result.threshold}%`.padEnd(12)} ${result.diff.padEnd(12)} ${result.status}`
    );
  });

  console.log('─'.repeat(70));

  // Print summary
  if (passed) {
    console.log('\n✅ All coverage thresholds met!');
    console.log('🎉 Quality gate passed!\n');
    process.exit(0);
  } else {
    console.log('\n❌ Some coverage thresholds not met.');
    console.log('💡 Add more tests to improve coverage.\n');
    process.exit(1);
  }
}

// Run the check
try {
  checkCoverage();
} catch (error) {
  console.error('❌ Error checking coverage:', error.message);
  process.exit(1);
}
