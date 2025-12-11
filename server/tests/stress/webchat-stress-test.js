/**
 * WebChat Stress Test
 * 
 * Creates 50 new sessions per second for 30 seconds (1500 total sessions)
 * Tests with 10 agents for user_id: user_test_webchat
 * Measures response times and system performance
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// Configuration
const CONFIG = {
  BASE_URL: process.env.BASE_URL || 'http://127.0.0.1:3000', // Use 127.0.0.1 instead of localhost to avoid IPv6 issues
  USER_ID: 'user_test_webchat',
  PROMPT_ID: 'pmpt_68de2bd80fa08196ab95184e7787c6e30c231f4a29f082a0', // Specific prompt ID to use
  NUM_AGENTS: 10,
  SESSIONS_PER_SECOND: 100, // CAPACITY TEST: 100 msg/sec burst
  TEST_DURATION_SECONDS: 2, // 2 seconds = 200 messages
  MONITOR_DURATION_SECONDS: 60, // Monitor for 60 seconds after burst
  SUCCESS_THRESHOLD_MS: 30000, // 30 seconds (generous timeout)
  MESSAGE_TEXT: 'Capacity test message'
};

// Statistics tracking
const stats = {
  totalSessions: 0,
  successfulSessions: 0,
  failedSessions: 0,
  responseTimes: [],
  errors: [],
  startTime: null,
  endTime: null,
  monitoringEndTime: null,
  agentIds: [],
  sessionIds: [],
  workerSnapshots: []
};

// Helper to create webchat channel (which creates agent + phone_number)
async function createAgent(agentNumber) {
  try {
    const response = await axios.post(
      `${CONFIG.BASE_URL}/api/users/${CONFIG.USER_ID}/webchat/channels`,
      {
        prompt_id: CONFIG.PROMPT_ID,
        name: `Stress Test Agent ${agentNumber}`,
        system_prompt: `You are a helpful customer service agent #${agentNumber}. Be concise and friendly.`,
        extraction_prompt: 'Extract: name, email, company, intent',
        widget_config: {
          title: `Agent ${agentNumber}`,
          subtitle: 'Stress Test',
          welcome_message: `Hi! I'm Agent ${agentNumber}. How can I help?`,
          placeholder: 'Type your message...'
        }
      }
    );
    
    // Response has nested structure: { success: true, data: { webchat_id, agent_id, ... } }
    const data = response.data.data || response.data;
    
    if (!data || !data.webchat_id) {
      console.error(`Invalid response for agent ${agentNumber}:`, response.data);
      throw new Error('No webchat_id in response');
    }
    
    return {
      agent_id: data.agent_id,
      webchat_id: data.webchat_id
    };
  } catch (error) {
    console.error(`Failed to create agent ${agentNumber}:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

// Helper to send message and measure FULL response time (including AI response)
async function sendMessageAndMeasure(webchatId, sessionId) {
  const startTime = Date.now();
  
  // Step 1: POST message (like widget does)
  const postUrl = `${CONFIG.BASE_URL}/api/webchat/${webchatId}/messages`;
  const payload = {
    message: CONFIG.MESSAGE_TEXT,
    session_id: sessionId,
    visitor_phone: sessionId,
    visitor_name: 'Stress Test User'
  };
  
  try {
    // Send message
    const postResponse = await axios({
      method: 'POST',
      url: postUrl,
      data: payload,
      timeout: 5000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!postResponse.data || !postResponse.data.success) {
      throw new Error('Message post failed');
    }

    const conversationId = postResponse.data.data.conversation_id;
    
    // Step 2: Wait for AI response by checking database directly
    // This simulates the SSE experience without the complexity
    const { Pool } = require('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
    });
    
    const maxWaitTime = CONFIG.SUCCESS_THRESHOLD_MS;
    const pollInterval = 200; // Check every 200ms
    const maxAttempts = Math.floor(maxWaitTime / pollInterval);
    
    try {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
        try {
          // Check database for agent response (correct column names: sender='agent', timestamp)
          const result = await pool.query(
            `SELECT COUNT(*) as count FROM messages 
             WHERE conversation_id = $1 
             AND sender = 'agent' 
             AND timestamp > $2`,
            [conversationId, new Date(startTime)]
          );
          
          if (result.rows[0] && parseInt(result.rows[0].count) > 0) {
            const responseTime = Date.now() - startTime;
            await pool.end();
            return {
              success: true,
              responseTime,
              sessionId,
              webchatId,
              conversationId,
              fullRoundTrip: true
            };
          }
        } catch (dbError) {
          // Continue polling
        }
      }
      
      await pool.end();
    } catch (poolError) {
      // Pool error
    }
    
    // Timeout - no AI response received
    const responseTime = Date.now() - startTime;
    return {
      success: false,
      responseTime,
      sessionId,
      webchatId,
      conversationId,
      error: 'Timeout waiting for AI response',
      fullRoundTrip: false
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return {
      success: false,
      responseTime,
      sessionId,
      webchatId,
      error: error.message,
      fullRoundTrip: false
    };
  }
}

// Create a single session
async function createSession(webchatId) {
  const sessionId = uuidv4();
  stats.totalSessions++;
  stats.sessionIds.push(sessionId);
  
  const result = await sendMessageAndMeasure(webchatId, sessionId);
  
  if (result.success) {
    stats.successfulSessions++;
    stats.responseTimes.push(result.responseTime);
  } else {
    stats.failedSessions++;
    stats.errors.push({
      sessionId: result.sessionId,
      webchatId: result.webchatId,
      error: result.error,
      responseTime: result.responseTime
    });
  }
  
  return result;
}

// Monitor worker processing after burst
async function monitorWorkerProcessing() {
  console.log('\n📊 Monitoring worker processing for ${CONFIG.MONITOR_DURATION_SECONDS} seconds...\n');
  
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
  });
  
  const monitorInterval = setInterval(async () => {
    try {
      // Get queue depth
      const queueResult = await pool.query(`
        SELECT COUNT(*) as pending
        FROM messages 
        WHERE sender = 'user' 
        AND timestamp > NOW() - INTERVAL '2 minutes'
        AND conversation_id NOT IN (
          SELECT DISTINCT conversation_id 
          FROM messages 
          WHERE sender = 'agent'
          AND timestamp > NOW() - INTERVAL '2 minutes'
        )
      `);
      
      // Get processing stats
      const processResult = await pool.query(`
        SELECT 
          COUNT(CASE WHEN sender = 'user' THEN 1 END) as user_msgs,
          COUNT(CASE WHEN sender = 'agent' THEN 1 END) as agent_msgs
        FROM messages 
        WHERE timestamp > $1
      `, [new Date(stats.startTime)]);
      
      const snapshot = {
        time: ((Date.now() - stats.startTime) / 1000).toFixed(1),
        queue: parseInt(queueResult.rows[0].pending),
        sent: parseInt(processResult.rows[0].user_msgs),
        processed: parseInt(processResult.rows[0].agent_msgs),
        rate: 0
      };
      
      if (stats.workerSnapshots.length > 0) {
        const prev = stats.workerSnapshots[stats.workerSnapshots.length - 1];
        const timeDiff = (Date.now() - prev.timestamp) / 1000;
        const msgDiff = snapshot.processed - prev.processed;
        snapshot.rate = (msgDiff / timeDiff).toFixed(1);
      }
      
      snapshot.timestamp = Date.now();
      stats.workerSnapshots.push(snapshot);
      
      process.stdout.write(
        `  [${snapshot.time}s] Queue: ${snapshot.queue} | ` +
        `Sent: ${snapshot.sent} | Processed: ${snapshot.processed} | ` +
        `Rate: ${snapshot.rate}/s     \r`
      );
    } catch (error) {
      // Continue monitoring
    }
  }, 1000);
  
  await new Promise(resolve => setTimeout(resolve, CONFIG.MONITOR_DURATION_SECONDS * 1000));
  clearInterval(monitorInterval);
  
  await pool.end();
  stats.monitoringEndTime = Date.now();
  
  console.log('\n\n✅ Monitoring complete\n');
}

// Create sessions at specified rate
async function runStressTest() {
  console.log('\n🚀 Starting WebChat Stress Test\n');
  console.log('Configuration:');
  console.log(`  - Base URL: ${CONFIG.BASE_URL}`);
  console.log(`  - User ID: ${CONFIG.USER_ID}`);
  console.log(`  - Prompt ID: ${CONFIG.PROMPT_ID}`);
  console.log(`  - Agents: ${CONFIG.NUM_AGENTS}`);
  console.log(`  - Sessions/second: ${CONFIG.SESSIONS_PER_SECOND}`);
  console.log(`  - Duration: ${CONFIG.TEST_DURATION_SECONDS} seconds`);
  console.log(`  - Success threshold: ${CONFIG.SUCCESS_THRESHOLD_MS}ms`);
  console.log(`  - Expected total sessions: ${CONFIG.SESSIONS_PER_SECOND * CONFIG.TEST_DURATION_SECONDS}\n`);

  // Step 1: Create webchat channels (agents)
  console.log('📝 Creating webchat channels...');
  for (let i = 1; i <= CONFIG.NUM_AGENTS; i++) {
    try {
      const result = await createAgent(i);
      stats.agentIds.push(result.webchat_id); // Use webchat_id for sending messages
      process.stdout.write(`  Channel ${i}/${CONFIG.NUM_AGENTS} created (${result.webchat_id})\r`);
    } catch (error) {
      console.error(`\n❌ Failed to create channel ${i}. Aborting test.`);
      process.exit(1);
    }
  }
  console.log(`\n✅ All ${CONFIG.NUM_AGENTS} webchat channels created\n`);

  // Step 2: Run stress test
  console.log('🔥 Starting stress test...\n');
  stats.startTime = Date.now();
  
  const intervalMs = 1000 / CONFIG.SESSIONS_PER_SECOND;
  const endTime = stats.startTime + (CONFIG.TEST_DURATION_SECONDS * 1000);
  
  let sessionCount = 0;
  const promises = [];
  
  // Create sessions at specified rate
  const interval = setInterval(() => {
    const now = Date.now();
    
    if (now >= endTime) {
      clearInterval(interval);
      return;
    }
    
    // Select random webchat channel
    const webchatId = stats.agentIds[Math.floor(Math.random() * stats.agentIds.length)];
    
    // Create session (non-blocking)
    const promise = createSession(webchatId);
    promises.push(promise);
    
    sessionCount++;
    
    // Progress update every second
    if (sessionCount % CONFIG.SESSIONS_PER_SECOND === 0) {
      const elapsed = Math.floor((now - stats.startTime) / 1000);
      const remaining = CONFIG.TEST_DURATION_SECONDS - elapsed;
      process.stdout.write(
        `  Progress: ${sessionCount} sessions created | ` +
        `${elapsed}s elapsed | ${remaining}s remaining | ` +
        `Success: ${stats.successfulSessions} | Failed: ${stats.failedSessions}\r`
      );
    }
  }, intervalMs);
  
  // Wait for test duration
  await new Promise(resolve => setTimeout(resolve, CONFIG.TEST_DURATION_SECONDS * 1000 + 1000));
  
  // Wait for all pending requests to complete (with timeout)
  console.log('\n\n⏳ Waiting for all requests to complete...');
  await Promise.allSettled(promises);
  
  stats.endTime = Date.now();
  
  // Step 3: Monitor worker processing
  await monitorWorkerProcessing();
  
  // Step 4: Calculate and display statistics
  displayResults();
}

// Display test results
function displayResults() {
  console.log('\n\n' + '='.repeat(80));
  console.log('📊 STRESS TEST RESULTS');
  console.log('='.repeat(80) + '\n');
  
  // Basic stats
  console.log('Session Statistics:');
  console.log(`  Total sessions created: ${stats.totalSessions}`);
  console.log(`  Successful: ${stats.successfulSessions} (${((stats.successfulSessions / stats.totalSessions) * 100).toFixed(2)}%)`);
  console.log(`  Failed: ${stats.failedSessions} (${((stats.failedSessions / stats.totalSessions) * 100).toFixed(2)}%)`);
  
  // Response time statistics
  if (stats.responseTimes.length > 0) {
    const sortedTimes = stats.responseTimes.sort((a, b) => a - b);
    const avgTime = sortedTimes.reduce((a, b) => a + b, 0) / sortedTimes.length;
    const minTime = sortedTimes[0];
    const maxTime = sortedTimes[sortedTimes.length - 1];
    const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
    const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
    const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
    
    const underThreshold = sortedTimes.filter(t => t <= CONFIG.SUCCESS_THRESHOLD_MS).length;
    const passRate = (underThreshold / sortedTimes.length) * 100;
    
    console.log('\nResponse Time Statistics (successful requests):');
    console.log(`  Average: ${avgTime.toFixed(2)}ms`);
    console.log(`  Minimum: ${minTime}ms`);
    console.log(`  Maximum (longest wait): ${maxTime}ms`);
    console.log(`  Median (P50): ${p50}ms`);
    console.log(`  P95: ${p95}ms`);
    console.log(`  P99: ${p99}ms`);
    console.log(`\n  Under ${CONFIG.SUCCESS_THRESHOLD_MS}ms threshold: ${underThreshold}/${sortedTimes.length} (${passRate.toFixed(2)}%)`);
    
    // Pass/Fail determination
    console.log('\nTest Result:');
    if (passRate >= 95) {
      console.log(`  ✅ PASS - ${passRate.toFixed(2)}% of requests under ${CONFIG.SUCCESS_THRESHOLD_MS}ms`);
    } else {
      console.log(`  ❌ FAIL - Only ${passRate.toFixed(2)}% of requests under ${CONFIG.SUCCESS_THRESHOLD_MS}ms (need 95%)`);
    }
  }
  
  // Throughput
  const burstDuration = (stats.endTime - stats.startTime) / 1000;
  const actualThroughput = stats.totalSessions / burstDuration;
  
  console.log('\nBurst Phase:');
  console.log(`  Duration: ${burstDuration.toFixed(2)}s`);
  console.log(`  Messages sent: ${stats.totalSessions}`);
  console.log(`  Actual rate: ${actualThroughput.toFixed(2)} msg/s`);
  console.log(`  Target rate: ${CONFIG.SESSIONS_PER_SECOND} msg/s`);
  
  // Worker performance
  if (stats.workerSnapshots.length > 0) {
    const maxQueue = Math.max(...stats.workerSnapshots.map(s => s.queue));
    const peakRate = Math.max(...stats.workerSnapshots.map(s => parseFloat(s.rate) || 0));
    const totalMonitorTime = (stats.monitoringEndTime - stats.startTime) / 1000;
    
    console.log('\nWorker Performance:');
    console.log(`  Peak queue depth: ${maxQueue} messages`);
    console.log(`  Peak processing rate: ${peakRate} msg/s`);
    console.log(`  Total monitoring time: ${totalMonitorTime.toFixed(1)}s`);
    
    const drained = stats.workerSnapshots.find(s => s.queue === 0);
    if (drained) {
      console.log(`  Queue drained at: ${drained.time}s`);
    } else {
      console.log(`  Queue not fully drained within monitoring period`);
    }
    
    console.log('\n  Timeline (every 5 seconds):');
    console.log('  Time | Queue | Sent | Processed | Rate/s');
    console.log('  ' + '-'.repeat(50));
    
    stats.workerSnapshots
      .filter((_, idx) => idx % 5 === 0 || idx === stats.workerSnapshots.length - 1)
      .forEach(s => {
        console.log(
          `  ${s.time.padStart(4)}s | ` +
          `${String(s.queue).padStart(5)} | ` +
          `${String(s.sent).padStart(4)} | ` +
          `${String(s.processed).padStart(9)} | ` +
          `${String(s.rate).padStart(6)}`
        );
      });
  }
  
  // Error summary
  if (stats.errors.length > 0) {
    console.log('\nError Summary:');
    const errorTypes = {};
    stats.errors.forEach(err => {
      errorTypes[err.error] = (errorTypes[err.error] || 0) + 1;
    });
    
    Object.entries(errorTypes).forEach(([error, count]) => {
      console.log(`  ${error}: ${count} occurrences`);
    });
    
    // Show first 5 errors
    console.log('\nFirst 5 Errors:');
    stats.errors.slice(0, 5).forEach((err, idx) => {
      console.log(`  ${idx + 1}. Session ${err.sessionId.substring(0, 8)}... - ${err.error}`);
    });
  }
  
  console.log('\n' + '='.repeat(80) + '\n');
  
  // Save detailed results to file
  saveResultsToFile();
}

// Save results to JSON file
function saveResultsToFile() {
  const fs = require('fs');
  const path = require('path');
  
  const results = {
    config: CONFIG,
    timestamp: new Date().toISOString(),
    summary: {
      totalSessions: stats.totalSessions,
      successfulSessions: stats.successfulSessions,
      failedSessions: stats.failedSessions,
      successRate: ((stats.successfulSessions / stats.totalSessions) * 100).toFixed(2) + '%',
      testDuration: ((stats.endTime - stats.startTime) / 1000).toFixed(2) + 's',
      actualThroughput: (stats.totalSessions / ((stats.endTime - stats.startTime) / 1000)).toFixed(2) + ' sessions/sec'
    },
    responseTimes: stats.responseTimes.length > 0 ? {
      average: (stats.responseTimes.reduce((a, b) => a + b, 0) / stats.responseTimes.length).toFixed(2) + 'ms',
      min: Math.min(...stats.responseTimes) + 'ms',
      max: Math.max(...stats.responseTimes) + 'ms',
      p50: stats.responseTimes.sort((a, b) => a - b)[Math.floor(stats.responseTimes.length * 0.5)] + 'ms',
      p95: stats.responseTimes.sort((a, b) => a - b)[Math.floor(stats.responseTimes.length * 0.95)] + 'ms',
      p99: stats.responseTimes.sort((a, b) => a - b)[Math.floor(stats.responseTimes.length * 0.99)] + 'ms'
    } : null,
    errors: stats.errors,
    agentIds: stats.agentIds
  };
  
  const filename = `stress-test-results-${Date.now()}.json`;
  const filepath = path.join(__dirname, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  console.log(`📄 Detailed results saved to: ${filepath}\n`);
}

// Run the test
if (require.main === module) {
  runStressTest().catch(error => {
    console.error('\n❌ Test failed with error:', error);
    process.exit(1);
  });
}

module.exports = { runStressTest, CONFIG };
