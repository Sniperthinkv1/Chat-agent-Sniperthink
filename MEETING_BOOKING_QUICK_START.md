# Meeting Booking - Quick Start Guide

## ✅ Implementation Complete!

Your meeting booking system is fully integrated and ready to use.

---

## 🚀 How to Use

### **Step 1: Connect Google Calendar (From Your Dashboard)**

Your external dashboard should call this endpoint after user completes Google OAuth:

```bash
POST http://localhost:3000/api/users/:user_id/google-calendar/connect
Content-Type: application/json

{
  "access_token": "ya29.a0AfB_byD...",
  "refresh_token": "1//0g...",
  "token_expiry": "2025-10-06T15:30:00Z",
  "scope": "https://www.googleapis.com/auth/calendar ..."
}
```

**That's it!** The system will:
- ✅ Store tokens securely
- ✅ Auto-refresh when expired
- ✅ Keep tokens alive forever

---

### **Step 2: Customer Requests Meeting**

Customer chats with AI agent:
> "I want to schedule a demo meeting"

---

### **Step 3: OpenAI Returns Meeting Action**

Your OpenAI prompt should return:
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

### **Step 4: System Books Meeting Automatically**

The system will:
1. ✅ Detect meeting action
2. ✅ Get user from conversation
3. ✅ Check calendar connected
4. ✅ Book meeting with Google Calendar
5. ✅ Generate Google Meet link
6. ✅ Send confirmation to customer

**Customer receives:**
```
✅ Meeting confirmed!

📅 Meeting scheduled for today at 7 PM IST
🔗 Join here: https://meet.google.com/abc-defg-hij

You'll receive a calendar invite via email.
```

---

## 📋 API Endpoints

### **Connect Calendar**
```bash
POST /api/users/:user_id/google-calendar/connect
```

### **Check Connection**
```bash
GET /api/google-tokens/:user_id
```

### **Disconnect Calendar**
```bash
DELETE /api/google-tokens/:user_id
```

### **List All Connections**
```bash
GET /api/google-tokens
```

---

## 🧪 Testing

### **1. Test Token Storage**

```bash
curl -X POST http://localhost:3000/api/users/test-user-123/google-calendar/connect \
  -H "Content-Type: application/json" \
  -d '{
    "access_token": "ya29.test...",
    "refresh_token": "1//0gtest...",
    "token_expiry": "2025-10-06T15:30:00Z",
    "scope": "https://www.googleapis.com/auth/calendar"
  }'
```

### **2. Verify Stored**

```bash
curl http://localhost:3000/api/google-tokens/test-user-123
```

### **3. Check Database**

```bash
npm run check-google-tokens test-user-123
```

---

## 🔧 Configuration

### **Environment Variables**

Already set in your `.env`:
```bash
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
MEETING_ERROR_MESSAGE=Ohhh we having trouble scheduling the meeting. Please try again later.
```

### **Database**

Migration already applied:
- ✅ `google_calendar_tokens` table
- ✅ `meetings` table

---

## 🎯 What Happens Automatically

### **Token Management**
- ✅ Access tokens auto-refresh when expired
- ✅ New tokens stored in database
- ✅ No manual intervention needed

### **Meeting Booking**
- ✅ Detects meeting actions in OpenAI responses
- ✅ Books meeting with Google Calendar API
- ✅ Generates Google Meet link
- ✅ Sends email invites to participants
- ✅ Sets up reminders (1 day + 30 min)
- ✅ Stores meeting in database
- ✅ Sends confirmation to customer

### **Error Handling**
- ✅ Calendar not connected → Sends custom error message
- ✅ API failure → Logs error and sends fallback message
- ✅ Token expired → Auto-refreshes and retries

---

## 📊 Meeting Data Stored

Every booked meeting is stored in the `meetings` table:

```sql
SELECT 
  meeting_id,
  title,
  customer_name,
  customer_email,
  meeting_time,
  meet_link,
  status
FROM meetings
WHERE user_id = 'your-user-id'
ORDER BY meeting_time DESC;
```

---

## 🔍 Monitoring

### **Check Token Status**

```bash
# All tokens
npm run check-google-tokens

# Specific user
npm run check-google-tokens <user_id>
```

### **Check Meetings**

```sql
-- Recent meetings
SELECT * FROM meetings 
WHERE user_id = 'your-user-id' 
ORDER BY created_at DESC 
LIMIT 10;

-- Upcoming meetings
SELECT * FROM meetings 
WHERE meeting_time > NOW() 
AND status = 'scheduled'
ORDER BY meeting_time ASC;
```

---

## ⚠️ Important Notes

### **OpenAI Response Format**

Your OpenAI prompt MUST return this exact format:
```json
[{
  "action": "Time_to_121meet",
  "name": "Customer Name",
  "email": "customer@example.com",
  "title": "Meeting Title",
  "participants": ["email1@example.com", "email2@example.com"],
  "meeting_time": "2025-10-06T19:00:00+05:30",
  "friendly_time": "today at 7 PM IST"
}]
```

**Key points:**
- Must be an array `[...]`
- `action` must be exactly `"Time_to_121meet"`
- `meeting_time` must include timezone (e.g., `+05:30`)
- `participants` is an array of emails

### **Meeting Duration**

- Default: 30 minutes
- Automatically calculated: `end_time = start_time + 30 minutes`

### **Timezone**

- Extracted from `meeting_time` string
- Example: `2025-10-06T19:00:00+05:30` → timezone is `+05:30` (IST)

---

## 🎉 You're Done!

The system is fully operational. Just:

1. ✅ Connect Google Calendar from your dashboard
2. ✅ Let customers chat with AI agent
3. ✅ Meetings book automatically when OpenAI returns the action

No additional setup needed!

---

## 📚 Documentation

- **Full Implementation**: `MEETING_BOOKING_IMPLEMENTATION.md`
- **Database Schema**: `reference-docs/database.md`
- **Google OAuth Setup**: `documentation/guides/google-calendar-setup.md`

---

## 🆘 Troubleshooting

### **"Ohhh we having trouble" message**

This means:
- User doesn't have Google Calendar connected
- OR token refresh failed
- OR Google Calendar API error

**Solution:**
1. Check if user has tokens: `GET /api/google-tokens/:user_id`
2. Check server logs for detailed error
3. Verify Google Calendar API is enabled in Google Cloud Console

### **Meeting not booking**

**Check:**
1. OpenAI response format is correct
2. User has Google Calendar connected
3. Access token is valid (not revoked)
4. Server logs for errors

### **Token expired**

**Don't worry!** The system auto-refreshes tokens. If refresh fails:
1. User needs to reconnect Google Calendar
2. Check refresh token is still valid
3. Verify Google OAuth credentials in `.env`

---

## 🚀 Ready to Go!

Start your server and test:

```bash
cd server
npm run dev
```

Then connect a Google Calendar and send a meeting request! 🎉
