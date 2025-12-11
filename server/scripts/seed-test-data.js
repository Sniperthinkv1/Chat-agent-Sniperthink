#!/usr/bin/env node

/**
 * Seed Test Data Script
 * Creates mock data for testing webhooks
 */

const { Pool } = require('pg');
require('dotenv').config();

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function seedTestData() {
  log('\n═══════════════════════════════════════════════════', 'cyan');
  log('   🌱 SEEDING TEST DATA', 'cyan');
  log('═══════════════════════════════════════════════════', 'cyan');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Test User Data
    const testUserId = 'test-user-001';
    const testEmail = 'test@example.com';
    const testCompany = 'Test Company Inc';
    
    const testPhoneNumberId = 'test-phone-001';
    const testExternalNumber = '+1234567890';
    const testAccessToken = 'test_access_token_12345';
    
    const testAgentId = 'test-agent-001';
    const testAgentName = 'Test AI Agent';
    const testPromptId = 'pmpt_68de2bd80fa08196ab95184e7787c6e30c231f4a29f082a0';

    log('\n📝 Creating Test User...', 'yellow');
    
    // Check if user exists
    const userCheck = await pool.query('SELECT user_id FROM users WHERE user_id = $1', [testUserId]);
    
    if (userCheck.rows.length > 0) {
      log(`⚠️  User ${testUserId} already exists, skipping...`, 'yellow');
    } else {
      await pool.query(
        'INSERT INTO users (user_id, email, company_name, created_at) VALUES ($1, $2, $3, NOW())',
        [testUserId, testEmail, testCompany]
      );
      log(`✅ Created user: ${testUserId}`, 'green');
    }

    log('\n📱 Creating Test Phone Number...', 'yellow');
    
    // Check if phone number exists
    const phoneCheck = await pool.query('SELECT id FROM phone_numbers WHERE id = $1', [testPhoneNumberId]);
    
    if (phoneCheck.rows.length > 0) {
      log(`⚠️  Phone number ${testPhoneNumberId} already exists, skipping...`, 'yellow');
    } else {
      await pool.query(
        `INSERT INTO phone_numbers (id, user_id, platform, meta_phone_number_id, access_token, display_name, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        [testPhoneNumberId, testUserId, 'whatsapp', testExternalNumber, testAccessToken, testExternalNumber]
      );
      log(`✅ Created phone number: ${testPhoneNumberId} (${testExternalNumber})`, 'green');
    }

    log('\n🤖 Creating Test Agent...', 'yellow');
    
    // Check if agent exists
    const agentCheck = await pool.query('SELECT agent_id FROM agents WHERE agent_id = $1', [testAgentId]);
    
    if (agentCheck.rows.length > 0) {
      log(`⚠️  Agent ${testAgentId} already exists, skipping...`, 'yellow');
    } else {
      await pool.query(
        `INSERT INTO agents (agent_id, user_id, phone_number_id, prompt_id, name, created_at) 
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [testAgentId, testUserId, testPhoneNumberId, testPromptId, testAgentName]
      );
      log(`✅ Created agent: ${testAgentId} (${testAgentName})`, 'green');
    }

    log('\n💰 Adding Test Credits...', 'yellow');
    
    // Check if credits exist
    const creditsCheck = await pool.query('SELECT user_id FROM credits WHERE user_id = $1', [testUserId]);
    
    if (creditsCheck.rows.length > 0) {
      // Update credits
      await pool.query(
        'UPDATE credits SET remaining_credits = remaining_credits + 1000 WHERE user_id = $1',
        [testUserId]
      );
      log(`✅ Added 1000 credits to existing balance`, 'green');
    } else {
      await pool.query(
        'INSERT INTO credits (user_id, remaining_credits) VALUES ($1, $2)',
        [testUserId, 1000]
      );
      log(`✅ Created credits: 1000 credits`, 'green');
    }

    // Verify data
    log('\n🔍 Verifying Created Data...', 'cyan');
    
    const userData = await pool.query('SELECT * FROM users WHERE user_id = $1', [testUserId]);
    const phoneData = await pool.query('SELECT * FROM phone_numbers WHERE id = $1', [testPhoneNumberId]);
    const agentData = await pool.query('SELECT * FROM agents WHERE agent_id = $1', [testAgentId]);
    const creditsData = await pool.query('SELECT * FROM credits WHERE user_id = $1', [testUserId]);

    log('\n📊 Test Data Summary:', 'blue');
    log('─'.repeat(50), 'blue');
    log(`User ID: ${userData.rows[0].user_id}`, 'blue');
    log(`Email: ${userData.rows[0].email}`, 'blue');
    log(`Company: ${userData.rows[0].company_name}`, 'blue');
    log('', 'blue');
    log(`Phone Number ID: ${phoneData.rows[0].id}`, 'blue');
    log(`Meta Phone Number: ${phoneData.rows[0].meta_phone_number_id}`, 'blue');
    log(`Platform: ${phoneData.rows[0].platform}`, 'blue');
    log(`Display Name: ${phoneData.rows[0].display_name}`, 'blue');
    log('', 'blue');
    log(`Agent ID: ${agentData.rows[0].agent_id}`, 'blue');
    log(`Agent Name: ${agentData.rows[0].name}`, 'blue');
    log(`Prompt ID: ${agentData.rows[0].prompt_id}`, 'blue');
    log('', 'blue');
    log(`Credits: ${creditsData.rows[0].remaining_credits}`, 'blue');
    log('─'.repeat(50), 'blue');

    await pool.end();

    log('\n═══════════════════════════════════════════════════', 'green');
    log('   ✅ TEST DATA SEEDED SUCCESSFULLY', 'green');
    log('═══════════════════════════════════════════════════', 'green');

    log('\n💡 Next Steps:', 'cyan');
    log('   1. Run the webhook test:', 'cyan');
    log('      node scripts/test-webhook.js', 'cyan');
    log('', 'cyan');
    log('   2. Or send a manual webhook:', 'cyan');
    log('      curl -X POST http://localhost:3000/webhook/meta \\', 'cyan');
    log('        -H "Content-Type: application/json" \\', 'cyan');
    log('        -d \'{"phone_number_id":"test-phone-001","customer_phone":"+19876543210","message_text":"Hello!","timestamp":"2024-01-15T10:00:00Z","platform_type":"whatsapp"}\'', 'cyan');

  } catch (error) {
    log(`\n❌ Error seeding data: ${error.message}`, 'red');
    console.error(error);
    await pool.end();
    process.exit(1);
  }
}

seedTestData();
