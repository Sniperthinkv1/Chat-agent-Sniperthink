# Google Calendar Integration Setup

This guide explains how to set up Google Calendar integration for meeting booking functionality.

## Overview

The Google Calendar integration allows users to:
- Connect their Google Calendar via OAuth 2.0
- Enable automatic meeting scheduling through AI agents
- Store access and refresh tokens securely in the database

## Prerequisites

1. Google Cloud Project with Calendar API enabled
2. OAuth 2.0 credentials (Client ID and Client Secret)
3. Database migration 011 applied

## Setup Steps

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google Calendar API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Calendar API"
   - Click "Enable"

### 2. Create OAuth 2.0 Credentials

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Configure the OAuth consent screen if prompted:
   - User Type: External (for testing) or Internal (for organization)
   - Add required information (app name, support email, etc.)
   - Add scopes:
     - `https://www.googleapis.com/auth/calendar`
     - `https://www.googleapis.com/auth/calendar.events`
     - `https://www.googleapis.com/auth/userinfo.email`
     - `https://www.googleapis.com/auth/userinfo.profile`
4. Create OAuth client ID:
   - Application type: Web application
   - Name: Multi-Channel AI Agent
   - Authorized redirect URIs:
     - Development: `http://localhost:3000/auth/google/callback`
     - Production: `https://your-domain.com/auth/google/callback`
5. Copy the Client ID and Client Secret

### 3. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
SESSION_SECRET=your_random_session_secret_here
```

**Important**: 
- Replace `your_client_id_here` with your actual Google Client ID
- Replace `your_client_secret_here` with your actual Google Client Secret
- Generate a strong random string for `SESSION_SECRET`
- Update `GOOGLE_REDIRECT_URI` for production deployment

### 4. Run Database Migration

```bash
cd server
npm run migrate
```

This will create the `google_calendar_tokens` table.

## User Flow

### 1. Landing Page

Users visit the root URL (`/`) and see a landing page with a "Sign in with Google" button.

### 2. OAuth Authorization

When users click the button:
1. They're redirected to Google's OAuth consent screen
2. They grant calendar access permissions
3. Google redirects back to `/auth/google/callback` with an authorization code

### 3. Token Storage

The callback handler:
1. Exchanges the authorization code for access and refresh tokens
2. Retrieves user information (email, name)
3. Creates a new user if they don't exist
4. Stores tokens in the `google_calendar_tokens` table
5. Shows a success page with user details

## API Endpoints

### GET /
Landing page with Google login button

### GET /auth/google
Initiates Google OAuth flow

### GET /auth/google/callback
Handles OAuth callback and stores tokens

## Database Schema

```sql
CREATE TABLE google_calendar_tokens (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMP NOT NULL,
    scope TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Service Functions

### `storeGoogleTokens(userId, tokens)`
Stores or updates Google OAuth tokens for a user.

### `getGoogleTokens(userId)`
Retrieves stored tokens for a user.

### `getAuthenticatedClient(userId)`
Returns an authenticated OAuth2 client with automatic token refresh.

### `hasGoogleCalendarConnected(userId)`
Checks if a user has connected their Google Calendar.

### `disconnectGoogleCalendar(userId)`
Removes stored tokens for a user.

## Token Refresh

The system automatically handles token refresh:
- Access tokens expire after 1 hour
- Refresh tokens are used to obtain new access tokens
- The `getAuthenticatedClient()` function handles this automatically
- New tokens are stored in the database when refreshed

## Security Considerations

1. **HTTPS in Production**: Always use HTTPS for OAuth callbacks in production
2. **Session Secret**: Use a strong, random session secret
3. **Token Storage**: Tokens are stored encrypted in the database
4. **Scope Limitation**: Only request necessary calendar scopes
5. **Token Expiry**: Tokens are automatically refreshed when expired

## Testing

### Local Testing

1. Start the server:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:3000`

3. Click "Sign in with Google"

4. Grant permissions

5. Verify success page shows your email and user ID

### Verify Token Storage

```sql
SELECT user_id, token_expiry, scope, created_at 
FROM google_calendar_tokens;
```

## Troubleshooting

### "redirect_uri_mismatch" Error

- Ensure the redirect URI in your `.env` matches exactly what's configured in Google Cloud Console
- Check for trailing slashes or http vs https mismatches

### "invalid_client" Error

- Verify your Client ID and Client Secret are correct
- Ensure they're properly set in the `.env` file

### No Refresh Token Received

- The OAuth flow uses `prompt: 'consent'` to force the consent screen
- This ensures a refresh token is always provided
- If still not working, revoke access in Google Account settings and try again

### Token Expired Errors

- The system should automatically refresh tokens
- Check that the refresh token is stored in the database
- Verify the `getAuthenticatedClient()` function is being used

## Next Steps

After setting up Google Calendar integration:

1. Implement meeting booking logic in AI agents
2. Add calendar availability checking
3. Create meeting scheduling endpoints
4. Update agent prompts to handle meeting requests
5. Add calendar event creation functionality

## Related Documentation

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/guides/overview)
- [OAuth 2.0 for Web Server Applications](https://developers.google.com/identity/protocols/oauth2/web-server)
- [Meeting Booking Flow](./meeting-booking-flow.md) (coming soon)
