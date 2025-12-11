/**
 * Message Queue Wrapper
 * Simplified wrapper around storage for message queue operations
 */

import { storage } from './storage';
import { QueuedMessage } from '../models/types';
import { ProcessingLease, QueueStats } from './storage/IStorage';

export class MessageQueue {
  private static instance: MessageQueue;

  private constructor() {}

  public static getInstance(): MessageQueue {
    if (!MessageQueue.instance) {
      MessageQueue.instance = new MessageQueue();
    }
    return MessageQueue.instance;
  }

  /**
   * Enqueue a message
   */
  public async enqueue(message: QueuedMessage): Promise<void> {
    await storage.enqueue(message);
  }

  /**
   * Dequeue next message
   */
  public async dequeue(phoneNumberId?: string): Promise<{ message: QueuedMessage; lease: ProcessingLease } | null> {
    return await storage.dequeue(phoneNumberId);
  }

  /**
   * Complete message processing
   */
  public async complete(lease: ProcessingLease): Promise<void> {
    await storage.completeMessage(lease);
  }

  /**
   * Fail message processing
   */
  public async fail(lease: ProcessingLease, error: string, retry: boolean = true): Promise<void> {
    await storage.failMessage(lease, error, retry);
  }

  /**
   * Get queue statistics
   */
  public async getStats(): Promise<QueueStats> {
    return await storage.getQueueStats();
  }

  /**
   * Listen for new messages (event-driven)
   */
  public onMessage(callback: (phoneNumberId: string) => void): void {
    // Storage is an EventEmitter, forward the event
    (storage as any).on('message', callback);
  }
}

// Export singleton instance
export const messageQueue = MessageQueue.getInstance();

// Export convenience function
export async function enqueueMessage(message: QueuedMessage): Promise<void> {
  await messageQueue.enqueue(message);
}
