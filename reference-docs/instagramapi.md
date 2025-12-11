# Instagram Messaging API Reference

This document provides the authoritative reference for Instagram Business API integration within the Multi-Channel AI Agent service.

## API Overview

- **Base URL**: `https://graph.facebook.com/v24.0`
- **Authentication**: Access tokens per Instagram Business Account
- **Rate Limits**: 200 requests per hour per access token
- **Webhook**: Single endpoint handles both WhatsApp and Instagram

## Authentication & Setup

### Access Token Management
```typescript
interface InstagramAccount {
  phone_number_id: string; // Instagram Business Account ID
  access_token: string;    // Page access token
  platform: 'instagram';
}
```

### Required Permissions
- `instagram_basic`
- `instagram_manage_messages`
- `pages_messaging`
- `pages_show_list`

## Webhook Configuration

### Webhook URL Setup
```bash
POST https://graph.facebook.com/v24.0/{instagram-business-account-id}/subscribed_apps
```

### Webhook Payload Structure
```typescript
interface InstagramWebhookPayload {
  object: 'instagram';
  entry: Array<{
    id: string; // Instagram Business Account ID
    time: number;
    messaging: Array<{
      sender: {
        id: string; // Instagram User ID (IGSID)
      };
      recipient: {
        id: string; // Instagram Business Account ID
      };
      timestamp: number;
      message?: {
        mid: string;
        text?: string;
        attachments?: Array<{
          type: 'image' | 'video' | 'audio' | 'file';
          payload: {
            url: string;
          };
        }>;
      };
      postback?: {
        payload: string;
        title: string;
      };
    }>;
  }>;
}
```

## Message Types

### Text Messages
```typescript
interface TextMessage {
  messaging_type: 'RESPONSE' | 'UPDATE';
  recipient: {
    id: string; // Instagram User ID (IGSID)
  };
  message: {
    text: string; // Max 1000 characters
  };
}
```

### Media Messages
```typescript
interface MediaMessage {
  messaging_type: 'RESPONSE';
  recipient: {
    id: string;
  };
  message: {
    attachment: {
      type: 'image' | 'video' | 'audio' | 'file';
      payload: {
        url: string;
        is_reusable?: boolean;
      };
    };
  };
}
```

### Quick Replies
```typescript
interface QuickReplyMessage {
  messaging_type: 'RESPONSE';
  recipient: {
    id: string;
  };
  message: {
    text: string;
    quick_replies: Array<{
      content_type: 'text';
      title: string; // Max 20 characters
      payload: string; // Max 1000 characters
    }>;
  };
}
```

## API Endpoints

### Send Message
```http
POST https://graph.facebook.com/v24.0/{instagram-business-account-id}/messages
Authorization: Bearer {access-token}
Content-Type: application/json

{
  "messaging_type": "RESPONSE",
  "recipient": {
    "id": "{instagram-user-id}"
  },
  "message": {
    "text": "Hello from our AI agent!"
  }
}
```

### Get User Profile
```http
GET https://graph.facebook.com/v24.0/{instagram-user-id}?fields=name,profile_pic&access_token={access-token}
```

Response:
```json
{
  "name": "John Doe",
  "profile_pic": "https://...",
  "id": "{instagram-user-id}"
}
```

## Message Processing Flow

### Incoming Message Handling
1. **Webhook receives message** → validate signature using app secret
2. **Extract conversation identifiers**:
   - `phone_number_id`: Instagram Business Account ID
   - `contact_phone`: Instagram User ID (IGSID)
   - `platform`: 'instagram'
3. **Enqueue to Redis** with key: `instagram:{business-account-id}:{user-id}`
4. **Worker processes** → acquire distributed lock → call OpenAI → send response

### Outgoing Message Sending
```typescript
async function sendInstagramMessage(
  businessAccountId: string,
  recipientId: string,
  message: string,
  accessToken: string
): Promise<{ message_id: string }> {
  const response = await fetch(
    `https://graph.facebook.com/v24.0/${businessAccountId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_type: 'RESPONSE',
        recipient: { id: recipientId },
        message: { text: message }
      })
    }
  );
  
  return response.json();
}
```

## Error Handling

### Common Error Codes
- `100`: Invalid parameter
- `200`: Permissions error
- `368`: Temporarily blocked for policies violations
- `551`: This person isn't available right now
- `2018001`: No matching user found

### Error Response Format
```json
{
  "error": {
    "message": "Invalid parameter",
    "type": "OAuthException",
    "code": 100,
    "error_subcode": 2018001,
    "fbtrace_id": "..."
  }
}
```

### Retry Strategy
- **Rate limit errors (code 4)**: Exponential backoff with jitter
- **Temporary errors (5xx)**: Retry up to 3 times
- **Permission errors (200)**: Log and skip, don't retry
- **User unavailable (551)**: Queue for later retry

## Rate Limiting

### Limits
- **200 requests per hour** per access token
- **Burst limit**: 20 requests per minute
- **Message limit**: 1000 messages per day per recipient

### Rate Limit Headers
```http
X-Business-Use-Case-Usage: {"call_count":10,"total_cputime":5,"total_time":3}
X-App-Usage: {"call_count":1,"total_time":3,"total_cputime":1}
```

### Rate Limit Handling
```typescript
interface RateLimitInfo {
  callCount: number;
  totalTime: number;
  totalCpuTime: number;
}

function parseRateLimitHeaders(headers: Headers): RateLimitInfo {
  const usage = headers.get('X-Business-Use-Case-Usage');
  if (usage) {
    return JSON.parse(usage);
  }
  return { callCount: 0, totalTime: 0, totalCpuTime: 0 };
}
```

## Webhook Security

### Signature Verification
```typescript
import crypto from 'crypto';

function verifyInstagramSignature(
  payload: string,
  signature: string,
  appSecret: string
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', appSecret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expectedSignature)
  );
}
```

### Webhook Verification
```typescript
// Handle webhook verification challenge
app.get('/webhook/meta', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(403).send('Forbidden');
  }
});
```

## Message Context & Threading

### Conversation Identification
- **Unique conversation**: `{business_account_id}:{user_id}`
- **Platform**: Always 'instagram'
- **Contact identification**: Instagram User ID (IGSID)

### Message Threading
Instagram doesn't support explicit threading, but conversations are maintained through:
- Consistent sender/recipient pairing
- 24-hour message window for responses
- Context preservation in database

## Best Practices

### Message Formatting
- Keep messages under 1000 characters
- Use quick replies for structured responses
- Include clear call-to-action buttons
- Handle media attachments gracefully

### Performance Optimization
- Cache access tokens with 1-hour TTL
- Batch API calls when possible
- Use connection pooling for HTTP requests
- Implement circuit breaker for API failures

### User Experience
- Respond within 24-hour window
- Provide typing indicators for longer responses
- Handle unsupported message types gracefully
- Maintain conversation context across sessions

## Testing & Development

### Test Accounts
- Use Instagram test accounts for development
- Test webhook delivery with ngrok or similar
- Validate message formatting across different clients

### Monitoring
- Track API response times and error rates
- Monitor rate limit usage
- Log all webhook payloads for debugging
- Alert on authentication failures
