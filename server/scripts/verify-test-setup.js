#!/usr/bin/env node

/**
 * Integration Test Setup Verification
 * Verifies that the environment is correctly configured for integration tests
 */

const { Pool } = require('pg');
const { createClient } = require('redis');
require('dotenv').config();

async function verifySetup() {
  console.log('🔍 Verifying Integration Test Setup...\n');

  let allChecks = true;

  // Check environment variables
  console.log('📋 Checking Environment Variables:');
  const requiredVars = [
    'DATABASE_URL',
    'REDIS_URL',
    'OPENAI_API_KEY',
    'WEBHOOK_SECRET',
  ];

  for (const varName of requiredVars) {
    if (process.env[varName]) {
      console.log(`  ✅ ${varName}: Set`);
    } else {
      console.log(`  ❌ ${varName}: Missing`);
      allChecks = false;
    }
  }

  // Check database connection
  console.log('\n🗄️  Checking Database Connection (Neon PostgreSQL):');
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    const result = await pool.query('SELECT NOW() as time, version() as version');
    console.log(`  ✅ Connected successfully`);
    console.log(`  ⏰ Server time: ${result.rows[0].time}`);
    console.log(`  📦 Version: ${result.rows[0].version.split(' ')[0]} ${result.rows[0].version.split(' ')[1]}`);

    // Check if tables exist
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    if (tablesResult.rows.length > 0) {
      console.log(`  ✅ Found ${tablesResult.rows.length} tables:`);
      tablesResult.rows.forEach(row => {
        console.log(`     - ${row.table_name}`);
      });
    } else {
      console.log(`  ⚠️  No tables found. Run migrations: npm run migrate`);
    }

    await pool.end();
  } catch (error) {
    console.log(`  ❌ Connection failed: ${error.message}`);
    allChecks = false;
  }

  // Check Redis connection
  console.log('\n🔴 Checking Redis Connection (Upstash):');
  try {
    const redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        tls: true,
        rejectUnauthorized: false,
      },
    });

    await redisClient.connect();
    const pong = await redisClient.ping();
    
    if (pong === 'PONG') {
      console.log(`  ✅ Connected successfully`);
      
      // Test basic operations
      await redisClient.set('test:verify', 'ok', { EX: 10 });
      const value = await redisClient.get('test:verify');
      
      if (value === 'ok') {
        console.log(`  ✅ Read/Write operations working`);
      }
      
      await redisClient.del('test:verify');
    }

    await redisClient.quit();
  } catch (error) {
    console.log(`  ❌ Connection failed: ${error.message}`);
    allChecks = false;
  }

  // Check OpenAI API key format
  console.log('\n🤖 Checking OpenAI Configuration:');
  if (process.env.OPENAI_API_KEY) {
    if (process.env.OPENAI_API_KEY.startsWith('sk-')) {
      console.log(`  ✅ API key format looks valid`);
      console.log(`  🔑 Key prefix: ${process.env.OPENAI_API_KEY.substring(0, 10)}...`);
    } else {
      console.log(`  ⚠️  API key format may be invalid (should start with 'sk-')`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  if (allChecks) {
    console.log('✅ All checks passed! Ready to run integration tests.');
    console.log('\nRun tests with:');
    console.log('  npm run test:integration');
    console.log('  npm run test:integration:latency');
    console.log('  npm run test:integration:load');
  } else {
    console.log('❌ Some checks failed. Please fix the issues above.');
    process.exit(1);
  }
  console.log('='.repeat(50));
}

// Run verification
verifySetup().catch(error => {
  console.error('\n❌ Verification failed:', error);
  process.exit(1);
});
