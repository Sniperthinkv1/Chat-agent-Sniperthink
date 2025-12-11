import extractionService from '../../../src/services/extractionService';
import { ExtractionModel } from '../../../src/models/Extraction';
import { ConversationModel } from '../../../src/models/Conversation';
import { MessageModel } from '../../../src/models/Message';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { describe } from 'node:test';
import { it } from 'node:test';
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
import { describe } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

jest.mock('../../../src/models/Extraction');
jest.mock('../../../src/models/Conversation');
jest.mock('../../../src/models/Message');
jest.mock('../../../src/utils/database', () => ({
  db: {
    pool: {},
    query: jest.fn()
  }
}));
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
  }
}));

describe('ExtractionService', () => {
  let mockExtractionModel: jest.Mocked<ExtractionModel>;
  let mockConversationModel: jest.Mocked<ConversationModel>;
  let mockMessageModel: jest.Mocked<MessageModel>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Get mocked instances
    mockExtractionModel = (extractionService as any).extractionModel;
    mockConversationModel = (extractionService as any).conversationModel;
    mockMessageModel = (extractionService as any).messageModel;
  });

  describe('validateExtractionData', () => {
    it('should validate complete extraction data', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Acme Corp',
        intent: 'Purchase software',
        urgency: 3,
        budget: 2,
        fit: 3,
        engagement: 2,
        demo_datetime: '2024-02-01T10:00:00Z',
        smart_notification: 'High priority lead'
      };

      const result = extractionService.validateExtractionData(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toMatchObject({
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Acme Corp',
        intent: 'Purchase software',
        urgency: 3,
        budget: 2,
        fit: 3,
        engagement: 2,
        smart_notification: 'High priority lead'
      });
      expect(result.data?.demo_datetime).toBeInstanceOf(Date);
    });

    it('should validate partial extraction data', () => {
      const data = {
        name: 'Jane Smith',
        email: 'jane@example.com'
      };

      const result = extractionService.validateExtractionData(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.data).toEqual({
        name: 'Jane Smith',
        email: 'jane@example.com'
      });
    });

    it('should trim whitespace from string fields', () => {
      const data = {
        name: '  John Doe  ',
        email: '  JOHN@EXAMPLE.COM  ',
        company: '  Acme Corp  '
      };

      const result = extractionService.validateExtractionData(data);

      expect(result.isValid).toBe(true);
      expect(result.data).toEqual({
        name: 'John Doe',
        email: 'john@example.com', // Also lowercased
        company: 'Acme Corp'
      });
    });

    it('should reject invalid email format', () => {
      const data = {
        email: 'invalid-email'
      };

      const result = extractionService.validateExtractionData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('email must be a valid email address');
    });

    it('should reject name exceeding max length', () => {
      const data = {
        name: 'a'.repeat(101)
      };

      const result = extractionService.validateExtractionData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('name must be a string with max length 100');
    });

    it('should reject urgency out of range', () => {
      const data = {
        urgency: 5
      };

      const result = extractionService.validateExtractionData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('urgency must be an integer between 1 and 3');
    });

    it('should reject budget out of range', () => {
      const data = {
        budget: 0
      };

      const result = extractionService.validateExtractionData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('budget must be an integer between 1 and 3');
    });

    it('should reject invalid date format', () => {
      const data = {
        demo_datetime: 'not-a-date'
      };

      const result = extractionService.validateExtractionData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('demo_datetime must be a valid date');
    });

    it('should collect multiple validation errors', () => {
      const data = {
        email: 'invalid',
        urgency: 10,
        budget: -1
      };

      const result = extractionService.validateExtractionData(data);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('email must be a valid email address');
      expect(result.errors).toContain('urgency must be an integer between 1 and 3');
      expect(result.errors).toContain('budget must be an integer between 1 and 3');
    });
  });

  describe('createOrUpdateExtraction', () => {
    it('should create new extraction if none exists', async () => {
      const conversationId = 'conv-123';
      const extractionData = {
        name: 'John Doe',
        email: 'john@example.com',
        urgency: 3
      };

      const mockConversation = {
        conversation_id: conversationId,
        agent_id: 'agent-123',
        is_active: true
      };

      const mockExtraction = {
        extraction_id: 'ext-123',
        conversation_id: conversationId,
        ...extractionData,
        extracted_at: new Date(),
        updated_at: new Date()
      };

      mockConversationModel.findById.mockResolvedValueOnce(mockConversation as any);
      mockExtractionModel.findByConversationId.mockResolvedValueOnce(null);
      mockExtractionModel.create.mockResolvedValueOnce(mockExtraction as any);

      const result = await extractionService.createOrUpdateExtraction(
        conversationId,
        extractionData
      );

      expect(result).toEqual(mockExtraction);
      expect(mockConversationModel.findById).toHaveBeenCalledWith(conversationId);
      expect(mockExtractionModel.findByConversationId).toHaveBeenCalledWith(conversationId);
      expect(mockExtractionModel.create).toHaveBeenCalledWith({
        conversation_id: conversationId,
        name: 'John Doe',
        email: 'john@example.com',
        urgency: 3
      });
    });

    it('should update existing extraction', async () => {
      const conversationId = 'conv-123';
      const extractionData = {
        name: 'John Updated',
        urgency: 2
      };

      const mockConversation = {
        conversation_id: conversationId,
        agent_id: 'agent-123',
        is_active: true
      };

      const existingExtraction = {
        extraction_id: 'ext-123',
        conversation_id: conversationId,
        name: 'John Doe',
        urgency: 3
      };

      const updatedExtraction = {
        ...existingExtraction,
        ...extractionData,
        updated_at: new Date()
      };

      mockConversationModel.findById.mockResolvedValueOnce(mockConversation as any);
      mockExtractionModel.findByConversationId.mockResolvedValueOnce(existingExtraction as any);
      mockExtractionModel.update.mockResolvedValueOnce(updatedExtraction as any);

      const result = await extractionService.createOrUpdateExtraction(
        conversationId,
        extractionData
      );

      expect(result).toEqual(updatedExtraction);
      expect(mockExtractionModel.update).toHaveBeenCalledWith('ext-123', extractionData);
    });

    it('should throw error if conversation not found', async () => {
      mockConversationModel.findById.mockResolvedValueOnce(null);

      await expect(
        extractionService.createOrUpdateExtraction('conv-123', { name: 'Test' })
      ).rejects.toThrow('Conversation not found: conv-123');
    });

    it('should throw error if extraction data is invalid', async () => {
      const mockConversation = {
        conversation_id: 'conv-123',
        agent_id: 'agent-123',
        is_active: true
      };

      mockConversationModel.findById.mockResolvedValueOnce(mockConversation as any);

      await expect(
        extractionService.createOrUpdateExtraction('conv-123', { urgency: 10 } as any)
      ).rejects.toThrow('Invalid extraction data');
    });

    it('should throw error if update fails', async () => {
      const mockConversation = {
        conversation_id: 'conv-123',
        agent_id: 'agent-123',
        is_active: true
      };

      const existingExtraction = {
        extraction_id: 'ext-123',
        conversation_id: 'conv-123'
      };

      mockConversationModel.findById.mockResolvedValueOnce(mockConversation as any);
      mockExtractionModel.findByConversationId.mockResolvedValueOnce(existingExtraction as any);
      mockExtractionModel.update.mockResolvedValueOnce(null);

      await expect(
        extractionService.createOrUpdateExtraction('conv-123', { name: 'Test' })
      ).rejects.toThrow('Failed to update extraction');
    });
  });

  describe('getExtractionByConversationId', () => {
    it('should return extraction for conversation', async () => {
      const mockExtraction = {
        extraction_id: 'ext-123',
        conversation_id: 'conv-123',
        name: 'John Doe'
      };

      mockExtractionModel.findByConversationId.mockResolvedValueOnce(mockExtraction as any);

      const result = await extractionService.getExtractionByConversationId('conv-123');

      expect(result).toEqual(mockExtraction);
      expect(mockExtractionModel.findByConversationId).toHaveBeenCalledWith('conv-123');
    });

    it('should return null if no extraction found', async () => {
      mockExtractionModel.findByConversationId.mockResolvedValueOnce(null);

      const result = await extractionService.getExtractionByConversationId('conv-123');

      expect(result).toBeNull();
    });
  });

  describe('getExtractionHistory', () => {
    it('should return all extractions for conversation', async () => {
      const mockExtractions = [
        { extraction_id: 'ext-1', conversation_id: 'conv-123' },
        { extraction_id: 'ext-2', conversation_id: 'conv-123' }
      ];

      mockExtractionModel.findAllByConversationId.mockResolvedValueOnce(mockExtractions as any);

      const result = await extractionService.getExtractionHistory('conv-123');

      expect(result).toEqual(mockExtractions);
      expect(result).toHaveLength(2);
    });
  });

  describe('getExtractionsByUserId', () => {
    it('should return extractions for user with default pagination', async () => {
      const mockExtractions = [
        { extraction_id: 'ext-1' },
        { extraction_id: 'ext-2' }
      ];

      mockExtractionModel.findByUserId.mockResolvedValueOnce(mockExtractions as any);

      const result = await extractionService.getExtractionsByUserId('user-123');

      expect(result).toEqual(mockExtractions);
      expect(mockExtractionModel.findByUserId).toHaveBeenCalledWith('user-123', 50, 0);
    });

    it('should return extractions with custom pagination', async () => {
      mockExtractionModel.findByUserId.mockResolvedValueOnce([] as any);

      await extractionService.getExtractionsByUserId('user-123', 10, 20);

      expect(mockExtractionModel.findByUserId).toHaveBeenCalledWith('user-123', 10, 20);
    });
  });

  describe('shouldExtract', () => {
    it('should return false if conversation not found', async () => {
      mockConversationModel.findById.mockResolvedValueOnce(null);

      const result = await extractionService.shouldExtract('conv-123');

      expect(result).toBe(false);
    });

    it('should return false if conversation is not active', async () => {
      const mockConversation = {
        conversation_id: 'conv-123',
        is_active: false
      };

      mockConversationModel.findById.mockResolvedValueOnce(mockConversation as any);

      const result = await extractionService.shouldExtract('conv-123');

      expect(result).toBe(false);
    });

    it('should return true if no extraction exists and has enough messages', async () => {
      const mockConversation = {
        conversation_id: 'conv-123',
        is_active: true
      };

      const mockMessages = [
        { message_id: 'msg-1', text: 'Hello' },
        { message_id: 'msg-2', text: 'Hi there' }
      ];

      mockConversationModel.findById.mockResolvedValueOnce(mockConversation as any);
      mockExtractionModel.existsForConversation.mockResolvedValueOnce(false);
      mockMessageModel.findByConversationId.mockResolvedValueOnce(mockMessages as any);

      const result = await extractionService.shouldExtract('conv-123');

      expect(result).toBe(true);
    });

    it('should return false if conversation has less than 2 messages', async () => {
      const mockConversation = {
        conversation_id: 'conv-123',
        is_active: true
      };

      const mockMessages = [
        { message_id: 'msg-1', text: 'Hello' }
      ];

      mockConversationModel.findById.mockResolvedValueOnce(mockConversation as any);
      mockExtractionModel.existsForConversation.mockResolvedValueOnce(false);
      mockMessageModel.findByConversationId.mockResolvedValueOnce(mockMessages as any);

      const result = await extractionService.shouldExtract('conv-123');

      expect(result).toBe(false);
    });

    it('should return true if extraction exists but has new messages', async () => {
      const mockConversation = {
        conversation_id: 'conv-123',
        is_active: true
      };

      const extractionDate = new Date('2024-01-01T10:00:00Z');
      const mockExtraction = {
        extraction_id: 'ext-123',
        updated_at: extractionDate
      };

      const mockMessages = [
        { message_id: 'msg-1', timestamp: new Date('2024-01-01T09:00:00Z'), text: 'Old' },
        { message_id: 'msg-2', timestamp: new Date('2024-01-01T11:00:00Z'), text: 'New' }
      ];

      mockConversationModel.findById.mockResolvedValueOnce(mockConversation as any);
      mockExtractionModel.existsForConversation.mockResolvedValueOnce(true);
      mockExtractionModel.findByConversationId.mockResolvedValueOnce(mockExtraction as any);
      mockMessageModel.findByConversationId.mockResolvedValueOnce(mockMessages as any);

      const result = await extractionService.shouldExtract('conv-123');

      expect(result).toBe(true);
    });

    it('should return false if extraction exists and no new messages', async () => {
      const mockConversation = {
        conversation_id: 'conv-123',
        is_active: true
      };

      const extractionDate = new Date('2024-01-01T12:00:00Z');
      const mockExtraction = {
        extraction_id: 'ext-123',
        updated_at: extractionDate
      };

      const mockMessages = [
        { message_id: 'msg-1', timestamp: new Date('2024-01-01T09:00:00Z'), text: 'Old' },
        { message_id: 'msg-2', timestamp: new Date('2024-01-01T10:00:00Z'), text: 'Old' }
      ];

      mockConversationModel.findById.mockResolvedValueOnce(mockConversation as any);
      mockExtractionModel.existsForConversation.mockResolvedValueOnce(true);
      mockExtractionModel.findByConversationId.mockResolvedValueOnce(mockExtraction as any);
      mockMessageModel.findByConversationId.mockResolvedValueOnce(mockMessages as any);

      const result = await extractionService.shouldExtract('conv-123');

      expect(result).toBe(false);
    });
  });

  describe('getConversationContext', () => {
    it('should format messages as conversation transcript', async () => {
      const mockMessages = [
        { message_id: 'msg-1', sender: 'user', text: 'Hello, I need help' },
        { message_id: 'msg-2', sender: 'agent', text: 'How can I assist you?' },
        { message_id: 'msg-3', sender: 'user', text: 'I want to buy your product' }
      ];

      mockMessageModel.findByConversationId.mockResolvedValueOnce(mockMessages as any);

      const result = await extractionService.getConversationContext('conv-123', 50);

      expect(result).toBe(
        'Customer: Hello, I need help\n' +
        'Agent: How can I assist you?\n' +
        'Customer: I want to buy your product'
      );
      expect(mockMessageModel.findByConversationId).toHaveBeenCalledWith('conv-123', { limit: 50 });
    });

    it('should return empty string if no messages', async () => {
      mockMessageModel.findByConversationId.mockResolvedValueOnce([]);

      const result = await extractionService.getConversationContext('conv-123');

      expect(result).toBe('');
    });
  });

  describe('deleteExtraction', () => {
    it('should delete extraction', async () => {
      mockExtractionModel.delete.mockResolvedValueOnce(true);

      const result = await extractionService.deleteExtraction('ext-123');

      expect(result).toBe(true);
      expect(mockExtractionModel.delete).toHaveBeenCalledWith('ext-123');
    });

    it('should return false if extraction not found', async () => {
      mockExtractionModel.delete.mockResolvedValueOnce(false);

      const result = await extractionService.deleteExtraction('nonexistent');

      expect(result).toBe(false);
    });
  });
});
