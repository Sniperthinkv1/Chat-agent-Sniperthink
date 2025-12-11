# API Examples

This directory contains code examples and sample requests for the Multi-Channel AI Agent API.

## Directory Structure

```
examples/
├── curl/              # Shell scripts with cURL examples
│   ├── agent_management.sh
│   ├── phone_number_setup.sh
│   ├── message_retrieval.sh
│   └── credit_management.sh
├── typescript/        # TypeScript SDK and examples
│   ├── client.ts
│   ├── examples.ts
│   └── types.ts
└── postman/          # Postman collection
    └── collection.json
```

## Quick Start

### Using cURL Examples

1. Set your API credentials:
   ```bash
   export API_KEY="sk_live_..."
   export USER_ID="usr_abc123"
   ```

2. Run example scripts:
   ```bash
   cd curl/
   chmod +x *.sh
   ./agent_management.sh
   ```

### Using TypeScript SDK

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables:
   ```bash
   export API_KEY="sk_live_..."
   export API_BASE_URL="https://api.example.com/v1"
   ```

3. Run examples:
   ```bash
   npx ts-node examples.ts
   ```

### Using Postman

1. Import `postman/collection.json` into Postman
2. Set environment variables:
   - `api_key`: Your API key
   - `base_url`: API base URL
   - `user_id`: Your user ID
3. Run requests from the collection

## Example Workflows

### Complete Setup Workflow

1. **Create User**
   ```bash
   curl -X POST https://api.example.com/v1/users \
     -H "Content-Type: application/json" \
     -d '{"email": "john@example.com", "name": "John Doe"}'
   ```

2. **Add Phone Number**
   ```bash
   curl -X POST https://api.example.com/v1/users/usr_abc123/phone_numbers \
     -H "x-api-key: sk_live_..." \
     -H "Content-Type: application/json" \
     -d '{
       "platform": "whatsapp",
       "meta_phone_number_id": "836990829491415",
       "access_token": "EAAxxxx...",
       "display_name": "+1 (234) 567-8900"
     }'
   ```

3. **Create Agent**
   ```bash
   curl -X POST https://api.example.com/v1/users/usr_abc123/agents \
     -H "x-api-key: sk_live_..." \
     -H "Content-Type: application/json" \
     -d '{
       "phone_number_id": "pn_abc123",
       "prompt_id": "prompt_xyz789",
       "name": "Customer Support Agent"
     }'
   ```

4. **Add Credits**
   ```bash
   curl -X POST https://api.example.com/v1/users/usr_abc123/credits \
     -H "x-api-key: sk_live_..." \
     -H "Content-Type: application/json" \
     -d '{"amount": 1000}'
   ```

### Message Retrieval Workflow

```bash
# Get all messages
curl -X GET "https://api.example.com/v1/users/usr_abc123/messages?limit=50" \
  -H "x-api-key: sk_live_..."

# Filter by agent
curl -X GET "https://api.example.com/v1/users/usr_abc123/messages?agent_id=agt_xyz789" \
  -H "x-api-key: sk_live_..."

# Filter by conversation
curl -X GET "https://api.example.com/v1/users/usr_abc123/messages?conversation_id=conv_123" \
  -H "x-api-key: sk_live_..."
```

### Lead Extraction Workflow

```bash
# Get all extractions
curl -X GET "https://api.example.com/v1/users/usr_abc123/extractions" \
  -H "x-api-key: sk_live_..."

# Filter by agent
curl -X GET "https://api.example.com/v1/users/usr_abc123/extractions?agent_id=agt_xyz789" \
  -H "x-api-key: sk_live_..."
```

## TypeScript SDK Usage

### Basic Setup

```typescript
import { MultiChannelAIClient } from './client';

const client = new MultiChannelAIClient({
  baseUrl: 'https://api.example.com/v1',
  apiKey: process.env.API_KEY!,
});
```

### Create and Configure Agent

```typescript
// Add phone number
const phoneNumber = await client.addPhoneNumber(userId, {
  platform: 'whatsapp',
  meta_phone_number_id: '836990829491415',
  access_token: 'EAAxxxx...',
  display_name: '+1 (234) 567-8900',
});

// Create agent
const agent = await client.createAgent(userId, {
  phone_number_id: phoneNumber.id,
  prompt_id: 'prompt_xyz789',
  name: 'Customer Support Agent',
});

// Add credits
await client.addCredits(userId, 1000);
```

### Retrieve Messages and Extractions

```typescript
// Get messages
const { messages } = await client.getMessages(userId, {
  agent_id: agentId,
  limit: 50,
});

// Get extractions
const { extractions } = await client.getExtractions(userId, {
  agent_id: agentId,
});

// Process extractions
extractions.forEach(extraction => {
  console.log(`Lead: ${extraction.name} (${extraction.email})`);
  console.log(`Intent: ${extraction.intent}`);
  console.log(`Urgency: ${extraction.urgency}/3`);
});
```

## Error Handling

### cURL

```bash
# Capture HTTP status code
HTTP_STATUS=$(curl -s -o response.json -w "%{http_code}" \
  https://api.example.com/v1/users/usr_abc123/agents \
  -H "x-api-key: sk_live_...")

if [ $HTTP_STATUS -eq 200 ]; then
  echo "Success"
  cat response.json | jq '.'
else
  echo "Error: HTTP $HTTP_STATUS"
  cat response.json | jq '.error'
fi
```

### TypeScript

```typescript
try {
  const agent = await client.createAgent(userId, agentData);
  console.log('Agent created:', agent.agent_id);
} catch (error) {
  if (error instanceof Error) {
    console.error('API Error:', error.message);
  }
}
```

## Rate Limiting

All API endpoints are rate limited:

- 100 requests per minute per API key
- 1000 requests per hour per API key

Implement exponential backoff for rate limit errors:

```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}
```

## See Also

- [API Reference](../api/openapi.yaml)
- [WhatsApp Integration Guide](../guides/whatsapp-setup.md)
- [Instagram Integration Guide](../guides/instagram-setup.md)
- [Troubleshooting Guide](../guides/troubleshooting.md)
