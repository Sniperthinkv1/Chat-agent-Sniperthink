import { MessageModel } from '../../../src/models/Message';
import { CreateMessageData } from '../../../src/models/types';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('MessageModel', () => {
  let mockDb: any;
  let messageModel: MessageModel;

  beforeEach(() => {
    mockDb = {
      query: jest.fn(),
    };
    messageModel = new MessageModel(mockDb);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a message successfully', async () => {
      const messageData: CreateMessageData = {
        message_id: 'msg-123',
        conversation_id: 'conv-1',
        sender: 'user',
        text: 'Hello, I need help',
        sequence_no: 1
      };

      const mockResult = {
        rows: [{
          message_id: 'msg-123',
          conversation_id: 'conv-1',
          sender: 'user',
          text: 'Hello, I need help',
          timestamp: new Date(),
          status: 'sent',
          sequence_no: 1
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await messageModel.create(messageData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO messages'),
        ['msg-123', 'conv-1', 'user', 'Hello, I need help', 'sent', 1]
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should create a message with custom status', async () => {
      const messageData: CreateMessageData = {
        message_id: 'msg-124',
        conversation_id: 'conv-1',
        sender: 'agent',
        text: 'How can I help you?',
        status: 'pending',
        sequence_no: 2
      };

      const mockResult = {
        rows: [{
          message_id: 'msg-124',
          conversation_id: 'conv-1',
          sender: 'agent',
          text: 'How can I help you?',
          timestamp: new Date(),
          status: 'pending',
          sequence_no: 2
        }]
      };

      mockDb.query.mockResolvedValue(mockResult);

      const result = await messageModel.create(messageData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO messages'),
        ['msg-124', 'conv-1', 'agent', 'How can I help you?', 'pending', 2]
      );
      expect(result).toEqual(mockResult.rows[0]);
    });

    it('should throw error when database query fails', async () => {
      const messageData: CreateMessageData = {
        message_id: 'msg-123',
        conversation_id: 'conv-1',
        sender: 'user',
        text: 'Hello, I need help',
        sequence_no: 1
      };

      const dbError = new Error('Database connection failed');
      mockDb.query.mockRejectedValue(dbError);

      await expect(messageModel.create(messageData)).rejects.toThrow('Failed to create message: Database connection failed');
    });
  });

  describe('findById', () => {
    it('should find message by ID successfully', async () => {
      const mockMessage = {
        message_id: 'msg-123',
        conversation_id: 'conv-1',
        sender: 'user',
        text: 'Hello, I need help',
        timestamp: new Date(),
        status: 'sent',
        sequence_no: 1
      };

      mockDb.query.mockResolvedValue({ rows: [mockMessage] });

      const result = await messageModel.findById('msg-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT * FROM messages WHERE message_id = $1',
        ['msg-123']
      );
      expect(result).toEqual(mockMessage);
    });

    it('should return null when message not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await messageModel.findById('non-existent-msg');

      expect(result).toBeNull();
    });
  });

  describe('findByConversationId', () => {
    it('should find messages by conversation ID with default options', async () => {
      const mockMessages = [
        {
          message_id: 'msg-123',
          conversation_id: 'conv-1',
          sender: 'user',
          text: 'Hello, I need help',
          timestamp: new Date(),
          status: 'sent',
          sequence_no: 1
        },
        {
          message_id: 'msg-124',
          conversation_id: 'conv-1',
          sender: 'agent',
          text: 'How can I help you?',
          timestamp: new Date(),
          status: 'sent',
          sequence_no: 2
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockMessages });

      const result = await messageModel.findByConversationId('conv-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM messages.*WHERE conversation_id = \$1.*ORDER BY sequence_no ASC.*LIMIT \$2 OFFSET \$3/s),
        ['conv-1', 100, 0]
      );
      expect(result).toEqual(mockMessages);
    });

    it('should find messages by conversation ID with custom options', async () => {
      const mockMessages = [
        {
          message_id: 'msg-123',
          conversation_id: 'conv-1',
          sender: 'user',
          text: 'Hello, I need help',
          timestamp: new Date(),
          status: 'sent',
          sequence_no: 1
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockMessages });

      const result = await messageModel.findByConversationId('conv-1', {
        limit: 10,
        offset: 5,
        orderBy: 'timestamp',
        orderDirection: 'DESC'
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM messages.*WHERE conversation_id = \$1.*ORDER BY timestamp DESC.*LIMIT \$2 OFFSET \$3/s),
        ['conv-1', 10, 5]
      );
      expect(result).toEqual(mockMessages);
    });
  });

  describe('findBySender', () => {
    it('should find messages by sender', async () => {
      const mockMessages = [
        {
          message_id: 'msg-123',
          conversation_id: 'conv-1',
          sender: 'user',
          text: 'Hello, I need help',
          timestamp: new Date(),
          status: 'sent',
          sequence_no: 1
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockMessages });

      const result = await messageModel.findBySender('conv-1', 'user');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM messages.*WHERE conversation_id = \$1 AND sender = \$2.*ORDER BY sequence_no ASC.*LIMIT \$3 OFFSET \$4/s),
        ['conv-1', 'user', 100, 0]
      );
      expect(result).toEqual(mockMessages);
    });
  });

  describe('findByStatus', () => {
    it('should find messages by status', async () => {
      const mockMessages = [
        {
          message_id: 'msg-123',
          conversation_id: 'conv-1',
          sender: 'agent',
          text: 'Processing your request...',
          timestamp: new Date(),
          status: 'pending',
          sequence_no: 2
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockMessages });

      const result = await messageModel.findByStatus('pending');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM messages.*WHERE status = \$1.*ORDER BY timestamp DESC.*LIMIT \$2 OFFSET \$3/s),
        ['pending', 100, 0]
      );
      expect(result).toEqual(mockMessages);
    });
  });

  describe('updateStatus', () => {
    it('should update message status successfully', async () => {
      const mockMessage = {
        message_id: 'msg-123',
        conversation_id: 'conv-1',
        sender: 'agent',
        text: 'Your request has been processed',
        timestamp: new Date(),
        status: 'sent',
        sequence_no: 2
      };

      mockDb.query.mockResolvedValue({ rows: [mockMessage] });

      const result = await messageModel.updateStatus('msg-123', 'sent');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/UPDATE messages.*SET status = \$1.*WHERE message_id = \$2/s),
        ['sent', 'msg-123']
      );
      expect(result).toEqual(mockMessage);
    });

    it('should return null when message not found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await messageModel.updateStatus('non-existent-msg', 'sent');

      expect(result).toBeNull();
    });
  });

  describe('getNextSequenceNumber', () => {
    it('should get next sequence number for conversation', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ next_sequence: 5 }] });

      const result = await messageModel.getNextSequenceNumber('conv-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT COALESCE\(MAX\(sequence_no\), 0\) \+ 1 as next_sequence.*FROM messages.*WHERE conversation_id = \$1/s),
        ['conv-1']
      );
      expect(result).toBe(5);
    });

    it('should return 1 for new conversation with no messages', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ next_sequence: 1 }] });

      const result = await messageModel.getNextSequenceNumber('new-conv');

      expect(result).toBe(1);
    });
  });

  describe('getConversationMessageCount', () => {
    it('should get message count for conversation', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ count: '15' }] });

      const result = await messageModel.getConversationMessageCount('conv-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT COUNT(*) as count FROM messages WHERE conversation_id = $1',
        ['conv-1']
      );
      expect(result).toBe(15);
    });
  });

  describe('getLatestMessage', () => {
    it('should get latest message for conversation', async () => {
      const mockMessage = {
        message_id: 'msg-125',
        conversation_id: 'conv-1',
        sender: 'agent',
        text: 'Latest message',
        timestamp: new Date(),
        status: 'sent',
        sequence_no: 10
      };

      mockDb.query.mockResolvedValue({ rows: [mockMessage] });

      const result = await messageModel.getLatestMessage('conv-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM messages.*WHERE conversation_id = \$1.*ORDER BY sequence_no DESC.*LIMIT 1/s),
        ['conv-1']
      );
      expect(result).toEqual(mockMessage);
    });

    it('should return null when no messages found', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await messageModel.getLatestMessage('empty-conv');

      expect(result).toBeNull();
    });
  });

  describe('getMessageHistory', () => {
    it('should get message history without before sequence', async () => {
      const mockMessages = [
        {
          message_id: 'msg-123',
          conversation_id: 'conv-1',
          sender: 'user',
          text: 'Hello',
          timestamp: new Date(),
          status: 'sent',
          sequence_no: 1
        },
        {
          message_id: 'msg-124',
          conversation_id: 'conv-1',
          sender: 'agent',
          text: 'Hi there',
          timestamp: new Date(),
          status: 'sent',
          sequence_no: 2
        }
      ];

      // Mock returns in DESC order, but method reverses to ASC
      mockDb.query.mockResolvedValue({ rows: [...mockMessages].reverse() });

      const result = await messageModel.getMessageHistory('conv-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM messages.*WHERE conversation_id = \$1.*ORDER BY sequence_no DESC LIMIT \$2/s),
        ['conv-1', 50]
      );
      expect(result).toEqual(mockMessages);
    });

    it('should get message history with before sequence', async () => {
      const mockMessages = [
        {
          message_id: 'msg-123',
          conversation_id: 'conv-1',
          sender: 'user',
          text: 'Hello',
          timestamp: new Date(),
          status: 'sent',
          sequence_no: 1
        }
      ];

      mockDb.query.mockResolvedValue({ rows: mockMessages });

      const result = await messageModel.getMessageHistory('conv-1', 5, 10);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT \* FROM messages.*WHERE conversation_id = \$1.*AND sequence_no < \$2.*ORDER BY sequence_no DESC LIMIT \$3/s),
        ['conv-1', 5, 10]
      );
      expect(result).toEqual(mockMessages);
    });
  });

  describe('exists', () => {
    it('should return true when message exists', async () => {
      mockDb.query.mockResolvedValue({ rows: [{ exists: true }] });

      const result = await messageModel.exists('msg-123');

      expect(mockDb.query).toHaveBeenCalledWith(
        'SELECT 1 FROM messages WHERE message_id = $1',
        ['msg-123']
      );
      expect(result).toBe(true);
    });

    it('should return false when message does not exist', async () => {
      mockDb.query.mockResolvedValue({ rows: [] });

      const result = await messageModel.exists('non-existent-msg');

      expect(result).toBe(false);
    });
  });

  describe('getMessageStats', () => {
    it('should get message stats without conversation filter', async () => {
      const mockStats = {
        total: '100',
        user_messages: '60',
        agent_messages: '40',
        sent_messages: '95',
        failed_messages: '3',
        pending_messages: '2'
      };

      mockDb.query.mockResolvedValue({ rows: [mockStats] });

      const result = await messageModel.getMessageStats();

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT.*COUNT\(\*\) as total.*COUNT\(CASE WHEN sender = 'user' THEN 1 END\) as user_messages.*COUNT\(CASE WHEN sender = 'agent' THEN 1 END\) as agent_messages.*FROM messages/s),
        []
      );
      expect(result).toEqual({
        total: 100,
        by_sender: {
          user: 60,
          agent: 40
        },
        by_status: {
          sent: 95,
          failed: 3,
          pending: 2
        }
      });
    });

    it('should get message stats with conversation filter', async () => {
      const mockStats = {
        total: '20',
        user_messages: '12',
        agent_messages: '8',
        sent_messages: '19',
        failed_messages: '1',
        pending_messages: '0'
      };

      mockDb.query.mockResolvedValue({ rows: [mockStats] });

      const result = await messageModel.getMessageStats('conv-1');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/SELECT.*COUNT\(\*\) as total.*COUNT\(CASE WHEN sender = 'user' THEN 1 END\) as user_messages.*COUNT\(CASE WHEN sender = 'agent' THEN 1 END\) as agent_messages.*FROM messages.*WHERE conversation_id = \$1/s),
        ['conv-1']
      );
      expect(result).toEqual({
        total: 20,
        by_sender: {
          user: 12,
          agent: 8
        },
        by_status: {
          sent: 19,
          failed: 1,
          pending: 0
        }
      });
    });
  });

  describe('deleteOldMessages', () => {
    it('should delete old messages keeping latest ones', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 25 });

      const result = await messageModel.deleteOldMessages('conv-1', 50);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringMatching(/DELETE FROM messages.*WHERE conversation_id = \$1.*AND sequence_no NOT IN.*SELECT sequence_no FROM messages.*WHERE conversation_id = \$1.*ORDER BY sequence_no DESC.*LIMIT \$2/s),
        ['conv-1', 50]
      );
      expect(result).toBe(25);
    });

    it('should use default keep latest value', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 10 });

      const result = await messageModel.deleteOldMessages('conv-1');

      expect(result).toBe(10);
    });

    it('should return 0 when no messages deleted', async () => {
      mockDb.query.mockResolvedValue({ rowCount: 0 });

      const result = await messageModel.deleteOldMessages('conv-1', 100);

      expect(result).toBe(0);
    });
  });
});