# Project Organization & Structure

## Directory Structure

```
multi-channel-ai-agent/
├── src/
│   ├── controllers/          # Express route handlers
│   │   ├── agents.ts         # Agent management endpoints
│   │   ├── users.ts          # User and phone number management
│   │   ├── messages.ts       # Message retrieval and conversation APIs
│   │   ├── extractions.ts    # Lead extraction endpoints
│   │   └── webhook.ts        # Meta webhook handler
│   │
│   ├── services/             # Business logic layer
│   │   ├── agentService.ts   # Agent creation, updates, archival
│   │   ├── userService.ts    # User and phone number operations
│   │   ├── messageService.ts # Message processing and storage
│   │   ├── creditService.ts  # Credit validation and deduction
│   │   ├── extractionService.ts # Lead data extraction logic
│   │   ├── openaiService.ts  # OpenAI API integration
│   │   └── cacheService.ts   # Redis caching operations
│   │
│   ├── workers/              # Background job processors
│   │   ├── messageWorker.ts  # Message processing worker
│   │   ├── extractionWorker.ts # Lead extraction worker
│   │   └── workerManager.ts  # Worker scaling and health management
│   │
│   ├── models/               # Data models and interfaces
│   │   ├── User.ts           # User entity and operations
│   │   ├── PhoneNumber.ts    # Phone number and Instagram accounts
│   │   ├── Agent.ts          # AI agent configurations
│   │   ├── Conversation.ts   # Conversation lifecycle
│   │   ├── Message.ts        # Message storage and retrieval
│   │   ├── Extraction.ts     # Lead extraction data
│   │   └── types.ts          # Shared TypeScript interfaces
│   │
│   ├── middleware/           # Express middleware
│   │   ├── auth.ts           # API key authentication
│   │   ├── validation.ts     # Request validation
│   │   ├── rateLimit.ts      # Rate limiting
│   │   ├── logging.ts        # Request/response logging
│   │   └── errorHandler.ts   # Global error handling
│   │
│   ├── utils/                # Shared utilities
│   │   ├── database.ts       # Database connection and pooling
│   │   ├── redis.ts          # Redis client and operations
│   │   ├── queue.ts          # Message queue operations
│   │   ├── locks.ts          # Distributed locking utilities
│   │   ├── validation.ts     # Input validation helpers
│   │   └── logger.ts         # Structured logging
│   │
│   ├── config/               # Configuration management
│   │   ├── index.ts          # Main configuration loader
│   │   ├── database.ts       # Database configuration
│   │   ├── redis.ts          # Redis configuration
│   │   └── openai.ts         # OpenAI configuration
│   │
│   ├── migrations/           # Database schema migrations
│   │   ├── 001_initial_schema.sql
│   │   ├── 002_add_extractions.sql
│   │   └── 003_conversation_archives.sql
│   │
│   └── app.ts                # Express application setup
│
├── tests/                    # Test files (MANDATORY for all components)
│   ├── unit/                 # Unit tests (mirror src/ structure)
│   │   ├── controllers/      # Controller unit tests
│   │   ├── services/         # Service layer unit tests
│   │   ├── models/           # Model unit tests
│   │   ├── workers/          # Worker unit tests
│   │   ├── middleware/       # Middleware unit tests
│   │   └── utils/            # Utility function unit tests
│   ├── integration/          # Integration tests
│   ├── load/                 # Performance tests
│   └── fixtures/             # Test data and utilities
│
├── documentation/            # API documentation
│   ├── agents/               # Agent management docs
│   ├── users/                # User management docs
│   ├── messages/             # Message APIs docs
│   ├── extractions/          # Extraction APIs docs
│   └── examples/             # Code examples and cURL commands
│
├── scripts/                  # Utility scripts
│   ├── migrate.js            # Database migration runner
│   ├── seed.js               # Database seeding
│   └── worker-start.js       # Worker process starter
│
├── .env.example              # Environment variable template
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── jest.config.js            # Test configuration
└── README.md                 # Project overview and setup
```

## Code Organization Principles

### Separation of Concerns
- **Controllers**: Handle HTTP requests/responses, input validation, and route logic
- **Services**: Contain business logic, external API integrations, and data processing
- **Models**: Define data structures, database operations, and entity relationships
- **Workers**: Process background jobs with proper error handling and retry logic
- **Utils**: Provide shared functionality across the application

### Multi-Tenant Architecture
- All operations must include `user_id` as tenant identifier
- Database queries must filter by `user_id` to ensure data isolation
- Cache keys must include `user_id` to prevent cross-tenant data leakage
- API endpoints must validate user ownership of resources

### Message Processing Flow
1. **Webhook** receives message → validates signature → enqueues to Redis
2. **Message Worker** dequeues → acquires lock → validates credits → calls OpenAI
3. **Response** sent to platform → message stored → credits deducted → lock released
4. **Extraction Worker** monitors activity → triggers lead extraction → stores structured data

### Database Design Patterns
- **One agent per phone number** constraint enforced at database level
- **Conversation archival** when agents are relinked to preserve history
- **Message sequencing** with sequence_no for proper ordering
- **Soft deletion** for conversations with is_active flag

### Redis Usage Patterns
- **Message Queue**: Redis Streams for FIFO ordering per phone_number_id
- **Distributed Locks**: SETNX with TTL for message processing coordination
- **Caching**: User data, agent mappings, credit balances (5-10 min TTL)
- **Deduplication**: Hash-based keys with 5-second TTL

### Error Handling Strategy
- **API Errors**: Structured error responses with correlation IDs
- **Worker Failures**: Lease-based processing with automatic retry
- **External API Failures**: Exponential backoff with circuit breaker
- **Database Errors**: Connection pooling with graceful degradation

### Configuration Management
- **Environment Variables**: All configuration externalized, no hardcoded values
- **Validation**: Required variables validated at startup with clear error messages
- **Type Safety**: Configuration interfaces with proper TypeScript types
- **Defaults**: Sensible defaults for optional configuration values

### Testing Requirements
- **Unit Test Mandate**: Every component, service, model, worker, middleware, and utility MUST have corresponding unit tests
- **Test Location**: All tests must be placed in `tests/` folder with structure mirroring `src/`
- **Test Coverage**: Minimum 80% code coverage required for all business logic
- **Test Naming**: Test files should follow pattern `[filename].test.ts` or `[filename].spec.ts`
- **Mock Strategy**: External dependencies (database, Redis, OpenAI, Meta APIs) must be mocked in unit tests
- **Test Execution**: Tests must run successfully before any code deployment