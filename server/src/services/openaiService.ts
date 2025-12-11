import { openaiConfig } from '../config';
import { logger } from '../utils/logger';
import { OpenAICallResult } from '../models/types';

/**
 * OpenAI Responses API interfaces
 */
interface OpenAIResponsesRequest {
  prompt: {
    id: string;
  };
  input: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  conversation?: string;
  user?: string;
  metadata?: Record<string, string>;
}

interface OpenAIResponsesResponse {
  id: string;
  object: 'response';
  created_at: number;
  model: string;
  output: Array<{
    id: string;
    type: 'message';
    role: 'assistant';
    content: Array<{
      type: 'output_text';
      text: string;
    }>;
    status: 'completed' | 'incomplete' | 'failed';
  }>;
  conversation?: {
    id: string;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
  status: 'completed' | 'incomplete' | 'failed';
  error?: {
    message: string;
    type: string;
    code: string;
  };
}

interface OpenAIConversationResponse {
  id: string;
  object: 'conversation';
  created_at: number;
  metadata?: Record<string, string>;
}

/**
 * OpenAI service error types
 */
export class OpenAIServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'OpenAIServiceError';
  }
}

/**
 * Create a new OpenAI conversation
 */
export async function createOpenAIConversation(
  metadata?: Record<string, string>
): Promise<{ id: string; created_at: number }> {
  const correlationId = `create-openai-conv-${Date.now()}`;

  try {
    logger.info('Creating OpenAI conversation', {
      correlationId,
      metadata
    });

    const response = await fetch(`${openaiConfig.baseUrl}/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiConfig.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'multi-channel-ai-agent/1.0.0'
      },
      body: JSON.stringify({
        items: [], // Start with empty conversation
        metadata: metadata || {}
      }),
      signal: AbortSignal.timeout(openaiConfig.timeout)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new OpenAIServiceError(
        `Failed to create OpenAI conversation: ${response.status} - ${errorText}`,
        'CONVERSATION_CREATE_ERROR',
        response.status
      );
    }

    const data = await response.json() as OpenAIConversationResponse;

    logger.info('OpenAI conversation created successfully', {
      correlationId,
      openai_conversation_id: data.id,
      created_at: data.created_at
    });

    return {
      id: data.id,
      created_at: data.created_at
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = error instanceof OpenAIServiceError ? error.code : 'UNKNOWN_ERROR';

    logger.error('Failed to create OpenAI conversation', {
      correlationId,
      error: errorMessage,
      errorCode
    });

    throw error;
  }
}

/**
 * Get or create OpenAI conversation for a database conversation
 * This ensures we have an OpenAI conversation ID before making API calls
 */
export async function getOrCreateOpenAIConversation(
  conversationId: string,
  existingOpenAIConversationId?: string
): Promise<string> {
  const correlationId = `get-or-create-openai-conv-${conversationId}`;

  try {
    // If we already have an OpenAI conversation ID, return it
    if (existingOpenAIConversationId) {
      // Using existing conversation
      return existingOpenAIConversationId;
    }

    // Create new OpenAI conversation
    logger.info('Creating new OpenAI conversation for database conversation', {
      correlationId,
      conversation_id: conversationId
    });

    const openaiConversation = await createOpenAIConversation({
      conversation_id: conversationId,
      source: 'multi-channel-ai-agent'
    });

    return openaiConversation.id;

  } catch (error) {
    logger.error('Failed to get or create OpenAI conversation', {
      correlationId,
      conversation_id: conversationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

/**
 * Call OpenAI Responses API with conversation context
 */
export async function callOpenAI(
  messageText: string,
  openaiConversationId: string,
  promptId: string,
  userId?: string
): Promise<OpenAICallResult> {
  return callOpenAIWithMessages(
    [{ role: 'user', content: messageText }],
    openaiConversationId,
    promptId,
    userId
  );
}

/**
 * Call OpenAI Responses API with multiple messages (for extraction with full context)
 */
export async function callOpenAIWithMessages(
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>,
  openaiConversationId: string,
  promptId: string,
  userId?: string
): Promise<OpenAICallResult> {
  const correlationId = `openai-${openaiConversationId}-${Date.now()}`;

  try {
    logger.info('Calling OpenAI Responses API', {
      correlationId,
      openai_conversation_id: openaiConversationId,
      prompt_id: promptId,
      message_count: messages.length,
      user_id: userId
    });

    // Validate inputs
    if (!messages || messages.length === 0) {
      throw new OpenAIServiceError('At least one message is required', 'INVALID_INPUT');
    }

    if (!openaiConversationId?.trim()) {
      throw new OpenAIServiceError('OpenAI conversation ID is required', 'INVALID_INPUT');
    }

    if (!promptId?.trim()) {
      throw new OpenAIServiceError('Prompt ID is required', 'INVALID_INPUT');
    }

    // Build request
    const request: OpenAIResponsesRequest = {
      prompt: { id: promptId },
      input: messages,
      conversation: openaiConversationId
    };

    // Add user ID for abuse monitoring if provided
    if (userId) {
      request.user = userId;
    }

    // Make API call with retry logic
    const response = await callOpenAIWithRetry(request, correlationId);

    if (!response) {
      return {
        success: false,
        error: 'No response from OpenAI API',
        errorCode: 'NO_RESPONSE'
      };
    }

    // Process and validate response
    const processedResponse = processOpenAIResponse(response, correlationId);

    if (!processedResponse.success) {
      return processedResponse;
    }

    logger.info('OpenAI Responses API call successful', {
      correlationId,
      openai_conversation_id: openaiConversationId,
      prompt_id: promptId,
      response_length: processedResponse.response?.length || 0,
      tokens_used: processedResponse.tokensUsed,
      conversation_id: processedResponse.conversationId
    });

    return processedResponse;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = error instanceof OpenAIServiceError ? error.code : 'UNKNOWN_ERROR';

    logger.error('OpenAI Responses API call failed', {
      correlationId,
      openai_conversation_id: openaiConversationId,
      prompt_id: promptId,
      error: errorMessage,
      errorCode
    });

    return {
      success: false,
      error: errorMessage,
      errorCode
    };
  }
}

/**
 * Process and validate OpenAI Responses API response
 */
function processOpenAIResponse(
  response: OpenAIResponsesResponse,
  correlationId: string
): OpenAICallResult {
  try {
    // Check response status
    if (response.status === 'failed') {
      logger.warn('OpenAI response status is failed', {
        correlationId,
        error: response.error
      });
      return {
        success: false,
        error: response.error?.message || 'OpenAI response failed',
        errorCode: response.error?.code || 'RESPONSE_FAILED'
      };
    }

    // Validate output structure
    if (!response.output || response.output.length === 0) {
      logger.warn('OpenAI response has no output', { correlationId, response: JSON.stringify(response) });
      return {
        success: false,
        error: 'No output in OpenAI response',
        errorCode: 'NO_OUTPUT'
      };
    }

    // Find the message output (skip reasoning outputs)
    const messageOutput = response.output.find((out: any) => out.type === 'message');

    if (!messageOutput) {
      logger.warn('No message output found in response', {
        correlationId,
        outputTypes: response.output.map((o: any) => o.type),
        fullOutput: JSON.stringify(response.output)
      });
      return {
        success: false,
        error: 'No message output in OpenAI response',
        errorCode: 'NO_MESSAGE_OUTPUT'
      };
    }

    const output = messageOutput;

    // Log the full output structure for debugging
    logger.debug('OpenAI output structure', {
      correlationId,
      outputType: output.type,
      hasContent: !!output.content,
      contentLength: output.content?.length,
      status: (output as any).status
    });

    if (!output || !output.content || output.content.length === 0) {
      logger.warn('OpenAI output has no content', { correlationId, output: JSON.stringify(output) });
      return {
        success: false,
        error: 'No content in OpenAI output',
        errorCode: 'NO_CONTENT'
      };
    }

    const content = output.content[0];
    if (!content || content.type !== 'output_text' || !content.text) {
      logger.warn('OpenAI content is invalid', { correlationId, content });
      return {
        success: false,
        error: 'Invalid content in OpenAI output',
        errorCode: 'INVALID_CONTENT'
      };
    }

    const aiResponse = content.text.trim();
    if (!aiResponse) {
      logger.warn('OpenAI response text is empty', { correlationId });
      return {
        success: false,
        error: 'Empty response from OpenAI',
        errorCode: 'EMPTY_RESPONSE'
      };
    }

    // Check output status
    if (output.status === 'incomplete') {
      logger.warn('OpenAI output is incomplete', {
        correlationId,
        status: output.status
      });
    }

    return {
      success: true,
      response: aiResponse,
      tokensUsed: response.usage?.total_tokens || 0,
      conversationId: response.conversation?.id || undefined
    };

  } catch (error) {
    logger.error('Failed to process OpenAI response', {
      correlationId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return {
      success: false,
      error: 'Failed to process OpenAI response',
      errorCode: 'RESPONSE_PROCESSING_ERROR'
    };
  }
}

/**
 * Call OpenAI Responses API with retry logic and exponential backoff
 */
async function callOpenAIWithRetry(
  request: OpenAIResponsesRequest,
  correlationId: string,
  attempt: number = 1
): Promise<OpenAIResponsesResponse | null> {
  try {
    logger.debug('Making OpenAI Responses API call', {
      correlationId,
      attempt,
      prompt_id: request.prompt.id,
      conversation_id: request.conversation
    });

    const response = await fetch(`${openaiConfig.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiConfig.apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'multi-channel-ai-agent/1.0.0'
      },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(openaiConfig.timeout)
    });

    if (!response.ok) {
      const errorText = await response.text();
      const statusCode = response.status;

      // Handle specific error codes
      if (statusCode === 401) {
        throw new OpenAIServiceError('Invalid OpenAI API key', 'INVALID_API_KEY', statusCode);
      } else if (statusCode === 404) {
        throw new OpenAIServiceError('Prompt or conversation not found', 'NOT_FOUND', statusCode);
      } else if (statusCode === 429) {
        throw new OpenAIServiceError('OpenAI API rate limit exceeded', 'RATE_LIMIT', statusCode);
      } else if (statusCode >= 500) {
        throw new OpenAIServiceError('OpenAI API server error', 'SERVER_ERROR', statusCode);
      } else {
        throw new OpenAIServiceError(
          `OpenAI API error: ${statusCode} - ${errorText}`,
          'API_ERROR',
          statusCode
        );
      }
    }

    const data = await response.json() as OpenAIResponsesResponse;

    logger.debug('OpenAI Responses API call successful', {
      correlationId,
      attempt,
      response_id: data.id,
      tokens_used: data.usage?.total_tokens,
      status: data.status
    });

    // Log full response for debugging extraction issues
    // Response received

    return data;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isRetryableError = isRetryable(error);

    logger.warn('OpenAI Responses API call attempt failed', {
      correlationId,
      attempt,
      error: errorMessage,
      isRetryable
    });

    // Retry logic with exponential backoff
    if (attempt < openaiConfig.maxRetries && isRetryableError) {
      const delay = Math.min(Math.pow(2, attempt) * 1000, 30000); // Cap at 30 seconds

      logger.info('Retrying OpenAI Responses API call', {
        correlationId,
        attempt: attempt + 1,
        delayMs: delay
      });

      await sleep(delay);
      return callOpenAIWithRetry(request, correlationId, attempt + 1);
    }

    logger.error('OpenAI Responses API call failed after all retries', {
      correlationId,
      attempts: attempt,
      error: errorMessage
    });

    // Re-throw the original error for proper error handling
    throw error;
  }
}

/**
 * Determine if an error is retryable
 */
function isRetryable(error: unknown): boolean {
  if (error instanceof OpenAIServiceError) {
    // Don't retry authentication errors, not found, or client errors
    if (error.code === 'INVALID_API_KEY' || error.code === 'NOT_FOUND') {
      return false;
    }
    if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500 && error.statusCode !== 429) {
      return false;
    }
    // Retry server errors and rate limits
    return error.code === 'SERVER_ERROR' || error.code === 'RATE_LIMIT';
  }

  // Retry network errors and timeouts
  if (error instanceof Error) {
    return error.name === 'AbortError' || error.message.includes('fetch');
  }

  return true;
}

/**
 * Test OpenAI Responses API connection and configuration
 */
export async function testOpenAIConnection(): Promise<{ success: boolean; error?: string }> {
  const correlationId = `test-openai-${Date.now()}`;

  try {
    logger.info('Testing OpenAI Responses API connection', { correlationId });

    // Validate configuration first
    if (!openaiConfig.apiKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured'
      };
    }

    if (!openaiConfig.baseUrl) {
      return {
        success: false,
        error: 'OpenAI base URL not configured'
      };
    }

    // Create a test conversation
    const testConversation = await createOpenAIConversation({
      test: 'true',
      purpose: 'connection_test'
    });

    logger.info('OpenAI Responses API connection test successful', {
      correlationId,
      test_conversation_id: testConversation.id
    });

    return { success: true };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    logger.error('OpenAI Responses API connection test failed', {
      correlationId,
      error: errorMessage
    });

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Get OpenAI API health status
 */
export async function getOpenAIHealthStatus(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> {
  const startTime = Date.now();
  const testResult = await testOpenAIConnection();
  const latency = Date.now() - startTime;

  if (testResult.success) {
    return {
      status: 'healthy',
      latency
    };
  }

  return {
    status: 'unhealthy',
    latency,
    ...(testResult.error && { error: testResult.error })
  };
}

/**
 * Validate OpenAI configuration
 */
export function validateOpenAIConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!openaiConfig.apiKey) {
    errors.push('OpenAI API key is required');
  } else if (!openaiConfig.apiKey.startsWith('sk-')) {
    errors.push('OpenAI API key must start with "sk-"');
  }

  if (!openaiConfig.baseUrl) {
    errors.push('OpenAI base URL is required');
  }

  if (openaiConfig.timeout < 5000) {
    errors.push('OpenAI timeout must be at least 5000ms');
  }

  if (openaiConfig.maxRetries < 1 || openaiConfig.maxRetries > 5) {
    errors.push('OpenAI max retries must be between 1 and 5');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
