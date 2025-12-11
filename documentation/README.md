# Multi-Channel AI Agent API Documentation

Complete documentation for the Multi-Channel AI Agent service - a scalable platform for deploying AI chatbots across WhatsApp, Instagram, and Web Chat.

## Quick Links

- **[OpenAPI Specification](api/openapi.yaml)** - Complete API reference (30 endpoints)
- **[Interactive Documentation](#interactive-documentation)** - Swagger UI and Redoc
- **[Getting Started](#getting-started)** - Quick start guide
- **[Integration Guides](#integration-guides)** - Platform-specific setup
- **[Code Examples](examples/)** - cURL, TypeScript, and Postman
- **[Troubleshooting](guides/troubleshooting.md)** - Common issues and solutions

## Interactive Documentation

### Using Swagger UI

View and test the API interactively with Swagger UI:

```bash
# Install swagger-ui-express
npm install swagger-ui-express yamljs

# Add to your Express app
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const swaggerDocument = YAML.load('./documentation/api/openapi.yaml');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```

Then visit: `http://localhost:3000/api-docs`

### Using Redoc

Generate beautiful API documentation with Redoc:

```bash
# Serve with Redoc CLI
npx redoc-cli serve documentation/api/openapi.yaml

# Or build static HTML
npx redoc-cli build documentation/api/openapi.yaml -o api-docs.html
```

### Import to Postman

Import the OpenAPI spec directly into Postman:

1. Open Postman
2. Click **Import** → **Link**
3. Paste the path to `documentation/api/openapi.yaml`
4. All 30 endpoints will be imported with examples

### Generate Client Libraries

Generate type-safe client libraries from the OpenAPI spec:

```bash
# TypeScript/Axios client
npx @openapitools/openapi-generator-cli generate \
  -i documentation/api/openapi.yaml \
  -g typescript-axios \
  -o clients/typescript

# Python client
npx @openapitools/openapi-generator-cli generate \
  -i documentation/api/openapi.yaml \
  -g python \
  -o clients/python

# Other languages: java, go, ruby, php, etc.
```

## Getting Started

### 1. Create User Account

```bash
curl -X POST https://api.example.com/v1/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your@email.com",
    "name": "Your Name",
    "company_name": "Your Company"
  }'
```

Save the returned `user_id` and `api_key`.

### 2. Add Phone Number

```bash
curl -X POST https://api.example.com/v1/users/YOUR_USER_ID/phone_numbers \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "whatsapp",
    "meta_phone_number_id": "836990829491415",
    "access_token": "EAAxxxx...",
    "display_name": "+1 (234) 567-8900"
  }'
```

### 3. Create AI Agent

```bash
curl -X POST https://api.example.com/v1/users/YOUR_USER_ID/agents \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number_id": "pn_abc123",
    "prompt_id": "prompt_xyz789",
    "name": "Customer Support Agent"
  }'
```

### 4. Add Credits

```bash
curl -X POST https://api.example.com/v1/users/YOUR_USER_ID/credits \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"amount": 1000}'
```

## Documentation Structure

```
documentation/
├── api/                      # API specifications
│   └── openapi.yaml         # OpenAPI 3.0 spec
├── agents/                   # Agent management docs
│   └── create_agent.md      # Agent creation guide
├── users/                    # User management docs
│   └── add_phone_number.md  # Phone number setup
├── guides/                   # Integration guides
│   ├── whatsapp-setup.md    # WhatsApp integration
│   ├── instagram-setup.md   # Instagram integration
│   ├── development-setup.md # Local development
│   ├── production-deployment.md # Production deployment
│   └── troubleshooting.md   # Common issues
└── examples/                 # Code examples
    ├── curl/                # Shell scripts
    ├── typescript/          # TypeScript SDK
    └── postman/             # Postman collection
```

## Integration Guides

### WhatsApp Business API

Complete guide to integrating WhatsApp Business API with step-by-step instructions for:
- Setting up WhatsApp Business Account
- Generating access tokens
- Configuring webhooks
- Testing integration

**[Read WhatsApp Integration Guide →](guides/whatsapp-setup.md)**

### Instagram Messaging API

Comprehensive guide for Instagram Business integration covering:
- Instagram Business Account setup
- Access token generation
- Webhook configuration
- Message handling

**[Read Instagram Integration Guide →](guides/instagram-setup.md)**

### Web Chat Widget

Guide for integrating the web chat widget into your website.

## Code Examples

### cURL Examples

Ready-to-use shell scripts for all API operations:

```bash
cd examples/curl/
chmod +x *.sh

# Run agent management examples
./agent_management.sh

# Run phone number setup examples
./phone_number_setup.sh
```

**[Browse cURL Examples →](examples/curl/)**

### TypeScript SDK

Type-safe client library with complete examples:

```typescript
import { MultiChannelAIClient } from './client';

const client = new MultiChannelAIClient({
  baseUrl: 'https://api.example.com/v1',
  apiKey: process.env.API_KEY!,
});

// Create agent
const agent = await client.createAgent(userId, {
  phone_number_id: 'pn_abc123',
  prompt_id: 'prompt_xyz789',
  name: 'Customer Support Agent',
});
```

**[Browse TypeScript Examples →](examples/typescript/)**

### Postman Collection

Import the complete API collection into Postman for interactive testing:

1. Import `examples/postman/collection.json`
2. Set environment variables
3. Start making requests

**[Download Postman Collection →](examples/postman/collection.json)**

## API Endpoints (30 Total)

### Health & Status (2)
- `GET /ping` - Simple ping check
- `GET /health` - Detailed health status

### Users & Phone Numbers (5)
- `POST /users/{user_id}/phone_numbers` - Add phone number
- `GET /users/{user_id}/phone_numbers` - List phone numbers
- `DELETE /users/{user_id}/phone_numbers/{id}` - Delete phone number
- `GET /users/{user_id}/credits` - Get credit balance
- `POST /users/{user_id}/credits/add` - Add credits

### Agents (5)
- `POST /users/{user_id}/agents` - Create agent
- `GET /users/{user_id}/agents` - List agents
- `GET /users/{user_id}/agents/{agent_id}` - Get agent
- `PATCH /users/{user_id}/agents/{agent_id}` - Update agent
- `DELETE /users/{user_id}/agents/{agent_id}` - Delete agent

### Messages & Conversations (6)
- `GET /users/{user_id}/messages` - Get messages with filtering
- `GET /users/{user_id}/messages/stats` - Message statistics
- `GET /users/{user_id}/conversations` - List conversations
- `GET /users/{user_id}/conversations/{id}` - Get conversation details
- `GET /users/{user_id}/conversations/{id}/messages` - Get conversation messages

### Lead Extractions (6)
- `GET /users/{user_id}/extractions` - Get extractions (with history)
- `GET /users/{user_id}/extractions/stats` - Extraction statistics
- `GET /users/{user_id}/extractions/export` - Export as CSV/JSON
- `GET /users/{user_id}/extractions/{id}` - Get extraction details
- `GET /users/{user_id}/conversations/{id}/extraction` - Get conversation extraction
- `POST /users/{user_id}/conversations/{id}/extract` - Trigger extraction

### Webhooks (2)
- `GET /webhook/meta` - Webhook verification
- `POST /webhook/meta` - Receive messages (WhatsApp/Instagram)

### Cache Management (6)
- `POST /api/cache/invalidate/session` - Invalidate session cache
- `POST /api/cache/invalidate/phone-number` - Invalidate phone number cache
- `POST /api/cache/invalidate/agent` - Invalidate agent cache
- `POST /api/cache/invalidate/credits` - Invalidate credits cache
- `POST /api/cache/clear-all` - Clear all cache (disabled)
- `GET /api/cache/stats` - Get cache statistics (disabled)

**[View Complete OpenAPI Specification →](api/openapi.yaml)**

## Authentication

All API requests require an API key in the `x-api-key` header:

```bash
curl -X GET https://api.example.com/v1/users/YOUR_USER_ID/agents \
  -H "x-api-key: YOUR_API_KEY"
```

## Rate Limits

- 100 requests per minute per API key
- 1000 requests per hour per API key

Rate limit headers are included in responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1612345678
```

## Error Handling

All errors follow a consistent format:

```json
{
  "error": "Validation error",
  "message": "phone_number_id is required",
  "correlation_id": "req_abc123",
  "timestamp": "2025-02-10T10:00:00Z"
}
```

Common HTTP status codes:

- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict
- `429` - Too Many Requests
- `500` - Internal Server Error

## Development Setup

Set up a local development environment:

**[Read Development Setup Guide →](guides/development-setup.md)**

## Production Deployment

Deploy to production with best practices:

**[Read Production Deployment Guide →](guides/production-deployment.md)**

## Troubleshooting

Common issues and solutions:

- Authentication problems
- Webhook configuration
- Message delivery failures
- Agent configuration issues

**[Read Troubleshooting Guide →](guides/troubleshooting.md)**

## Support

- **Documentation**: https://docs.example.com
- **Email**: support@example.com
- **Status Page**: https://status.example.com
- **GitHub Issues**: https://github.com/your-org/multi-channel-ai-agent/issues

## Reference Documentation

Technical reference for developers:

- **[Database Schema](../reference-docs/database.md)** - Complete database schema
- **[WhatsApp API](../reference-docs/whatsappapi.md)** - WhatsApp API reference
- **[Instagram API](../reference-docs/instagramapi.md)** - Instagram API reference
- **[OpenAI API](../reference-docs/openaiapi.md)** - OpenAI integration details

## Contributing

We welcome contributions! Please see our contributing guidelines for details.

## License

MIT License - see LICENSE file for details