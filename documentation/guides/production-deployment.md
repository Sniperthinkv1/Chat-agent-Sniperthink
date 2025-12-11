# Production Deployment Guide

Complete guide to deploying the Multi-Channel AI Agent service to production.

## Prerequisites

- Production-ready infrastructure (AWS, GCP, Azure, or similar)
- Domain name with SSL certificate
- Neon PostgreSQL account
- Upstash Redis account
- OpenAI API production key
- Meta Business accounts (verified)

## Architecture Overview

```
┌─────────────────┐
│   Load Balancer │
│   (SSL/TLS)     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ API   │ │ API   │
│Server │ │Server │
└───┬───┘ └──┬────┘
    │        │
    └────┬───┘
         │
    ┌────▼────────┐
    │   Workers   │
    │  (Scaled)   │
    └─────────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│ Neon  │ │Upstash│
│  DB   │ │ Redis │
└───────┘ └───────┘
```

## Step 1: Infrastructure Setup

### Database (Neon)

1. Create production database
2. Enable connection pooling
3. Configure backup schedule
4. Set up monitoring

```bash
# Connection string format
DATABASE_URL=postgresql://user:password@host.neon.tech:5432/dbname?sslmode=require
```

### Redis (Upstash)

1. Create production Redis instance
2. Enable TLS
3. Configure eviction policy
4. Set up monitoring

```bash
# Connection string format
REDIS_URL=rediss://default:password@host.upstash.io:6379
```

## Step 2: Environment Configuration

Create production `.env` file:

```bash
# Database
DATABASE_URL=postgresql://...
DATABASE_POOL_SIZE=50
DATABASE_TIMEOUT=30000

# Redis
REDIS_URL=rediss://...
REDIS_TTL_DEFAULT=300
REDIS_QUEUE_MAX_SIZE=100000

# OpenAI
OPENAI_API_KEY=sk-prod-...
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT=30000
OPENAI_MAX_RETRIES=3

# Webhook
WEBHOOK_SECRET=<strong-random-secret>
WEBHOOK_VERIFY_TOKEN=<strong-random-token>
WEBHOOK_PORT=3000
WEBHOOK_PATH=/webhook/meta

# API
API_PORT=8080
API_KEY_HEADER=x-api-key
API_RATE_LIMIT=1000

# Workers
WORKER_CONCURRENCY=20
WORKER_POLL_INTERVAL=1000
EXTRACTION_INTERVAL=300000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
CORRELATION_ID_HEADER=x-correlation-id

# Environment
NODE_ENV=production
APP_NAME=multi-channel-ai-agent
APP_VERSION=1.0.0
```

## Step 3: Build and Deploy

### Build Application

```bash
# Install dependencies
npm ci --production

# Build TypeScript
npm run build

# Run tests
npm test

# Verify build
node dist/app.js --version
```

### Docker Deployment

Create `Dockerfile`:

```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production

# Copy source
COPY . .

# Build
RUN npm run build

# Expose ports
EXPOSE 8080 3000

# Start application
CMD ["node", "dist/app.js"]
```

Build and push:

```bash
# Build image
docker build -t multi-channel-ai-agent:latest .

# Tag for registry
docker tag multi-channel-ai-agent:latest registry.example.com/multi-channel-ai-agent:latest

# Push to registry
docker push registry.example.com/multi-channel-ai-agent:latest
```

## Step 4: Database Migration

```bash
# Backup production database
pg_dump $DATABASE_URL > backup.sql

# Run migrations
npm run migrate:prod

# Verify migrations
npm run migrate:status
```

## Step 5: Deploy Services

### API Server

```bash
# Start API server
NODE_ENV=production node dist/app.js

# Or with PM2
pm2 start dist/app.js --name api-server -i max

# Save PM2 configuration
pm2 save
pm2 startup
```

### Workers

```bash
# Start message worker
pm2 start dist/workers/messageWorker.js --name message-worker -i 4

# Start extraction worker
pm2 start dist/workers/extractionWorker.js --name extraction-worker -i 2

# Monitor workers
pm2 monit
```

## Step 6: Configure Load Balancer

### Nginx Configuration

```nginx
upstream api_backend {
    least_conn;
    server 10.0.1.10:8080;
    server 10.0.1.11:8080;
}

upstream webhook_backend {
    server 10.0.1.10:3000;
    server 10.0.1.11:3000;
}

server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/ssl/certs/api.example.com.crt;
    ssl_certificate_key /etc/ssl/private/api.example.com.key;

    location /v1/ {
        proxy_pass http://api_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /webhook/ {
        proxy_pass http://webhook_backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Step 7: Monitoring Setup

### Health Checks

```typescript
// Add health check endpoint
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      database: await checkDatabase(),
      redis: await checkRedis(),
      workers: await checkWorkers()
    }
  };
  
  res.json(health);
});
```

### Logging

```bash
# Configure log rotation
cat > /etc/logrotate.d/multi-channel-ai-agent << EOF
/var/log/multi-channel-ai-agent/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 app app
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### Metrics

```typescript
// Add Prometheus metrics
import prometheus from 'prom-client';

const messageCounter = new prometheus.Counter({
  name: 'messages_processed_total',
  help: 'Total messages processed'
});

const messageLatency = new prometheus.Histogram({
  name: 'message_processing_duration_seconds',
  help: 'Message processing duration'
});
```

## Step 8: Security Hardening

### API Security

```typescript
// Rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/v1/', limiter);

// Helmet for security headers
import helmet from 'helmet';
app.use(helmet());

// CORS configuration
import cors from 'cors';
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
}));
```

### Secrets Management

```bash
# Use AWS Secrets Manager, HashiCorp Vault, or similar
# Never store secrets in code or environment files

# Example with AWS Secrets Manager
aws secretsmanager get-secret-value \
  --secret-id prod/multi-channel-ai-agent/api-keys \
  --query SecretString \
  --output text
```

## Step 9: Backup Strategy

### Database Backups

```bash
# Automated daily backups
0 2 * * * pg_dump $DATABASE_URL | gzip > /backups/db-$(date +\%Y\%m\%d).sql.gz

# Retention: Keep 30 days
find /backups -name "db-*.sql.gz" -mtime +30 -delete
```

### Redis Backups

```bash
# Enable RDB snapshots in Upstash dashboard
# Or use Redis BGSAVE command
redis-cli BGSAVE
```

## Step 10: Monitoring and Alerts

### CloudWatch / Datadog Setup

```typescript
// Send metrics to CloudWatch
import AWS from 'aws-sdk';
const cloudwatch = new AWS.CloudWatch();

async function sendMetric(name: string, value: number) {
  await cloudwatch.putMetricData({
    Namespace: 'MultiChannelAIAgent',
    MetricData: [{
      MetricName: name,
      Value: value,
      Timestamp: new Date()
    }]
  }).promise();
}
```

### Alert Configuration

```yaml
# Example alert rules
alerts:
  - name: HighErrorRate
    condition: error_rate > 5%
    duration: 5m
    severity: critical
    
  - name: LowCreditBalance
    condition: credits < 1000
    duration: 1m
    severity: warning
    
  - name: WorkerDown
    condition: worker_count < 2
    duration: 2m
    severity: critical
```

## Deployment Checklist

- [ ] Environment variables configured
- [ ] Database migrations run
- [ ] SSL certificates installed
- [ ] Load balancer configured
- [ ] Health checks passing
- [ ] Monitoring enabled
- [ ] Alerts configured
- [ ] Backups scheduled
- [ ] Security hardening complete
- [ ] Documentation updated
- [ ] Team notified

## Rollback Procedure

```bash
# 1. Stop new deployment
pm2 stop all

# 2. Restore database backup
psql $DATABASE_URL < backup.sql

# 3. Deploy previous version
docker pull registry.example.com/multi-channel-ai-agent:previous
docker run -d registry.example.com/multi-channel-ai-agent:previous

# 4. Verify health
curl https://api.example.com/health

# 5. Restart workers
pm2 restart all
```

## Performance Optimization

### Database

- Enable connection pooling (50+ connections)
- Add indexes on frequently queried columns
- Use read replicas for analytics queries
- Monitor slow queries

### Redis

- Use pipelining for batch operations
- Set appropriate TTLs
- Monitor memory usage
- Use Redis Cluster for scaling

### Application

- Enable compression
- Use CDN for static assets
- Implement caching strategies
- Optimize worker concurrency

## Troubleshooting

### High CPU Usage

```bash
# Check process CPU
top -p $(pgrep -f "node dist/app.js")

# Profile application
node --prof dist/app.js
node --prof-process isolate-*.log
```

### Memory Leaks

```bash
# Monitor memory
pm2 monit

# Generate heap snapshot
kill -USR2 $(pgrep -f "node dist/app.js")
```

### Database Connection Issues

```bash
# Check connection pool
SELECT count(*) FROM pg_stat_activity WHERE datname = 'your_db';

# Kill idle connections
SELECT pg_terminate_backend(pid) FROM pg_stat_activity 
WHERE state = 'idle' AND state_change < now() - interval '5 minutes';
```

## Support

- On-call: oncall@example.com
- Runbook: https://wiki.example.com/runbook
- Status Page: https://status.example.com
- Incident Response: https://wiki.example.com/incident-response
