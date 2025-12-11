import { createClient } from 'redis';
import { RedisConnection } from '../../../src/utils/redis';
import { logger } from '../../../src/utils/logger';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the config
jest.mock('../../../src/config', () => ({
  redisConfig: {
    url: 'redis://localhost:6379',
    ttlDefault: 300,
    queueMaxSize: 100000,
  },
}));

// Mock Redis client
jest.mock('redis', () => {
  const mockClient = {
    connect: jest.fn(),
    disconnect: jest.fn(),
    on: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
    exists: jest.fn(),
    hGet: jest.fn(),
    hSet: jest.fn(),
    hGetAll: jest.fn(),
    hDel: jest.fn(),
    sAdd: jest.fn(),
    sIsMember: jest.fn(),
    sRem: jest.fn(),
    lPush: jest.fn(),
    rPop: jest.fn(),
    brPop: jest.fn(),
    lLen: jest.fn(),
    setNX: jest.fn(),
    eval: jest.fn(),
    ping: jest.fn(),
  };
  
  return {
    createClient: jest.fn().mockImplementation(() => mockClient),
  };
});

describe('RedisConnection', () => {
  let redisConnection: RedisConnection;
  let mockClient: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton instance for testing
    (RedisConnection as any).instance = undefined;
    
    // Get the mock client instance
    const { createClient } = require('redis');
    mockClient = createClient.mock.results[createClient.mock.results.length - 1]?.value || {
      connect: jest.fn(),
      disconnect: jest.fn(),
      on: jest.fn(),
      get: jest.fn(),
      set: jest.fn(),
      setEx: jest.fn(),
      del: jest.fn(),
      expire: jest.fn(),
      exists: jest.fn(),
      hGet: jest.fn(),
      hSet: jest.fn(),
      hGetAll: jest.fn(),
      hDel: jest.fn(),
      sAdd: jest.fn(),
      sIsMember: jest.fn(),
      sRem: jest.fn(),
      lPush: jest.fn(),
      rPop: jest.fn(),
      brPop: jest.fn(),
      lLen: jest.fn(),
      setNX: jest.fn(),
      eval: jest.fn(),
      ping: jest.fn(),
    };
    
    redisConnection = RedisConnection.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = RedisConnection.getInstance();
      const instance2 = RedisConnection.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create Redis client with correct configuration', () => {
      expect(createClient).toHaveBeenCalledWith({
        url: 'redis://localhost:6379',
        socket: {
          connectTimeout: 10000,
          lazyConnect: true,
          reconnectStrategy: expect.any(Function),
        },
      });
    });

    it('should setup event handlers', () => {
      expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('ready', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('end', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    });
  });

  describe('connect', () => {
    it('should connect successfully', async () => {
      mockClient.connect.mockResolvedValueOnce(undefined);

      await redisConnection.connect();

      expect(mockClient.connect).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Redis connection established successfully');
    });

    it('should handle connection failure', async () => {
      const error = new Error('Connection failed');
      mockClient.connect.mockRejectedValueOnce(error);

      await expect(redisConnection.connect()).rejects.toThrow('Connection failed');
      expect(logger.error).toHaveBeenCalledWith('Failed to connect to Redis:', { error: 'Connection failed' });
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      mockClient.disconnect.mockResolvedValueOnce(undefined);

      await redisConnection.disconnect();

      expect(mockClient.disconnect).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith('Redis connection closed');
    });

    it('should handle disconnection error', async () => {
      const error = new Error('Disconnection failed');
      mockClient.disconnect.mockRejectedValueOnce(error);

      await expect(redisConnection.disconnect()).rejects.toThrow('Disconnection failed');
      expect(logger.error).toHaveBeenCalledWith('Error closing Redis connection:', { error: 'Disconnection failed' });
    });
  });

  describe('basic operations', () => {
    describe('get', () => {
      it('should get value successfully', async () => {
        mockClient.get.mockResolvedValueOnce('test-value');

        const result = await redisConnection.get('test-key');

        expect(mockClient.get).toHaveBeenCalledWith('test-key');
        expect(result).toBe('test-value');
        expect(logger.debug).toHaveBeenCalledWith('Redis GET operation', { key: 'test-key', found: true });
      });

      it('should return null for non-existent key', async () => {
        mockClient.get.mockResolvedValueOnce(null);

        const result = await redisConnection.get('non-existent');

        expect(result).toBeNull();
        expect(logger.debug).toHaveBeenCalledWith('Redis GET operation', { key: 'non-existent', found: false });
      });

      it('should handle get error', async () => {
        const error = new Error('Get failed');
        mockClient.get.mockRejectedValueOnce(error);

        await expect(redisConnection.get('test-key')).rejects.toThrow('Get failed');
        expect(logger.error).toHaveBeenCalledWith('Redis GET operation failed', { key: 'test-key', error: 'Get failed' });
      });
    });

    describe('set', () => {
      it('should set value without TTL', async () => {
        mockClient.set.mockResolvedValueOnce('OK');

        await redisConnection.set('test-key', 'test-value');

        expect(mockClient.set).toHaveBeenCalledWith('test-key', 'test-value');
        expect(logger.debug).toHaveBeenCalledWith('Redis SET operation', { key: 'test-key', ttl: undefined });
      });

      it('should set value with TTL', async () => {
        mockClient.setEx.mockResolvedValueOnce('OK');

        await redisConnection.set('test-key', 'test-value', 300);

        expect(mockClient.setEx).toHaveBeenCalledWith('test-key', 300, 'test-value');
        expect(logger.debug).toHaveBeenCalledWith('Redis SET operation', { key: 'test-key', ttl: 300 });
      });

      it('should handle set error', async () => {
        const error = new Error('Set failed');
        mockClient.set.mockRejectedValueOnce(error);

        await expect(redisConnection.set('test-key', 'test-value')).rejects.toThrow('Set failed');
        expect(logger.error).toHaveBeenCalledWith('Redis SET operation failed', { key: 'test-key', error: 'Set failed' });
      });
    });

    describe('del', () => {
      it('should delete key successfully', async () => {
        mockClient.del.mockResolvedValueOnce(1);

        const result = await redisConnection.del('test-key');

        expect(mockClient.del).toHaveBeenCalledWith('test-key');
        expect(result).toBe(1);
        expect(logger.debug).toHaveBeenCalledWith('Redis DEL operation', { key: 'test-key', deleted: 1 });
      });

      it('should handle delete error', async () => {
        const error = new Error('Delete failed');
        mockClient.del.mockRejectedValueOnce(error);

        await expect(redisConnection.del('test-key')).rejects.toThrow('Delete failed');
        expect(logger.error).toHaveBeenCalledWith('Redis DEL operation failed', { key: 'test-key', error: 'Delete failed' });
      });
    });

    describe('expire', () => {
      it('should set expiration successfully', async () => {
        mockClient.expire.mockResolvedValueOnce(true);

        const result = await redisConnection.expire('test-key', 300);

        expect(mockClient.expire).toHaveBeenCalledWith('test-key', 300);
        expect(result).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith('Redis EXPIRE operation', { key: 'test-key', seconds: 300, success: true });
      });
    });

    describe('exists', () => {
      it('should check existence successfully', async () => {
        mockClient.exists.mockResolvedValueOnce(1);

        const result = await redisConnection.exists('test-key');

        expect(mockClient.exists).toHaveBeenCalledWith('test-key');
        expect(result).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith('Redis EXISTS operation', { key: 'test-key', exists: true });
      });
    });
  });

  describe('hash operations', () => {
    describe('hGet', () => {
      it('should get hash field successfully', async () => {
        mockClient.hGet.mockResolvedValueOnce('field-value');

        const result = await redisConnection.hGet('test-hash', 'test-field');

        expect(mockClient.hGet).toHaveBeenCalledWith('test-hash', 'test-field');
        expect(result).toBe('field-value');
        expect(logger.debug).toHaveBeenCalledWith('Redis HGET operation', { key: 'test-hash', field: 'test-field', found: true });
      });
    });

    describe('hSet', () => {
      it('should set hash field successfully', async () => {
        mockClient.hSet.mockResolvedValueOnce(1);

        const result = await redisConnection.hSet('test-hash', 'test-field', 'field-value');

        expect(mockClient.hSet).toHaveBeenCalledWith('test-hash', 'test-field', 'field-value');
        expect(result).toBe(1);
        expect(logger.debug).toHaveBeenCalledWith('Redis HSET operation', { key: 'test-hash', field: 'test-field', created: 1 });
      });
    });

    describe('hGetAll', () => {
      it('should get all hash fields successfully', async () => {
        const mockHash = { field1: 'value1', field2: 'value2' };
        mockClient.hGetAll.mockResolvedValueOnce(mockHash);

        const result = await redisConnection.hGetAll('test-hash');

        expect(mockClient.hGetAll).toHaveBeenCalledWith('test-hash');
        expect(result).toEqual(mockHash);
        expect(logger.debug).toHaveBeenCalledWith('Redis HGETALL operation', { key: 'test-hash', fieldCount: 2 });
      });
    });

    describe('hDel', () => {
      it('should delete hash field successfully', async () => {
        mockClient.hDel.mockResolvedValueOnce(1);

        const result = await redisConnection.hDel('test-hash', 'test-field');

        expect(mockClient.hDel).toHaveBeenCalledWith('test-hash', 'test-field');
        expect(result).toBe(1);
        expect(logger.debug).toHaveBeenCalledWith('Redis HDEL operation', { key: 'test-hash', field: 'test-field', deleted: 1 });
      });
    });
  });

  describe('set operations', () => {
    describe('sAdd', () => {
      it('should add set member successfully', async () => {
        mockClient.sAdd.mockResolvedValueOnce(1);

        const result = await redisConnection.sAdd('test-set', 'member1');

        expect(mockClient.sAdd).toHaveBeenCalledWith('test-set', 'member1');
        expect(result).toBe(1);
        expect(logger.debug).toHaveBeenCalledWith('Redis SADD operation', { key: 'test-set', member: 'member1', added: 1 });
      });
    });

    describe('sIsMember', () => {
      it('should check set membership successfully', async () => {
        mockClient.sIsMember.mockResolvedValueOnce(true);

        const result = await redisConnection.sIsMember('test-set', 'member1');

        expect(mockClient.sIsMember).toHaveBeenCalledWith('test-set', 'member1');
        expect(result).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith('Redis SISMEMBER operation', { key: 'test-set', member: 'member1', isMember: true });
      });
    });

    describe('sRem', () => {
      it('should remove set member successfully', async () => {
        mockClient.sRem.mockResolvedValueOnce(1);

        const result = await redisConnection.sRem('test-set', 'member1');

        expect(mockClient.sRem).toHaveBeenCalledWith('test-set', 'member1');
        expect(result).toBe(1);
        expect(logger.debug).toHaveBeenCalledWith('Redis SREM operation', { key: 'test-set', member: 'member1', removed: 1 });
      });
    });
  });

  describe('list operations', () => {
    describe('lPush', () => {
      it('should push to list successfully', async () => {
        mockClient.lPush.mockResolvedValueOnce(1);

        const result = await redisConnection.lPush('test-list', 'item1');

        expect(mockClient.lPush).toHaveBeenCalledWith('test-list', 'item1');
        expect(result).toBe(1);
        expect(logger.debug).toHaveBeenCalledWith('Redis LPUSH operation', { key: 'test-list', length: 1 });
      });
    });

    describe('rPop', () => {
      it('should pop from list successfully', async () => {
        mockClient.rPop.mockResolvedValueOnce('item1');

        const result = await redisConnection.rPop('test-list');

        expect(mockClient.rPop).toHaveBeenCalledWith('test-list');
        expect(result).toBe('item1');
        expect(logger.debug).toHaveBeenCalledWith('Redis RPOP operation', { key: 'test-list', found: true });
      });
    });

    describe('brPop', () => {
      it('should blocking pop from list successfully', async () => {
        const mockResult = { key: 'test-list', element: 'item1' };
        mockClient.brPop.mockResolvedValueOnce(mockResult);

        const result = await redisConnection.brPop('test-list', 5);

        expect(mockClient.brPop).toHaveBeenCalledWith('test-list', 5);
        expect(result).toEqual(mockResult);
        expect(logger.debug).toHaveBeenCalledWith('Redis BRPOP operation', { key: 'test-list', timeout: 5, found: true });
      });
    });

    describe('lLen', () => {
      it('should get list length successfully', async () => {
        mockClient.lLen.mockResolvedValueOnce(5);

        const result = await redisConnection.lLen('test-list');

        expect(mockClient.lLen).toHaveBeenCalledWith('test-list');
        expect(result).toBe(5);
        expect(logger.debug).toHaveBeenCalledWith('Redis LLEN operation', { key: 'test-list', length: 5 });
      });
    });
  });

  describe('locking operations', () => {
    describe('setNX', () => {
      it('should acquire lock without TTL', async () => {
        mockClient.setNX.mockResolvedValueOnce(true);

        const result = await redisConnection.setNX('lock-key', 'lock-value');

        expect(mockClient.setNX).toHaveBeenCalledWith('lock-key', 'lock-value');
        expect(result).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith('Redis SETNX operation', { key: 'lock-key', ttl: undefined, acquired: true });
      });

      it('should acquire lock with TTL', async () => {
        mockClient.set.mockResolvedValueOnce('OK');

        const result = await redisConnection.setNX('lock-key', 'lock-value', 300);

        expect(mockClient.set).toHaveBeenCalledWith('lock-key', 'lock-value', { NX: true, EX: 300 });
        expect(result).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith('Redis SETNX operation', { key: 'lock-key', ttl: 300, acquired: true });
      });

      it('should fail to acquire existing lock', async () => {
        mockClient.set.mockResolvedValueOnce(null);

        const result = await redisConnection.setNX('lock-key', 'lock-value', 300);

        expect(result).toBe(false);
        expect(logger.debug).toHaveBeenCalledWith('Redis SETNX operation', { key: 'lock-key', ttl: 300, acquired: false });
      });
    });

    describe('releaseLock', () => {
      it('should release lock successfully', async () => {
        mockClient.eval.mockResolvedValueOnce(1);

        const result = await redisConnection.releaseLock('lock-key', 'lock-value');

        expect(mockClient.eval).toHaveBeenCalledWith(expect.any(String), {
          keys: ['lock-key'],
          arguments: ['lock-value'],
        });
        expect(result).toBe(true);
        expect(logger.debug).toHaveBeenCalledWith('Redis lock release operation', { key: 'lock-key', released: true });
      });

      it('should fail to release lock with wrong value', async () => {
        mockClient.eval.mockResolvedValueOnce(0);

        const result = await redisConnection.releaseLock('lock-key', 'wrong-value');

        expect(result).toBe(false);
        expect(logger.debug).toHaveBeenCalledWith('Redis lock release operation', { key: 'lock-key', released: false });
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status', async () => {
      mockClient.ping.mockResolvedValueOnce('PONG');

      const health = await redisConnection.healthCheck();

      expect(health.status).toBe('healthy');
      expect(health.details).toMatchObject({
        connected: expect.any(Boolean),
        responseTime: expect.any(Number),
        ping: 'PONG',
        reconnectAttempts: 0,
      });
    });

    it('should return unhealthy status on error', async () => {
      const error = new Error('Ping failed');
      mockClient.ping.mockRejectedValueOnce(error);

      const health = await redisConnection.healthCheck();

      expect(health.status).toBe('unhealthy');
      expect(health.details).toMatchObject({
        connected: false,
        error: 'Ping failed',
        reconnectAttempts: 0,
      });
    });
  });

  describe('isHealthy', () => {
    it('should return connection status', () => {
      // Initially false since we haven't connected
      expect(redisConnection.isHealthy).toBe(false);
    });
  });

  describe('getClient', () => {
    it('should return Redis client', () => {
      const client = redisConnection.getClient();
      expect(client).toBe(mockClient);
    });
  });
});