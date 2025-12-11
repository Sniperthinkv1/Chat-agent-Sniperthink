# Development Setup Guide

Complete guide to setting up a local development environment for the Multi-Channel AI Agent service.

## Prerequisites

- Node.js 18+ and npm
- PostgreSQL (or Neon account)
- Redis (or Upstash account)
- OpenAI API account
- Meta Developer account (for WhatsApp/Instagram)
- Git

## Step 1: Clone and Install

```bash
# Clone repository
git clone https://github.com/your-org/multi-channel-ai-agent.git
cd multi-channel-ai-agent

# Install dependencies
cd server
npm install
```

## Step 2: Database Setup

### Option A: Local PostgreSQL

```bash
# Create database
createdb multi_channel_ai_agent_dev

# Run migrations
npm run migrate
```

### Option B: Neon (Cloud PostgreSQL)

1. Sign up at [Neon](https://neon.tech/)
2. Create a new project
3. Copy the connection string
4. Add to `.env` file

## Step 3: Redis Setup

### Option A: Local Redis

```bash
# Install Redis (macOS)
brew install redis

# Start Redis
redis-server

# Verify
redis-cli ping
# Should return: PONG
```

### Option B: Upstash (Cloud Redis)

1. Sign up at [Upstash](https://upstash.com/)
2. Create a new Redis database
3. Copy the connection URL
4. Add to `.env` file

## Step 4: Environment Configuration

Create `.env` file in `server/` directory:

```bash
# Copy example
cp .env.example .env

# Edit with your values
nano .env
```

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/multi_channel_ai_agent_dev
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_TTL_DEFAULT=300

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_BASE_URL=https://api.openai.com/v1

# Webhook
WEBHOOK_SECRET=your-webhook-secret-here
WEBHOOK_VERIFY_TOKEN=your-verify-token-here
WEBHOOK_PORT=3000

# API
API_PORT=8080
API_KEY_HEADER=x-api-key

# Workers
WORKER_CONCURRENCY=5
EXTRACTION_INTERVAL=300000

# Logging
LOG_LEVEL=debug
LOG_FORMAT=pretty

# Environment
NODE_ENV=development
```

## Step 5: Run Database Migrations

```bash
# Run all migrations
npm run migrate

# Verify migrations
npm run migrate:status
```

## Step 6: Start Development Servers

### Terminal 1: API Server

```bash
npm run dev
# Server starts on http://localhost:8080
```

### Terminal 2: Message Worker

```bash
npm run worker:message
```

### Terminal 3: Extraction Worker

```bash
npm run worker:extraction
```

## Step 7: Test the Setup

### Create Test User

```bash
curl -X POST http://localhost:8080/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "name": "Test User",
    "company_name": "Test Company"
  }'
```

Save the returned `user_id` and `api_key`.

### Add Test Phone Number

```bash
curl -X POST http://localhost:8080/v1/users/YOUR_USER_ID/phone_numbers \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "whatsapp",
    "meta_phone_number_id": "test_phone_123",
    "access_token": "test_token",
    "display_name": "+1 (555) 123-4567"
  }'
```

## Step 8: Configure Webhook (Optional)

For local webhook testing, use ngrok:

```bash
# Install ngrok
brew install ngrok

# Start ngrok
ngrok http 3000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
# Use this URL in Meta webhook configuration
```

## Development Workflow

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm test -- --watch

# Run specific test file
npm test -- users.test.ts

# Run with coverage
npm test -- --coverage
```

### Code Formatting

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

### Linting

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix
```

### Type Checking

```bash
# Check TypeScript types
npm run type-check
```

## Debugging

### VS Code Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API Server",
      "runtimeArgs": ["-r", "ts-node/register"],
      "args": ["${workspaceFolder}/server/src/app.ts"],
      "env": {
        "NODE_ENV": "development"
      },
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Tests",
      "runtimeArgs": ["-r", "ts-node/register", "--inspect-brk"],
      "args": [
        "${workspaceFolder}/server/node_modules/.bin/jest",
        "--runInBand",
        "--no-cache"
      ],
      "console": "integratedTerminal"
    }
  ]
}
```

### Logging

```typescript
// Use structured logging
import { logger } from './utils/logger';

logger.info('Processing message', {
  messageId: 'msg_123',
  userId: 'usr_abc',
  correlationId: req.correlationId
});

logger.error('Failed to send message', {
  error: error.message,
  stack: error.stack,
  correlationId: req.correlationId
});
```

## Common Development Tasks

### Reset Database

```bash
# Drop and recreate database
npm run db:reset

# Run migrations
npm run migrate

# Seed test data
npm run seed
```

### Clear Redis Cache

```bash
# Connect to Redis
redis-cli

# Clear all keys
FLUSHALL

# Or clear specific pattern
KEYS user:*
DEL user:usr_abc123:*
```

### Monitor Workers

```bash
# Check worker status
npm run worker:status

# View worker logs
tail -f logs/worker.log

# Restart workers
npm run worker:restart
```

## Troubleshooting

### Port Already in Use

```bash
# Find process using port
lsof -i :8080

# Kill process
kill -9 <PID>
```

### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL

# Check PostgreSQL status
pg_isready
```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli ping

# Check Redis status
redis-cli info
```

### TypeScript Compilation Errors

```bash
# Clean build
rm -rf dist/
npm run build

# Check for type errors
npm run type-check
```

## Best Practices

### Code Organization

- Keep controllers thin, move logic to services
- Use TypeScript interfaces for all data structures
- Write tests alongside implementation
- Follow existing code patterns

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/your-feature
```

### Testing

- Write unit tests for all business logic
- Mock external dependencies
- Aim for 80%+ code coverage
- Test error cases

### Environment Variables

- Never commit `.env` file
- Keep `.env.example` updated
- Use descriptive variable names
- Document all variables

## Next Steps

- [Production Deployment Guide](production-deployment.md)
- [API Documentation](../api/openapi.yaml)
- [Contributing Guidelines](../../CONTRIBUTING.md)
- [Code Style Guide](code-style.md)

## Support

- GitHub Issues: https://github.com/your-org/multi-channel-ai-agent/issues
- Slack Channel: #dev-support
- Email: dev@example.com
