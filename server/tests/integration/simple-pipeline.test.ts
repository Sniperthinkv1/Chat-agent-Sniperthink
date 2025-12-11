/**
 * Simple Pipeline Test - Debug Version
 * Tests basic database and Redis connectivity
 */

import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis';
import { generateTestId } from '../fixtures/helpers';

describe('Simple Pipeline Test', () => {
  let dbPool: Pool;
  let redisClient: RedisClientType;

  beforeAll(async () => {
    console.log('\n🔧 Initializing connections...');
    
    // Initialize database
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
    });

    // Initialize Redis
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        tls: true,
        rejectUnauthorized: false,
      },
    });
    await redisClient.connect();

    console.log('✅ Connections initialized');
  }, 30000);

  afterAll(async () => {
    await dbPool.end();
    await redisClient.disconnect();
  }, 30000);

  it('should connect to database', async () => {
    console.log('Database pool:', dbPool);
    console.log('Database URL:', process.env.DATABASE_URL?.substring(0, 30) + '...');
    
    try {
      const result = await dbPool.query('SELECT NOW() as time');
      
      console.log('Database query result:', result);
      console.log('Result type:', typeof result);
      console.log('Result keys:', result ? Object.keys(result) : 'undefined');
      
      expect(result).toBeDefined();
      expect(result.rows).toBeDefined();
      expect(result.rows.length).toBeGreaterThan(0);
      
      console.log('✅ Database connection working');
      console.log(`   Server time: ${result.rows[0].time}`);
    } catch (error: any) {
      console.error('❌ Database query failed:', error.message);
      throw error;
    }
  });

  it('should connect to Redis', async () => {
    const pong = await redisClient.ping();
    
    expect(pong).toBe('PONG');
    
    console.log('✅ Redis connection working');
  });

  it('should list existing tables', async () => {
    const result = await dbPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('\n📋 Available tables:');
    result.rows.forEach(row => {
      console.log(`   - ${row.table_name}`);
    });

    expect(result.rows.length).toBeGreaterThan(0);
  });

  it('should create and query a test user', async () => {
    const testUserId = generateTestId('simple-test');
    
    console.log(`\n🧪 Creating test user: ${testUserId}`);

    // Create user
    const insertResult = await dbPool.query(
      'INSERT INTO users (user_id, email, company_name, created_at) VALUES ($1, $2, $3, NOW()) RETURNING *',
      [testUserId, `${testUserId}@test.com`, 'Test Company']
    );

    console.log('Insert result:', insertResult.rows[0]);

    expect(insertResult.rows.length).toBe(1);
    expect(insertResult.rows[0].user_id).toBe(testUserId);

    // Query user
    const selectResult = await dbPool.query(
      'SELECT * FROM users WHERE user_id = $1',
      [testUserId]
    );

    console.log('Select result:', selectResult.rows[0]);

    expect(selectResult.rows.length).toBe(1);
    expect(selectResult.rows[0].email).toBe(`${testUserId}@test.com`);

    // Cleanup
    await dbPool.query('DELETE FROM users WHERE user_id = $1', [testUserId]);

    console.log('✅ User create/query/delete working');
  });

  it('should set and get Redis values', async () => {
    const testKey = `test:${Date.now()}`;
    const testValue = JSON.stringify({ test: 'data' });

    // Set value
    await redisClient.set(testKey, testValue, { EX: 60 });

    // Get value
    const retrieved = await redisClient.get(testKey);

    expect(retrieved).toBe(testValue);

    const parsed = JSON.parse(retrieved!);
    expect(parsed.test).toBe('data');

    // Cleanup
    await redisClient.del(testKey);

    console.log('✅ Redis set/get working');
  });
});
