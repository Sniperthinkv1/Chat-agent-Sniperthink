/**
 * Simple test: Send 10 messages and wait for responses
 * Tests if we can detect AI responses in the database
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { Pool } = require('pg');
require('dotenv').config();

const BASE_URL = 'http://127.0.0.1:3000';
const USER_ID = 'user_test_webchat';
const PROMPT_ID = 'pmpt_68de2bd80fa08196ab95184e7787c6e30c231f4a29f082a0';
const NUM_MESSAGES = 10;

async function testMessages() {
  console.log('\n🧪 Testing 10 Messages with Database Detection\n');
  
  // Step 1: Create one webchat channel
  console.log('Creating webchat channel...');
  const channelResponse = await axios.post(
    `${BASE_URL}/api/users/${USER_ID}/webchat/channels`,
    {
      prompt_id: PROMPT_ID,
      name: 'Test Channel',
      system_prompt: 'You are a helpful assistant. Be brief.',
      extraction_prompt: 'Extract: name, email',
      widget_config: {
        title: 'Test',
        subtitle: 'Testing',
        welcome_message: 'Hi!',
        placeholder: 'Type...'
      }
    }
  );
  
  const webchatId = channelResponse.data.data.webchat_id;
  console.log(`✅ Channel created: ${webchatId}\n`);
  
  // Step 2: Send 10 messages (one per session)
  console.log(`Sending ${NUM_MESSAGES} messages...\n`);
  const sessions = [];
  
  for (let i = 1; i <= NUM_MESSAGES; i++) {
    const sessionId = uuidv4();
    const startTime = Date.now();
    
    try {
      // Send message
      const response = await axios.post(
        `${BASE_URL}/api/webchat/${webchatId}/messages`,
        {
          message: `Test message ${i}: Hello, can you help me?`,
          session_id: sessionId,
          visitor_phone: sessionId,
          visitor_name: `Test User ${i}`
        }
      );
      
      const conversationId = response.data.data.conversation_id;
      
      sessions.push({
        number: i,
        sessionId,
        conversationId,
        startTime,
        status: 'sent'
      });
      
      console.log(`  ${i}. Sent - Session: ${sessionId.substring(0, 8)}... Conv: ${conversationId}`);
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`  ${i}. ❌ Failed: ${error.message}`);
    }
  }
  
  console.log(`\n✅ All ${sessions.length} messages sent!\n`);
  
  // Step 3: Wait for AI responses
  console.log('Waiting for AI responses (checking database)...\n');
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  
  const maxWaitTime = 30000; // 30 seconds max
  const checkInterval = 1000; // Check every second
  const maxChecks = Math.floor(maxWaitTime / checkInterval);
  
  for (let check = 0; check < maxChecks; check++) {
    await new Promise(resolve => setTimeout(resolve, checkInterval));
    
    // Check each session for AI response
    for (const session of sessions) {
      if (session.status === 'sent') {
        try {
          // First check: How many messages total in this conversation?
          const totalResult = await pool.query(
            `SELECT COUNT(*) as count, 
                    MAX(CASE WHEN sender = 'agent' THEN 1 ELSE 0 END) as has_agent
             FROM messages 
             WHERE conversation_id = $1`,
            [session.conversationId]
          );
          
          // Check for agent response after our message
          const result = await pool.query(
            `SELECT COUNT(*) as count FROM messages 
             WHERE conversation_id = $1 
             AND sender = 'agent' 
             AND timestamp > $2`,
            [session.conversationId, new Date(session.startTime)]
          );
          
          const totalCount = parseInt(totalResult.rows[0]?.count || 0);
          const hasAgent = parseInt(totalResult.rows[0]?.has_agent || 0);
          const agentAfterStart = parseInt(result.rows[0]?.count || 0);
          
          // Debug on first check
          if (check === 0 && session.number === 1) {
            console.log(`\n  [Debug] Conv ${session.conversationId}:`);
            console.log(`    Total messages: ${totalCount}`);
            console.log(`    Has agent message: ${hasAgent}`);
            console.log(`    Agent messages after start: ${agentAfterStart}\n`);
          }
          
          if (agentAfterStart > 0) {
            const responseTime = Date.now() - session.startTime;
            session.status = 'responded';
            session.responseTime = responseTime;
            console.log(`  ✅ ${session.number}. Response received in ${responseTime}ms`);
          }
        } catch (error) {
          if (check === 0 && session.number === 1) {
            console.log(`  [Debug Error] ${error.message}`);
          }
        }
      }
    }
    
    // Check if all responded
    const allResponded = sessions.every(s => s.status === 'responded');
    if (allResponded) {
      console.log('\n🎉 All messages received responses!\n');
      break;
    }
    
    // Progress update
    const responded = sessions.filter(s => s.status === 'responded').length;
    process.stdout.write(`  Checking... ${responded}/${sessions.length} responded (${check + 1}s elapsed)\r`);
  }
  
  await pool.end();
  
  // Step 4: Summary
  console.log('\n\n' + '='.repeat(60));
  console.log('📊 TEST RESULTS');
  console.log('='.repeat(60) + '\n');
  
  const responded = sessions.filter(s => s.status === 'responded');
  const pending = sessions.filter(s => s.status === 'sent');
  
  console.log(`Total messages: ${sessions.length}`);
  console.log(`Responded: ${responded.length}`);
  console.log(`Pending: ${pending.length}\n`);
  
  if (responded.length > 0) {
    const times = responded.map(s => s.responseTime);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const min = Math.min(...times);
    const max = Math.max(...times);
    
    console.log('Response Times:');
    console.log(`  Average: ${avg.toFixed(0)}ms`);
    console.log(`  Fastest: ${min}ms`);
    console.log(`  Slowest: ${max}ms\n`);
  }
  
  if (pending.length > 0) {
    console.log('Pending sessions:');
    pending.forEach(s => {
      console.log(`  ${s.number}. ${s.conversationId}`);
    });
  }
  
  console.log('='.repeat(60) + '\n');
  
  if (responded.length === sessions.length) {
    console.log('✅ TEST PASSED - All messages received responses!\n');
  } else {
    console.log('⚠️  TEST INCOMPLETE - Some messages did not receive responses\n');
  }
}

// Run test
testMessages().catch(error => {
  console.error('\n❌ Test failed:', error.message);
  process.exit(1);
});
