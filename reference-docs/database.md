# Database Schema Reference

This document serves as the authoritative reference for the Multi-Channel AI Agent database schema.

## Database Overview

- **Database**: PostgreSQL (Neon)
- **Connection Pooling**: Enabled with configurable pool size
- **Multi-tenant**: All operations filtered by `user_id`
- **Soft Deletion**: Uses `is_active` flags for data retention
- **Migrations**: Sequential SQL files in `server/migrations/`

## Migration History

| # | File | Date | Description |
|---|------|------|-------------|
| 001 | `001_initial_schema.sql` | 2024-01-01 | Core tables (users, phone_numbers, agents, conversations, messages, credits) |
| 002 | `002_add_extractions.sql` | 2024-01-01 | Lead extractions table |
| 003 | `003_conversation_archives.sql` | 2024-01-01 | Conversation archives for agent relinking |
| 004 | `004_add_openai_conversation_id.sql` | 2025-02-10 | OpenAI Responses API conversation tracking |
| 005 | `005_add_message_delivery_status.sql` | 2024-01-05 | Message delivery status tracking |
| 006 | `006_add_last_extraction_at.sql` | 2025-10-02 | Track last extraction timestamp per conversation |
| 007 | `007_update_extractions_schema.sql` | 2025-10-02 | Complete lead scoring schema with reasoning |
| 008 | `008_extraction_history.sql` | 2025-10-03 | Extraction history tracking (replaces 007) |
| 008b | `008_increase_message_id_length.sql` | 2025-10-03 | Increase message_id to VARCHAR(100) for WhatsApp IDs |
| 009 | `009_add_missing_extraction_fields.sql` | 2025-10-04 | Add lead_status_tag, smart_notification, reasoning, demo_book_datetime |
| 010 | `010_increase_customer_phone_length.sql` | 2025-10-04 | Increase customer_phone to VARCHAR(50) for webchat session IDs |
| 011 | `011_add_google_calendar_tokens.sql` | 2025-10-06 | Add Google Calendar OAuth tokens for meeting booking |
| 012 | `012_add_meetings_table.sql` | 2025-10-06 | Add meetings table for tracking booked meetings |

## Core Tables

### users
Primary tenant table for multi-tenant isolation.

```sql
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    company_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### phone_numbers
WhatsApp Business phone numbers and Instagram business accounts.

**Important**: `meta_phone_number_id` is the ID from Meta's platform:
- For WhatsApp: WABA phone_number_id (e.g., "836990829491415")
- For Instagram: Instagram Account ID (e.g., "17841234567890123")
- Used in Meta API calls: `POST /v24.0/{meta_phone_number_id}/messages`

```sql
CREATE TABLE phone_numbers (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('whatsapp', 'instagram', 'webchat')),
    meta_phone_number_id VARCHAR(100) NOT NULL,
    access_token TEXT NOT NULL,
    display_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, meta_phone_number_id, platform)
);
```

### agents
AI agent configurations linked to phone numbers.

```sql
CREATE TABLE agents (
    agent_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    phone_number_id VARCHAR(50) NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
    prompt_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(phone_number_id) -- One agent per phone number
);
```

### conversations
Conversation lifecycle management with OpenAI tracking and extraction scheduling.

**Key Fields** (added via migrations):
- `openai_conversation_id` (Migration 004): OpenAI's conversation ID for context
- `last_extraction_at` (Migration 006): When extraction was last performed

**Extraction Logic**:
- Runs when: `last_message_at > last_extraction_at` AND inactivity threshold met
- Ensures extraction only after new activity followed by inactivity period

```sql
CREATE TABLE conversations (
    conversation_id VARCHAR(50) PRIMARY KEY,
    agent_id VARCHAR(50) NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    customer_phone VARCHAR(50) NOT NULL,
    openai_conversation_id VARCHAR(100), -- Added in migration 004
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_extraction_at TIMESTAMP DEFAULT NULL, -- Added in migration 006
    is_active BOOLEAN DEFAULT true,
    UNIQUE(agent_id, customer_phone, is_active)
);
```

### messages
Message storage with sequence ordering.

**Note**: `message_id` increased from VARCHAR(50) to VARCHAR(100) in migration 008b to support WhatsApp message IDs like `wamid.HBgMOTE4OTc5NTU2OTQxFQIAEhgUM0Y3QzFGNzg4NjE1RDhDODQ4NTQA`.

```sql
CREATE TABLE messages (
    message_id VARCHAR(100) PRIMARY KEY, -- Increased in migration 008b
    conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'agent')),
    text TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    sequence_no INTEGER NOT NULL,
    platform_message_id VARCHAR(100),
    UNIQUE(conversation_id, sequence_no)
);
```

### extractions
Comprehensive lead scoring with history tracking (Migration 008).

**Current Schema** (Migration 008 - replaces 007):
- UUID primary key for better scalability
- `is_latest` flag for tracking current extraction
- `message_count_at_extraction` tracks conversation size
- Supports multiple extractions per conversation over time

**Lead Scoring System**:
- Each dimension (intent, urgency, budget, fit, engagement) scored 1-3
- Total score: Sum of all scores (5-15 range)
- Lead status: Hot (12-15), Warm (8-11), Cold (5-7)

```sql
CREATE TABLE extractions (
    extraction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    customer_phone VARCHAR(50) NOT NULL, -- Migration 010: Increased from VARCHAR(20) to support webchat session IDs
    
    -- Extraction metadata
    extracted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_latest BOOLEAN NOT NULL DEFAULT true,
    message_count_at_extraction INTEGER NOT NULL DEFAULT 0,
    
    -- Contact Information
    name VARCHAR(255),
    email VARCHAR(255),
    company VARCHAR(255),
    
    -- Intent Analysis
    intent TEXT,
    intent_level VARCHAR(20) CHECK (intent_level IN ('Low', 'Medium', 'High')),
    intent_score INTEGER CHECK (intent_score BETWEEN 1 AND 3),
    
    -- Urgency Analysis
    urgency_level VARCHAR(20) CHECK (urgency_level IN ('Low', 'Medium', 'High')),
    urgency_score INTEGER CHECK (urgency_score BETWEEN 1 AND 3),
    
    -- Budget Analysis
    budget_constraint VARCHAR(20) CHECK (budget_constraint IN ('Yes', 'No', 'Maybe')),
    budget_score INTEGER CHECK (budget_score BETWEEN 1 AND 3),
    
    -- Fit Analysis
    fit_alignment VARCHAR(20) CHECK (fit_alignment IN ('Low', 'Medium', 'High')),
    fit_score INTEGER CHECK (fit_score BETWEEN 1 AND 3),
    
    -- Engagement Analysis
    engagement_health VARCHAR(20) CHECK (engagement_health IN ('Low', 'Medium', 'High')),
    engagement_score INTEGER CHECK (engagement_score BETWEEN 1 AND 3),
    
    -- CTA Tracking
    cta_pricing_clicked VARCHAR(10) CHECK (cta_pricing_clicked IN ('Yes', 'No')),
    cta_demo_clicked VARCHAR(10) CHECK (cta_demo_clicked IN ('Yes', 'No')),
    cta_followup_clicked VARCHAR(10) CHECK (cta_followup_clicked IN ('Yes', 'No')),
    cta_sample_clicked VARCHAR(10) CHECK (cta_sample_clicked IN ('Yes', 'No')),
    cta_website_clicked VARCHAR(10) CHECK (cta_website_clicked IN ('Yes', 'No')),
    cta_escalated_to_human VARCHAR(10) CHECK (cta_escalated_to_human IN ('Yes', 'No')),
    
    -- Overall Score & Status (Migration 009)
    total_score INTEGER CHECK (total_score BETWEEN 5 AND 15),
    lead_status_tag VARCHAR(20) CHECK (lead_status_tag IN ('Hot', 'Warm', 'Cold')), -- Migration 009
    
    -- Demo Booking (Migration 009)
    demo_book_datetime TIMESTAMP, -- Migration 009
    
    -- Reasoning & Notifications (Migration 009)
    reasoning JSONB, -- Migration 009: Structured reasoning for each scoring dimension
    smart_notification TEXT, -- Migration 009: Human-readable conversation summary
    
    -- Additional Notes
    notes TEXT,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

**Migration Notes**:
- **Migration 009** (2025-10-04): Added `lead_status_tag`, `smart_notification`, `reasoning`, `demo_book_datetime`
- **Migration 010** (2025-10-04): Increased `customer_phone` from VARCHAR(20) to VARCHAR(50) to support webchat session IDs (e.g., "session_1759591818801_wjrl2neei")

### credits
Credit tracking for users.

```sql
CREATE TABLE credits (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    remaining_credits INTEGER DEFAULT 0 CHECK (remaining_credits >= 0),
    total_used INTEGER DEFAULT 0 CHECK (total_used >= 0),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### conversation_archives
Archive tracking when agents are relinked (Migration 003).

```sql
CREATE TABLE conversation_archives (
    archive_id VARCHAR(50) PRIMARY KEY,
    old_agent_id VARCHAR(50) NOT NULL,
    new_agent_id VARCHAR(50) NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    phone_number_id VARCHAR(50) NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
    archived_conversations_count INTEGER DEFAULT 0,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(255) DEFAULT 'Agent relinked'
);
```

### google_calendar_tokens
Google OAuth tokens for calendar integration (Migration 011).

```sql
CREATE TABLE google_calendar_tokens (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMP NOT NULL,
    scope TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### meetings
Booked meetings tracking (Migration 012).

```sql
CREATE TABLE meetings (
    meeting_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    google_event_id VARCHAR(255) NOT NULL,
    
    -- Meeting details
    title VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    participants TEXT[],
    
    -- Time details
    meeting_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    timezone VARCHAR(100),
    
    -- Google Meet details
    meet_link TEXT,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### message_delivery_status
Message delivery lifecycle tracking (Migration 005).

**Status Values**:
- `pending`: Message queued for sending
- `sent`: Message sent to platform API
- `delivered`: Message delivered to user's device
- `read`: Message read by user (double blue checkmarks in WhatsApp)
- `failed`: Message delivery failed

```sql
CREATE TABLE message_delivery_status (
    message_id VARCHAR(100) PRIMARY KEY REFERENCES messages(message_id) ON DELETE CASCADE,
    platform_message_id VARCHAR(100),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    error_message TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Indexes

### Performance Indexes

```sql
-- Users
CREATE INDEX idx_users_email ON users(email);

-- Phone Numbers
CREATE INDEX idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX idx_phone_numbers_platform ON phone_numbers(platform);
CREATE INDEX idx_phone_numbers_meta_id ON phone_numbers(meta_phone_number_id);

-- Agents
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_phone_number_id ON agents(phone_number_id);

-- Conversations
CREATE INDEX idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX idx_conversations_customer_phone ON conversations(customer_phone);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX idx_conversations_last_extraction_at ON conversations(last_extraction_at);
CREATE INDEX idx_conversations_is_active ON conversations(is_active);
CREATE INDEX idx_conversations_openai_id ON conversations(openai_conversation_id);

-- Messages
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_messages_sender ON messages(sender);
CREATE INDEX idx_messages_status ON messages(status);

-- Extractions (Migration 008)
CREATE INDEX idx_extractions_conversation_id ON extractions(conversation_id);
CREATE INDEX idx_extractions_user_id ON extractions(user_id);
CREATE INDEX idx_extractions_customer_phone ON extractions(customer_phone);
CREATE INDEX idx_extractions_extracted_at ON extractions(extracted_at DESC);
CREATE INDEX idx_extractions_is_latest ON extractions(is_latest) WHERE is_latest = true;
CREATE INDEX idx_extractions_conversation_latest ON extractions(conversation_id, is_latest) WHERE is_latest = true;
CREATE INDEX idx_extractions_user_conversation ON extractions(user_id, conversation_id, extracted_at DESC);

-- Message Delivery Status
CREATE INDEX idx_message_delivery_status_status ON message_delivery_status(status);
CREATE INDEX idx_message_delivery_status_platform_id ON message_delivery_status(platform_message_id);

-- Conversation Archives
CREATE INDEX idx_conversation_archives_old_agent_id ON conversation_archives(old_agent_id);
CREATE INDEX idx_conversation_archives_new_agent_id ON conversation_archives(new_agent_id);
CREATE INDEX idx_conversation_archives_phone_number_id ON conversation_archives(phone_number_id);
CREATE INDEX idx_conversation_archives_archived_at ON conversation_archives(archived_at);

-- Google Calendar Tokens
CREATE INDEX idx_google_calendar_tokens_user_id ON google_calendar_tokens(user_id);
```

## Key Relationships

1. **User → Phone Numbers**: One-to-many
2. **User → Credits**: One-to-one
3. **User → Google Calendar Tokens**: One-to-one
4. **User → Meetings**: One-to-many
5. **Phone Number → Agent**: One-to-one (via UNIQUE constraint)
6. **Agent → Conversations**: One-to-many
7. **Conversation → Messages**: One-to-many (ordered by sequence_no)
8. **Conversation → Extractions**: One-to-many (history tracking with is_latest flag)
9. **Conversation → Meetings**: One-to-many
10. **Message → Message Delivery Status**: One-to-one
11. **Agent → Conversation Archives**: One-to-many

## Business Rules

### Agent Management
- Only one active agent per phone_number_id
- When agent is updated, previous conversations are archived
- Archived conversations maintain message history

### Conversation Lifecycle
- Conversations auto-archive after 21 days of inactivity
- New messages to archived conversations create new active conversations
- Contact identification: phone number for WhatsApp, Instagram ID for Instagram

### Message Ordering
- Messages ordered by sequence_no within conversation
- Sequence numbers auto-incremented per conversation
- FIFO processing enforced by distributed locks

### Credit System
- Credits checked before processing each message
- Balance updated atomically with message processing
- Negative credits prevent new message processing

### Extraction System
- Extractions run after conversation inactivity period
- `last_extraction_at` tracks when extraction was last performed
- Triggered when: `last_message_at > last_extraction_at` AND inactivity threshold met
- Multiple extractions per conversation (historical snapshots)
- `is_latest` flag marks current extraction

### Message Delivery Tracking
- Lifecycle: pending → sent → delivered → read (or failed)
- Platform message IDs stored for webhook status updates
- Error messages captured for failed deliveries

## Common Query Patterns

```sql
-- Get all phone numbers for a user
SELECT * FROM phone_numbers
WHERE user_id = $1
ORDER BY created_at DESC;

-- Get agent with phone number details
SELECT a.*, p.meta_phone_number_id, p.display_name, p.platform
FROM agents a
JOIN phone_numbers p ON a.phone_number_id = p.id
WHERE a.user_id = $1 AND a.agent_id = $2;

-- Get active conversations for an agent
SELECT * FROM conversations
WHERE agent_id = $1 AND is_active = true
ORDER BY last_message_at DESC;

-- Get conversation messages with context
SELECT * FROM messages
WHERE conversation_id = $1
ORDER BY sequence_no ASC;

-- Get phone number and access token for sending
SELECT meta_phone_number_id, access_token, platform
FROM phone_numbers
WHERE id = $1;

-- Get user credits
SELECT remaining_credits, total_used
FROM credits
WHERE user_id = $1;

-- Get latest extraction for conversation
SELECT * FROM extractions
WHERE conversation_id = $1 AND is_latest = true;

-- Get extraction history for conversation
SELECT * FROM extractions
WHERE conversation_id = $1
ORDER BY extracted_at DESC;

-- Get conversations needing extraction
SELECT c.*
FROM conversations c
WHERE c.is_active = true
  AND c.last_message_at > COALESCE(c.last_extraction_at, '1970-01-01'::timestamp)
  AND c.last_message_at < NOW() - INTERVAL '5 minutes'
ORDER BY c.last_message_at ASC;

-- Get message delivery status
SELECT status, platform_message_id, error_message
FROM message_delivery_status
WHERE message_id = $1;

-- Get conversation archives for phone number
SELECT * FROM conversation_archives
WHERE phone_number_id = $1
ORDER BY archived_at DESC;
```

## Database Functions

### update_updated_at_column()
Trigger function that automatically updates `updated_at` timestamp on row updates.

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$ language 'plpgsql';
```

**Applied to**: users, phone_numbers, agents, extractions, message_delivery_status

## Migration Best Practices

1. **Always backup** before running migrations
2. **Test on development** database first
3. **Run sequentially** in order (001, 002, 003, etc.)
4. **Check for data** before dropping tables (migrations 007 and 008)
5. **Monitor performance** after adding indexes
6. **Document changes** in this file when adding new migrations

## Running Migrations

```bash
# Run all pending migrations
npm run migrate

# Run specific migration
psql $DATABASE_URL -f server/migrations/001_initial_schema.sql

# Verify schema
pg_dump $DATABASE_URL --schema-only > current_schema.sql
```

## Performance Considerations

- All queries must include `user_id` for multi-tenant isolation
- Use connection pooling for high-throughput scenarios
- Indexes on frequently queried columns (user_id, created_at, is_active)
- Consider partitioning messages table by created_at for large datasets
- Extraction history queries optimized with `is_latest` partial index
