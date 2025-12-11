import { Pool } from 'pg';
import { Message, CreateMessageData, MessageSender, MessageStatus, QueryOptions } from './types';
import { logger } from '../utils/logger';

export class MessageModel {
  constructor(private db: Pool) {}

  async create(messageData: CreateMessageData): Promise<Message> {
    // Check if message already exists (idempotency)
    const existing = await this.findById(messageData.message_id);
    if (existing) {
      logger.info('Message already exists, returning existing message', { 
        message_id: messageData.message_id,
        conversation_id: messageData.conversation_id
      });
      return existing;
    }

    const query = `
      INSERT INTO messages (message_id, conversation_id, sender, text, timestamp, status, sequence_no)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6)
      RETURNING *
    `;
    
    const values = [
      messageData.message_id,
      messageData.conversation_id,
      messageData.sender,
      messageData.text,
      messageData.status || 'sent',
      messageData.sequence_no
    ];
    
    try {
      const result = await this.db.query(query, values);
      logger.info('Message created successfully', { 
        message_id: messageData.message_id,
        conversation_id: messageData.conversation_id,
        sender: messageData.sender,
        sequence_no: messageData.sequence_no
      });
      return result.rows[0];
    } catch (error) {
      // Handle race condition - check if message was created by another process
      if (error instanceof Error && error.message.includes('duplicate key')) {
        logger.warn('Duplicate message detected, fetching existing', { 
          message_id: messageData.message_id 
        });
        const existingMessage = await this.findById(messageData.message_id);
        if (existingMessage) {
          return existingMessage;
        }
      }
      
      logger.error('Failed to create message', { 
        error, 
        message_id: messageData.message_id,
        conversation_id: messageData.conversation_id
      });
      throw new Error(`Failed to create message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(messageId: string): Promise<Message | null> {
    const query = 'SELECT * FROM messages WHERE message_id = $1';
    
    try {
      const result = await this.db.query(query, [messageId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find message by ID', { error, message_id: messageId });
      throw new Error(`Failed to find message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByConversationId(conversationId: string, options: QueryOptions = {}): Promise<Message[]> {
    const { limit = 100, offset = 0, orderBy = 'sequence_no', orderDirection = 'ASC' } = options;
    
    const query = `
      SELECT * FROM messages 
      WHERE conversation_id = $1
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.db.query(query, [conversationId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find messages by conversation ID', { 
        error, 
        conversation_id: conversationId 
      });
      throw new Error(`Failed to find messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findBySender(conversationId: string, sender: MessageSender, options: QueryOptions = {}): Promise<Message[]> {
    const { limit = 100, offset = 0, orderBy = 'sequence_no', orderDirection = 'ASC' } = options;
    
    const query = `
      SELECT * FROM messages 
      WHERE conversation_id = $1 AND sender = $2
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $3 OFFSET $4
    `;

    try {
      const result = await this.db.query(query, [conversationId, sender, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find messages by sender', { 
        error, 
        conversation_id: conversationId,
        sender 
      });
      throw new Error(`Failed to find messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByStatus(status: MessageStatus, options: QueryOptions = {}): Promise<Message[]> {
    const { limit = 100, offset = 0, orderBy = 'timestamp', orderDirection = 'DESC' } = options;
    
    const query = `
      SELECT * FROM messages 
      WHERE status = $1
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.db.query(query, [status, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find messages by status', { error, status });
      throw new Error(`Failed to find messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateStatus(messageId: string, status: MessageStatus): Promise<Message | null> {
    const query = `
      UPDATE messages 
      SET status = $1
      WHERE message_id = $2
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, [status, messageId]);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info('Message status updated', { message_id: messageId, status });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update message status', { 
        error, 
        message_id: messageId,
        status 
      });
      throw new Error(`Failed to update message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getNextSequenceNumber(conversationId: string): Promise<number> {
    const query = `
      SELECT COALESCE(MAX(sequence_no), 0) + 1 as next_sequence
      FROM messages 
      WHERE conversation_id = $1
    `;

    try {
      const result = await this.db.query(query, [conversationId]);
      return result.rows[0].next_sequence;
    } catch (error) {
      logger.error('Failed to get next sequence number', { 
        error, 
        conversation_id: conversationId 
      });
      throw new Error(`Failed to get sequence number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getConversationMessageCount(conversationId: string): Promise<number> {
    const query = 'SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1';

    try {
      const result = await this.db.query(query, [conversationId]);
      return parseInt(result.rows[0].count);
    } catch (error) {
      logger.error('Failed to get conversation message count', { 
        error, 
        conversation_id: conversationId 
      });
      throw new Error(`Failed to get message count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getLatestMessage(conversationId: string): Promise<Message | null> {
    const query = `
      SELECT * FROM messages 
      WHERE conversation_id = $1
      ORDER BY sequence_no DESC
      LIMIT 1
    `;

    try {
      const result = await this.db.query(query, [conversationId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to get latest message', { 
        error, 
        conversation_id: conversationId 
      });
      throw new Error(`Failed to get latest message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMessageHistory(conversationId: string, beforeSequence?: number, limit: number = 50): Promise<Message[]> {
    let query = `
      SELECT * FROM messages 
      WHERE conversation_id = $1
    `;
    const values: any[] = [conversationId];

    if (beforeSequence !== undefined) {
      query += ' AND sequence_no < $2';
      values.push(beforeSequence);
    }

    query += ` ORDER BY sequence_no DESC LIMIT $${values.length + 1}`;
    values.push(limit);

    try {
      const result = await this.db.query(query, values);
      // Return in ascending order for proper conversation flow
      return result.rows.reverse();
    } catch (error) {
      logger.error('Failed to get message history', { 
        error, 
        conversation_id: conversationId,
        before_sequence: beforeSequence
      });
      throw new Error(`Failed to get message history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(messageId: string): Promise<boolean> {
    const query = 'SELECT 1 FROM messages WHERE message_id = $1';
    
    try {
      const result = await this.db.query(query, [messageId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Failed to check message existence', { error, message_id: messageId });
      throw new Error(`Failed to check message existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getMessageStats(conversationId?: string): Promise<{ total: number; by_sender: Record<MessageSender, number>; by_status: Record<MessageStatus, number> }> {
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN sender = 'user' THEN 1 END) as user_messages,
        COUNT(CASE WHEN sender = 'agent' THEN 1 END) as agent_messages,
        COUNT(CASE WHEN status = 'sent' THEN 1 END) as sent_messages,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_messages,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_messages
      FROM messages
    `;
    const values: any[] = [];

    if (conversationId) {
      query += ' WHERE conversation_id = $1';
      values.push(conversationId);
    }

    try {
      const result = await this.db.query(query, values);
      const stats = result.rows[0];
      
      return {
        total: parseInt(stats.total),
        by_sender: {
          user: parseInt(stats.user_messages),
          agent: parseInt(stats.agent_messages)
        },
        by_status: {
          sent: parseInt(stats.sent_messages),
          failed: parseInt(stats.failed_messages),
          pending: parseInt(stats.pending_messages)
        }
      };
    } catch (error) {
      logger.error('Failed to get message stats', { error, conversation_id: conversationId });
      throw new Error(`Failed to get message stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteOldMessages(conversationId: string, keepLatest: number = 100): Promise<number> {
    const query = `
      DELETE FROM messages 
      WHERE conversation_id = $1 
      AND sequence_no NOT IN (
        SELECT sequence_no FROM messages 
        WHERE conversation_id = $1 
        ORDER BY sequence_no DESC 
        LIMIT $2
      )
    `;

    try {
      const result = await this.db.query(query, [conversationId, keepLatest]);
      const deletedCount = result.rowCount || 0;
      if (deletedCount > 0) {
        logger.info('Old messages deleted', { 
          conversation_id: conversationId,
          deleted_count: deletedCount,
          kept_latest: keepLatest
        });
      }
      return deletedCount;
    } catch (error) {
      logger.error('Failed to delete old messages', { 
        error, 
        conversation_id: conversationId,
        keep_latest: keepLatest
      });
      throw new Error(`Failed to delete messages: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}