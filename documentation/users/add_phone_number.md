# Add Phone Number

Add a WhatsApp Business phone number or Instagram account to your user account.

## Endpoint

```
POST /users/{user_id}/phone_numbers
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
  "platform": "whatsapp",
  "meta_phone_number_id": "836990829491415",
  "access_token": "EAAxxxx...",
  "display_name": "+1 (234) 567-8900"
}
```

### Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| platform | string | Yes | Platform type: `whatsapp`, `instagram`, or `webchat` |
| meta_phone_number_id | string | Yes | Meta's phone_number_id (WABA ID) or Instagram Account ID |
| access_token | string | Yes | Meta access token for this phone number/account |
| display_name | string | No | Human-readable identifier |

## Response

### Success (201 Created)

```json
{
  "id": "pn_abc123",
  "user_id": "usr_abc123",
  "platform": "whatsapp",
  "meta_phone_number_id": "836990829491415",
  "display_name": "+1 (234) 567-8900",
  "created_at": "2025-02-10T10:00:00Z",
  "updated_at": "2025-02-10T10:00:00Z"
}
```

## Example Requests

### Add WhatsApp Number

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

### Add Instagram Account

```bash
curl -X POST https://api.example.com/v1/users/usr_abc123/phone_numbers \
  -H "x-api-key": "sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "instagram",
    "meta_phone_number_id": "17841234567890123",
    "access_token": "EAAxxxx...",
    "display_name": "@yourbusiness"
  }'
```

### TypeScript

```typescript
async function addPhoneNumber(userId: string, phoneData: PhoneNumberData) {
  const response = await fetch(`https://api.example.com/v1/users/${userId}/phone_numbers`, {
    method: 'POST',
    headers: {
      'x-api-key': process.env.API_KEY!,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(phoneData)
  });

  if (!response.ok) {
    throw new Error(`Failed to add phone number: ${response.statusText}`);
  }

  return response.json();
}

// Usage
const phoneNumber = await addPhoneNumber('usr_abc123', {
  platform: 'whatsapp',
  meta_phone_number_id: '836990829491415',
  access_token: 'EAAxxxx...',
  display_name: '+1 (234) 567-8900'
});
```

## Getting Meta Credentials

### WhatsApp Business API

1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Navigate to WhatsApp Manager
3. Select your WhatsApp Business Account
4. Copy the **Phone Number ID** (this is your `meta_phone_number_id`)
5. Generate a **System User Access Token** with `whatsapp_business_messaging` permission
6. Use this token as your `access_token`

### Instagram Business API

1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Navigate to Instagram Settings
3. Select your Instagram Business Account
4. Copy the **Instagram Account ID** (this is your `meta_phone_number_id`)
5. Generate a **Page Access Token** with `instagram_manage_messages` permission
6. Use this token as your `access_token`

## Important Notes

### Meta Phone Number ID

The `meta_phone_number_id` is Meta's identifier used in API calls:

- **WhatsApp**: WABA phone_number_id (e.g., "836990829491415")
- **Instagram**: Instagram Account ID (e.g., "17841234567890123")
- This ID is used in Meta API URLs: `POST /v24.0/{meta_phone_number_id}/messages`

### Access Token Security

- Store access tokens securely
- Never expose tokens in client-side code
- Rotate tokens regularly
- Use system user tokens for production

### Display Name

The `display_name` is for human readability only:

- WhatsApp: Use formatted phone number (e.g., "+1 (234) 567-8900")
- Instagram: Use handle (e.g., "@yourbusiness")
- Not used in API calls, only for display purposes

## Troubleshooting

### Error: "Invalid access token"

Verify your token has the correct permissions:

- WhatsApp: `whatsapp_business_messaging`, `whatsapp_business_management`
- Instagram: `instagram_manage_messages`, `pages_messaging`

### Error: "Phone number already exists"

This phone number is already registered. To update:

1. Delete the existing phone number
2. Add it again with new credentials

### Error: "Invalid meta_phone_number_id"

Ensure you're using the correct ID format:

- WhatsApp: Numeric WABA ID (not the actual phone number)
- Instagram: Numeric Instagram Account ID (not the username)

## See Also

- [List Phone Numbers](list_phone_numbers.md)
- [Delete Phone Number](delete_phone_number.md)
- [Create Agent](../agents/create_agent.md)
- [WhatsApp API Reference](../../reference-docs/whatsappapi.md)
- [Instagram API Reference](../../reference-docs/instagramapi.md)
