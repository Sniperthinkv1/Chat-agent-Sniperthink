import { Request, Response, NextFunction } from 'express';
import { AgentService } from '../services/agentService';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { CreateAgentData, UpdateAgentData, QueryOptions } from '../models/types';

export class AgentsController {
  private agentService: AgentService;

  constructor() {
    this.agentService = new AgentService((db as any).pool);
  }

  /**
   * POST /users/:user_id/agents
   * Create a new agent
   */
  createAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user_id } = req.params;
      const { agent_id, phone_number_id, prompt_id, name } = req.body;

      // Validate required fields
      if (!agent_id || !phone_number_id || !prompt_id || !name) {
        res.status(400).json({
          error: 'Missing required fields',
          message: 'agent_id, phone_number_id, prompt_id, and name are required',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      const agentData: CreateAgentData = {
        agent_id,
        user_id: user_id!,
        phone_number_id,
        prompt_id,
        name,
      };

      const result = await this.agentService.createAgent(agentData);

      if (!result.success) {
        res.status(400).json({
          error: 'Failed to create agent',
          message: result.error,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      logger.info('Agent created successfully', {
        user_id: req.params['user_id'],
        agent_id,
        phone_number_id,
        correlationId: req.correlationId,
      });

      res.status(201).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    } catch (error) {
      logger.error('Error creating agent', {
        error: (error as Error).message,
        user_id: req.params['user_id'],
        correlationId: req.correlationId,
      });
      next(error);
    }
  };

  /**
   * GET /users/:user_id/agents
   * List all agents for a user
   */
  listAgents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user_id } = req.params;
      const { limit, offset, orderBy, orderDirection } = req.query;

      // Build query options
      const options: QueryOptions = {};
      if (limit) options.limit = parseInt(limit as string, 10);
      if (offset) options.offset = parseInt(offset as string, 10);
      if (orderBy) options.orderBy = orderBy as string;
      if (orderDirection) options.orderDirection = orderDirection as 'ASC' | 'DESC';

      const result = await this.agentService.getUserAgents(user_id!, options);

      if (!result.success) {
        res.status(404).json({
          error: 'Failed to retrieve agents',
          message: result.error,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data,
        count: result.data?.length || 0,
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    } catch (error) {
      logger.error('Error listing agents', {
        error: (error as Error).message,
        user_id: req.params['user_id'],
        correlationId: req.correlationId,
      });
      next(error);
    }
  };

  /**
   * GET /users/:user_id/agents/:agent_id
   * Get a specific agent
   */
  getAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user_id, agent_id } = req.params;

      const result = await this.agentService.getAgentById(agent_id!);

      if (!result.success) {
        res.status(404).json({
          error: 'Agent not found',
          message: result.error,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      // Verify agent belongs to user
      if (result.data?.user_id !== user_id) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Agent does not belong to this user',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    } catch (error) {
      logger.error('Error getting agent', {
        error: (error as Error).message,
        user_id: req.params['user_id'],
        agent_id: req.params['agent_id'],
        correlationId: req.correlationId,
      });
      next(error);
    }
  };

  /**
   * PATCH /users/:user_id/agents/:agent_id
   * Update an agent
   */
  updateAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user_id, agent_id } = req.params;
      const updateData: UpdateAgentData = req.body;

      // Validate at least one field is provided
      if (!updateData.name && !updateData.prompt_id) {
        res.status(400).json({
          error: 'Missing update fields',
          message: 'At least one field (name or prompt_id) must be provided',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      // Verify agent belongs to user
      const agentResult = await this.agentService.getAgentById(agent_id!);
      if (!agentResult.success) {
        res.status(404).json({
          error: 'Agent not found',
          message: agentResult.error,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      if (agentResult.data?.user_id !== user_id) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Agent does not belong to this user',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      const result = await this.agentService.updateAgent(agent_id!, updateData);

      if (!result.success) {
        res.status(400).json({
          error: 'Failed to update agent',
          message: result.error,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      logger.info('Agent updated successfully', {
        user_id: req.params['user_id'],
        agent_id: req.params['agent_id'],
        correlationId: req.correlationId,
      });

      res.status(200).json({
        success: true,
        data: result.data,
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    } catch (error) {
      logger.error('Error updating agent', {
        error: (error as Error).message,
        user_id: req.params['user_id'],
        agent_id: req.params['agent_id'],
        correlationId: req.correlationId,
      });
      next(error);
    }
  };

  /**
   * DELETE /users/:user_id/agents/:agent_id
   * Delete an agent (archives conversations)
   */
  deleteAgent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { user_id, agent_id } = req.params;

      // Verify agent belongs to user
      const agentResult = await this.agentService.getAgentById(agent_id!);
      if (!agentResult.success) {
        res.status(404).json({
          error: 'Agent not found',
          message: agentResult.error,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      if (agentResult.data?.user_id !== user_id) {
        res.status(403).json({
          error: 'Forbidden',
          message: 'Agent does not belong to this user',
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      const result = await this.agentService.deleteAgent(agent_id!);

      if (!result.success) {
        res.status(400).json({
          error: 'Failed to delete agent',
          message: result.error,
          timestamp: new Date().toISOString(),
          correlationId: req.correlationId,
        });
        return;
      }

      logger.info('Agent deleted successfully', {
        user_id: req.params['user_id'],
        agent_id: req.params['agent_id'],
        correlationId: req.correlationId,
      });

      res.status(200).json({
        success: true,
        message: 'Agent deleted successfully',
        timestamp: new Date().toISOString(),
        correlationId: req.correlationId,
      });
    } catch (error) {
      logger.error('Error deleting agent', {
        error: (error as Error).message,
        user_id: req.params['user_id'],
        agent_id: req.params['agent_id'],
        correlationId: req.correlationId,
      });
      next(error);
    }
  };
}
