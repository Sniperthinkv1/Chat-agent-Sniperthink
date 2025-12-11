# Create Agent

Create a new AI agent by linking an OpenAI prompt to a phone number or Instagram account.

## Endpoint

```
POST /users/{user_id}/agents
```

## Authentication

Requires API key in `x-api-key` header.

## Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| user_id | string | Yes | User identifier |

## Request Body

```json
{
  "phone_number_id": "pn_abc123",
  "prompt_id": "prompt_xyz789",
  "name": "Customer Support Agent"
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| phone_number_id | string | Yes | Phone number or Instagram account ID |
| prompt_id | string | Yes | OpenAI prompt ID from dashboard |
| name | string | Yes | Human-readable agent name |

## Response

### Success (201 Created)

```json
{
  "agent_id": "agt_xyz789",
  "user_id": "usr_abc123",
  "phone_number_id": "pn_abc123",
  "prompt_id": "prompt_xyz789",
  "name": "Customer Support Agent",
  "created_at": "2025-02-10T10:00:00Z",
  "updated_at": "2025-02-10T10:00:00Z"
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "Validation error",
  "message": "prompt_id is required",
  "correlation_id": "req_abc123",
  "timestamp": "2025-02-10T10:00:00Z"
}
```

#### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Invalid API key",
  "correlation_id": "req_abc123",
  "timestamp": "2025-02-10T10:00:00Z"
}
```

#### 409 Conflict
```json
{
  "error": "Conflict",
  "message": "Phone number already has an active agent",
  "correlation_id": "req_abc123",
  "timestamp": "2025-02-10T10:00:00Z"
}
```

## Example Requests

### cURL

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

### TypeScript

```typescript
const response = await fetch('https://api.example.com/v1/users/usr_abc123/agents', {
  method: 'POST',
  headers: {
    'x-api-key': 'sk_live_...',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    phone_number_id: 'pn_abc123',
    prompt_id: 'prompt_xyz789',
    name: 'Customer Support Agent'
  })
});

const agent = await response.json();
console.log('Agent created:', agent.agent_id);
```

### Python

```python
import requests

response = requests.post(
    'https://api.example.com/v1/users/usr_abc123/agents',
    headers={
        'x-api-key': 'sk_live_...',
        'Content-Type': 'application/json'
    },
    json={
        'phone_number_id': 'pn_abc123',
        'prompt_id': 'prompt_xyz789',
        'name': 'Customer Support Agent'
    }
)

agent = response.json()
print(f"Agent created: {agent['agent_id']}")
```

## Business Rules

1. **One Agent Per Phone Number**: Each phone number can only have one active agent at a time
2. **Prompt Versioning**: Prompts are created and managed in the OpenAI dashboard
3. **Conversation Archival**: If a phone number already has an agent, creating a new agent will archive existing conversations
4. **Multi-Tenant Isolation**: Agents are scoped to the user_id

## Integration Notes

### OpenAI Prompt Setup

Before creating an agent, you must:

1. Log into OpenAI dashboard
2. Create a new prompt with your desired behavior
3. Copy the prompt_id (e.g., "prompt_xyz789")
4. Use this prompt_id when creating the agent

### Changing Agent Behavior

To update agent behavior, you have two options:

1. **Update prompt in OpenAI dashboard** (same prompt_id) - Preserves conversations
2. **Create new agent with different prompt_id** - Archives old conversations

## Common Use Cases

### Create WhatsApp Support Agent

```bash
curl -X POST https://api.example.com/v1/users/usr_abc123/agents \
  -H "x-api-key: sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number_id": "pn_whatsapp_123",
    "prompt_id": "prompt_support_v1",
    "name": "WhatsApp Support Bot"
  }'
```

### Create Instagram Sales Agent

```bash
curl -X POST https://api.example.com/v1/users/usr_abc123/agents \
  -H "x-api-key: sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number_id": "pn_instagram_456",
    "prompt_id": "prompt_sales_v2",
    "name": "Instagram Sales Assistant"
  }'
```

## Troubleshooting

### Error: "Phone number already has an active agent"

This means the phone number is already linked to an agent. To resolve:

1. Delete the existing agent first: `DELETE /users/{user_id}/agents/{agent_id}`
2. Or update the existing agent: `PATCH /users/{user_id}/agents/{agent_id}`

### Error: "Phone number not found"

Ensure the phone_number_id exists and belongs to the user:

```bash
curl -X GET https://api.example.com/v1/users/usr_abc123/phone_numbers \
  -H "x-api-key: sk_live_..."
```

### Error: "Invalid prompt_id"

The prompt_id must be created in the OpenAI dashboard first. Verify:

1. Prompt exists in OpenAI dashboard
2. prompt_id is copied correctly
3. No extra spaces or characters

## Rate Limits

- 100 requests per minute per API key
- 1000 requests per hour per API key

## See Also

- [List Agents](list_agents.md)
- [Update Agent](update_agent.md)
- [Delete Agent](delete_agent.md)
- [Add Phone Number](../users/add_phone_number.md)
