import { Request, Response, NextFunction } from 'express';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { MessageModel } from '../models/Message';
import { ConversationModel } from '../models/Conversation';
import { QueryOptions } from '../models/types';

export class MessagesController {
  private messageModel: MessageModel;
  private conversationModel: ConversationModel;

  constructor() {
    this.messageModel = new MessageModel((db as any).pool);
    this.conversationModel = new ConversationModel((db as any).pool);
  }

  /**
   * GET /users/:user_id/messages
   * Get messages for a user with filtering options
   */
  getMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user_id } = req.params;
      const { 
        conversation_id,
        phone_number_id,
        agent_id,
        sender,
        status,
        limit,
        offset,
        orderBy,
        orderDirection,
        start_date,
        end_date
      } = req.query;

      // Build query options
      const options: QueryOptions = {
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0,
        orderBy: (orderBy as string) || 'timestamp',
        orderDirection: (orderDirection as 'ASC' | 'DESC') || 'DESC'
      };

      // Validate sender if provided
      if (sender && !['user', 'agent'].includes(sender as string)) {
        res.status(400).json({
          error: 'Invalid sender',
          message: 'Sender must be either "user" or "agent"',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      // Validate status if provided
      if (status && !['sent', 'failed', 'pending'].includes(status as string)) {
        res.status(400).json({
          error: 'Invalid status',
          message: 'Status must be one of: sent, failed, pending',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      // Build the query based on filters
      let query = `
        SELECT 
          m.message_id,
          m.conversation_id,
          m.sender,
          m.text,
          m.timestamp,
          m.status,
          m.sequence_no,
          m.platform_message_id,
          c.agent_id,
          c.customer_phone,
          c.is_active as conversation_active,
          a.phone_number_id,
          a.name as agent_name,
          pn.platform,
          pn.display_name as phone_display_name
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.conversation_id
        JOIN agents a ON c.agent_id = a.agent_id
        JOIN phone_numbers pn ON a.phone_number_id = pn.id
        WHERE a.user_id = $1
      `;

      const queryParams: any[] = [user_id];
      let paramIndex = 2;

      // Add filters
      if (conversation_id) {
        query += ` AND m.conversation_id = $${paramIndex}`;
        queryParams.push(conversation_id);
        paramIndex++;
      }

      if (phone_number_id) {
        query += ` AND a.phone_number_id = $${paramIndex}`;
        queryParams.push(phone_number_id);
        paramIndex++;
      }

      if (agent_id) {
        query += ` AND c.agent_id = $${paramIndex}`;
        queryParams.push(agent_id);
        paramIndex++;
      }

      if (sender) {
        query += ` AND m.sender = $${paramIndex}`;
        queryParams.push(sender);
        paramIndex++;
      }

      if (status) {
        query += ` AND m.status = $${paramIndex}`;
        queryParams.push(status);
        paramIndex++;
      }

      if (start_date) {
        query += ` AND m.timestamp >= $${paramIndex}`;
        queryParams.push(start_date);
        paramIndex++;
      }

      if (end_date) {
        query += ` AND m.timestamp <= $${paramIndex}`;
        queryParams.push(end_date);
        paramIndex++;
      }

      // Add ordering and pagination
      query += ` ORDER BY m.${options.orderBy} ${options.orderDirection}`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(options.limit, options.offset);

      // Execute query
      const result = await (db as any).pool.query(query, queryParams);

      // Get total count for pagination
      let countQuery = `
        SELECT COUNT(*) as total
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.conversation_id
        JOIN agents a ON c.agent_id = a.agent_id
        WHERE a.user_id = $1
      `;

      const countParams: any[] = [user_id];
      let countParamIndex = 2;

      if (conversation_id) {
        countQuery += ` AND m.conversation_id = $${countParamIndex}`;
        countParams.push(conversation_id);
        countParamIndex++;
      }

      if (phone_number_id) {
        countQuery += ` AND a.phone_number_id = $${countParamIndex}`;
        countParams.push(phone_number_id);
        countParamIndex++;
      }

      if (agent_id) {
        countQuery += ` AND c.agent_id = $${countParamIndex}`;
        countParams.push(agent_id);
        countParamIndex++;
      }

      if (sender) {
        countQuery += ` AND m.sender = $${countParamIndex}`;
        countParams.push(sender);
        countParamIndex++;
      }

      if (status) {
        countQuery += ` AND m.status = $${countParamIndex}`;
        countParams.push(status);
        countParamIndex++;
      }

      if (start_date) {
        countQuery += ` AND m.timestamp >= $${countParamIndex}`;
        countParams.push(start_date);
        countParamIndex++;
      }

      if (end_date) {
        countQuery += ` AND m.timestamp <= $${countParamIndex}`;
        countParams.push(end_date);
        countParamIndex++;
      }

      const countResult = await (db as any).pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].total);

      logger.info('Messages retrieved successfully', {
        user_id,
        count: result.rows.length,
        total: totalCount,
        filters: {
          conversation_id,
          phone_number_id,
          agent_id,
          sender,
          status,
          start_date,
          end_date
        },
        correlationId: req.correlationId,
      });

      res.status(200).json({
        success: true,
        data: result.rows,
        pagination: {
          total: totalCount,
          limit: options.limit,
          offset: options.offset,
          hasMore: (options.offset || 0) + result.rows.length < totalCount
        },
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    } catch (error) {
      logger.error('Error retrieving messages', {
        error: (error as Error).message,
        user_id: req.params['user_id'],
        correlationId: req.correlationId,
      });
      next(error);
    }
  };

  /**
   * GET /users/:user_id/conversations/:conversation_id/messages
   * Get messages for a specific conversation with pagination
   */
  getConversationMessages = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user_id, conversation_id } = req.params;
      const { limit, offset, before_sequence } = req.query;

      // Verify conversation belongs to user
      const conversation = await this.conversationModel.findById(conversation_id!);
      if (!conversation) {
        res.status(404).json({
          error: 'Conversation not found',
          message: 'The specified conversation does not exist',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      // Verify user ownership through agent
      const agentQuery = `
        SELECT a.user_id 
        FROM agents a
        WHERE a.agent_id = $1
      `;
      const agentResult = await (db as any).pool.query(agentQuery, [conversation.agent_id]);
      
      if (agentResult.rows.length === 0 || agentResult.rows[0].user_id !== user_id) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Conversation does not belong to this user',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      // Get messages
      const messageLimit = limit ? parseInt(limit as string, 10) : 50;
      const messageOffset = offset ? parseInt(offset as string, 10) : 0;

      let messages;
      if (before_sequence) {
        messages = await this.messageModel.getMessageHistory(
          conversation_id!,
          parseInt(before_sequence as string, 10),
          messageLimit
        );
      } else {
        messages = await this.messageModel.findByConversationId(conversation_id!, {
          limit: messageLimit,
          offset: messageOffset,
          orderBy: 'sequence_no',
          orderDirection: 'ASC'
        });
      }

      // Get total message count
      const messageCount = await this.messageModel.getConversationMessageCount(conversation_id!);

      logger.info('Conversation messages retrieved successfully', {
        user_id,
        conversation_id,
        count: messages.length,
        total: messageCount,
        correlationId: req.correlationId,
      });

      res.status(200).json({
        success: true,
        data: {
          conversation_id,
          messages,
          conversation_info: {
            agent_id: conversation.agent_id,
            customer_phone: conversation.customer_phone,
            is_active: conversation.is_active,
            created_at: conversation.created_at,
            last_message_at: conversation.last_message_at
          }
        },
        pagination: {
          total: messageCount,
          limit: messageLimit,
          offset: messageOffset,
          hasMore: messageOffset + messages.length < messageCount
        },
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    } catch (error) {
      logger.error('Error retrieving conversation messages', {
        error: (error as Error).message,
        user_id: req.params['user_id'],
        conversation_id: req.params['conversation_id'],
        correlationId: req.correlationId,
      });
      next(error);
    }
  };

  /**
   * GET /users/:user_id/conversations
   * Get conversations for a user with filtering and activity tracking
   */
  getConversations = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user_id } = req.params;
      const { 
        agent_id,
        phone_number_id,
        is_active,
        customer_phone,
        limit,
        offset,
        orderBy,
        orderDirection
      } = req.query;

      // Build query options
      const options: QueryOptions = {
        limit: limit ? parseInt(limit as string, 10) : 50,
        offset: offset ? parseInt(offset as string, 10) : 0,
        orderBy: (orderBy as string) || 'last_message_at',
        orderDirection: (orderDirection as 'ASC' | 'DESC') || 'DESC'
      };

      // Build the query
      let query = `
        SELECT 
          c.conversation_id,
          c.agent_id,
          c.customer_phone,
          c.openai_conversation_id,
          c.created_at,
          c.last_message_at,
          c.is_active,
          a.name as agent_name,
          a.phone_number_id,
          pn.platform,
          pn.display_name as phone_display_name,
          (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.conversation_id) as message_count,
          (SELECT m.text FROM messages m WHERE m.conversation_id = c.conversation_id ORDER BY m.sequence_no DESC LIMIT 1) as last_message_text,
          (SELECT m.sender FROM messages m WHERE m.conversation_id = c.conversation_id ORDER BY m.sequence_no DESC LIMIT 1) as last_message_sender
        FROM conversations c
        JOIN agents a ON c.agent_id = a.agent_id
        JOIN phone_numbers pn ON a.phone_number_id = pn.id
        WHERE a.user_id = $1
      `;

      const queryParams: any[] = [user_id];
      let paramIndex = 2;

      // Add filters
      if (agent_id) {
        query += ` AND c.agent_id = $${paramIndex}`;
        queryParams.push(agent_id);
        paramIndex++;
      }

      if (phone_number_id) {
        query += ` AND a.phone_number_id = $${paramIndex}`;
        queryParams.push(phone_number_id);
        paramIndex++;
      }

      if (is_active !== undefined) {
        query += ` AND c.is_active = $${paramIndex}`;
        queryParams.push(is_active === 'true');
        paramIndex++;
      }

      if (customer_phone) {
        query += ` AND c.customer_phone = $${paramIndex}`;
        queryParams.push(customer_phone);
        paramIndex++;
      }

      // Add ordering and pagination
      query += ` ORDER BY c.${options.orderBy} ${options.orderDirection}`;
      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      queryParams.push(options.limit, options.offset);

      // Execute query
      const result = await (db as any).pool.query(query, queryParams);

      // Get total count
      let countQuery = `
        SELECT COUNT(*) as total
        FROM conversations c
        JOIN agents a ON c.agent_id = a.agent_id
        WHERE a.user_id = $1
      `;

      const countParams: any[] = [user_id];
      let countParamIndex = 2;

      if (agent_id) {
        countQuery += ` AND c.agent_id = $${countParamIndex}`;
        countParams.push(agent_id);
        countParamIndex++;
      }

      if (phone_number_id) {
        countQuery += ` AND a.phone_number_id = $${countParamIndex}`;
        countParams.push(phone_number_id);
        countParamIndex++;
      }

      if (is_active !== undefined) {
        countQuery += ` AND c.is_active = $${countParamIndex}`;
        countParams.push(is_active === 'true');
        countParamIndex++;
      }

      if (customer_phone) {
        countQuery += ` AND c.customer_phone = $${countParamIndex}`;
        countParams.push(customer_phone);
        countParamIndex++;
      }

      const countResult = await (db as any).pool.query(countQuery, countParams);
      const totalCount = parseInt(countResult.rows[0].total);

      logger.info('Conversations retrieved successfully', {
        user_id,
        count: result.rows.length,
        total: totalCount,
        filters: {
          agent_id,
          phone_number_id,
          is_active,
          customer_phone
        },
        correlationId: req.correlationId,
      });

      res.status(200).json({
        success: true,
        data: result.rows,
        pagination: {
          total: totalCount,
          limit: options.limit,
          offset: options.offset,
          hasMore: (options.offset || 0) + result.rows.length < totalCount
        },
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    } catch (error) {
      logger.error('Error retrieving conversations', {
        error: (error as Error).message,
        user_id: req.params['user_id'],
        correlationId: req.correlationId,
      });
      next(error);
    }
  };

  /**
   * GET /users/:user_id/conversations/:conversation_id
   * Get a specific conversation with details
   */
  getConversation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user_id, conversation_id } = req.params;

      // Get conversation with details
      const query = `
        SELECT 
          c.conversation_id,
          c.agent_id,
          c.customer_phone,
          c.openai_conversation_id,
          c.created_at,
          c.last_message_at,
          c.is_active,
          a.name as agent_name,
          a.prompt_id,
          a.phone_number_id,
          a.user_id,
          pn.platform,
          pn.display_name as phone_display_name,
          (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.conversation_id) as message_count,
          (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.conversation_id AND m.sender = 'user') as user_message_count,
          (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.conversation_id AND m.sender = 'agent') as agent_message_count
        FROM conversations c
        JOIN agents a ON c.agent_id = a.agent_id
        JOIN phone_numbers pn ON a.phone_number_id = pn.id
        WHERE c.conversation_id = $1
      `;

      const result = await (db as any).pool.query(query, [conversation_id]);

      if (result.rows.length === 0) {
        res.status(404).json({
          error: 'Conversation not found',
          message: 'The specified conversation does not exist',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      const conversation = result.rows[0];

      // Verify user ownership
      if (conversation.user_id !== user_id) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Conversation does not belong to this user',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      logger.info('Conversation retrieved successfully', {
        user_id,
        conversation_id,
        correlationId: req.correlationId,
      });

      res.status(200).json({
        success: true,
        data: conversation,
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    } catch (error) {
      logger.error('Error retrieving conversation', {
        error: (error as Error).message,
        user_id: req.params['user_id'],
        conversation_id: req.params['conversation_id'],
        correlationId: req.correlationId,
      });
      next(error);
    }
  };

  /**
   * GET /users/:user_id/messages/stats
   * Get message statistics for a user
   */
  getMessageStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user_id } = req.params;
      const { agent_id, phone_number_id, time_range } = req.query;

      // Build time filter
      let timeFilter = '';
      switch (time_range) {
        case 'hour':
          timeFilter = "AND m.timestamp >= NOW() - INTERVAL '1 hour'";
          break;
        case 'day':
          timeFilter = "AND m.timestamp >= NOW() - INTERVAL '1 day'";
          break;
        case 'week':
          timeFilter = "AND m.timestamp >= NOW() - INTERVAL '1 week'";
          break;
        case 'month':
          timeFilter = "AND m.timestamp >= NOW() - INTERVAL '1 month'";
          break;
        default:
          timeFilter = "AND m.timestamp >= NOW() - INTERVAL '1 day'";
      }

      // Build query
      let query = `
        SELECT 
          COUNT(*) as total_messages,
          COUNT(CASE WHEN m.sender = 'user' THEN 1 END) as user_messages,
          COUNT(CASE WHEN m.sender = 'agent' THEN 1 END) as agent_messages,
          COUNT(CASE WHEN m.status = 'sent' THEN 1 END) as sent_messages,
          COUNT(CASE WHEN m.status = 'failed' THEN 1 END) as failed_messages,
          COUNT(CASE WHEN m.status = 'pending' THEN 1 END) as pending_messages,
          COUNT(DISTINCT m.conversation_id) as active_conversations
        FROM messages m
        JOIN conversations c ON m.conversation_id = c.conversation_id
        JOIN agents a ON c.agent_id = a.agent_id
        WHERE a.user_id = $1 ${timeFilter}
      `;

      const queryParams: any[] = [user_id];
      let paramIndex = 2;

      if (agent_id) {
        query += ` AND c.agent_id = $${paramIndex}`;
        queryParams.push(agent_id);
        paramIndex++;
      }

      if (phone_number_id) {
        query += ` AND a.phone_number_id = $${paramIndex}`;
        queryParams.push(phone_number_id);
        paramIndex++;
      }

      const result = await (db as any).pool.query(query, queryParams);
      const stats = result.rows[0];

      logger.info('Message stats retrieved successfully', {
        user_id,
        time_range: time_range || 'day',
        correlationId: req.correlationId,
      });

      res.status(200).json({
        success: true,
        data: {
          total_messages: parseInt(stats.total_messages),
          by_sender: {
            user: parseInt(stats.user_messages),
            agent: parseInt(stats.agent_messages)
          },
          by_status: {
            sent: parseInt(stats.sent_messages),
            failed: parseInt(stats.failed_messages),
            pending: parseInt(stats.pending_messages)
          },
          active_conversations: parseInt(stats.active_conversations),
          time_range: time_range || 'day'
        },
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    } catch (error) {
      logger.error('Error retrieving message stats', {
        error: (error as Error).message,
        user_id: req.params['user_id'],
        correlationId: req.correlationId,
      });
      next(error);
    }
  };
}
