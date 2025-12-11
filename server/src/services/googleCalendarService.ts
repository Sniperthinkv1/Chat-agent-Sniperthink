import { createOAuth2Client } from '../config/google';
import { db } from '../utils/database';
import { logger } from '../utils/logger';

export interface GoogleTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  scope: string;
}

/**
 * Store Google OAuth tokens in database
 */
export async function storeGoogleTokens(
  userId: string,
  tokens: GoogleTokens
): Promise<void> {
  try {
    const expiryDate = new Date(tokens.expiry_date);
    
    await db.query(
      `INSERT INTO google_calendar_tokens 
       (user_id, access_token, refresh_token, token_expiry, scope)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id) 
       DO UPDATE SET 
         access_token = EXCLUDED.access_token,
         refresh_token = EXCLUDED.refresh_token,
         token_expiry = EXCLUDED.token_expiry,
         scope = EXCLUDED.scope,
         updated_at = CURRENT_TIMESTAMP`,
      [userId, tokens.access_token, tokens.refresh_token, expiryDate, tokens.scope]
    );
    
    logger.info('Google tokens stored successfully', { userId });
  } catch (error) {
    logger.error('Failed to store Google tokens', { userId, error });
    throw error;
  }
}

/**
 * Retrieve Google OAuth tokens from database
 */
export async function getGoogleTokens(userId: string): Promise<GoogleTokens | null> {
  try {
    const result = await db.query(
      `SELECT access_token, refresh_token, token_expiry, scope
       FROM google_calendar_tokens
       WHERE user_id = $1`,
      [userId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      access_token: row.access_token,
      refresh_token: row.refresh_token,
      expiry_date: new Date(row.token_expiry).getTime(),
      scope: row.scope
    };
  } catch (error) {
    logger.error('Failed to retrieve Google tokens', { userId, error });
    throw error;
  }
}

/**
 * Get authenticated OAuth2 client for a user
 */
export async function getAuthenticatedClient(userId: string) {
  const tokens = await getGoogleTokens(userId);
  
  if (!tokens) {
    throw new Error('User has not connected Google Calendar');
  }
  
  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date,
    scope: tokens.scope
  });
  
  // Handle token refresh automatically
  oauth2Client.on('tokens', async (newTokens) => {
    if (newTokens.refresh_token) {
      tokens.refresh_token = newTokens.refresh_token;
    }
    if (newTokens.access_token) {
      tokens.access_token = newTokens.access_token;
    }
    if (newTokens.expiry_date) {
      tokens.expiry_date = newTokens.expiry_date;
    }
    
    await storeGoogleTokens(userId, tokens);
  });
  
  return oauth2Client;
}

/**
 * Check if user has connected Google Calendar
 */
export async function hasGoogleCalendarConnected(userId: string): Promise<boolean> {
  const tokens = await getGoogleTokens(userId);
  return tokens !== null;
}

/**
 * Disconnect Google Calendar (remove tokens)
 */
export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  try {
    await db.query(
      'DELETE FROM google_calendar_tokens WHERE user_id = $1',
      [userId]
    );
    
    logger.info('Google Calendar disconnected', { userId });
  } catch (error) {
    logger.error('Failed to disconnect Google Calendar', { userId, error });
    throw error;
  }
}
