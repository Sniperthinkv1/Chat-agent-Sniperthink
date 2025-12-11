import { Request, Response, NextFunction } from 'express';
import { AgentsController } from '../../../src/controllers/agents';
import { AgentService } from '../../../src/services/agentService';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

jest.mock('../../../src/services/agentService');
jest.mock('../../../src/utils/database', () => ({ db: { pool: {} } }));
jest.mock('../../../src/utils/redis', () => ({ redis: { connect: jest.fn(), disconnect: jest.fn(), get: jest.fn(), set: jest.fn(), del: jest.fn(), healthCheck: jest.fn() } }));
jest.mock('../../../src/utils/logger', () => ({ logger: { info: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } }));

describe('AgentsController', () => {
    let controller: AgentsController;
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;
    let mockAgentService: jest.Mocked<AgentService>;

    beforeEach(() => {
        jest.clearAllMocks();
        controller = new AgentsController();
        mockAgentService = (controller as any).agentService;
        mockRequest = { params: {}, body: {}, query: {}, correlationId: 'test-id' };
        mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
        mockNext = jest.fn();
    });

    it('should create agent successfully', async () => {
        mockRequest.params = { user_id: 'user123' };
        mockRequest.body = { agent_id: 'agent123', phone_number_id: 'phone123', prompt_id: 'prompt123', name: 'Test' };
        mockAgentService.createAgent.mockResolvedValue({ success: true, data: {} as any });
        await controller.createAgent(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(201);
    });

    it('should list agents', async () => {
        mockRequest.params = { user_id: 'user123' };
        mockAgentService.getUserAgents.mockResolvedValue({ success: true, data: [] });
        await controller.listAgents(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should get agent', async () => {
        mockRequest.params = { user_id: 'user123', agent_id: 'agent123' };
        mockAgentService.getAgentById.mockResolvedValue({ success: true, data: { user_id: 'user123' } as any });
        await controller.getAgent(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should update agent', async () => {
        mockRequest.params = { user_id: 'user123', agent_id: 'agent123' };
        mockRequest.body = { name: 'Updated' };
        mockAgentService.getAgentById.mockResolvedValue({ success: true, data: { user_id: 'user123' } as any });
        mockAgentService.updateAgent.mockResolvedValue({ success: true, data: {} as any });
        await controller.updateAgent(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
    });

    it('should delete agent', async () => {
        mockRequest.params = { user_id: 'user123', agent_id: 'agent123' };
        mockAgentService.getAgentById.mockResolvedValue({ success: true, data: { user_id: 'user123' } as any });
        mockAgentService.deleteAgent.mockResolvedValue({ success: true, data: true });
        await controller.deleteAgent(mockRequest as Request, mockResponse as Response, mockNext);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
    });
});
