/**
 * Lock Manager Wrapper
 * Simplified wrapper around storage for distributed locking
 */

import { storage } from './storage';
import { DistributedLock } from './storage/IStorage';

export class LockManager {
  private static instance: LockManager;

  private constructor() {}

  public static getInstance(): LockManager {
    if (!LockManager.instance) {
      LockManager.instance = new LockManager();
    }
    return LockManager.instance;
  }

  /**
   * Acquire a distributed lock
   */
  public async acquireLock(
    resource: string,
    ttlMs: number = 300000,
    maxRetries: number = 150
  ): Promise<DistributedLock | null> {
    return await storage.acquireLock(resource, ttlMs, maxRetries);
  }

  /**
   * Release a distributed lock
   */
  public async releaseLock(lock: DistributedLock): Promise<boolean> {
    return await storage.releaseLock(lock);
  }

  /**
   * Extend lock TTL
   */
  public async extendLock(lock: DistributedLock, extensionMs: number): Promise<DistributedLock | null> {
    return await storage.extendLock(lock, extensionMs);
  }

  /**
   * Check if message is duplicate
   */
  public async isDuplicate(phoneNumberId: string, messageContent: string): Promise<boolean> {
    return await storage.isDuplicate(phoneNumberId, messageContent);
  }

  /**
   * Mark message as processed
   */
  public async markAsProcessed(phoneNumberId: string, messageContent: string): Promise<void> {
    await storage.markAsProcessed(phoneNumberId, messageContent);
  }
}

// Export singleton instance
export const lockManager = LockManager.getInstance();
