import { Pool } from 'pg';
import { Agent, CreateAgentData, UpdateAgentData, QueryOptions } from './types';
import { logger } from '../utils/logger';

export class AgentModel {
  constructor(private db: Pool) {}

  async create(agentData: CreateAgentData): Promise<Agent> {
    const query = `
      INSERT INTO agents (agent_id, user_id, phone_number_id, prompt_id, name, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING *
    `;
    
    const values = [
      agentData.agent_id,
      agentData.user_id,
      agentData.phone_number_id,
      agentData.prompt_id,
      agentData.name
    ];
    
    try {
      const result = await this.db.query(query, values);
      logger.info('Agent created successfully', { 
        agent_id: agentData.agent_id,
        user_id: agentData.user_id,
        phone_number_id: agentData.phone_number_id
      });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to create agent', { 
        error, 
        agent_id: agentData.agent_id,
        user_id: agentData.user_id
      });
      throw new Error(`Failed to create agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findById(agentId: string): Promise<Agent | null> {
    const query = 'SELECT * FROM agents WHERE agent_id = $1';
    
    try {
      const result = await this.db.query(query, [agentId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find agent by ID', { error, agent_id: agentId });
      throw new Error(`Failed to find agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByUserId(userId: string, options: QueryOptions = {}): Promise<Agent[]> {
    const { limit = 100, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;
    
    const query = `
      SELECT * FROM agents 
      WHERE user_id = $1
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $2 OFFSET $3
    `;

    try {
      const result = await this.db.query(query, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to find agents by user ID', { error, user_id: userId });
      throw new Error(`Failed to find agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByPhoneNumberId(phoneNumberId: string): Promise<Agent | null> {
    const query = 'SELECT * FROM agents WHERE phone_number_id = $1';
    
    try {
      const result = await this.db.query(query, [phoneNumberId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find agent by phone number ID', { 
        error, 
        phone_number_id: phoneNumberId 
      });
      throw new Error(`Failed to find agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async update(agentId: string, updateData: UpdateAgentData): Promise<Agent | null> {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (updateData.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(updateData.name);
    }

    if (updateData.prompt_id !== undefined) {
      fields.push(`prompt_id = $${paramCount++}`);
      values.push(updateData.prompt_id);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(agentId);
    const query = `
      UPDATE agents 
      SET ${fields.join(', ')}
      WHERE agent_id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await this.db.query(query, values);
      if (result.rows.length === 0) {
        return null;
      }
      logger.info('Agent updated successfully', { agent_id: agentId });
      return result.rows[0];
    } catch (error) {
      logger.error('Failed to update agent', { error, agent_id: agentId });
      throw new Error(`Failed to update agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async delete(agentId: string): Promise<boolean> {
    const query = 'DELETE FROM agents WHERE agent_id = $1';
    
    try {
      const result = await this.db.query(query, [agentId]);
      const deleted = (result.rowCount || 0) > 0;
      if (deleted) {
        logger.info('Agent deleted successfully', { agent_id: agentId });
      }
      return deleted;
    } catch (error) {
      logger.error('Failed to delete agent', { error, agent_id: agentId });
      throw new Error(`Failed to delete agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async exists(agentId: string): Promise<boolean> {
    const query = 'SELECT 1 FROM agents WHERE agent_id = $1';
    
    try {
      const result = await this.db.query(query, [agentId]);
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Failed to check agent existence', { error, agent_id: agentId });
      throw new Error(`Failed to check agent existence: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async findByUserIdAndPhoneNumberId(userId: string, phoneNumberId: string): Promise<Agent | null> {
    const query = 'SELECT * FROM agents WHERE user_id = $1 AND phone_number_id = $2';
    
    try {
      const result = await this.db.query(query, [userId, phoneNumberId]);
      return result.rows[0] || null;
    } catch (error) {
      logger.error('Failed to find agent by user ID and phone number ID', { 
        error, 
        user_id: userId,
        phone_number_id: phoneNumberId
      });
      throw new Error(`Failed to find agent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async list(options: QueryOptions = {}): Promise<Agent[]> {
    const { limit = 100, offset = 0, orderBy = 'created_at', orderDirection = 'DESC' } = options;
    
    const query = `
      SELECT * FROM agents 
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await this.db.query(query, [limit, offset]);
      return result.rows;
    } catch (error) {
      logger.error('Failed to list agents', { error });
      throw new Error(`Failed to list agents: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}