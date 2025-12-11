# WhatsApp Business API Reference

This document provides the authoritative reference for WhatsApp Business API integration within the Multi-Channel AI Agent service.

## API Overview

- **Base URL**: `https://graph.facebook.com/v22.0`
- **Authentication**: Access tokens per WhatsApp Business Account
- **Rate Limits**: 1000 requests per second per phone number
- **Webhook**: Single endpoint handles both WhatsApp and Instagram

## Authentication & Setup

### Access Token Management

**Important**: The `meta_phone_number_id` is Meta's identifier (WABA ID) used in API calls.

```typescript
interface WhatsAppAccount {
  id: string;                    // Internal primary key
  user_id: string;               // Tenant identifier
  meta_phone_number_id: string;  // Meta's WABA phone_number_id (e.g., "836990829491415")
  access_token: string;          // System user access token for this phone number
  platform: 'whatsapp';
  display_name: string;          // Human-readable: "+1 (234) 567-8900"
}
```

**Database Storage**:
- `id` - Your internal primary key
- `meta_phone_number_id` - Meta's phone_number_id (used in API URLs)
- `access_token` - Meta access token (unique per phone number)
- `display_name` - User-friendly phone number display

### Required Permissions
- `whatsapp_business_messaging`
- `whatsapp_business_management`

## Webhook Configuration

### Webhook URL Setup
```bash
POST https://graph.facebook.com/v18.0/{whatsapp-business-account-id}/subscribed_apps
```

### Webhook Payload Structure
```typescript
interface WhatsAppWebhookPayload {
  object: 'whatsapp_business_account';
  entry: Array<{
    id: string; // WhatsApp Business Account ID
    changes: Array<{
      value: {
        messaging_product: 'whatsapp';
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string; // WhatsApp ID (phone number)
        }>;
        messages?: Array<{
          from: string; // Sender's WhatsApp ID
          id: string;   // Message ID
          timestamp: string;
          type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'location' | 'contacts';
          text?: {
            body: string;
          };
          image?: {
            mime_type: string;
            sha256: string;
            id: string;
          };
          audio?: {
            mime_type: string;
            sha256: string;
            id: string;
            voice: boolean;
          };
          video?: {
            mime_type: string;
            sha256: string;
            id: string;
          };
          document?: {
            mime_type: string;
            sha256: string;
            id: string;
            filename: string;
          };
          location?: {
            latitude: number;
            longitude: number;
            name?: string;
            address?: string;
          };
          contacts?: Array<{
            name: {
              formatted_name: string;
              first_name?: string;
              last_name?: string;
            };
            phones?: Array<{
              phone: string;
              type?: string;
            }>;
          }>;
        }>;
        statuses?: Array<{
          id: string;
          status: 'sent' | 'delivered' | 'read' | 'failed';
          timestamp: string;
          recipient_id: string;
          errors?: Array<{
            code: number;
            title: string;
            message: string;
          }>;
        }>;
      };
      field: 'messages';
    }>;
  }>;
}
```

## Message Types

### Typing Indicators + Read Receipts
```typescript
interface TypingIndicatorWithReadReceipt {
  messaging_product: 'whatsapp';
  status: 'read';
  message_id: string; // ID of the message to mark as read
  typing_indicator: {
    type: 'text';  // Shows "typing..." indicator
  };
}
```

**Important Notes:**
- Shows **"typing..."** indicator for up to 25 seconds
- Shows **double blue checkmarks** (message marked as read)
- Typing indicator automatically disappears when you send a response
- Typing indicator disappears after 25 seconds if no response sent
- Only display typing indicator if you are going to respond
- Non-blocking - send asynchronously for best UX

**Example Usage:**
```bash
# Show typing indicator + mark as read
curl -X POST \
  'https://graph.facebook.com/v22.0/836990829491415/messages' \
  -H 'Authorization: Bearer EAAxxxx...' \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "status": "read",
    "message_id": "wamid.HBgMOTE4OTc5NTU2OTQxFQIAEhgUM0Y4NUYzMjEyNjUzRUM5MzIyN0UA",
    "typing_indicator": {
      "type": "text"
    }
  }'
```

**Response:**
```json
{
  "success": true
}
```

**Behavior:**
- User sees double blue checkmarks immediately
- User sees "typing..." status immediately
- Typing indicator stays visible for up to 25 seconds
- Typing indicator disappears when actual message is sent

### Text Messages
```typescript
interface TextMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string; // Recipient's WhatsApp ID
  type: 'text';
  text: {
    preview_url?: boolean;
    body: string; // Max 4096 characters
  };
}
```

### Media Messages
```typescript
interface MediaMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'image' | 'audio' | 'video' | 'document';
  image?: {
    id?: string;     // Media ID from upload
    link?: string;   // Public URL
    caption?: string;
  };
  audio?: {
    id?: string;
    link?: string;
  };
  video?: {
    id?: string;
    link?: string;
    caption?: string;
  };
  document?: {
    id?: string;
    link?: string;
    caption?: string;
    filename?: string;
  };
}
```

### Interactive Messages
```typescript
interface ButtonMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'button';
    header?: {
      type: 'text';
      text: string;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      buttons: Array<{
        type: 'reply';
        reply: {
          id: string;
          title: string; // Max 20 characters
        };
      }>;
    };
  };
}

interface ListMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'list';
    header?: {
      type: 'text';
      text: string;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: {
      button: string;
      sections: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string; // Max 24 characters
          description?: string; // Max 72 characters
        }>;
      }>;
    };
  };
}
```

### Template Messages
```typescript
interface TemplateMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string; // Template name
    language: {
      code: string; // Language code (e.g., 'en_US')
    };
    components?: Array<{
      type: 'header' | 'body' | 'button';
      parameters?: Array<{
        type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
        text?: string;
        currency?: {
          fallback_value: string;
          code: string;
          amount_1000: number;
        };
        date_time?: {
          fallback_value: string;
        };
        image?: {
          id?: string;
          link?: string;
        };
      }>;
    }>;
  };
}
```

## API Endpoints

### Send Message

**URL Structure**: Use `meta_phone_number_id` from your database in the URL path.

```http
POST https://graph.facebook.com/v22.0/{meta_phone_number_id}/messages
Authorization: Bearer {access-token}
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "recipient_type": "individual",
  "to": "1234567890",
  "type": "text",
  "text": {
    "body": "Hello from our AI agent!"
  }
}
```

**Example with actual values**:
```bash
# Text message
curl -i -X POST \
  'https://graph.facebook.com/v22.0/836990829491415/messages' \
  -H 'Authorization: Bearer EAAxxxx...' \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "1234567890",
    "type": "text",
    "text": {
      "body": "Hello from our AI agent!"
    }
  }'

# Template message (for messages outside 24-hour window)
curl -i -X POST \
  'https://graph.facebook.com/v22.0/836990829491415/messages' \
  -H 'Authorization: Bearer EAAxxxx...' \
  -H 'Content-Type: application/json' \
  -d '{
    "messaging_product": "whatsapp",
    "to": "1234567890",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": {
        "code": "en_US"
      }
    }
  }'
```

### Upload Media
```http
POST https://graph.facebook.com/v22.0/{meta_phone_number_id}/media
Authorization: Bearer {access-token}
Content-Type: multipart/form-data

file: [binary data]
type: image/jpeg
messaging_product: whatsapp
```

### Download Media
```http
GET https://graph.facebook.com/v22.0/{media-id}
Authorization: Bearer {access-token}
```

### Mark Message as Read
```http
POST https://graph.facebook.com/v22.0/{meta_phone_number_id}/messages
Authorization: Bearer {access-token}
Content-Type: application/json

{
  "messaging_product": "whatsapp",
  "status": "read",
  "message_id": "{message-id}"
}
```

## Message Processing Flow

### Incoming Message Handling
1. **Webhook receives message** → validate signature using app secret
2. **Extract conversation identifiers**:
   - `metadata.phone_number_id`: Meta's phone_number_id from webhook payload
   - `from`: Sender's WhatsApp ID (phone number)
   - `platform`: 'whatsapp'
3. **Lookup internal phone number record** using `meta_phone_number_id`
4. **Enqueue to Redis** with key: `whatsapp:{meta_phone_number_id}:{from}`
5. **Worker processes** → acquire distributed lock → call OpenAI → send response

### Outgoing Message Sending

**Important**: Retrieve `meta_phone_number_id` and `access_token` from database before sending.

```typescript
async function sendWhatsAppMessage(
  metaPhoneNumberId: string,  // Meta's phone_number_id from database
  recipientId: string,         // Customer's WhatsApp ID
  message: string,
  accessToken: string          // Access token from database
): Promise<{ messages: Array<{ id: string }> }> {
  const response = await fetch(
    `https://graph.facebook.com/v22.0/${metaPhoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipientId,
        type: 'text',
        text: { body: message }
      })
    }
  );
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(`WhatsApp API error: ${error.error.message}`);
  }
  
  return response.json();
}

// Example usage in worker
async function processMessage(phoneNumberId: string, customerPhone: string, messageText: string) {
  // 1. Get phone number details from database
  const phoneNumber = await db.query(
    'SELECT meta_phone_number_id, access_token FROM phone_numbers WHERE id = $1',
    [phoneNumberId]
  );
  
  // 2. Send message using Meta's ID and token
  const result = await sendWhatsAppMessage(
    phoneNumber.rows[0].meta_phone_number_id,
    customerPhone,
    messageText,
    phoneNumber.rows[0].access_token
  );
  
  return result;
}
```

## Error Handling

### Common Error Codes
- `131000`: Generic user error
- `131005`: Message undeliverable
- `131008`: Message expired
- `131014`: Re-engagement message
- `131016`: Message failed to send
- `131021`: Recipient cannot be sender
- `131026`: Message type not supported
- `131047`: Re-engagement window expired
- `131051`: Unsupported message type
- `132000`: Generic recipient error
- `132001`: Recipient phone number not valid
- `132005`: Recipient using an old WhatsApp version
- `132007`: Recipient phone number not a WhatsApp number

### Error Response Format
```json
{
  "error": {
    "message": "Message failed to send because more than 24 hours have passed since the customer last replied to this number.",
    "type": "OAuthException",
    "code": 131047,
    "error_data": {
      "messaging_product": "whatsapp",
      "details": "Message failed to send because more than 24 hours have passed since the customer last replied to this number."
    },
    "error_subcode": 2388001,
    "fbtrace_id": "..."
  }
}
```

### Retry Strategy
- **Rate limit errors**: Exponential backoff with jitter
- **Temporary errors (5xx)**: Retry up to 3 times
- **24-hour window expired (131047)**: Use template message or log for manual follow-up
- **Invalid recipient (132001)**: Log and skip, don't retry

## Rate Limiting

### Limits
- **1000 requests per second** per phone number
- **Messaging limits**: Based on phone number tier and quality rating
- **Template messages**: Separate limits based on business verification

### Rate Limit Headers
```http
X-Business-Use-Case-Usage: {"call_count":10,"total_cputime":5,"total_time":3}
```

### Messaging Windows
- **24-hour window**: Free-form messages allowed within 24 hours of last customer message
- **Outside window**: Only approved template messages allowed

## Webhook Security

### Signature Verification
```typescript
import crypto from 'crypto';

function verifyWhatsAppSignature(
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

## Message Status Tracking

### Status Types
- `sent`: Message sent to WhatsApp
- `delivered`: Message delivered to recipient's device
- `read`: Message read by recipient
- `failed`: Message failed to deliver

### Status Webhook Handling
```typescript
interface MessageStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message: string;
  }>;
}

function handleMessageStatus(status: MessageStatus) {
  // Update message status in database
  // Trigger retry logic for failed messages
  // Update conversation engagement metrics
}
```

## Best Practices

### Message Formatting
- Keep messages under 4096 characters
- Use interactive messages for better engagement
- Include clear call-to-action buttons
- Handle media attachments with proper captions

### Performance Optimization
- Cache access tokens with appropriate TTL
- Use connection pooling for HTTP requests
- Implement circuit breaker for API failures
- Batch status updates when possible

### User Experience
- Respond within 24-hour window when possible
- Use template messages for re-engagement
- Mark messages as read to show engagement
- Handle unsupported message types gracefully

### Compliance
- Respect opt-out requests immediately
- Follow WhatsApp Business Policy guidelines
- Implement proper consent mechanisms
- Maintain audit logs for compliance

## Testing & Development

### Test Numbers
- Use WhatsApp test numbers for development
- Test webhook delivery with ngrok or similar
- Validate message formatting across different devices

### Monitoring
- Track API response times and error rates
- Monitor rate limit usage and messaging windows
- Log all webhook payloads for debugging
- Alert on authentication failures and policy violations