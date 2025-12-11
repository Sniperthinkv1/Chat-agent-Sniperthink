# WebChat Stress Test

Stress test for the webchat system that creates 50 new sessions per second for 30 seconds.

## Test Configuration

- **Sessions per second**: 50
- **Test duration**: 30 seconds
- **Total sessions**: ~1500
- **User ID**: `user_test_webchat`
- **Number of agents**: 10
- **Success threshold**: Response time under 10 seconds

## Prerequisites

1. **Server running**: `npm run dev` (in server directory)
2. **Workers running**: `npm run workers:all` (in server directory)
3. **Database accessible**: Ensure DATABASE_URL is configured
4. **Sufficient credits**: User needs credits for 1500+ messages

## Running the Test

### Windows
```cmd
cd server
tests\stress\run-stress-test.cmd
```

### Linux/Mac
```bash
cd server
node tests/stress/webchat-stress-test.js
```

### Custom Configuration
```bash
# Change base URL
BASE_URL=http://your-server:3000 node tests/stress/webchat-stress-test.js

# Run with different parameters (edit the CONFIG object in the script)
```

## What the Test Does

1. **Setup Phase**:
   - Creates 10 agents for user `user_test_webchat`
   - Each agent configured for webchat channel

2. **Stress Test Phase**:
   - Creates 50 new sessions per second
   - Each session sends 1 message
   - Sessions distributed randomly across 10 agents
   - Runs for 30 seconds (1500 total sessions)

3. **Measurement Phase**:
   - Tracks response time for each session
   - Waits for all pending requests to complete
   - Calculates statistics

## Metrics Reported

### Session Statistics
- Total sessions created
- Successful sessions (count and percentage)
- Failed sessions (count and percentage)

### Response Time Statistics
- Average response time
- Minimum response time
- Maximum response time (longest wait)
- Median (P50)
- P95 percentile
- P99 percentile
- Percentage under 10-second threshold

### Throughput
- Actual sessions per second achieved
- Test duration
- Comparison to target throughput

### Pass/Fail Criteria
- **PASS**: 95% or more requests complete under 10 seconds
- **FAIL**: Less than 95% under threshold

## Output Files

Results are saved to:
```
server/tests/stress/stress-test-results-[timestamp].json
```

Contains:
- Full configuration
- Summary statistics
- All response times
- Error details
- Agent IDs used

## Interpreting Results

### Good Performance
```
✅ PASS - 98.5% of requests under 10000ms
Average: 2500ms
P95: 5000ms
P99: 7500ms
```

### Poor Performance
```
❌ FAIL - Only 75.2% of requests under 10000ms
Average: 8500ms
P95: 15000ms
P99: 25000ms
```

## Troubleshooting

### High Failure Rate
- Check worker count (increase if needed)
- Check database connection pool size
- Monitor CPU and memory usage
- Check OpenAI API rate limits

### Slow Response Times
- Increase worker count
- Optimize database queries
- Check network latency to OpenAI
- Review message processing logic

### Connection Errors
- Ensure server is running
- Check BASE_URL configuration
- Verify firewall settings
- Check server logs for errors

## Monitoring During Test

Watch these metrics:
1. **Worker CPU usage**: Should be high but not maxed
2. **Database connections**: Should not hit pool limit
3. **Memory usage**: Should remain stable
4. **Server logs**: Check for errors or warnings
5. **OpenAI API calls**: Monitor rate limits

## Cleanup

After the test, you may want to:
1. Archive or delete test agents
2. Clear test conversation data
3. Review and save test results
4. Reset any rate limiters if needed

## Customization

Edit `webchat-stress-test.js` CONFIG object:

```javascript
const CONFIG = {
  BASE_URL: 'http://localhost:3000',
  USER_ID: 'user_test_webchat',
  NUM_AGENTS: 10,                    // Change number of agents
  SESSIONS_PER_SECOND: 50,           // Change load
  TEST_DURATION_SECONDS: 30,         // Change duration
  SUCCESS_THRESHOLD_MS: 10000,       // Change threshold
  MESSAGE_TEXT: '...'                // Change test message
};
```
