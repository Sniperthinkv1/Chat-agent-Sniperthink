import { AgentService } from '../../../src/services/agentService';
import { CreateAgentData, UpdateAgentData } from '../../../src/models/types';

// Mock uuid
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid-123')
}));

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

// Mock validation utilities
jest.mock('../../../src/utils/validation', () => ({
  validateAgentId: jest.fn(),
  validateUserId: jest.fn(),
  validatePhoneNumberId: jest.fn(),
  validatePromptId: jest.fn(),
  validateAgentName: jest.fn(),
  throwIfInvalid: jest.fn(),
  ValidationError: class ValidationError extends Error {
    constructor(message: string, public errors: string[]) {
      super(message);
      this.name = 'ValidationError';
    }
  }
}));

describe('AgentService', () => {
  let mockDb: any;
  let agentService: AgentService;
  let mockAgentModel: any;

  beforeEach(() => {
    mockDb = {
      query: jest.fn()
    };
    agentService = new AgentService(mockDb);
    
    mockAgentModel = {
      create: jest.fn(),
      findById: jest.fn(),
      findByUserId: jest.fn(),
      findByPhoneNumberId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      exists: jest.fn(),
      findByUserIdAndPhoneNumberId: jest.fn(),
      list: jest.fn()
    };
    
    // Access private properties for testing
    (agentService as any).agentModel = mockAgentModel;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createAgent', () => {
    it('should create agent successfully when phone number is not linked', async () => {
      const agentData: CreateAgentData = {
        agent_id: 'agent-123',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Customer Support Agent'
      };

      const mockAgent = {
        agent_id: 'agent-123',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Customer Support Agent',
        created_at: new Date()
      };

      const { 
        validateAgentId, 
        validateUserId, 
        validatePhoneNumberId, 
        validatePromptId, 
        validateAgentName, 
        throwIfInvalid 
      } = require('../../../src/utils/validation');

      validateAgentId.mockReturnValue({ isValid: true, errors: [] });
      validateUserId.mockReturnValue({ isValid: true, errors: [] });
      validatePhoneNumberId.mockReturnValue({ isValid: true, errors: [] });
      validatePromptId.mockReturnValue({ isValid: true, errors: [] });
      validateAgentName.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockAgentModel.findById.mockResolvedValue(null);
      mockAgentModel.findByPhoneNumberId.mockResolvedValue(null);
      mockAgentModel.create.mockResolvedValue(mockAgent);

      const result = await agentService.createAgent(agentData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAgent);
      expect(mockAgentModel.create).toHaveBeenCalledWith(agentData);
    });

    it('should archive old conversation and create new agent when phone number is already linked', async () => {
      const agentData: CreateAgentData = {
        agent_id: 'agent-123',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Customer Support Agent'
      };

      const existingAgent = {
        agent_id: 'old-agent-456',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'old-prompt-1',
        name: 'Old Agent',
        created_at: new Date()
      };

      const mockAgent = {
        agent_id: 'agent-123',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Customer Support Agent',
        created_at: new Date()
      };

      const mockArchive = {
        archive_id: 'mock-uuid-123',
        old_agent_id: 'old-agent-456',
        new_agent_id: 'agent-123',
        phone_number_id: 'phone-1',
        archived_at: new Date()
      };

      const { 
        validateAgentId, 
        validateUserId, 
        validatePhoneNumberId, 
        validatePromptId, 
        validateAgentName, 
        throwIfInvalid 
      } = require('../../../src/utils/validation');

      validateAgentId.mockReturnValue({ isValid: true, errors: [] });
      validateUserId.mockReturnValue({ isValid: true, errors: [] });
      validatePhoneNumberId.mockReturnValue({ isValid: true, errors: [] });
      validatePromptId.mockReturnValue({ isValid: true, errors: [] });
      validateAgentName.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockAgentModel.findById.mockResolvedValue(null);
      mockAgentModel.findByPhoneNumberId.mockResolvedValue(existingAgent);
      mockAgentModel.delete.mockResolvedValue(true);
      mockAgentModel.create.mockResolvedValue(mockAgent);
      mockDb.query.mockResolvedValue({ rows: [mockArchive] });

      const result = await agentService.createAgent(agentData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAgent);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversation_archives'),
        ['mock-uuid-123', 'old-agent-456', 'agent-123', 'phone-1']
      );
      expect(mockAgentModel.delete).toHaveBeenCalledWith('old-agent-456');
      expect(mockAgentModel.create).toHaveBeenCalledWith(agentData);
    });

    it('should return error when agent ID already exists', async () => {
      const agentData: CreateAgentData = {
        agent_id: 'agent-123',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Customer Support Agent'
      };

      const existingAgent = {
        agent_id: 'agent-123',
        user_id: 'user-2',
        phone_number_id: 'phone-2',
        prompt_id: 'prompt-2',
        name: 'Existing Agent',
        created_at: new Date()
      };

      const { 
        validateAgentId, 
        validateUserId, 
        validatePhoneNumberId, 
        validatePromptId, 
        validateAgentName, 
        throwIfInvalid 
      } = require('../../../src/utils/validation');

      validateAgentId.mockReturnValue({ isValid: true, errors: [] });
      validateUserId.mockReturnValue({ isValid: true, errors: [] });
      validatePhoneNumberId.mockReturnValue({ isValid: true, errors: [] });
      validatePromptId.mockReturnValue({ isValid: true, errors: [] });
      validateAgentName.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockAgentModel.findById.mockResolvedValue(existingAgent);

      const result = await agentService.createAgent(agentData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Agent with ID agent-123 already exists');
    });

    it('should return validation error', async () => {
      const agentData: CreateAgentData = {
        agent_id: '',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Customer Support Agent'
      };

      const { 
        validateAgentId, 
        throwIfInvalid, 
        ValidationError 
      } = require('../../../src/utils/validation');

      validateAgentId.mockReturnValue({ 
        isValid: false, 
        errors: ['Agent ID is required'] 
      });
      throwIfInvalid.mockImplementation((validation: any, context: any) => {
        if (!validation.isValid) {
          throw new ValidationError(`Validation failed for ${context}`, validation.errors);
        }
      });

      const result = await agentService.createAgent(agentData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Validation failed');
    });
  });

  describe('getAgentById', () => {
    it('should get agent successfully', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Customer Support Agent',
        created_at: new Date()
      };

      const { validateAgentId, throwIfInvalid } = require('../../../src/utils/validation');
      validateAgentId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockAgentModel.findById.mockResolvedValue(mockAgent);

      const result = await agentService.getAgentById('agent-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAgent);
    });

    it('should return error when agent not found', async () => {
      const { validateAgentId, throwIfInvalid } = require('../../../src/utils/validation');
      validateAgentId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockAgentModel.findById.mockResolvedValue(null);

      const result = await agentService.getAgentById('non-existent-agent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Agent with ID non-existent-agent not found');
    });
  });

  describe('getUserAgents', () => {
    it('should get user agents successfully', async () => {
      const mockAgents = [
        {
          agent_id: 'agent-123',
          user_id: 'user-1',
          phone_number_id: 'phone-1',
          prompt_id: 'prompt-1',
          name: 'Customer Support Agent',
          created_at: new Date()
        }
      ];

      const { validateUserId, throwIfInvalid } = require('../../../src/utils/validation');
      validateUserId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockAgentModel.findByUserId.mockResolvedValue(mockAgents);

      const result = await agentService.getUserAgents('user-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAgents);
    });
  });

  describe('updateAgent', () => {
    it('should update agent successfully', async () => {
      const updateData: UpdateAgentData = {
        name: 'Updated Agent Name',
        prompt_id: 'new-prompt-id'
      };

      const existingAgent = {
        agent_id: 'agent-123',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Old Agent Name',
        created_at: new Date()
      };

      const updatedAgent = {
        agent_id: 'agent-123',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'new-prompt-id',
        name: 'Updated Agent Name',
        created_at: new Date()
      };

      const { 
        validateAgentId, 
        validateAgentName, 
        validatePromptId, 
        throwIfInvalid 
      } = require('../../../src/utils/validation');

      validateAgentId.mockReturnValue({ isValid: true, errors: [] });
      validateAgentName.mockReturnValue({ isValid: true, errors: [] });
      validatePromptId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockAgentModel.findById.mockResolvedValue(existingAgent);
      mockAgentModel.update.mockResolvedValue(updatedAgent);

      const result = await agentService.updateAgent('agent-123', updateData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedAgent);
    });

    it('should return error when agent not found', async () => {
      const updateData: UpdateAgentData = {
        name: 'Updated Agent Name'
      };

      const { validateAgentId, validateAgentName, throwIfInvalid } = require('../../../src/utils/validation');
      validateAgentId.mockReturnValue({ isValid: true, errors: [] });
      validateAgentName.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockAgentModel.findById.mockResolvedValue(null);

      const result = await agentService.updateAgent('non-existent-agent', updateData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Agent with ID non-existent-agent not found');
    });
  });

  describe('deleteAgent', () => {
    it('should delete agent and archive conversations successfully', async () => {
      const existingAgent = {
        agent_id: 'agent-123',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Agent to Delete',
        created_at: new Date()
      };

      const { validateAgentId, throwIfInvalid } = require('../../../src/utils/validation');
      validateAgentId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockAgentModel.findById.mockResolvedValue(existingAgent);
      mockAgentModel.delete.mockResolvedValue(true);
      mockDb.query.mockResolvedValue({ rowCount: 2 }); // Mock archiving 2 conversations

      const result = await agentService.deleteAgent('agent-123');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE conversations.*SET is_active = false.*WHERE agent_id = \$1/s),
        ['agent-123']
      );
      expect(mockAgentModel.delete).toHaveBeenCalledWith('agent-123');
    });

    it('should return error when agent not found', async () => {
      const { validateAgentId, throwIfInvalid } = require('../../../src/utils/validation');
      validateAgentId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockAgentModel.findById.mockResolvedValue(null);

      const result = await agentService.deleteAgent('non-existent-agent');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Agent with ID non-existent-agent not found');
    });
  });

  describe('getAgentByPhoneNumberId', () => {
    it('should get agent by phone number ID successfully', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Customer Support Agent',
        created_at: new Date()
      };

      const { validatePhoneNumberId, throwIfInvalid } = require('../../../src/utils/validation');
      validatePhoneNumberId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockAgentModel.findByPhoneNumberId.mockResolvedValue(mockAgent);

      const result = await agentService.getAgentByPhoneNumberId('phone-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockAgent);
    });

    it('should return error when agent not found', async () => {
      const { validatePhoneNumberId, throwIfInvalid } = require('../../../src/utils/validation');
      validatePhoneNumberId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockAgentModel.findByPhoneNumberId.mockResolvedValue(null);

      const result = await agentService.getAgentByPhoneNumberId('non-existent-phone');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No agent found for phone number ID non-existent-phone');
    });
  });

  describe('getConversationArchives', () => {
    it('should get all conversation archives successfully', async () => {
      const mockArchives = [
        {
          archive_id: 'archive-1',
          old_agent_id: 'old-agent-1',
          new_agent_id: 'new-agent-1',
          phone_number_id: 'phone-1',
          archived_at: new Date()
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockArchives });

      const result = await agentService.getConversationArchives();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockArchives);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM conversation_archives ORDER BY archived_at DESC',
        []
      );
    });

    it('should get conversation archives filtered by phone number ID', async () => {
      const mockArchives = [
        {
          archive_id: 'archive-1',
          old_agent_id: 'old-agent-1',
          new_agent_id: 'new-agent-1',
          phone_number_id: 'phone-1',
          archived_at: new Date()
        }
      ];

      const { validatePhoneNumberId, throwIfInvalid } = require('../../../src/utils/validation');
      validatePhoneNumberId.mockReturnValue({ isValid: true, errors: [] });
      throwIfInvalid.mockImplementation(() => {});

      mockDb.query.mockResolvedValue({ rows: mockArchives });

      const result = await agentService.getConversationArchives('phone-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockArchives);
      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM conversation_archives WHERE phone_number_id = $1 ORDER BY archived_at DESC',
        ['phone-1']
      );
    });
  });
});