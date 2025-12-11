# Integration and Performance Tests

This directory contains comprehensive integration and performance tests for the Multi-Channel AI Agent Service.

## Test Suites

### 1. Message Flow Integration Tests (`message-flow.test.ts`)
Tests the complete end-to-end message processing pipeline:
- Webhook to database flow
- Credit validation during message processing
- Conversation context persistence across multiple messages
- Message ordering and sequencing

**Run:** `npm run test:integration -- message-flow`

### 2. Load Testing (`load-test.test.ts`)
Tests system performance under high-volume conditions:
- 100+ messages per second throughput
- FIFO ordering under load
- Concurrent user message processing
- System stability under sustained load

**Run:** `npm run test:integration -- load-test`

**Requirements:**
- Target: 100+ messages/second
- Success rate: 95%+
- Ordering: Strict FIFO per phone_number_id

### 3. Stress Testing (`stress-test.test.ts`)
Tests system behavior under extreme conditions:
- Queue overflow handling (near 100k capacity)
- Worker scaling behavior
- Memory and resource management
- Database connection pool stress
- Graceful degradation

**Run:** `npm run test:integration -- stress-test`

**Warning:** These tests generate high load and may take several minutes to complete.

### 4. Latency Testing (`latency-test.test.ts`)
Measures and validates processing latencies:
- Webhook response time (< 200ms target)
- Database query latency (< 50ms target)
- Redis cache operations (< 10ms target)
- API endpoint response times
- End-to-end processing latency
- Percentile analysis (P50, P95, P99)

**Run:** `npm run test:integration -- latency-test`

### 5. Performance Benchmarking (`performance-benchmark.test.ts`)
Establishes performance baselines and detects regressions:
- Webhook processing benchmark
- Database query benchmark
- Redis operations benchmark
- API endpoint benchmark
- Concurrent operations benchmark
- Regression detection (20% threshold)

**Run:** `npm run test:integration -- performance-benchmark`

**Output:** Results saved to `tests/fixtures/benchmark-results.json`

## Prerequisites

### Environment Setup
Integration tests require real database and Redis connections:

```bash
# .env file
DATABASE_URL=postgresql://user:password@localhost:5432/test_db
REDIS_URL=redis://localhost:6379
API_KEY=test-api-key
OPENAI_API_KEY=sk-test-key
```

### Database Setup
```bash
# Create test database
createdb test_db

# Run migrations
npm run migrate

# Seed test data (optional)
npm run seed
```

### Redis Setup
```bash
# Start Redis locally
redis-server

# Or use Docker
docker run -d -p 6379:6379 redis:latest
```

## Running Tests

### Run All Integration Tests
```bash
npm run test:integration
```

### Run Specific Test Suite
```bash
npm run test:integration -- message-flow
npm run test:integration -- load-test
npm run test:integration -- stress-test
npm run test:integration -- latency-test
npm run test:integration -- performance-benchmark
```

### Run with Coverage
```bash
npm run test:integration -- --coverage
```

### Run in Watch Mode
```bash
npm run test:integration -- --watch
```

### Run with Verbose Output
```bash
npm run test:integration -- --verbose
```

## Performance Targets

### Latency Targets
- Webhook response: < 200ms
- Database queries: < 50ms
- Redis operations: < 10ms
- API endpoints: < 200ms
- End-to-end processing: < 2s

### Throughput Targets
- Message processing: 100+ msg/s
- Concurrent users: 20+ simultaneous
- Queue capacity: 100k messages

### Reliability Targets
- Success rate: 95%+
- Error rate: < 5%
- Memory growth: < 2x over sustained load

## Test Data Cleanup

All integration tests automatically clean up test data in `afterEach` and `afterAll` hooks. However, if tests fail unexpectedly, you may need to manually clean up:

```sql
-- Clean up test users
DELETE FROM credits WHERE user_id LIKE 'test-%' OR user_id LIKE 'load-%' OR user_id LIKE 'stress-%';
DELETE FROM messages WHERE conversation_id IN (
  SELECT conversation_id FROM conversations WHERE agent_id LIKE 'test-%'
);
DELETE FROM conversations WHERE agent_id LIKE 'test-%';
DELETE FROM agents WHERE agent_id LIKE 'test-%';
DELETE FROM phone_numbers WHERE phone_number_id LIKE 'test-%';
DELETE FROM users WHERE user_id LIKE 'test-%';
```

```bash
# Clean up Redis test keys
redis-cli KEYS "test-*" | xargs redis-cli DEL
redis-cli KEYS "bench:*" | xargs redis-cli DEL
```

## Troubleshooting

### Tests Timeout
- Increase Jest timeout in test file: `jest.setTimeout(120000)`
- Check database and Redis connectivity
- Verify sufficient system resources

### Connection Errors
- Ensure DATABASE_URL and REDIS_URL are correct
- Verify database and Redis are running
- Check firewall and network settings

### High Memory Usage
- Stress tests intentionally generate high load
- Monitor system resources during test execution
- Adjust test parameters if needed (reduce iterations)

### Flaky Tests
- Integration tests depend on external services
- Network latency can affect timing-sensitive tests
- Run tests multiple times to verify consistency

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - run: npm ci
      - run: npm run migrate
      - run: npm run test:integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db
          REDIS_URL: redis://localhost:6379
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Cleanup**: Always clean up test data in afterEach/afterAll hooks
3. **Timeouts**: Set appropriate timeouts for long-running tests
4. **Assertions**: Use meaningful assertions with clear error messages
5. **Logging**: Include console.log for performance metrics and debugging
6. **Mocking**: Mock external APIs (OpenAI, Meta) to avoid rate limits
7. **Parallelization**: Run tests sequentially (`--runInBand`) to avoid conflicts

## Monitoring and Metrics

### Key Metrics to Monitor
- Request latency (avg, p50, p95, p99)
- Throughput (requests/second)
- Error rate (%)
- Memory usage (heap size)
- Database connection pool utilization
- Redis operation latency
- Queue length and processing rate

### Benchmark Results
Performance benchmarks are saved to `tests/fixtures/benchmark-results.json` and can be used to:
- Track performance over time
- Detect regressions automatically
- Compare different implementations
- Establish SLA baselines

## Contributing

When adding new integration tests:
1. Follow existing test structure and naming conventions
2. Include setup and cleanup logic
3. Add appropriate timeouts
4. Document test purpose and requirements
5. Update this README with new test information
6. Ensure tests pass locally before committing
