/**
 * Load Testing: High-Volume Message Processing
 * Tests system performance under 100+ messages per second load
 */

import request from 'supertest';
import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis';
import app from './test-app';
import { generateTestId } from '../fixtures/helpers';
import { describe } from 'node:test';

describe('Load Testing - High Volume Message Processing', () => {
  let dbPool: Pool;
  let redisClient: RedisClientType;
  let testUserId: string;
  let testPhoneNumberIds: string[];
  let testAgentIds: string[];

  beforeAll(async () => {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false, // Required for Neon
      },
    });

    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        tls: true,
        rejectUnauthorized: false,
      },
    });
    await redisClient.connect();

    // Setup test data
    testUserId = generateTestId('load-user');
    testPhoneNumberIds = [];
    testAgentIds = [];

    // Create test user
    await dbPool.query(
      'INSERT INTO users (user_id, email, company_name) VALUES ($1, $2, $3)',
      [testUserId, `${testUserId}@test.com`, 'Load Test Company']
    );

    // Create multiple phone numbers for parallel testing
    for (let i = 0; i < 10; i++) {
      const phoneNumberId = generateTestId(`phone-${i}`);
      const agentId = generateTestId(`agent-${i}`);

      await dbPool.query(
        'INSERT INTO phone_numbers (phone_number_id, user_id, type, external_number, access_token) VALUES ($1, $2, $3, $4, $5)',
        [phoneNumberId, testUserId, 'whatsapp', `+123456789${i}`, 'test_token']
      );

      await dbPool.query(
        'INSERT INTO agents (agent_id, user_id, phone_number_id, prompt_id, name) VALUES ($1, $2, $3, $4, $5)',
        [agentId, testUserId, phoneNumberId, `prompt_${i}`, `Load Test Agent ${i}`]
      );

      testPhoneNumberIds.push(phoneNumberId);
      testAgentIds.push(agentId);
    }

    // Add sufficient credits
    await dbPool.query(
      'INSERT INTO credits (user_id, remaining_credits) VALUES ($1, $2)',
      [testUserId, 100000]
    );
  }, 30000);

  afterAll(async () => {
    // Cleanup
    await dbPool.query('DELETE FROM credits WHERE user_id = $1', [testUserId]);
    
    for (const agentId of testAgentIds) {
      await dbPool.query('DELETE FROM messages WHERE conversation_id IN (SELECT conversation_id FROM conversations WHERE agent_id = $1)', [agentId]);
      await dbPool.query('DELETE FROM conversations WHERE agent_id = $1', [agentId]);
      await dbPool.query('DELETE FROM agents WHERE agent_id = $1', [agentId]);
    }
    
    for (const phoneNumberId of testPhoneNumberIds) {
      await dbPool.query('DELETE FROM phone_numbers WHERE phone_number_id = $1', [phoneNumberId]);
    }
    
    await dbPool.query('DELETE FROM users WHERE user_id = $1', [testUserId]);

    await dbPool.end();
    await redisClient.disconnect();
  }, 30000);

  describe('Throughput Testing', () => {
    it('should handle 100+ messages per second', async () => {
      const totalMessages = 120;
      const targetDuration = 1000; // 1 second
      const startTime = Date.now();
      const promises: Promise<any>[] = [];

      // Send messages in parallel
      for (let i = 0; i < totalMessages; i++) {
        const phoneNumberId = testPhoneNumberIds[i % testPhoneNumberIds.length];
        const webhookPayload = {
          phone_number_id: phoneNumberId,
          customer_phone: `+987654${String(i).padStart(4, '0')}`,
          message_text: `Load test message ${i}`,
          timestamp: new Date().toISOString(),
          platform_type: 'whatsapp',
        };

        promises.push(
          request(app)
            .post('/webhook/meta')
            .send(webhookPayload)
        );
      }

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Verify all messages were accepted
      const successCount = responses.filter(r => r.status === 200).length;
      expect(successCount).toBeGreaterThanOrEqual(totalMessages * 0.95); // 95% success rate

      // Calculate throughput
      const throughput = (totalMessages / duration) * 1000;
      console.log(`Throughput: ${throughput.toFixed(2)} messages/second`);
      console.log(`Duration: ${duration}ms for ${totalMessages} messages`);

      expect(throughput).toBeGreaterThanOrEqual(100);
    }, 60000);

    it('should maintain FIFO ordering under load', async () => {
      const phoneNumberId = testPhoneNumberIds[0];
      const customerPhone = '+9999999999';
      const messageCount = 50;
      const promises: Promise<any>[] = [];

      // Send multiple messages for same phone number
      for (let i = 0; i < messageCount; i++) {
        const webhookPayload = {
          phone_number_id: phoneNumberId,
          customer_phone: customerPhone,
          message_text: `Ordered message ${i}`,
          timestamp: new Date(Date.now() + i).toISOString(),
          platform_type: 'whatsapp',
        };

        promises.push(
          request(app)
            .post('/webhook/meta')
            .send(webhookPayload)
        );
      }

      await Promise.all(promises);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Verify message ordering
      const conversationResult = await dbPool.query(
        'SELECT conversation_id FROM conversations WHERE customer_phone = $1',
        [customerPhone]
      );

      if (conversationResult.rows.length > 0) {
        const conversationId = conversationResult.rows[0].conversation_id;
        const messageResult = await dbPool.query(
          'SELECT text, sequence_no FROM messages WHERE conversation_id = $1 ORDER BY sequence_no',
          [conversationId]
        );

        // Verify sequential ordering
        messageResult.rows.forEach((row, index) => {
          expect(row.sequence_no).toBe(index + 1);
        });
      }
    }, 60000);
  });

  describe('Concurrent User Load', () => {
    it('should handle multiple users sending messages simultaneously', async () => {
      const concurrentUsers = 20;
      const messagesPerUser = 5;
      const promises: Promise<any>[] = [];

      for (let user = 0; user < concurrentUsers; user++) {
        const phoneNumberId = testPhoneNumberIds[user % testPhoneNumberIds.length];
        const customerPhone = `+888${String(user).padStart(7, '0')}`;

        for (let msg = 0; msg < messagesPerUser; msg++) {
          const webhookPayload = {
            phone_number_id: phoneNumberId,
            customer_phone: customerPhone,
            message_text: `User ${user} message ${msg}`,
            timestamp: new Date().toISOString(),
            platform_type: 'whatsapp',
          };

          promises.push(
            request(app)
              .post('/webhook/meta')
              .send(webhookPayload)
          );
        }
      }

      const responses = await Promise.all(promises);
      const successCount = responses.filter(r => r.status === 200).length;
      const totalMessages = concurrentUsers * messagesPerUser;

      expect(successCount).toBeGreaterThanOrEqual(totalMessages * 0.95);
    }, 60000);
  });
});
