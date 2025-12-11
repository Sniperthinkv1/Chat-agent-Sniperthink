# Google Calendar Integration API Documentation

## Overview

This document explains how to integrate Google Calendar with the chatserver. After a user completes Google OAuth on your dashboard, you need to send their tokens to the chatserver.

---

## 📍 Endpoint

### **Connect Google Calendar**

Send the user's Google OAuth tokens to the chatserver to enable meeting booking.

```
POST {BASE_URL}/api/users/{user_id}/google-calendar/connect
```

**Replace:**
- `{BASE_URL}` - Your chatserver URL (e.g., `http://localhost:3000` or `https://api.yourdomain.com`)
- `{user_id}` - The unique user ID in your system

---

## 📥 Request

### **Headers**
```
Content-Type: application/json
```

### **URL Parameters**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `user_id` | string | Yes | Unique identifier for the user |

### **Request Body**
```json
{
  "access_token": "ya29.a0AfB_byD...",
  "refresh_token": "1//0g...",
  "token_expiry": "2025-10-06T15:30:00Z",
  "scope": "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `access_token` | string | Yes | Google OAuth access token (starts with `ya29.`) |
| `refresh_token` | string | Yes | Google OAuth refresh token (starts with `1//`) |
| `token_expiry` | string | Yes | ISO 8601 timestamp when access token expires |
| `scope` | string | Yes | Space-separated list of granted OAuth scopes |

---

## 📤 Response

### **Success Response (200 OK)**
```json
{
  "success": true,
  "message": "Google Calendar connected successfully",
  "user_id": "user-123",
  "token_expiry": "2025-10-06T15:30:00Z"
}
```

### **Error Response (400 Bad Request)**
```json
{
  "success": false,
  "error": "Missing required fields: access_token, refresh_token, token_expiry, scope"
}
```

### **Error Response (500 Internal Server Error)**
```json
{
  "success": false,
  "error": "Failed to connect Google Calendar"
}
```

---

## 🔧 Configuration

### **Environment Variables**

The chatserver must have these configured in `.env`:

```bash
# Base URL (your chatserver address)
BASE_URL=http://localhost:3000

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## 📝 Complete Example

### **Scenario**
User "john-doe-123" completed Google OAuth on your dashboard. You received:
- Access Token: `ya29.a0AfB_byDxxx...`
- Refresh Token: `1//0gxxx...`
- Expires In: 3600 seconds (1 hour)
- Scope: Calendar permissions

### **Step 1: Calculate Token Expiry**

```javascript
// Current time + expires_in seconds
const expiryDate = new Date(Date.now() + 3600 * 1000);
const token_expiry = expiryDate.toISOString();
// Result: "2025-10-06T15:30:00.000Z"
```

### **Step 2: Send to Chatserver**

```bash
curl -X POST http://localhost:3000/api/users/john-doe-123/google-calendar/connect \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "ya29.a0AfB_byDxxx...",
    "refresh_token": "1//0gxxx...",
    "token_expiry": "2025-10-06T15:30:00.000Z",
    "scope": "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile"
  }'
```

### **Step 3: Verify Success**

```bash
# Check if tokens were stored
curl http://localhost:3000/api/google-tokens/john-doe-123
```

---

## 🌐 Production Example

### **Production URL**
```
POST https://chatserver.yourdomain.com/api/users/{user_id}/google-calendar/connect
```

### **JavaScript/TypeScript Example**

```typescript
async function connectGoogleCalendar(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  scope: string
) {
  const chatserverUrl = process.env.CHATSERVER_BASE_URL; // e.g., "https://chatserver.yourdomain.com"
  
  // Calculate token expiry
  const tokenExpiry = new Date(Date.now() + expiresIn * 1000).toISOString();
  
  const response = await fetch(
    `${chatserverUrl}/api/users/${userId}/google-calendar/connect`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expiry: tokenExpiry,
        scope: scope,
      }),
    }
  );
  
  const result = await response.json();
  
  if (result.success) {
    console.log('✅ Google Calendar connected:', result.user_id);
    return true;
  } else {
    console.error('❌ Failed to connect:', result.error);
    return false;
  }
}

// Usage
await connectGoogleCalendar(
  'john-doe-123',
  'ya29.a0AfB_byDxxx...',
  '1//0gxxx...',
  3600,
  'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'
);
```

### **Python Example**

```python
import requests
from datetime import datetime, timedelta

def connect_google_calendar(
    user_id: str,
    access_token: str,
    refresh_token: str,
    expires_in: int,
    scope: str
):
    chatserver_url = "https://chatserver.yourdomain.com"
    
    # Calculate token expiry
    token_expiry = (datetime.now() + timedelta(seconds=expires_in)).isoformat() + "Z"
    
    response = requests.post(
        f"{chatserver_url}/api/users/{user_id}/google-calendar/connect",
        json={
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_expiry": token_expiry,
            "scope": scope
        }
    )
    
    result = response.json()
    
    if result.get("success"):
        print(f"✅ Google Calendar connected: {result['user_id']}")
        return True
    else:
        print(f"❌ Failed to connect: {result.get('error')}")
        return False

# Usage
connect_google_calendar(
    user_id="john-doe-123",
    access_token="ya29.a0AfB_byDxxx...",
    refresh_token="1//0gxxx...",
    expires_in=3600,
    scope="https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events"
)
```

---

## 🔄 Token Management

### **What Happens After Connection**

1. ✅ **Tokens Stored** - Chatserver stores tokens in database
2. ✅ **Auto-Refresh** - Access tokens automatically refreshed when expired
3. ✅ **Meeting Booking** - When AI detects meeting request, chatserver books automatically
4. ✅ **Forever Active** - Refresh token keeps access alive indefinitely

### **Token Lifecycle**

```
Your Dashboard
     ↓
User completes Google OAuth
     ↓
You receive: access_token, refresh_token, expires_in
     ↓
POST to chatserver: /api/users/{user_id}/google-calendar/connect
     ↓
Chatserver stores tokens
     ↓
Access token expires after 1 hour
     ↓
Chatserver auto-refreshes using refresh_token
     ↓
New access token stored automatically
     ↓
Meeting booking continues working forever
```

---

## ✅ Verification

### **Check Connection Status**

```bash
# Check if user has Google Calendar connected
curl http://localhost:3000/api/google-tokens/{user_id}
```

**Response:**
```json
{
  "success": true,
  "user_id": "john-doe-123",
  "token_info": {
    "access_token": "ya29.a0AfB...",
    "refresh_token": "1//0g...",
    "token_expiry": "2025-10-06T15:30:00Z",
    "is_expired": false,
    "expires_in_minutes": 58,
    "scope": "...",
    "created_at": "2025-10-06T14:32:15Z",
    "updated_at": "2025-10-06T14:32:15Z"
  }
}
```

---

## 🚨 Important Notes

### **Required OAuth Scopes**

Your Google OAuth consent screen must request these scopes:
```
https://www.googleapis.com/auth/calendar
https://www.googleapis.com/auth/calendar.events
https://www.googleapis.com/auth/userinfo.email
https://www.googleapis.com/auth/userinfo.profile
```

### **Token Expiry Format**

Must be ISO 8601 format with timezone:
- ✅ Correct: `"2025-10-06T15:30:00Z"`
- ✅ Correct: `"2025-10-06T15:30:00.000Z"`
- ✅ Correct: `"2025-10-06T20:00:00+05:30"`
- ❌ Wrong: `"2025-10-06 15:30:00"`
- ❌ Wrong: `1728226200` (Unix timestamp)

### **User ID**

- Must match the `user_id` in chatserver's database
- If user doesn't exist, connection will fail
- Create user first before connecting calendar

### **Overwriting Tokens**

- If user reconnects Google Calendar, new tokens overwrite old ones
- This is normal and expected behavior
- No need to delete old tokens first

---

## 🆘 Troubleshooting

### **Error: "Missing user_id in URL"**
- Check URL format: `/api/users/{user_id}/google-calendar/connect`
- Ensure `{user_id}` is replaced with actual user ID

### **Error: "Missing required fields"**
- Verify all 4 fields are present: `access_token`, `refresh_token`, `token_expiry`, `scope`
- Check JSON is valid

### **Error: "Invalid token_expiry format"**
- Must be ISO 8601 timestamp
- Use: `new Date(Date.now() + 3600000).toISOString()`

### **Error: "Failed to connect Google Calendar"**
- Check chatserver logs for detailed error
- Verify database connection is working
- Ensure user exists in database

---

## 📞 Support

If you encounter issues:

1. Check chatserver logs for detailed errors
2. Verify environment variables are set correctly
3. Test with curl command first before integrating
4. Ensure user exists in chatserver database

---

## 🎯 Quick Reference

| Item | Value |
|------|-------|
| **Endpoint** | `POST {BASE_URL}/api/users/{user_id}/google-calendar/connect` |
| **Content-Type** | `application/json` |
| **Required Fields** | `access_token`, `refresh_token`, `token_expiry`, `scope` |
| **Success Code** | `200 OK` |
| **Error Codes** | `400 Bad Request`, `500 Internal Server Error` |

---

## ✅ Checklist

Before integrating:

- [ ] Chatserver BASE_URL configured
- [ ] Google OAuth credentials set in chatserver
- [ ] User exists in chatserver database
- [ ] OAuth scopes include calendar permissions
- [ ] Token expiry calculated correctly (ISO 8601)
- [ ] All 4 required fields included in request
- [ ] Tested with curl command
- [ ] Verified tokens stored successfully

---

**That's it!** Once tokens are sent to chatserver, meeting booking will work automatically. 🚀
