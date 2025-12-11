import { Pool } from 'pg';
import { AgentModel } from '../models/Agent';
import { 
  Agent, 
  CreateAgentData, 
  UpdateAgentData,
  ConversationArchive,
  CreateConversationArchiveData,
  QueryOptions,
  ServiceResponse 
} from '../models/types';
import { 
  validateAgentId,
  validateUserId,
  validatePhoneNumberId,
  validatePromptId,
  validateAgentName,
  throwIfInvalid,
  ValidationError
} from '../utils/validation';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class AgentService {
  private agentModel: AgentModel;

  constructor(private db: Pool) {
    this.agentModel = new AgentModel(db);
  }

  async createAgent(agentData: CreateAgentData): Promise<ServiceResponse<Agent>> {
    try {
      // Validate input data
      const agentIdValidation = validateAgentId(agentData.agent_id);
      const userIdValidation = validateUserId(agentData.user_id);
      const phoneNumberIdValidation = validatePhoneNumberId(agentData.phone_number_id);
      const promptIdValidation = validatePromptId(agentData.prompt_id);
      const nameValidation = validateAgentName(agentData.name);

      throwIfInvalid(agentIdValidation, 'agent ID');
      throwIfInvalid(userIdValidation, 'user ID');
      throwIfInvalid(phoneNumberIdValidation, 'phone number ID');
      throwIfInvalid(promptIdValidation, 'prompt ID');
      throwIfInvalid(nameValidation, 'agent name');

      // Check if agent ID already exists
      const existingAgent = await this.agentModel.findById(agentData.agent_id);
      if (existingAgent) {
        return {
          success: false,
          error: `Agent with ID ${agentData.agent_id} already exists`
        };
      }

      // Check if phone number is already linked to another agent
      const existingPhoneAgent = await this.agentModel.findByPhoneNumberId(agentData.phone_number_id);
      if (existingPhoneAgent) {
        // Archive the old conversation and create new agent
        const archiveResult = await this.archiveConversationForAgentRelinking(
          existingPhoneAgent.agent_id,
          agentData.agent_id,
          agentData.phone_number_id
        );

        if (!archiveResult.success) {
          return {
            success: false,
            error: `Failed to archive existing conversations: ${archiveResult.error}`
          };
        }

        // Delete the old agent
        await this.agentModel.delete(existingPhoneAgent.agent_id);
        logger.info('Old agent deleted for phone number relinking', {
          old_agent_id: existingPhoneAgent.agent_id,
          new_agent_id: agentData.agent_id,
          phone_number_id: agentData.phone_number_id
        });
      }

      const agent = await this.agentModel.create(agentData);
      
      return {
        success: true,
        data: agent
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }
      
      logger.error('Failed to create agent', { error, agent_id: agentData.agent_id });
      return {
        success: false,
        error: 'Failed to create agent'
      };
    }
  }

  async getAgentById(agentId: string): Promise<ServiceResponse<Agent>> {
    try {
      const validation = validateAgentId(agentId);
      throwIfInvalid(validation, 'agent ID');

      const agent = await this.agentModel.findById(agentId);
      if (!agent) {
        return {
          success: false,
          error: `Agent with ID ${agentId} not found`
        };
      }

      return {
        success: true,
        data: agent
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }
      
      logger.error('Failed to get agent', { error, agent_id: agentId });
      return {
        success: false,
        error: 'Failed to get agent'
      };
    }
  }

  async getUserAgents(userId: string, options: QueryOptions = {}): Promise<ServiceResponse<Agent[]>> {
    try {
      const validation = validateUserId(userId);
      throwIfInvalid(validation, 'user ID');

      const agents = await this.agentModel.findByUserId(userId, options);
      
      return {
        success: true,
        data: agents
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }
      
      logger.error('Failed to get user agents', { error, user_id: userId });
      return {
        success: false,
        error: 'Failed to get agents'
      };
    }
  }

  async updateAgent(agentId: string, updateData: UpdateAgentData): Promise<ServiceResponse<Agent>> {
    try {
      const validation = validateAgentId(agentId);
      throwIfInvalid(validation, 'agent ID');

      // Validate update data
      if (updateData.name !== undefined) {
        const nameValidation = validateAgentName(updateData.name);
        throwIfInvalid(nameValidation, 'agent name');
      }

      if (updateData.prompt_id !== undefined) {
        const promptIdValidation = validatePromptId(updateData.prompt_id);
        throwIfInvalid(promptIdValidation, 'prompt ID');
      }

      // Check if agent exists
      const existingAgent = await this.agentModel.findById(agentId);
      if (!existingAgent) {
        return {
          success: false,
          error: `Agent with ID ${agentId} not found`
        };
      }

      const updatedAgent = await this.agentModel.update(agentId, updateData);
      
      return {
        success: true,
        data: updatedAgent!
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }
      
      logger.error('Failed to update agent', { error, agent_id: agentId });
      return {
        success: false,
        error: 'Failed to update agent'
      };
    }
  }

  async deleteAgent(agentId: string): Promise<ServiceResponse<boolean>> {
    try {
      const validation = validateAgentId(agentId);
      throwIfInvalid(validation, 'agent ID');

      // Check if agent exists
      const existingAgent = await this.agentModel.findById(agentId);
      if (!existingAgent) {
        return {
          success: false,
          error: `Agent with ID ${agentId} not found`
        };
      }

      // Archive conversations before deletion
      const archiveResult = await this.archiveConversationsForDeletion(agentId);
      if (!archiveResult.success) {
        return {
          success: false,
          error: `Failed to archive conversations: ${archiveResult.error}`
        };
      }

      const deleted = await this.agentModel.delete(agentId);
      
      return {
        success: true,
        data: deleted
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }
      
      logger.error('Failed to delete agent', { error, agent_id: agentId });
      return {
        success: false,
        error: 'Failed to delete agent'
      };
    }
  }

  async getAgentByPhoneNumberId(phoneNumberId: string): Promise<ServiceResponse<Agent>> {
    try {
      const validation = validatePhoneNumberId(phoneNumberId);
      throwIfInvalid(validation, 'phone number ID');

      const agent = await this.agentModel.findByPhoneNumberId(phoneNumberId);
      if (!agent) {
        return {
          success: false,
          error: `No agent found for phone number ID ${phoneNumberId}`
        };
      }

      return {
        success: true,
        data: agent
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation failed: ${error.errors.join(', ')}`
        };
      }
      
      logger.error('Failed to get agent by phone number ID', { 
        error, 
        phone_number_id: phoneNumberId 
      });
      return {
        success: false,
        error: 'Failed to get agent'
      };
    }
  }

  private async archiveConversationForAgentRelinking(
    oldAgentId: string, 
    newAgentId: string, 
    phoneNumberId: string
  ): Promise<ServiceResponse<ConversationArchive>> {
    const archiveData: CreateConversationArchiveData = {
      archive_id: uuidv4(),
      old_agent_id: oldAgentId,
      new_agent_id: newAgentId,
      phone_number_id: phoneNumberId
    };

    const query = `
      INSERT INTO conversation_archives (archive_id, old_agent_id, new_agent_id, phone_number_id, archived_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const values = [
      archiveData.archive_id,
      archiveData.old_agent_id,
      archiveData.new_agent_id,
      archiveData.phone_number_id
    ];

    try {
      const result = await this.db.query(query, values);
      logger.info('Conversation archived for agent relinking', {
        archive_id: archiveData.archive_id,
        old_agent_id: oldAgentId,
        new_agent_id: newAgentId,
        phone_number_id: phoneNumberId
      });
      
      return {
        success: true,
        data: result.rows[0]
      };
    } catch (error) {
      logger.error('Failed to archive conversation for agent relinking', {
        error,
        old_agent_id: oldAgentId,
        new_agent_id: newAgentId,
        phone_number_id: phoneNumberId
      });
      
      return {
        success: false,
        error: `Failed to archive conversation: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  private async archiveConversationsForDeletion(agentId: string): Promise<ServiceResponse<boolean>> {
    // For deletion, we just mark conversations as archived without creating a new agent reference
    const query = `
      UPDATE conversations 
      SET is_active = false 
      WHERE agent_id = $1 AND is_active = true
    `;

    try {
      const result = await this.db.query(query, [agentId]);
      logger.info('Conversations archived for agent deletion', {
        agent_id: agentId,
        archived_count: result.rowCount || 0
      });
      
      return {
        success: true,
        data: true
      };
    } catch (error) {
      logger.error('Failed to archive conversations for agent deletion', {
        error,
        agent_id: agentId
      });
      
      return {
        success: false,
        error: `Failed to archive conversations: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  async getConversationArchives(phoneNumberId?: string): Promise<ServiceResponse<ConversationArchive[]>> {
    let query = 'SELECT * FROM conversation_archives';
    const values: any[] = [];

    if (phoneNumberId) {
      const validation = validatePhoneNumberId(phoneNumberId);
      throwIfInvalid(validation, 'phone number ID');
      
      query += ' WHERE phone_number_id = $1';
      values.push(phoneNumberId);
    }

    query += ' ORDER BY archived_at DESC';

    try {
      const result = await this.db.query(query, values);
      
      return {
        success: true,
        data: result.rows
      };
    } catch (error) {
      logger.error('Failed to get conversation archives', { error, phone_number_id: phoneNumberId });
      return {
        success: false,
        error: 'Failed to get conversation archives'
      };
    }
  }
}