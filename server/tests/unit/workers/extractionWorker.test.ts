import extractionWorker from '../../../src/workers/extractionWorker';
import extractionService from '../../../src/services/extractionService';
import * as openaiService from '../../../src/services/openaiService';
import { db } from '../../../src/utils/database';
import { it } from 'node:test';
import { afterEach } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

jest.mock('../../../src/services/extractionService');
jest.mock('../../../src/services/openaiService');
jest.mock('../../../src/utils/database', () => ({
  db: {
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
jest.mock('../../../src/models/Conversation');

describe('ExtractionWorker', () => {
  const mockExtractionService = extractionService as jest.Mocked<typeof extractionService>;
  const mockCallOpenAI = openaiService.callOpenAI as jest.MockedFunction<typeof openaiService.callOpenAI>;
  const mockDb = db as jest.Mocked<typeof db>;

  beforeEach(() => {
    jest.clearAllMocks();
    // Stop worker if running
    if ((extractionWorker as any).isRunning) {
      extractionWorker.stop();
    }
  });

  afterEach(() => {
    // Ensure worker is stopped after each test
    if ((extractionWorker as any).isRunning) {
      extractionWorker.stop();
    }
  });

  describe('start and stop', () => {
    it('should start the worker', () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      extractionWorker.start();

      const status = extractionWorker.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should not start if already running', () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      extractionWorker.start();
      extractionWorker.start(); // Try to start again

      const status = extractionWorker.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should stop the worker', () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      extractionWorker.start();
      extractionWorker.stop();

      const status = extractionWorker.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should not stop if not running', () => {
      extractionWorker.stop();

      const status = extractionWorker.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('extractLeadData', () => {
    it('should extract lead data successfully', async () => {
      const conversationId = 'conv-123';
      const mockContext = 'Customer: Hello\nAgent: Hi there';
      const mockExtractionData = {
        name: 'John Doe',
        email: 'john@example.com',
        company: 'Acme Corp',
        urgency: 3
      };

      mockExtractionService.getConversationContext.mockResolvedValueOnce(mockContext);
      mockCallOpenAI.mockResolvedValueOnce({
        success: true, response: JSON.stringify(mockExtractionData),
        tokensUsed: 100,
        conversationId: undefined
      });
      mockExtractionService.validateExtractionData.mockReturnValueOnce({
        isValid: true,
        errors: [],
        data: mockExtractionData
      });
      mockExtractionService.createOrUpdateExtraction.mockResolvedValueOnce({
        extraction_id: 'ext-123',
        conversation_id: conversationId,
        ...mockExtractionData,
        extracted_at: new Date(),
        updated_at: new Date()
      });

      await extractionWorker.extractLeadData(conversationId);

      expect(mockExtractionService.getConversationContext).toHaveBeenCalledWith(conversationId);
      expect(mockCallOpenAI).toHaveBeenCalled();
      expect(mockExtractionService.validateExtractionData).toHaveBeenCalledWith(mockExtractionData);
      expect(mockExtractionService.createOrUpdateExtraction).toHaveBeenCalledWith(
        conversationId,
        mockExtractionData
      );
    });

    it('should skip extraction if no conversation context', async () => {
      const conversationId = 'conv-123';

      mockExtractionService.getConversationContext.mockResolvedValueOnce('');

      await extractionWorker.extractLeadData(conversationId);

      expect(mockExtractionService.getConversationContext).toHaveBeenCalledWith(conversationId);
      expect(mockCallOpenAI).not.toHaveBeenCalled();
      expect(mockExtractionService.createOrUpdateExtraction).not.toHaveBeenCalled();
    });

    it('should retry on invalid extraction data', async () => {
      const conversationId = 'conv-123';
      const mockContext = 'Customer: Hello';

      mockExtractionService.getConversationContext.mockResolvedValue(mockContext);
      mockCallOpenAI.mockResolvedValue({
        success: true, response: JSON.stringify({ invalid: 'data' }),
        tokensUsed: 100,
        conversationId: undefined
      });
      mockExtractionService.validateExtractionData.mockReturnValue({
        isValid: false,
        errors: ['Invalid data']
      });

      await extractionWorker.extractLeadData(conversationId);

      // Should retry up to max retries
      expect(mockExtractionService.getConversationContext).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should retry on OpenAI error', async () => {
      const conversationId = 'conv-123';
      const mockContext = 'Customer: Hello';

      mockExtractionService.getConversationContext.mockResolvedValue(mockContext);
      mockCallOpenAI.mockRejectedValue(new Error('OpenAI error'));

      await extractionWorker.extractLeadData(conversationId);

      // Should retry up to max retries
      expect(mockExtractionService.getConversationContext).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should parse JSON from markdown code block', async () => {
      const conversationId = 'conv-123';
      const mockContext = 'Customer: Hello';
      const mockExtractionData = {
        name: 'Jane Smith',
        email: 'jane@example.com'
      };

      mockExtractionService.getConversationContext.mockResolvedValueOnce(mockContext);
      mockCallOpenAI.mockResolvedValueOnce({
        success: true, response: '```json\n' + JSON.stringify(mockExtractionData) + '\n```',
        tokensUsed: 100,
        conversationId: undefined
      });
      mockExtractionService.validateExtractionData.mockReturnValueOnce({
        isValid: true,
        errors: [],
        data: mockExtractionData
      });
      mockExtractionService.createOrUpdateExtraction.mockResolvedValueOnce({
        extraction_id: 'ext-123',
        conversation_id: conversationId,
        ...mockExtractionData,
        extracted_at: new Date(),
        updated_at: new Date()
      });

      await extractionWorker.extractLeadData(conversationId);

      expect(mockExtractionService.validateExtractionData).toHaveBeenCalledWith(mockExtractionData);
      expect(mockExtractionService.createOrUpdateExtraction).toHaveBeenCalled();
    });

    it('should parse JSON from text with extra content', async () => {
      const conversationId = 'conv-123';
      const mockContext = 'Customer: Hello';
      const mockExtractionData = {
        name: 'Bob Johnson',
        email: 'bob@example.com'
      };

      mockExtractionService.getConversationContext.mockResolvedValueOnce(mockContext);
      mockCallOpenAI.mockResolvedValueOnce({
        success: true, response: 'Here is the extraction: ' + JSON.stringify(mockExtractionData) + ' - end',
        tokensUsed: 100,
        conversationId: undefined
      });
      mockExtractionService.validateExtractionData.mockReturnValueOnce({
        isValid: true,
        errors: [],
        data: mockExtractionData
      });
      mockExtractionService.createOrUpdateExtraction.mockResolvedValueOnce({
        extraction_id: 'ext-123',
        conversation_id: conversationId,
        ...mockExtractionData,
        extracted_at: new Date(),
        updated_at: new Date()
      });

      await extractionWorker.extractLeadData(conversationId);

      expect(mockExtractionService.validateExtractionData).toHaveBeenCalledWith(mockExtractionData);
      expect(mockExtractionService.createOrUpdateExtraction).toHaveBeenCalled();
    });
  });

  describe('getStatus', () => {
    it('should return worker status', () => {
      const status = extractionWorker.getStatus();

      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('config');
      expect(status.config).toHaveProperty('intervalMs');
      expect(status.config).toHaveProperty('maxRetries');
      expect(status.config).toHaveProperty('activityThresholdMs');
    });

    it('should reflect running state', () => {
      mockDb.query.mockResolvedValue({ rows: [], rowCount: 0 } as any);

      let status = extractionWorker.getStatus();
      expect(status.isRunning).toBe(false);

      extractionWorker.start();
      status = extractionWorker.getStatus();
      expect(status.isRunning).toBe(true);

      extractionWorker.stop();
      status = extractionWorker.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('findConversationsNeedingExtraction', () => {
    it('should find conversations with recent activity', async () => {
      const mockConversations = [
        { conversation_id: 'conv-1' },
        { conversation_id: 'conv-2' }
      ];

      mockDb.query.mockResolvedValueOnce({
        rows: mockConversations,
        rowCount: 2
      } as any);

      mockExtractionService.shouldExtract
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      // Access private method for testing
      const result = await (extractionWorker as any).findConversationsNeedingExtraction();

      expect(result).toHaveLength(1);
      expect(result[0].conversation_id).toBe('conv-1');
      expect(mockExtractionService.shouldExtract).toHaveBeenCalledTimes(2);
    });

    it('should return empty array if no conversations found', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      } as any);

      const result = await (extractionWorker as any).findConversationsNeedingExtraction();

      expect(result).toEqual([]);
      expect(mockExtractionService.shouldExtract).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await (extractionWorker as any).findConversationsNeedingExtraction();

      expect(result).toEqual([]);
    });
  });
});
