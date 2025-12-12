# Admin Panel API Reference

This document provides comprehensive API documentation for the Admin Panel endpoints. All admin endpoints require authentication via JWT token obtained through `/admin/login`.

## Authentication

### Login

**Endpoint:** `POST /admin/login`

Authenticate as a super admin and receive a JWT access token.

**Request Body:**
```json
{
  "password": "super-admin-password"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

### Refresh Token

**Endpoint:** `POST /admin/refresh`

Refresh an expired access token using the refresh token.

**Request Body:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** Same as login response.

---

## Dashboard & Analytics

### Get Dashboard Statistics

**Endpoint:** `GET /admin/dashboard`

**Headers:**
- `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "totalUsers": 150,
    "totalPhoneNumbers": 200,
    "totalAgents": 180,
    "totalConversations": 5000,
    "totalMessages": 50000,
    "totalTemplates": 25,
    "totalContacts": 3000,
    "totalCampaigns": 15,
    "activeConversations": 120,
    "approvedTemplates": 20,
    "runningCampaigns": 5
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

### Get Rate Limit Statistics

**Endpoint:** `GET /admin/rate-limits`

**Headers:**
- `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "phone_number_id": "phone123",
      "display_name": "Business WhatsApp",
      "messages_sent_today": 450,
      "daily_limit": 1000,
      "tier": "standard"
    }
  ],
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

---

## User Management

### List All Users

**Endpoint:** `GET /admin/users`

**Headers:**
- `Authorization: Bearer <access_token>`

**Query Parameters:**
- `limit` (optional, default: 50) - Number of users per page
- `offset` (optional, default: 0) - Pagination offset

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": "user123",
      "email": "user@example.com",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 150,
    "limit": 50,
    "offset": 0
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

### Create New User

**Endpoint:** `POST /admin/users`

**Headers:**
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "user_id": "user123",
  "email": "user@example.com",
  "initial_credits": 1000
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": "user123",
      "email": "user@example.com",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "initial_credits": 1000
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

**Status Codes:**
- `201 Created` - User created successfully
- `400 Bad Request` - Missing required fields
- `409 Conflict` - User already exists

### Get User Details

**Endpoint:** `GET /admin/users/:userId`

**Headers:**
- `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": "user123",
      "email": "user@example.com",
      "created_at": "2024-01-01T00:00:00.000Z"
    },
    "phoneNumbers": [
      {
        "id": "phone123",
        "platform": "whatsapp",
        "meta_phone_number_id": "1234567890",
        "display_name": "Business WhatsApp"
      }
    ],
    "agents": [
      {
        "agent_id": "agent123",
        "name": "Sales Agent",
        "prompt_id": "prompt_abc123"
      }
    ],
    "remainingCredits": 500
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

### Update User

**Endpoint:** `PATCH /admin/users/:userId`

**Headers:**
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "email": "newemail@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "user123",
    "email": "newemail@example.com",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

### Delete User

**Endpoint:** `DELETE /admin/users/:userId`

**Headers:**
- `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

### Add Credits to User

**Endpoint:** `POST /admin/users/:userId/credits`

**Headers:**
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "amount": 500
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": "user123",
    "credits_added": 500,
    "remaining_credits": 1500
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

---

## Phone Number Management

### List All Phone Numbers

**Endpoint:** `GET /admin/phone-numbers`

**Headers:**
- `Authorization: Bearer <access_token>`

**Query Parameters:**
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "phone123",
      "user_id": "user123",
      "platform": "whatsapp",
      "meta_phone_number_id": "1234567890",
      "display_name": "Business WhatsApp",
      "waba_id": "waba123",
      "user_email": "user@example.com",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 200,
    "limit": 50,
    "offset": 0
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

### Add Phone Number to User

**Endpoint:** `POST /admin/users/:userId/phone-numbers`

**Headers:**
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "id": "phone123",
  "platform": "whatsapp",
  "meta_phone_number_id": "1234567890",
  "access_token": "EAABCDEFGHIabc123...",
  "display_name": "Business WhatsApp",
  "waba_id": "waba123"
}
```

**Platforms:**
- `whatsapp` - WhatsApp Business Account
- `instagram` - Instagram Account (use Instagram Account ID as meta_phone_number_id)
- `webchat` - Web Chat Widget

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "phone123",
    "user_id": "user123",
    "platform": "whatsapp",
    "meta_phone_number_id": "1234567890",
    "display_name": "Business WhatsApp",
    "waba_id": "waba123",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

**Status Codes:**
- `201 Created` - Phone number added successfully
- `400 Bad Request` - Missing required fields or invalid platform
- `404 Not Found` - User not found
- `409 Conflict` - Phone number already exists

### Update Phone Number

**Endpoint:** `PATCH /admin/phone-numbers/:phoneNumberId`

**Headers:**
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "waba_id": "new_waba123",
  "daily_message_limit": 1000,
  "tier": "standard"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "phone123",
    "waba_id": "new_waba123",
    "daily_message_limit": 1000,
    "tier": "standard"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

### Delete Phone Number from User

**Endpoint:** `DELETE /admin/users/:userId/phone-numbers/:phoneNumberId`

**Headers:**
- `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "success": true,
  "message": "Phone number deleted successfully",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

---

## Agent Management

### List All Agents

**Endpoint:** `GET /admin/agents`

**Headers:**
- `Authorization: Bearer <access_token>`

**Query Parameters:**
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "agent_id": "agent123",
      "user_id": "user123",
      "phone_number_id": "phone123",
      "prompt_id": "prompt_abc123",
      "name": "Sales Agent",
      "description": "AI agent for sales inquiries",
      "user_email": "user@example.com",
      "phone_display_name": "Business WhatsApp",
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 180,
    "limit": 50,
    "offset": 0
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

### Get Agent Details

**Endpoint:** `GET /admin/agents/:agentId`

**Headers:**
- `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "success": true,
  "data": {
    "agent_id": "agent123",
    "user_id": "user123",
    "phone_number_id": "phone123",
    "prompt_id": "prompt_abc123",
    "name": "Sales Agent",
    "description": "AI agent for sales inquiries",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

### Create Agent for User

**Endpoint:** `POST /admin/users/:userId/agents`

**Headers:**
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "phone_number_id": "phone123",
  "prompt_id": "prompt_abc123",
  "name": "Sales Agent",
  "description": "AI agent for sales inquiries"
}
```

**Important Notes:**
- `prompt_id` should be created in the OpenAI Dashboard first
- Each phone number can have one active agent
- The agent links the phone number to a specific OpenAI prompt

**Response:**
```json
{
  "success": true,
  "data": {
    "agent_id": "agent123",
    "user_id": "user123",
    "phone_number_id": "phone123",
    "prompt_id": "prompt_abc123",
    "name": "Sales Agent",
    "description": "AI agent for sales inquiries",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

**Status Codes:**
- `201 Created` - Agent created successfully
- `400 Bad Request` - Missing required fields
- `404 Not Found` - User or phone number not found

### Update Agent

**Endpoint:** `PATCH /admin/users/:userId/agents/:agentId`

**Headers:**
- `Authorization: Bearer <access_token>`
- `Content-Type: application/json`

**Request Body:**
```json
{
  "name": "Updated Sales Agent",
  "description": "Updated description",
  "prompt_id": "new_prompt_abc123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "agent_id": "agent123",
    "user_id": "user123",
    "phone_number_id": "phone123",
    "prompt_id": "new_prompt_abc123",
    "name": "Updated Sales Agent",
    "description": "Updated description",
    "created_at": "2024-01-01T00:00:00.000Z"
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

### Delete Agent

**Endpoint:** `DELETE /admin/agents/:agentId`

**Headers:**
- `Authorization: Bearer <access_token>`

**Response:**
```json
{
  "success": true,
  "message": "Agent deleted successfully",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

---

## Conversations & Messages

### List All Conversations

**Endpoint:** `GET /admin/conversations`

**Headers:**
- `Authorization: Bearer <access_token>`

**Query Parameters:**
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)
- `userId` (optional) - Filter by user ID
- `isActive` (optional) - Filter by active status (true/false)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "conversation_id": "conv123",
      "agent_id": "agent123",
      "customer_phone": "+1234567890",
      "is_active": true,
      "last_message_at": "2024-01-01T00:00:00.000Z",
      "agent_name": "Sales Agent",
      "user_id": "user123"
    }
  ],
  "pagination": {
    "total": 5000,
    "limit": 50,
    "offset": 0
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

### Get Conversation Messages

**Endpoint:** `GET /admin/conversations/:conversationId/messages`

**Headers:**
- `Authorization: Bearer <access_token>`

**Query Parameters:**
- `limit` (optional, default: 100)
- `offset` (optional, default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "message_id": "msg123",
      "conversation_id": "conv123",
      "direction": "inbound",
      "content": "Hello, I need help",
      "sequence_no": 1,
      "created_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 100,
    "offset": 0
  },
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

---

## Templates Management

### List All Templates

**Endpoint:** `GET /admin/templates`

**Headers:**
- `Authorization: Bearer <access_token>`

**Query Parameters:**
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)
- `status` (optional) - Filter by status (DRAFT, PENDING, APPROVED, REJECTED)

### Get Template Details

**Endpoint:** `GET /admin/templates/:templateId`

### Create Template

**Endpoint:** `POST /admin/templates`

### Submit Template to Meta

**Endpoint:** `POST /admin/templates/:templateId/submit`

### Delete Template

**Endpoint:** `DELETE /admin/templates/:templateId`

---

## Contacts Management

### List All Contacts

**Endpoint:** `GET /admin/contacts`

**Headers:**
- `Authorization: Bearer <access_token>`

**Query Parameters:**
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)
- `userId` (optional) - Filter by user ID

### Import Contacts

**Endpoint:** `POST /admin/contacts/import`

**Request Body:**
```json
{
  "userId": "user123",
  "contacts": [
    {
      "phone": "+1234567890",
      "name": "John Doe",
      "email": "john@example.com",
      "tags": ["customer", "vip"]
    }
  ],
  "defaultTags": ["imported"]
}
```

### Delete Contact

**Endpoint:** `DELETE /admin/contacts/:contactId`

---

## Campaigns Management

### List All Campaigns

**Endpoint:** `GET /admin/campaigns`

**Headers:**
- `Authorization: Bearer <access_token>`

**Query Parameters:**
- `limit` (optional, default: 50)
- `offset` (optional, default: 0)
- `status` (optional) - Filter by status
- `userId` (optional) - Filter by user ID

### Get Campaign Details

**Endpoint:** `GET /admin/campaigns/:campaignId`

### Create Campaign

**Endpoint:** `POST /admin/campaigns`

### Start Campaign

**Endpoint:** `POST /admin/campaigns/:campaignId/start`

### Pause Campaign

**Endpoint:** `POST /admin/campaigns/:campaignId/pause`

### Resume Campaign

**Endpoint:** `POST /admin/campaigns/:campaignId/resume`

### Cancel Campaign

**Endpoint:** `POST /admin/campaigns/:campaignId/cancel`

### Delete Campaign

**Endpoint:** `DELETE /admin/campaigns/:campaignId`

---

## Error Responses

All endpoints follow a consistent error response format:

```json
{
  "error": "Error Type",
  "message": "Detailed error message",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "correlationId": "abc-123"
}
```

### Common Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Missing or invalid authentication
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Server error

---

## Testing Admin API

### Example: Create Complete User Setup

1. **Create User:**
```bash
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "email": "user@example.com",
    "initial_credits": 1000
  }'
```

2. **Add WhatsApp Phone Number:**
```bash
curl -X POST http://localhost:3000/admin/users/user123/phone-numbers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "phone123",
    "platform": "whatsapp",
    "meta_phone_number_id": "1234567890",
    "access_token": "EAABCDEFGHIabc123...",
    "display_name": "Business WhatsApp",
    "waba_id": "waba123"
  }'
```

3. **Create Agent with OpenAI Prompt:**
```bash
curl -X POST http://localhost:3000/admin/users/user123/agents \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number_id": "phone123",
    "prompt_id": "prompt_abc123",
    "name": "Sales Agent",
    "description": "AI agent for sales inquiries"
  }'
```

4. **Add More Credits:**
```bash
curl -X POST http://localhost:3000/admin/users/user123/credits \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500
  }'
```

---

## Notes

- All timestamps are in ISO 8601 format (UTC)
- All requests include a `correlationId` for tracing
- Admin authentication tokens expire after 1 hour by default
- Use refresh tokens to obtain new access tokens without re-authenticating
