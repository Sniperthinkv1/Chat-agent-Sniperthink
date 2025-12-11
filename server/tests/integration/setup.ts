/**
 * Integration Test Setup
 * Configures environment and utilities for integration tests
 */

import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis';

// Extend Jest timeout for integration tests
jest.setTimeout(120000);

// Global test utilities
export class IntegrationTestHelper {
  private static dbPool: Pool;
  private static redisClient: RedisClientType;

  static async initializeConnections(): Promise<void> {
    // Initialize database pool (Neon PostgreSQL)
    this.dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: false, // Required for Neon
      },
    });

    // Initialize Redis client (Upstash Redis)
    this.redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        tls: true,
        rejectUnauthorized: false,
      },
    });

    await this.redisClient.connect();

    console.log('✅ Integration test connections initialized (Neon + Upstash)');
  }

  static async closeConnections(): Promise<void> {
    if (this.dbPool) {
      await this.dbPool.end();
    }

    if (this.redisClient) {
      await this.redisClient.quit();
    }

    console.log('Integration test connections closed');
  }

  static getDbPool(): Pool {
    return this.dbPool;
  }

  static getRedisClient(): RedisClientType {
    return this.redisClient;
  }

  static async cleanupTestData(pattern: string): Promise<void> {
    // Clean up database test data
    await this.dbPool.query(
      `DELETE FROM credits WHERE user_id LIKE $1`,
      [`${pattern}%`]
    );

    await this.dbPool.query(
      `DELETE FROM messages WHERE conversation_id IN (
        SELECT conversation_id FROM conversations WHERE agent_id LIKE $1
      )`,
      [`${pattern}%`]
    );

    await this.dbPool.query(
      `DELETE FROM conversations WHERE agent_id LIKE $1`,
      [`${pattern}%`]
    );

    await this.dbPool.query(
      `DELETE FROM agents WHERE agent_id LIKE $1`,
      [`${pattern}%`]
    );

    await this.dbPool.query(
      `DELETE FROM phone_numbers WHERE phone_number_id LIKE $1`,
      [`${pattern}%`]
    );

    await this.dbPool.query(
      `DELETE FROM users WHERE user_id LIKE $1`,
      [`${pattern}%`]
    );

    // Clean up Redis test keys
    const keys = await this.redisClient.keys(`*${pattern}*`);
    if (keys.length > 0) {
      await this.redisClient.del(keys);
    }

    console.log(`Cleaned up test data for pattern: ${pattern}`);
  }

  static async verifyDatabaseConnection(): Promise<boolean> {
    try {
      const result = await this.dbPool.query('SELECT NOW()');
      return result.rows.length > 0;
    } catch (error) {
      console.error('Database connection failed:', error);
      return false;
    }
  }

  static async verifyRedisConnection(): Promise<boolean> {
    try {
      const pong = await this.redisClient.ping();
      return pong === 'PONG';
    } catch (error) {
      console.error('Redis connection failed:', error);
      return false;
    }
  }

  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number = 10000,
    interval: number = 100
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    return false;
  }

  static calculatePercentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.floor(sorted.length * percentile);
    return sorted[index];
  }

  static calculateStats(values: number[]): {
    min: number;
    max: number;
    avg: number;
    median: number;
    p95: number;
    p99: number;
  } {
    const sorted = [...values].sort((a, b) => a - b);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: values.reduce((a, b) => a + b, 0) / values.length,
      median: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
    };
  }
}

// Setup before all tests
beforeAll(async () => {
  await IntegrationTestHelper.initializeConnections();

  // Verify connections
  const dbConnected = await IntegrationTestHelper.verifyDatabaseConnection();
  const redisConnected = await IntegrationTestHelper.verifyRedisConnection();

  if (!dbConnected || !redisConnected) {
    throw new Error('Failed to establish required connections for integration tests');
  }
});

// Cleanup after all tests
afterAll(async () => {
  await IntegrationTestHelper.closeConnections();
});
