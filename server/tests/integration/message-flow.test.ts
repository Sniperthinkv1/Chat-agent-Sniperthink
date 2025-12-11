/**
 * Integration Test: End-to-End Message Flow
 * Tests the complete message processing pipeline from webhook to delivery
 */

import request from 'supertest';
import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis';
import app from './test-app';
import { generateTestId } from '../fixtures/helpers';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('Message Flow Integration Tests', () => {
  let dbPool: Pool;
  let redisClient: RedisClientType;
  let testUserId: string;
  let testPhoneNumberId: string;
  let testAgentId: string;

  beforeAll(async () => {
    // Initialize real database and Redis connections for integration testing
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
  });

  afterAll(async () => {
    await dbPool.end();
    await redisClient.disconnect();
  });

  beforeEach(async () => {
    // Setup test data
    testUserId = generateTestId('user');
    testPhoneNumberId = generateTestId('phone');
    testAgentId = generateTestId('agent');

    // Create test user
    await dbPool.query(
      'INSERT INTO users (user_id, email, company_name) VALUES ($1, $2, $3)',
      [testUserId, `${testUserId}@test.com`, 'Test Company']
    );

    // Create test phone number
    await dbPool.query(
      'INSERT INTO phone_numbers (phone_number_id, user_id, type, external_number, access_token) VALUES ($1, $2, $3, $4, $5)',
      [testPhoneNumberId, testUserId, 'whatsapp', '+1234567890', 'test_token']
    );

    // Create test agent
    await dbPool.query(
      'INSERT INTO agents (agent_id, user_id, phone_number_id, prompt_id, name) VALUES ($1, $2, $3, $4, $5)',
      [testAgentId, testUserId, testPhoneNumberId, 'prompt_123', 'Test Agent']
    );

    // Add credits
    await dbPool.query(
      'INSERT INTO credits (user_id, remaining_credits) VALUES ($1, $2)',
      [testUserId, 1000]
    );
  });

  afterEach(async () => {
    // Cleanup test data
    await dbPool.query('DELETE FROM credits WHERE user_id = $1', [testUserId]);
    await dbPool.query('DELETE FROM messages WHERE conversation_id IN (SELECT conversation_id FROM conversations WHERE agent_id = $1)', [testAgentId]);
    await dbPool.query('DELETE FROM conversations WHERE agent_id = $1', [testAgentId]);
    await dbPool.query('DELETE FROM agents WHERE agent_id = $1', [testAgentId]);
    await dbPool.query('DELETE FROM phone_numbers WHERE phone_number_id = $1', [testPhoneNumberId]);
    await dbPool.query('DELETE FROM users WHERE user_id = $1', [testUserId]);

    // Clear Redis cache
    const keys = await redisClient.keys(`*${testUserId}*`);
    if (keys.length > 0) {
      await redisClient.del(keys);
    }
  });

  describe('Webhook to Database Flow', () => {
    it('should receive webhook, enqueue message, and store in database', async () => {
      const webhookPayload = {
        phone_number_id: testPhoneNumberId,
        customer_phone: '+9876543210',
        message_text: 'Hello, I need help',
        timestamp: new Date().toISOString(),
        platform_type: 'whatsapp',
      };

      // Send webhook request
      const response = await request(app)
        .post('/webhook/meta')
        .send(webhookPayload)
        .expect(200);

      expect(response.body).toHaveProperty('status', 'queued');

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify conversation was created
      const conversationResult = await dbPool.query(
        'SELECT * FROM conversations WHERE agent_id = $1 AND customer_phone = $2',
        [testAgentId, webhookPayload.customer_phone]
      );

      expect(conversationResult.rows.length).toBeGreaterThan(0);

      // Verify message was stored
      const messageResult = await dbPool.query(
        'SELECT * FROM messages WHERE conversation_id = $1',
        [conversationResult.rows[0].conversation_id]
      );

      expect(messageResult.rows.length).toBeGreaterThan(0);
      expect(messageResult.rows[0].text).toBe(webhookPayload.message_text);
    });
  });

  describe('Credit Validation Flow', () => {
    it('should reject message processing when credits are insufficient', async () => {
      // Set credits to 0
      await dbPool.query(
        'UPDATE credits SET remaining_credits = 0 WHERE user_id = $1',
        [testUserId]
      );

      const webhookPayload = {
        phone_number_id: testPhoneNumberId,
        customer_phone: '+9876543210',
        message_text: 'Hello',
        timestamp: new Date().toISOString(),
        platform_type: 'whatsapp',
      };

      const response = await request(app)
        .post('/webhook/meta')
        .send(webhookPayload)
        .expect(402);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Insufficient credits');
    });
  });

  describe('Conversation Context Persistence', () => {
    it('should maintain conversation context across multiple messages', async () => {
      const customerPhone = '+9876543210';
      const messages = [
        'Hello, I need help',
        'What are your prices?',
        'Can I schedule a demo?',
      ];

      let conversationId: string | null = null;

      for (const messageText of messages) {
        const webhookPayload = {
          phone_number_id: testPhoneNumberId,
          customer_phone: customerPhone,
          message_text: messageText,
          timestamp: new Date().toISOString(),
          platform_type: 'whatsapp',
        };

        await request(app)
          .post('/webhook/meta')
          .send(webhookPayload)
          .expect(200);

        // Wait for processing
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Verify all messages belong to same conversation
      const conversationResult = await dbPool.query(
        'SELECT conversation_id FROM conversations WHERE agent_id = $1 AND customer_phone = $2',
        [testAgentId, customerPhone]
      );

      expect(conversationResult.rows.length).toBe(1);
      conversationId = conversationResult.rows[0].conversation_id;

      const messageResult = await dbPool.query(
        'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY sequence_no',
        [conversationId]
      );

      expect(messageResult.rows.length).toBe(messages.length);
      messageResult.rows.forEach((row, index) => {
        expect(row.text).toBe(messages[index]);
        expect(row.sequence_no).toBe(index + 1);
      });
    });
  });
});
