/**
 * Test fixtures for OpenAI API responses
 */

export const mockOpenAIResponse = {
  id: 'response-123',
  object: 'response',
  created: 1704110400,
  model: 'gpt-4',
  output: [
    {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: 'Hello! I would be happy to help you. Could you please provide more details about what you need assistance with?',
        },
      ],
    },
  ],
  usage: {
    prompt_tokens: 50,
    completion_tokens: 30,
    total_tokens: 80,
  },
  conversation: 'openai-conv-abc-123',
};

export const mockOpenAIConversationResponse = {
  id: 'openai-conv-abc-123',
  object: 'conversation',
  created: 1704110400,
  metadata: {
    conversation_id: 'conv-123',
    agent_id: 'agent-123',
  },
};

export const mockOpenAIExtractionResponse = {
  id: 'response-456',
  object: 'response',
  created: 1704110400,
  model: 'gpt-4',
  output: [
    {
      role: 'assistant',
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            name: 'John Doe',
            email: 'john.doe@example.com',
            company: 'Acme Corporation',
            intent: 'Purchase enterprise plan',
            urgency: 3,
            budget: 3,
            fit: 3,
            engagement: 3,
            demo_datetime: '2024-01-15T14:00:00Z',
            smart_notification: 'High-value lead: Enterprise plan interest, budget confirmed, demo scheduled',
          }),
        },
      ],
    },
  ],
  usage: {
    prompt_tokens: 200,
    completion_tokens: 100,
    total_tokens: 300,
  },
};

export const mockOpenAIError = {
  error: {
    message: 'Rate limit exceeded',
    type: 'rate_limit_error',
    code: 'rate_limit_exceeded',
  },
};

export const mockOpenAITimeout = {
  error: {
    message: 'Request timeout',
    type: 'timeout',
    code: 'timeout',
  },
};
