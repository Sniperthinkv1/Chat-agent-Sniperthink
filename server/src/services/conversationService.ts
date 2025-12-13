import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { Conversation, CreateConversationData, Message, Agent } from '../models/types';
import { v4 as uuidv4 } from 'uuid';
import { createOpenAIConversation } from './openaiService';
import { ConversationModel } from '../models/Conversation';

/**
 * Normalize phone number to E.164 format with + prefix
 * Ensures consistent phone number format across all operations
 */
function normalizePhoneNumber(phone: string): string {
    // Remove all non-digit characters except leading +
    let normalized = phone.replace(/[^\d+]/g, '');
    
    // Ensure it starts with +
    if (!normalized.startsWith('+')) {
        normalized = '+' + normalized;
    }
    
    return normalized;
}

/**
 * Extended conversation interface with agent details
 */
export interface ConversationWithAgent extends Conversation {
    agent: Agent;
}

/**
 * Get or create conversation for a customer and phone number
 */
export async function getOrCreateConversation(
    phoneNumberId: string,
    customerPhone: string
): Promise<ConversationWithAgent | null> {
    // Normalize phone number to ensure consistent format (E.164 with + prefix)
    const normalizedPhone = normalizePhoneNumber(customerPhone);
    const correlationId = `get-or-create-conv-${phoneNumberId}-${normalizedPhone}`;
    
    try {
        logger.debug('Getting or creating conversation', {
            correlationId,
            phoneNumberId,
            customerPhone: normalizedPhone
        });

        // First, get the agent for this phone number
        const agent = await getAgentByPhoneNumber(phoneNumberId);
        if (!agent) {
            logger.warn('No agent found for phone number', {
                correlationId,
                phoneNumberId
            });
            return null;
        }

        // Check if conversation already exists
        let conversation = await getActiveConversation(agent.agent_id, normalizedPhone);
        
        if (!conversation) {
            // Create new conversation
            conversation = await createConversation({
                conversation_id: uuidv4(),
                agent_id: agent.agent_id,
                customer_phone: normalizedPhone
            });
        }

        logger.info('Conversation retrieved/created', {
            correlationId,
            conversationId: conversation.conversation_id,
            agentId: agent.agent_id,
            customerPhone: normalizedPhone,
            isNew: !conversation
        });

        return {
            ...conversation,
            agent
        };

    } catch (error) {
        logger.error('Failed to get or create conversation', {
            correlationId,
            phoneNumberId,
            customerPhone,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return null;
    }
}

/**
 * Get agent by phone number
 */
async function getAgentByPhoneNumber(phoneNumberId: string): Promise<Agent | null> {
    try {
        const query = `
            SELECT a.*, u.user_id, u.email, u.company_name
            FROM agents a
            JOIN phone_numbers pn ON a.phone_number_id = pn.id
            JOIN users u ON a.user_id = u.user_id
            WHERE a.phone_number_id = $1
        `;
        
        const result = await db.query(query, [phoneNumberId]);
        
        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            agent_id: row.agent_id,
            user_id: row.user_id,
            phone_number_id: row.phone_number_id,
            prompt_id: row.prompt_id,
            name: row.name,
            created_at: row.created_at,
            updated_at: row.updated_at
        };

    } catch (error) {
        logger.error('Failed to get agent by phone number', {
            phoneNumberId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return null;
    }
}

/**
 * Get active conversation for agent and customer
 */
async function getActiveConversation(agentId: string, customerPhone: string): Promise<Conversation | null> {
    try {
        const query = `
            SELECT * FROM conversations 
            WHERE agent_id = $1 AND customer_phone = $2 AND is_active = true
            ORDER BY created_at DESC
            LIMIT 1
        `;
        
        const result = await db.query(query, [agentId, customerPhone]);
        
        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        return {
            conversation_id: row.conversation_id,
            agent_id: row.agent_id,
            customer_phone: row.customer_phone,
            openai_conversation_id: row.openai_conversation_id,  // Include OpenAI conversation ID
            created_at: row.created_at,
            last_message_at: row.last_message_at,
            is_active: row.is_active
        };

    } catch (error) {
        logger.error('Failed to get active conversation', {
            agentId,
            customerPhone,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return null;
    }
}

/**
 * Create new conversation
 */
async function createConversation(conversationData: CreateConversationData): Promise<Conversation> {
    const correlationId = `create-conv-${conversationData.conversation_id}`;
    
    try {
        const query = `
            INSERT INTO conversations (conversation_id, agent_id, customer_phone, created_at, last_message_at, is_active)
            VALUES ($1, $2, $3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, true)
            RETURNING *
        `;
        
        const result = await db.query(query, [
            conversationData.conversation_id,
            conversationData.agent_id,
            conversationData.customer_phone
        ]);

        const conversation: Conversation = {
            conversation_id: result.rows[0].conversation_id,
            agent_id: result.rows[0].agent_id,
            customer_phone: result.rows[0].customer_phone,
            openai_conversation_id: result.rows[0].openai_conversation_id,  // Will be null initially
            created_at: result.rows[0].created_at,
            last_message_at: result.rows[0].last_message_at,
            is_active: result.rows[0].is_active
        };

        logger.info('Conversation created', {
            correlationId,
            conversationId: conversation.conversation_id,
            agentId: conversation.agent_id,
            customerPhone: conversation.customer_phone
        });

        return conversation;

    } catch (error) {
        logger.error('Failed to create conversation', {
            correlationId,
            conversationData,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

/**
 * Get conversation history (messages)
 */
export async function getConversationHistory(
    conversationId: string,
    limit: number = 10
): Promise<Message[]> {
    const correlationId = `get-history-${conversationId}`;
    
    try {
        const query = `
            SELECT * FROM messages 
            WHERE conversation_id = $1 
            ORDER BY sequence_no DESC 
            LIMIT $2
        `;
        
        const result = await db.query(query, [conversationId, limit]);
        
        const messages: Message[] = result.rows.map((row: any) => ({
            message_id: row.message_id,
            conversation_id: row.conversation_id,
            sender: row.sender,
            text: row.text,
            timestamp: row.timestamp,
            status: row.status,
            sequence_no: row.sequence_no
        })).reverse(); // Reverse to get chronological order

        logger.debug('Retrieved conversation history', {
            correlationId,
            conversationId,
            messageCount: messages.length,
            limit
        });

        return messages;

    } catch (error) {
        logger.error('Failed to get conversation history', {
            correlationId,
            conversationId,
            limit,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

/**
 * Update conversation last message timestamp
 */
export async function updateConversationActivity(conversationId: string): Promise<void> {
    const correlationId = `update-activity-${conversationId}`;
    
    try {
        const query = 'UPDATE conversations SET last_message_at = CURRENT_TIMESTAMP WHERE conversation_id = $1';
        await db.query(query, [conversationId]);
        
        logger.debug('Conversation activity updated', {
            correlationId,
            conversationId
        });

    } catch (error) {
        logger.error('Failed to update conversation activity', {
            correlationId,
            conversationId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

/**
 * Archive conversation (mark as inactive)
 */
export async function archiveConversation(conversationId: string): Promise<void> {
    const correlationId = `archive-conv-${conversationId}`;
    
    try {
        const query = 'UPDATE conversations SET is_active = false WHERE conversation_id = $1';
        await db.query(query, [conversationId]);
        
        logger.info('Conversation archived', {
            correlationId,
            conversationId
        });

    } catch (error) {
        logger.error('Failed to archive conversation', {
            correlationId,
            conversationId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

/**
 * Get conversations for a user
 */
export async function getUserConversations(
    userId: string,
    limit: number = 50,
    offset: number = 0
): Promise<Conversation[]> {
    const correlationId = `get-user-convs-${userId}`;
    
    try {
        const query = `
            SELECT c.* FROM conversations c
            JOIN agents a ON c.agent_id = a.agent_id
            WHERE a.user_id = $1
            ORDER BY c.last_message_at DESC
            LIMIT $2 OFFSET $3
        `;
        
        const result = await db.query(query, [userId, limit, offset]);
        
        const conversations: Conversation[] = result.rows.map((row: any) => ({
            conversation_id: row.conversation_id,
            agent_id: row.agent_id,
            customer_phone: row.customer_phone,
            created_at: row.created_at,
            last_message_at: row.last_message_at,
            is_active: row.is_active
        }));

        logger.debug('Retrieved user conversations', {
            correlationId,
            userId,
            conversationCount: conversations.length,
            limit,
            offset
        });

        return conversations;

    } catch (error) {
        logger.error('Failed to get user conversations', {
            correlationId,
            userId,
            limit,
            offset,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        throw error;
    }
}

/**
 * Get conversation by ID
 */
export async function getConversationById(conversationId: string): Promise<Conversation | null> {
    const correlationId = `get-conv-${conversationId}`;
    
    try {
        const query = 'SELECT * FROM conversations WHERE conversation_id = $1';
        const result = await db.query(query, [conversationId]);
        
        if (result.rows.length === 0) {
            return null;
        }

        const row = result.rows[0];
        const conversation: Conversation = {
            conversation_id: row.conversation_id,
            agent_id: row.agent_id,
            customer_phone: row.customer_phone,
            openai_conversation_id: row.openai_conversation_id,
            created_at: row.created_at,
            last_message_at: row.last_message_at,
            is_active: row.is_active
        };

        logger.debug('Retrieved conversation by ID', {
            correlationId,
            conversationId,
            agentId: conversation.agent_id,
            openaiConversationId: conversation.openai_conversation_id
        });

        return conversation;

    } catch (error) {
        logger.error('Failed to get conversation by ID', {
            correlationId,
            conversationId,
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        return null;
    }
}
/**

 * Ensure conversation has an OpenAI conversation ID
 * Creates one if it doesn't exist and updates the database
 */
export async function ensureOpenAIConversation(conversationId: string): Promise<string> {
  const correlationId = `ensure-openai-conv-${conversationId}`;
  
  try {
    logger.debug('Ensuring OpenAI conversation exists', {
      correlationId,
      conversationId
    });

    // Get the conversation from database
    const conversation = await getConversationById(conversationId);
    
    if (!conversation) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }

    // If conversation already has OpenAI conversation ID, return it
    if (conversation.openai_conversation_id) {
      logger.debug('Conversation already has OpenAI conversation ID', {
        correlationId,
        conversationId,
        openaiConversationId: conversation.openai_conversation_id
      });
      return conversation.openai_conversation_id;
    }

    // Create new OpenAI conversation
    logger.info('Creating OpenAI conversation for database conversation', {
      correlationId,
      conversationId,
      agentId: conversation.agent_id,
      customerPhone: conversation.customer_phone
    });

    const openaiConversation = await createOpenAIConversation({
      conversation_id: conversationId,
      agent_id: conversation.agent_id,
      customer_phone: conversation.customer_phone,
      source: 'multi-channel-ai-agent'
    });

    // Update database with OpenAI conversation ID
    const conversationModel = new ConversationModel(db);
    await conversationModel.updateOpenAIConversationId(conversationId, openaiConversation.id);

    logger.info('OpenAI conversation created and linked', {
      correlationId,
      conversationId,
      openaiConversationId: openaiConversation.id
    });

    return openaiConversation.id;

  } catch (error) {
    logger.error('Failed to ensure OpenAI conversation', {
      correlationId,
      conversationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}
