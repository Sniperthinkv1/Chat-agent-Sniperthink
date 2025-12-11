# OpenAI Responses API Guide

Complete guide for using OpenAI's Responses API with prompt IDs for AI-powered conversations and data extraction.

## Table of Contents

- [Overview](#overview)
- [API Basics](#api-basics)
- [Prompt ID Setup](#prompt-id-setup)
- [Conversation Management](#conversation-management)
- [Making API Calls](#making-api-calls)
- [Response Structure](#response-structure)
- [Data Extraction](#data-extraction)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)

---

## Overview

The OpenAI Responses API allows you to:
- Use pre-configured prompts (via Prompt IDs) instead of sending full system prompts
- Maintain conversation context across multiple API calls
- Extract structured data from conversations
- Build AI agents with consistent behavior

**Key Concepts:**
- **Prompt ID**: A unique identifier for a pre-configured prompt in OpenAI's system
- **Conversation ID**: Tracks conversation history across multiple API calls
- **Input**: Array of messages (user, assistant, system)
- **Output**: AI-generated response with metadata

---

## API Basics

### Base URL
```
https://api.openai.com/v1
```

### Authentication
```http
Authorization: Bearer YOUR_OPENAI_API_KEY
```

### Required Headers
```http
Content-Type: application/json
User-Agent: your-app-name/1.0.0
```

---

## Prompt ID Setup

### What is a Prompt ID?

A Prompt ID is a reference to a pre-configured prompt stored in OpenAI's system. Instead of sending the full system prompt with every request, you reference it by ID.

**Format:** `pmpt_<alphanumeric_string>`

**Example:** `pmpt_68de2bd80fa08196ab95184e7787c6e30c231f4a29f082a0`

### Creating a Prompt

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Navigate to **Prompts** section
3. Create a new prompt with your instructions
4. Copy the generated Prompt ID

**Example Prompt Configuration:**
```
Name: Customer Support Agent
Instructions: You are a helpful customer support agent. Be friendly, 
professional, and concise. Always ask for clarification if needed.
Model: gpt-4o
Temperature: 0.7
```

### Using Prompt IDs

Prompt IDs allow you to:
- ✅ Update prompts without changing code
- ✅ Version control your AI behavior
- ✅ A/B test different prompts
- ✅ Reduce API payload size
- ✅ Centralize prompt management

---

## Conversation Management

### Creating a Conversation

Before making API calls, create a conversation to track context.

**Endpoint:** `POST /v1/conversations`

**Request:**
```json
{
  "items": [],
  "metadata": {
    "user_id": "user_123",
    "source": "web_chat"
  }
}
```

**Response:**
```json
{
  "id": "conv_68e3dfb80cf0819082223f829c1aebb3033b920bddab0dfa",
  "object": "conversation",
  "created_at": 1759765227,
  "metadata": {
    "user_id": "user_123",
    "source": "web_chat"
  }
}
```

**Conversation ID Format:** `conv_<alphanumeric_string>`

### Why Use Conversations?

Conversations maintain context across multiple API calls:
- User's previous messages
- AI's previous responses
- Conversation history
- Metadata for tracking

---

## Making API Calls

### Basic Request Structure

**Endpoint:** `POST /v1/responses`

**Request Body:**
```json
{
  "prompt": {
    "id": "pmpt_68de2bd80fa08196ab95184e7787c6e30c231f4a29f082a0"
  },
  "input": [
    {
      "role": "user",
      "content": "Hello, I need help with my order"
    }
  ],
  "conversation": "conv_68e3dfb80cf0819082223f829c1aebb3033b920bddab0dfa",
  "user": "user_123"
}
```

### Request Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `prompt.id` | string | ✅ Yes | Your Prompt ID |
| `input` | array | ✅ Yes | Array of message objects |
| `conversation` | string | ⚠️ Recommended | Conversation ID for context |
| `user` | string | ❌ Optional | User ID for abuse monitoring |
| `metadata` | object | ❌ Optional | Custom metadata |

### Input Message Format

Each message in the `input` array:

```typescript
{
  "role": "user" | "assistant" | "system",
  "content": "message text"
}
```

**Roles:**
- `user`: End-user messages
- `assistant`: AI responses (for context)
- `system`: System-level instructions (rare, usually in prompt)

### Example: Simple Conversation

```json
{
  "prompt": {
    "id": "pmpt_abc123"
  },
  "input": [
    {
      "role": "user",
      "content": "What's the weather like?"
    }
  ],
  "conversation": "conv_xyz789"
}
```

### Example: Multi-Turn Conversation

```json
{
  "prompt": {
    "id": "pmpt_abc123"
  },
  "input": [
    {
      "role": "user",
      "content": "I need to book a meeting"
    },
    {
      "role": "assistant",
      "content": "I'd be happy to help! What date works for you?"
    },
    {
      "role": "user",
      "content": "Next Tuesday at 2pm"
    }
  ],
  "conversation": "conv_xyz789"
}
```

---

## Response Structure

### Success Response

```json
{
  "id": "resp_abc123xyz",
  "object": "response",
  "created_at": 1759765227,
  "model": "gpt-4o-2024-08-06",
  "output": [
    {
      "id": "out_def456",
      "type": "message",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "I can help you with that! What's your order number?"
        }
      ],
      "status": "completed"
    }
  ],
  "conversation": {
    "id": "conv_68e3dfb80cf0819082223f829c1aebb3033b920bddab0dfa"
  },
  "usage": {
    "input_tokens": 245,
    "output_tokens": 18,
    "total_tokens": 263
  },
  "status": "completed"
}
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique response ID |
| `object` | string | Always `"response"` |
| `created_at` | number | Unix timestamp |
| `model` | string | Model used (e.g., `gpt-4o`) |
| `output` | array | Array of output objects |
| `conversation.id` | string | Conversation ID |
| `usage` | object | Token usage statistics |
| `status` | string | `completed`, `incomplete`, or `failed` |

### Output Object Structure

```json
{
  "id": "out_def456",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "output_text",
      "text": "The actual AI response text"
    }
  ],
  "status": "completed"
}
```

### Extracting the Response Text

```javascript
// Get the first message output
const messageOutput = response.output.find(out => out.type === 'message');

// Extract the text
const responseText = messageOutput.content[0].text;

console.log(responseText);
// Output: "I can help you with that! What's your order number?"
```

### Token Usage

```json
{
  "usage": {
    "input_tokens": 245,    // Tokens in your input
    "output_tokens": 18,    // Tokens in AI response
    "total_tokens": 263     // Total tokens used
  }
}
```

**Cost Calculation:**
```
Cost = (input_tokens × input_price) + (output_tokens × output_price)
```

---

## Data Extraction

### Using Prompts for Structured Data

You can use Responses API to extract structured data from conversations.

### Example: Lead Extraction Prompt

**Prompt Configuration:**
```
Name: Lead Extraction
Instructions: Analyze the conversation and extract lead information.
Return a JSON object with these fields:
- name: string
- email: string
- company: string
- intent: string (what they're interested in)
- urgency: "Low" | "Medium" | "High"
- budget_mentioned: boolean

Only include fields if explicitly mentioned in the conversation.
```

### Extraction Request

```json
{
  "prompt": {
    "id": "pmpt_extraction_123"
  },
  "input": [
    {
      "role": "user",
      "content": "Hi, I'm John from Acme Corp"
    },
    {
      "role": "assistant",
      "content": "Hello John! How can I help you today?"
    },
    {
      "role": "user",
      "content": "We need a CRM solution urgently. Budget is around $10k"
    },
    {
      "role": "assistant",
      "content": "Great! Can I get your email to send you details?"
    },
    {
      "role": "user",
      "content": "Sure, it's john@acme.com"
    }
  ],
  "conversation": "conv_xyz789"
}
```

### Extraction Response

```json
{
  "id": "resp_extract_456",
  "object": "response",
  "output": [
    {
      "type": "message",
      "content": [
        {
          "type": "output_text",
          "text": "{\"name\":\"John\",\"email\":\"john@acme.com\",\"company\":\"Acme Corp\",\"intent\":\"CRM solution\",\"urgency\":\"High\",\"budget_mentioned\":true}"
        }
      ],
      "status": "completed"
    }
  ],
  "usage": {
    "total_tokens": 450
  },
  "status": "completed"
}
```

### Parsing Extracted Data

```javascript
const extractedText = response.output[0].content[0].text;
const leadData = JSON.parse(extractedText);

console.log(leadData);
/*
{
  name: "John",
  email: "john@acme.com",
  company: "Acme Corp",
  intent: "CRM solution",
  urgency: "High",
  budget_mentioned: true
}
*/
```

---

## Error Handling

### Error Response Structure

```json
{
  "id": "resp_error_123",
  "object": "response",
  "status": "failed",
  "error": {
    "message": "Invalid prompt ID",
    "type": "invalid_request_error",
    "code": "prompt_not_found"
  }
}
```

### Common Error Codes

| HTTP Status | Error Code | Description | Retryable |
|-------------|-----------|-------------|-----------|
| 401 | `invalid_api_key` | Invalid or missing API key | ❌ No |
| 404 | `prompt_not_found` | Prompt ID doesn't exist | ❌ No |
| 404 | `conversation_not_found` | Conversation ID doesn't exist | ❌ No |
| 429 | `rate_limit_exceeded` | Too many requests | ✅ Yes |
| 500 | `server_error` | OpenAI server error | ✅ Yes |
| 503 | `service_unavailable` | Service temporarily down | ✅ Yes |

### Retry Strategy

```javascript
async function callOpenAIWithRetry(request, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const error = await response.json();
        
        // Don't retry client errors (except rate limits)
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          throw new Error(error.error.message);
        }
        
        // Retry server errors and rate limits
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await sleep(delay);
          continue;
        }
        
        throw new Error(error.error.message);
      }

      return await response.json();
      
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = Math.pow(2, attempt) * 1000;
      await sleep(delay);
    }
  }
}
```

---

## Best Practices

### 1. Conversation Management

✅ **DO:**
- Create one conversation per user session
- Reuse the same conversation ID for context
- Store conversation IDs in your database
- Add metadata for tracking

❌ **DON'T:**
- Create a new conversation for every message
- Mix conversations from different users
- Forget to store conversation IDs

### 2. Prompt Design

✅ **DO:**
- Be specific and clear in your prompt instructions
- Include examples in your prompt
- Test prompts thoroughly before deploying
- Version your prompts

❌ **DON'T:**
- Make prompts too vague
- Include sensitive data in prompts
- Change prompts without testing

### 3. Input Messages

✅ **DO:**
- Send only relevant conversation history
- Limit input to last 10-20 messages for context
- Trim very long messages
- Validate input before sending

❌ **DON'T:**
- Send entire conversation history every time
- Include unnecessary system messages
- Send empty or null messages

### 4. Error Handling

✅ **DO:**
- Implement retry logic with exponential backoff
- Log all errors with correlation IDs
- Handle rate limits gracefully
- Provide fallback responses

❌ **DON'T:**
- Retry non-retryable errors
- Ignore error codes
- Expose API errors to end users

### 5. Performance

✅ **DO:**
- Set appropriate timeouts (30-60 seconds)
- Monitor token usage
- Cache responses when appropriate
- Use async/await for non-blocking calls

❌ **DON'T:**
- Make synchronous blocking calls
- Ignore timeout errors
- Send duplicate requests

### 6. Security

✅ **DO:**
- Store API keys securely (environment variables)
- Use HTTPS for all API calls
- Validate and sanitize user input
- Include user IDs for abuse monitoring

❌ **DON'T:**
- Hardcode API keys in code
- Log API keys or sensitive data
- Trust user input without validation

---

## Complete Example

### TypeScript Implementation

```typescript
interface OpenAIRequest {
  prompt: { id: string };
  input: Array<{ role: string; content: string }>;
  conversation?: string;
  user?: string;
}

interface OpenAIResponse {
  id: string;
  output: Array<{
    type: string;
    content: Array<{ type: string; text: string }>;
  }>;
  conversation?: { id: string };
  usage: {
    total_tokens: number;
  };
  status: string;
}

async function callOpenAI(
  promptId: string,
  messages: Array<{ role: string; content: string }>,
  conversationId?: string
): Promise<{ text: string; tokens: number; conversationId: string }> {
  
  const request: OpenAIRequest = {
    prompt: { id: promptId },
    input: messages
  };

  if (conversationId) {
    request.conversation = conversationId;
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(30000) // 30 second timeout
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data: OpenAIResponse = await response.json();

  // Extract response text
  const messageOutput = data.output.find(out => out.type === 'message');
  const text = messageOutput?.content[0]?.text || '';

  return {
    text,
    tokens: data.usage.total_tokens,
    conversationId: data.conversation?.id || ''
  };
}

// Usage
const result = await callOpenAI(
  'pmpt_abc123',
  [
    { role: 'user', content: 'Hello!' }
  ],
  'conv_xyz789'
);

console.log(result.text); // AI response
console.log(result.tokens); // Tokens used
console.log(result.conversationId); // Conversation ID
```

---

## Quick Reference

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/v1/conversations` | POST | Create conversation |
| `/v1/responses` | POST | Get AI response |

### Key IDs

| Type | Format | Example |
|------|--------|---------|
| Prompt ID | `pmpt_*` | `pmpt_68de2bd80fa08196ab95184e7787c6e30c231f4a29f082a0` |
| Conversation ID | `conv_*` | `conv_68e3dfb80cf0819082223f829c1aebb3033b920bddab0dfa` |
| Response ID | `resp_*` | `resp_abc123xyz` |

### Response Extraction

```javascript
// Get AI response text
const text = response.output
  .find(out => out.type === 'message')
  .content[0].text;

// Get token usage
const tokens = response.usage.total_tokens;

// Get conversation ID
const conversationId = response.conversation.id;
```

---

## Support & Resources

- **OpenAI Documentation**: https://platform.openai.com/docs
- **API Reference**: https://platform.openai.com/docs/api-reference
- **Prompt Management**: https://platform.openai.com/prompts
- **Rate Limits**: https://platform.openai.com/account/rate-limits

---

**Last Updated:** October 2025  
**API Version:** v1
