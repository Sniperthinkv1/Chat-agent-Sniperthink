/**
 * Storage Interface
 * Abstraction layer for queue, cache, and lock operations
 * Can be implemented with Redis or in-memory storage
 */

import { QueuedMessage } from '../../models/types';

export interface QueueStats {
  totalMessages: number;
  processingMessages: number;
  failedMessages: number;
  queuesByPhoneNumber: Record<string, number>;
}

export interface ProcessingLease {
  messageId: string;
  phoneNumberId: string;
  leaseId: string;
  expiresAt: Date;
}

export interface DistributedLock {
  lockId: string;
  resource: string;
  expiresAt: Date;
}

export interface IStorage {
  // Lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }>;

  // Queue Operations
  enqueue(message: QueuedMessage): Promise<void>;
  dequeue(phoneNumberId?: string): Promise<{ message: QueuedMessage; lease: ProcessingLease } | null>;
  completeMessage(lease: ProcessingLease): Promise<void>;
  failMessage(lease: ProcessingLease, error: string, retry: boolean): Promise<void>;
  getQueueStats(): Promise<QueueStats>;

  // Cache Operations
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<number>;
  exists(key: string): Promise<boolean>;
  expire(key: string, seconds: number): Promise<boolean>;
  incr(key: string): Promise<number>;

  // Set Operations (for tracking)
  sAdd(key: string, member: string): Promise<number>;
  sMembers(key: string): Promise<string[]>;
  sRem(key: string, member: string): Promise<number>;
  sCard(key: string): Promise<number>;

  // Lock Operations
  acquireLock(resource: string, ttlMs: number, maxRetries?: number): Promise<DistributedLock | null>;
  releaseLock(lock: DistributedLock): Promise<boolean>;
  extendLock(lock: DistributedLock, extensionMs: number): Promise<DistributedLock | null>;

  // Deduplication
  isDuplicate(phoneNumberId: string, messageContent: string): Promise<boolean>;
  markAsProcessed(phoneNumberId: string, messageContent: string, ttlSeconds?: number): Promise<void>;
}
