# External Campaign API Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:4000/api/v1`

This API allows external systems to manage WhatsApp template message campaigns. Designed for internal microservice communication (no API key required).

---

## Table of Contents

1. [List Campaigns](#list-campaigns)
2. [Create Campaign](#create-campaign)
3. [Get Campaign Status](#get-campaign-status)
4. [Data Models](#data-models)
5. [Error Handling](#error-handling)

---

## Endpoints

### List Campaigns

Get all campaigns for a user with optional filtering.

**Endpoint:** `GET /api/v1/campaigns`

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | string | Yes | User ID to list campaigns for |
| `phone_number_id` | string | No | Filter by phone number ID |
| `status` | string | No | Filter by status (see [Campaign Status](#campaign-status)) |
| `limit` | number | No | Max results (default: 50, max: 100) |
| `offset` | number | No | Pagination offset (default: 0) |

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "campaign_id": "cmp_abc123",
      "name": "January Promotion",
      "description": "New year promotion for existing customers",
      "status": "RUNNING",
      "template_id": "tpl_welcome_001",
      "template_name": "welcome_message",
      "phone_number_id": "pn_abc123",
      "total_recipients": 100,
      "sent_count": 50,
      "delivered_count": 45,
      "read_count": 30,
      "failed_count": 2,
      "progress_percent": 50,
      "started_at": "2024-01-15T10:00:00.000Z",
      "completed_at": null,
      "created_at": "2024-01-15T09:00:00.000Z"
    }
  ],
  "pagination": {
    "total": 25,
    "limit": 50,
    "offset": 0,
    "has_more": false
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "correlationId": "1705312200000-abc123"
}
```

**Example Requests:**

```bash
# List all campaigns for a user
curl "http://localhost:4000/api/v1/campaigns?user_id=user_xyz"

# List running campaigns only
curl "http://localhost:4000/api/v1/campaigns?user_id=user_xyz&status=RUNNING"

# List campaigns for specific phone number with pagination
curl "http://localhost:4000/api/v1/campaigns?user_id=user_xyz&phone_number_id=pn_abc123&limit=10&offset=0"

# Filter by completed status
curl "http://localhost:4000/api/v1/campaigns?user_id=user_xyz&status=COMPLETED&limit=20"
```

---

### Create Campaign

Create a bulk messaging campaign for multiple contacts.

**Endpoint:** `POST /api/v1/campaign`

**Request Body:**
```json
{
  "phone_number_id": "pn_abc123",
  "template_id": "tpl_welcome_001",
  "name": "January Promotion",
  "description": "New year promotion for existing customers",
  "contacts": [
    {
      "phone": "+14155551234",
      "name": "John Doe",
      "email": "john@example.com",
      "company": "Acme Corp",
      "variables": {
        "1": "John",
        "2": "special discount"
      }
    },
    {
      "phone": "+14155555678",
      "name": "Jane Smith",
      "variables": {
        "1": "Jane",
        "2": "exclusive offer"
      }
    }
  ],
  "schedule": {
    "type": "IMMEDIATE"
  }
}
```

**Request Fields:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone_number_id` | string | Yes | Internal phone number ID |
| `template_id` | string | Yes | Template ID to send |
| `name` | string | No | Campaign name (auto-generated if not provided) |
| `description` | string | No | Campaign description |
| `contacts` | array | Yes | Array of contact objects (max 10,000) |
| `contacts[].phone` | string | Yes | Phone number in E.164 format |
| `contacts[].name` | string | No | Contact's name |
| `contacts[].email` | string | No | Contact's email |
| `contacts[].company` | string | No | Contact's company |
| `contacts[].variables` | object | No | Per-contact template variable values |
| `schedule` | object | No | Schedule configuration |
| `schedule.type` | string | No | `IMMEDIATE` or `SCHEDULED` (default: IMMEDIATE) |
| `schedule.scheduled_at` | string | No | ISO 8601 datetime for SCHEDULED type |

**Response:**
```json
{
  "success": true,
  "data": {
    "campaign_id": "cmp_abc123",
    "name": "January Promotion",
    "status": "RUNNING",
    "total_recipients": 2,
    "credits_deducted": 2,
    "credits_remaining": 98,
    "schedule": {
      "type": "IMMEDIATE",
      "scheduled_at": null
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "correlationId": "1705312200000-abc123"
}
```

**Example Request:**
```bash
curl -X POST "http://localhost:4000/api/v1/campaign" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number_id": "pn_abc123",
    "template_id": "tpl_welcome_001",
    "name": "January Promotion",
    "contacts": [
      {
        "phone": "+14155551234",
        "name": "John Doe",
        "variables": { "1": "John" }
      }
    ]
  }'
```

---

### Get Campaign Status

Get the current status and progress of a specific campaign.

**Endpoint:** `GET /api/v1/campaign/:campaignId`

**Path Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `campaignId` | string | Yes | The campaign ID |

**Response:**
```json
{
  "success": true,
  "data": {
    "campaign_id": "cmp_abc123",
    "name": "January Promotion",
    "status": "RUNNING",
    "total_recipients": 100,
    "sent_count": 50,
    "delivered_count": 45,
    "read_count": 30,
    "failed_count": 2,
    "progress_percent": 50,
    "started_at": "2024-01-15T10:00:00.000Z",
    "completed_at": null,
    "recipient_stats": {
      "PENDING": 48,
      "SENT": 3,
      "DELIVERED": 15,
      "READ": 30,
      "FAILED": 2,
      "SKIPPED": 2
    }
  },
  "timestamp": "2024-01-15T10:30:00.000Z",
  "correlationId": "1705312200000-abc123"
}
```

**Example Request:**
```bash
curl "http://localhost:4000/api/v1/campaign/cmp_abc123"
```

---

## Data Models

### Campaign Status

| Status | Description |
|--------|-------------|
| `DRAFT` | Campaign created but not started |
| `SCHEDULED` | Campaign scheduled for future execution |
| `RUNNING` | Campaign is actively sending messages |
| `PAUSED` | Campaign execution paused |
| `COMPLETED` | All messages sent successfully |
| `FAILED` | Campaign failed due to an error |
| `CANCELLED` | Campaign was cancelled |

### Recipient Status

| Status | Description |
|--------|-------------|
| `PENDING` | Message not yet sent |
| `QUEUED` | Message queued for sending |
| `SENT` | Message sent to WhatsApp |
| `DELIVERED` | Message delivered to recipient |
| `READ` | Message read by recipient |
| `FAILED` | Message failed to send |
| `SKIPPED` | Recipient skipped (opted out, invalid, etc.) |

### Skip Reasons

| Reason | Description |
|--------|-------------|
| `OPTED_OUT` | Contact opted out of messages |
| `RATE_LIMITED` | Rate limit reached |
| `INVALID_PHONE` | Invalid phone number format |
| `DUPLICATE` | Duplicate contact in campaign |
| `RECENTLY_CONTACTED` | Contact was recently messaged |

---

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error Type",
  "message": "Detailed error message",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "correlationId": "1705312200000-abc123"
}
```

### Common Error Codes

| HTTP Status | Error | Description |
|-------------|-------|-------------|
| 400 | Bad Request | Missing or invalid parameters |
| 404 | Not Found | Campaign or resource not found |
| 402 | Payment Required | Insufficient credits |
| 500 | Internal Server Error | Server-side error |

### Example Error Responses

**Missing user_id:**
```json
{
  "success": false,
  "error": "Bad Request",
  "message": "user_id query parameter is required",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "correlationId": "1705312200000-abc123"
}
```

**Campaign not found:**
```json
{
  "success": false,
  "error": "Not Found",
  "message": "Campaign not found",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "correlationId": "1705312200000-abc123"
}
```

**Insufficient credits:**
```json
{
  "success": false,
  "error": "Insufficient Credits",
  "message": "You need 100 credits but only have 50",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "correlationId": "1705312200000-abc123"
}
```

---

## Rate Limiting & Credits

- **Credit Cost:** 1 credit per message sent
- **Max Contacts:** 10,000 contacts per campaign (configurable via `CAMPAIGNS_MAX_RECIPIENTS`)
- **Batch Processing:** Campaigns process 50 contacts per batch with 5-second delays
- **List Pagination:** Maximum 100 items per request

---

## Workflow Example

### 1. List existing campaigns
```bash
curl "http://localhost:4000/api/v1/campaigns?user_id=user_xyz"
```

### 2. Create a new campaign
```bash
curl -X POST "http://localhost:4000/api/v1/campaign" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number_id": "pn_abc123",
    "template_id": "tpl_welcome_001",
    "name": "Welcome Campaign",
    "contacts": [
      { "phone": "+14155551234", "name": "John", "variables": { "1": "John" } },
      { "phone": "+14155555678", "name": "Jane", "variables": { "1": "Jane" } }
    ]
  }'
```

### 3. Monitor campaign progress
```bash
curl "http://localhost:4000/api/v1/campaign/cmp_abc123"
```

### 4. List completed campaigns
```bash
curl "http://localhost:4000/api/v1/campaigns?user_id=user_xyz&status=COMPLETED"
```
