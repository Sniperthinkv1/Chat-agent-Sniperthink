# Database Schema Reference

PostgreSQL database with multi-tenant isolation via `user_id`. Run `npm run migrate` to apply changes.

---

## Tables Overview

| Table | Purpose |
|-------|---------|
| `users` | Primary tenant table for multi-tenant isolation |
| `phone_numbers` | WhatsApp/Instagram/Webchat channel configurations |
| `agents` | AI agent configurations linked to phone numbers |
| `conversations` | Conversation lifecycle with OpenAI tracking |
| `messages` | Message storage with sequence ordering |
| `extractions` | Lead scoring and contact extraction data |
| `credits` | User credit balance tracking |
| `google_calendar_tokens` | Google OAuth tokens for calendar integration |
| `meetings` | Booked meetings via Google Calendar |
| `message_delivery_status` | Message delivery lifecycle (sent/delivered/read) |
| `conversation_archives` | Archive tracking when agents are relinked |

---

## Table Definitions

### `users`
Primary tenant table.

| Column | Type | Constraints |
|--------|------|-------------|
| `user_id` | VARCHAR(50) | PRIMARY KEY |
| `email` | VARCHAR(255) | UNIQUE NOT NULL |
| `company_name` | VARCHAR(255) | |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

### `phone_numbers`
Channel configurations for WhatsApp, Instagram, and Webchat.

| Column | Type | Constraints |
|--------|------|-------------|
| `id` | VARCHAR(50) | PRIMARY KEY |
| `user_id` | VARCHAR(50) | FK → users, NOT NULL |
| `platform` | VARCHAR(20) | CHECK IN ('whatsapp', 'instagram', 'webchat') |
| `meta_phone_number_id` | VARCHAR(100) | NOT NULL (WABA ID or Instagram Account ID) |
| `access_token` | TEXT | NOT NULL |
| `display_name` | VARCHAR(255) | |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

**Unique**: `(user_id, meta_phone_number_id, platform)`

---

### `agents`
AI agent configurations. One agent per phone number.

| Column | Type | Constraints |
|--------|------|-------------|
| `agent_id` | VARCHAR(50) | PRIMARY KEY |
| `user_id` | VARCHAR(50) | FK → users, NOT NULL |
| `phone_number_id` | VARCHAR(50) | FK → phone_numbers, NOT NULL, UNIQUE |
| `prompt_id` | VARCHAR(100) | NOT NULL |
| `name` | VARCHAR(255) | NOT NULL |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

### `conversations`
Conversation lifecycle with OpenAI context tracking.

| Column | Type | Constraints |
|--------|------|-------------|
| `conversation_id` | VARCHAR(50) | PRIMARY KEY |
| `agent_id` | VARCHAR(50) | FK → agents, NOT NULL |
| `customer_phone` | VARCHAR(50) | NOT NULL |
| `openai_conversation_id` | VARCHAR(100) | OpenAI Responses API ID |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `last_message_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `last_extraction_at` | TIMESTAMP | NULL |
| `is_active` | BOOLEAN | DEFAULT true |

**Unique**: `(agent_id, customer_phone, is_active)`

---

### `messages`
Message storage with sequence ordering.

| Column | Type | Constraints |
|--------|------|-------------|
| `message_id` | VARCHAR(100) | PRIMARY KEY |
| `conversation_id` | VARCHAR(50) | FK → conversations, NOT NULL |
| `sender` | VARCHAR(20) | CHECK IN ('user', 'agent') |
| `text` | TEXT | NOT NULL |
| `timestamp` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `status` | VARCHAR(20) | CHECK IN ('sent', 'failed', 'pending') |
| `sequence_no` | INTEGER | NOT NULL |
| `platform_message_id` | VARCHAR(100) | External platform ID |

**Unique**: `(conversation_id, sequence_no)`

---

### `extractions`
Lead scoring with history tracking. Supports multiple extractions per conversation.

| Column | Type | Constraints |
|--------|------|-------------|
| `extraction_id` | UUID | PRIMARY KEY DEFAULT gen_random_uuid() |
| `conversation_id` | VARCHAR(50) | FK → conversations, NOT NULL |
| `user_id` | VARCHAR(50) | FK → users, NOT NULL |
| `customer_phone` | VARCHAR(50) | NOT NULL |
| `extracted_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `is_latest` | BOOLEAN | DEFAULT true |
| `message_count_at_extraction` | INTEGER | DEFAULT 0 |
| `name` | VARCHAR(255) | Contact name |
| `email` | VARCHAR(255) | Contact email |
| `company` | VARCHAR(255) | Company name |
| `intent` | TEXT | Intent description |
| `intent_level` | VARCHAR(20) | CHECK IN ('Low', 'Medium', 'High') |
| `intent_score` | INTEGER | CHECK 1-3 |
| `urgency_level` | VARCHAR(20) | CHECK IN ('Low', 'Medium', 'High') |
| `urgency_score` | INTEGER | CHECK 1-3 |
| `budget_constraint` | VARCHAR(20) | CHECK IN ('Yes', 'No', 'Maybe') |
| `budget_score` | INTEGER | CHECK 1-3 |
| `fit_alignment` | VARCHAR(20) | CHECK IN ('Low', 'Medium', 'High') |
| `fit_score` | INTEGER | CHECK 1-3 |
| `engagement_health` | VARCHAR(20) | CHECK IN ('Low', 'Medium', 'High') |
| `engagement_score` | INTEGER | CHECK 1-3 |
| `cta_pricing_clicked` | VARCHAR(10) | CHECK IN ('Yes', 'No') |
| `cta_demo_clicked` | VARCHAR(10) | CHECK IN ('Yes', 'No') |
| `cta_followup_clicked` | VARCHAR(10) | CHECK IN ('Yes', 'No') |
| `cta_sample_clicked` | VARCHAR(10) | CHECK IN ('Yes', 'No') |
| `cta_website_clicked` | VARCHAR(10) | CHECK IN ('Yes', 'No') |
| `cta_escalated_to_human` | VARCHAR(10) | CHECK IN ('Yes', 'No') |
| `total_score` | INTEGER | CHECK 5-15 |
| `lead_status_tag` | VARCHAR(20) | CHECK IN ('Hot', 'Warm', 'Cold') |
| `demo_book_datetime` | TIMESTAMP | |
| `reasoning` | JSONB | Structured reasoning for scores |
| `smart_notification` | TEXT | Human-readable summary |
| `notes` | TEXT | |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

### `credits`
User credit balance tracking.

| Column | Type | Constraints |
|--------|------|-------------|
| `user_id` | VARCHAR(50) | PRIMARY KEY, FK → users |
| `remaining_credits` | INTEGER | DEFAULT 0, CHECK >= 0 |
| `total_used` | INTEGER | DEFAULT 0, CHECK >= 0 |
| `last_updated` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

### `google_calendar_tokens`
Google OAuth tokens for meeting booking.

| Column | Type | Constraints |
|--------|------|-------------|
| `user_id` | VARCHAR(50) | PRIMARY KEY, FK → users |
| `access_token` | TEXT | NOT NULL |
| `refresh_token` | TEXT | NOT NULL |
| `token_expiry` | TIMESTAMP | NOT NULL |
| `scope` | TEXT | NOT NULL |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

### `meetings`
Booked meetings via Google Calendar.

| Column | Type | Constraints |
|--------|------|-------------|
| `meeting_id` | VARCHAR(50) | PRIMARY KEY |
| `user_id` | VARCHAR(50) | FK → users, NOT NULL |
| `conversation_id` | VARCHAR(50) | FK → conversations, NOT NULL |
| `google_event_id` | VARCHAR(255) | NOT NULL |
| `title` | VARCHAR(255) | NOT NULL |
| `customer_name` | VARCHAR(255) | |
| `customer_email` | VARCHAR(255) | |
| `participants` | TEXT[] | Array of emails |
| `meeting_time` | TIMESTAMP | NOT NULL |
| `duration_minutes` | INTEGER | DEFAULT 30 |
| `timezone` | VARCHAR(100) | |
| `meet_link` | TEXT | Google Meet URL |
| `status` | VARCHAR(20) | CHECK IN ('scheduled', 'cancelled', 'completed') |
| `created_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

### `message_delivery_status`
Message delivery lifecycle tracking.

| Column | Type | Constraints |
|--------|------|-------------|
| `message_id` | VARCHAR(100) | PRIMARY KEY, FK → messages |
| `platform_message_id` | VARCHAR(100) | |
| `status` | VARCHAR(20) | CHECK IN ('pending', 'sent', 'delivered', 'read', 'failed') |
| `error_message` | TEXT | |
| `updated_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |

---

### `conversation_archives`
Archive tracking when agents are relinked.

| Column | Type | Constraints |
|--------|------|-------------|
| `archive_id` | VARCHAR(50) | PRIMARY KEY |
| `old_agent_id` | VARCHAR(50) | NOT NULL |
| `new_agent_id` | VARCHAR(50) | FK → agents, NOT NULL |
| `phone_number_id` | VARCHAR(50) | FK → phone_numbers, NOT NULL |
| `archived_conversations_count` | INTEGER | DEFAULT 0 |
| `archived_at` | TIMESTAMP | DEFAULT CURRENT_TIMESTAMP |
| `reason` | VARCHAR(255) | DEFAULT 'Agent relinked' |

---

## Triggers

### `update_updated_at_column()`
Auto-updates `updated_at` on row modification.

**Applied to**: `users`, `phone_numbers`, `agents`, `google_calendar_tokens`, `meetings`

```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

---

## Key Relationships

```
users (1) ─────┬───── (*) phone_numbers
              │
              ├───── (*) agents ──────── (*) conversations ──────── (*) messages
              │                                    │
              ├───── (1) credits                   ├───── (*) extractions
              │                                    │
              ├───── (1) google_calendar_tokens    └───── (*) meetings
              │
              └───── (*) extractions
```
