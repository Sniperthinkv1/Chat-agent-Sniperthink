/**
 * In-Memory Storage Implementation
 * Fast, zero-cost storage using JavaScript data structures
 * Perfect for single-server deployments
 */

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { IStorage, QueueStats, ProcessingLease, DistributedLock } from './IStorage';
import { QueuedMessage } from '../../models/types';
import { logger } from '../logger';

interface CacheEntry {
  value: string;
  expiresAt: number;
}

interface LockEntry {
  lockId: string;
  expiresAt: number;
}

export class InMemoryStorage extends EventEmitter implements IStorage {
  // Queue storage
  private queues: Map<string, QueuedMessage[]> = new Map();
  private processing: Map<string, { message: QueuedMessage; lease: ProcessingLease }> = new Map();
  private failed: Map<string, QueuedMessage> = new Map();

  // Cache storage
  private cache: Map<string, CacheEntry> = new Map();
  private sets: Map<string, Set<string>> = new Map();

  // Lock storage
  private locks: Map<string, LockEntry> = new Map();
  private deduplication: Map<string, number> = new Map();

  // Cleanup interval
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    // Increase max listeners to support many workers (default is 10)
    this.setMaxListeners(1000);
    this.startCleanup();
  }

  // Lifecycle Methods

  async connect(): Promise<void> {
    logger.info('In-memory storage initialized');
  }

  async disconnect(): Promise<void> {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    logger.info('In-memory storage disconnected');
  }

  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
    return {
      status: 'healthy',
      details: {
        type: 'in-memory',
        queues: this.queues.size,
        cacheEntries: this.cache.size,
        activeLocks: this.locks.size,
        memoryUsage: process.memoryUsage()
      }
    };
  }

  // Queue Operations

  async enqueue(message: QueuedMessage): Promise<void> {
    const phoneNumberId = message.phone_number_id;
    
    if (!this.queues.has(phoneNumberId)) {
      this.queues.set(phoneNumberId, []);
    }
    
    this.queues.get(phoneNumberId)!.push({
      ...message,
      enqueuedAt: new Date().toISOString(),
      retryCount: message.retryCount || 0
    });

    // Emit event for workers to pick up
    this.emit('message', phoneNumberId);

    logger.debug('Message enqueued', {
      messageId: message.message_id,
      phoneNumberId,
      queueLength: this.queues.get(phoneNumberId)!.length
    });
  }

  async dequeue(phoneNumberId?: string): Promise<{ message: QueuedMessage; lease: ProcessingLease } | null> {
    // If specific phone number requested
    if (phoneNumberId) {
      return this.dequeueFromPhone(phoneNumberId);
    }

    // Otherwise check all queues
    for (const [phoneId, queue] of this.queues.entries()) {
      if (queue.length > 0) {
        return this.dequeueFromPhone(phoneId);
      }
    }

    return null;
  }

  private dequeueFromPhone(phoneNumberId: string): { message: QueuedMessage; lease: ProcessingLease } | null {
    const queue = this.queues.get(phoneNumberId);
    if (!queue || queue.length === 0) {
      return null;
    }

    const message = queue.shift()!;
    const lease: ProcessingLease = {
      messageId: message.message_id,
      phoneNumberId,
      leaseId: `${phoneNumberId}-${message.message_id}-${Date.now()}`,
      expiresAt: new Date(Date.now() + 300000) // 5 minutes
    };

    this.processing.set(lease.leaseId, { message, lease });

    logger.debug('Message dequeued', {
      messageId: message.message_id,
      phoneNumberId,
      leaseId: lease.leaseId
    });

    return { message, lease };
  }

  async completeMessage(lease: ProcessingLease): Promise<void> {
    this.processing.delete(lease.leaseId);
    logger.debug('Message completed', { leaseId: lease.leaseId });
  }

  async failMessage(lease: ProcessingLease, error: string, retry: boolean): Promise<void> {
    const entry = this.processing.get(lease.leaseId);
    if (!entry) return;

    this.processing.delete(lease.leaseId);

    const message = entry.message;
    message.retryCount = (message.retryCount || 0) + 1;
    message.lastError = error;

    if (retry && message.retryCount < 3) {
      // Re-enqueue for retry
      await this.enqueue(message);
      logger.info('Message re-queued for retry', {
        messageId: message.message_id,
        retryCount: message.retryCount
      });
    } else {
      // Move to failed
      this.failed.set(message.message_id, message);
      logger.error('Message failed permanently', {
        messageId: message.message_id,
        retryCount: message.retryCount,
        error
      });
    }
  }

  async getQueueStats(): Promise<QueueStats> {
    const stats: QueueStats = {
      totalMessages: 0,
      processingMessages: this.processing.size,
      failedMessages: this.failed.size,
      queuesByPhoneNumber: {}
    };

    for (const [phoneId, queue] of this.queues.entries()) {
      stats.queuesByPhoneNumber[phoneId] = queue.length;
      stats.totalMessages += queue.length;
    }

    return stats;
  }

  // Cache Operations

  async get(key: string): Promise<string | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number = 300): Promise<void> {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + (ttlSeconds * 1000)
    });
  }

  async del(key: string): Promise<number> {
    return this.cache.delete(key) ? 1 : 0;
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  async expire(key: string, seconds: number): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry) return false;

    entry.expiresAt = Date.now() + (seconds * 1000);
    return true;
  }

  async incr(key: string): Promise<number> {
    const entry = this.cache.get(key);
    let value = 1;
    
    if (entry && Date.now() <= entry.expiresAt) {
      value = parseInt(entry.value, 10) + 1;
    }
    
    // Set with default 5 minute TTL
    this.cache.set(key, {
      value: value.toString(),
      expiresAt: Date.now() + (300 * 1000)
    });
    
    return value;
  }

  // Set Operations

  async sAdd(key: string, member: string): Promise<number> {
    if (!this.sets.has(key)) {
      this.sets.set(key, new Set());
    }
    const set = this.sets.get(key)!;
    const sizeBefore = set.size;
    set.add(member);
    return set.size - sizeBefore;
  }

  async sMembers(key: string): Promise<string[]> {
    const set = this.sets.get(key);
    return set ? Array.from(set) : [];
  }

  async sRem(key: string, member: string): Promise<number> {
    const set = this.sets.get(key);
    if (!set) return 0;
    return set.delete(member) ? 1 : 0;
  }

  async sCard(key: string): Promise<number> {
    const set = this.sets.get(key);
    return set ? set.size : 0;
  }

  // Lock Operations

  async acquireLock(
    resource: string,
    ttlMs: number,
    maxRetries: number = 10
  ): Promise<DistributedLock | null> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const existing = this.locks.get(resource);

      // Check if lock exists and not expired
      if (existing && Date.now() < existing.expiresAt) {
        if (attempt < maxRetries) {
          await this.sleep(200); // Wait before retry
          continue;
        }
        return null; // Failed to acquire after retries
      }

      // Acquire lock
      const lockId = `${resource}-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const lock: DistributedLock = {
        lockId,
        resource,
        expiresAt: new Date(Date.now() + ttlMs)
      };

      this.locks.set(resource, {
        lockId,
        expiresAt: Date.now() + ttlMs
      });

      logger.debug('Lock acquired', { resource, lockId, attempt: attempt + 1 });
      return lock;
    }

    return null;
  }

  async releaseLock(lock: DistributedLock): Promise<boolean> {
    const existing = this.locks.get(lock.resource);
    if (existing?.lockId === lock.lockId) {
      this.locks.delete(lock.resource);
      logger.debug('Lock released', { resource: lock.resource, lockId: lock.lockId });
      return true;
    }
    return false;
  }

  async extendLock(lock: DistributedLock, extensionMs: number): Promise<DistributedLock | null> {
    const existing = this.locks.get(lock.resource);
    if (existing?.lockId !== lock.lockId) {
      return null;
    }

    const newExpiresAt = Date.now() + extensionMs;
    existing.expiresAt = newExpiresAt;

    return {
      ...lock,
      expiresAt: new Date(newExpiresAt)
    };
  }

  // Deduplication

  async isDuplicate(phoneNumberId: string, messageContent: string): Promise<boolean> {
    const hash = this.generateHash(messageContent);
    const key = `${phoneNumberId}:${hash}`;
    const expiresAt = this.deduplication.get(key);

    if (!expiresAt) return false;

    if (Date.now() > expiresAt) {
      this.deduplication.delete(key);
      return false;
    }

    return true;
  }

  async markAsProcessed(
    phoneNumberId: string,
    messageContent: string,
    ttlSeconds: number = 5
  ): Promise<void> {
    const hash = this.generateHash(messageContent);
    const key = `${phoneNumberId}:${hash}`;
    this.deduplication.set(key, Date.now() + (ttlSeconds * 1000));
  }

  // Private Methods

  private generateHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private startCleanup(): void {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpired();
    }, 60000);
  }

  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = 0;

    // Clean cache
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    // Clean locks
    for (const [resource, lock] of this.locks.entries()) {
      if (now > lock.expiresAt) {
        this.locks.delete(resource);
        cleaned++;
      }
    }

    // Clean deduplication
    for (const [key, expiresAt] of this.deduplication.entries()) {
      if (now > expiresAt) {
        this.deduplication.delete(key);
        cleaned++;
      }
    }

    // Clean expired processing leases
    for (const [leaseId, entry] of this.processing.entries()) {
      if (now > entry.lease.expiresAt.getTime()) {
        // Re-queue the message
        this.enqueue(entry.message).catch(err => {
          logger.error('Failed to re-queue expired message', { error: err.message });
        });
        this.processing.delete(leaseId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug('Cleaned up expired entries', { count: cleaned });
    }
  }
}
