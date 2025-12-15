# Message Status & Failure Reason API

API endpoint to fetch message delivery status and failure reasons.

---

## Endpoint

```
GET /users/:user_id/messages/:message_id/status
```

## Parameters

| Parameter | Type | Location | Description |
|-----------|------|----------|-------------|
| `user_id` | string | path | Your user ID |
| `message_id` | string | path | The message ID to check |

---

## Response

### Success Response

```typescript
interface MessageStatusResponse {
  success: true;
  data: {
    message_id: string;
    conversation_id: string;
    customer_phone: string;
    agent_id: string;
    agent_name: string;
    platform: 'whatsapp' | 'instagram' | 'webchat';
    phone_number_id: string;
    phone_display_name: string;
    sender: 'user' | 'agent';
    text: string;
    timestamp: string;
    sequence_no: number;
    status: 'sent' | 'failed' | 'pending';
    platform_message_id: string | null;
    delivery_status: {
      status: string;
      error_reason: string | null;
      updated_at: string;
    } | null;
    is_failed: boolean;
    failure_reason: string | null;
  };
  timestamp: string;
  correlationId: string;
}
```

### Error Response

```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
  timestamp: string;
  correlationId: string;
}
```

---

## Example

### Request

```typescript
const userId = "789895c8-4bd6-43e9-bfea-a4171ec47197";
const messageId = "wamid.HBgMOTE4OTc5NTU2OTQxFQIAERgSNjk0OTUxRTVGMUM1QkYxM0Q3AA==";

const response = await fetch(
  `http://localhost:4000/users/${userId}/messages/${messageId}/status`
);
const data = await response.json();
```

### Response (Failed Message)

```json
{
  "success": true,
  "data": {
    "message_id": "wamid.HBgMOTE4OTc5NTU2OTQxFQIAERgSNjk0OTUxRTVGMUM1QkYxM0Q3AA==",
    "conversation_id": "cbebb5aa-f075-4d0f-b643-53db41988cc2",
    "customer_phone": "+918979556941",
    "agent_id": "test-agent-001",
    "agent_name": "Test AI Agent",
    "platform": "whatsapp",
    "phone_number_id": "test-phone-001",
    "phone_display_name": "My Business Whatsapp",
    "sender": "agent",
    "text": "Hi hello test",
    "timestamp": "2025-12-15T17:59:02.005Z",
    "sequence_no": 39,
    "status": "failed",
    "platform_message_id": "wamid.HBgMOTE4OTc5NTU2OTQxFQIAERgSNjk0OTUxRTVGMUM1QkYxM0Q3AA==",
    "delivery_status": {
      "status": "failed",
      "error_reason": "This message was not delivered to maintain healthy ecosystem engagement.",
      "updated_at": "2025-12-15T17:59:03.033Z"
    },
    "is_failed": true,
    "failure_reason": "This message was not delivered to maintain healthy ecosystem engagement."
  },
  "timestamp": "2025-12-15T19:56:09.277Z",
  "correlationId": "1765828569021-6469u9ady"
}
```

### Response (Delivered Message)

```json
{
  "success": true,
  "data": {
    "message_id": "msg_123456",
    "conversation_id": "conv_abc123",
    "customer_phone": "+919876543210",
    "agent_id": "agent-001",
    "agent_name": "Sales Agent",
    "platform": "whatsapp",
    "phone_number_id": "phone-001",
    "phone_display_name": "My Business",
    "sender": "agent",
    "text": "Hello! How can I help you today?",
    "timestamp": "2025-12-15T10:30:00.000Z",
    "sequence_no": 5,
    "status": "sent",
    "platform_message_id": "wamid.xyz123",
    "delivery_status": {
      "status": "delivered",
      "error_reason": null,
      "updated_at": "2025-12-15T10:30:02.000Z"
    },
    "is_failed": false,
    "failure_reason": null
  },
  "timestamp": "2025-12-15T10:35:00.000Z",
  "correlationId": "req_abc123"
}
```

---

## Key Fields

| Field | Description |
|-------|-------------|
| `status` | Message status from messages table: `sent`, `failed`, `pending` |
| `is_failed` | Boolean flag - `true` if message failed |
| `failure_reason` | Human-readable error message (null if successful) |
| `delivery_status` | Detailed delivery info from tracking table |
| `delivery_status.error_reason` | Raw error from delivery system |

---

## Common Failure Reasons

| Error | Description |
|-------|-------------|
| `This message was not delivered to maintain healthy ecosystem engagement` | WhatsApp rate limiting or spam prevention |
| `Message Undeliverable` | Recipient blocked or invalid number |
| `Error code 131026` | WhatsApp delivery failure |
| `24-hour window expired` | Template message required (outside 24h window) |
| `Invalid phone number format` | Phone number validation failed |

---

## Error Codes

| HTTP Code | Error Code | Description |
|-----------|------------|-------------|
| 400 | `VALIDATION_ERROR` | Missing user_id or message_id |
| 404 | `MESSAGE_NOT_FOUND` | Message doesn't exist or doesn't belong to user |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Usage in Frontend

```typescript
// Check if a message failed and show the reason
async function checkMessageStatus(messageId: string) {
  const response = await fetch(
    `/users/${USER_ID}/messages/${messageId}/status`
  );
  const result = await response.json();
  
  if (result.success && result.data.is_failed) {
    // Show error to user
    showError(result.data.failure_reason);
  }
}
```
