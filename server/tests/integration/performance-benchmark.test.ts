/**
 * Performance Benchmarking and Regression Testing
 * Establishes performance baselines and detects regressions
 */

import request from 'supertest';
import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis';
import app from './test-app';
import { generateTestId } from '../fixtures/helpers';
import * as fs from 'fs';
import * as path from 'path';

interface BenchmarkResult {
  testName: string;
  timestamp: string;
  metrics: {
    avgLatency: number;
    p95Latency: number;
    throughput: number;
    errorRate: number;
  };
}

describe('Performance Benchmarking and Regression Testing', () => {
  let dbPool: Pool;
  let redisClient: RedisClientType;
  let testUserId: string;
  let testPhoneNumberId: string;
  let testAgentId: string;
  const benchmarkFile = path.join(__dirname, '../fixtures/benchmark-results.json');

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
    testUserId = generateTestId('bench-user');
    testPhoneNumberId = generateTestId('bench-phone');
    testAgentId = generateTestId('bench-agent');

    await dbPool.query(
      'INSERT INTO users (user_id, email, company_name) VALUES ($1, $2, $3)',
      [testUserId, `${testUserId}@test.com`, 'Benchmark Test Company']
    );

    await dbPool.query(
      'INSERT INTO phone_numbers (phone_number_id, user_id, type, external_number, access_token) VALUES ($1, $2, $3, $4, $5)',
      [testPhoneNumberId, testUserId, 'whatsapp', '+1234567890', 'test_token']
    );

    await dbPool.query(
      'INSERT INTO agents (agent_id, user_id, phone_number_id, prompt_id, name) VALUES ($1, $2, $3, $4, $5)',
      [testAgentId, testUserId, testPhoneNumberId, 'prompt_bench', 'Benchmark Agent']
    );

    await dbPool.query(
      'INSERT INTO credits (user_id, remaining_credits) VALUES ($1, $2)',
      [testUserId, 50000]
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

  function saveBenchmarkResult(result: BenchmarkResult): void {
    let results: BenchmarkResult[] = [];
    
    if (fs.existsSync(benchmarkFile)) {
      const data = fs.readFileSync(benchmarkFile, 'utf-8');
      results = JSON.parse(data);
    }

    results.push(result);
    fs.writeFileSync(benchmarkFile, JSON.stringify(results, null, 2));
  }

  function getPreviousBenchmark(testName: string): BenchmarkResult | null {
    if (!fs.existsSync(benchmarkFile)) {
      return null;
    }

    const data = fs.readFileSync(benchmarkFile, 'utf-8');
    const results: BenchmarkResult[] = JSON.parse(data);
    
    const previousResults = results.filter(r => r.testName === testName);
    return previousResults.length > 0 ? previousResults[previousResults.length - 1] : null;
  }

  describe('Webhook Processing Benchmark', () => {
    it('should benchmark webhook processing performance', async () => {
      const iterations = 100;
      const latencies: number[] = [];
      let errorCount = 0;

      const startTime = Date.now();

      for (let i = 0; i < iterations; i++) {
        const webhookPayload = {
          phone_number_id: testPhoneNumberId,
          customer_phone: `+555${String(i).padStart(7, '0')}`,
          message_text: `Benchmark message ${i}`,
          timestamp: new Date().toISOString(),
          platform_type: 'whatsapp',
        };

        const reqStart = Date.now();
        try {
          const response = await request(app)
            .post('/webhook/meta')
            .send(webhookPayload);
          
          if (response.status !== 200) {
            errorCount++;
          }
        } catch (error) {
          errorCount++;
        }
        const reqEnd = Date.now();

        latencies.push(reqEnd - reqStart);
      }

      const endTime = Date.now();
      const totalDuration = (endTime - startTime) / 1000;

      // Calculate metrics
      latencies.sort((a, b) => a - b);
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const p95Latency = latencies[Math.floor(iterations * 0.95)];
      const throughput = iterations / totalDuration;
      const errorRate = (errorCount / iterations) * 100;

      console.log('=== Webhook Processing Benchmark ===');
      console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`P95 Latency: ${p95Latency}ms`);
      console.log(`Throughput: ${throughput.toFixed(2)} req/s`);
      console.log(`Error Rate: ${errorRate.toFixed(2)}%`);

      const result: BenchmarkResult = {
        testName: 'webhook-processing',
        timestamp: new Date().toISOString(),
        metrics: { avgLatency, p95Latency, throughput, errorRate },
      };

      saveBenchmarkResult(result);

      // Check for regression
      const previous = getPreviousBenchmark('webhook-processing');
      if (previous) {
        console.log('=== Regression Analysis ===');
        const latencyChange = ((avgLatency - previous.metrics.avgLatency) / previous.metrics.avgLatency) * 100;
        const throughputChange = ((throughput - previous.metrics.throughput) / previous.metrics.throughput) * 100;

        console.log(`Latency change: ${latencyChange.toFixed(2)}%`);
        console.log(`Throughput change: ${throughputChange.toFixed(2)}%`);

        // Fail if performance degraded by more than 20%
        expect(latencyChange).toBeLessThan(20);
        expect(throughputChange).toBeGreaterThan(-20);
      }

      // Performance targets
      expect(avgLatency).toBeLessThan(150);
      expect(p95Latency).toBeLessThan(250);
      expect(errorRate).toBeLessThan(5);
    }, 120000);
  });

  describe('Database Query Benchmark', () => {
    it('should benchmark database query performance', async () => {
      const iterations = 200;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await dbPool.query('SELECT * FROM users WHERE user_id = $1', [testUserId]);
        const endTime = Date.now();

        latencies.push(endTime - startTime);
      }

      latencies.sort((a, b) => a - b);
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const p95Latency = latencies[Math.floor(iterations * 0.95)];

      console.log('=== Database Query Benchmark ===');
      console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`P95 Latency: ${p95Latency}ms`);

      const result: BenchmarkResult = {
        testName: 'database-query',
        timestamp: new Date().toISOString(),
        metrics: { avgLatency, p95Latency, throughput: 0, errorRate: 0 },
      };

      saveBenchmarkResult(result);

      expect(avgLatency).toBeLessThan(30);
      expect(p95Latency).toBeLessThan(50);
    }, 60000);
  });

  describe('Redis Operations Benchmark', () => {
    it('should benchmark Redis cache operations', async () => {
      const iterations = 500;
      const setLatencies: number[] = [];
      const getLatencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const key = `bench:${i}`;
        const value = JSON.stringify({ data: `test-${i}` });

        // Benchmark SET
        let startTime = Date.now();
        await redisClient.set(key, value, { EX: 60 });
        let endTime = Date.now();
        setLatencies.push(endTime - startTime);

        // Benchmark GET
        startTime = Date.now();
        await redisClient.get(key);
        endTime = Date.now();
        getLatencies.push(endTime - startTime);
      }

      setLatencies.sort((a, b) => a - b);
      getLatencies.sort((a, b) => a - b);

      const avgSetLatency = setLatencies.reduce((a, b) => a + b, 0) / setLatencies.length;
      const avgGetLatency = getLatencies.reduce((a, b) => a + b, 0) / getLatencies.length;
      const p95SetLatency = setLatencies[Math.floor(iterations * 0.95)];
      const p95GetLatency = getLatencies[Math.floor(iterations * 0.95)];

      console.log('=== Redis Operations Benchmark ===');
      console.log(`SET - Average: ${avgSetLatency.toFixed(2)}ms, P95: ${p95SetLatency}ms`);
      console.log(`GET - Average: ${avgGetLatency.toFixed(2)}ms, P95: ${p95GetLatency}ms`);

      expect(avgSetLatency).toBeLessThan(10);
      expect(avgGetLatency).toBeLessThan(5);
      expect(p95SetLatency).toBeLessThan(20);
      expect(p95GetLatency).toBeLessThan(10);

      // Cleanup
      for (let i = 0; i < iterations; i++) {
        await redisClient.del(`bench:${i}`);
      }
    }, 60000);
  });

  describe('API Endpoint Benchmark', () => {
    it('should benchmark GET /messages endpoint', async () => {
      const iterations = 50;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await request(app)
          .get(`/users/${testUserId}/messages`)
          .set('x-api-key', process.env.API_KEY || 'test-api-key');
        const endTime = Date.now();

        latencies.push(endTime - startTime);
      }

      latencies.sort((a, b) => a - b);
      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const p95Latency = latencies[Math.floor(iterations * 0.95)];

      console.log('=== GET /messages Benchmark ===');
      console.log(`Average Latency: ${avgLatency.toFixed(2)}ms`);
      console.log(`P95 Latency: ${p95Latency}ms`);

      expect(avgLatency).toBeLessThan(200);
      expect(p95Latency).toBeLessThan(350);
    }, 60000);
  });

  describe('Concurrent Operations Benchmark', () => {
    it('should benchmark concurrent webhook processing', async () => {
      const concurrentRequests = 50;
      const promises: Promise<any>[] = [];
      const startTime = Date.now();

      for (let i = 0; i < concurrentRequests; i++) {
        const webhookPayload = {
          phone_number_id: testPhoneNumberId,
          customer_phone: `+444${String(i).padStart(7, '0')}`,
          message_text: `Concurrent test ${i}`,
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
      const duration = (endTime - startTime) / 1000;

      const successCount = responses.filter(r => r.status === 200).length;
      const throughput = concurrentRequests / duration;

      console.log('=== Concurrent Operations Benchmark ===');
      console.log(`Total Duration: ${duration.toFixed(2)}s`);
      console.log(`Success Rate: ${(successCount / concurrentRequests * 100).toFixed(2)}%`);
      console.log(`Throughput: ${throughput.toFixed(2)} req/s`);

      expect(successCount).toBeGreaterThanOrEqual(concurrentRequests * 0.95);
      expect(throughput).toBeGreaterThan(20);
    }, 60000);
  });
});
