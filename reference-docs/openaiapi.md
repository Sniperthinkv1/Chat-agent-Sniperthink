# OpenAI Responses API Reference

This document serves as the authoritative reference for OpenAI Responses API integration within the Multi-Channel AI Agent service.

## API Overview

- **Base URL**: `https://api.openai.com/v1`
- **Authentication**: Bearer token (API key)
- **Primary Endpoint**: `/responses`
- **API Type**: Responses API (replaces Chat Completions and Assistants API)
- **Documentation**: https://platform.openai.com/docs/guides/responses-vs-chat-completions

## Why Responses API?

OpenAI's Responses API is the recommended approach for building conversational AI applications. It replaces both the Chat Completions API and the deprecated Assistants API.

### Key Benefits

1. **Simpler Mental Model**: Send input items, get output items back
2. **Better Performance**: Optimized for real-time conversational applications
3. **Prompt Versioning**: Create and version prompts in the dashboard
4. **Flexible Context Management**: Use OpenAI conversations OR manage your own
5. **Future-Proof**: This is OpenAI's recommended path forward
6. **New Features**: Supports deep research, MCP, and computer use

### Comparison with Other APIs

| Feature | Chat Completions | Assistants API | Responses API |
|---------|-----------------|----------------|---------------|
| Complexity | Medium | High | Low |
| Context Management | Manual | Server-side | Flexible |
| Prompt Versioning | No | No | Yes (Dashboard) |
| Performance | Good | Medium | Best |
| Real-time Support | Yes | No | Yes |
| Recommended | Legacy | Deprecated | ✅ Current |

---

## Core Concepts

### 1. Prompts

**Prompts** are versioned behavioral profiles created in the OpenAI dashboard. They encapsulate:
- Model selection (e.g., `gpt-4.1`)
- System instructions
- Tool declarations
- Temperature and other parameters
- Structured output schemas

**Key Points:**
- Created and managed in the OpenAI dashboard (not via API)
- Versioned for easy rollback and A/B testing
- Referenced by `prompt_id` in API calls
- Can be reused across Responses API and Realtime API

**Example Prompt Configuration (Dashboard):**
```json
{
  "name": "Customer Support Agent",
  "model": "gpt-4.1",
  "instructions": "You are a helpful customer support agent...",
  "temperature": 0.7,
  "tools": []
}
```

### 2. Conversations

**Conversations** are optional server-side storage for conversation context. They store **items** (not just messages).

**Items can be:**
- Messages (user input, assistant output)
- Tool calls
- Tool outputs
- Other structured data

**Key Points:**
- Optional - you can manage context yourself
- Stored server-side by OpenAI
- Referenced by `conversation_id`
- Can be created with initial items or empty

### 3. Responses

**Responses** are the core API calls. You send input items and receive output items.

**Key Points:**
- Synchronous by default
- Can reference a prompt for configuration
- Can reference a conversation for context
- Returns structured output with usage metrics

---

## API Endpoints

### Create Response

**Endpoint:** `POST /v1/responses`

**Purpose:** Send input to the AI and receive a response.

#### Request Structure

```typescript
interface CreateResponseRequest {
  // Model configuration (use prompt OR model)
  prompt?: {
    id: string;  // Prompt ID from dashboard
  };
  model?: string;  // Direct model specification (if not using prompt)
  
  // Input items
  input: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string | Array<ContentItem>;
  }>;
  
  // Optional: Reference to conversation for context
  conversation?: string;  // conversation_id
  
  // Optional: Override prompt settings
  temperature?: number;
  max_output_tokens?: number;
  tools?: Array<Tool>;
  
  // Optional: Metadata
  metadata?: Record<string, string>;
  user?: string;  // End-user identifier for abuse monitoring
}

interface ContentItem {
  type: 'input_text' | 'input_image' | 'output_text';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'auto' | 'low' | 'high';
  };
}
```

#### Response Structure

```typescript
interface CreateResponseResponse {
  id: string;  // Response ID
  object: 'response';
  created_at: number;  // Unix timestamp
  model: string;
  
  // Output items
  output: Array<{
    id: string;
    type: 'message';
    role: 'assistant';
    content: Array<{
      type: 'output_text';
      text: string;
      annotations?: Array<any>;
    }>;
    status: 'completed' | 'incomplete' | 'failed';
  }>;
  
  // Conversation reference (if used)
  conversation?: {
    id: string;
  };
  
  // Usage metrics
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    input_tokens_details?: {
      cached_tokens: number;
    };
    output_tokens_details?: {
      reasoning_tokens: number;
    };
  };
  
  // Status and metadata
  status: 'completed' | 'incomplete' | 'failed';
  error?: {
    message: string;
    type: string;
    code: string;
  };
  metadata?: Record<string, string>;
}
```

---

## Integration Patterns

### Pattern 1: Prompt + Conversation (Recommended for Our Use Case)

**Use when:**
- You want OpenAI to manage conversation context
- You want prompt versioning without code changes
- You need consistent behavior across sessions

**Implementation:**
```typescript
// 1. Create conversation (once per customer conversation)
const conversation = await fetch('https://api.openai.com/v1/conversations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    metadata: {
      user_id: userId,
      conversation_id: conversationId,
      platform: 'whatsapp'
    }
  })
});

// 2. Send messages (each user message)
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: { id: promptId },
    input: [{ role: 'user', content: messageText }],
    conversation: conversationId,
    user: userId  // For abuse monitoring
  })
});

// 3. Extract response text
const responseText = response.output[0].content[0].text;
```

**Benefits:**
- OpenAI maintains conversation history
- Automatic context management
- Prompt updates don't require code changes
- Built-in token optimization

### Pattern 2: Prompt Only (Stateless)

**Use when:**
- Each request is independent
- You manage all context yourself
- You need full control over history

**Implementation:**
```typescript
const response = await fetch('https://api.openai.com/v1/responses', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    prompt: { id: promptId },
    input: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Previous message' },
      { role: 'assistant', content: 'Previous response' },
      { role: 'user', content: messageText }
    ]
  })
});
```

### Pattern 3: Hybrid (Our Recommended Approach)

**Use when:**
- You want both OpenAI context AND local storage
- You need audit trails and analytics
- You want redundancy and control

**Implementation:**
```typescript
// Store in both places:
// 1. OpenAI Conversation (for AI context)
// 2. Your Database (for audit, analytics, display)

// Send to OpenAI with conversation
const aiResponse = await callOpenAI(messageText, openaiConversationId, promptId);

// Store in your database
await storeMessage({
  conversation_id: yourConversationId,
  sender: 'user',
  text: messageText,
  sequence_no: nextSequence
});

await storeMessage({
  conversation_id: yourConversationId,
  sender: 'agent',
  text: aiResponse.response,
  sequence_no: nextSequence + 1
});
```

---

## Conversation Management

### Create Conversation

**Endpoint:** `POST /v1/conversations`

```typescript
const conversation = await fetch('https://api.openai.com/v1/conversations', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    items: [],  // Optional: initial items
    metadata: {
      user_id: 'user_123',
      platform: 'whatsapp'
    }
  })
});

// Response
{
  "id": "conv_abc123",
  "object": "conversation",
  "created_at": 1752855924,
  "metadata": { "user_id": "user_123" }
}
```

### Retrieve Conversation

**Endpoint:** `GET /v1/conversations/{conversation_id}`

```typescript
const conversation = await fetch(
  `https://api.openai.com/v1/conversations/${conversationId}`,
  {
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    }
  }
);
```

### List Conversation Items

**Endpoint:** `GET /v1/conversations/{conversation_id}/items`

```typescript
const items = await fetch(
  `https://api.openai.com/v1/conversations/${conversationId}/items`,
  {
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    }
  }
);
```

### Delete Conversation

**Endpoint:** `DELETE /v1/conversations/{conversation_id}`

```typescript
await fetch(
  `https://api.openai.com/v1/conversations/${conversationId}`,
  {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`
    }
  }
);
```

---

## Error Handling

### Common Error Codes

| Code | Type | Description | Action |
|------|------|-------------|--------|
| 400 | invalid_request_error | Invalid request format | Validate request structure |
| 401 | authentication_error | Invalid API key | Check OPENAI_API_KEY |
| 403 | permission_error | Insufficient permissions | Verify API key permissions |
| 404 | not_found_error | Resource not found | Check conversation/prompt ID |
| 429 | rate_limit_error | Too many requests | Implement exponential backoff |
| 500 | api_error | OpenAI server error | Retry with backoff |
| 503 | overloaded_error | Service overloaded | Retry with backoff |

### Error Response Format

```json
{
  "error": {
    "message": "Invalid conversation ID",
    "type": "invalid_request_error",
    "code": "invalid_conversation_id",
    "param": "conversation"
  }
}
```

### Retry Strategy

```typescript
async function callOpenAIWithRetry(request: any, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });
      
      if (response.ok) {
        return await response.json();
      }
      
      const error = await response.json();
      
      // Don't retry on client errors (4xx except 429)
      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        throw new Error(error.error.message);
      }
      
      // Retry on 429 and 5xx
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      throw new Error(error.error.message);
    } catch (error) {
      if (attempt === maxRetries) throw error;
    }
  }
}
```

---

## Best Practices

### 1. Prompt Management

✅ **DO:**
- Create prompts in the OpenAI dashboard
- Version prompts for A/B testing
- Store prompt IDs in environment variables
- Test prompt changes in staging first

❌ **DON'T:**
- Hardcode instructions in code
- Create prompts programmatically
- Use different prompts for same use case

### 2. Conversation Management

✅ **DO:**
- Create one OpenAI conversation per customer conversation
- Store conversation mapping in your database
- Clean up old conversations periodically
- Use metadata for tracking

❌ **DON'T:**
- Reuse conversations across different customers
- Create new conversations for every message
- Store sensitive data in conversation metadata

### 3. Context Management

✅ **DO:**
- Use OpenAI conversations for AI context
- Store messages in your database for audit/analytics
- Implement conversation pruning for long chats
- Monitor token usage

❌ **DON'T:**
- Rely solely on OpenAI for message storage
- Send entire conversation history every time
- Ignore token limits

### 4. Error Handling

✅ **DO:**
- Implement exponential backoff for retries
- Log all errors with correlation IDs
- Handle rate limits gracefully
- Provide fallback responses

❌ **DON'T:**
- Retry indefinitely
- Expose OpenAI errors to end users
- Ignore rate limit headers

### 5. Performance Optimization

✅ **DO:**
- Use conversation context to reduce tokens
- Implement request timeouts
- Monitor response times
- Cache prompt IDs

❌ **DON'T:**
- Send unnecessary context
- Make synchronous calls without timeouts
- Ignore usage metrics

---

## Implementation for Multi-Channel AI Agent

### Architecture Overview

```
Customer Message (WhatsApp/Instagram)
    ↓
Webhook Handler
    ↓
Redis Queue (FIFO per phone_number_id)
    ↓
Message Worker
    ↓
┌─────────────────────────────────────┐
│ 1. Get/Create OpenAI Conversation   │
│ 2. Call OpenAI Responses API        │
│ 3. Store in Database                │
│ 4. Send Response to Customer        │
└─────────────────────────────────────┘
```

### Data Flow

1. **Conversation Initialization**
   - Customer sends first message
   - Create conversation in database
   - Create OpenAI conversation
   - Store mapping: `db_conversation_id` ↔ `openai_conversation_id`

2. **Message Processing**
   - Receive customer message
   - Store in database (sequence_no)
   - Call OpenAI with conversation context
   - Store AI response in database
   - Send response to customer

3. **Context Management**
   - OpenAI maintains conversation history
   - Database stores all messages for audit
   - Periodic cleanup of inactive conversations

### Database Schema Integration

```sql
-- Add OpenAI conversation tracking
ALTER TABLE conversations 
ADD COLUMN openai_conversation_id VARCHAR(100);

CREATE INDEX idx_conversations_openai_id 
ON conversations(openai_conversation_id);
```

### Environment Variables

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-proj-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_PROMPT_ID=prompt_abc123  # Created in dashboard
OPENAI_TIMEOUT=30000
OPENAI_MAX_RETRIES=3
```

---

## Migration from Chat Completions API

### What Changes

| Aspect | Chat Completions | Responses API |
|--------|-----------------|---------------|
| Endpoint | `/chat/completions` | `/responses` |
| Context | Manual history array | Conversation object |
| Configuration | Per-request | Prompt (dashboard) |
| Request | `messages` array | `input` array + `conversation` |
| Response | `choices[0].message.content` | `output[0].content[0].text` |

### Migration Steps

1. **Create Prompt in Dashboard**
   - Go to OpenAI dashboard
   - Create prompt with your system instructions
   - Note the `prompt_id`

2. **Update Environment Variables**
   - Add `OPENAI_PROMPT_ID`
   - Keep `OPENAI_API_KEY`

3. **Update Service Code**
   - Change endpoint from `/chat/completions` to `/responses`
   - Use `prompt` and `conversation` instead of `messages`
   - Update response parsing

4. **Add Conversation Management**
   - Create OpenAI conversation on first message
   - Store mapping in database
   - Reference conversation in subsequent calls

5. **Update Tests**
   - Mock new API structure
   - Test conversation creation
   - Test response parsing

---

## Monitoring and Observability

### Key Metrics to Track

1. **API Performance**
   - Response time (p50, p95, p99)
   - Token usage (input, output, total)
   - Error rate by type
   - Retry rate

2. **Conversation Metrics**
   - Active conversations
   - Average conversation length
   - Conversation creation rate
   - Conversation cleanup rate

3. **Cost Metrics**
   - Tokens per conversation
   - Cost per message
   - Daily/monthly spend
   - Cost by model

### Logging Best Practices

```typescript
logger.info('OpenAI API call', {
  correlationId,
  conversationId,
  openaiConversationId,
  promptId,
  inputTokens: response.usage.input_tokens,
  outputTokens: response.usage.output_tokens,
  totalTokens: response.usage.total_tokens,
  responseTime: Date.now() - startTime,
  model: response.model
});
```

---

## Security Considerations

### API Key Management

✅ **DO:**
- Store API key in environment variables
- Use different keys for dev/staging/prod
- Rotate keys periodically
- Monitor key usage

❌ **DON'T:**
- Commit API keys to git
- Share keys across environments
- Expose keys in logs or errors

### Data Privacy

✅ **DO:**
- Use `user` parameter for abuse monitoring
- Implement data retention policies
- Delete old conversations
- Sanitize sensitive data before sending

❌ **DON'T:**
- Send PII unnecessarily
- Store sensitive data in metadata
- Keep conversations indefinitely

### Rate Limiting

✅ **DO:**
- Implement client-side rate limiting
- Monitor rate limit headers
- Queue requests during high load
- Use exponential backoff

❌ **DON'T:**
- Ignore rate limit errors
- Retry immediately on 429
- Make parallel requests without limits

---

## Testing

### Unit Testing

```typescript
// Mock OpenAI Responses API
jest.mock('node-fetch');

test('should call OpenAI with correct parameters', async () => {
  const mockResponse = {
    id: 'resp_123',
    output: [{
      content: [{ type: 'output_text', text: 'Hello!' }]
    }],
    usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 }
  };
  
  (fetch as jest.Mock).mockResolvedValue({
    ok: true,
    json: async () => mockResponse
  });
  
  const result = await callOpenAI('Hi', 'conv_123', 'prompt_123');
  
  expect(fetch).toHaveBeenCalledWith(
    'https://api.openai.com/v1/responses',
    expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"conversation":"conv_123"')
    })
  );
  
  expect(result.response).toBe('Hello!');
});
```

### Integration Testing

```typescript
// Test with real API (use test environment)
test('should create conversation and get response', async () => {
  // Create conversation
  const conversation = await createOpenAIConversation({
    metadata: { test: 'true' }
  });
  
  expect(conversation.id).toMatch(/^conv_/);
  
  // Send message
  const response = await callOpenAI(
    'Hello',
    conversation.id,
    process.env.OPENAI_PROMPT_ID
  );
  
  expect(response.success).toBe(true);
  expect(response.response).toBeTruthy();
  
  // Cleanup
  await deleteOpenAIConversation(conversation.id);
});
```

---

## Troubleshooting

### Common Issues

**Issue: "Invalid conversation ID"**
- **Cause**: Conversation doesn't exist or was deleted
- **Solution**: Create new conversation or check mapping

**Issue: "Rate limit exceeded"**
- **Cause**: Too many requests
- **Solution**: Implement exponential backoff, queue requests

**Issue: "Invalid prompt ID"**
- **Cause**: Prompt doesn't exist or wrong ID
- **Solution**: Verify prompt ID in dashboard

**Issue: "Context length exceeded"**
- **Cause**: Conversation too long
- **Solution**: Implement conversation pruning or summarization

**Issue: "Timeout"**
- **Cause**: OpenAI API slow or network issues
- **Solution**: Increase timeout, implement retries

---

## Resources

- **Official Documentation**: https://platform.openai.com/docs/guides/responses-vs-chat-completions
- **API Reference**: https://platform.openai.com/docs/api-reference/responses
- **Migration Guide**: https://platform.openai.com/docs/assistants/migration
- **Dashboard**: https://platform.openai.com/prompts
- **Status Page**: https://status.openai.com/

---

## Appendix: Complete Example

```typescript
// Complete implementation example
import fetch from 'node-fetch';

interface OpenAIConfig {
  apiKey: string;
  promptId: string;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
}

class OpenAIService {
  constructor(private config: OpenAIConfig) {}
  
  async createConversation(metadata?: Record<string, string>) {
    const response = await fetch(`${this.config.baseUrl}/conversations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ metadata })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create conversation: ${response.statusText}`);
    }
    
    return await response.json();
  }
  
  async sendMessage(
    messageText: string,
    conversationId: string,
    userId?: string
  ) {
    const response = await fetch(`${this.config.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: { id: this.config.promptId },
        input: [{ role: 'user', content: messageText }],
        conversation: conversationId,
        user: userId
      })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error.message);
    }
    
    const data = await response.json();
    
    return {
      success: true,
      response: data.output[0].content[0].text,
      tokensUsed: data.usage.total_tokens,
      conversationId: data.conversation.id
    };
  }
}

// Usage
const openai = new OpenAIService({
  apiKey: process.env.OPENAI_API_KEY!,
  promptId: process.env.OPENAI_PROMPT_ID!,
  baseUrl: 'https://api.openai.com/v1',
  timeout: 30000,
  maxRetries: 3
});

// Create conversation
const conversation = await openai.createConversation({
  user_id: 'user_123',
  platform: 'whatsapp'
});

// Send message
const response = await openai.sendMessage(
  'Hello, how can you help me?',
  conversation.id,
  'user_123'
);

console.log(response.response);
```
