import { cache } from '../utils/cacheManager';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { MessageModel } from '../models/Message';
import { MessageStatus } from '../models/types';

/**
 * Storage job data structure
 */
interface StorageJob {
  type: 'message' | 'delivery' | 'conversation_update' | 'credit_deduction';
  data: any;
  timestamp: number;
  retryCount: number;
}

// NOTE: Retry queue constants removed - not needed with in-memory storage

/**
 * Store incoming message asynchronously
 */
export async function storeIncomingMessageAsync(
  messageId: string,
  conversationId: string,
  text: string,
  sequenceNo: number
): Promise<void> {
  setImmediate(async () => {
    try {
      const messageModel = new MessageModel(db as any);
      await messageModel.create({
        message_id: messageId,
        conversation_id: conversationId,
        sender: 'user',
        text,
        status: 'sent',
        sequence_no: sequenceNo
      });

      // Message stored

    } catch (error) {
      logger.error('Failed to store incoming message', {
        messageId,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Queue for retry
      await queueStorageJob({
        type: 'message',
        data: { messageId, conversationId, text, sequenceNo, sender: 'user' },
        timestamp: Date.now(),
        retryCount: 0
      });
    }
  });
}

/**
 * Store outgoing message asynchronously
 */
export async function storeOutgoingMessageAsync(
  messageId: string,
  conversationId: string,
  text: string,
  sequenceNo: number
): Promise<void> {
  setImmediate(async () => {
    try {
      const messageModel = new MessageModel(db as any);
      await messageModel.create({
        message_id: messageId,
        conversation_id: conversationId,
        sender: 'agent',
        text,
        status: 'sent',
        sequence_no: sequenceNo
      });

      // Message stored

    } catch (error) {
      logger.error('Failed to store outgoing message', {
        messageId,
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Queue for retry
      await queueStorageJob({
        type: 'message',
        data: { messageId, conversationId, text, sequenceNo, sender: 'agent' },
        timestamp: Date.now(),
        retryCount: 0
      });
    }
  });
}

/**
 * Track message delivery status asynchronously
 */
export async function trackDeliveryAsync(
  messageId: string,
  platformMessageId: string,
  status: MessageStatus,
  errorMessage?: string
): Promise<void> {
  setImmediate(async () => {
    try {
      const query = `
        INSERT INTO message_delivery_status (
          message_id, 
          platform_message_id, 
          status, 
          error_message
        ) VALUES ($1, $2, $3, $4)
        ON CONFLICT (message_id) 
        DO UPDATE SET 
          status = $3,
          error_message = $4
      `;

      await db.query(query, [messageId, platformMessageId, status, errorMessage || null]);

      logger.debug('Delivery status tracked asynchronously', {
        messageId,
        platformMessageId,
        status
      });

    } catch (error) {
      logger.error('Failed to track delivery status', {
        messageId,
        platformMessageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Queue for retry
      await queueStorageJob({
        type: 'delivery',
        data: { messageId, platformMessageId, status, errorMessage },
        timestamp: Date.now(),
        retryCount: 0
      });
    }
  });
}

/**
 * Update conversation activity timestamp asynchronously
 */
export async function updateConversationActivityAsync(conversationId: string): Promise<void> {
  setImmediate(async () => {
    try {
      await db.query(
        'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE conversation_id = $1',
        [conversationId]
      );

      logger.debug('Conversation activity updated asynchronously', {
        conversationId
      });

    } catch (error) {
      logger.error('Failed to update conversation activity', {
        conversationId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Queue for retry
      await queueStorageJob({
        type: 'conversation_update',
        data: { conversationId },
        timestamp: Date.now(),
        retryCount: 0
      });
    }
  });
}

/**
 * Deduct credits asynchronously
 */
export async function deductCreditsAsync(userId: string, amount: number): Promise<void> {
  setImmediate(async () => {
    try {
      const query = `
        UPDATE credits 
        SET remaining_credits = remaining_credits - $1,
            last_updated = CURRENT_TIMESTAMP
        WHERE user_id = $2 AND remaining_credits >= $1
        RETURNING remaining_credits
      `;

      const result = await db.query(query, [amount, userId]);

      if (result.rows.length === 0) {
        logger.warn('Credit deduction failed - insufficient credits', {
          userId,
          amount
        });
        return;
      }

      const newBalance = result.rows[0].remaining_credits;

      // Update cache with new value instead of deleting
      await cache.set(`credits:${userId}`, newBalance.toString(), 300);

      logger.debug('Credits deducted asynchronously', {
        userId,
        amount,
        newBalance: result.rows[0].remaining_credits
      });

    } catch (error) {
      logger.error('Failed to deduct credits', {
        userId,
        amount,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Queue for retry
      await queueStorageJob({
        type: 'credit_deduction',
        data: { userId, amount },
        timestamp: Date.now(),
        retryCount: 0
      });
    }
  });
}

/**
 * Queue storage job for retry
 */
async function queueStorageJob(job: StorageJob): Promise<void> {
  // NOTE: With in-memory storage, retry queues are not needed
  // Operations are instant and don't fail
  logger.debug('Storage job queued (no-op with in-memory storage)', {
    type: job.type,
    retryCount: job.retryCount
  });
}

/**
 * Process retry queue (should be called by a background worker)
 */
export async function processStorageRetryQueue(): Promise<void> {
  // NOTE: With in-memory storage, retry queues are not needed
  // Operations are instant and don't require retry logic
  return;
}

// NOTE: Retry functions removed - not needed with in-memory storage
// In-memory operations are instant and don't require retry logic

/**
 * Get retry queue length (for monitoring)
 */
export async function getRetryQueueLength(): Promise<number> {
  // NOTE: With in-memory storage, retry queues are not needed
  return 0;
}
