# Leads & Messages API - Dashboard Integration Guide

**For:** Dashboard/Frontend Developers  
**Version:** 1.0.0  
**Last Updated:** December 16, 2025

---

## Overview

This guide explains how to fetch **interacted leads** (customers who have communicated via WhatsApp, Instagram, or Webchat) and their **conversation messages** using the Chat Agent API.

**No authentication required** - These are internal APIs for dashboard integration.

```
┌──────────────────┐                         ┌─────────────────┐
│    Dashboard     │                         │   Chat Agent    │
│    (Frontend)    │  ─────── HTTP ────────► │     Server      │
│                  │       No Auth!          │                 │
└──────────────────┘                         └─────────────────┘
         │                                           │
         │  1. GET /users/:user_id/leads             │
         │     (Get leads with search & filters)     │
         │                                           │
         │  2. GET /users/:user_id/leads/:phone/messages
         │     (Get messages for a lead)             │
         └───────────────────────────────────────────┘
```

### Base URL Configuration

```env
# Frontend .env
VITE_API_BASE_URL=http://localhost:4000
```

```typescript
// api.ts - Base configuration
const API_BASE = import.meta.env.VITE_API_BASE_URL;

// Helper function for API calls
async function apiCall<T>(endpoint: string): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`);
  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }
  return response.json();
}
```

---

## Integration Flow

The recommended flow for viewing leads and their messages:

```
Step 1: Get Leads (with Search & Filters)
─────────────────────────────────────
GET /users/:user_id/leads?search=john
     │
     │  ✅ Supports text search across:
     │     - name, email, company, phone
     │  ✅ Filter by platform, agent, date, status
     │  ✅ Pagination & sorting
     │
     │  Returns: Leads with contact info
     │  - name, email, company, phone
     │  - platform (whatsapp/instagram/webchat)
     │  - agent info, lead scores
     │
     ▼
Step 2: Get Messages for Selected Lead
─────────────────────────────────────
GET /users/:user_id/leads/:customer_phone/messages
     │
     │  Returns: All messages across conversations
     │  - message text, sender, timestamp
     │  - conversation grouping
     │  - platform info
     │
     ▼
Display in Dashboard
```

---

## API Endpoints

### Quick Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/:user_id/leads` | **Get leads with search & filters** |
| GET | `/users/:user_id/leads/stats` | Get lead statistics |
| GET | `/users/:user_id/leads/:phone` | Get single lead details |
| GET | `/users/:user_id/leads/:phone/messages` | Get messages for a lead |
| GET | `/users/:user_id/messages/:message_id/status` | **Get message status & failure reason** |

---

## Step 1: Get Leads (with Search)

Retrieve leads with **full-text search** across name, email, company, and phone number. Supports comprehensive filtering by platform, agent, date, and lead status.

### Endpoint

```http
GET /users/:user_id/leads
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | string | Yes | Your user identifier |

### Query Parameters (All Filters)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| **🔍 Search** |
| `search` | string | - | **Text search** in name, email, company, phone |
| `customer_phone` | string | - | Exact phone number match |
| **📱 Platform Filter** |
| `platform` | string | - | Comma-separated: `whatsapp,instagram,webchat` |
| `phone_number_id` | string | - | Filter by specific channel ID |
| **🤖 Agent Filter** |
| `agent_id` | string | - | Filter by specific agent |
| **📅 Date Filters** |
| `start_date` | ISO date | - | Filter from date (e.g., `2025-12-01`) |
| `end_date` | ISO date | - | Filter to date (e.g., `2025-12-16`) |
| `date` | ISO date | - | Filter specific date only |
| `days` | integer | - | Filter last N days |
| **📊 Lead Status Filters** |
| `lead_status` | string | - | Comma-separated: `Hot,Warm,Cold` |
| `min_total_score` | integer | - | Minimum lead score (5-15) |
| `max_total_score` | integer | - | Maximum lead score (5-15) |
| `has_extraction` | boolean | - | Has lead scoring data |
| `has_email` | boolean | - | Has extracted email |
| `has_conversation` | boolean | - | Has at least one conversation |
| `is_active` | boolean | - | Has active conversation |
| **📄 Pagination** |
| `limit` | integer | 50 | Results per page (max 100) |
| `offset` | integer | 0 | Skip count for pagination |
| **🔀 Sorting** |
| `sort_by` | string | `last_message_at` | Sort field (see options below) |
| `sort_order` | string | `desc` | Sort direction: `asc` or `desc` |

### Sort Options

| Value | Description |
|-------|-------------|
| `last_message_at` | Most recent activity (default) |
| `created_at` | First contact date |
| `total_score` | Lead score (highest first) |
| `name` | Alphabetical by name |
| `total_messages` | Message count |

### Response Structure

```typescript
interface LeadsResponse {
  success: true;
  data: Lead[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
  timestamp: string;
  correlationId: string;
}

interface Lead {
  // Contact Information
  customer_phone: string;       // E.164 format: +14155551234
  name: string | null;          // Extracted/imported name
  email: string | null;         // Extracted/imported email
  company: string | null;       // Extracted/imported company
  
  // Platform & Agent Info
  platforms: string[];          // ['whatsapp', 'instagram'] - all platforms used
  conversation_count: number;   // Number of conversations
  total_messages: number;       // Total message count
  
  // Lead Scoring
  lead_status: 'Hot' | 'Warm' | 'Cold' | null;
  total_score: number | null;   // 5-15
  intent_score: number | null;  // 1-3
  urgency_score: number | null; // 1-3
  budget_score: number | null;  // 1-3
  fit_score: number | null;     // 1-3
  engagement_score: number | null; // 1-3
  has_extraction: boolean;      // Has lead scoring data
  extraction_id: string | null;
  
  // Activity
  last_message_at: string | null;
  last_message_text: string | null;
  last_message_sender: 'user' | 'agent' | null;
  first_contact_at: string;
  
  // Conversations Summary
  conversations: ConversationSummary[];
}

interface ConversationSummary {
  conversation_id: string;
  agent_id: string;
  agent_name: string;
  platform: 'whatsapp' | 'instagram' | 'webchat';
  phone_number_id: string;
  message_count: number;
  is_active: boolean;
  created_at: string;
  last_message_at: string;
}
```

### Sample Response

```json
{
  "success": true,
  "data": [
    {
      "customer_phone": "+14155551234",
      "name": "John Doe",
      "email": "john.doe@acmecorp.com",
      "company": "Acme Corporation",
      "lead_status": "Hot",
      "total_score": 13,
      "intent_score": 3,
      "urgency_score": 2,
      "budget_score": 3,
      "fit_score": 3,
      "engagement_score": 2,
      "has_extraction": true,
      "extraction_id": "550e8400-e29b-41d4-a716-446655440000",
      "platforms": ["whatsapp", "webchat"],
      "conversation_count": 2,
      "total_messages": 24,
      "template_sends_count": 3,
      "last_message_at": "2025-12-16T10:30:00.000Z",
      "last_message_text": "Yes, I'd like to schedule a demo for next week",
      "last_message_sender": "user",
      "first_contact_at": "2025-12-10T08:15:00.000Z",
      "conversations": [
        {
          "conversation_id": "conv_abc123",
          "agent_id": "agent_sales_001",
          "agent_name": "Sales Assistant",
          "platform": "whatsapp",
          "phone_number_id": "pn_wa_456",
          "message_count": 18,
          "is_active": true,
          "created_at": "2025-12-10T08:15:00.000Z",
          "last_message_at": "2025-12-16T10:30:00.000Z"
        },
        {
          "conversation_id": "conv_def789",
          "agent_id": "agent_support_002",
          "agent_name": "Support Bot",
          "platform": "webchat",
          "phone_number_id": "pn_wc_789",
          "message_count": 6,
          "is_active": false,
          "created_at": "2025-12-12T14:20:00.000Z",
          "last_message_at": "2025-12-12T14:45:00.000Z"
        }
      ]
    },
    {
      "customer_phone": "+14155559876",
      "name": "Jane Smith",
      "email": null,
      "company": "TechStart Inc",
      "lead_status": "Warm",
      "total_score": 9,
      "intent_score": 2,
      "urgency_score": 1,
      "budget_score": 2,
      "fit_score": 2,
      "engagement_score": 2,
      "has_extraction": true,
      "extraction_id": "550e8400-e29b-41d4-a716-446655440001",
      "platforms": ["instagram"],
      "conversation_count": 1,
      "total_messages": 8,
      "template_sends_count": 0,
      "last_message_at": "2025-12-15T16:45:00.000Z",
      "last_message_text": "Thanks for the info, I'll think about it",
      "last_message_sender": "user",
      "first_contact_at": "2025-12-15T14:00:00.000Z",
      "conversations": [
        {
          "conversation_id": "conv_ghi456",
          "agent_id": "agent_insta_003",
          "agent_name": "Instagram Bot",
          "platform": "instagram",
          "phone_number_id": "pn_ig_123",
          "message_count": 8,
          "is_active": true,
          "created_at": "2025-12-15T14:00:00.000Z",
          "last_message_at": "2025-12-15T16:45:00.000Z"
        }
      ]
    },
    {
      "customer_phone": "+14155554321",
      "name": null,
      "email": null,
      "company": null,
      "lead_status": null,
      "total_score": null,
      "intent_score": null,
      "urgency_score": null,
      "budget_score": null,
      "fit_score": null,
      "engagement_score": null,
      "has_extraction": false,
      "extraction_id": null,
      "platforms": ["whatsapp"],
      "conversation_count": 1,
      "total_messages": 3,
      "template_sends_count": 1,
      "last_message_at": "2025-12-16T09:00:00.000Z",
      "last_message_text": "Hi, I saw your ad",
      "last_message_sender": "user",
      "first_contact_at": "2025-12-16T09:00:00.000Z",
      "conversations": [
        {
          "conversation_id": "conv_jkl012",
          "agent_id": "agent_sales_001",
          "agent_name": "Sales Assistant",
          "platform": "whatsapp",
          "phone_number_id": "pn_wa_456",
          "message_count": 3,
          "is_active": true,
          "created_at": "2025-12-16T09:00:00.000Z",
          "last_message_at": "2025-12-16T09:00:00.000Z"
        }
      ]
    }
  ],
  "pagination": {
    "total": 156,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  },
  "timestamp": "2025-12-16T11:00:00.000Z",
  "correlationId": "req_abc123xyz"
}
```

---

## Search Examples

### 🔍 Search by Name

```typescript
// Search for leads named "John"
const response = await fetch(
  `${API_BASE}/users/${userId}/leads?search=john`
);
```

### 🔍 Search by Phone Number

```typescript
// Search by partial phone number
const response = await fetch(
  `${API_BASE}/users/${userId}/leads?search=415555`
);

// Or exact match
const response = await fetch(
  `${API_BASE}/users/${userId}/leads?customer_phone=%2B14155551234`
);
```

### 🔍 Search by Email

```typescript
// Search for leads with gmail
const response = await fetch(
  `${API_BASE}/users/${userId}/leads?search=gmail.com`
);
```

### 🔍 Search by Company

```typescript
// Search for leads from Acme
const response = await fetch(
  `${API_BASE}/users/${userId}/leads?search=acme`
);
```

---

## Filter Examples

### 📱 Filter by Platform

```typescript
// Get only WhatsApp leads
const whatsappLeads = await fetch(
  `${API_BASE}/users/${userId}/leads?platform=whatsapp`
);

// Get only Instagram leads
const instagramLeads = await fetch(
  `${API_BASE}/users/${userId}/leads?platform=instagram`
);

// Get WhatsApp AND Instagram (exclude webchat)
const socialLeads = await fetch(
  `${API_BASE}/users/${userId}/leads?platform=whatsapp,instagram`
);

// Filter by specific channel ID
const channelLeads = await fetch(
  `${API_BASE}/users/${userId}/leads?phone_number_id=${channelId}`
);
```

### 🤖 Filter by Agent

```typescript
// Get leads handled by specific agent
const agentLeads = await fetch(
  `${API_BASE}/users/${userId}/leads?agent_id=${agentId}`
);
```

### 📅 Filter by Date

```typescript
// Get leads from last 7 days
const recentLeads = await fetch(
  `${API_BASE}/users/${userId}/leads?days=7`
);

// Get leads from date range
const rangeLeads = await fetch(
  `${API_BASE}/users/${userId}/leads?start_date=2025-12-01&end_date=2025-12-16`
);

// Get leads from specific date
const dayLeads = await fetch(
  `${API_BASE}/users/${userId}/leads?date=2025-12-15`
);
```

### 📊 Filter by Lead Status

```typescript
// Get only Hot leads
const hotLeads = await fetch(
  `${API_BASE}/users/${userId}/leads?lead_status=Hot`
);

// Get Hot and Warm leads
const qualifiedLeads = await fetch(
  `${API_BASE}/users/${userId}/leads?lead_status=Hot,Warm`
);

// Get high-scoring leads (score >= 12)
const highScoreLeads = await fetch(
  `${API_BASE}/users/${userId}/leads?min_total_score=12`
);

// Get leads with extracted email
const emailLeads = await fetch(
  `${API_BASE}/users/${userId}/leads?has_email=true`
);
```

---

## Combined Search + Filters Example

```typescript
interface LeadSearchParams {
  // Search
  search?: string;
  customerPhone?: string;
  
  // Platform & Agent
  platform?: string;        // comma-separated
  phoneNumberId?: string;
  agentId?: string;
  
  // Date
  startDate?: string;
  endDate?: string;
  days?: number;
  
  // Lead Status
  leadStatus?: string;      // comma-separated: Hot,Warm,Cold
  minScore?: number;
  maxScore?: number;
  hasEmail?: boolean;
  hasExtraction?: boolean;
  isActive?: boolean;
  
  // Pagination
  page?: number;
  pageSize?: number;
  
  // Sorting
  sortBy?: 'last_message_at' | 'created_at' | 'total_score' | 'name' | 'total_messages';
  sortOrder?: 'asc' | 'desc';
}

async function searchLeads(userId: string, params: LeadSearchParams = {}) {
  const queryParams = new URLSearchParams();
  
  // Search
  if (params.search) queryParams.set('search', params.search);
  if (params.customerPhone) queryParams.set('customer_phone', params.customerPhone);
  
  // Platform & Agent
  if (params.platform) queryParams.set('platform', params.platform);
  if (params.phoneNumberId) queryParams.set('phone_number_id', params.phoneNumberId);
  if (params.agentId) queryParams.set('agent_id', params.agentId);
  
  // Date filters
  if (params.startDate) queryParams.set('start_date', params.startDate);
  if (params.endDate) queryParams.set('end_date', params.endDate);
  if (params.days) queryParams.set('days', String(params.days));
  
  // Lead Status
  if (params.leadStatus) queryParams.set('lead_status', params.leadStatus);
  if (params.minScore) queryParams.set('min_total_score', String(params.minScore));
  if (params.maxScore) queryParams.set('max_total_score', String(params.maxScore));
  if (params.hasEmail !== undefined) queryParams.set('has_email', String(params.hasEmail));
  if (params.hasExtraction !== undefined) queryParams.set('has_extraction', String(params.hasExtraction));
  if (params.isActive !== undefined) queryParams.set('is_active', String(params.isActive));
  
  // Pagination
  const page = params.page || 1;
  const pageSize = params.pageSize || 20;
  queryParams.set('limit', String(pageSize));
  queryParams.set('offset', String((page - 1) * pageSize));
  
  // Sorting
  if (params.sortBy) queryParams.set('sort_by', params.sortBy);
  if (params.sortOrder) queryParams.set('sort_order', params.sortOrder);

  const response = await fetch(
    `${API_BASE}/users/${userId}/leads?${queryParams}`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch leads: ${response.status}`);
  }

  return response.json();
}

// Usage Examples:

// Search "john" in WhatsApp leads from last 7 days
const result1 = await searchLeads('user_123', {
  search: 'john',
  platform: 'whatsapp',
  days: 7
});

// Get Hot leads handled by specific agent
const result2 = await searchLeads('user_123', {
  agentId: 'agent_456',
  leadStatus: 'Hot',
  sortBy: 'total_score',
  sortOrder: 'desc'
});

// Search by email domain, with email filter
const result3 = await searchLeads('user_123', {
  search: '@company.com',
  hasEmail: true,
  page: 1,
  pageSize: 50
});
```

---

## Step 2: Get Messages for a Lead

Once you have a lead's phone number, fetch all their messages across all conversations.

### Endpoint

```http
GET /users/:user_id/leads/:customer_phone/messages
```

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | string | Yes | Your user identifier |
| `customer_phone` | string | Yes | Lead's phone number (URL encoded) |

> **Note:** Phone numbers with `+` sign must be URL encoded. Example: `+14155551234` → `%2B14155551234`

### Query Parameters (Filters)

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| **Pagination** |
| `limit` | integer | 50 | Results per page (max 200) |
| `offset` | integer | 0 | Skip count for pagination |
| **Filters** |
| `platform` | string | - | Comma-separated: `whatsapp,instagram,webchat` |
| `conversation_id` | string | - | Filter to specific conversation |
| `sender` | string | - | Filter by sender: `user` or `agent` |
| **Date Filters** |
| `start_date` | ISO date | - | Messages from date |
| `end_date` | ISO date | - | Messages to date |
| `date` | ISO date | - | Messages on specific date |
| `days` | integer | - | Messages from last N days |

### Response Structure

```typescript
interface LeadMessagesResponse {
  success: true;
  data: {
    customer_phone: string;
    conversations: ConversationMessages[];
    messages: Message[];
    pagination: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  };
  timestamp: string;
  correlationId: string;
}

interface ConversationMessages {
  conversation_id: string;
  agent_id: string;
  agent_name: string;
  platform: 'whatsapp' | 'instagram' | 'webchat';
  phone_number_id: string;
  phone_display_name: string;
  is_active: boolean;
  created_at: string;
  last_message_at: string;
  message_count: number;
}

interface Message {
  message_id: string;
  conversation_id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
  sequence_no: number;
  platform_message_id: string | null;
  
  // Joined from conversation
  agent_name: string;
  platform: string;
  
  // Template info
  is_template: boolean;         // true if message was sent as a template
  template_id: string | null;   // Template ID if is_template is true
}
```

### Sample Response

```json
{
  "success": true,
  "data": {
    "customer_phone": "+14155551234",
    "conversations": [
      {
        "conversation_id": "conv_abc123",
        "agent_id": "agent_sales_001",
        "agent_name": "Sales Assistant",
        "platform": "whatsapp",
        "phone_number_id": "pn_wa_456",
        "phone_display_name": "+1 (800) 555-0100",
        "is_active": true,
        "created_at": "2025-12-10T08:15:00.000Z",
        "last_message_at": "2025-12-16T10:30:00.000Z",
        "message_count": 18
      },
      {
        "conversation_id": "conv_def789",
        "agent_id": "agent_support_002",
        "agent_name": "Support Bot",
        "platform": "webchat",
        "phone_number_id": "pn_wc_789",
        "phone_display_name": "Website Chat",
        "is_active": false,
        "created_at": "2025-12-12T14:20:00.000Z",
        "last_message_at": "2025-12-12T14:45:00.000Z",
        "message_count": 6
      }
    ],
    "messages": [
      {
        "message_id": "msg_001",
        "conversation_id": "conv_abc123",
        "sender": "user",
        "text": "Hi, I'm interested in your enterprise plan",
        "timestamp": "2025-12-10T08:15:00.000Z",
        "status": "delivered",
        "sequence_no": 1,
        "platform_message_id": "wamid.abc123",
        "agent_name": "Sales Assistant",
        "platform": "whatsapp",
        "is_template": false,
        "template_id": null
      },
      {
        "message_id": "msg_002",
        "conversation_id": "conv_abc123",
        "sender": "agent",
        "text": "Hello! Thank you for reaching out. I'd be happy to help you with our enterprise plan. Could you tell me more about your company size and requirements?",
        "timestamp": "2025-12-10T08:15:30.000Z",
        "status": "read",
        "sequence_no": 2,
        "platform_message_id": "wamid.def456",
        "agent_name": "Sales Assistant",
        "platform": "whatsapp",
        "is_template": false,
        "template_id": null
      },
      {
        "message_id": "msg_003",
        "conversation_id": "conv_abc123",
        "sender": "user",
        "text": "We're Acme Corp, about 500 employees. We need a solution for customer support automation",
        "timestamp": "2025-12-10T08:20:00.000Z",
        "status": "delivered",
        "sequence_no": 3,
        "platform_message_id": "wamid.ghi789",
        "agent_name": "Sales Assistant",
        "platform": "whatsapp",
        "is_template": false,
        "template_id": null
      },
      {
        "message_id": "msg_008",
        "conversation_id": "conv_abc123",
        "sender": "agent",
        "text": "Hi John! Thanks for your interest in Acme Corp. Here's your personalized demo link: https://demo.example.com/abc123",
        "timestamp": "2025-12-10T08:21:00.000Z",
        "status": "delivered",
        "sequence_no": 4,
        "platform_message_id": "wamid.template001",
        "agent_name": "Sales Assistant",
        "platform": "whatsapp",
        "is_template": true,
        "template_id": "tpl_welcome_demo_v1"
      },
      {
        "message_id": "msg_004",
        "conversation_id": "conv_abc123",
        "sender": "agent",
        "text": "That's great! Our Enterprise plan is perfect for companies your size. It includes:\n\n✅ Unlimited AI conversations\n✅ Multi-channel support (WhatsApp, Instagram, Web)\n✅ Lead scoring & analytics\n✅ CRM integrations\n\nWould you like to schedule a demo?",
        "timestamp": "2025-12-10T08:20:45.000Z",
        "status": "read",
        "sequence_no": 5,
        "platform_message_id": "wamid.jkl012",
        "agent_name": "Sales Assistant",
        "platform": "whatsapp",
        "is_template": false,
        "template_id": null
      },
      {
        "message_id": "msg_005",
        "conversation_id": "conv_abc123",
        "sender": "user",
        "text": "Yes, I'd like to schedule a demo for next week",
        "timestamp": "2025-12-16T10:30:00.000Z",
        "status": "delivered",
        "sequence_no": 6,
        "platform_message_id": "wamid.mno345",
        "agent_name": "Sales Assistant",
        "platform": "whatsapp",
        "is_template": false,
        "template_id": null
      },
      {
        "message_id": "msg_006",
        "conversation_id": "conv_def789",
        "sender": "user",
        "text": "Quick question about pricing",
        "timestamp": "2025-12-12T14:20:00.000Z",
        "status": "delivered",
        "sequence_no": 1,
        "platform_message_id": null,
        "agent_name": "Support Bot",
        "platform": "webchat",
        "is_template": false,
        "template_id": null
      },
      {
        "message_id": "msg_007",
        "conversation_id": "conv_def789",
        "sender": "agent",
        "text": "Hi! I can help with pricing. Our plans start at $99/month. You can view full pricing at our website or I can connect you with sales.",
        "timestamp": "2025-12-12T14:20:30.000Z",
        "status": "sent",
        "sequence_no": 2,
        "platform_message_id": null,
        "agent_name": "Support Bot",
        "platform": "webchat",
        "is_template": false,
        "template_id": null
      }
    ],
    "pagination": {
      "total": 24,
      "limit": 50,
      "offset": 0,
      "hasMore": false
    }
  },
  "timestamp": "2025-12-16T11:00:00.000Z",
  "correlationId": "req_xyz789abc"
}
```

### Example: Get All Messages for a Lead

```typescript
// Note: URL encode the phone number
const phone = '+14155551234';
const encodedPhone = encodeURIComponent(phone);

const response = await fetch(
  `${API_BASE}/users/${userId}/leads/${encodedPhone}/messages`
);
const { data } = await response.json();

// Show conversation summary
console.log(`Lead: ${data.customer_phone}`);
console.log(`Total Conversations: ${data.conversations.length}`);

data.conversations.forEach(conv => {
  console.log(`
    Platform: ${conv.platform}
    Agent: ${conv.agent_name}
    Messages: ${conv.message_count}
    Active: ${conv.is_active}
  `);
});

// Show messages
data.messages.forEach(msg => {
  console.log(`[${msg.sender}] ${msg.text}`);
});
```

### Example: Filter Messages by Platform

```typescript
// Get only WhatsApp messages
const whatsappMessages = await fetch(
  `${API_BASE}/users/${userId}/leads/${encodedPhone}/messages?platform=whatsapp`
);

// Get only Instagram messages
const instagramMessages = await fetch(
  `${API_BASE}/users/${userId}/leads/${encodedPhone}/messages?platform=instagram`
);

// Get WhatsApp and Instagram (exclude webchat)
const socialMessages = await fetch(
  `${API_BASE}/users/${userId}/leads/${encodedPhone}/messages?platform=whatsapp,instagram`
);
```

### Example: Filter Messages by Date

```typescript
// Get messages from last 7 days
const recentMessages = await fetch(
  `${API_BASE}/users/${userId}/leads/${encodedPhone}/messages?days=7`
);

// Get messages from specific date range
const rangeMessages = await fetch(
  `${API_BASE}/users/${userId}/leads/${encodedPhone}/messages` +
  `?start_date=2025-12-01&end_date=2025-12-15`
);

// Get messages from specific date
const dayMessages = await fetch(
  `${API_BASE}/users/${userId}/leads/${encodedPhone}/messages?date=2025-12-10`
);
```

### Example: Filter by Sender

```typescript
// Get only customer messages
const customerMessages = await fetch(
  `${API_BASE}/users/${userId}/leads/${encodedPhone}/messages?sender=user`
);

// Get only agent responses
const agentMessages = await fetch(
  `${API_BASE}/users/${userId}/leads/${encodedPhone}/messages?sender=agent`
);
```

### Example: Paginated Message Loading

```typescript
async function getLeadMessages(
  userId: string, 
  phone: string, 
  options: {
    platform?: string;
    conversationId?: string;
    sender?: 'user' | 'agent';
    startDate?: string;
    endDate?: string;
    days?: number;
    page?: number;
    pageSize?: number;
  } = {}
) {
  const params = new URLSearchParams({
    limit: String(options.pageSize || 50),
    offset: String(((options.page || 1) - 1) * (options.pageSize || 50))
  });

  if (options.platform) {
    params.set('platform', options.platform);
  }
  if (options.conversationId) {
    params.set('conversation_id', options.conversationId);
  }
  if (options.sender) {
    params.set('sender', options.sender);
  }
  if (options.startDate) {
    params.set('start_date', options.startDate);
  }
  if (options.endDate) {
    params.set('end_date', options.endDate);
  }
  if (options.days) {
    params.set('days', String(options.days));
  }

  const encodedPhone = encodeURIComponent(phone);
  const response = await fetch(
    `${API_BASE}/users/${userId}/leads/${encodedPhone}/messages?${params}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.status}`);
  }

  return response.json();
}

// Usage
const result = await getLeadMessages('user_123', '+14155551234', {
  platform: 'whatsapp',
  days: 30,
  page: 1,
  pageSize: 50
});

console.log(`Showing ${result.data.messages.length} of ${result.data.pagination.total} messages`);
```

---

## Complete React Integration

Here's a full example of a React hook for lead management with search:

```typescript
// hooks/useLeads.ts
import { useState, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL;

interface Lead {
  customer_phone: string;
  name: string | null;
  email: string | null;
  company: string | null;
  platforms: string[];
  conversation_count: number;
  total_messages: number;
  lead_status: 'Hot' | 'Warm' | 'Cold' | null;
  total_score: number | null;
  has_extraction: boolean;
  last_message_at: string | null;
  last_message_text: string | null;
  last_message_sender: 'user' | 'agent' | null;
  first_contact_at: string;
  conversations: Array<{
    conversation_id: string;
    agent_id: string;
    agent_name: string;
    platform: string;
    phone_number_id: string;
    message_count: number;
    is_active: boolean;
  }>;
}

interface LeadFilters {
  search?: string;
  platform?: string;
  agentId?: string;
  startDate?: string;
  endDate?: string;
  days?: number;
  leadStatus?: string;
  minScore?: number;
  hasEmail?: boolean;
  isActive?: boolean;
}

interface Message {
  message_id: string;
  conversation_id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
  status: string;
  agent_name: string;
  platform: string;
}

interface MessageFilters {
  platform?: string;
  conversationId?: string;
  sender?: 'user' | 'agent';
  days?: number;
}

export function useLeads(userId: string) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 20,
    hasMore: false
  });

  // Fetch leads with search and filters
  const fetchLeads = useCallback(async (
    filters: LeadFilters = {},
    page = 1,
    pageSize = 20
  ) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize),
        sort_by: 'last_message_at',
        sort_order: 'desc'
      });

      // Search
      if (filters.search) params.set('search', filters.search);
      
      // Platform & Agent
      if (filters.platform) params.set('platform', filters.platform);
      if (filters.agentId) params.set('agent_id', filters.agentId);
      
      // Date filters
      if (filters.startDate) params.set('start_date', filters.startDate);
      if (filters.endDate) params.set('end_date', filters.endDate);
      if (filters.days) params.set('days', String(filters.days));
      
      // Lead status filters
      if (filters.leadStatus) params.set('lead_status', filters.leadStatus);
      if (filters.minScore) params.set('min_total_score', String(filters.minScore));
      if (filters.hasEmail !== undefined) params.set('has_email', String(filters.hasEmail));
      if (filters.isActive !== undefined) params.set('is_active', String(filters.isActive));

      const response = await fetch(
        `${API_BASE}/users/${userId}/leads?${params}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      
      setLeads(result.data);
      setPagination({
        total: result.pagination.total,
        page,
        pageSize,
        hasMore: result.pagination.hasMore
      });

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leads');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Fetch messages for a lead
  const fetchMessages = useCallback(async (
    customerPhone: string,
    filters: MessageFilters = {},
    page = 1,
    pageSize = 50
  ) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        limit: String(pageSize),
        offset: String((page - 1) * pageSize)
      });

      if (filters.platform) params.set('platform', filters.platform);
      if (filters.conversationId) params.set('conversation_id', filters.conversationId);
      if (filters.sender) params.set('sender', filters.sender);
      if (filters.days) params.set('days', String(filters.days));

      const encodedPhone = encodeURIComponent(customerPhone);
      const response = await fetch(
        `${API_BASE}/users/${userId}/leads/${encodedPhone}/messages?${params}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      setMessages(result.data.messages);

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch messages');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    leads,
    messages,
    loading,
    error,
    pagination,
    fetchLeads,
    fetchMessages
  };
}
```

### Usage in Component

```tsx
// components/LeadsList.tsx
import { useEffect, useState } from 'react';
import { useLeads } from '../hooks/useLeads';

export function LeadsList({ userId }: { userId: string }) {
  const { 
    leads, 
    messages, 
    loading, 
    pagination,
    fetchLeads, 
    fetchMessages 
  } = useLeads(userId);

  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    platform: '',
    agentId: '',
    leadStatus: '',
    days: 0
  });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads({
        search: searchQuery || undefined,
        platform: filters.platform || undefined,
        agentId: filters.agentId || undefined,
        leadStatus: filters.leadStatus || undefined,
        days: filters.days || undefined
      });
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [searchQuery, filters, fetchLeads]);

  // Load messages when lead is selected
  useEffect(() => {
    if (selectedLead) {
      fetchMessages(selectedLead);
    }
  }, [selectedLead, fetchMessages]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search Bar */}
      <div className="search-section">
        <input 
          type="text"
          placeholder="Search by name, email, phone, or company..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full p-3 border rounded-lg"
        />
      </div>

      {/* Filters Row */}
      <div className="filters flex gap-4">
        <select 
          value={filters.platform}
          onChange={e => setFilters(f => ({ ...f, platform: e.target.value }))}
        >
          <option value="">All Platforms</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="instagram">Instagram</option>
          <option value="webchat">Web Chat</option>
        </select>

        <select
          value={filters.leadStatus}
          onChange={e => setFilters(f => ({ ...f, leadStatus: e.target.value }))}
        >
          <option value="">All Statuses</option>
          <option value="Hot">🔥 Hot</option>
          <option value="Warm">🌡️ Warm</option>
          <option value="Cold">❄️ Cold</option>
        </select>

        <select
          value={filters.days}
          onChange={e => setFilters(f => ({ ...f, days: Number(e.target.value) }))}
        >
          <option value="0">All Time</option>
          <option value="1">Today</option>
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
        </select>
      </div>

      {/* Results */}
      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="flex">
          {/* Leads List */}
          <div className="leads-list flex-1">
            <h2 className="text-lg font-bold mb-2">
              Leads ({pagination.total})
            </h2>
            
            {leads.length === 0 ? (
              <p className="text-gray-500">No leads found</p>
            ) : (
              leads.map(lead => (
                <div 
                  key={lead.customer_phone}
                  onClick={() => setSelectedLead(lead.customer_phone)}
                  className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                    selectedLead === lead.customer_phone ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex justify-between">
                    <strong>{lead.name || lead.customer_phone}</strong>
                    {lead.lead_status && (
                      <span className={`px-2 py-1 rounded text-xs ${
                        lead.lead_status === 'Hot' ? 'bg-red-100 text-red-800' :
                        lead.lead_status === 'Warm' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {lead.lead_status}
                      </span>
                    )}
                  </div>
                  
                  <div className="text-sm text-gray-600">
                    {lead.customer_phone}
                    {lead.email && ` • ${lead.email}`}
                  </div>
                  
                  <div className="flex gap-2 mt-1">
                    {lead.platforms.map(p => (
                      <span key={p} className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                        {p}
                      </span>
                    ))}
                    <span className="text-xs text-gray-400">
                      {lead.total_messages} messages
                    </span>
                  </div>
                </div>
              ))
            )}

            {/* Pagination */}
            <div className="pagination flex justify-between mt-4">
              <button 
                disabled={pagination.page === 1}
                onClick={() => fetchLeads(filters, pagination.page - 1)}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="py-2">
                Page {pagination.page} of {Math.ceil(pagination.total / pagination.pageSize)}
              </span>
              <button 
                disabled={!pagination.hasMore}
                onClick={() => fetchLeads(filters, pagination.page + 1)}
                className="px-4 py-2 border rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>

          {/* Messages Panel */}
          {selectedLead && (
            <div className="messages-panel flex-1 ml-4 border-l pl-4">
              <h3 className="text-lg font-bold mb-2">
                Conversation with {selectedLead}
              </h3>
              
              <div className="messages-list max-h-96 overflow-y-auto">
                {messages.map(msg => (
                  <div 
                    key={msg.message_id} 
                    className={`p-2 mb-2 rounded ${
                      msg.sender === 'user' 
                        ? 'bg-gray-100 mr-8' 
                        : 'bg-blue-100 ml-8'
                    }`}
                  >
                    <div className="text-xs text-gray-500 mb-1">
                      {msg.sender === 'user' ? 'Customer' : msg.agent_name}
                      {' • '}
                      {new Date(msg.timestamp).toLocaleString()}
                    </div>
                    <p>{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Supporting APIs

### Get Message Status & Failure Reason

Get detailed delivery status and failure reason for a specific message by its ID.

#### Endpoint

```http
GET /users/:user_id/messages/:message_id/status
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | string | Yes | Your user identifier |
| `message_id` | string | Yes | The message ID (e.g., `wamid.HBgM...`) |

#### Response Structure

```typescript
interface MessageStatusResponse {
  success: true;
  data: {
    // Message info
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
    
    // Status info
    status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';
    platform_message_id: string | null;
    
    // Delivery details
    delivery_status: {
      status: string;
      error_reason: string | null;
      updated_at: string;
    } | null;
    
    // Quick access for failed messages
    is_failed: boolean;
    failure_reason: string | null;
  };
  timestamp: string;
  correlationId: string;
}
```

#### Sample Response (Failed Message)

```json
{
  "success": true,
  "data": {
    "message_id": "wamid.HBgMOTE4OTc5NTU2OTQxFQIAERgSNjk0OTUxRTVGMUM1QkYxM0Q3AA==",
    "conversation_id": "cbebb5aa-f075-4d0f-b643-53db41988cc2",
    "customer_phone": "+919879556941",
    "agent_id": "test-agent-001",
    "agent_name": "Test AI Agent",
    "platform": "whatsapp",
    "phone_number_id": "test-phone-001",
    "phone_display_name": "+1 (800) 555-0100",
    "sender": "agent",
    "text": "Hi hello test",
    "timestamp": "2025-12-15T17:59:02.005Z",
    "sequence_no": 39,
    "status": "failed",
    "platform_message_id": null,
    "delivery_status": {
      "status": "failed",
      "error_reason": "Message failed to send: recipient phone number is not a valid WhatsApp number",
      "updated_at": "2025-12-15T17:59:05.123Z"
    },
    "is_failed": true,
    "failure_reason": "Message failed to send: recipient phone number is not a valid WhatsApp number"
  },
  "timestamp": "2025-12-16T11:30:00.000Z",
  "correlationId": "req_status_abc123"
}
```

#### Sample Response (Delivered Message)

```json
{
  "success": true,
  "data": {
    "message_id": "wamid.HBgMOTE4OTc5NTU2OTQxFQIAERgSNjQ5NTFBBkYxQzVCRjEzRDdBQQ==",
    "conversation_id": "cbebb5aa-f075-4d0f-b643-53db41988cc2",
    "customer_phone": "+919879556941",
    "agent_id": "test-agent-001",
    "agent_name": "Test AI Agent",
    "platform": "whatsapp",
    "phone_number_id": "test-phone-001",
    "phone_display_name": "+1 (800) 555-0100",
    "sender": "agent",
    "text": "Hello! How can I help you today?",
    "timestamp": "2025-12-15T18:00:00.000Z",
    "sequence_no": 40,
    "status": "delivered",
    "platform_message_id": "wamid.HBgMOTE4OTc5NTU2OTQxFQIAERgSNjQ5NTFBBkYxQzVCRjEzRDdBQQ==",
    "delivery_status": {
      "status": "delivered",
      "error_reason": null,
      "updated_at": "2025-12-15T18:00:03.456Z"
    },
    "is_failed": false,
    "failure_reason": null
  },
  "timestamp": "2025-12-16T11:30:00.000Z",
  "correlationId": "req_status_xyz789"
}
```

#### Example Usage

```typescript
// Get status for a failed message
async function getMessageFailureReason(userId: string, messageId: string) {
  const response = await fetch(
    `${API_BASE}/users/${userId}/messages/${encodeURIComponent(messageId)}/status`
  );
  
  if (!response.ok) {
    throw new Error(`Failed to get message status: ${response.status}`);
  }
  
  const { data } = await response.json();
  
  if (data.is_failed) {
    console.log(`Message failed: ${data.failure_reason}`);
  } else {
    console.log(`Message status: ${data.status}`);
  }
  
  return data;
}

// Usage
const status = await getMessageFailureReason(
  'user_123',
  'wamid.HBgMOTE4OTc5NTU2OTQxFQIAERgSNjk0OTUxRTVGMUM1QkYxM0Q3AA=='
);
```

#### Common Failure Reasons

| Reason | Description |
|--------|-------------|
| `recipient phone number is not a valid WhatsApp number` | Phone not registered on WhatsApp |
| `Message failed to send` | Generic send failure |
| `Rate limit exceeded` | Too many messages sent |
| `Access token expired` | Meta access token needs refresh |
| `Template not approved` | WhatsApp template not approved by Meta |
| `Outside 24-hour window` | Customer hasn't messaged in 24h (WhatsApp policy) |

---

### Get Platform/Channel List

To populate filter dropdowns, fetch available channels:

```typescript
// Get all channels (WhatsApp, Instagram, Webchat)
const channels = await fetch(`${API_BASE}/api/v1/phone-numbers?user_id=${userId}`);

// Response includes platform type
const { data } = await channels.json();
// data: [{ id: "pn_123", platform: "whatsapp", display_name: "+1 234..." }, ...]
```

### Get Agent List

```typescript
// Get all agents for filter dropdown
const agents = await fetch(`${API_BASE}/users/${userId}/agents`);

const { data } = await agents.json();
// data: [{ agent_id: "agent_123", name: "Sales Bot", phone_number_id: "pn_456" }, ...]
```

### Get Lead Statistics

```typescript
// Get aggregate stats for dashboard cards
const stats = await fetch(`${API_BASE}/users/${userId}/leads/stats`);

const { data } = await stats.json();
/*
{
  total_leads: 150,
  leads_with_email: 85,
  leads_by_status: {
    hot: 25,
    warm: 65,
    cold: 60
  },
  leads_by_platform: {
    whatsapp: 100,
    instagram: 35,
    webchat: 15
  }
}
*/
```

---

## Error Handling

All endpoints return consistent error responses:

```typescript
interface ErrorResponse {
  error: string;          // Error type
  message: string;        // Human-readable message
  timestamp: string;      // ISO timestamp
  correlationId: string;  // For debugging
}
```

### Common HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 400 | Bad Request - Invalid parameters |
| 404 | Not Found - Lead or conversation doesn't exist |
| 500 | Internal Server Error |

### Example Error Handling

```typescript
async function fetchWithErrorHandling<T>(url: string): Promise<T> {
  const response = await fetch(url);
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `HTTP ${response.status}`);
  }
  
  return response.json();
}
```

---

## Platform Badge Examples

```typescript
// Helper to get platform display info
function getPlatformInfo(platform: string) {
  switch (platform) {
    case 'whatsapp':
      return { icon: '💬', color: '#25D366', label: 'WhatsApp' };
    case 'instagram':
      return { icon: '📷', color: '#E1306C', label: 'Instagram' };
    case 'webchat':
      return { icon: '🌐', color: '#3B82F6', label: 'Web Chat' };
    default:
      return { icon: '💬', color: '#6B7280', label: platform };
  }
}
```

---

## Quick Reference Summary

### All Available Filters

| Filter | Type | Example | Description |
|--------|------|---------|-------------|
| `search` | string | `john` | Search name, email, company, phone |
| `customer_phone` | string | `%2B14155551234` | Exact phone match |
| `platform` | string | `whatsapp,instagram` | Platform filter |
| `phone_number_id` | string | `pn_123` | Channel ID filter |
| `agent_id` | string | `agent_456` | Agent filter |
| `start_date` | date | `2025-12-01` | From date |
| `end_date` | date | `2025-12-16` | To date |
| `date` | date | `2025-12-15` | Specific date |
| `days` | number | `7` | Last N days |
| `lead_status` | string | `Hot,Warm` | Status filter |
| `min_total_score` | number | `10` | Min score (5-15) |
| `max_total_score` | number | `15` | Max score (5-15) |
| `has_email` | boolean | `true` | Has email |
| `has_extraction` | boolean | `true` | Has scoring data |
| `has_conversation` | boolean | `true` | Has conversations |
| `is_active` | boolean | `true` | Active conversation |
| `limit` | number | `20` | Page size |
| `offset` | number | `0` | Skip count |
| `sort_by` | string | `last_message_at` | Sort field |
| `sort_order` | string | `desc` | Sort direction |

### Endpoints Summary

| Task | Endpoint | Key Features |
|------|----------|--------------|
| **Get Leads** | `GET /users/:user_id/leads` | ✅ Search, ✅ All filters, ✅ Pagination |
| **Get Lead Stats** | `GET /users/:user_id/leads/stats` | Dashboard stats |
| **Get Single Lead** | `GET /users/:user_id/leads/:phone` | Full lead details |
| **Get Lead Messages** | `GET /users/:user_id/leads/:phone/messages` | ✅ Platform filter, ✅ Date filter |
| **Get Message Status** | `GET /users/:user_id/messages/:message_id/status` | ✅ Failure reason, ✅ Delivery status |
| **Get Channels** | `GET /api/v1/phone-numbers?user_id=X` | For dropdown |
| **Get Agents** | `GET /users/:user_id/agents` | For dropdown |

**Remember:**
1. ✅ **Search** works across: name, email, company, phone
2. URL encode phone numbers (especially the `+` sign → `%2B`)
3. Use pagination for large datasets
4. Use `platform` for multi-platform filter (comma-separated)
5. Use `phone_number_id` for specific channel filter
