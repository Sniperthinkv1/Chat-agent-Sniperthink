import {
  getOrCreateConversation,
  getConversationHistory,
  updateConversationActivity,
  archiveConversation,
  getUserConversations,
  getConversationById,
  ensureOpenAIConversation
} from '../../../src/services/conversationService';
import { db } from '../../../src/utils/database';
import { logger } from '../../../src/utils/logger';
import * as openaiService from '../../../src/services/openaiService';
import { ConversationModel } from '../../../src/models/Conversation';

// Mock dependencies
jest.mock('../../../src/utils/database');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/services/openaiService');
jest.mock('../../../src/models/Conversation');

describe('ConversationService', () => {
  const mockDb = db as jest.Mocked<typeof db>;
  const mockLogger = logger as jest.Mocked<typeof logger>;
  const mockOpenAIService = openaiService as jest.Mocked<typeof openaiService>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateConversation', () => {
    it('should return existing conversation with agent', async () => {
      const mockAgent = {
        agent_id: 'agent-1',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Test Agent',
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockConversation = {
        conversation_id: 'conv-1',
        agent_id: 'agent-1',
        customer_phone: '+1234567890',
        openai_conversation_id: 'openai-conv-1',
        created_at: new Date(),
        last_message_at: new Date(),
        is_active: true
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockAgent], rowCount: 1 } as any) // Get agent
        .mockResolvedValueOnce({ rows: [mockConversation], rowCount: 1 } as any); // Get conversation

      const result = await getOrCreateConversation('phone-1', '+1234567890');

      expect(result).toEqual({
        ...mockConversation,
        agent: mockAgent
      });
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should create new conversation if none exists', async () => {
      const mockAgent = {
        agent_id: 'agent-1',
        user_id: 'user-1',
        phone_number_id: 'phone-1',
        prompt_id: 'prompt-1',
        name: 'Test Agent',
        created_at: new Date(),
        updated_at: new Date()
      };

      const mockNewConversation = {
        conversation_id: expect.any(String),
        agent_id: 'agent-1',
        customer_phone: '+1234567890',
        openai_conversation_id: null,
        created_at: new Date(),
        last_message_at: new Date(),
        is_active: true
      };

      mockDb.query
        .mockResolvedValueOnce({ rows: [mockAgent], rowCount: 1 } as any) // Get agent
        .mockResolvedValueOnce({ rows: [], rowCount: 0 } as any) // No existing conversation
        .mockResolvedValueOnce({ rows: [mockNewConversation], rowCount: 1 } as any); // Create conversation

      const result = await getOrCreateConversation('phone-1', '+1234567890');

      expect(result).toBeDefined();
      expect(result?.agent).toEqual(mockAgent);
      expect(mockDb.query).toHaveBeenCalledTimes(3);
    });

    it('should return null if no agent found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await getOrCreateConversation('phone-1', '+1234567890');

      expect(result).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await getOrCreateConversation('phone-1', '+1234567890');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getConversationHistory', () => {
    it('should retrieve conversation messages in chronological order', async () => {
      const mockMessages = [
        {
          message_id: 'msg-3',
          conversation_id: 'conv-1',
          sender: 'agent',
          text: 'Third message',
          timestamp: new Date(),
          status: 'sent',
          sequence_no: 3
        },
        {
          message_id: 'msg-2',
          conversation_id: 'conv-1',
          sender: 'user',
          text: 'Second message',
          timestamp: new Date(),
          status: 'sent',
          sequence_no: 2
        },
        {
          message_id: 'msg-1',
          conversation_id: 'conv-1',
          sender: 'user',
          text: 'First message',
          timestamp: new Date(),
          status: 'sent',
          sequence_no: 1
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockMessages, rowCount: 3 } as any);

      const result = await getConversationHistory('conv-1', 10);

      expect(result).toHaveLength(3);
      expect(result[0].sequence_no).toBe(3); // Reversed to chronological
      expect(result[2].sequence_no).toBe(1);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY sequence_no DESC'),
        ['conv-1', 10]
      );
    });

    it('should handle errors', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(getConversationHistory('conv-1')).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('updateConversationActivity', () => {
    it('should update last_message_at timestamp', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await updateConversationActivity('conv-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE conversations SET last_message_at'),
        ['conv-1']
      );
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(updateConversationActivity('conv-1')).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('archiveConversation', () => {
    it('should mark conversation as inactive', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 1 } as any);

      await archiveConversation('conv-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE conversations SET is_active = false'),
        ['conv-1']
      );
      expect(mockLogger.info).toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(archiveConversation('conv-1')).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getUserConversations', () => {
    it('should retrieve user conversations with pagination', async () => {
      const mockConversations = [
        {
          conversation_id: 'conv-1',
          agent_id: 'agent-1',
          customer_phone: '+1234567890',
          created_at: new Date(),
          last_message_at: new Date(),
          is_active: true
        },
        {
          conversation_id: 'conv-2',
          agent_id: 'agent-1',
          customer_phone: '+0987654321',
          created_at: new Date(),
          last_message_at: new Date(),
          is_active: true
        }
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockConversations, rowCount: 2 } as any);

      const result = await getUserConversations('user-1', 50, 0);

      expect(result).toHaveLength(2);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('JOIN agents a ON c.agent_id = a.agent_id'),
        ['user-1', 50, 0]
      );
    });

    it('should handle errors', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(getUserConversations('user-1')).rejects.toThrow('Database error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('getConversationById', () => {
    it('should retrieve conversation by ID', async () => {
      const mockConversation = {
        conversation_id: 'conv-1',
        agent_id: 'agent-1',
        customer_phone: '+1234567890',
        openai_conversation_id: 'openai-conv-1',
        created_at: new Date(),
        last_message_at: new Date(),
        is_active: true
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockConversation], rowCount: 1 } as any);

      const result = await getConversationById('conv-1');

      expect(result).toEqual(mockConversation);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM conversations WHERE conversation_id'),
        ['conv-1']
      );
    });

    it('should return null if conversation not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await getConversationById('conv-1');

      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await getConversationById('conv-1');

      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('ensureOpenAIConversation', () => {
    it('should return existing OpenAI conversation ID', async () => {
      const mockConversation = {
        conversation_id: 'conv-1',
        agent_id: 'agent-1',
        customer_phone: '+1234567890',
        openai_conversation_id: 'existing-openai-conv-1',
        created_at: new Date(),
        last_message_at: new Date(),
        is_active: true
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockConversation], rowCount: 1 } as any);

      const result = await ensureOpenAIConversation('conv-1');

      expect(result).toBe('existing-openai-conv-1');
      expect(mockOpenAIService.createOpenAIConversation).not.toHaveBeenCalled();
    });

    it('should create new OpenAI conversation if none exists', async () => {
      const mockConversation = {
        conversation_id: 'conv-1',
        agent_id: 'agent-1',
        customer_phone: '+1234567890',
        openai_conversation_id: null,
        created_at: new Date(),
        last_message_at: new Date(),
        is_active: true
      };

      const mockOpenAIConversation = {
        id: 'new-openai-conv-1',
        created_at: Date.now()
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockConversation], rowCount: 1 } as any);
      mockOpenAIService.createOpenAIConversation.mockResolvedValueOnce(mockOpenAIConversation);
      
      const mockConversationModel = {
        updateOpenAIConversationId: jest.fn().mockResolvedValueOnce(undefined)
      };
      (ConversationModel as jest.Mock).mockImplementation(() => mockConversationModel);

      const result = await ensureOpenAIConversation('conv-1');

      expect(result).toBe('new-openai-conv-1');
      expect(mockOpenAIService.createOpenAIConversation).toHaveBeenCalledWith(
        expect.objectContaining({
          conversation_id: 'conv-1',
          agent_id: 'agent-1',
          customer_phone: '+1234567890'
        })
      );
      expect(mockConversationModel.updateOpenAIConversationId).toHaveBeenCalledWith(
        'conv-1',
        'new-openai-conv-1'
      );
    });

    it('should throw error if conversation not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await expect(ensureOpenAIConversation('conv-1')).rejects.toThrow('Conversation not found');
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle OpenAI creation errors', async () => {
      const mockConversation = {
        conversation_id: 'conv-1',
        agent_id: 'agent-1',
        customer_phone: '+1234567890',
        openai_conversation_id: null,
        created_at: new Date(),
        last_message_at: new Date(),
        is_active: true
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockConversation], rowCount: 1 } as any);
      mockOpenAIService.createOpenAIConversation.mockRejectedValueOnce(new Error('OpenAI error'));

      await expect(ensureOpenAIConversation('conv-1')).rejects.toThrow('OpenAI error');
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });
});
