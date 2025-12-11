# Design Document

## Overview

The Multi-Channel AI Agent Service is designed as a scalable Node.js backend that processes messages from WhatsApp, Instagram, and Web Chat platforms through a unified webhook endpoint. The system uses an asynchronous worker architecture with Redis for queuing and caching, Neon Postgres for persistence, and **OpenAI Responses API** for AI processing.

The architecture prioritizes message ordering per phone number, high throughput (100+ messages/second), and reliable delivery while maintaining conversation context and extracting structured lead data.

### Key Design Decisions

1. **OpenAI Responses API**: Uses dashboard-created prompts (not Chat Completions API) for better versioning and performance
2. **Hybrid Conversation Storage**: OpenAI manages AI context, our database stores complete audit trail
3. **One-to-One Mapping**: Each phone number → one agent → one prompt_id (from OpenAI dashboard)
4. **Conversation Reuse**: One OpenAI conversation per customer conversation, reused across all messages
5. **Prompt Versioning**: Prompts created and versioned in OpenAI dashboard, referenced by prompt_id in code

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "External Platforms"
        WA[WhatsApp Business API]
        IG[Instagram Messaging API]
        WC[Web Chat Widget]
    end
    
    subgraph "API Layer"
        WH[Webhook Endpoint]
        API[REST API Server]
        AUTH[API Key Auth]
    end
    
    subgraph "Processing Layer"
        QUEUE[Redis Queue]
        WORKER[Message Workers]
        EXTRACT[Extraction Workers]
        LOCK[Redis Locks]
    end
    
    subgraph "External Services"
        OPENAI[OpenAI Response API]
    end
    
    subgraph "Storage Layer"
        REDIS[(Redis Cache)]
        POSTGRES[(Neon Postgres)]
    end
    
    WA --> WH
    IG --> WH
    WC --> WH
    
    WH --> QUEUE
    API --> AUTH
    AUTH --> POSTGRES
    
    QUEUE --> WORKER
    WORKER --> LOCK
    WORKER --> OPENAI
    WORKER --> POSTGRES
    WORKER --> REDIS
    
    EXTRACT --> OPENAI
    EXTRACT --> POSTGRES
    
    WORKER --> WA
    WORKER --> IG
    WORKER --> WC
```

### Message Flow Architecture

```mermaid
sequenceDiagram
    participant Customer
    participant Platform as WhatsApp/Instagram
    participant Webhook
    participant Queue as Redis Queue
    participant Worker
    participant Lock as Redis Lock
    participant OpenAI
    participant DB as Postgres
    participant Cache as Redis Cache
    
    Customer->>Platform: Send Message
    Platform->>Webhook: POST /webhook/meta
    Webhook->>Webhook: Validate Signature
    Webhook->>Queue: Enqueue Message
    
    Worker->>Queue: Dequeue Message
    Worker->>Lock: Acquire phone_number_id lock
    Worker->>Cache: Check credits & agent mapping
    
    alt Cache Hit
        Cache-->>Worker: Return cached data
    else Cache Miss
        Worker->>DB: Query agent & credits
        Worker->>Cache: Update cache
    end
    
    Worker->>OpenAI: Send message with conversation_id
    OpenAI-->>Worker: AI Response
    Worker->>Platform: Send response to customer
    Worker->>DB: Store inbound/outbound messages
    Worker->>DB: Deduct credits
    Worker->>Lock: Release lock
    
    Platform->>Customer: Deliver AI Response
```

## Components and Interfaces

### 1. Webhook Handler

**Purpose:** Receives and validates incoming messages from all Meta platforms

**Key Responsibilities:**
- Validate webhook signature (constant across all platforms)
- Parse message payload and extract phone_number_id
- Enqueue messages to Redis with proper partitioning
- Handle deduplication using message hash

**Interface:**
```typescript
interface WebhookPayload {
  phone_number_id: string;
  customer_phone: string;
  message_text: string;
  timestamp: string;
  platform_type: 'whatsapp' | 'instagram' | 'webchat';
}

interface WebhookHandler {
  validateSignature(payload: string, signature: string): boolean;
  parseMessage(payload: WebhookPayload): ProcessedMessage;
  enqueueMessage(message: ProcessedMessage): Promise<void>;
}
```

### 2. Message Worker

**Purpose:** Process queued messages with strict ordering and AI integration

**Key Responsibilities:**
- Dequeue messages in FIFO order per phone_number_id
- Acquire Redis locks to prevent race conditions
- Validate user credits before processing
- Get or create OpenAI conversation for customer
- Integrate with OpenAI Responses API (with prompt_id and conversation_id)
- Send responses back to customers
- Store message history and update credits

**Interface:**
```typescript
interface MessageWorker {
  processMessage(queuedMessage: QueuedMessage): Promise<void>;
  acquireLock(phoneNumberId: string): Promise<boolean>;
  checkCredits(userId: string): Promise<number>;
  getOrCreateOpenAIConversation(conversationId: string): Promise<string>;
  callOpenAI(message: string, openaiConversationId: string, promptId: string): Promise<OpenAIResponse>;
  sendResponse(response: string, phoneNumberId: string, customerPhone: string): Promise<boolean>;
  storeMessage(message: MessageRecord): Promise<void>;
}

interface OpenAIResponse {
  text: string;
  tokensUsed: number;
  conversationId: string;
}
```

### 3. Agent Manager

**Purpose:** Manage agent configurations and phone number mappings

**Key Responsibilities:**
- Create and update agent configurations
- Handle phone number to prompt_id mappings
- Archive conversations when agents are relinked
- Validate agent constraints (one prompt per phone number)

**Interface:**
```typescript
interface AgentManager {
  createAgent(userId: string, phoneNumberId: string, promptId: string, name: string): Promise<Agent>;
  updateAgent(agentId: string, updates: Partial<Agent>): Promise<Agent>;
  deleteAgent(agentId: string): Promise<void>;
  archiveConversation(oldAgentId: string, newAgentId: string): Promise<void>;
}
```

### 4. Extraction Worker

**Purpose:** Extract structured lead data from conversations

**Key Responsibilities:**
- Monitor conversation activity timestamps
- Trigger extraction based on configurable intervals (5-15 minutes)
- Call OpenAI with extraction prompts
- Validate and store structured data in individual fields
- Handle extraction failures with retry logic

**Interface:**
```typescript
interface ExtractionWorker {
  scheduleExtraction(conversationId: string): Promise<void>;
  extractLeadData(conversationId: string): Promise<ExtractionData>;
  validateExtraction(data: any): ExtractionData | null;
  storeExtraction(extraction: ExtractionData): Promise<void>;
}

interface ExtractionData {
  name?: string;
  email?: string;
  company?: string;
  intent?: string;
  urgency?: number; // 1-3
  budget?: number; // 1-3
  fit?: number; // 1-3
  engagement?: number; // 1-3
  demo_datetime?: Date;
  smart_notification?: string;
}
```

### 5. Cache Manager

**Purpose:** Manage Redis caching for performance optimization

**Key Responsibilities:**
- Cache frequently accessed data (agent mappings, credits)
- Implement TTL strategies (5-10 minutes)
- Handle cache invalidation on updates
- Provide fallback to database on cache misses

**Interface:**
```typescript
interface CacheManager {
  getUserData(userId: string, phoneNumberId: string): Promise<CachedUserData | null>;
  setUserData(userId: string, phoneNumberId: string, data: CachedUserData, ttl: number): Promise<void>;
  invalidateUserData(userId: string, phoneNumberId?: string): Promise<void>;
  acquireMessageLock(phoneNumberId: string, ttl: number): Promise<boolean>;
  releaseMessageLock(phoneNumberId: string): Promise<void>;
}
```

## Data Models

### Database Schema

```sql
-- Users (tenant_id equivalent)
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    company_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Phone Numbers and Instagram Handles
CREATE TABLE phone_numbers (
    phone_number_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('whatsapp', 'instagram', 'webchat')),
    external_number VARCHAR(100) NOT NULL,
    access_token TEXT NOT NULL,
    display_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Agents
CREATE TABLE agents (
    agent_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) REFERENCES users(user_id),
    phone_number_id VARCHAR(50) REFERENCES phone_numbers(phone_number_id),
    prompt_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(phone_number_id) -- One agent per phone number
);

-- Conversations
CREATE TABLE conversations (
    conversation_id VARCHAR(50) PRIMARY KEY,
    agent_id VARCHAR(50) REFERENCES agents(agent_id),
    customer_phone VARCHAR(50) NOT NULL,
    openai_conversation_id VARCHAR(100), -- OpenAI Responses API conversation ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(agent_id, customer_phone, is_active)
);

CREATE INDEX idx_conversations_openai_id ON conversations(openai_conversation_id);

-- Messages
CREATE TABLE messages (
    message_id VARCHAR(50) PRIMARY KEY,
    conversation_id VARCHAR(50) REFERENCES conversations(conversation_id),
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'agent')),
    text TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    sequence_no INTEGER NOT NULL
);

-- Credits
CREATE TABLE credits (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(user_id),
    remaining_credits INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Lead Extractions
CREATE TABLE extractions (
    extraction_id VARCHAR(50) PRIMARY KEY,
    conversation_id VARCHAR(50) REFERENCES conversations(conversation_id),
    name VARCHAR(100),
    email VARCHAR(255),
    company VARCHAR(255),
    intent VARCHAR(100),
    urgency INTEGER CHECK (urgency BETWEEN 1 AND 3),
    budget INTEGER CHECK (budget BETWEEN 1 AND 3),
    fit INTEGER CHECK (fit BETWEEN 1 AND 3),
    engagement INTEGER CHECK (engagement BETWEEN 1 AND 3),
    demo_datetime TIMESTAMP,
    smart_notification TEXT,
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Conversation Archives
CREATE TABLE conversation_archives (
    archive_id VARCHAR(50) PRIMARY KEY,
    old_agent_id VARCHAR(50),
    new_agent_id VARCHAR(50) REFERENCES agents(agent_id),
    phone_number_id VARCHAR(50) REFERENCES phone_numbers(phone_number_id),
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Redis Data Structures

```typescript
// Message Queue
interface QueuedMessage {
  messageId: string;
  phoneNumberId: string;
  customerPhone: string;
  messageText: string;
  timestamp: string;
  platformType: 'whatsapp' | 'instagram' | 'webchat';
}

// User Cache
interface CachedUserData {
  agentId: string;
  promptId: string;
  remainingCredits: number;
  conversationId?: string;
}

// Redis Keys
const REDIS_KEYS = {
  messageQueue: 'queue:messages',
  phoneLock: (phoneId: string) => `lock:phone:${phoneId}`,
  userCache: (userId: string, phoneId: string) => `user:${userId}:phone:${phoneId}`,
  dedup: (phoneId: string, msgHash: string) => `dedup:${phoneId}:${msgHash}`
};
```

## Error Handling

### Message Processing Errors

1. **OpenAI API Failures**
   - Retry with exponential backoff (max 3 attempts)
   - Log failure with correlation ID
   - Mark message as failed for manual retry

2. **Outbound Delivery Failures**
   - Single attempt only (no auto-retry)
   - Store failure reason and timestamp
   - Enable manual retry through API

3. **Credit Insufficient**
   - Reject message processing immediately
   - Log credit check failure
   - Return appropriate error to webhook

### System-Level Errors

1. **Redis Connection Failures**
   - Implement circuit breaker pattern
   - Fallback to direct database queries
   - Alert on persistent Redis issues

2. **Database Connection Issues**
   - Connection pooling with retry logic
   - Graceful degradation for read operations
   - Queue messages during write failures

3. **Worker Crashes**
   - Lease-based job processing with TTL
   - Automatic job retry on lease expiry
   - Health checks and worker restart

## Testing Strategy

### Unit Testing

1. **Component Testing**
   - Test each component interface independently
   - Mock external dependencies (OpenAI, Redis, Postgres)
   - Validate error handling and edge cases

2. **Message Processing Logic**
   - Test message deduplication
   - Validate ordering constraints
   - Test credit validation and deduction

3. **Extraction Logic**
   - Test JSON validation and field mapping
   - Validate extraction scheduling
   - Test retry mechanisms

### Integration Testing

1. **End-to-End Message Flow**
   - Webhook to database storage
   - OpenAI integration with real API calls
   - Multi-channel message delivery

2. **Redis Integration**
   - Queue operations and locking
   - Cache hit/miss scenarios
   - Lock acquisition and release

3. **Database Operations**
   - CRUD operations for all entities
   - Transaction handling
   - Constraint validation

### Performance Testing

1. **Load Testing**
   - 100+ messages per second throughput
   - Worker scaling under load
   - Redis queue performance

2. **Stress Testing**
   - Queue overflow scenarios
   - Database connection limits
   - Memory usage under sustained load

3. **Latency Testing**
   - End-to-end message processing time
   - Cache vs database query performance
   - OpenAI API response times

### Security Testing

1. **Authentication Testing**
   - API key validation
   - Webhook signature verification
   - Unauthorized access attempts

2. **Input Validation**
   - Message payload sanitization
   - SQL injection prevention
   - XSS protection for web chat

3. **Data Privacy**
   - PII handling in logs
   - Message content encryption in transit
   - Access control validation

## Environment Configuration

### Configuration Management

All system configurations must be externalized through environment variables to ensure security, flexibility, and deployment portability. No hardcoded URLs, secrets, or configuration values should exist in the codebase.

#### Required Environment Variables

```bash
# Database Configuration
DATABASE_URL=postgresql://username:password@host:port/database
DATABASE_POOL_SIZE=20
DATABASE_TIMEOUT=30000

# Redis Configuration  
REDIS_URL=redis://username:password@host:port
REDIS_TTL_DEFAULT=300
REDIS_QUEUE_MAX_SIZE=100000

# OpenAI Configuration (Responses API)
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT=30000
OPENAI_MAX_RETRIES=3
# Note: prompt_id is stored per agent in database, not in env vars

# Webhook Configuration
WEBHOOK_SECRET=your-webhook-secret
WEBHOOK_PORT=3000
WEBHOOK_PATH=/webhook/meta

# API Configuration
API_PORT=8080
API_KEY_HEADER=x-api-key
API_RATE_LIMIT=1000

# Worker Configuration
WORKER_CONCURRENCY=10
WORKER_POLL_INTERVAL=1000
EXTRACTION_INTERVAL=300000

# Logging Configuration
LOG_LEVEL=info
LOG_FORMAT=json
CORRELATION_ID_HEADER=x-correlation-id

# Platform URLs (for outbound messaging)
WHATSAPP_API_BASE_URL=https://graph.facebook.com/v22.0
INSTAGRAM_API_BASE_URL=https://graph.facebook.com/v22.0
WEBCHAT_WIDGET_URL=https://your-domain.com/widget

# Application Configuration
NODE_ENV=production
APP_NAME=multi-channel-ai-agent
APP_VERSION=1.0.0
```

#### Configuration Loading Strategy

```typescript
interface AppConfig {
  database: {
    url: string;
    poolSize: number;
    timeout: number;
  };
  redis: {
    url: string;
    ttlDefault: number;
    queueMaxSize: number;
  };
  openai: {
    apiKey: string;
    baseUrl: string;
    timeout: number;
    maxRetries: number;
  };
  webhook: {
    secret: string;
    port: number;
    path: string;
  };
  api: {
    port: number;
    keyHeader: string;
    rateLimit: number;
  };
  worker: {
    concurrency: number;
    pollInterval: number;
    extractionInterval: number;
  };
  platforms: {
    whatsappBaseUrl: string;
    instagramBaseUrl: string;
    webchatWidgetUrl: string;
  };
}

// Configuration validation and loading
function loadConfig(): AppConfig {
  // Validate required environment variables
  // Parse and type-cast values
  // Provide sensible defaults where appropriate
  // Throw errors for missing critical configuration
}
```

## Documentation Structure

### Comprehensive API Documentation

The system will include detailed documentation organized by functional areas, with interactive examples and clear integration guides.

#### Documentation Directory Structure

```
documentation/
│
├── agents/
│   ├── create_agent.md          # POST /users/:user_id/agents
│   ├── list_agents.md           # GET /users/:user_id/agents  
│   ├── get_agent.md             # GET /users/:user_id/agents/:agent_id
│   ├── update_agent.md          # PATCH /users/:user_id/agents/:agent_id
│   └── delete_agent.md          # DELETE /users/:user_id/agents/:agent_id
│
├── users/
│   ├── create_user.md           # POST /users
│   ├── list_phone_numbers.md    # GET /users/:user_id/phone_numbers
│   ├── add_phone_number.md      # POST /users/:user_id/phone_numbers
│   ├── delete_phone_number.md   # DELETE /users/:user_id/phone_numbers/:phone_number_id
│   └── user_credits.md          # GET/POST /users/:user_id/credits
│
├── messages/
│   ├── get_messages.md          # GET /users/:user_id/messages
│   └── conversation_id_handling.md  # Conversation lifecycle documentation
│
├── extractions/
│   ├── get_extraction.md        # GET /users/:user_id/extractions
│   └── extraction_rules.md      # Extraction logic and field definitions
│
├── prompts/
│   └── linking_prompt.md        # How to link OpenAI prompts to agents
│
├── examples/
│   ├── curl/                    # cURL command examples for all endpoints
│   │   ├── agent_management.sh
│   │   ├── phone_number_setup.sh
│   │   ├── message_retrieval.sh
│   │   └── credit_management.sh
│   └── typescript/              # TypeScript SDK examples
│       ├── agent_client.ts
│       ├── message_client.ts
│       └── types.ts
│
└── README.md                    # Overview and quick start guide
```

#### Documentation Content Standards

Each API documentation file will include:

1. **Endpoint Overview**
   - Purpose and use case
   - Authentication requirements
   - Rate limiting information

2. **Request Specification**
   - HTTP method and URL pattern
   - Required and optional parameters
   - Request body schema with examples
   - Header requirements

3. **Response Specification**
   - Success response format
   - Error response formats
   - HTTP status codes
   - Response field descriptions

4. **Code Examples**
   - cURL commands with real examples
   - TypeScript/JavaScript integration code
   - Response payload examples

5. **Integration Notes**
   - Common use cases and workflows
   - Error handling recommendations
   - Best practices and limitations

#### Interactive Documentation Features

- **Postman Collection**: Complete API collection for testing
- **OpenAPI Specification**: Machine-readable API definition
- **Live Examples**: Working code snippets with placeholder data
- **Integration Guides**: Step-by-step setup for WhatsApp, Instagram, and Web Chat
- **Troubleshooting**: Common issues and solutions
- **Changelog**: API version history and breaking changes

This documentation structure ensures developers can quickly understand, integrate, and troubleshoot the multi-channel AI agent service across all supported platforms.