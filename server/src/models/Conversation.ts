import { Conversation, CreateConversationData, QueryOptions } from './types';
import { logger } from '../utils/logger';
import { DatabaseConnection } from '../utils/database';

export class ConversationModel {
  constructor(private db: DatabaseConnection) {}

  async create(conversationData: CreateConversationData): Promise<Conversation> {
    const query = `
      INSERT INTO conversations (conversation_id, agent_id, customer_phone, openai_conversation_id, created_at, last_message_at, is_active)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true)
      RETURNING *
    `;
    
    const values = [
      conversationData.conversation_id,
      conversationData.agent_id,
      conversationData.customer_phone,
      conversationData.openai_conversation_id || null
    ];
    
    try {
      const result = await this.db.query(query, values);
      logger.info('Conversation created successfully', { 
        conversation_id: conversationData.conversation_id,
        agent_id: conversationData.agent_id,
        customer_phone: conversationData.customer_phone,
        openai_conversation_id: conversationData.openai_conversation_id
      });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create conversation', { 
        error, 
        conversation_id: conversationData.conversation_id,
        agent_id: conversationData.agent_id
      });
      throw new Error(`Failed to create conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(conversationId: string): Promise<Conversation | null> {
    const query = 'SELECT * FROM conversations WHERE conversation_id = $1';
    
    try {
      const result = await this.db.query(query, [conversationId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find conversation by ID', { error, conversation_id: conversationId });
      throw new Error(`Failed to find conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByAgentId(agentId: string, options: QueryOptions = {}): Promise<Conversation[]> {
    const { limit = 100, offset = 0, orderBy = 'last_message_at', orderDirection = 'DESC' } = options;
    
    const query = `
      SELECT * FROM conversations 
      WHERE agent_id = $1
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.db.query(query, [agentId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find conversations by agent ID', { error, agent_id: agentId });
      throw new Error(`Failed to find conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByCustomerPhone(customerPhone: string, agentId?: string): Promise<Conversation[]> {
    let query = 'SELECT * FROM conversations WHERE customer_phone = $1';
    const values: any[] = [customerPhone];

    if (agentId) {
      query += ' AND agent_id = $2';
      values.push(agentId);
    }

    query += ' ORDER BY last_message_at DESC';

    try {
      const result = await this.db.query(query, values);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find conversations by customer phone', { 
        error, 
        customer_phone: customerPhone,
        agent_id: agentId
      });
      throw new Error(`Failed to find conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findActiveByCustomerPhoneAndAgent(customerPhone: string, agentId: string): Promise<Conversation | null> {
    const query = `
      SELECT * FROM conversations 
      WHERE customer_phone = $1 AND agent_id = $2 AND is_active = true
      ORDER BY last_message_at DESC
      LIMIT 1
    `;

    try {
      const result = await this.db.query(query, [customerPhone, agentId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find active conversation', { 
        error, 
        customer_phone: customerPhone,
        agent_id: agentId
      });
      throw new Error(`Failed to find conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateLastMessageTime(conversationId: string): Promise<Conversation | null> {
    const query = `
      UPDATE conversations 
      SET last_message_at = CURRENT_TIMESTAMP
      WHERE conversation_id = $1
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, [conversationId]);
      if (result.rows.length === 0) {
        return null;
      }
      logger.debug('Conversation last message time updated', { conversation_id: conversationId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update conversation last message time', { 
        error, 
        conversation_id: conversationId 
      });
      throw new Error(`Failed to update conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async setInactive(conversationId: string): Promise<Conversation | null> {
    const query = `
      UPDATE conversations 
      SET is_active = false
      WHERE conversation_id = $1
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, [conversationId]);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info('Conversation set to inactive', { conversation_id: conversationId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to set conversation inactive', { 
        error, 
        conversation_id: conversationId 
      });
      throw new Error(`Failed to update conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findInactiveOlderThan(days: number): Promise<Conversation[]> {
    const query = `
      SELECT * FROM conversations 
      WHERE is_active = true 
      AND last_message_at < NOW() - INTERVAL '${days} days'
      ORDER BY last_message_at ASC
    `;

    try {
      const result = await this.db.query(query);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find inactive conversations', { error, days });
      throw new Error(`Failed to find conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async purgeInactiveConversations(days: number = 21): Promise<number> {
    const query = `
      UPDATE conversations 
      SET is_active = false
      WHERE is_active = true 
      AND last_message_at < NOW() - INTERVAL '${days} days'
    `;

    try {
      const result = await this.db.query(query);
      const purgedCount = result.rowCount || 0;
      logger.info('Conversations purged due to inactivity', { 
        purged_count: purgedCount,
        days_threshold: days
      });
      return purgedCount;
    } catch (error) {
      logger.error('Failed to purge inactive conversations', { error, days });
      throw new Error(`Failed to purge conversations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(conversationId: string): Promise<boolean> {
    const query = 'SELECT 1 FROM conversations WHERE conversation_id = $1';
    
    try {
      const result = await this.db.query(query, [conversationId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Failed to check conversation existence', { error, conversation_id: conversationId });
      throw new Error(`Failed to check conversation existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getConversationStats(agentId?: string): Promise<{ total: number; active: number; inactive: number }> {
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN is_active = true THEN 1 END) as active,
        COUNT(CASE WHEN is_active = false THEN 1 END) as inactive
      FROM conversations
    `;
    const values: any[] = [];

    if (agentId) {
      query += ' WHERE agent_id = $1';
      values.push(agentId);
    }

    try {
      const result = await this.db.query(query, values);
      const stats = result.rows[0];
      return {
        total: parseInt(stats.total),
        active: parseInt(stats.active),
        inactive: parseInt(stats.inactive)
      };
    } catch (error) {
      logger.error('Failed to get conversation stats', { error, agent_id: agentId });
      throw new Error(`Failed to get conversation stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateOpenAIConversationId(conversationId: string, openaiConversationId: string): Promise<Conversation | null> {
    const query = `
      UPDATE conversations 
      SET openai_conversation_id = $2
      WHERE conversation_id = $1
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, [conversationId, openaiConversationId]);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info('OpenAI conversation ID updated', { 
        conversation_id: conversationId,
        openai_conversation_id: openaiConversationId
      });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update OpenAI conversation ID', { 
        error, 
        conversation_id: conversationId,
        openai_conversation_id: openaiConversationId
      });
      throw new Error(`Failed to update OpenAI conversation ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByOpenAIConversationId(openaiConversationId: string): Promise<Conversation | null> {
    const query = 'SELECT * FROM conversations WHERE openai_conversation_id = $1';
    
    try {
      const result = await this.db.query(query, [openaiConversationId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find conversation by OpenAI conversation ID', { 
        error, 
        openai_conversation_id: openaiConversationId 
      });
      throw new Error(`Failed to find conversation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}