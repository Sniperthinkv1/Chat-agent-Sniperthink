import { Request, Response } from 'express';
import { db } from '../utils/database';
import { logger } from '../utils/logger';
import { storeGoogleTokens } from '../services/googleCalendarService';

/**
 * Connect Google Calendar by storing tokens from external dashboard
 */
export async function connectGoogleCalendar(req: Request, res: Response): Promise<void> {
  const { user_id } = req.params;
  const { access_token, refresh_token, token_expiry, scope } = req.body;

  // Validate user_id
  if (!user_id) {
    res.status(400).json({
      success: false,
      error: 'Missing user_id in URL'
    });
    return;
  }

  // Validate required fields
  if (!access_token || !refresh_token || !token_expiry || !scope) {
    res.status(400).json({
      success: false,
      error: 'Missing required fields: access_token, refresh_token, token_expiry, scope'
    });
    return;
  }

  try {
    // Parse token_expiry to timestamp
    const expiryDate = new Date(token_expiry).getTime();
    
    if (isNaN(expiryDate)) {
      res.status(400).json({
        success: false,
        error: 'Invalid token_expiry format. Expected ISO 8601 timestamp'
      });
      return;
    }

    // Store tokens
    await storeGoogleTokens(user_id, {
      access_token,
      refresh_token,
      expiry_date: expiryDate,
      scope
    });

    logger.info('Google Calendar connected via API', { user_id });

    res.json({
      success: true,
      message: 'Google Calendar connected successfully',
      user_id,
      token_expiry
    });
  } catch (error) {
    logger.error('Failed to connect Google Calendar', { user_id, error });
    res.status(500).json({
      success: false,
      error: 'Failed to connect Google Calendar'
    });
  }
}

/**
 * Get all Google Calendar tokens (for testing/debugging)
 */
export async function listGoogleTokens(_req: Request, res: Response): Promise<void> {
  try {
    const result = await db.query(
      `SELECT 
        user_id,
        LEFT(access_token, 20) || '...' as access_token_preview,
        LEFT(refresh_token, 20) || '...' as refresh_token_preview,
        token_expiry,
        scope,
        created_at,
        updated_at
       FROM google_calendar_tokens
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      count: result.rows.length,
      tokens: result.rows
    });
  } catch (error) {
    logger.error('Failed to list Google tokens', { error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve tokens'
    });
  }
}

/**
 * Get Google Calendar token for specific user
 */
export async function getUserGoogleToken(req: Request, res: Response): Promise<void> {
  const { user_id } = req.params;

  try {
    const result = await db.query(
      `SELECT 
        user_id,
        access_token,
        refresh_token,
        token_expiry,
        scope,
        created_at,
        updated_at
       FROM google_calendar_tokens
       WHERE user_id = $1`,
      [user_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No Google Calendar connected for this user'
      });
      return;
    }

    const token = result.rows[0];
    const now = new Date();
    const expiry = new Date(token.token_expiry);
    const isExpired = expiry < now;

    res.json({
      success: true,
      user_id: token.user_id,
      token_info: {
        access_token: token.access_token,
        refresh_token: token.refresh_token,
        token_expiry: token.token_expiry,
        is_expired: isExpired,
        expires_in_minutes: Math.round((expiry.getTime() - now.getTime()) / 60000),
        scope: token.scope,
        created_at: token.created_at,
        updated_at: token.updated_at
      }
    });
  } catch (error) {
    logger.error('Failed to get user Google token', { user_id, error });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve token'
    });
  }
}

/**
 * Delete Google Calendar token for user
 */
export async function deleteUserGoogleToken(req: Request, res: Response): Promise<void> {
  const { user_id } = req.params;

  try {
    const result = await db.query(
      'DELETE FROM google_calendar_tokens WHERE user_id = $1 RETURNING user_id',
      [user_id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No Google Calendar connected for this user'
      });
      return;
    }

    res.json({
      success: true,
      message: 'Google Calendar disconnected successfully',
      user_id: result.rows[0].user_id
    });
  } catch (error) {
    logger.error('Failed to delete user Google token', { user_id, error });
    res.status(500).json({
      success: false,
      error: 'Failed to disconnect Google Calendar'
    });
  }
}
