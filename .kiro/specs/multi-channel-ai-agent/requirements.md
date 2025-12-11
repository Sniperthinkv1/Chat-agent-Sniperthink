# Requirements Document

## Introduction

This document outlines the requirements for a scalable multi-channel AI agent service that enables businesses to deploy AI chatbots across WhatsApp, Instagram, and Web Chat platforms. The system handles high-volume message processing (100+ messages/second), maintains conversation context, extracts lead data, and provides comprehensive management APIs for agents, phone numbers, and conversations.

The service uses **OpenAI Responses API** (with dashboard-created prompts and conversation management) for AI processing, Redis (Upstash) for queuing and caching, and Neon Postgres for persistent storage. It's designed with multi-tenant architecture where user_id serves as the tenant identifier.

### Key Architecture Decisions

1. **OpenAI Responses API**: Uses prompt versioning from OpenAI dashboard (not Chat Completions API)
2. **Hybrid Conversation Management**: OpenAI manages AI context, our database stores audit trail
3. **One Prompt Per Phone Number**: Each phone number has exactly one active agent with one prompt_id
4. **Conversation Persistence**: One OpenAI conversation per customer conversation, reused across messages

## Requirements

### Requirement 1: Phone Number and Channel Management

**User Story:** As a business owner, I want to add and manage multiple WhatsApp numbers and Instagram accounts so that I can deploy AI agents across different communication channels.

#### Acceptance Criteria

1. WHEN a user adds a phone number THEN the system SHALL store the phone number with its unique access token for outbound messaging
2. WHEN a user adds an Instagram account THEN the system SHALL store the Instagram handle with its unique access token
3. WHEN a user requests their phone numbers THEN the system SHALL return all associated WhatsApp numbers and Instagram accounts with metadata
4. WHEN a user deletes a phone number THEN the system SHALL remove the phone number and archive associated conversations
5. IF a phone number type is invalid THEN the system SHALL reject the request with validation error

### Requirement 2: AI Agent Creation and Management

**User Story:** As a business owner, I want to create AI agents by linking OpenAI prompts (created in OpenAI dashboard) to my phone numbers so that each channel can have customized AI behavior.

#### Acceptance Criteria

1. WHEN a user creates an agent THEN the system SHALL link exactly one prompt_id (from OpenAI dashboard) to one phone_number_id
2. WHEN a phone number is already linked to another prompt THEN the system SHALL archive the old conversations and create a new agent_id
3. WHEN a user requests agent details THEN the system SHALL return agent configuration including prompt_id and phone_number_id
4. WHEN a user updates an agent name THEN the system SHALL update the agent metadata without affecting conversations
5. WHEN a user deletes an agent THEN the system SHALL archive conversations and remove the agent mapping
6. WHEN a user wants to change AI behavior THEN they SHALL either update the prompt in OpenAI dashboard (same prompt_id) OR create a new agent with different prompt_id (archives conversations)

### Requirement 3: Multi-Channel Message Processing

**User Story:** As a customer, I want to send messages via WhatsApp, Instagram, or Web Chat and receive intelligent AI responses so that I can get assistance through my preferred channel.

#### Acceptance Criteria

1. WHEN a message arrives from any Meta platform THEN the system SHALL validate using a constant webhook signature
2. WHEN a message is received THEN the system SHALL enqueue it in Redis partitioned by phone_number_id
3. WHEN processing a message THEN the system SHALL acquire a Redis lock for that specific phone_number_id to ensure ordering
4. WHEN sending a response THEN the system SHALL use the stored access_token for the specific phone number
5. WHEN a message fails to send THEN the system SHALL mark it as failed and allow manual retry

### Requirement 4: Conversation Context and Persistence

**User Story:** As a customer, I want my conversation history to be maintained across multiple interactions so that the AI agent remembers our previous discussions.

#### Acceptance Criteria

1. WHEN a customer sends their first message THEN the system SHALL create a new conversation_id in the database AND create an OpenAI conversation_id
2. WHEN a customer sends subsequent messages THEN the system SHALL reuse the existing conversation_id and openai_conversation_id for context
3. WHEN storing conversations THEN the system SHALL maintain mapping between conversation_id (ours) and openai_conversation_id (OpenAI's)
4. WHEN calling OpenAI Responses API THEN the system SHALL pass the openai_conversation_id to maintain context automatically
5. WHEN a conversation is inactive for 21 days THEN the system SHALL purge the conversation context but retain message history in database
6. WHEN a conversation is purged THEN the system SHALL create a new OpenAI conversation on next customer message
7. IF no extraction data exists THEN the system SHALL start a fresh conversation with no prior context

### Requirement 5: Credit Management and Usage Tracking

**User Story:** As a business owner, I want to manage credits for my AI agent usage so that I can control costs and monitor consumption.

#### Acceptance Criteria

1. WHEN processing a message THEN the system SHALL check if the user has sufficient credits
2. WHEN an AI response is successfully sent THEN the system SHALL deduct credits from the user's balance
3. WHEN a message fails to send THEN the system SHALL NOT deduct credits
4. WHEN a user adds credits THEN the system SHALL update their credit balance immediately
5. IF a user has insufficient credits THEN the system SHALL reject message processing

### Requirement 6: Lead Data Extraction and Intelligence

**User Story:** As a business owner, I want the system to automatically extract structured lead information from conversations so that I can track potential customers and their requirements.

#### Acceptance Criteria

1. WHEN a conversation has activity for 5-15 minutes THEN the system SHALL trigger lead extraction
2. WHEN extracting lead data THEN the system SHALL call OpenAI Response API with extraction prompt
3. WHEN extraction is successful THEN the system SHALL store data in individual database fields (name, email, company, intent, urgency, budget, fit, engagement, demo_datetime, smart_notification)
4. WHEN extraction fails THEN the system SHALL retry on the next scheduled interval
5. IF no new activity occurs THEN the system SHALL skip extraction to avoid redundant processing

### Requirement 7: High-Volume Message Processing

**User Story:** As a system administrator, I want the service to handle 100+ messages per second reliably so that it can scale with business growth.

#### Acceptance Criteria

1. WHEN message volume increases THEN the system SHALL auto-scale worker processes based on queue length and CPU usage
2. WHEN processing messages THEN the system SHALL maintain strict FIFO ordering per phone_number_id using Redis locks
3. WHEN the queue reaches capacity (100k jobs) THEN the system SHALL reject new messages with "System busy" response
4. WHEN a worker crashes THEN the system SHALL retry jobs using lease expiry mechanism
5. WHEN deduplicating messages THEN the system SHALL use Redis with 5-second TTL to prevent duplicate processing

### Requirement 8: API Management and Operations

**User Story:** As a developer integrating with the service, I want comprehensive REST APIs so that I can manage agents, retrieve conversations, and monitor system health.

#### Acceptance Criteria

1. WHEN accessing any API endpoint THEN the system SHALL require valid API key authentication
2. WHEN retrieving messages THEN the system SHALL support filtering by user_id, phone_number_id, and prompt_id
3. WHEN requesting extractions THEN the system SHALL return structured lead data with conversation context
4. WHEN manually retrying failed messages THEN the system SHALL attempt redelivery using stored message data
5. WHEN API requests exceed rate limits THEN the system SHALL return appropriate HTTP status codes

### Requirement 9: Data Archival and Conversation Management

**User Story:** As a business owner, I want old conversations to be properly archived when I change agent configurations so that I maintain data integrity while allowing system updates.

#### Acceptance Criteria

1. WHEN relinking a phone number to a new prompt THEN the system SHALL create an entry in conversation_archives table
2. WHEN archiving conversations THEN the system SHALL preserve all message history without deletion
3. WHEN creating a new agent for an existing phone number THEN the system SHALL generate a new agent_id
4. WHEN accessing archived conversations THEN the system SHALL provide read-only access to historical data
5. IF conversation archival fails THEN the system SHALL prevent the agent relinking operation

### Requirement 10: Redis Caching and Performance Optimization

**User Story:** As a system administrator, I want efficient caching of frequently accessed data so that the system maintains high performance under load.

#### Acceptance Criteria

1. WHEN looking up agent mappings THEN the system SHALL check Redis cache before querying the database
2. WHEN caching user data THEN the system SHALL use TTL of 5-10 minutes with refresh on updates
3. WHEN processing messages THEN the system SHALL cache credit balances to avoid repeated database queries
4. WHEN cache data expires THEN the system SHALL refresh from the database automatically
5. WHEN updating agent or user data THEN the system SHALL invalidate relevant cache entries