import { CacheService, cacheService, CachedUserData, CachedAgentMapping } from '../../../src/services/cacheService';

// Mock dependencies before imports
jest.mock('../../../src/utils/redis', () => ({
  redis: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  },
}));

jest.mock('../../../src/utils/database', () => ({
  db: {
    query: jest.fn(),
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Import mocked dependencies after mocking
import { redis } from '../../../src/utils/redis';
import { db } from '../../../src/utils/database';

describe('CacheService', () => {
  let service: CacheService;
  const mockUserId = 'user-123';
  const mockPhoneNumberId = 'phone-456';
  const mockAgentId = 'agent-789';

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CacheService();
  });

  describe('getUserData', () => {
    const mockUserData: CachedUserData = {
      userId: mockUserId,
      credits: 100,
      agents: [
        {
          agentId: 'agent-1',
          phoneNumberId: 'phone-1',
          promptId: 'prompt-1',
          name: 'Test Agent',
        },
      ],
      phoneNumbers: [
        {
          id: 'phone-1',
          platform: 'whatsapp',
          metaPhoneNumberId: 'meta-123',
          accessToken: 'token-123',
          displayName: 'Test Phone',
        },
      ],
      cachedAt: '2024-01-01T00:00:00.000Z',
    };

    it('should return user data from cache when available', async () => {
      // Arrange
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(mockUserData));

      // Act
      const result = await service.getUserData(mockUserId);

      // Assert
      expect(result).toEqual(mockUserData);
      expect(redis.get).toHaveBeenCalledWith(`cache:user:${mockUserId}`);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should query database and cache result on cache miss', async () => {
      // Arrange
      (redis.get as jest.Mock).mockResolvedValue(null);
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ remaining_credits: 100 }] }) // Credits query
        .mockResolvedValueOnce({ rows: [] }) // Agents query
        .mockResolvedValueOnce({ rows: [] }); // Phone numbers query
      (redis.set as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await service.getUserData(mockUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.userId).toBe(mockUserId);
      expect(result?.credits).toBe(100);
      expect(redis.get).toHaveBeenCalledWith(`cache:user:${mockUserId}`);
      expect(db.query).toHaveBeenCalledTimes(3);
      expect(redis.set).toHaveBeenCalled();
    });

    it('should return null when user not found in database', async () => {
      // Arrange
      (redis.get as jest.Mock).mockResolvedValue(null);
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // Credits query - no user
        .mockResolvedValueOnce({ rows: [] }) // Agents query
        .mockResolvedValueOnce({ rows: [] }); // Phone numbers query

      // Act
      const result = await service.getUserData(mockUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.credits).toBe(0);
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      (redis.get as jest.Mock).mockResolvedValue(null);
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.getUserData(mockUserId)).rejects.toThrow('Database error');
    });

    it('should handle cache errors and throw', async () => {
      // Arrange
      (redis.get as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Act & Assert
      await expect(service.getUserData(mockUserId)).rejects.toThrow('Redis error');
    });
  });

  describe('setUserData', () => {
    const mockUserData: CachedUserData = {
      userId: mockUserId,
      credits: 100,
      agents: [],
      phoneNumbers: [],
      cachedAt: '2024-01-01T00:00:00.000Z',
    };

    it('should cache user data with default TTL', async () => {
      // Arrange
      (redis.set as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.setUserData(mockUserId, mockUserData);

      // Assert
      expect(redis.set).toHaveBeenCalledWith(
        `cache:user:${mockUserId}`,
        JSON.stringify(mockUserData),
        300 // Default TTL
      );
    });

    it('should cache user data with custom TTL', async () => {
      // Arrange
      (redis.set as jest.Mock).mockResolvedValue(undefined);
      const customTTL = 600;

      // Act
      await service.setUserData(mockUserId, mockUserData, customTTL);

      // Assert
      expect(redis.set).toHaveBeenCalledWith(
        `cache:user:${mockUserId}`,
        JSON.stringify(mockUserData),
        customTTL
      );
    });

    it('should not throw error when caching fails', async () => {
      // Arrange
      (redis.set as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Act & Assert
      await expect(service.setUserData(mockUserId, mockUserData)).resolves.not.toThrow();
    });
  });

  describe('getAgentMapping', () => {
    const mockAgentMapping: CachedAgentMapping = {
      agentId: mockAgentId,
      userId: mockUserId,
      phoneNumberId: mockPhoneNumberId,
      promptId: 'prompt-123',
      name: 'Test Agent',
      credits: 100,
      metaPhoneNumberId: 'meta-123',
      accessToken: 'token-123',
      platform: 'whatsapp',
    };

    it('should return agent mapping from cache when available', async () => {
      // Arrange
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(mockAgentMapping));

      // Act
      const result = await service.getAgentMapping(mockPhoneNumberId);

      // Assert
      expect(result).toEqual(mockAgentMapping);
      expect(redis.get).toHaveBeenCalledWith(`cache:agent:phone:${mockPhoneNumberId}`);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should query database and cache result on cache miss', async () => {
      // Arrange
      (redis.get as jest.Mock).mockResolvedValue(null);
      (db.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            agent_id: mockAgentId,
            user_id: mockUserId,
            phone_number_id: mockPhoneNumberId,
            prompt_id: 'prompt-123',
            name: 'Test Agent',
            credits: 100,
            meta_phone_number_id: 'meta-123',
            access_token: 'token-123',
            platform: 'whatsapp',
          },
        ],
      });
      (redis.set as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await service.getAgentMapping(mockPhoneNumberId);

      // Assert
      expect(result).toEqual(mockAgentMapping);
      expect(db.query).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalled();
    });

    it('should return null when agent mapping not found', async () => {
      // Arrange
      (redis.get as jest.Mock).mockResolvedValue(null);
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Act
      const result = await service.getAgentMapping(mockPhoneNumberId);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      (redis.get as jest.Mock).mockResolvedValue(null);
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.getAgentMapping(mockPhoneNumberId)).rejects.toThrow('Database error');
    });
  });

  describe('setAgentMapping', () => {
    const mockAgentMapping: CachedAgentMapping = {
      agentId: mockAgentId,
      userId: mockUserId,
      phoneNumberId: mockPhoneNumberId,
      promptId: 'prompt-123',
      name: 'Test Agent',
      credits: 100,
      metaPhoneNumberId: 'meta-123',
      accessToken: 'token-123',
      platform: 'whatsapp',
    };

    it('should cache agent mapping with default TTL', async () => {
      // Arrange
      (redis.set as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.setAgentMapping(mockPhoneNumberId, mockAgentMapping);

      // Assert
      expect(redis.set).toHaveBeenCalledWith(
        `cache:agent:phone:${mockPhoneNumberId}`,
        JSON.stringify(mockAgentMapping),
        300
      );
    });

    it('should cache agent mapping with custom TTL', async () => {
      // Arrange
      (redis.set as jest.Mock).mockResolvedValue(undefined);
      const customTTL = 600;

      // Act
      await service.setAgentMapping(mockPhoneNumberId, mockAgentMapping, customTTL);

      // Assert
      expect(redis.set).toHaveBeenCalledWith(
        `cache:agent:phone:${mockPhoneNumberId}`,
        JSON.stringify(mockAgentMapping),
        customTTL
      );
    });

    it('should not throw error when caching fails', async () => {
      // Arrange
      (redis.set as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Act & Assert
      await expect(service.setAgentMapping(mockPhoneNumberId, mockAgentMapping)).resolves.not.toThrow();
    });
  });

  describe('getAgentById', () => {
    const mockAgent = {
      agent_id: mockAgentId,
      user_id: mockUserId,
      phone_number_id: mockPhoneNumberId,
      prompt_id: 'prompt-123',
      name: 'Test Agent',
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-01-01'),
    };

    it('should return agent from cache when available', async () => {
      // Arrange
      // When cached, dates are serialized as strings
      const cachedAgent = {
        ...mockAgent,
        created_at: mockAgent.created_at.toISOString(),
        updated_at: mockAgent.updated_at.toISOString(),
      };
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(cachedAgent));

      // Act
      const result = await service.getAgentById(mockAgentId);

      // Assert
      expect(result).toEqual(cachedAgent);
      expect(redis.get).toHaveBeenCalledWith(`cache:agent:${mockAgentId}`);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should query database and cache result on cache miss', async () => {
      // Arrange
      (redis.get as jest.Mock).mockResolvedValue(null);
      (db.query as jest.Mock).mockResolvedValue({ rows: [mockAgent] });
      (redis.set as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await service.getAgentById(mockAgentId);

      // Assert
      expect(result).toEqual(mockAgent);
      expect(db.query).toHaveBeenCalledWith('SELECT * FROM agents WHERE agent_id = $1', [mockAgentId]);
      expect(redis.set).toHaveBeenCalled();
    });

    it('should return null when agent not found', async () => {
      // Arrange
      (redis.get as jest.Mock).mockResolvedValue(null);
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Act
      const result = await service.getAgentById(mockAgentId);

      // Assert
      expect(result).toBeNull();
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      (redis.get as jest.Mock).mockResolvedValue(null);
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.getAgentById(mockAgentId)).rejects.toThrow('Database error');
    });
  });

  describe('getUserCredits', () => {
    it('should return credits from cache when available', async () => {
      // Arrange
      (redis.get as jest.Mock).mockResolvedValue('150');

      // Act
      const result = await service.getUserCredits(mockUserId);

      // Assert
      expect(result).toBe(150);
      expect(redis.get).toHaveBeenCalledWith(`cache:credits:${mockUserId}`);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should query database and cache result on cache miss', async () => {
      // Arrange
      (redis.get as jest.Mock).mockResolvedValue(null);
      (db.query as jest.Mock).mockResolvedValue({ rows: [{ remaining_credits: 200 }] });
      (redis.set as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await service.getUserCredits(mockUserId);

      // Assert
      expect(result).toBe(200);
      expect(db.query).toHaveBeenCalledWith('SELECT remaining_credits FROM credits WHERE user_id = $1', [mockUserId]);
      expect(redis.set).toHaveBeenCalledWith(`cache:credits:${mockUserId}`, '200', 300);
    });

    it('should return 0 when user not found in database', async () => {
      // Arrange
      (redis.get as jest.Mock).mockResolvedValue(null);
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });
      (redis.set as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await service.getUserCredits(mockUserId);

      // Assert
      expect(result).toBe(0);
      expect(redis.set).toHaveBeenCalledWith(`cache:credits:${mockUserId}`, '0', 300);
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      (redis.get as jest.Mock).mockResolvedValue(null);
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.getUserCredits(mockUserId)).rejects.toThrow('Database error');
    });
  });

  describe('invalidateUserData', () => {
    it('should delete user data cache', async () => {
      // Arrange
      (redis.del as jest.Mock).mockResolvedValue(1);

      // Act
      await service.invalidateUserData(mockUserId);

      // Assert
      expect(redis.del).toHaveBeenCalledWith(`cache:user:${mockUserId}`);
    });

    it('should not throw error when deletion fails', async () => {
      // Arrange
      (redis.del as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Act & Assert
      await expect(service.invalidateUserData(mockUserId)).resolves.not.toThrow();
    });
  });

  describe('invalidateAgentMapping', () => {
    it('should delete agent mapping cache', async () => {
      // Arrange
      (redis.del as jest.Mock).mockResolvedValue(1);

      // Act
      await service.invalidateAgentMapping(mockPhoneNumberId);

      // Assert
      expect(redis.del).toHaveBeenCalledWith(`cache:agent:phone:${mockPhoneNumberId}`);
    });

    it('should not throw error when deletion fails', async () => {
      // Arrange
      (redis.del as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Act & Assert
      await expect(service.invalidateAgentMapping(mockPhoneNumberId)).resolves.not.toThrow();
    });
  });

  describe('invalidateAgent', () => {
    it('should delete agent cache', async () => {
      // Arrange
      (redis.del as jest.Mock).mockResolvedValue(1);

      // Act
      await service.invalidateAgent(mockAgentId);

      // Assert
      expect(redis.del).toHaveBeenCalledWith(`cache:agent:${mockAgentId}`);
    });

    it('should not throw error when deletion fails', async () => {
      // Arrange
      (redis.del as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Act & Assert
      await expect(service.invalidateAgent(mockAgentId)).resolves.not.toThrow();
    });
  });

  describe('invalidateCredits', () => {
    it('should delete credits cache', async () => {
      // Arrange
      (redis.del as jest.Mock).mockResolvedValue(1);

      // Act
      await service.invalidateCredits(mockUserId);

      // Assert
      expect(redis.del).toHaveBeenCalledWith(`cache:credits:${mockUserId}`);
    });

    it('should not throw error when deletion fails', async () => {
      // Arrange
      (redis.del as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Act & Assert
      await expect(service.invalidateCredits(mockUserId)).resolves.not.toThrow();
    });
  });

  describe('invalidateAllUserCaches', () => {
    it('should invalidate all user-related caches', async () => {
      // Arrange
      const phoneNumberIds = ['phone-1', 'phone-2'];
      (redis.del as jest.Mock).mockResolvedValue(1);

      // Act
      await service.invalidateAllUserCaches(mockUserId, phoneNumberIds);

      // Assert
      expect(redis.del).toHaveBeenCalledWith(`cache:user:${mockUserId}`);
      expect(redis.del).toHaveBeenCalledWith(`cache:credits:${mockUserId}`);
      expect(redis.del).toHaveBeenCalledWith('cache:agent:phone:phone-1');
      expect(redis.del).toHaveBeenCalledWith('cache:agent:phone:phone-2');
      expect(redis.del).toHaveBeenCalledTimes(4);
    });

    it('should invalidate user and credits caches without phone numbers', async () => {
      // Arrange
      (redis.del as jest.Mock).mockResolvedValue(1);

      // Act
      await service.invalidateAllUserCaches(mockUserId);

      // Assert
      expect(redis.del).toHaveBeenCalledWith(`cache:user:${mockUserId}`);
      expect(redis.del).toHaveBeenCalledWith(`cache:credits:${mockUserId}`);
      expect(redis.del).toHaveBeenCalledTimes(2);
    });

    it('should not throw error when invalidation fails', async () => {
      // Arrange
      (redis.del as jest.Mock).mockRejectedValue(new Error('Redis error'));

      // Act & Assert
      await expect(service.invalidateAllUserCaches(mockUserId)).resolves.not.toThrow();
    });
  });

  describe('refreshUserData', () => {
    it('should fetch fresh data and update cache', async () => {
      // Arrange
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ remaining_credits: 100 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      (redis.set as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await service.refreshUserData(mockUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.userId).toBe(mockUserId);
      expect(result?.credits).toBe(100);
      expect(redis.set).toHaveBeenCalled();
    });

    it('should return null when user not found', async () => {
      // Arrange
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });

      // Act
      const result = await service.refreshUserData(mockUserId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.credits).toBe(0);
    });

    it('should use custom TTL when provided', async () => {
      // Arrange
      const customTTL = 600;
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ remaining_credits: 100 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      (redis.set as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.refreshUserData(mockUserId, customTTL);

      // Assert
      expect(redis.set).toHaveBeenCalledWith(
        `cache:user:${mockUserId}`,
        expect.any(String),
        customTTL
      );
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.refreshUserData(mockUserId)).rejects.toThrow('Database error');
    });
  });

  describe('refreshAgentMapping', () => {
    it('should fetch fresh mapping and update cache', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            agent_id: mockAgentId,
            user_id: mockUserId,
            phone_number_id: mockPhoneNumberId,
            prompt_id: 'prompt-123',
            name: 'Test Agent',
            credits: 100,
            meta_phone_number_id: 'meta-123',
            access_token: 'token-123',
            platform: 'whatsapp',
          },
        ],
      });
      (redis.set as jest.Mock).mockResolvedValue(undefined);

      // Act
      const result = await service.refreshAgentMapping(mockPhoneNumberId);

      // Assert
      expect(result).toBeDefined();
      expect(result?.agentId).toBe(mockAgentId);
      expect(redis.set).toHaveBeenCalled();
    });

    it('should return null when mapping not found', async () => {
      // Arrange
      (db.query as jest.Mock).mockResolvedValue({ rows: [] });

      // Act
      const result = await service.refreshAgentMapping(mockPhoneNumberId);

      // Assert
      expect(result).toBeNull();
    });

    it('should use custom TTL when provided', async () => {
      // Arrange
      const customTTL = 600;
      (db.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            agent_id: mockAgentId,
            user_id: mockUserId,
            phone_number_id: mockPhoneNumberId,
            prompt_id: 'prompt-123',
            name: 'Test Agent',
            credits: 100,
            meta_phone_number_id: 'meta-123',
            access_token: 'token-123',
            platform: 'whatsapp',
          },
        ],
      });
      (redis.set as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.refreshAgentMapping(mockPhoneNumberId, customTTL);

      // Assert
      expect(redis.set).toHaveBeenCalledWith(
        `cache:agent:phone:${mockPhoneNumberId}`,
        expect.any(String),
        customTTL
      );
    });

    it('should throw error when database query fails', async () => {
      // Arrange
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.refreshAgentMapping(mockPhoneNumberId)).rejects.toThrow('Database error');
    });
  });

  describe('warmCache', () => {
    it('should pre-load user data with extended TTL', async () => {
      // Arrange
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ remaining_credits: 100 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      (redis.set as jest.Mock).mockResolvedValue(undefined);

      // Act
      await service.warmCache(mockUserId);

      // Assert
      expect(redis.set).toHaveBeenCalledWith(
        `cache:user:${mockUserId}`,
        expect.any(String),
        600 // Extended TTL
      );
    });

    it('should not throw error when warming fails', async () => {
      // Arrange
      (db.query as jest.Mock).mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(service.warmCache(mockUserId)).resolves.not.toThrow();
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete cache lifecycle: set, get, invalidate', async () => {
      const mockUserData: CachedUserData = {
        userId: mockUserId,
        credits: 100,
        agents: [],
        phoneNumbers: [],
        cachedAt: '2024-01-01T00:00:00.000Z',
      };

      // Set cache
      (redis.set as jest.Mock).mockResolvedValue(undefined);
      await service.setUserData(mockUserId, mockUserData);
      expect(redis.set).toHaveBeenCalled();

      // Get from cache
      (redis.get as jest.Mock).mockResolvedValue(JSON.stringify(mockUserData));
      const result = await service.getUserData(mockUserId);
      expect(result).toEqual(mockUserData);

      // Invalidate cache
      (redis.del as jest.Mock).mockResolvedValue(1);
      await service.invalidateUserData(mockUserId);
      expect(redis.del).toHaveBeenCalled();
    });

    it('should handle cache-aside pattern correctly', async () => {
      // First call - cache miss, query database
      (redis.get as jest.Mock).mockResolvedValueOnce(null);
      (db.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ remaining_credits: 100 }] })
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [] });
      (redis.set as jest.Mock).mockResolvedValue(undefined);

      const result1 = await service.getUserData(mockUserId);
      expect(db.query).toHaveBeenCalled();
      expect(redis.set).toHaveBeenCalled();

      // Second call - cache hit, no database query
      jest.clearAllMocks();
      (redis.get as jest.Mock).mockResolvedValueOnce(JSON.stringify(result1));

      const result2 = await service.getUserData(mockUserId);
      expect(result2).toEqual(result1);
      expect(db.query).not.toHaveBeenCalled();
    });

    it('should handle agent mapping with credits lookup', async () => {
      // Get agent mapping with credits
      (redis.get as jest.Mock).mockResolvedValue(null);
      (db.query as jest.Mock).mockResolvedValue({
        rows: [
          {
            agent_id: mockAgentId,
            user_id: mockUserId,
            phone_number_id: mockPhoneNumberId,
            prompt_id: 'prompt-123',
            name: 'Test Agent',
            credits: 150,
            meta_phone_number_id: 'meta-123',
            access_token: 'token-123',
            platform: 'whatsapp',
          },
        ],
      });
      (redis.set as jest.Mock).mockResolvedValue(undefined);

      const mapping = await service.getAgentMapping(mockPhoneNumberId);
      expect(mapping?.credits).toBe(150);
      expect(mapping?.accessToken).toBe('token-123');
    });
  });

  describe('Singleton instance', () => {
    it('should export singleton instance', () => {
      expect(cacheService).toBeInstanceOf(CacheService);
    });
  });
});
