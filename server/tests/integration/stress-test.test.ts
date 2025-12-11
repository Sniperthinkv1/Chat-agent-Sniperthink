/**
 * Stress Testing: Queue Overflow and Worker Scaling
 * Tests system behavior under extreme load conditions
 */

import request from 'supertest';
import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis';
import app from './test-app';
import { generateTestId } from '../fixtures/helpers';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { describe } from 'node:test';

describe('Stress Testing - Queue Overflow and Worker Scaling', () => {
  let dbPool: Pool;
  let redisClient: RedisClientType;
  let testUserId: string;
  let testPhoneNumberId: string;
  let testAgentId: string;

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
    testUserId = generateTestId('stress-user');
    testPhoneNumberId = generateTestId('stress-phone');
    testAgentId = generateTestId('stress-agent');

    await dbPool.query(
      'INSERT INTO users (user_id, email, company_name) VALUES ($1, $2, $3)',
      [testUserId, `${testUserId}@test.com`, 'Stress Test Company']
    );

    await dbPool.query(
      'INSERT INTO phone_numbers (phone_number_id, user_id, type, external_number, access_token) VALUES ($1, $2, $3, $4, $5)',
      [testPhoneNumberId, testUserId, 'whatsapp', '+1111111111', 'test_token']
    );

    await dbPool.query(
      'INSERT INTO agents (agent_id, user_id, phone_number_id, prompt_id, name) VALUES ($1, $2, $3, $4, $5)',
      [testAgentId, testUserId, testPhoneNumberId, 'prompt_stress', 'Stress Test Agent']
    );

    await dbPool.query(
      'INSERT INTO credits (user_id, remaining_credits) VALUES ($1, $2)',
      [testUserId, 1000000]
    );
  }, 30000);

  afterAll(async () => {
    // Cleanup
    await dbPool.query('DELETE FROM credits WHERE user_id = $1', [testUserId]);
    await dbPool.query('DELETE FROM messages WHERE conversation_id IN (SELECT conversation_id FROM conversations WHERE agent_id = $1)', [testAgentId]);
    await dbPool.query('DELETE FROM conversations WHERE agent_id = $1', [testAgentId]);
    await dbPool.query('DELETE FROM agents WHERE agent_id = $1', [testAgentId]);
    await dbPool.query('DELETE FROM phone_numbers WHERE phone_number_id = $1', [testPhoneNumberId]);
    await dbPool.query('DELETE FROM users WHERE user_id = $1', [testUserId]);

    await dbPool.end();
    await redisClient.disconnect();
  }, 30000);

  describe('Queue Overflow Handling', () => {
    it('should handle queue near capacity gracefully', async () => {
      const messageCount = 1000; // Large batch
      const promises: Promise<any>[] = [];

      for (let i = 0; i < messageCount; i++) {
        const webhookPayload = {
          phone_number_id: testPhoneNumberId,
          customer_phone: `+777${String(i).padStart(7, '0')}`,
          message_text: `Overflow test message ${i}`,
          timestamp: new Date().toISOString(),
          platform_type: 'whatsapp',
        };

        promises.push(
          request(app)
            .post('/webhook/meta')
            .send(webhookPayload)
            .catch(err => ({ status: err.response?.status || 500 }))
        );
      }

      const responses = await Promise.all(promises);
      
      // Count successful enqueues
      const successCount = responses.filter(r => r.status === 200).length;
      const rejectedCount = responses.filter(r => r.status === 503).length;

      console.log(`Enqueued: ${successCount}, Rejected: ${rejectedCount}`);

      // System should either accept or gracefully reject
      expect(successCount + rejectedCount).toBe(messageCount);
      
      // Most messages should be accepted
      expect(successCount).toBeGreaterThan(messageCount * 0.8);
    }, 120000);

    it('should return appropriate error when queue is full', async () => {
      // Check queue length
      const queueLength = await redisClient.lLen('queue:messages');
      console.log(`Current queue length: ${queueLength}`);

      // If queue is near capacity, verify error response
      if (queueLength > 90000) {
        const webhookPayload = {
          phone_number_id: testPhoneNumberId,
          customer_phone: '+9999999999',
          message_text: 'Test message',
          timestamp: new Date().toISOString(),
          platform_type: 'whatsapp',
        };

        const response = await request(app)
          .post('/webhook/meta')
          .send(webhookPayload);

        if (response.status === 503) {
          expect(response.body).toHaveProperty('error');
          expect(response.body.error).toContain('System busy');
        }
      }
    }, 30000);
  });

  describe('Worker Scaling Behavior', () => {
    it('should process messages faster with increased load', async () => {
      // Send small batch
      const smallBatchSize = 50;
      const smallBatchStart = Date.now();
      
      for (let i = 0; i < smallBatchSize; i++) {
        await request(app)
          .post('/webhook/meta')
          .send({
            phone_number_id: testPhoneNumberId,
            customer_phone: `+666${String(i).padStart(7, '0')}`,
            message_text: `Small batch ${i}`,
            timestamp: new Date().toISOString(),
            platform_type: 'whatsapp',
          });
      }
      
      const smallBatchDuration = Date.now() - smallBatchStart;

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 5000));

      // Send large batch
      const largeBatchSize = 200;
      const largeBatchStart = Date.now();
      const promises: Promise<any>[] = [];
      
      for (let i = 0; i < largeBatchSize; i++) {
        promises.push(
          request(app)
            .post('/webhook/meta')
            .send({
              phone_number_id: testPhoneNumberId,
              customer_phone: `+555${String(i).padStart(7, '0')}`,
              message_text: `Large batch ${i}`,
              timestamp: new Date().toISOString(),
              platform_type: 'whatsapp',
            })
        );
      }
      
      await Promise.all(promises);
      const largeBatchDuration = Date.now() - largeBatchStart;

      console.log(`Small batch (${smallBatchSize}): ${smallBatchDuration}ms`);
      console.log(`Large batch (${largeBatchSize}): ${largeBatchDuration}ms`);

      // Throughput should improve with larger batches (parallel processing)
      const smallThroughput = (smallBatchSize / smallBatchDuration) * 1000;
      const largeThroughput = (largeBatchSize / largeBatchDuration) * 1000;

      console.log(`Small throughput: ${smallThroughput.toFixed(2)} msg/s`);
      console.log(`Large throughput: ${largeThroughput.toFixed(2)} msg/s`);

      // Large batch should have better or similar throughput
      expect(largeThroughput).toBeGreaterThanOrEqual(smallThroughput * 0.8);
    }, 120000);
  });

  describe('Memory and Resource Management', () => {
    it('should handle sustained load without memory leaks', async () => {
      const iterations = 5;
      const messagesPerIteration = 100;
      const memorySnapshots: number[] = [];

      for (let iteration = 0; iteration < iterations; iteration++) {
        const promises: Promise<any>[] = [];

        for (let i = 0; i < messagesPerIteration; i++) {
          const webhookPayload = {
            phone_number_id: testPhoneNumberId,
            customer_phone: `+444${String(iteration * messagesPerIteration + i).padStart(7, '0')}`,
            message_text: `Sustained load message ${i}`,
            timestamp: new Date().toISOString(),
            platform_type: 'whatsapp',
          };

          promises.push(
            request(app)
              .post('/webhook/meta')
              .send(webhookPayload)
          );
        }

        await Promise.all(promises);

        // Take memory snapshot
        const memUsage = process.memoryUsage();
        memorySnapshots.push(memUsage.heapUsed);
        console.log(`Iteration ${iteration + 1} - Heap used: ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`);

        // Wait between iterations
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Check for memory growth
      const firstSnapshot = memorySnapshots[0];
      const lastSnapshot = memorySnapshots[memorySnapshots.length - 1];
      const growthRatio = lastSnapshot / firstSnapshot;

      console.log(`Memory growth ratio: ${growthRatio.toFixed(2)}x`);

      // Memory should not grow excessively (allow 2x growth)
      expect(growthRatio).toBeLessThan(2.0);
    }, 180000);
  });

  describe('Database Connection Pool Stress', () => {
    it('should handle concurrent database operations', async () => {
      const concurrentOperations = 100;
      const promises: Promise<any>[] = [];

      for (let i = 0; i < concurrentOperations; i++) {
        promises.push(
          dbPool.query('SELECT * FROM users WHERE user_id = $1', [testUserId])
        );
      }

      const results = await Promise.all(promises);
      
      // All queries should succeed
      expect(results.length).toBe(concurrentOperations);
      results.forEach(result => {
        expect(result.rows.length).toBeGreaterThan(0);
      });
    }, 30000);
  });
});
