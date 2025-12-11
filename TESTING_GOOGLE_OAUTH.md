# Testing Google OAuth Integration

## Quick Start

### 1. Start the Server

```bash
cd server
npm run dev
```

### 2. Test the OAuth Flow

1. Open your browser and go to: **http://localhost:3000**
2. You'll see the landing page with "Sign in with Google" button
3. Click the button
4. Sign in with your Google account
5. Grant calendar permissions
6. You'll see a success page with your email and user ID

### 3. Check Stored Tokens

#### Option A: Using the Script (Recommended)

```bash
# Check all tokens
npm run check-google-tokens

# Check specific user's token
npm run check-google-tokens <user_id>
```

**Example Output:**
```
✅ Google Calendar Tokens Found

================================================================================

📋 Token #1
--------------------------------------------------------------------------------
User ID:              abc123-def456-ghi789
Access Token:         ya29.a0AfB_byDxxx...
Refresh Token:        1//0gxxx...
Token Expiry:         2025-10-06 15:30:00
Status:               VALID
Expires In:           58 minutes
Scope:                https://www.googleapis.com/auth/calendar ...
Created At:           2025-10-06 14:32:15
Updated At:           2025-10-06 14:32:15

================================================================================

Total tokens: 1
```

#### Option B: Using API Endpoints

**List all tokens:**
```bash
curl http://localhost:3000/api/google-tokens
```

**Get specific user's token:**
```bash
curl http://localhost:3000/api/google-tokens/<user_id>
```

**Response Example:**
```json
{
  "success": true,
  "user_id": "abc123-def456-ghi789",
  "token_info": {
    "access_token": "ya29.a0AfB_byD...",
    "refresh_token": "1//0g...",
    "token_expiry": "2025-10-06T15:30:00.000Z",
    "is_expired": false,
    "expires_in_minutes": 58,
    "scope": "https://www.googleapis.com/auth/calendar ...",
    "created_at": "2025-10-06T14:32:15.000Z",
    "updated_at": "2025-10-06T14:32:15.000Z"
  }
}
```

#### Option C: Direct Database Query

```bash
# Connect to your database
psql $DATABASE_URL

# Query tokens
SELECT 
  user_id,
  LEFT(access_token, 30) || '...' as access_token,
  LEFT(refresh_token, 30) || '...' as refresh_token,
  token_expiry,
  created_at
FROM google_calendar_tokens;
```

## API Endpoints for Testing

### 1. List All Tokens
```bash
GET http://localhost:3000/api/google-tokens
```

### 2. Get User Token
```bash
GET http://localhost:3000/api/google-tokens/{user_id}
```

### 3. Delete User Token
```bash
DELETE http://localhost:3000/api/google-tokens/{user_id}
```

## What to Verify

### ✅ Checklist

- [ ] Landing page loads at http://localhost:3000
- [ ] Google sign-in button works
- [ ] OAuth consent screen appears
- [ ] After granting permissions, success page shows
- [ ] User ID is displayed on success page
- [ ] Email is displayed on success page
- [ ] Token is stored in database
- [ ] Access token is present
- [ ] Refresh token is present
- [ ] Token expiry is set (usually 1 hour from now)
- [ ] Scope includes calendar permissions

### Token Details to Check

**Access Token:**
- Starts with `ya29.`
- Used for API calls
- Expires in ~1 hour

**Refresh Token:**
- Starts with `1//`
- Used to get new access tokens
- Never expires (unless revoked)

**Scope:**
Should include:
- `https://www.googleapis.com/auth/calendar`
- `https://www.googleapis.com/auth/calendar.events`
- `https://www.googleapis.com/auth/userinfo.email`
- `https://www.googleapis.com/auth/userinfo.profile`

## Troubleshooting

### Issue: "redirect_uri_mismatch"

**Solution:** Make sure your Google Cloud Console has the exact redirect URI:
```
http://localhost:3000/auth/google/callback
```

### Issue: No refresh token received

**Solution:** The code uses `prompt: 'consent'` which forces the consent screen. If still not working:
1. Go to https://myaccount.google.com/permissions
2. Remove the app
3. Try signing in again

### Issue: Token expired

**Solution:** This is normal! Access tokens expire after 1 hour. The system will automatically use the refresh token to get a new access token.

### Issue: Can't see tokens in database

**Solution:** 
1. Check if migration 011 was applied: `npm run migrate`
2. Verify database connection in `.env`
3. Check server logs for errors

## Testing Token Refresh

To test automatic token refresh:

1. Wait for the access token to expire (1 hour)
2. Use the `getAuthenticatedClient()` function
3. It will automatically refresh the token
4. Check the database - `updated_at` should be recent

## Next Steps

Once you verify tokens are working:

1. ✅ Tokens stored successfully
2. ✅ Access token present
3. ✅ Refresh token present
4. 🔜 Implement calendar availability checking
5. 🔜 Implement meeting booking
6. 🔜 Add to AI agent prompts

## Clean Up (Optional)

To remove a user's Google Calendar connection:

```bash
# Using API
curl -X DELETE http://localhost:3000/api/google-tokens/<user_id>

# Using database
psql $DATABASE_URL -c "DELETE FROM google_calendar_tokens WHERE user_id = '<user_id>';"
```

## Security Notes

⚠️ **Important:**
- Never commit `.env` file with real credentials
- Access tokens are sensitive - don't log them
- Refresh tokens are even more sensitive - they never expire
- In production, use HTTPS for all OAuth flows
- Consider encrypting tokens at rest in the database

## Support

If you encounter issues:
1. Check server logs: Look for errors in the console
2. Check browser console: Look for JavaScript errors
3. Verify environment variables are set correctly
4. Ensure Google Cloud Console is configured properly
5. Check database connection is working
