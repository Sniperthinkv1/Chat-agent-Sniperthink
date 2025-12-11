---
inclusion: always
---
#Dont create any document .md file untile and unless explicitely ask for it
# Technology Stack & Development Guidelines

## Core Technologies

### Runtime & Language
- **Node.js** with **TypeScript** for type safety and developer experience
- **Express.js** for REST API server implementation
- Environment-based configuration with validation (no hardcoded values)

### Data Storage
- **Neon Postgres** - Primary database for persistent storage
- **Redis (Upstash)** - Message queuing, caching, and distributed locking
- Connection pooling for both database and Redis connections

### External Integrations
- **OpenAI Response API** - AI processing with conversation context
- **Meta Platforms APIs** - WhatsApp Business API, Instagram Messaging API
- **Web Chat Widget** - Custom web chat implementation

### Architecture Patterns
- **Multi-worker architecture** with Redis-based job queuing
- **Queue-based message processing** with strict FIFO ordering per phone_number_id
- **Cache-aside pattern** for frequently accessed data (5-10 minute TTL)
- **Distributed locking** using Redis SETNX for message ordering
- **Circuit breaker pattern** for external API resilience

## Project Structure

```
multi-channel-ai-agent/
├── server/                   # Main backend application
│   ├── src/
│   │   ├── controllers/      # Express route handlers and API endpoints
│   │   ├── services/         # Business logic and external service integrations
│   │   ├── models/           # Database models and TypeScript interfaces
│   │   ├── workers/          # Background job processors (message, extraction)
│   │   ├── utils/            # Shared utilities and helper functions
│   │   ├── middleware/       # Express middleware (auth, validation, logging)
│   │   └── config/           # Configuration loading and validation
│   ├── tests/                # Test files (MANDATORY for all components)
│   ├── migrations/           # Database schema migrations
│   └── scripts/              # Utility scripts
├── documentation/            # Interactive API documentation
│   ├── api/                  # OpenAPI/Swagger specs
│   ├── guides/               # Implementation guides
│   └── examples/             # Code examples and cURL commands
└── reference-docs/           # Technical reference documentation (CRITICAL)
    ├── database.md           # Database schema, tables, relationships, queries
    ├── instagramapi.md       # Instagram Messaging API reference and examples
    ├── whatsappapi.md        # WhatsApp Business API reference and examples
    ├── architecture.md       # System architecture details
    ├── deployment.md         # Deployment procedures
    └── troubleshooting.md    # Common issues and solutions
```

## Development Guidelines

### Code Organization Rules
- **Multi-tenant isolation**: All operations MUST include `user_id` for tenant separation
- **Environment variables**: NO hardcoded values - all config externalized
- **Error handling**: Structured responses with correlation IDs for traceability
- **TypeScript strict mode**: Enable all strict type checking options
- **Async/await**: Use async/await over Promises for better readability

### File Naming Conventions
- **Controllers**: `[resource]Controller.ts` (e.g., `agentController.ts`)
- **Services**: `[domain]Service.ts` (e.g., `messageService.ts`)
- **Models**: `[Entity].ts` with PascalCase (e.g., `User.ts`, `PhoneNumber.ts`)
- **Utils**: `[functionality].ts` with camelCase (e.g., `database.ts`, `redis.ts`)
- **Tests**: `[filename].test.ts` mirroring source structure

### Common Commands (run from server/ directory)
```bash
# Development
npm install && npm run dev
npm run build:watch
npm test -- --watch

# Database
npm run migrate
npm run seed
npm run db:reset  # dev only

# Production
npm run build && npm start
npm run migrate:prod

# Workers
npm run workers:all
```

## Critical Configuration

### Required Environment Variables
```bash
# Database & Cache
DATABASE_URL=postgresql://...     # Neon Postgres connection
REDIS_URL=redis://...            # Upstash Redis connection

# External APIs
OPENAI_API_KEY=sk-...            # OpenAI API authentication
WEBHOOK_SECRET=...               # Meta webhook signature validation
META_API_BASE_URL=...            # WhatsApp/Instagram API base URL

# Application
NODE_ENV=production              # Environment mode
PORT=3000                        # Server port
LOG_LEVEL=info                   # Logging verbosity
```

### Configuration Validation Rules
- Validate ALL required variables at startup
- Fail fast with clear error messages for missing config
- Use TypeScript interfaces for configuration objects
- Provide sensible defaults only for optional values

## Performance Requirements

- **Throughput**: 100+ messages/second processing capacity
- **Ordering**: Strict FIFO per phone_number_id using Redis locks
- **Latency**: Sub-second message processing end-to-end
- **Reliability**: Graceful handling of API failures with retry logic
- **Scalability**: Auto-scaling workers based on queue length and CPU usage

## Testing Requirements (MANDATORY)

### Unit Testing Rules
- **EVERY component MUST have unit tests** - controllers, services, models, workers, middleware, utils
- **Test location**: `server/tests/` with structure mirroring `server/src/`
- **Coverage target**: Minimum 80% for all business logic
- **Mock strategy**: Mock ALL external dependencies (DB, Redis, OpenAI, Meta APIs)
- **Test naming**: Descriptive test names following Arrange-Act-Assert pattern

### Test Implementation Guidelines
```typescript
// Example test structure
describe('MessageService', () => {
  beforeEach(() => {
    // Arrange: Setup mocks and test data
  });

  it('should process message and deduct credits when valid', async () => {
    // Arrange: Mock dependencies
    // Act: Call service method
    // Assert: Verify behavior and side effects
  });
});
```

### Testing Tools Stack
- **Jest**: Primary testing framework with coverage reporting
- **Supertest**: HTTP endpoint testing
- **Jest mocks**: Dependency mocking (`jest.mock()`)
- **Test fixtures**: Reusable test data in `tests/fixtures/`

### Performance Testing
- **Load tests**: Simulate 100+ messages/second scenarios
- **Redis operations**: Test distributed locking under load
- **Database queries**: Validate query performance with large datasets
## Imp
lementation Patterns

### Message Processing Flow
1. **Webhook receives message** → validate signature → enqueue to Redis
2. **Acquire distributed lock** using Redis SETNX with phone_number_id
3. **Validate credits** → call OpenAI API → send response → store message
4. **Release lock** → trigger extraction worker if needed

### Error Handling Patterns
```typescript
// Service layer error handling
try {
  const result = await externalApiCall();
  return { success: true, data: result };
} catch (error) {
  logger.error('Operation failed', { error, correlationId });
  throw new ServiceError('Operation failed', error.code);
}

// Controller error responses
app.use((error, req, res, next) => {
  const correlationId = req.headers['x-correlation-id'];
  res.status(error.statusCode || 500).json({
    error: error.message,
    correlationId,
    timestamp: new Date().toISOString()
  });
});
```

### Database Query Patterns
- **Always filter by user_id** for multi-tenant isolation
- **Use connection pooling** for both Postgres and Redis
- **Implement soft deletes** with `is_active` flags
- **Add proper indexes** on frequently queried columns

### Redis Usage Patterns
- **Message queues**: Redis Streams with consumer groups
- **Distributed locks**: `SETNX` with TTL for coordination
- **Caching**: Hash-based keys with 5-10 minute TTL
- **Deduplication**: Short-lived keys (5 seconds) for duplicate prevention

## Reference Documentation Requirements

### CRITICAL: Always Consult Reference Docs
- **Database schema**: MUST read `reference-docs/database.md` for all database operations
- **Instagram API**: MUST read `reference-docs/instagramapi.md` for Instagram integrations
- **WhatsApp API**: MUST read `reference-docs/whatsappapi.md` for WhatsApp integrations
- **Missing references**: If required reference docs don't exist, STOP and ask user to provide them

### Reference Doc Maintenance Rules
- **Keep updated**: All three reference docs (database.md, instagramapi.md, whatsappapi.md) MUST be kept current
- **Single source of truth**: Reference docs are the authoritative source for schemas and APIs
- **Update workflow**: When implementing features that change schemas or API usage, update reference docs FIRST
- **Centralized location**: ALL reference documentation MUST be in `reference-docs/` folder

## AI Assistant Guidelines

### Pre-Implementation Checklist
1. **Read requirements and design docs** before starting implementation
2. **Consult reference documentation** for database schema and API details
3. **STOP if reference docs missing** - ask user to provide missing documentation
4. **Create tests FIRST** or alongside implementation (TDD approach)
5. **Follow the project structure** - place files in correct directories
6. **Use TypeScript interfaces** for all data structures
7. **Implement proper error handling** with structured responses
8. **Add logging** with correlation IDs for debugging
9. **Validate all inputs** using middleware or service layer validation

### Code Quality Checklist
- [ ] Consulted reference docs (database.md, instagramapi.md, whatsappapi.md) as needed
- [ ] Updated reference docs if schema or API usage changed
- [ ] TypeScript strict mode enabled and no `any` types
- [ ] All external dependencies mocked in tests
- [ ] Environment variables used for configuration
- [ ] Multi-tenant isolation with user_id filtering
- [ ] Proper error handling with correlation IDs
- [ ] Structured logging for debugging
- [ ] Input validation and sanitization
- [ ] Connection pooling for database operations

### Reference Documentation Workflow
1. **Before database work**: Read `reference-docs/database.md` for schema understanding
2. **Before Instagram integration**: Read `reference-docs/instagramapi.md` for API details
3. **Before WhatsApp integration**: Read `reference-docs/whatsappapi.md` for API details
4. **If docs missing**: STOP implementation and request documentation from user
5. **After schema changes**: Update `reference-docs/database.md` immediately
6. **After API changes**: Update relevant API reference docs immediately