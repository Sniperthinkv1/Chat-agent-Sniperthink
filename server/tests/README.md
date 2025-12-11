# Test Suite Documentation

## Overview

This directory contains the comprehensive test suite for the Multi-Channel AI Agent Service. All tests are written using Jest and follow strict testing standards to ensure code quality and reliability.

## Test Structure

```
tests/
├── unit/                    # Unit tests (mirror src/ structure)
│   ├── controllers/         # Controller unit tests
│   ├── services/            # Service layer unit tests
│   ├── models/              # Model unit tests
│   ├── workers/             # Worker unit tests
│   ├── middleware/          # Middleware unit tests
│   └── utils/               # Utility function unit tests
├── integration/             # Integration tests
├── load/                    # Performance tests
├── fixtures/                # Test data and utilities
│   ├── users.ts             # User test fixtures
│   ├── phoneNumbers.ts      # Phone number test fixtures
│   ├── agents.ts            # Agent test fixtures
│   ├── conversations.ts     # Conversation test fixtures
│   ├── messages.ts          # Message test fixtures
│   ├── extractions.ts       # Extraction test fixtures
│   ├── webhooks.ts          # Webhook payload fixtures
│   ├── openai.ts            # OpenAI response fixtures
│   ├── helpers.ts           # Test helper utilities
│   └── index.ts             # Central export
├── setup.ts                 # Global test setup
└── README.md                # This file
```

## Running Tests

### All Tests
```bash
npm test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Integration Tests Only
```bash
npm run test:integration
```

### With Coverage Report
```bash
npm run test:coverage
```

### Watch Mode (for development)
```bash
npm run test:watch
```

### CI Mode
```bash
npm run test:ci
```

### Verbose Output
```bash
npm run test:verbose
```

### Silent Mode
```bash
npm run test:silent
```

### Changed Files Only
```bash
npm run test:changed
```

### Related Tests for Specific Files
```bash
npm run test:related src/services/messageService.ts
```

## Test Standards

### Coverage Requirements

- **Minimum 80% coverage** for all business logic
- All components MUST have corresponding unit tests
- External dependencies MUST be mocked

### Test File Naming

- Unit tests: `[filename].test.ts`
- Integration tests: `[feature].integration.test.ts`
- Test files MUST mirror the source structure

### Test Structure

All tests should follow the Arrange-Act-Assert (AAA) pattern:

```typescript
describe('ComponentName', () => {
  // Setup
  beforeEach(() => {
    // Arrange: Setup mocks and test data
  });

  // Cleanup
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('methodName', () => {
    it('should do something when condition is met', async () => {
      // Arrange: Setup specific test data
      const mockData = { ... };
      
      // Act: Execute the code under test
      const result = await methodName(mockData);
      
      // Assert: Verify the results
      expect(result).toBe(expectedValue);
      expect(mockFunction).toHaveBeenCalledWith(expectedArgs);
    });

    it('should throw error when invalid input provided', async () => {
      // Arrange
      const invalidData = { ... };
      
      // Act & Assert
      await expect(methodName(invalidData)).rejects.toThrow('Expected error message');
    });
  });
});
```

## Mocking Strategy

### Database Mocking

```typescript
import { createMockPool } from '../fixtures/helpers';

const mockPool = createMockPool();
mockPool.query.mockResolvedValue({ rows: [mockData], rowCount: 1 });
```

### Redis Mocking

```typescript
import { createMockRedisClient } from '../fixtures/helpers';

const mockRedis = createMockRedisClient();
mockRedis.get.mockResolvedValue(JSON.stringify(mockData));
mockRedis.set.mockResolvedValue('OK');
```

### OpenAI Mocking

```typescript
import { createMockOpenAIClient } from '../fixtures/helpers';
import { mockOpenAIResponse } from '../fixtures/openai';

const mockOpenAI = createMockOpenAIClient();
mockOpenAI.responses.create.mockResolvedValue(mockOpenAIResponse);
```

### Express Request/Response Mocking

```typescript
import { createMockRequest, createMockResponse, createMockNext } from '../fixtures/helpers';

const req = createMockRequest({ params: { user_id: 'test-user-123' } });
const res = createMockResponse();
const next = createMockNext();
```

## Using Test Fixtures

Import fixtures from the central export:

```typescript
import {
  mockUser,
  mockAgent,
  mockConversation,
  mockMessage,
  mockExtraction,
  mockWhatsAppWebhookPayload,
  mockOpenAIResponse,
} from '../fixtures';
```

## Quality Gates

### Pre-Commit Hook

Before each commit, the following checks run automatically:
- ESLint on changed files
- Jest tests for related files

### Pre-Push Hook

Before pushing to remote, the following checks run:
- Full test suite with coverage

### CI Pipeline

On pull requests and pushes to main/develop:
- Linting
- Unit tests
- Integration tests
- Coverage report generation
- Build verification

## Coverage Reports

After running tests with coverage, view the report:

```bash
# Terminal summary
npm run test:coverage

# HTML report (open in browser)
open coverage/lcov-report/index.html
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use `beforeEach` and `afterEach` for setup/cleanup
- Never rely on test execution order

### 2. Mock External Dependencies
- Always mock database connections
- Always mock Redis operations
- Always mock external API calls (OpenAI, Meta)
- Never make real network requests in tests

### 3. Descriptive Test Names
- Use clear, descriptive test names
- Follow pattern: "should [expected behavior] when [condition]"
- Group related tests using `describe` blocks

### 4. Test Edge Cases
- Test happy path scenarios
- Test error conditions
- Test boundary conditions
- Test invalid inputs

### 5. Async Testing
- Always use `async/await` for async tests
- Use `expect().rejects.toThrow()` for async errors
- Set appropriate timeouts for long-running tests

### 6. Avoid Test Duplication
- Use test fixtures for common data
- Extract common setup to helper functions
- Use `beforeEach` for repeated setup

### 7. Keep Tests Fast
- Mock slow operations
- Avoid unnecessary delays
- Run tests in parallel when possible

## Troubleshooting

### Tests Timing Out
- Increase timeout in jest.config.js
- Check for unresolved promises
- Ensure all async operations complete

### Mock Not Working
- Verify mock is set up before test execution
- Check mock implementation matches actual API
- Use `jest.clearAllMocks()` in `afterEach`

### Coverage Not Meeting Threshold
- Identify uncovered lines in coverage report
- Add tests for missing branches
- Remove dead code

### Flaky Tests
- Check for race conditions
- Ensure proper cleanup in `afterEach`
- Avoid relying on timing

## Contributing

When adding new code:
1. Write tests FIRST (TDD approach)
2. Ensure all tests pass
3. Verify coverage meets 80% threshold
4. Run linter and fix issues
5. Commit with descriptive message

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://testingjavascript.com/)
- [TypeScript Testing](https://www.typescriptlang.org/docs/handbook/testing.html)
