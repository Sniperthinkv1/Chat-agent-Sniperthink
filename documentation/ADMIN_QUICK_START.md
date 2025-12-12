# Admin Panel Quick Start Guide

This guide helps you get started with the Admin Panel API to manage users, phone numbers, and AI agents.

## Prerequisites

1. **Super Admin Password**: Contact the system administrator for the super admin password
2. **API Base URL**: Default is `http://localhost:3000` (use your production URL in production)
3. **OpenAI Prompt IDs**: Create prompts in OpenAI Dashboard before creating agents

## Quick Start: 5-Minute Setup

### Step 1: Login as Super Admin

```bash
curl -X POST http://localhost:3000/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "password": "your-super-admin-password"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "expires_in": 3600
  }
}
```

**Save the `access_token` for subsequent requests.**

---

### Step 2: Create a New User

```bash
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "john-doe-123",
    "email": "john@example.com",
    "initial_credits": 1000
  }'
```

**What this does:**
- Creates a new user account
- Sets up email for notifications
- Allocates 1000 initial credits for message processing

---

### Step 3: Add WhatsApp Phone Number

```bash
curl -X POST http://localhost:3000/admin/users/john-doe-123/phone-numbers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "whatsapp-business-001",
    "platform": "whatsapp",
    "meta_phone_number_id": "1234567890123",
    "access_token": "EAABCDEFGHIabc123...",
    "display_name": "John Business WhatsApp",
    "waba_id": "1234567890"
  }'
```

**Required Information:**
- `meta_phone_number_id`: Get from Meta Business Manager → WhatsApp → Phone Number ID
- `access_token`: Get from Meta Business Manager → System Users → Generate Token
- `waba_id`: Get from Meta Business Manager → WhatsApp Business Account ID

**For Instagram:**
```bash
curl -X POST http://localhost:3000/admin/users/john-doe-123/phone-numbers \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "instagram-account-001",
    "platform": "instagram",
    "meta_phone_number_id": "INSTAGRAM_ACCOUNT_ID",
    "access_token": "EAABCDEFGHIabc123...",
    "display_name": "John Business Instagram"
  }'
```

---

### Step 4: Create AI Agent with OpenAI Prompt

**First, create a prompt in OpenAI Dashboard:**
1. Go to https://platform.openai.com/prompts
2. Create a new prompt with your AI agent instructions
3. Copy the `prompt_id` (looks like: `prompt_abc123xyz`)

**Then create the agent:**
```bash
curl -X POST http://localhost:3000/admin/users/john-doe-123/agents \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number_id": "whatsapp-business-001",
    "prompt_id": "prompt_abc123xyz",
    "name": "Sales Support Agent",
    "description": "AI agent for handling sales inquiries and customer support"
  }'
```

**What this does:**
- Links the OpenAI prompt to the WhatsApp phone number
- The agent will now respond to incoming messages on that number
- Uses OpenAI Responses API for conversation management

---

### Step 5: Verify Setup

Check the user's complete setup:

```bash
curl -X GET http://localhost:3000/admin/users/john-doe-123 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Response will show:**
- User details
- All phone numbers (WhatsApp, Instagram)
- All agents with their OpenAI prompts
- Current credit balance

---

## Common Admin Tasks

### Add More Credits

```bash
curl -X POST http://localhost:3000/admin/users/john-doe-123/credits \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500
  }'
```

### Update User Email

```bash
curl -X PATCH http://localhost:3000/admin/users/john-doe-123 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newemail@example.com"
  }'
```

### Update Agent Prompt (Change AI Behavior)

```bash
curl -X PATCH http://localhost:3000/admin/users/john-doe-123/agents/AGENT_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt_id": "new_prompt_xyz789",
    "name": "Updated Agent Name"
  }'
```

### View Dashboard Statistics

```bash
curl -X GET http://localhost:3000/admin/dashboard \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Multi-User Setup Example

Setting up 3 users with different configurations:

```bash
# User 1: WhatsApp + Sales Agent
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"user_id": "user1", "email": "user1@example.com", "initial_credits": 1000}'

curl -X POST http://localhost:3000/admin/users/user1/phone-numbers \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id": "phone1", "platform": "whatsapp", "meta_phone_number_id": "111", "access_token": "token1", "display_name": "WhatsApp 1"}'

curl -X POST http://localhost:3000/admin/users/user1/agents \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"phone_number_id": "phone1", "prompt_id": "prompt_sales", "name": "Sales Agent"}'

# User 2: Instagram + Support Agent
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"user_id": "user2", "email": "user2@example.com", "initial_credits": 2000}'

curl -X POST http://localhost:3000/admin/users/user2/phone-numbers \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id": "instagram1", "platform": "instagram", "meta_phone_number_id": "222", "access_token": "token2", "display_name": "Instagram 1"}'

curl -X POST http://localhost:3000/admin/users/user2/agents \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"phone_number_id": "instagram1", "prompt_id": "prompt_support", "name": "Support Agent"}'

# User 3: WhatsApp + Instagram + Two Agents
curl -X POST http://localhost:3000/admin/users \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"user_id": "user3", "email": "user3@example.com", "initial_credits": 5000}'

curl -X POST http://localhost:3000/admin/users/user3/phone-numbers \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id": "phone3", "platform": "whatsapp", "meta_phone_number_id": "333", "access_token": "token3", "display_name": "WhatsApp 3"}'

curl -X POST http://localhost:3000/admin/users/user3/phone-numbers \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id": "instagram3", "platform": "instagram", "meta_phone_number_id": "444", "access_token": "token4", "display_name": "Instagram 3"}'

curl -X POST http://localhost:3000/admin/users/user3/agents \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"phone_number_id": "phone3", "prompt_id": "prompt_sales", "name": "WhatsApp Sales"}'

curl -X POST http://localhost:3000/admin/users/user3/agents \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"phone_number_id": "instagram3", "prompt_id": "prompt_support", "name": "Instagram Support"}'
```

---

## Troubleshooting

### 401 Unauthorized

**Problem:** `{"error": "Unauthorized", "message": "Invalid or expired token"}`

**Solution:**
1. Your access token expired (tokens last 1 hour)
2. Get a new token using the refresh token:

```bash
curl -X POST http://localhost:3000/admin/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'
```

### 404 Not Found

**Problem:** `{"error": "Not Found", "message": "User not found"}`

**Solution:**
1. Check if the user_id is correct
2. List all users to verify:

```bash
curl -X GET http://localhost:3000/admin/users \
  -H "Authorization: Bearer $TOKEN"
```

### 409 Conflict

**Problem:** `{"error": "Conflict", "message": "User already exists"}`

**Solution:**
1. User already exists with that user_id
2. Use a different user_id or update the existing user

### 400 Bad Request - Missing Fields

**Problem:** `{"error": "Bad Request", "message": "user_id and email are required"}`

**Solution:**
1. Check that all required fields are included in the request body
2. Verify JSON syntax is correct

---

## Best Practices

1. **User IDs**: Use consistent naming like `company-name-user-123` or email-based like `john.doe@example.com`
2. **Phone Number IDs**: Use descriptive names like `whatsapp-business-001`, `instagram-marketing-001`
3. **Credits**: Start with 1000-5000 credits per user and monitor usage
4. **Agents**: Create descriptive names like "Sales Agent", "Support Agent", "Lead Qualifier"
5. **Security**: Store access tokens securely, never commit to git
6. **Monitoring**: Regularly check `/admin/dashboard` for usage statistics

---

## Getting Meta Credentials

### WhatsApp Business API

1. Go to https://business.facebook.com/
2. Navigate to **WhatsApp Manager**
3. Select your phone number
4. Copy these values:
   - **Phone Number ID**: `meta_phone_number_id`
   - **WhatsApp Business Account ID**: `waba_id`
5. Go to **System Users** → Create or select user
6. Generate **Access Token** with permissions: `whatsapp_business_management`, `whatsapp_business_messaging`

### Instagram Business API

1. Go to https://business.facebook.com/
2. Navigate to **Instagram Accounts**
3. Copy the **Instagram Account ID**: This is your `meta_phone_number_id`
4. Generate **Access Token** with permissions: `instagram_basic`, `instagram_manage_messages`

---

## Next Steps

1. **Test the Setup**: Send a test message to your WhatsApp/Instagram number
2. **Monitor Messages**: Use `/admin/conversations` to view conversations
3. **Adjust AI Behavior**: Update prompts in OpenAI Dashboard and update agent prompt_id
4. **Scale**: Add more users, phone numbers, and agents as needed
5. **Analytics**: Use `/admin/dashboard` and `/admin/rate-limits` for monitoring

## Support

For detailed API documentation, see [ADMIN_API_REFERENCE.md](./ADMIN_API_REFERENCE.md)

For system setup, see [QUICK_START.md](./QUICK_START.md)
