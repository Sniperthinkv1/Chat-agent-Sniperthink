import { Request, Response, NextFunction } from 'express';
import { MessagesController } from '../../../src/controllers/messages';
import { MessageModel } from '../../../src/models/Message';
import { ConversationModel } from '../../../src/models/Conversation';

// Mock dependencies
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

jest.mock('../../../src/utils/database', () => ({
  db: {
    pool: {
      query: jest.fn(),
    },
  },
}));

jest.mock('../../../src/models/Message');
jest.mock('../../../src/models/Conversation');

// Import db after mocking
import { db } from '../../../src/utils/database';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

describe('MessagesController', () => {
  let controller: MessagesController;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;
  let mockMessageModel: jest.Mocked<MessageModel>;
  let mockConversationModel: jest.Mocked<ConversationModel>;
  let mockDbPool: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock database pool
    mockDbPool = {
      query: jest.fn(),
    };
    (db as any).pool = mockDbPool;

    // Setup mock models
    mockMessageModel = {
      findByConversationId: jest.fn(),
      getMessageHistory: jest.fn(),
      getConversationMessageCount: jest.fn(),
    } as any;

    mockConversationModel = {
      findById: jest.fn(),
    } as any;

    // Mock model constructors
    (MessageModel as jest.MockedClass<typeof MessageModel>).mockImplementation(() => mockMessageModel);
    (ConversationModel as jest.MockedClass<typeof ConversationModel>).mockImplementation(() => mockConversationModel);

    // Create controller instance
    controller = new MessagesController();

    // Setup mock request, response, and next
    mockRequest = {
      params: {},
      query: {},
      body: {},
      correlationId: 'test-correlation-id',
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getMessages', () => {
    it('should retrieve messages for a user with default pagination', async () => {
      mockRequest.params = { user_id: 'user-123' };

      const mockMessages = [
        {
          message_id: 'msg-1',
          conversation_id: 'conv-1',
          sender: 'user',
          text: 'Hello',
          timestamp: new Date(),
          status: 'sent',
          sequence_no: 1,
          agent_id: 'agent-1',
          customer_phone: '+1234567890',
          phone_number_id: 'phone-1',
          platform: 'whatsapp',
        },
      ];

      mockDbPool.query
        .mockResolvedValueOnce({ rows: mockMessages }) // Main query
        .mockResolvedValueOnce({ rows: [{ total: '1' }] }); // Count query

      await controller.getMessages(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockMessages,
        pagination: {
          total: 1,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
        timestamp: expect.any(String),
        correlationId: 'test-correlation-id',
      });
    });

    it('should filter messages by conversation_id', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockRequest.query = { conversation_id: 'conv-1' };

      mockDbPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      await controller.getMessages(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND m.conversation_id = $2'),
        expect.arrayContaining(['user-123', 'conv-1'])
      );
    });

    it('should filter messages by phone_number_id', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockRequest.query = { phone_number_id: 'phone-1' };

      mockDbPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      await controller.getMessages(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND a.phone_number_id = $2'),
        expect.arrayContaining(['user-123', 'phone-1'])
      );
    });

    it('should filter messages by agent_id', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockRequest.query = { agent_id: 'agent-1' };

      mockDbPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      await controller.getMessages(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND c.agent_id = $2'),
        expect.arrayContaining(['user-123', 'agent-1'])
      );
    });

    it('should filter messages by sender', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockRequest.query = { sender: 'user' };

      mockDbPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      await controller.getMessages(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND m.sender = $2'),
        expect.arrayContaining(['user-123', 'user'])
      );
    });

    it('should filter messages by status', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockRequest.query = { status: 'failed' };

      mockDbPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      await controller.getMessages(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND m.status = $2'),
        expect.arrayContaining(['user-123', 'failed'])
      );
    });

    it('should filter messages by date range', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockRequest.query = {
        start_date: '2024-01-01',
        end_date: '2024-01-31',
      };

      mockDbPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      await controller.getMessages(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND m.timestamp >= $2'),
        expect.arrayContaining(['user-123', '2024-01-01', '2024-01-31'])
      );
    });

    it('should return 400 for invalid sender', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockRequest.query = { sender: 'invalid' };

      await controller.getMessages(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid sender',
        message: 'Sender must be either "user" or "agent"',
        timestamp: expect.any(String),
        correlationId: 'test-correlation-id',
      });
    });

    it('should return 400 for invalid status', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockRequest.query = { status: 'invalid' };

      await controller.getMessages(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Invalid status',
        message: 'Status must be one of: sent, failed, pending',
        timestamp: expect.any(String),
        correlationId: 'test-correlation-id',
      });
    });

    it('should handle custom pagination parameters', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockRequest.query = {
        limit: '10',
        offset: '20',
        orderBy: 'sequence_no',
        orderDirection: 'ASC',
      };

      mockDbPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '100' }] });

      await controller.getMessages(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY m.sequence_no ASC'),
        expect.arrayContaining([10, 20])
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          pagination: {
            total: 100,
            limit: 10,
            offset: 20,
            hasMore: true,
          },
        })
      );
    });

    it('should handle database errors', async () => {
      mockRequest.params = { user_id: 'user-123' };
      const error = new Error('Database error');
      mockDbPool.query.mockRejectedValueOnce(error);

      await controller.getMessages(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getConversationMessages', () => {
    it('should retrieve messages for a specific conversation', async () => {
      mockRequest.params = {
        user_id: 'user-123',
        conversation_id: 'conv-1',
      };

      const mockConversation = {
        conversation_id: 'conv-1',
        agent_id: 'agent-1',
        customer_phone: '+1234567890',
        is_active: true,
        created_at: new Date(),
        last_message_at: new Date(),
      };

      const mockMessages = [
        {
          message_id: 'msg-1',
          conversation_id: 'conv-1',
          sender: 'user' as const,
          text: 'Hello',
          timestamp: new Date(),
          status: 'sent' as const,
          sequence_no: 1,
        },
      ];

      mockConversationModel.findById.mockResolvedValueOnce(mockConversation);
      mockDbPool.query.mockResolvedValueOnce({
        rows: [{ user_id: 'user-123' }],
      });
      mockMessageModel.findByConversationId.mockResolvedValueOnce(mockMessages as any);
      mockMessageModel.getConversationMessageCount.mockResolvedValueOnce(1);

      await controller.getConversationMessages(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          conversation_id: 'conv-1',
          messages: mockMessages,
          conversation_info: {
            agent_id: mockConversation.agent_id,
            customer_phone: mockConversation.customer_phone,
            is_active: mockConversation.is_active,
            created_at: mockConversation.created_at,
            last_message_at: mockConversation.last_message_at,
          },
        },
        pagination: {
          total: 1,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
        timestamp: expect.any(String),
        correlationId: 'test-correlation-id',
      });
    });

    it('should return 404 if conversation not found', async () => {
      mockRequest.params = {
        user_id: 'user-123',
        conversation_id: 'conv-1',
      };

      mockConversationModel.findById.mockResolvedValueOnce(null);

      await controller.getConversationMessages(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Conversation not found',
        message: 'The specified conversation does not exist',
        timestamp: expect.any(String),
        correlationId: 'test-correlation-id',
      });
    });

    it('should return 403 if conversation does not belong to user', async () => {
      mockRequest.params = {
        user_id: 'user-123',
        conversation_id: 'conv-1',
      };

      const mockConversation = {
        conversation_id: 'conv-1',
        agent_id: 'agent-1',
        customer_phone: '+1234567890',
        is_active: true,
        created_at: new Date(),
        last_message_at: new Date(),
      };

      mockConversationModel.findById.mockResolvedValueOnce(mockConversation);
      mockDbPool.query.mockResolvedValueOnce({
        rows: [{ user_id: 'different-user' }],
      });

      await controller.getConversationMessages(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Conversation does not belong to this user',
        timestamp: expect.any(String),
        correlationId: 'test-correlation-id',
      });
    });

    it('should use message history when before_sequence is provided', async () => {
      mockRequest.params = {
        user_id: 'user-123',
        conversation_id: 'conv-1',
      };
      mockRequest.query = { before_sequence: '10' };

      const mockConversation = {
        conversation_id: 'conv-1',
        agent_id: 'agent-1',
        customer_phone: '+1234567890',
        is_active: true,
        created_at: new Date(),
        last_message_at: new Date(),
      };

      mockConversationModel.findById.mockResolvedValueOnce(mockConversation);
      mockDbPool.query.mockResolvedValueOnce({
        rows: [{ user_id: 'user-123' }],
      });
      mockMessageModel.getMessageHistory.mockResolvedValueOnce([]);
      mockMessageModel.getConversationMessageCount.mockResolvedValueOnce(0);

      await controller.getConversationMessages(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockMessageModel.getMessageHistory).toHaveBeenCalledWith(
        'conv-1',
        10,
        50
      );
    });
  });

  describe('getConversations', () => {
    it('should retrieve conversations for a user', async () => {
      mockRequest.params = { user_id: 'user-123' };

      const mockConversations = [
        {
          conversation_id: 'conv-1',
          agent_id: 'agent-1',
          customer_phone: '+1234567890',
          created_at: new Date(),
          last_message_at: new Date(),
          is_active: true,
          agent_name: 'Test Agent',
          phone_number_id: 'phone-1',
          platform: 'whatsapp',
          message_count: '5',
          last_message_text: 'Hello',
          last_message_sender: 'user',
        },
      ];

      mockDbPool.query
        .mockResolvedValueOnce({ rows: mockConversations })
        .mockResolvedValueOnce({ rows: [{ total: '1' }] });

      await controller.getConversations(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockConversations,
        pagination: {
          total: 1,
          limit: 50,
          offset: 0,
          hasMore: false,
        },
        timestamp: expect.any(String),
        correlationId: 'test-correlation-id',
      });
    });

    it('should filter conversations by agent_id', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockRequest.query = { agent_id: 'agent-1' };

      mockDbPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      await controller.getConversations(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND c.agent_id = $2'),
        expect.arrayContaining(['user-123', 'agent-1'])
      );
    });

    it('should filter conversations by is_active', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockRequest.query = { is_active: 'true' };

      mockDbPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      await controller.getConversations(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND c.is_active = $2'),
        expect.arrayContaining(['user-123', true])
      );
    });

    it('should filter conversations by customer_phone', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockRequest.query = { customer_phone: '+1234567890' };

      mockDbPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: '0' }] });

      await controller.getConversations(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND c.customer_phone = $2'),
        expect.arrayContaining(['user-123', '+1234567890'])
      );
    });
  });

  describe('getConversation', () => {
    it('should retrieve a specific conversation', async () => {
      mockRequest.params = {
        user_id: 'user-123',
        conversation_id: 'conv-1',
      };

      const mockConversation = {
        conversation_id: 'conv-1',
        agent_id: 'agent-1',
        customer_phone: '+1234567890',
        created_at: new Date(),
        last_message_at: new Date(),
        is_active: true,
        agent_name: 'Test Agent',
        prompt_id: 'prompt-1',
        phone_number_id: 'phone-1',
        user_id: 'user-123',
        platform: 'whatsapp',
        message_count: '5',
        user_message_count: '3',
        agent_message_count: '2',
      };

      mockDbPool.query.mockResolvedValueOnce({ rows: [mockConversation] });

      await controller.getConversation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: mockConversation,
        timestamp: expect.any(String),
        correlationId: 'test-correlation-id',
      });
    });

    it('should return 404 if conversation not found', async () => {
      mockRequest.params = {
        user_id: 'user-123',
        conversation_id: 'conv-1',
      };

      mockDbPool.query.mockResolvedValueOnce({ rows: [] });

      await controller.getConversation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Conversation not found',
        message: 'The specified conversation does not exist',
        timestamp: expect.any(String),
        correlationId: 'test-correlation-id',
      });
    });

    it('should return 403 if conversation does not belong to user', async () => {
      mockRequest.params = {
        user_id: 'user-123',
        conversation_id: 'conv-1',
      };

      const mockConversation = {
        conversation_id: 'conv-1',
        user_id: 'different-user',
      };

      mockDbPool.query.mockResolvedValueOnce({ rows: [mockConversation] });

      await controller.getConversation(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Conversation does not belong to this user',
        timestamp: expect.any(String),
        correlationId: 'test-correlation-id',
      });
    });
  });

  describe('getMessageStats', () => {
    it('should retrieve message statistics for a user', async () => {
      mockRequest.params = { user_id: 'user-123' };

      const mockStats = {
        total_messages: '100',
        user_messages: '60',
        agent_messages: '40',
        sent_messages: '95',
        failed_messages: '3',
        pending_messages: '2',
        active_conversations: '10',
      };

      mockDbPool.query.mockResolvedValueOnce({ rows: [mockStats] });

      await controller.getMessageStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          total_messages: 100,
          by_sender: {
            user: 60,
            agent: 40,
          },
          by_status: {
            sent: 95,
            failed: 3,
            pending: 2,
          },
          active_conversations: 10,
          time_range: 'day',
        },
        timestamp: expect.any(String),
        correlationId: 'test-correlation-id',
      });
    });

    it('should filter stats by time range', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockRequest.query = { time_range: 'week' };

      const mockStats = {
        total_messages: '500',
        user_messages: '300',
        agent_messages: '200',
        sent_messages: '480',
        failed_messages: '15',
        pending_messages: '5',
        active_conversations: '50',
      };

      mockDbPool.query.mockResolvedValueOnce({ rows: [mockStats] });

      await controller.getMessageStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining("INTERVAL '1 week'"),
        expect.arrayContaining(['user-123'])
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            time_range: 'week',
          }),
        })
      );
    });

    it('should filter stats by agent_id', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockRequest.query = { agent_id: 'agent-1' };

      const mockStats = {
        total_messages: '50',
        user_messages: '30',
        agent_messages: '20',
        sent_messages: '48',
        failed_messages: '1',
        pending_messages: '1',
        active_conversations: '5',
      };

      mockDbPool.query.mockResolvedValueOnce({ rows: [mockStats] });

      await controller.getMessageStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND c.agent_id = $2'),
        expect.arrayContaining(['user-123', 'agent-1'])
      );
    });

    it('should filter stats by phone_number_id', async () => {
      mockRequest.params = { user_id: 'user-123' };
      mockRequest.query = { phone_number_id: 'phone-1' };

      const mockStats = {
        total_messages: '25',
        user_messages: '15',
        agent_messages: '10',
        sent_messages: '24',
        failed_messages: '1',
        pending_messages: '0',
        active_conversations: '3',
      };

      mockDbPool.query.mockResolvedValueOnce({ rows: [mockStats] });

      await controller.getMessageStats(
        mockRequest as Request,
        mockResponse as Response,
        mockNext
      );

      expect(mockDbPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND a.phone_number_id = $2'),
        expect.arrayContaining(['user-123', 'phone-1'])
      );
    });
  });
});
