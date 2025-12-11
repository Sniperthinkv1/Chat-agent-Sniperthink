import { cache } from '../utils/cacheManager';
import { logger } from '../utils/logger';
import { db } from '../utils/database';
import { Agent } from '../models/types';

// Redis cache TTL (5-10 minutes)
const DEFAULT_CACHE_TTL = 300; // 5 minutes
const EXTENDED_CACHE_TTL = 600; // 10 minutes

/**
 * Cached user data structure with agent mappings and credit balances
 */
export interface CachedUserData {
  userId: string;
  credits: number;
  agents: CachedAgentData[];
  phoneNumbers: CachedPhoneNumberData[];
  cachedAt: string;
}

export interface CachedAgentData {
  agentId: string;
  phoneNumberId: string;
  promptId: string;
  name: string;
}

export interface CachedPhoneNumberData {
  id: string;
  platform: string;
  metaPhoneNumberId: string;
  accessToken: string;
  displayName: string | null;
}

/**
 * Cached agent mapping for quick lookups
 */
export interface CachedAgentMapping {
  agentId: string;
  userId: string;
  phoneNumberId: string;
  promptId: string;
  name: string;
  credits: number;
  metaPhoneNumberId: string;
  accessToken: string;
  platform: string;
}

/**
 * Redis key generators
 */
const getCacheKey = {
  userData: (userId: string): string => `cache:user:${userId}`,
  agentMapping: (phoneNumberId: string): string => `cache:agent:phone:${phoneNumberId}`,
  agentById: (agentId: string): string => `cache:agent:${agentId}`,
  credits: (userId: string): string => `cache:credits:${userId}`,
};

/**
 * CacheService - Implements cache-aside pattern with database fallback
 */
export class CacheService {
  /**
   * Get complete user data with agent mappings and credit balance
   * Implements cache-aside pattern: check cache first, fallback to database
   */
  async getUserData(userId: string): Promise<CachedUserData | null> {
    const correlationId = `get-user-data-${userId}`;
    const cacheKey = getCacheKey.userData(userId);

    try {
      // Try cache first
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        const userData = JSON.parse(cachedData) as CachedUserData;
        logger.debug('Retrieved user data from cache', {
          correlationId,
          userId,
          agentCount: userData.agents.length,
          phoneNumberCount: userData.phoneNumbers.length,
        });
        return userData;
      }

      // Cache miss - query database
      logger.debug('Cache miss for user data, querying database', { correlationId, userId });
      const userData = await this.fetchUserDataFromDatabase(userId);

      if (!userData) {
        logger.warn('User not found in database', { correlationId, userId });
        return null;
      }

      // Cache the result
      await this.setUserData(userId, userData, DEFAULT_CACHE_TTL);

      return userData;
    } catch (error) {
      logger.error('Failed to get user data', {
        correlationId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Fetch user data from database
   */
  private async fetchUserDataFromDatabase(userId: string): Promise<CachedUserData | null> {
    try {
      // Get user credits
      const creditsQuery = 'SELECT remaining_credits FROM credits WHERE user_id = $1';
      const creditsResult = await db.query(creditsQuery, [userId]);
      const credits = creditsResult.rows.length > 0 ? creditsResult.rows[0].remaining_credits : 0;

      // Get user's agents with phone number details
      const agentsQuery = `
        SELECT 
          a.agent_id,
          a.phone_number_id,
          a.prompt_id,
          a.name,
          p.platform,
          p.meta_phone_number_id,
          p.access_token,
          p.display_name
        FROM agents a
        JOIN phone_numbers p ON a.phone_number_id = p.id
        WHERE a.user_id = $1
        ORDER BY a.created_at DESC
      `;
      const agentsResult = await db.query(agentsQuery, [userId]);

      // Get all phone numbers for the user
      const phoneNumbersQuery = `
        SELECT id, platform, meta_phone_number_id, access_token, display_name
        FROM phone_numbers
        WHERE user_id = $1
        ORDER BY created_at DESC
      `;
      const phoneNumbersResult = await db.query(phoneNumbersQuery, [userId]);

      const userData: CachedUserData = {
        userId,
        credits,
        agents: agentsResult.rows.map((row) => ({
          agentId: row.agent_id,
          phoneNumberId: row.phone_number_id,
          promptId: row.prompt_id,
          name: row.name,
        })),
        phoneNumbers: phoneNumbersResult.rows.map((row) => ({
          id: row.id,
          platform: row.platform,
          metaPhoneNumberId: row.meta_phone_number_id,
          accessToken: row.access_token,
          displayName: row.display_name,
        })),
        cachedAt: new Date().toISOString(),
      };

      return userData;
    } catch (error) {
      logger.error('Failed to fetch user data from database', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Set user data in cache with TTL
   */
  async setUserData(userId: string, userData: CachedUserData, ttlSeconds: number = DEFAULT_CACHE_TTL): Promise<void> {
    const cacheKey = getCacheKey.userData(userId);

    try {
      await cache.set(cacheKey, JSON.stringify(userData), ttlSeconds);
      logger.debug('Cached user data', {
        userId,
        ttl: ttlSeconds,
        agentCount: userData.agents.length,
        phoneNumberCount: userData.phoneNumbers.length,
      });
    } catch (error) {
      logger.error('Failed to cache user data', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - caching failure shouldn't break the flow
    }
  }

  /**
   * Get agent mapping by phone number ID
   * Returns complete agent info with user credits and access token
   */
  async getAgentMapping(phoneNumberId: string): Promise<CachedAgentMapping | null> {
    const correlationId = `get-agent-mapping-${phoneNumberId}`;
    const cacheKey = getCacheKey.agentMapping(phoneNumberId);

    try {
      // Try cache first
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        const mapping = JSON.parse(cachedData) as CachedAgentMapping;
        logger.debug('Retrieved agent mapping from cache', {
          correlationId,
          phoneNumberId,
          agentId: mapping.agentId,
        });
        return mapping;
      }

      // Cache miss - query database
      logger.debug('Cache miss for agent mapping, querying database', { correlationId, phoneNumberId });
      const mapping = await this.fetchAgentMappingFromDatabase(phoneNumberId);

      if (!mapping) {
        logger.warn('Agent mapping not found in database', { correlationId, phoneNumberId });
        return null;
      }

      // Cache the result
      await this.setAgentMapping(phoneNumberId, mapping, DEFAULT_CACHE_TTL);

      return mapping;
    } catch (error) {
      logger.error('Failed to get agent mapping', {
        correlationId,
        phoneNumberId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Fetch agent mapping from database
   */
  private async fetchAgentMappingFromDatabase(phoneNumberId: string): Promise<CachedAgentMapping | null> {
    try {
      const query = `
        SELECT 
          a.agent_id,
          a.user_id,
          a.phone_number_id,
          a.prompt_id,
          a.name,
          p.meta_phone_number_id,
          p.access_token,
          p.platform,
          COALESCE(c.remaining_credits, 0) as credits
        FROM agents a
        JOIN phone_numbers p ON a.phone_number_id = p.id
        LEFT JOIN credits c ON a.user_id = c.user_id
        WHERE a.phone_number_id = $1
      `;

      const result = await db.query(query, [phoneNumberId]);

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        agentId: row.agent_id,
        userId: row.user_id,
        phoneNumberId: row.phone_number_id,
        promptId: row.prompt_id,
        name: row.name,
        credits: row.credits,
        metaPhoneNumberId: row.meta_phone_number_id,
        accessToken: row.access_token,
        platform: row.platform,
      };
    } catch (error) {
      logger.error('Failed to fetch agent mapping from database', {
        phoneNumberId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Set agent mapping in cache with TTL
   */
  async setAgentMapping(
    phoneNumberId: string,
    mapping: CachedAgentMapping,
    ttlSeconds: number = DEFAULT_CACHE_TTL
  ): Promise<void> {
    const cacheKey = getCacheKey.agentMapping(phoneNumberId);

    try {
      await cache.set(cacheKey, JSON.stringify(mapping), ttlSeconds);
      logger.debug('Cached agent mapping', {
        phoneNumberId,
        agentId: mapping.agentId,
        ttl: ttlSeconds,
      });
    } catch (error) {
      logger.error('Failed to cache agent mapping', {
        phoneNumberId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - caching failure shouldn't break the flow
    }
  }

  /**
   * Get agent by ID with caching
   */
  async getAgentById(agentId: string): Promise<Agent | null> {
    const correlationId = `get-agent-${agentId}`;
    const cacheKey = getCacheKey.agentById(agentId);

    try {
      // Try cache first
      const cachedData = await cache.get(cacheKey);
      if (cachedData) {
        const agent = JSON.parse(cachedData) as Agent;
        logger.debug('Retrieved agent from cache', { correlationId, agentId });
        return agent;
      }

      // Cache miss - query database
      logger.debug('Cache miss for agent, querying database', { correlationId, agentId });
      const query = 'SELECT * FROM agents WHERE agent_id = $1';
      const result = await db.query(query, [agentId]);

      if (result.rows.length === 0) {
        return null;
      }

      const agent: Agent = {
        agent_id: result.rows[0].agent_id,
        user_id: result.rows[0].user_id,
        phone_number_id: result.rows[0].phone_number_id,
        prompt_id: result.rows[0].prompt_id,
        name: result.rows[0].name,
        created_at: result.rows[0].created_at,
        updated_at: result.rows[0].updated_at,
      };

      // Cache the result
      await cache.set(cacheKey, JSON.stringify(agent), DEFAULT_CACHE_TTL);

      return agent;
    } catch (error) {
      logger.error('Failed to get agent', {
        correlationId,
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get user credits with caching
   */
  async getUserCredits(userId: string): Promise<number> {
    const correlationId = `get-credits-${userId}`;
    const cacheKey = getCacheKey.credits(userId);

    try {
      // Try cache first
      const cachedCredits = await cache.get(cacheKey);
      if (cachedCredits !== null) {
        const credits = parseInt(cachedCredits, 10);
        logger.debug('Retrieved credits from cache', { correlationId, userId, credits });
        return credits;
      }

      // Cache miss - query database
      logger.debug('Cache miss for credits, querying database', { correlationId, userId });
      const query = 'SELECT remaining_credits FROM credits WHERE user_id = $1';
      const result = await db.query(query, [userId]);

      const credits = result.rows.length > 0 ? result.rows[0].remaining_credits : 0;

      // Cache the result
      await cache.set(cacheKey, credits.toString(), DEFAULT_CACHE_TTL);

      return credits;
    } catch (error) {
      logger.error('Failed to get credits', {
        correlationId,
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Invalidate user data cache
   * Called when user, agent, or phone number data is modified
   */
  async invalidateUserData(userId: string): Promise<void> {
    const cacheKey = getCacheKey.userData(userId);

    try {
      await cache.del(cacheKey);
      logger.debug('Invalidated user data cache', { userId });
    } catch (error) {
      logger.error('Failed to invalidate user data cache', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - cache invalidation failure shouldn't break the flow
    }
  }

  /**
   * Invalidate agent mapping cache
   * Called when agent or phone number is modified
   */
  async invalidateAgentMapping(phoneNumberId: string): Promise<void> {
    const cacheKey = getCacheKey.agentMapping(phoneNumberId);

    try {
      await cache.del(cacheKey);
      logger.debug('Invalidated agent mapping cache', { phoneNumberId });
    } catch (error) {
      logger.error('Failed to invalidate agent mapping cache', {
        phoneNumberId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - cache invalidation failure shouldn't break the flow
    }
  }

  /**
   * Invalidate agent cache by ID
   */
  async invalidateAgent(agentId: string): Promise<void> {
    const cacheKey = getCacheKey.agentById(agentId);

    try {
      await cache.del(cacheKey);
      logger.debug('Invalidated agent cache', { agentId });
    } catch (error) {
      logger.error('Failed to invalidate agent cache', {
        agentId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - cache invalidation failure shouldn't break the flow
    }
  }

  /**
   * Invalidate credits cache
   * Called when credits are added or deducted
   */
  async invalidateCredits(userId: string): Promise<void> {
    const cacheKey = getCacheKey.credits(userId);

    try {
      await cache.del(cacheKey);
      logger.debug('Invalidated credits cache', { userId });
    } catch (error) {
      logger.error('Failed to invalidate credits cache', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - cache invalidation failure shouldn't break the flow
    }
  }

  /**
   * Invalidate all caches related to a user
   * Called on major user modifications
   */
  async invalidateAllUserCaches(userId: string, phoneNumberIds?: string[]): Promise<void> {
    try {
      // Invalidate user data cache
      await this.invalidateUserData(userId);

      // Invalidate credits cache
      await this.invalidateCredits(userId);

      // Invalidate agent mappings if phone number IDs provided
      if (phoneNumberIds && phoneNumberIds.length > 0) {
        await Promise.all(phoneNumberIds.map((id) => this.invalidateAgentMapping(id)));
      }

      logger.debug('Invalidated all user caches', { userId, phoneNumberCount: phoneNumberIds?.length || 0 });
    } catch (error) {
      logger.error('Failed to invalidate all user caches', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - cache invalidation failure shouldn't break the flow
    }
  }

  /**
   * Refresh user data cache
   * Fetches fresh data from database and updates cache
   */
  async refreshUserData(userId: string, ttlSeconds: number = DEFAULT_CACHE_TTL): Promise<CachedUserData | null> {
    try {
      const userData = await this.fetchUserDataFromDatabase(userId);

      if (!userData) {
        return null;
      }

      await this.setUserData(userId, userData, ttlSeconds);

      logger.debug('Refreshed user data cache', { userId, ttl: ttlSeconds });

      return userData;
    } catch (error) {
      logger.error('Failed to refresh user data cache', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Refresh agent mapping cache
   */
  async refreshAgentMapping(
    phoneNumberId: string,
    ttlSeconds: number = DEFAULT_CACHE_TTL
  ): Promise<CachedAgentMapping | null> {
    try {
      const mapping = await this.fetchAgentMappingFromDatabase(phoneNumberId);

      if (!mapping) {
        return null;
      }

      await this.setAgentMapping(phoneNumberId, mapping, ttlSeconds);

      logger.debug('Refreshed agent mapping cache', { phoneNumberId, ttl: ttlSeconds });

      return mapping;
    } catch (error) {
      logger.error('Failed to refresh agent mapping cache', {
        phoneNumberId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Warm cache for a user
   * Pre-loads user data into cache for performance optimization
   */
  async warmCache(userId: string): Promise<void> {
    try {
      await this.refreshUserData(userId, EXTENDED_CACHE_TTL);
      logger.info('Cache warmed for user', { userId });
    } catch (error) {
      logger.error('Failed to warm cache', {
        userId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      // Don't throw - cache warming failure shouldn't break the flow
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
