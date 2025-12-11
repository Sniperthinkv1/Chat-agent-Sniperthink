# Server Capacity Test Guide

## What This Test Does

Tests your **server's ability to handle burst traffic** with real OpenAI API calls.

### Test Scenario
- **Burst**: 100 messages/second for 2 seconds = 200 total messages
- **Monitor**: Track processing for 60 seconds after burst
- **Measure**: Queue depth, worker scaling, processing rates

### What You'll See

1. **Burst Phase** (2 seconds)
   - Rapid fire 200 messages to server
   - Measures HTTP endpoint capacity
   - Shows how many messages server accepts

2. **Processing Phase** (60 seconds)
   - Real-time monitoring of:
     - Queue depth (messages waiting)
     - Processing rate (messages/second)
     - Worker performance
     - OpenAI API handling

3. **Results**
   - Success rate (how many got AI responses)
   - Processing times (P50, P95, P99)
   - Peak queue depth
   - Queue drain time
   - Worker scaling behavior

## Running The Test

```bash
# From server/tests/stress directory
cd server/tests/stress

# Make sure server is running in another terminal
# Terminal 1:
cd server
npm run dev

# Terminal 2:
cd server/tests/stress
run-capacity-test.cmd

# Or directly:
node server-capacity-test.js
```

## Expected Results

### With OpenAI Rate Limits (400/min = 6.67/sec)

```
Burst Phase:
  ✅ 200 messages sent successfully
  ⏱️  Completed in ~2 seconds

Processing Phase:
  📊 Peak queue: ~180-190 messages (most waiting)
  ⚡ Processing rate: 5-7 messages/second (OpenAI limit)
  ⏳ Queue drain time: ~30-40 seconds
  ✅ Success rate: 95-100% (all eventually processed)
```

### What This Proves

✅ **Server handles burst gracefully**
- Accepts 100 msg/sec without crashing
- Queues messages properly
- No data loss

✅ **Async workers function correctly**
- Process messages in background
- Handle OpenAI rate limits
- Maintain FIFO ordering

✅ **System is production-ready**
- Can handle traffic spikes
- Degrades gracefully under load
- Recovers automatically

## Understanding The Output

### Live Monitoring Display
```
[15.2s] Queue: 145 | Sent: 200 | Processed: 55 | Rate: 6.2/s
```

- **Queue**: Messages waiting for AI response
- **Sent**: Total user messages received
- **Processed**: Messages with AI responses
- **Rate**: Current processing speed

### Timeline Table
```
Time | Queue | Processed | Rate
  5s |   195 |         5 | 1.0
 10s |   185 |        15 | 2.0
 15s |   145 |        55 | 8.0
 20s |    95 |        105| 10.0
 25s |    45 |        155| 10.0
 30s |     0 |        200| 9.0
```

Shows how queue drains over time.

## Interpreting Results

### ✅ Excellent (95%+ success)
```
Server capacity: EXCELLENT
- Handled burst without issues
- All messages processed
- Workers scaled properly
```

### ⚠️ Good (80-95% success)
```
Server capacity: GOOD
- Most messages processed
- Some OpenAI rate limiting
- System stable
```

### ❌ Needs Work (<80% success)
```
Server capacity: NEEDS IMPROVEMENT
- Significant failures
- Check: Database connections, memory, OpenAI key
```

## Troubleshooting

### High Failure Rate

**Problem**: Only 50% of messages processed

**Causes**:
1. OpenAI API key invalid/expired
2. Database connection pool exhausted
3. Server memory issues

**Solutions**:
```bash
# Check OpenAI key
echo $OPENAI_API_KEY

# Check database connections
# In .env, increase:
DATABASE_POOL_MAX=20

# Check server memory
# Task Manager > Node.js process
```

### Slow Processing Rate

**Problem**: Only 2-3 messages/second

**Causes**:
1. OpenAI API slow responses
2. Database query performance
3. Network latency

**Solutions**:
- Check OpenAI status page
- Optimize database indexes
- Use faster database (Neon vs local)

### Queue Never Drains

**Problem**: Queue stays at 150+ messages

**Causes**:
1. Workers not running
2. OpenAI API errors
3. Database write failures

**Solutions**:
```bash
# Check server logs for errors
# Look for:
# - "Worker processing message"
# - "OpenAI API call"
# - "Message stored"
```

## Comparing With Previous Test

### Old Stress Test (webchat-stress-test.js)
- Waited for each response
- Timed out after 30 seconds
- Showed 60% failure

### New Capacity Test (server-capacity-test.js)
- Sends burst, then monitors
- Tracks queue processing
- Shows true system behavior

**Key Difference**: Old test measured "instant response capacity" (limited by OpenAI). New test measures "total throughput capacity" (server + workers).

## Next Steps

### If Test Passes (95%+)
✅ Server is production-ready for burst traffic
✅ Can handle 100 msg/sec spikes
✅ Workers scale properly

### If Test Fails (<80%)
1. Check OpenAI API key and limits
2. Increase database connection pool
3. Monitor server resources (CPU, memory)
4. Review server logs for errors

## Production Recommendations

Based on test results:

```
Sustained Load: 5-7 messages/second (OpenAI limit)
Burst Capacity: 100+ messages/second (queued)
Queue Drain: ~30-40 seconds for 200 messages
Worker Scaling: Automatic (async processing)
```

**Recommendation**: 
- Set up monitoring for queue depth
- Alert if queue > 500 messages
- Scale horizontally if sustained load > 5 msg/sec
- Consider multiple OpenAI accounts for higher throughput

## Files Generated

After test completes:
```
capacity-1234567890.json  - Detailed results with timeline
```

Contains:
- All configuration settings
- Complete timeline snapshots
- Processing time statistics
- Queue depth history

Use for:
- Performance analysis
- Capacity planning
- Optimization tracking
