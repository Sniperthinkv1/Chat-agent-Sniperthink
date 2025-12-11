import { AgentModel } from '../../../src/models/Agent';
import { CreateAgentData, UpdateAgentData } from '../../../src/models/types';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('AgentModel', () => {
  let mockDb: any;
  let agentModel: AgentModel;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    agentModel = new AgentModel(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an agent successfully', async () => {
      const agentData: CreateAgentData = {
        agent_id: 'agent-123',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Customer Support Agent'
      };

      const mockResult = {
        rows: [{
          agent_id: 'agent-123',
          user_id: 'user-1',
          phone_number_id: 'phone-1',
          prompt_id: 'prompt-1',
          name: 'Customer Support Agent',
          created_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await agentModel.create(agentData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO agents'),
        ['agent-123', 'user-1', 'phone-1', 'prompt-1', 'Customer Support Agent']
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should throw error when database query fails', async () => {
      const agentData: CreateAgentData = {
        agent_id: 'agent-123',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Customer Support Agent'
      };

      const dbError = new Error('Database connection failed');
      mockDb.query.mockRejectedValue(dbError);

      await expect(agentModel.create(agentData)).rejects.toThrow('Failed to create agent: Database connection failed');
    });
  });

  describe('findById', () => {
    it('should find agent by ID successfully', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Customer Support Agent',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockAgent] });

      const result = await agentModel.findById('agent-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM agents WHERE agent_id = $1',
        ['agent-123']
      );
      expect(result).toEqual(mockAgent);
    });

    it('should return null when agent not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await agentModel.findById('non-existent-agent');

      expect(result).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find agents by user ID with default options', async () => {
      const mockAgents = [
        {
          agent_id: 'agent-123',
          user_id: 'user-1',
          phone_number_id: 'phone-1',
          prompt_id: 'prompt-1',
          name: 'Customer Support Agent',
          created_at: new Date()
        },
        {
          agent_id: 'agent-124',
          user_id: 'user-1',
          phone_number_id: 'phone-2',
          prompt_id: 'prompt-2',
          name: 'Sales Agent',
          created_at: new Date()
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockAgents });

      const result = await agentModel.findByUserId('user-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM agents.*WHERE user_id = \$1.*ORDER BY created_at DESC.*LIMIT \$2 OFFSET \$3/s),
        ['user-1', 100, 0]
      );
      expect(result).toEqual(mockAgents);
    });

    it('should find agents by user ID with custom options', async () => {
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

      mockDb.query.mockResolvedValue({ rows: mockAgents });

      const result = await agentModel.findByUserId('user-1', {
        limit: 10,
        offset: 5,
        orderBy: 'name',
        orderDirection: 'ASC'
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM agents.*WHERE user_id = \$1.*ORDER BY name ASC.*LIMIT \$2 OFFSET \$3/s),
        ['user-1', 10, 5]
      );
      expect(result).toEqual(mockAgents);
    });
  });

  describe('findByPhoneNumberId', () => {
    it('should find agent by phone number ID', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Customer Support Agent',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockAgent] });

      const result = await agentModel.findByPhoneNumberId('phone-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM agents WHERE phone_number_id = $1',
        ['phone-1']
      );
      expect(result).toEqual(mockAgent);
    });

    it('should return null when agent not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await agentModel.findByPhoneNumberId('non-existent-phone');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    it('should update agent name successfully', async () => {
      const updateData: UpdateAgentData = {
        name: 'Updated Agent Name'
      };

      const mockResult = {
        rows: [{
          agent_id: 'agent-123',
          user_id: 'user-1',
          phone_number_id: 'phone-1',
          prompt_id: 'prompt-1',
          name: 'Updated Agent Name',
          created_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await agentModel.update('agent-123', updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE agents.*SET name = \$1.*WHERE agent_id = \$2/s),
        ['Updated Agent Name', 'agent-123']
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should update multiple fields successfully', async () => {
      const updateData: UpdateAgentData = {
        name: 'Updated Agent Name',
        prompt_id: 'new-prompt-id'
      };

      const mockResult = {
        rows: [{
          agent_id: 'agent-123',
          user_id: 'user-1',
          phone_number_id: 'phone-1',
          prompt_id: 'new-prompt-id',
          name: 'Updated Agent Name',
          created_at: new Date()
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await agentModel.update('agent-123', updateData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE agents.*SET name = \$1, prompt_id = \$2.*WHERE agent_id = \$3/s),
        ['Updated Agent Name', 'new-prompt-id', 'agent-123']
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should return null when agent not found', async () => {
      const updateData: UpdateAgentData = {
        name: 'Updated Agent Name'
      };

      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await agentModel.update('non-existent-agent', updateData);

      expect(result).toBeNull();
    });

    it('should throw error when no fields to update', async () => {
      const updateData: UpdateAgentData = {};

      await expect(agentModel.update('agent-123', updateData)).rejects.toThrow('No fields to update');
    });
  });

  describe('delete', () => {
    it('should delete agent successfully', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 1 });

      const result = await agentModel.delete('agent-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'DELETE FROM agents WHERE agent_id = $1',
        ['agent-123']
      );
      expect(result).toBe(true);
    });

    it('should return false when agent not found', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 0 });

      const result = await agentModel.delete('non-existent-agent');

      expect(result).toBe(false);
    });
  });

  describe('exists', () => {
    it('should return true when agent exists', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ exists: true }] });

      const result = await agentModel.exists('agent-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT 1 FROM agents WHERE agent_id = $1',
        ['agent-123']
      );
      expect(result).toBe(true);
    });

    it('should return false when agent does not exist', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await agentModel.exists('non-existent-agent');

      expect(result).toBe(false);
    });
  });

  describe('findByUserIdAndPhoneNumberId', () => {
    it('should find agent by user ID and phone number ID', async () => {
      const mockAgent = {
        agent_id: 'agent-123',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Customer Support Agent',
        created_at: new Date()
      };

      mockDb.query.mockResolvedValue({ rows: [mockAgent] });

      const result = await agentModel.findByUserIdAndPhoneNumberId('user-1', 'phone-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM agents WHERE user_id = $1 AND phone_number_id = $2',
        ['user-1', 'phone-1']
      );
      expect(result).toEqual(mockAgent);
    });

    it('should return null when agent not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await agentModel.findByUserIdAndPhoneNumberId('user-1', 'non-existent-phone');

      expect(result).toBeNull();
    });
  });

  describe('list', () => {
    it('should list agents with default options', async () => {
      const mockAgents = [
        { agent_id: 'agent-1', user_id: 'user-1', phone_number_id: 'phone-1', prompt_id: 'prompt-1', name: 'Agent 1', created_at: new Date() },
        { agent_id: 'agent-2', user_id: 'user-2', phone_number_id: 'phone-2', prompt_id: 'prompt-2', name: 'Agent 2', created_at: new Date() }
      ];

      mockDb.query.mockResolvedValue({ rows: mockAgents });

      const result = await agentModel.list();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM agents.*ORDER BY created_at DESC.*LIMIT \$1 OFFSET \$2/s),
        [100, 0]
      );
      expect(result).toEqual(mockAgents);
    });

    it('should list agents with custom options', async () => {
      const mockAgents = [
        { agent_id: 'agent-1', user_id: 'user-1', phone_number_id: 'phone-1', prompt_id: 'prompt-1', name: 'Agent 1', created_at: new Date() }
      ];

      mockDb.query.mockResolvedValue({ rows: mockAgents });

      const result = await agentModel.list({
        limit: 10,
        offset: 5,
        orderBy: 'name',
        orderDirection: 'ASC'
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM agents.*ORDER BY name ASC.*LIMIT \$1 OFFSET \$2/s),
        [10, 5]
      );
      expect(result).toEqual(mockAgents);
    });
  });
});