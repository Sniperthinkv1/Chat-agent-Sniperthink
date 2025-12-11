import {
  createOpenAIConversation,
  getOrCreateOpenAIConversation,
  callOpenAI,
  testOpenAIConnection,
  getOpenAIHealthStatus,
  validateOpenAIConfig,
  OpenAIServiceError
} from '../../../src/services/openaiService';
import { openaiConfig } from '../../../src/config';

// Mock fetch globally
global.fetch = jest.fn();

// Mock config
jest.mock('../../../src/config', () => ({
  openaiConfig: {
    apiKey: 'sk-test-key-123',
    baseUrl: 'https://api.openai.com/v1',
    timeout: 30000,
    maxRetries: 3
  }
}));

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn()
  }
}));

describe('OpenAI Service - Responses API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockClear();
  });

  describe('createOpenAIConversation', () => {
    it('should create a new OpenAI conversation successfully', async () => {
      const mockResponse = {
        id: 'conv_abc123',
        object: 'conversation',
        created_at: 1752855924,
        metadata: { test: 'true' }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await createOpenAIConversation({ test: 'true' });

      expect(result).toEqual({
        id: 'conv_abc123',
        created_at: 1752855924
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/conversations',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test-key-123',
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify({
            items: [],
            metadata: { test: 'true' }
          })
        })
      );
    });

    it('should handle API errors when creating conversation', async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      });

      await expect(createOpenAIConversation()).rejects.toThrow(OpenAIServiceError);
      
      // Reset and test again
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized'
      });
      
      await expect(createOpenAIConversation()).rejects.toThrow('Failed to create OpenAI conversation');
    });

    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(createOpenAIConversation()).rejects.toThrow('Network error');
    });
  });

  describe('getOrCreateOpenAIConversation', () => {
    it('should return existing OpenAI conversation ID if provided', async () => {
      const existingId = 'conv_existing123';
      const result = await getOrCreateOpenAIConversation('db_conv_123', existingId);

      expect(result).toBe(existingId);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should create new OpenAI conversation if not provided', async () => {
      const mockResponse = {
        id: 'conv_new123',
        object: 'conversation',
        created_at: 1752855924
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getOrCreateOpenAIConversation('db_conv_123');

      expect(result).toBe('conv_new123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/conversations',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('db_conv_123')
        })
      );
    });
  });

  describe('callOpenAI', () => {
    it('should call OpenAI Responses API successfully', async () => {
      const mockResponse = {
        id: 'resp_123',
        object: 'response',
        created_at: 1752855924,
        model: 'gpt-4',
        output: [
          {
            id: 'out_123',
            type: 'message',
            role: 'assistant',
            content: [
              {
                type: 'output_text',
                text: 'Hello! How can I help you today?'
              }
            ],
            status: 'completed'
          }
        ],
        conversation: {
          id: 'conv_abc123'
        },
        usage: {
          input_tokens: 10,
          output_tokens: 15,
          total_tokens: 25
        },
        status: 'completed'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await callOpenAI(
        'Hello',
        'conv_abc123',
        'prompt_xyz789',
        'user_123'
      );

      expect(result).toEqual({
        success: true,
        response: 'Hello! How can I help you today?',
        tokensUsed: 25,
        conversationId: 'conv_abc123'
      });

      expect(global.fetch).toHaveBeenCalledWith(
        'https://api.openai.com/v1/responses',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test-key-123',
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('"conversation":"conv_abc123"')
        })
      );
    });

    it('should validate required inputs', async () => {
      const result = await callOpenAI('', 'conv_123', 'prompt_123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_INPUT');
      expect(result.error).toContain('Message text is required');
    });

    it('should handle missing conversation ID', async () => {
      const result = await callOpenAI('Hello', '', 'prompt_123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_INPUT');
      expect(result.error).toContain('OpenAI conversation ID is required');
    });

    it('should handle missing prompt ID', async () => {
      const result = await callOpenAI('Hello', 'conv_123', '');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_INPUT');
      expect(result.error).toContain('Prompt ID is required');
    });

    it('should handle API errors with proper error codes', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key'
      });

      const result = await callOpenAI('Hello', 'conv_123', 'prompt_123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_API_KEY');
    });

    it('should handle rate limit errors', async () => {
      // Mock all retry attempts to fail with 429
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => 'Rate limit exceeded'
      });

      const result = await callOpenAI('Hello', 'conv_123', 'prompt_123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('RATE_LIMIT');
    });

    it('should handle not found errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => 'Conversation not found'
      });

      const result = await callOpenAI('Hello', 'conv_123', 'prompt_123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('should handle server errors', async () => {
      // Mock all retry attempts to fail with 500
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Internal server error'
      });

      const result = await callOpenAI('Hello', 'conv_123', 'prompt_123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('SERVER_ERROR');
    });

    it('should handle empty response output', async () => {
      const mockResponse = {
        id: 'resp_123',
        object: 'response',
        created_at: 1752855924,
        model: 'gpt-4',
        output: [],
        usage: { input_tokens: 10, output_tokens: 0, total_tokens: 10 },
        status: 'completed'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await callOpenAI('Hello', 'conv_123', 'prompt_123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('NO_OUTPUT');
    });

    it('should handle failed response status', async () => {
      const mockResponse = {
        id: 'resp_123',
        object: 'response',
        created_at: 1752855924,
        model: 'gpt-4',
        output: [],
        usage: { input_tokens: 10, output_tokens: 0, total_tokens: 10 },
        status: 'failed',
        error: {
          message: 'Processing failed',
          type: 'processing_error',
          code: 'processing_failed'
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await callOpenAI('Hello', 'conv_123', 'prompt_123');

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('processing_failed');
      expect(result.error).toContain('Processing failed');
    });

    it('should retry on retryable errors', async () => {
      // First call fails with 500, second succeeds
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => 'Server error'
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            id: 'resp_123',
            object: 'response',
            created_at: 1752855924,
            model: 'gpt-4',
            output: [
              {
                id: 'out_123',
                type: 'message',
                role: 'assistant',
                content: [{ type: 'output_text', text: 'Success after retry' }],
                status: 'completed'
              }
            ],
            usage: { input_tokens: 10, output_tokens: 15, total_tokens: 25 },
            status: 'completed'
          })
        });

      const result = await callOpenAI('Hello', 'conv_123', 'prompt_123');

      expect(result.success).toBe(true);
      expect(result.response).toBe('Success after retry');
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should not retry on non-retryable errors', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: async () => 'Invalid API key'
      });

      const result = await callOpenAI('Hello', 'conv_123', 'prompt_123');

      expect(result.success).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retry
    });

    it('should include user ID in request when provided', async () => {
      const mockResponse = {
        id: 'resp_123',
        object: 'response',
        created_at: 1752855924,
        model: 'gpt-4',
        output: [
          {
            id: 'out_123',
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: 'Response' }],
            status: 'completed'
          }
        ],
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
        status: 'completed'
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      await callOpenAI('Hello', 'conv_123', 'prompt_123', 'user_456');

      const callArgs = (global.fetch as jest.Mock).mock.calls[0];
      const requestBody = JSON.parse(callArgs[1].body);

      expect(requestBody.user).toBe('user_456');
    });
  });

  describe('testOpenAIConnection', () => {
    it('should test connection successfully', async () => {
      const mockResponse = {
        id: 'conv_test123',
        object: 'conversation',
        created_at: 1752855924
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await testOpenAIConnection();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should handle connection test failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));

      const result = await testOpenAIConnection();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Connection failed');
    });
  });

  describe('getOpenAIHealthStatus', () => {
    it('should return healthy status on successful connection', async () => {
      const mockResponse = {
        id: 'conv_test123',
        object: 'conversation',
        created_at: 1752855924
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await getOpenAIHealthStatus();

      expect(result.status).toBe('healthy');
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should return unhealthy status on connection failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection failed'));

      const result = await getOpenAIHealthStatus();

      expect(result.status).toBe('unhealthy');
      expect(result.latency).toBeGreaterThanOrEqual(0);
      expect(result.error).toBe('Connection failed');
    });
  });

  describe('validateOpenAIConfig', () => {
    it('should validate correct configuration', () => {
      const result = validateOpenAIConfig();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing API key', () => {
      const originalKey = openaiConfig.apiKey;
      (openaiConfig as any).apiKey = '';

      const result = validateOpenAIConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OpenAI API key is required');

      (openaiConfig as any).apiKey = originalKey;
    });

    it('should detect invalid API key format', () => {
      const originalKey = openaiConfig.apiKey;
      (openaiConfig as any).apiKey = 'invalid-key';

      const result = validateOpenAIConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OpenAI API key must start with "sk-"');

      (openaiConfig as any).apiKey = originalKey;
    });

    it('should detect missing base URL', () => {
      const originalUrl = openaiConfig.baseUrl;
      (openaiConfig as any).baseUrl = '';

      const result = validateOpenAIConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OpenAI base URL is required');

      (openaiConfig as any).baseUrl = originalUrl;
    });

    it('should detect invalid timeout', () => {
      const originalTimeout = openaiConfig.timeout;
      (openaiConfig as any).timeout = 1000;

      const result = validateOpenAIConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OpenAI timeout must be at least 5000ms');

      (openaiConfig as any).timeout = originalTimeout;
    });

    it('should detect invalid max retries', () => {
      const originalRetries = openaiConfig.maxRetries;
      (openaiConfig as any).maxRetries = 10;

      const result = validateOpenAIConfig();

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('OpenAI max retries must be between 1 and 5');

      (openaiConfig as any).maxRetries = originalRetries;
    });
  });

  describe('Conversation reuse', () => {
    it('should reuse conversation ID across multiple messages', async () => {
      const mockResponse = {
        id: 'resp_123',
        object: 'response',
        created_at: 1752855924,
        model: 'gpt-4',
        output: [
          {
            id: 'out_123',
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: 'Response' }],
            status: 'completed'
          }
        ],
        conversation: {
          id: 'conv_abc123'
        },
        usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
        status: 'completed'
      };

      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });

      // First message
      const result1 = await callOpenAI('Hello', 'conv_abc123', 'prompt_123');
      expect(result1.conversationId).toBe('conv_abc123');

      // Second message - should use same conversation
      const result2 = await callOpenAI('How are you?', 'conv_abc123', 'prompt_123');
      expect(result2.conversationId).toBe('conv_abc123');

      // Verify both calls used the same conversation ID
      const call1Body = JSON.parse((global.fetch as jest.Mock).mock.calls[0][1].body);
      const call2Body = JSON.parse((global.fetch as jest.Mock).mock.calls[1][1].body);

      expect(call1Body.conversation).toBe('conv_abc123');
      expect(call2Body.conversation).toBe('conv_abc123');
    });
  });
});
