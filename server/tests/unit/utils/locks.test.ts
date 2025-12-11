import {
  RedisLockManager,
  PhoneNumberLockManager,
  LockConfig,
  DeduplicationConfig,
  DistributedLock,
  defaultLockConfig,
  defaultDeduplicationConfig,
  createLockManager,
  createPhoneNumberLockManager
} from '../../../src/utils/locks';
import { redis } from '../../../src/utils/redis';
import crypto from 'crypto';

// Mock Redis
jest.mock('../../../src/utils/redis', () => ({
  redis: {
    getClient: jest.fn(),
    setNX: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    expire: jest.fn(),
    exists: jest.fn(),
    releaseLock: jest.fn(),
  }
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  }
}));

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'test-uuid-123')
}));

describe('RedisLockManager', () => {
  let lockManager: RedisLockManager;
  let mockRedisClient: any;
  let testLockConfig: LockConfig;
  let testDedupConfig: DeduplicationConfig;

  beforeEach(() => {
    // Reset singleton
    (RedisLockManager as any).instance = undefined;
    
    testLockConfig = {
      defaultTtlMs: 60000,
      retryDelayMs: 50,
      maxRetries: 3,
      lockTimeoutMs: 5000
    };

    testDedupConfig = {
      defaultTtlSeconds: 5,
      hashAlgorithm: 'sha256'
    };

    // Setup Redis client mock
    mockRedisClient = {
      keys: jest.fn(),
      ttl: jest.fn(),
    };

    (redis.getClient as jest.Mock).mockReturnValue(mockRedisClient);
    (redis.setNX as jest.Mock).mockResolvedValue(true);
    (redis.get as jest.Mock).mockResolvedValue('test-uuid-123');
    (redis.set as jest.Mock).mockResolvedValue(undefined);
    (redis.del as jest.Mock).mockResolvedValue(1);
    (redis.expire as jest.Mock).mockResolvedValue(true);
    (redis.exists as jest.Mock).mockResolvedValue(false);
    (redis.releaseLock as jest.Mock).mockResolvedValue(true);

    lockManager = RedisLockManager.getInstance(testLockConfig, testDedupConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should create singleton instance with configs', () => {
      const instance1 = RedisLockManager.getInstance(testLockConfig, testDedupConfig);
      const instance2 = RedisLockManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should throw error if no configs provided for first initialization', () => {
      (RedisLockManager as any).instance = undefined;
      
      expect(() => RedisLockManager.getInstance()).toThrow('Lock and deduplication configs required for first initialization');
    });
  });

  describe('acquireLock', () => {
    it('should acquire lock successfully on first attempt', async () => {
      const lock = await lockManager.acquireLock('test-resource', 30000);

      expect(lock).not.toBeNull();
      expect(lock!.key).toBe('lock:test-resource');
      expect(lock!.value).toBe('test-uuid-123');
      expect(lock!.ttlMs).toBe(30000);
      expect(lock!.acquiredAt).toBeInstanceOf(Date);
      expect(lock!.expiresAt).toBeInstanceOf(Date);
      
      expect(redis.setNX).toHaveBeenCalledWith('lock:test-resource', 'test-uuid-123', 30);
    });

    it('should use default TTL when not specified', async () => {
      await lockManager.acquireLock('test-resource');

      expect(redis.setNX).toHaveBeenCalledWith('lock:test-resource', 'test-uuid-123', 60);
    });

    it('should retry on lock acquisition failure', async () => {
      (redis.setNX as jest.Mock)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true);

      const lock = await lockManager.acquireLock('test-resource', 30000, 3);

      expect(lock).not.toBeNull();
      expect(redis.setNX).toHaveBeenCalledTimes(3);
    });

    it('should return null after max retries exceeded', async () => {
      (redis.setNX as jest.Mock).mockResolvedValue(false);

      const lock = await lockManager.acquireLock('test-resource', 30000, 2);

      expect(lock).toBeNull();
      expect(redis.setNX).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it('should handle Redis errors during lock acquisition', async () => {
      const error = new Error('Redis connection failed');
      (redis.setNX as jest.Mock).mockRejectedValue(error);

      await expect(lockManager.acquireLock('test-resource')).rejects.toThrow('Redis connection failed');
    });
  });

  describe('releaseLock', () => {
    const mockLock: DistributedLock = {
      key: 'lock:test-resource',
      value: 'test-uuid-123',
      ttlMs: 60000,
      acquiredAt: new Date(),
      expiresAt: new Date(Date.now() + 60000)
    };

    it('should release lock successfully', async () => {
      const released = await lockManager.releaseLock(mockLock);

      expect(released).toBe(true);
      expect(redis.releaseLock).toHaveBeenCalledWith('lock:test-resource', 'test-uuid-123');
    });

    it('should return false when lock release fails', async () => {
      (redis.releaseLock as jest.Mock).mockResolvedValue(false);

      const released = await lockManager.releaseLock(mockLock);

      expect(released).toBe(false);
    });

    it('should handle Redis errors during lock release', async () => {
      const error = new Error('Redis error');
      (redis.releaseLock as jest.Mock).mockRejectedValue(error);

      await expect(lockManager.releaseLock(mockLock)).rejects.toThrow('Redis error');
    });
  });

  describe('extendLock', () => {
    const mockLock: DistributedLock = {
      key: 'lock:test-resource',
      value: 'test-uuid-123',
      ttlMs: 60000,
      acquiredAt: new Date(),
      expiresAt: new Date(Date.now() + 60000)
    };

    it('should extend lock successfully when still owned', async () => {
      const extensionMs = 30000;
      
      // Mock Date.now to ensure consistent timing
      const mockNow = Date.now();
      jest.spyOn(Date, 'now').mockReturnValue(mockNow);
      
      const extendedLock = await lockManager.extendLock(mockLock, extensionMs);

      expect(extendedLock).not.toBeNull();
      expect(extendedLock!.ttlMs).toBe(extensionMs);
      expect(extendedLock!.expiresAt.getTime()).toBe(mockNow + extensionMs);
      
      expect(redis.get).toHaveBeenCalledWith('lock:test-resource');
      expect(redis.expire).toHaveBeenCalledWith('lock:test-resource', 30);
      
      jest.restoreAllMocks();
    });

    it('should return null when lock is no longer owned', async () => {
      (redis.get as jest.Mock).mockResolvedValue('different-uuid');

      const extendedLock = await lockManager.extendLock(mockLock, 30000);

      expect(extendedLock).toBeNull();
      expect(redis.expire).not.toHaveBeenCalled();
    });

    it('should return null when expire operation fails', async () => {
      (redis.expire as jest.Mock).mockResolvedValue(false);

      const extendedLock = await lockManager.extendLock(mockLock, 30000);

      expect(extendedLock).toBeNull();
    });
  });

  describe('isLockValid', () => {
    it('should return true for valid unexpired lock', async () => {
      const mockLock: DistributedLock = {
        key: 'lock:test-resource',
        value: 'test-uuid-123',
        ttlMs: 60000,
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + 60000)
      };

      const isValid = await lockManager.isLockValid(mockLock);

      expect(isValid).toBe(true);
      expect(redis.get).toHaveBeenCalledWith('lock:test-resource');
    });

    it('should return false for expired lock', async () => {
      const mockLock: DistributedLock = {
        key: 'lock:test-resource',
        value: 'test-uuid-123',
        ttlMs: 60000,
        acquiredAt: new Date(Date.now() - 120000),
        expiresAt: new Date(Date.now() - 60000) // Expired 1 minute ago
      };

      const isValid = await lockManager.isLockValid(mockLock);

      expect(isValid).toBe(false);
      expect(redis.get).not.toHaveBeenCalled(); // Should not check Redis for expired lock
    });

    it('should return false when lock is owned by different process', async () => {
      (redis.get as jest.Mock).mockResolvedValue('different-uuid');

      const mockLock: DistributedLock = {
        key: 'lock:test-resource',
        value: 'test-uuid-123',
        ttlMs: 60000,
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + 60000)
      };

      const isValid = await lockManager.isLockValid(mockLock);

      expect(isValid).toBe(false);
    });

    it('should return false on Redis errors', async () => {
      const error = new Error('Redis error');
      (redis.get as jest.Mock).mockRejectedValue(error);

      const mockLock: DistributedLock = {
        key: 'lock:test-resource',
        value: 'test-uuid-123',
        ttlMs: 60000,
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + 60000)
      };

      const isValid = await lockManager.isLockValid(mockLock);

      expect(isValid).toBe(false);
    });
  });

  describe('forceReleaseLock', () => {
    it('should force release lock successfully', async () => {
      const released = await lockManager.forceReleaseLock('test-resource');

      expect(released).toBe(true);
      expect(redis.del).toHaveBeenCalledWith('lock:test-resource');
    });

    it('should return false when lock does not exist', async () => {
      (redis.del as jest.Mock).mockResolvedValue(0);

      const released = await lockManager.forceReleaseLock('test-resource');

      expect(released).toBe(false);
    });
  });

  describe('cleanupOrphanedLocks', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should clean up orphaned locks without TTL', async () => {
      mockRedisClient.keys.mockResolvedValue(['lock:resource1', 'lock:resource2', 'lock:resource3']);
      (redis.get as jest.Mock)
        .mockResolvedValueOnce('value1')
        .mockResolvedValueOnce('value2')
        .mockResolvedValueOnce('value3');
      mockRedisClient.ttl
        .mockResolvedValueOnce(30)  // Has TTL
        .mockResolvedValueOnce(-1)  // No TTL (orphaned)
        .mockResolvedValueOnce(60); // Has TTL
        
      const cleanedCount = await lockManager.cleanupOrphanedLocks();

      expect(cleanedCount).toBe(1);
      expect(redis.del).toHaveBeenCalledWith('lock:resource2');
      expect(redis.del).toHaveBeenCalledTimes(1);
    });

    it('should not clean up locks with valid TTL', async () => {
      mockRedisClient.keys.mockResolvedValue(['lock:resource1', 'lock:resource2']);
      (redis.get as jest.Mock)
        .mockResolvedValueOnce('value1')
        .mockResolvedValueOnce('value2');
      mockRedisClient.ttl
        .mockResolvedValueOnce(30)  // Has TTL
        .mockResolvedValueOnce(60); // Has TTL

      const cleanedCount = await lockManager.cleanupOrphanedLocks();

      expect(cleanedCount).toBe(0);
      expect(redis.del).not.toHaveBeenCalled();
    });

    it('should handle empty lock list', async () => {
      mockRedisClient.keys.mockResolvedValue([]);

      const cleanedCount = await lockManager.cleanupOrphanedLocks();

      expect(cleanedCount).toBe(0);
    });
  });

  describe('isDuplicate', () => {
    const phoneNumberId = 'phone-123';
    const messageContent = 'Hello, world!';
    const expectedHash = crypto.createHash('sha256').update(messageContent).digest('hex');

    it('should return false for non-duplicate message', async () => {
      const isDupe = await lockManager.isDuplicate(phoneNumberId, messageContent);

      expect(isDupe).toBe(false);
      expect(redis.exists).toHaveBeenCalledWith(`dedup:${phoneNumberId}:${expectedHash}`);
    });

    it('should return true for duplicate message', async () => {
      (redis.exists as jest.Mock).mockResolvedValue(true);

      const isDupe = await lockManager.isDuplicate(phoneNumberId, messageContent);

      expect(isDupe).toBe(true);
    });

    it('should handle Redis errors during duplicate check', async () => {
      const error = new Error('Redis error');
      (redis.exists as jest.Mock).mockRejectedValue(error);

      await expect(lockManager.isDuplicate(phoneNumberId, messageContent)).rejects.toThrow('Redis error');
    });
  });

  describe('markAsProcessed', () => {
    const phoneNumberId = 'phone-123';
    const messageContent = 'Hello, world!';
    const expectedHash = crypto.createHash('sha256').update(messageContent).digest('hex');

    it('should mark message as processed with default TTL', async () => {
      await lockManager.markAsProcessed(phoneNumberId, messageContent);

      expect(redis.set).toHaveBeenCalledWith(
        `dedup:${phoneNumberId}:${expectedHash}`,
        '1',
        testDedupConfig.defaultTtlSeconds
      );
    });

    it('should mark message as processed with custom TTL', async () => {
      const customTtl = 10;
      await lockManager.markAsProcessed(phoneNumberId, messageContent, customTtl);

      expect(redis.set).toHaveBeenCalledWith(
        `dedup:${phoneNumberId}:${expectedHash}`,
        '1',
        customTtl
      );
    });

    it('should handle Redis errors during marking', async () => {
      const error = new Error('Redis error');
      (redis.set as jest.Mock).mockRejectedValue(error);

      await expect(lockManager.markAsProcessed(phoneNumberId, messageContent)).rejects.toThrow('Redis error');
    });
  });

  describe('removeDeduplication', () => {
    const phoneNumberId = 'phone-123';
    const messageContent = 'Hello, world!';
    const expectedHash = crypto.createHash('sha256').update(messageContent).digest('hex');

    it('should remove deduplication entry successfully', async () => {
      const removed = await lockManager.removeDeduplication(phoneNumberId, messageContent);

      expect(removed).toBe(true);
      expect(redis.del).toHaveBeenCalledWith(`dedup:${phoneNumberId}:${expectedHash}`);
    });

    it('should return false when entry does not exist', async () => {
      (redis.del as jest.Mock).mockResolvedValue(0);

      const removed = await lockManager.removeDeduplication(phoneNumberId, messageContent);

      expect(removed).toBe(false);
    });
  });

  describe('getLockStats', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return comprehensive lock statistics', async () => {
      mockRedisClient.keys
        .mockResolvedValueOnce(['lock:resource1', 'lock:resource2'])
        .mockResolvedValueOnce(['dedup:phone1:hash1', 'dedup:phone2:hash2', 'dedup:phone3:hash3']);
      mockRedisClient.ttl
        .mockResolvedValueOnce(30)
        .mockResolvedValueOnce(60);
        
      const stats = await lockManager.getLockStats();

      expect(stats).toEqual({
        activeLocks: 2,
        locksByResource: {
          'resource1': { key: 'lock:resource1', ttl: 30 },
          'resource2': { key: 'lock:resource2', ttl: 60 }
        },
        dedupEntries: 3
      });
    });

    it('should handle empty statistics', async () => {
      mockRedisClient.keys
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const stats = await lockManager.getLockStats();

      expect(stats).toEqual({
        activeLocks: 0,
        locksByResource: {},
        dedupEntries: 0
      });
    });
  });
});

describe('PhoneNumberLockManager', () => {
  let phoneNumberLockManager: PhoneNumberLockManager;
  let mockLockManager: jest.Mocked<RedisLockManager>;

  beforeEach(() => {
    mockLockManager = {
      acquireLock: jest.fn(),
      releaseLock: jest.fn(),
      isDuplicate: jest.fn(),
      markAsProcessed: jest.fn(),
    } as any;

    phoneNumberLockManager = new PhoneNumberLockManager(mockLockManager);
  });

  describe('acquirePhoneNumberLock', () => {
    it('should acquire lock for phone number resource', async () => {
      const mockLock: DistributedLock = {
        key: 'lock:phone:123',
        value: 'test-uuid',
        ttlMs: 60000,
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + 60000)
      };

      mockLockManager.acquireLock.mockResolvedValue(mockLock);

      const lock = await phoneNumberLockManager.acquirePhoneNumberLock('123', 60000);

      expect(lock).toBe(mockLock);
      expect(mockLockManager.acquireLock).toHaveBeenCalledWith('phone:123', 60000);
    });
  });

  describe('releasePhoneNumberLock', () => {
    it('should release phone number lock', async () => {
      const mockLock: DistributedLock = {
        key: 'lock:phone:123',
        value: 'test-uuid',
        ttlMs: 60000,
        acquiredAt: new Date(),
        expiresAt: new Date(Date.now() + 60000)
      };

      mockLockManager.releaseLock.mockResolvedValue(true);

      const released = await phoneNumberLockManager.releasePhoneNumberLock(mockLock);

      expect(released).toBe(true);
      expect(mockLockManager.releaseLock).toHaveBeenCalledWith(mockLock);
    });
  });

  describe('isMessageDuplicate', () => {
    it('should check for message duplicate', async () => {
      mockLockManager.isDuplicate.mockResolvedValue(false);

      const isDupe = await phoneNumberLockManager.isMessageDuplicate('123', 'Hello');

      expect(isDupe).toBe(false);
      expect(mockLockManager.isDuplicate).toHaveBeenCalledWith('123', 'Hello');
    });
  });

  describe('markMessageProcessed', () => {
    it('should mark message as processed', async () => {
      await phoneNumberLockManager.markMessageProcessed('123', 'Hello');

      expect(mockLockManager.markAsProcessed).toHaveBeenCalledWith('123', 'Hello');
    });
  });
});

describe('Factory functions and defaults', () => {
  describe('createLockManager', () => {
    it('should create lock manager with provided configs', () => {
      const lockConfig: LockConfig = {
        defaultTtlMs: 30000,
        retryDelayMs: 100,
        maxRetries: 5,
        lockTimeoutMs: 10000
      };

      const dedupConfig: DeduplicationConfig = {
        defaultTtlSeconds: 10,
        hashAlgorithm: 'md5'
      };

      const manager = createLockManager(lockConfig, dedupConfig);
      expect(manager).toBeInstanceOf(RedisLockManager);
    });
  });

  describe('createPhoneNumberLockManager', () => {
    it('should create phone number lock manager', () => {
      const mockLockManager = {} as RedisLockManager;
      const phoneManager = createPhoneNumberLockManager(mockLockManager);
      expect(phoneManager).toBeInstanceOf(PhoneNumberLockManager);
    });
  });

  describe('default configurations', () => {
    it('should provide sensible default lock configuration', () => {
      expect(defaultLockConfig).toEqual({
        defaultTtlMs: 300000,    // 5 minutes
        retryDelayMs: 100,       // 100ms between retries
        maxRetries: 10,          // 10 retry attempts
        lockTimeoutMs: 5000      // 5 second timeout for lock acquisition
      });
    });

    it('should provide sensible default deduplication configuration', () => {
      expect(defaultDeduplicationConfig).toEqual({
        defaultTtlSeconds: 5,    // 5 second deduplication window
        hashAlgorithm: 'sha256'  // SHA-256 for message hashing
      });
    });
  });
});