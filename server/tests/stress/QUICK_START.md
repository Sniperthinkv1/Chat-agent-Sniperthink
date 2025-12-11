# WebChat Stress Test - Quick Start

## One-Line Commands

### Using npm scripts (Recommended)
```bash
# Check if system is ready
npm run stress:check

# Setup test user with credits
npm run stress:setup

# Run the stress test
npm run stress:run

# Setup + Run (all-in-one)
npm run stress:test
```

### Using direct commands
```bash
# Check readiness
node tests/stress/check-readiness.js

# Setup user
node tests/stress/setup-test-user.js

# Run test
node tests/stress/webchat-stress-test.js
```

### Using batch file (Windows)
```cmd
tests\stress\run-complete-test.cmd
```

## Prerequisites

**Terminal 1 - Server:**
```bash
cd server
npm run dev
```

**Terminal 2 - Workers:**
```bash
cd server
npm run workers:all
```

## What Happens

1. Creates 10 agents for `user_test_webchat`
2. Spawns 50 new sessions per second
3. Runs for 30 seconds (~1500 total sessions)
4. Measures response times
5. Generates statistics

## Success Criteria

✅ **PASS**: 95%+ of responses under 10 seconds

## Output

```
📊 STRESS TEST RESULTS
Session Statistics:
  Total: 1500
  Successful: 1485 (99.00%)
  Failed: 15 (1.00%)

Response Time Statistics:
  Average: 2847.32ms
  Longest wait: 8943ms
  P50: 2654ms
  P95: 5234ms
  P99: 7821ms

Test Result:
  ✅ PASS - 100% under 10000ms

Throughput:
  Actual: 49.26 sessions/sec
  Target: 50 sessions/sec
```

## Results File

Saved to: `tests/stress/stress-test-results-[timestamp].json`

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Server not running | `npm run dev` |
| Workers not running | `npm run workers:all` |
| Insufficient credits | `npm run stress:setup` |
| High failures | Increase workers, check logs |
| Slow responses | Optimize workers, check DB |

## Customization

Edit `tests/stress/webchat-stress-test.js`:

```javascript
const CONFIG = {
  PROMPT_ID: 'pmpt_68de2bd80fa08196ab95184e7787c6e30c231f4a29f082a0',  // OpenAI prompt
  SESSIONS_PER_SECOND: 50,      // Change load
  TEST_DURATION_SECONDS: 30,    // Change duration
  NUM_AGENTS: 10,               // Change agent count
  SUCCESS_THRESHOLD_MS: 10000   // Change threshold
};
```

## That's It!

Just run `npm run stress:test` and watch the results! 🚀
