# Implementation Plan

- [x] 1. Project Setup and Core Infrastructure





  - Initialize Node.js project in `server/` directory with TypeScript configuration
  - Set up environment configuration loading with validation in `server/src/config/`
  - Configure database connection with Neon Postgres in `server/src/utils/database.ts`
  - Set up Redis connection with Upstash in `server/src/utils/redis.ts`
  - Create complete project structure following steering guidelines
  - Create mandatory unit test structure in `server/tests/` mirroring `server/src/`
  - _Requirements: All requirements depend on proper project foundation_

- [x] 1.1 Project Structure and Configuration Setup


  - Create `server/` parent directory with complete folder structure
  - Initialize package.json with TypeScript, Jest, and required dependencies
  - Set up tsconfig.json with strict mode enabled
  - Create jest.config.js for unit testing configuration
  - Set up environment configuration system in `server/src/config/index.ts`
  - Create configuration validation with TypeScript interfaces
  - _Requirements: Environment Configuration section_



- [x] 1.2 Database Schema and Connection Setup
  - Create database migration files in `server/migrations/`
  - Implement database connection pooling in `server/src/utils/database.ts`
  - Create database health check functionality
  - Write unit tests for database utilities in `server/tests/unit/utils/database.test.ts`
  - Ensure all database tests pass before proceeding



  - _Requirements: 1.1, 2.1, 4.1, 5.1, 6.3, 9.1_

- [x] 1.3 Redis Connection and Operations Setup

  - Set up Redis client with connection pooling in `server/src/utils/redis.ts`
  - Implement Redis operations (get, set, delete, expire, locks)
  - Create Redis health check functionality
  - Write comprehensive unit tests in `server/tests/unit/utils/redis.test.ts`
  - Mock Redis operations for all dependent tests
  - _Requirements: 3.2, 7.2, 10.1_

- [x] 2. Core Data Models and Services



  - Implement TypeScript interfaces in `server/src/models/types.ts`
  - Create database service layer with CRUD operations
  - Build Redis cache service with TTL management
  - Add input validation utilities in `server/src/utils/validation.ts`
  - Write comprehensive unit tests for all models and services
  - _Requirements: 1.1, 2.1, 5.1, 6.3, 9.1, 10.1_



- [x] 2.1 User and Phone Number Management

  - Create User model in `server/src/models/User.ts` with CRUD operations
  - Implement PhoneNumber model in `server/src/models/PhoneNumber.ts`
  - Add validation for phone number types (whatsapp, instagram, webchat)
  - Create userService in `server/src/services/userService.ts`
  - Write unit tests in `server/tests/unit/models/User.test.ts` and `server/tests/unit/models/PhoneNumber.test.ts`
  - Write service tests in `server/tests/unit/services/userService.test.ts`
  - Ensure all tests pass with mocked database dependencies

  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2.2 Agent Management Service


  - Implement Agent model in `server/src/models/Agent.ts`
  - Create agentService in `server/src/services/agentService.ts`
  - Add conversation archival logic for agent relinking
  - Implement agent CRUD operations with proper validation
  - Write unit tests in `server/tests/unit/models/Agent.test.ts`
  - Write service tests in `server/tests/unit/services/agentService.test.ts`
  - Mock all database and Redis dependencies in tests
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 9.1, 9.3_

- [x] 2.3 Conversation and Message Models

  - Create Conversation model in `server/src/models/Conversation.ts`
  - Implement Message model in `server/src/models/Message.ts`
  - Add conversation lifecycle management
  - Create message storage with sequence numbering
  - Write unit tests in `server/tests/unit/models/Conversation.test.ts`
  - Write unit tests in `server/tests/unit/models/Message.test.ts`
  - Ensure all model tests achieve minimum 80% coverage
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 3. Redis Queue and Locking System





  - Implement Redis-based message queue in `server/src/utils/queue.ts`
  - Create Redis lock mechanism in `server/src/utils/locks.ts`
  - Add message deduplication using Redis sets with TTL
  - Build queue monitoring and capacity management
  - Write comprehensive unit tests for all queue and locking utilities
  - _Requirements: 3.2, 3.3, 7.1, 7.2, 7.3, 7.4_

- [x] 3.1 Message Queue Implementation


  - Create message enqueue/dequeue operations in `server/src/utils/queue.ts`
  - Implement FIFO ordering per phone_number_id using Redis streams
  - Add queue capacity monitoring and overflow handling
  - Create lease-based job processing with TTL for worker crash recovery
  - Write unit tests in `server/tests/unit/utils/queue.test.ts`
  - Mock Redis operations and test queue behavior thoroughly
  - _Requirements: 3.2, 7.1, 7.3, 7.4_



- [x] 3.2 Redis Locking and Deduplication





  - Implement distributed locking in `server/src/utils/locks.ts`
  - Create message deduplication using hash-based keys with 5-second TTL
  - Add lock acquisition timeout and retry logic
  - Build lock monitoring and cleanup for orphaned locks
  - Write unit tests in `server/tests/unit/utils/locks.test.ts`
  - Test lock acquisition, release, and timeout scenarios
  - _Requirements: 3.3, 7.2, 7.5_
-

- [x] 4. Webhook Handler and Message Processing




  - Create webhook controller in `server/src/controllers/webhook.ts`
  - Implement message parsing and validation for WhatsApp/Instagram payloads
  - Add message enqueueing with proper error handling
  - Build webhook response handling with appropriate HTTP status codes
  - Write comprehensive unit tests for webhook functionality
  - _Requirements: 3.1, 3.2, 8.1_

- [x] 4.1 Webhook Signature Validation


  - Implement signature validation middleware in `server/src/middleware/auth.ts`
  - Create payload parsing for different platform message formats
  - Add request logging middleware in `server/src/middleware/logging.ts`
  - Build error response handling for invalid webhooks
  - Write unit tests in `server/tests/unit/controllers/webhook.test.ts`
  - Write middleware tests in `server/tests/unit/middleware/auth.test.ts`
  - _Requirements: 3.1_



- [x] 4.2 Message Worker Implementation





  - Create messageWorker in `server/src/workers/messageWorker.ts`
  - Implement Redis lock acquisition before processing each message
  - Add credit validation before OpenAI API calls
  - Build message processing pipeline with error handling
  - Write unit tests in `server/tests/unit/workers/messageWorker.test.ts`
  - Mock all external dependencies (OpenAI, Redis, Database)
  - _Requirements: 3.3, 3.4, 5.1, 5.2, 7.1, 7.2_





- [x] 5. OpenAI Responses API Integration






  - Implement OpenAI Responses API service in `server/src/services/openaiService.ts`
  - Reference: [[OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses)]
  - Reference: [[Migration Guide](https://platform.openai.com/docs/assistants/migration)]
  - Create OpenAI conversation management (create, reuse, cleanup)
  - Add response processing and validation
  - Build retry logic for API failures with exponential backoff
  - Write comprehensive unit tests with mocked OpenAI API
  - _Requirements: 3.4, 4.2, 4.3_


- [x] 5.1 OpenAI Responses API Client and Conversation Management

  
  **Implementation Steps:**
  
  1. **Add Database Migration** (`server/migrations/004_add_openai_conversation_id.sql`)
     - Add `openai_conversation_id VARCHAR(100)` to conversations table
     - Add index on `openai_conversation_id`
     - Add comment explaining OpenAI Responses API usage
  
  2. **Update TypeScript Types** (`server/src/models/types.ts`)
     - Add `openai_conversation_id?: string` to Conversation interface
     - Add `openai_conversation_id?: string` to CreateConversationData
     - Update OpenAICallResult interface with conversationId field
  
  3. **Update Conversation Model** (`server/src/models/Conversation.ts`)
     - Add `updateOpenAIConversationId(conversationId, openaiConversationId)` method
     - Add `findByOpenAIConversationId(openaiConversationId)` method
     - Update create method to accept openai_conversation_id
  
  4. **Implement OpenAI Service** (`server/src/services/openaiService.ts`)
     - Create `createOpenAIConversation(metadata)` function
     - Create `getOrCreateOpenAIConversation(conversationId)` function
     - Implement `callOpenAI(messageText, openaiConversationId, promptId)` function
     - Use Responses API endpoint: `POST /v1/responses`
     - Request structure:
       ```typescript
       {
         prompt: { id: promptId },  // From agent.prompt_id
         input: [{ role: 'user', content: messageText }],
         conversation: openaiConversationId  // Reuse for context
       }
       ```
     - Parse response: `response.output[0].content[0].text`
     - Add retry logic with exponential backoff
     - Handle rate limits and API errors
  
  5. **Update Conversation Service** (`server/src/services/conversationService.ts`)
     - Add `ensureOpenAIConversation(conversationId)` function
     - Check if conversation has openai_conversation_id
     - If not, create OpenAI conversation and update database
     - Return openai_conversation_id for use in API calls
  
  6. **Update Configuration** (`server/src/config/index.ts`)
     - Keep existing OPENAI_API_KEY
     - Keep existing OPENAI_BASE_URL
     - Note: prompt_id comes from agent.prompt_id (not env var)
  
  7. **Write Unit Tests** (`server/tests/unit/services/openaiService.test.ts`)
     - Mock OpenAI Responses API endpoint
     - Test conversation creation
     - Test response parsing
     - Test error handling and retries
     - Test conversation reuse
  
  **Key Implementation Notes:**
  - One OpenAI conversation per customer conversation (not per agent)
  - Reuse openai_conversation_id for all messages in same conversation
  - OpenAI manages context automatically via conversation
  - Our database stores complete audit trail
  - prompt_id comes from agents table (created in OpenAI dashboard)
  
  _Requirements: 3.4, 4.2_



- [x] 5.2 Outbound Message Delivery to Meta Platforms





  
  **Implementation Steps:**
  
  1. **Implement Message Service** (`server/src/services/messageService.ts`)
     - Create `sendWhatsAppMessage(metaPhoneNumberId, customerPhone, messageText, accessToken)` function
     - Create `sendInstagramMessage(instagramAccountId, customerPhone, messageText, accessToken)` function
     - Use Meta Graph API v22.0
     - Retrieve `meta_phone_number_id` and `access_token` from phone_numbers table
     - Handle platform-specific message formats
  
  2. **Add Access Token Management**
     - Query phone_numbers table for access_token by phone_number_id
     - Cache access tokens in Redis (5-10 min TTL)
     - Invalidate cache on token updates
  
  3. **Add Delivery Status Tracking**
     - Update message status in database (sent, failed, pending)
     - Store platform_message_id from Meta API response
     - Log delivery failures with error details
  
  4. **Build Manual Retry Functionality**
     - Create `retryFailedMessage(messageId)` function
     - Retrieve failed message from database
     - Attempt redelivery with same content
     - Update status based on result
  
  5. **Write Unit Tests** (`server/tests/unit/services/messageService.test.ts`)
     - Mock Meta Graph API endpoints
     - Test WhatsApp message sending
     - Test Instagram message sending
     - Test error handling
     - Test retry logic
  
  **Meta API Integration:**
  ```typescript
  // WhatsApp
  POST https://graph.facebook.com/v22.0/{meta_phone_number_id}/messages
  Headers: Authorization: Bearer {access_token}
  Body: {
    messaging_product: 'whatsapp',
    to: customerPhone,
    type: 'text',
    text: { body: messageText }
  }
  
  // Instagram
  POST https://graph.facebook.com/v22.0/{instagram_account_id}/messages
  Headers: Authorization: Bearer {access_token}
  Body: {
    recipient: { id: customerPhone },
    message: { text: messageText }
  }
  ```
  
  _Requirements: 3.4, 3.5, 8.4_



- [x] 6. Credit Management System


  - Create creditService in `server/src/services/creditService.ts`
  - Implement credit deduction after successful message delivery
  - Add credit addition API with balance updates
  - Build credit usage monitoring and reporting
  - Write comprehensive unit tests for credit operations
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 8.3_


-

- [x] 6.1 Credit Validation and Deduction



  - Implement pre-processing credit checks with Redis caching
  - Create atomic credit deduction after successful delivery
  - Add credit insufficient error handling
  - Build credit usage logging for audit trails
  - Write unit tests in `server/tests/unit/services/creditService.test.ts`
  - Mock database and Redis operations for credit tests
  - _Requirements: 5.1, 5.2, 5.3_



- [x] 7. Lead Extraction System



  - Create extractionWorker in `server/src/workers/extractionWorker.ts`
  - Implement OpenAI-based lead data extraction with structured prompts
  - Add extraction data validation and field mapping
  - Build extraction scheduling based on activity timestamps
  - Write comprehensive unit tests for extraction functionality
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_
-

- [x] 7.1 Extraction Worker and Scheduling






  - Implement activity-based extraction triggering (5-15 minute intervals manged by env)
  - Create extraction prompt management for structured data output
  - Add extraction retry logic for failed attempts
  - Build extraction result validation against expected schema
  - Write unit tests in `server/tests/unit/workers/extractionWorker.test.ts`
  - Mock OpenAI API and database operations

  - _Requirements: 6.1, 6.4, 6.5_

- [x] 7.2 Structured Data Storage

  - Create Extraction model in `server/src/models/Extraction.ts`
  - Implement extractionService in `server/src/services/extractionService.ts`
  - Add extraction history tracking per conversation
  - Build extraction data retrieval APIs
  - Write unit tests in `server/tests/unit/models/Extraction.test.ts`
  - Write service tests in `server/tests/unit/services/extractionService.test.ts`
  - _Requirements: 6.3, 8.3_

- [x] 8. REST API Implementation



  - Create Express.js server in `server/src/app.ts`
  - Implement middleware in `server/src/middleware/`
  - Add rate limiting and request validation
  - Build comprehensive error handling and logging
  - Write unit tests for all controllers and middleware
  - _Requirements: 8.1, 8.2, 8.5_


- [x] 8.1 Phone Number Management APIs

  - Create users controller in `server/src/controllers/users.ts`
  - Implement POST /users/:user_id/phone_numbers for adding phone numbers
  - Create GET /users/:user_id/phone_numbers for listing phone numbers
  - Add DELETE /users/:user_id/phone_numbers/:phone_number_id for removal
  - Write unit tests in `server/tests/unit/controllers/users.test.ts`
  - Mock all service layer dependencies
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 8.1_



- [x] 8.2 Agent Management APIs
  - Create agents controller in `server/src/controllers/agents.ts`
  - Implement all agent CRUD operations with proper validation
  - Add conversation archival for agent deletion
  - Build proper error handling and response formatting
  - Write unit tests in `server/tests/unit/controllers/agents.test.ts`
  - Test all endpoint scenarios including error cases


  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 8.1_

- [x] 8.3 Message and Conversation APIs




  - Create messages controller in `server/src/controllers/messages.ts`
  - Implement GET /users/:user_id/messages with filtering
  - Add message history pagination and sorting
  - Build conversation status and activity tracking
  - Write unit tests in `server/tests/unit/controllers/messages.test.ts`
  - Mock message service dependencies
  - _Requirements: 4.1, 4.2, 8.2_




- [x] 8.4 Credit Management APIs

  - Add credit endpoints to users controller
  - Create GET /users/:user_id/credits for credit balance retrieval
  - Implement POST /users/:user_id/credits/add for credit addition
  - Build credit validation middleware




  - Write unit tests for credit endpoints
  - Test credit validation middleware scenarios
  - _Requirements: 5.1, 5.4, 8.3_

- [x] 8.5 Extraction and Analytics APIs

  - Create extractions controller in `server/src/controllers/extractions.ts`
  - Implement GET /users/:user_id/extractions with filtering
  - Add manual extraction triggering endpoints
  - Build extraction data export functionality
  - Write unit tests in `server/tests/unit/controllers/extractions.test.ts`
  - Mock extraction service dependencies
  - _Requirements: 6.3, 8.3_

- [x] 9. Caching and Performance Optimization

  - Implement cacheService in `server/src/services/cacheService.ts`
  - Create cache invalidation strategies for data updates
  - Add cache warming for critical data paths
  - Build cache monitoring and performance metrics
  - Write comprehensive unit tests for caching functionality
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 9.1 User Data Caching Strategy












  - Create cached user data structure with agent mappings and credit balances
  - Implement cache-aside pattern with database fallback
  - Add TTL management (5-10 minutes) with refresh on updates
  - Build cache invalidation on user/agent modifications
  - Write unit tests in `server/tests/unit/services/cacheService.test.ts`
  - Mock Redis operations and test cache behavior
  - _Requirements: 10.1, 10.2, 10.3, 10.5_



- [x] 10. Worker Scaling and Monitoring




  - Create workerManager in `server/src/workers/workerManager.ts`
  - Create health checks and monitoring endpoints
  - Add performance metrics collection and logging
  - Build alerting for system failures and performance issues
  - Write unit tests for worker management functionality
  - _Requirements: 7.1, 7.2, 7.4_

- [x] 10.1 Worker Auto-scaling Implementation



  - Create worker pool management based on queue length and CPU usage
  - Implement graceful worker shutdown and restart
  - Add worker health monitoring and failure detection
  - Build worker performance metrics and logging
  - Write unit tests in `server/tests/unit/workers/workerManager.test.ts`
  - Mock system metrics and test scaling logic
  - _Requirements: 7.1, 7.2_

- [x] 10.2 Monitoring and Alerting System








  - Implement comprehensive logging with correlation IDs in `server/src/utils/logger.ts`
  - Create performance metrics collection (latency, throughput, error rates)
  - Add alerting for consecutive extraction failures and lost messages
  - Build system health dashboard and monitoring endpoints
  - Write unit tests in `server/tests/unit/utils/logger.test.ts`
  - _Requirements: 7.4_



- [x] 11. Documentation and Examples



  - Create comprehensive API documentation in `documentation/` directory
  - Build cURL and TypeScript example collections
  - Add integration guides for WhatsApp, Instagram, and Web Chat setup
  - Create troubleshooting guides and best practices documentation


  - _Requirements: Documentation Structure section_

- [x] 11.1 API Documentation Creation

  - Write detailed documentation for all API endpoints with request/response examples
  - Create interactive Postman collection for API testing

  - Build OpenAPI specification for machine-readable documentation
  - Add integration workflow guides for each platform
  - _Requirements: Documentation Structure section_

- [x] 11.2 Code Examples and SDK

  - Create comprehensive cURL examples in `documentation/examples/curl/`
  - Build TypeScript client library with type definitions
  - Add example applications demonstrating common use cases
  - Create setup guides for development and production environments
  - _Requirements: Documentation Structure section_

- [x] 12. Unit Testing Implementation (MANDATORY)


  - Ensure ALL components have corresponding unit tests in `server/tests/unit/`
  - Achieve minimum 80% code coverage for all business logic
  - Mock ALL external dependencies (database, Redis, OpenAI, Meta APIs)
  - Fix any failing unit tests immediately - no exceptions
  - Run tests before any code deployment
  - _Requirements: Testing Strategy section_

- [x] 12.1 Core Component Unit Tests



  - Write unit tests for all models in `server/tests/unit/models/`
  - Write unit tests for all services in `server/tests/unit/services/`
  - Write unit tests for all controllers in `server/tests/unit/controllers/`
  - Write unit tests for all workers in `server/tests/unit/workers/`
  - Write unit tests for all utilities in `server/tests/unit/utils/`
  - Write unit tests for all middleware in `server/tests/unit/middleware/`
  - _Requirements: Testing Strategy section_

- [x] 12.2 Integration and Performance Testing






  - Create integration tests in `server/tests/integration/`
  - Implement load testing scenarios for 100+ messages per second throughput
  - Create stress tests for queue overflow and worker scaling
  - Add latency testing for end-to-end message processing
  - Build performance benchmarking and regression testing
  - _Requirements: Testing Strategy section_
-

- [x] 13. Test Execution and Quality Gates





  - Set up Jest configuration with coverage reporting
  - Create test scripts in package.json for different test types
  - Implement pre-commit hooks to run unit tests
  - Set up continuous testing pipeline
  - Establish quality gates: all tests must pass before deployment
  - Create test fixtures and utilities in `server/tests/fixtures/`
  - _Requirements: Testing Strategy section_