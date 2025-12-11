/**
 * Check if system is ready for stress test
 */

const axios = require('axios');
const { Pool } = require('pg');
require('dotenv').config();

const BASE_URL = process.env.BASE_URL || 'http://127.0.0.1:3000'; // Use 127.0.0.1 to avoid IPv6 issues
const USER_ID = 'user_test_webchat';

async function checkReadiness() {
  console.log('🔍 Checking system readiness for stress test...\n');
  
  let allChecks = true;
  
  // Check 1: Server is running
  try {
    await axios.get(`${BASE_URL}/health`, { timeout: 5000 });
    console.log('✅ Server is running');
  } catch (error) {
    console.log('❌ Server is NOT running');
    console.log('   Start with: npm run dev');
    allChecks = false;
  }
  
  // Check 2: Database connection
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  
  try {
    await pool.query('SELECT 1');
    console.log('✅ Database is accessible');
  } catch (error) {
    console.log('❌ Database is NOT accessible');
    console.log(`   Error: ${error.message}`);
    allChecks = false;
  }
  
  // Check 3: Test user exists and has credits
  try {
    const userResult = await pool.query(
      'SELECT user_id FROM users WHERE user_id = $1',
      [USER_ID]
    );
    
    if (userResult.rows.length === 0) {
      console.log('⚠️  Test user does not exist');
      console.log('   Run: node tests/stress/setup-test-user.js');
      allChecks = false;
    } else {
      // Check credits table
      const creditsResult = await pool.query(
        'SELECT remaining_credits FROM credits WHERE user_id = $1',
        [USER_ID]
      );
      
      if (creditsResult.rows.length === 0) {
        console.log('⚠️  Test user has no credits record');
        console.log('   Run: node tests/stress/setup-test-user.js');
        allChecks = false;
      } else {
        const credits = creditsResult.rows[0].remaining_credits;
        if (credits < 1500) {
          console.log(`⚠️  Test user has insufficient credits: ${credits}`);
          console.log('   Run: node tests/stress/setup-test-user.js');
          allChecks = false;
        } else {
          console.log(`✅ Test user has sufficient credits: ${credits}`);
        }
      }
    }
  } catch (error) {
    console.log('❌ Could not check test user');
    console.log(`   Error: ${error.message}`);
    allChecks = false;
  }
  
  // Check 4: Workers (optional check - just warn)
  try {
    const result = await pool.query(`
      SELECT COUNT(*) as active_workers 
      FROM pg_stat_activity 
      WHERE application_name LIKE '%worker%'
    `);
    
    const workerCount = parseInt(result.rows[0].active_workers);
    if (workerCount === 0) {
      console.log('⚠️  No workers detected (this check may be inaccurate)');
      console.log('   Make sure workers are running: npm run workers:all');
    } else {
      console.log(`✅ Workers detected: ${workerCount}`);
    }
  } catch (error) {
    console.log('⚠️  Could not check workers (non-critical)');
  }
  
  // Check 5: System resources
  const os = require('os');
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const memUsage = ((totalMem - freeMem) / totalMem * 100).toFixed(1);
  
  console.log(`\nSystem Resources:`);
  console.log(`  CPU cores: ${os.cpus().length}`);
  console.log(`  Memory usage: ${memUsage}%`);
  console.log(`  Free memory: ${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`);
  
  if (freeMem < 1024 * 1024 * 1024) { // Less than 1GB free
    console.log('  ⚠️  Low memory available');
  }
  
  await pool.end();
  
  console.log('\n' + '='.repeat(60));
  if (allChecks) {
    console.log('✅ System is READY for stress test!');
    console.log('\nRun: node tests/stress/webchat-stress-test.js');
  } else {
    console.log('❌ System is NOT ready for stress test');
    console.log('\nFix the issues above before running the test.');
  }
  console.log('='.repeat(60) + '\n');
  
  return allChecks;
}

if (require.main === module) {
  checkReadiness()
    .then(ready => process.exit(ready ? 0 : 1))
    .catch(error => {
      console.error('Check failed:', error);
      process.exit(1);
    });
}

module.exports = { checkReadiness };
