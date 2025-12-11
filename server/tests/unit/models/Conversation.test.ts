import { ConversationModel } from '../../../src/models/Conversation';
import { CreateConversationData } from '../../../src/models/types';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('ConversationModel', () => {
  let mockDb: any;
  let conversationModel: ConversationModel;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    conversationModel = new ConversationModel(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a conversation successfully', async () => {
      const conversationData: CreateConversationData = {
        conversation_id: 'conv-123',
        agent_id: 'agent-1',
        customer_phone: '+1234567890'
      };

      const mockResult = {
        rows: [{
          conversation_id: 'conv-123',
          agent_id: 'agent-1',
          customer_phone: '+1234567890',
          created_at: new Date(),
          last_message_at: new Date(),
          is_active: true
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await conversationModel.create(conversationData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO conversations'),
        ['conv-123', 'agent-1', '+1234567890']
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should throw error when database query fails', async () => {
      const conversationData: CreateConversationData = {
        conversation_id: 'conv-123',
        agent_id: 'agent-1',
        customer_phone: '+1234567890'
      };

      const dbError = new Error('Database connection failed');
      mockDb.query.mockRejectedValue(dbError);

      await expect(conversationModel.create(conversationData)).rejects.toThrow('Failed to create conversation: Database connection failed');
    });
  });

  describe('findById', () => {
    it('should find conversation by ID successfully', async () => {
      const mockConversation = {
        conversation_id: 'conv-123',
        agent_id: 'agent-1',
        customer_phone: '+1234567890',
        created_at: new Date(),
        last_message_at: new Date(),
        is_active: true
      };

      mockDb.query.mockResolvedValue({ rows: [mockConversation] });

      const result = await conversationModel.findById('conv-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM conversations WHERE conversation_id = $1',
        ['conv-123']
      );
      expect(result).toEqual(mockConversation);
    });

    it('should return null when conversation not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await conversationModel.findById('non-existent-conv');

      expect(result).toBeNull();
    });
  });

  describe('findByAgentId', () => {
    it('should find conversations by agent ID with default options', async () => {
      const mockConversations = [
        {
          conversation_id: 'conv-123',
          agent_id: 'agent-1',
          customer_phone: '+1234567890',
          created_at: new Date(),
          last_message_at: new Date(),
          is_active: true
        },
        {
          conversation_id: 'conv-124',
          agent_id: 'agent-1',
          customer_phone: '+1234567891',
          created_at: new Date(),
          last_message_at: new Date(),
          is_active: true
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockConversations });

      const result = await conversationModel.findByAgentId('agent-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM conversations.*WHERE agent_id = \$1.*ORDER BY last_message_at DESC.*LIMIT \$2 OFFSET \$3/s),
        ['agent-1', 100, 0]
      );
      expect(result).toEqual(mockConversations);
    });

    it('should find conversations by agent ID with custom options', async () => {
      const mockConversations = [
        {
          conversation_id: 'conv-123',
          agent_id: 'agent-1',
          customer_phone: '+1234567890',
          created_at: new Date(),
          last_message_at: new Date(),
          is_active: true
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockConversations });

      const result = await conversationModel.findByAgentId('agent-1', {
        limit: 10,
        offset: 5,
        orderBy: 'created_at',
        orderDirection: 'ASC'
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM conversations.*WHERE agent_id = \$1.*ORDER BY created_at ASC.*LIMIT \$2 OFFSET \$3/s),
        ['agent-1', 10, 5]
      );
      expect(result).toEqual(mockConversations);
    });
  });

  describe('findByCustomerPhone', () => {
    it('should find conversations by customer phone without agent filter', async () => {
      const mockConversations = [
        {
          conversation_id: 'conv-123',
          agent_id: 'agent-1',
          customer_phone: '+1234567890',
          created_at: new Date(),
          last_message_at: new Date(),
          is_active: true
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockConversations });

      const result = await conversationModel.findByCustomerPhone('+1234567890');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM conversations WHERE customer_phone = $1 ORDER BY last_message_at DESC',
        ['+1234567890']
      );
      expect(result).toEqual(mockConversations);
    });

    it('should find conversations by customer phone with agent filter', async () => {
      const mockConversations = [
        {
          conversation_id: 'conv-123',
          agent_id: 'agent-1',
          customer_phone: '+1234567890',
          created_at: new Date(),
          last_message_at: new Date(),
          is_active: true
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockConversations });

      const result = await conversationModel.findByCustomerPhone('+1234567890', 'agent-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM conversations WHERE customer_phone = $1 AND agent_id = $2 ORDER BY last_message_at DESC',
        ['+1234567890', 'agent-1']
      );
      expect(result).toEqual(mockConversations);
    });
  });

  describe('findActiveByCustomerPhoneAndAgent', () => {
    it('should find active conversation by customer phone and agent', async () => {
      const mockConversation = {
        conversation_id: 'conv-123',
        agent_id: 'agent-1',
        customer_phone: '+1234567890',
        created_at: new Date(),
        last_message_at: new Date(),
        is_active: true
      };

      mockDb.query.mockResolvedValue({ rows: [mockConversation] });

      const result = await conversationModel.findActiveByCustomerPhoneAndAgent('+1234567890', 'agent-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM conversations.*WHERE customer_phone = \$1 AND agent_id = \$2 AND is_active = true.*ORDER BY last_message_at DESC.*LIMIT 1/s),
        ['+1234567890', 'agent-1']
      );
      expect(result).toEqual(mockConversation);
    });

    it('should return null when no active conversation found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await conversationModel.findActiveByCustomerPhoneAndAgent('+1234567890', 'agent-1');

      expect(result).toBeNull();
    });
  });

  describe('updateLastMessageTime', () => {
    it('should update last message time successfully', async () => {
      const mockConversation = {
        conversation_id: 'conv-123',
        agent_id: 'agent-1',
        customer_phone: '+1234567890',
        created_at: new Date(),
        last_message_at: new Date(),
        is_active: true
      };

      mockDb.query.mockResolvedValue({ rows: [mockConversation] });

      const result = await conversationModel.updateLastMessageTime('conv-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE conversations.*SET last_message_at = CURRENT_TIMESTAMP.*WHERE conversation_id = \$1/s),
        ['conv-123']
      );
      expect(result).toEqual(mockConversation);
    });

    it('should return null when conversation not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await conversationModel.updateLastMessageTime('non-existent-conv');

      expect(result).toBeNull();
    });
  });

  describe('setInactive', () => {
    it('should set conversation inactive successfully', async () => {
      const mockConversation = {
        conversation_id: 'conv-123',
        agent_id: 'agent-1',
        customer_phone: '+1234567890',
        created_at: new Date(),
        last_message_at: new Date(),
        is_active: false
      };

      mockDb.query.mockResolvedValue({ rows: [mockConversation] });

      const result = await conversationModel.setInactive('conv-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE conversations.*SET is_active = false.*WHERE conversation_id = \$1/s),
        ['conv-123']
      );
      expect(result).toEqual(mockConversation);
    });

    it('should return null when conversation not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await conversationModel.setInactive('non-existent-conv');

      expect(result).toBeNull();
    });
  });

  describe('findInactiveOlderThan', () => {
    it('should find inactive conversations older than specified days', async () => {
      const mockConversations = [
        {
          conversation_id: 'conv-123',
          agent_id: 'agent-1',
          customer_phone: '+1234567890',
          created_at: new Date(),
          last_message_at: new Date(),
          is_active: true
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockConversations });

      const result = await conversationModel.findInactiveOlderThan(21);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM conversations.*WHERE is_active = true.*AND last_message_at < NOW\(\) - INTERVAL '21 days'/s)
      );
      expect(result).toEqual(mockConversations);
    });
  });

  describe('purgeInactiveConversations', () => {
    it('should purge inactive conversations successfully', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 5 });

      const result = await conversationModel.purgeInactiveConversations(21);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE conversations.*SET is_active = false.*WHERE is_active = true.*AND last_message_at < NOW\(\) - INTERVAL '21 days'/s)
      );
      expect(result).toBe(5);
    });

    it('should use default 21 days when no parameter provided', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 3 });

      const result = await conversationModel.purgeInactiveConversations();

      expect(result).toBe(3);
    });
  });

  describe('exists', () => {
    it('should return true when conversation exists', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ exists: true }] });

      const result = await conversationModel.exists('conv-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT 1 FROM conversations WHERE conversation_id = $1',
        ['conv-123']
      );
      expect(result).toBe(true);
    });

    it('should return false when conversation does not exist', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await conversationModel.exists('non-existent-conv');

      expect(result).toBe(false);
    });
  });

  describe('getConversationStats', () => {
    it('should get conversation stats without agent filter', async () => {
      const mockStats = {
        total: '10',
        active: '7',
        inactive: '3'
      };

      mockDb.query.mockResolvedValue({ rows: [mockStats] });

      const result = await conversationModel.getConversationStats();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT.*COUNT\(\*\) as total.*COUNT\(CASE WHEN is_active = true THEN 1 END\) as active.*COUNT\(CASE WHEN is_active = false THEN 1 END\) as inactive.*FROM conversations/s),
        []
      );
      expect(result).toEqual({
        total: 10,
        active: 7,
        inactive: 3
      });
    });

    it('should get conversation stats with agent filter', async () => {
      const mockStats = {
        total: '5',
        active: '4',
        inactive: '1'
      };

      mockDb.query.mockResolvedValue({ rows: [mockStats] });

      const result = await conversationModel.getConversationStats('agent-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT.*COUNT\(\*\) as total.*COUNT\(CASE WHEN is_active = true THEN 1 END\) as active.*COUNT\(CASE WHEN is_active = false THEN 1 END\) as inactive.*FROM conversations.*WHERE agent_id = \$1/s),
        ['agent-1']
      );
      expect(result).toEqual({
        total: 5,
        active: 4,
        inactive: 1
      });
    });
  });
});