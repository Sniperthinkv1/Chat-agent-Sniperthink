/**
 * Setup test user with sufficient credits for stress test
 */

const { Pool } = require('pg');
require('dotenv').config();

const USER_ID = 'user_test_webchat';
const REQUIRED_CREDITS = 2000; // Buffer for 1500 sessions

async function setupTestUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });

  try {
    console.log('🔧 Setting up test user...\n');

    // Check if user exists
    const userCheck = await pool.query(
      'SELECT user_id FROM users WHERE user_id = $1',
      [USER_ID]
    );

    if (userCheck.rows.length === 0) {
      // Create user
      console.log(`Creating user: ${USER_ID}`);
      await pool.query(
        'INSERT INTO users (user_id, email, company_name, created_at) VALUES ($1, $2, $3, NOW())',
        [USER_ID, `${USER_ID}@test.com`, 'Stress Test Company']
      );
      console.log(`✅ User created\n`);
    } else {
      console.log(`✅ User exists\n`);
    }

    // Check/create credits
    const creditsCheck = await pool.query(
      'SELECT remaining_credits FROM credits WHERE user_id = $1',
      [USER_ID]
    );

    if (creditsCheck.rows.length === 0) {
      // Create credits record
      console.log(`Creating credits record with ${REQUIRED_CREDITS} credits`);
      await pool.query(
        'INSERT INTO credits (user_id, remaining_credits) VALUES ($1, $2)',
        [USER_ID, REQUIRED_CREDITS]
      );
      console.log(`✅ Credits created: ${REQUIRED_CREDITS}\n`);
    } else {
      const currentCredits = creditsCheck.rows[0].remaining_credits;
      console.log(`Current credits: ${currentCredits}`);

      if (currentCredits < REQUIRED_CREDITS) {
        // Add more credits
        await pool.query(
          'UPDATE credits SET remaining_credits = $1 WHERE user_id = $2',
          [REQUIRED_CREDITS, USER_ID]
        );
        console.log(`✅ Credits updated to ${REQUIRED_CREDITS}\n`);
      } else {
        console.log(`✅ User has sufficient credits\n`);
      }
    }

    // Check for any existing agents for this user
    const agentCheck = await pool.query(
      'SELECT COUNT(*) as count FROM agents WHERE user_id = $1',
      [USER_ID]
    );

    if (parseInt(agentCheck.rows[0].count) > 0) {
      console.log(`Found ${agentCheck.rows[0].count} existing agents`);
      console.log('⚠️  Warning: Existing agents found. The stress test will create 10 new agents.');
      console.log('   Consider cleaning up old agents if needed.\n');
    }

    console.log('✅ Test user setup complete!\n');
    console.log('Ready to run stress test with:');
    console.log(`  - User ID: ${USER_ID}`);
    console.log(`  - Credits: ${REQUIRED_CREDITS}`);
    console.log(`  - Expected usage: ~1500 credits\n`);

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    throw error;
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  setupTestUser().catch(error => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
}

module.exports = { setupTestUser };
