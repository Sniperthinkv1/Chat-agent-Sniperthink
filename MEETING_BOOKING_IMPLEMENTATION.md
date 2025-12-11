# Meeting Booking Implementation

## ✅ Complete Implementation

The meeting booking flow is now fully integrated with your AI agent system.

## 🎯 How It Works

### **1. External Dashboard Connects Google Calendar**

Your external dashboard handles Google OAuth and sends tokens to your server:

```bash
POST /api/users/:user_id/google-calendar/connect
Content-Type: application/json

{
  "access_token": "ya29.a0AfB_byD...",
  "refresh_token": "1//0g...",
  "token_expiry": "2025-10-06T15:30:00Z",
  "scope": "https://www.googleapis.com/auth/calendar ..."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Google Calendar connected successfully",
  "user_id": "abc-123",
  "token_expiry": "2025-10-06T15:30:00Z"
}
```

---

### **2. Customer Chats with AI Agent**

Customer: "I want to schedule a demo meeting"

---

### **3. OpenAI Returns Meeting Booking Action**

OpenAI response includes JSON:
```json
[{
  "action": "Time_to_121meet",
  "name": "Siddhant",
  "email": "siddhant@gmail.com",
  "title": "Demo",
  "participants": ["siddhant@gmail.com"],
  "meeting_time": "2025-10-06T19:00:00+05:30",
  "friendly_time": "today at 7 PM IST"
}]
```

---

### **4. System Automatically Books Meeting**

```
Message Worker detects meeting action
         ↓
Gets user_id from: conversation → agent → user
         ↓
Checks if user has Google Calendar connected
         ↓
If YES: Books meeting using Google Calendar API
         ↓
Creates Google Meet link automatically
         ↓
Stores meeting in database
         ↓
Sends confirmation to customer with Meet link
```

---

### **5. Customer Receives Confirmation**

```
✅ Meeting confirmed!

📅 Meeting scheduled for today at 7 PM IST
🔗 Join here: https://meet.google.com/abc-defg-hij

You'll receive a calendar invite via email.
```

---

## 📊 Database Schema

### **meetings table**

```sql
CREATE TABLE meetings (
    meeting_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL,
    conversation_id VARCHAR(50) NOT NULL,
    google_event_id VARCHAR(255) NOT NULL,
    
    -- Meeting details
    title VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    participants TEXT[],
    
    -- Time details
    meeting_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    timezone VARCHAR(100),
    
    -- Google Meet details
    meet_link TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'scheduled',
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 API Endpoints

### **1. Connect Google Calendar**
```bash
POST /api/users/:user_id/google-calendar/connect
```

**Request Body:**
```json
{
  "access_token": "ya29.a0AfB...",
  "refresh_token": "1//0g...",
  "token_expiry": "2025-10-06T15:30:00Z",
  "scope": "https://www.googleapis.com/auth/calendar ..."
}
```

**Features:**
- ✅ Stores tokens in database
- ✅ Overwrites existing tokens if user reconnects
- ✅ No authentication required (for dashboard use)

---

### **2. Get User's Google Token**
```bash
GET /api/google-tokens/:user_id
```

**Response:**
```json
{
  "success": true,
  "user_id": "abc-123",
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

### **3. List All Tokens**
```bash
GET /api/google-tokens
```

---

### **4. Disconnect Google Calendar**
```bash
DELETE /api/google-tokens/:user_id
```

---

## 🤖 Automatic Features

### **Token Management**
- ✅ **Auto-refresh**: Access tokens automatically refreshed when expired
- ✅ **Database updates**: New tokens stored automatically
- ✅ **Error handling**: Graceful fallback if refresh fails

### **Meeting Booking**
- ✅ **Auto-detection**: Detects meeting actions in OpenAI responses
- ✅ **Google Meet**: Automatically generates Meet links
- ✅ **Email invites**: Sends calendar invites to all participants
- ✅ **Reminders**: Sets up email (1 day) and popup (30 min) reminders
- ✅ **Timezone support**: Uses timezone from meeting_time
- ✅ **30-minute duration**: Default meeting length

### **Error Handling**
- ✅ **Calendar not connected**: Sends custom error message
- ✅ **API failures**: Logs errors and sends fallback message
- ✅ **Token expired**: Auto-refreshes and retries

---

## 🔄 Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. External Dashboard                                       │
│    User connects Google Calendar                            │
│    ↓                                                         │
│    POST /api/users/:user_id/google-calendar/connect        │
│    {access_token, refresh_token, token_expiry, scope}      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Tokens Stored in Database                                │
│    google_calendar_tokens table                             │
│    ✅ access_token                                          │
│    ✅ refresh_token                                         │
│    ✅ token_expiry                                          │
│    ✅ scope                                                 │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Customer Chats with AI Agent                             │
│    "I want to schedule a demo meeting"                      │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. OpenAI Processes Request                                 │
│    Returns meeting booking action:                          │
│    [{                                                        │
│      "action": "Time_to_121meet",                          │
│      "name": "Siddhant",                                    │
│      "email": "siddhant@gmail.com",                        │
│      "title": "Demo",                                       │
│      "participants": ["siddhant@gmail.com"],               │
│      "meeting_time": "2025-10-06T19:00:00+05:30",         │
│      "friendly_time": "today at 7 PM IST"                  │
│    }]                                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Message Worker Detects Meeting Action                    │
│    detectMeetingBookingAction(aiResponse)                   │
│    ✅ Found: action === "Time_to_121meet"                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Get User ID from Conversation                            │
│    conversation_id → agent_id → user_id                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Check Google Calendar Connection                         │
│    hasGoogleCalendarConnected(user_id)                      │
│    ✅ YES: Continue                                         │
│    ❌ NO: Send error message                                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. Get Authenticated Client                                 │
│    getAuthenticatedClient(user_id)                          │
│    • Retrieves tokens from database                         │
│    • Checks if access token expired                         │
│    • If expired: Uses refresh token to get new one          │
│    • Updates database with new access token                 │
│    • Returns ready-to-use OAuth2 client                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 9. Create Google Calendar Event                             │
│    calendar.events.insert({                                 │
│      summary: "Demo",                                       │
│      start: { dateTime: "2025-10-06T19:00:00+05:30" },    │
│      end: { dateTime: "2025-10-06T19:30:00+05:30" },      │
│      attendees: [{ email: "siddhant@gmail.com" }],        │
│      conferenceData: { type: "hangoutsMeet" }              │
│    })                                                        │
│    ✅ Event created                                         │
│    ✅ Google Meet link generated                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 10. Store Meeting in Database                               │
│     INSERT INTO meetings (                                  │
│       meeting_id, user_id, conversation_id,                │
│       google_event_id, title, customer_name,               │
│       customer_email, participants, meeting_time,          │
│       meet_link, status                                     │
│     )                                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 11. Send Confirmation to Customer                           │
│     ✅ Meeting confirmed!                                   │
│     📅 Meeting scheduled for today at 7 PM IST             │
│     🔗 Join here: https://meet.google.com/abc-defg-hij     │
│     You'll receive a calendar invite via email.            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ 12. Customer Receives                                        │
│     • Confirmation message in chat                          │
│     • Calendar invite via email                             │
│     • Google Meet link                                      │
│     • Email reminder (1 day before)                         │
│     • Popup reminder (30 min before)                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🧪 Testing

### **1. Connect Google Calendar**

```bash
curl -X POST http://localhost:3000/api/users/test-user-123/google-calendar/connect \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "ya29.a0AfB_byD...",
    "refresh_token": "1//0g...",
    "token_expiry": "2025-10-06T15:30:00Z",
    "scope": "https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events"
  }'
```

### **2. Verify Token Stored**

```bash
curl http://localhost:3000/api/google-tokens/test-user-123
```

### **3. Test Meeting Booking**

Send a message to your AI agent that triggers a meeting booking response from OpenAI.

---

## 📝 Environment Variables

Add to `.env`:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Meeting Configuration
MEETING_ERROR_MESSAGE=Ohhh we having trouble scheduling the meeting. Please try again later.
```

---

## 🎯 Key Features

### ✅ Implemented
- [x] Token storage endpoint for external dashboard
- [x] Automatic token refresh
- [x] Meeting action detection in OpenAI responses
- [x] Google Calendar event creation
- [x] Google Meet link generation
- [x] Email invites to participants
- [x] Meeting confirmation messages
- [x] Database tracking of booked meetings
- [x] Error handling for calendar not connected
- [x] Timezone support from meeting_time
- [x] 30-minute default duration
- [x] Automatic reminders (email + popup)

### ❌ Removed
- [x] Landing page (not needed)
- [x] OAuth initiation route (handled externally)
- [x] OAuth callback route (handled externally)

---

## 🚀 What's Next

The system is ready to use! When OpenAI returns a meeting booking action, it will automatically:

1. ✅ Detect the action
2. ✅ Check if user has calendar connected
3. ✅ Book the meeting
4. ✅ Generate Meet link
5. ✅ Send confirmation
6. ✅ Store in database

No additional configuration needed!
