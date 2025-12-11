/**
 * Cache Manager Wrapper
 * Simplified wrapper around storage for caching operations
 */

import { storage } from './storage';
import { logger } from './logger';

export class CacheManager {
  private static instance: CacheManager;

  private constructor() {}

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Get value from cache
   */
  public async get(key: string): Promise<string | null> {
    return await storage.get(key);
  }

  /**
   * Set value in cache
   */
  public async set(key: string, value: string, ttlSeconds: number = 300): Promise<void> {
    await storage.set(key, value, ttlSeconds);
  }

  /**
   * Delete key from cache
   */
  public async del(key: string): Promise<number> {
    return await storage.del(key);
  }

  /**
   * Check if key exists
   */
  public async exists(key: string): Promise<boolean> {
    return await storage.exists(key);
  }

  /**
   * Set expiration on key
   */
  public async expire(key: string, seconds: number): Promise<boolean> {
    return await storage.expire(key, seconds);
  }

  /**
   * Add member to set
   */
  public async sAdd(key: string, member: string): Promise<number> {
    return await storage.sAdd(key, member);
  }

  /**
   * Get all members of set
   */
  public async sMembers(key: string): Promise<string[]> {
    return await storage.sMembers(key);
  }

  /**
   * Remove member from set
   */
  public async sRem(key: string, member: string): Promise<number> {
    return await storage.sRem(key, member);
  }

  /**
   * Get set cardinality (size)
   */
  public async sCard(key: string): Promise<number> {
    return await storage.sCard(key);
  }

  /**
   * Increment value atomically
   */
  public async incr(key: string): Promise<number> {
    return await storage.incr(key);
  }

  /**
   * Get JSON value from cache
   */
  public async getJSON<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error('Failed to parse JSON from cache', { key, error });
      return null;
    }
  }

  /**
   * Set JSON value in cache
   */
  public async setJSON<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }
}

// Export singleton instance
export const cache = CacheManager.getInstance();
