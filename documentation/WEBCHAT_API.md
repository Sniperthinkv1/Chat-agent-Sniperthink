# Webchat Widget API Documentation

## Overview

The Webchat Widget API provides endpoints for creating and managing web chat channels with customizable AI agents. The widget supports full color customization to match your brand identity.

## Base URL

```
Production: https://api.example.com
Development: http://localhost:3000
```

## Endpoints

### 1. Create Webchat Channel

Creates a new webchat channel with an AI agent and returns customizable embed code.

**Endpoint:** `POST /api/users/{user_id}/webchat/channels`

**Parameters:**
- `user_id` (path) - User identifier

**Request Body:**
```json
{
  "prompt_id": "prompt_abc123",
  "name": "Customer Support Chat"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "webchat_id": "webchat_user_123_abc",
    "phone_number_id": "pn_webchat_user_123_abc",
    "agent_id": "agent_webchat_user_123_abc",
    "prompt_id": "prompt_abc123",
    "name": "Customer Support Chat",
    "embed_code": "<!-- AI Chat Widget with Custom Colors -->\n<webchat-widget \n  agent-id=\"webchat_user_123_abc\"\n  primary-color=\"#3B82F6\"\n  secondary-color=\"#EFF6FF\">\n</webchat-widget>\n<script src=\"https://api.example.com/widget.js\" async></script>",
    "config_url": "https://api.example.com/widget-config.html?agent_id=webchat_user_123_abc",
    "created_at": "2025-10-05T10:00:00.000Z"
  },
  "timestamp": "2025-10-05T10:00:00.000Z",
  "correlationId": "abc123"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/users/user_123/webchat/channels \
  -H "Content-Type: application/json" \
  -d '{
    "prompt_id": "prompt_abc123",
    "name": "Customer Support Chat"
  }'
```

---

### 2. Get Configuration Page URL

Returns the URL to the visual configuration page for customizing widget colors.

**Endpoint:** `GET /api/webchat/{webchat_id}/config`

**Parameters:**
- `webchat_id` (path) - Webchat channel identifier

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "webchat_id": "webchat_user_123_abc",
    "config_url": "https://api.example.com/widget-config.html?agent_id=webchat_user_123_abc",
    "message": "Open this URL to customize widget colors and get embed code"
  },
  "timestamp": "2025-10-05T10:00:00.000Z",
  "correlationId": "abc123"
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/webchat/webchat_user_123_abc/config
```

---

### 3. Get Embed Code

Returns the HTML embed code for the webchat widget.

**Endpoint:** `GET /api/webchat/{webchat_id}/embed`

**Parameters:**
- `webchat_id` (path) - Webchat channel identifier

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "webchat_id": "webchat_user_123_abc",
    "embed_code": "<!-- HTML embed code with color customization -->"
  },
  "timestamp": "2025-10-05T10:00:00.000Z",
  "correlationId": "abc123"
}
```

**cURL Example:**
```bash
curl http://localhost:3000/api/webchat/webchat_user_123_abc/embed
```

---

### 4. Send Message

Sends a message from a website visitor to the AI agent.

**Endpoint:** `POST /api/webchat/{webchat_id}/messages`

**Parameters:**
- `webchat_id` (path) - Webchat channel identifier

**Request Body:**
```json
{
  "message": "Hello, I need help with my order",
  "session_id": "session_1234567890_abc",
  "visitor_phone": "session_1234567890_abc",
  "visitor_name": "John Doe"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "message_id": "msg_1234567890_abc",
    "conversation_id": "conv_1234567890_abc",
    "status": "queued"
  },
  "timestamp": "2025-10-05T10:00:00.000Z",
  "correlationId": "abc123"
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/webchat/webchat_user_123_abc/messages \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, I need help",
    "session_id": "session_123",
    "visitor_phone": "session_123"
  }'
```

---

### 5. Get Messages

Retrieves messages for a specific visitor's conversation.

**Endpoint:** `GET /api/webchat/{webchat_id}/messages`

**Parameters:**
- `webchat_id` (path) - Webchat channel identifier
- `visitor_phone` (query) - Visitor identifier (session_id)
- `since` (query, optional) - Only return messages after this timestamp

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "message_id": "msg_123",
        "message_text": "Hello, I need help",
        "sender": "user",
        "timestamp": "2025-10-05T10:00:00.000Z",
        "sequence_no": 1
      },
      {
        "message_id": "msg_124",
        "message_text": "Hi! How can I help you today?",
        "sender": "agent",
        "timestamp": "2025-10-05T10:00:05.000Z",
        "sequence_no": 2
      }
    ],
    "conversation_id": "conv_123"
  },
  "timestamp": "2025-10-05T10:00:00.000Z",
  "correlationId": "abc123"
}
```

**cURL Example:**
```bash
curl "http://localhost:3000/api/webchat/webchat_user_123_abc/messages?visitor_phone=session_123&since=2025-10-05T09:00:00.000Z"
```

---

### 6. Stream Messages (SSE)

Establishes a Server-Sent Events connection for real-time messages.

**Endpoint:** `GET /api/webchat/{webchat_id}/stream`

**Parameters:**
- `webchat_id` (path) - Webchat channel identifier
- `session_id` (query) - Unique session identifier

**Response:** `200 OK` (text/event-stream)

**Event Types:**
- `connected` - Connection established
- `message` - New message from AI agent
- `typing` - Typing indicator status

**Example Events:**
```
event: connected
data: {"status":"connected"}

event: message
data: {"message_id":"msg_123","message_text":"Hello!","sender":"agent","timestamp":"2025-10-05T10:00:00.000Z"}

event: typing
data: {"isTyping":true}
```

**JavaScript Example:**
```javascript
const eventSource = new EventSource(
  'http://localhost:3000/api/webchat/webchat_user_123_abc/stream?session_id=session_123'
);

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('New message:', data);
};

eventSource.addEventListener('typing', (event) => {
  const data = JSON.parse(event.data);
  console.log('Typing:', data.isTyping);
});
```

---

### 7. Initialize Session

Initializes a chat session and checks if the visitor is returning.

**Endpoint:** `POST /api/webchat/{webchat_id}/init`

**Parameters:**
- `webchat_id` (path) - Webchat channel identifier

**Request Body:**
```json
{
  "visitor_phone": "session_123",
  "session_id": "session_123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "session_id": "session_123",
    "is_returning_visitor": false,
    "conversation_id": null,
    "previous_messages": 0,
    "previous_platform": null
  },
  "timestamp": "2025-10-05T10:00:00.000Z",
  "correlationId": "abc123"
}
```

---

### 8. Verify Phone

Verifies a phone number and retrieves associated user information.

**Endpoint:** `POST /api/webchat/{webchat_id}/verify-phone`

**Parameters:**
- `webchat_id` (path) - Webchat channel identifier

**Request Body:**
```json
{
  "phone": "+1234567890"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "phone": "1234567890",
    "has_name": true,
    "name": "John Doe",
    "email": "john@example.com",
    "company": "Acme Inc"
  },
  "timestamp": "2025-10-05T10:00:00.000Z"
}
```

---

## Color Customization

### Widget Attributes

The webchat widget supports two color attributes:

**`primary-color`** (optional)
- Format: Hex color code (e.g., `#3B82F6`)
- Default: `#3B82F6` (Blue)
- Applied to: Chat button, header, user messages, send button

**`secondary-color`** (optional)
- Format: Hex color code (e.g., `#EFF6FF`)
- Default: `#EFF6FF` (Light Blue)
- Applied to: Agent messages, background accents

### Embed Code Example

```html
<!-- Default Colors -->
<webchat-widget agent-id="webchat_user_123_abc"></webchat-widget>

<!-- Custom Colors -->
<webchat-widget 
  agent-id="webchat_user_123_abc"
  primary-color="#8B5CF6"
  secondary-color="#F5F3FF">
</webchat-widget>

<script src="https://api.example.com/widget.js" async></script>
```

### Color Presets

| Preset | Primary | Secondary | Use Case |
|--------|---------|-----------|----------|
| Blue | #3B82F6 | #EFF6FF | Professional, default |
| Purple | #8B5CF6 | #F5F3FF | Creative, modern |
| Green | #10B981 | #ECFDF5 | Eco, health |
| Orange | #F59E0B | #FEF3C7 | Energetic, warm |
| Red | #EF4444 | #FEE2E2 | Bold, urgent |
| Teal | #14B8A6 | #F0FDFA | Tech, calm |

### Configuration UI

Users can visually customize colors at:
```
https://api.example.com/widget-config.html?agent_id=YOUR_WEBCHAT_ID
```

Features:
- Color picker interface
- Hex code input
- 6 preset color schemes
- Live widget preview
- One-click copy embed code

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Missing required fields",
  "message": "prompt_id and name are required",
  "timestamp": "2025-10-05T10:00:00.000Z",
  "correlationId": "abc123"
}
```

### 404 Not Found
```json
{
  "error": "Webchat channel not found",
  "message": "Webchat channel webchat_123 not found",
  "timestamp": "2025-10-05T10:00:00.000Z",
  "correlationId": "abc123"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "Something went wrong",
  "timestamp": "2025-10-05T10:00:00.000Z",
  "correlationId": "abc123"
}
```

---

## Rate Limiting

All API endpoints are rate-limited per user:
- 100 requests per minute per user_id
- 1000 requests per hour per user_id

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1633024800
```

---

## Authentication

Currently, the API does not require authentication for webchat endpoints. In production, implement:
- API key authentication
- CORS restrictions
- Rate limiting per domain

---

## Best Practices

### 1. Session Management
- Generate unique session_id per visitor
- Store session_id in localStorage
- Reuse session_id for 24 hours

### 2. Color Selection
- Use brand colors for consistency
- Ensure sufficient contrast (4.5:1 ratio)
- Test on multiple devices
- Use configuration UI for preview

### 3. Error Handling
- Implement retry logic for failed requests
- Show user-friendly error messages
- Log errors with correlation IDs

### 4. Performance
- Use SSE for real-time updates
- Cache embed code
- Minimize API calls

---

## Examples

### Complete Integration Example

```html
<!DOCTYPE html>
<html>
<head>
  <title>My Website</title>
</head>
<body>
  <h1>Welcome to My Site</h1>
  
  <!-- Webchat Widget with Custom Colors -->
  <webchat-widget 
    agent-id="webchat_user_123_abc"
    primary-color="#8B5CF6"
    secondary-color="#F5F3FF">
  </webchat-widget>
  <script src="https://api.example.com/widget.js" async></script>
</body>
</html>
```

### JavaScript Integration

```javascript
// Create webchat channel
async function createWebchatChannel(userId, promptId, name) {
  const response = await fetch(
    `https://api.example.com/api/users/${userId}/webchat/channels`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt_id: promptId, name })
    }
  );
  
  const data = await response.json();
  return data.data;
}

// Get configuration URL
async function getConfigUrl(webchatId) {
  const response = await fetch(
    `https://api.example.com/api/webchat/${webchatId}/config`
  );
  
  const data = await response.json();
  return data.data.config_url;
}

// Usage
const channel = await createWebchatChannel('user_123', 'prompt_abc', 'Support Chat');
console.log('Embed code:', channel.embed_code);
console.log('Config URL:', channel.config_url);
```

---

## Support

For questions or issues:
1. Check this documentation
2. Review browser console for errors
3. Check server logs with correlation ID
4. Contact API support

---

## Changelog

### Version 1.0.0 (2025-10-05)
- Initial release
- Color customization support
- Visual configuration UI
- SSE streaming
- 6 color presets
- Complete API documentation
