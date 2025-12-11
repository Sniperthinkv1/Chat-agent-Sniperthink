import { Request, Response } from 'express';
import { google } from 'googleapis';
import { createOAuth2Client, GOOGLE_CALENDAR_SCOPES } from '../config/google';
import { storeGoogleTokens } from '../services/googleCalendarService';
import { logger } from '../utils/logger';
import { db } from '../utils/database';

/**
 * Render landing page with Google login button
 */
export function renderLandingPage(_req: Request, res: Response): void {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Connect Google Calendar</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        
        .container {
          background: white;
          border-radius: 20px;
          padding: 60px 40px;
          max-width: 500px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          text-align: center;
        }
        
        h1 {
          color: #333;
          font-size: 32px;
          margin-bottom: 16px;
          font-weight: 700;
        }
        
        p {
          color: #666;
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 40px;
        }
        
        .google-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          background: white;
          color: #444;
          border: 2px solid #ddd;
          border-radius: 8px;
          padding: 14px 28px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          text-decoration: none;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .google-btn:hover {
          background: #f8f9fa;
          border-color: #4285f4;
          box-shadow: 0 4px 12px rgba(66, 133, 244, 0.3);
          transform: translateY(-2px);
        }
        
        .google-btn:active {
          transform: translateY(0);
        }
        
        .google-icon {
          width: 24px;
          height: 24px;
          margin-right: 12px;
        }
        
        .features {
          margin-top: 40px;
          text-align: left;
        }
        
        .feature {
          display: flex;
          align-items: start;
          margin-bottom: 16px;
          color: #555;
          font-size: 14px;
        }
        
        .feature-icon {
          color: #667eea;
          margin-right: 12px;
          font-size: 20px;
          flex-shrink: 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📅 Connect Your Calendar</h1>
        <p>Enable meeting booking by connecting your Google Calendar. Your customers will be able to schedule meetings directly through the chat.</p>
        
        <a href="/auth/google" class="google-btn">
          <svg class="google-icon" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </a>
        
        <div class="features">
          <div class="feature">
            <span class="feature-icon">✓</span>
            <span>Automatic meeting scheduling in your calendar</span>
          </div>
          <div class="feature">
            <span class="feature-icon">✓</span>
            <span>Real-time availability checking</span>
          </div>
          <div class="feature">
            <span class="feature-icon">✓</span>
            <span>Secure OAuth 2.0 authentication</span>
          </div>
        </div>
      </div>
    </body>
    </html>
  `);
}

/**
 * Initiate Google OAuth flow
 */
export function initiateGoogleAuth(_req: Request, res: Response): void {
  try {
    const oauth2Client = createOAuth2Client();
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: GOOGLE_CALENDAR_SCOPES,
      prompt: 'consent' // Force consent screen to get refresh token
    });
    
    res.redirect(authUrl);
  } catch (error) {
    logger.error('Failed to initiate Google auth', { error });
    res.status(500).send('Failed to initiate authentication');
  }
}

/**
 * Handle Google OAuth callback
 */
export async function handleGoogleCallback(req: Request, res: Response): Promise<void> {
  const { code, error } = req.query;
  
  if (error) {
    logger.error('Google OAuth error', { error });
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Failed</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #d32f2f; font-size: 18px; }
          a { color: #667eea; text-decoration: none; }
        </style>
      </head>
      <body>
        <h1>❌ Authentication Failed</h1>
        <p class="error">Failed to connect Google Calendar</p>
        <p><a href="/">Try Again</a></p>
      </body>
      </html>
    `);
    return;
  }
  
  if (!code || typeof code !== 'string') {
    res.status(400).send('Missing authorization code');
    return;
  }
  
  try {
    const oauth2Client = createOAuth2Client();
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Missing required tokens');
    }
    
    // Get user info to identify the user
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    const email = userInfo.data.email;
    if (!email) {
      throw new Error('Failed to get user email');
    }
    
    // Find or create user
    let userId: string;
    
    // Check if user exists
    const userResult = await db.query(
      'SELECT user_id FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length > 0) {
      userId = userResult.rows[0].user_id;
    } else {
      // Create new user
      const newUserResult = await db.query(
        `INSERT INTO users (user_id, email, company_name)
         VALUES (gen_random_uuid()::text, $1, $2)
         RETURNING user_id`,
        [email, userInfo.data.name || 'Unknown']
      );
      userId = newUserResult.rows[0].user_id;
      
      // Initialize credits for new user
      await db.query(
        'INSERT INTO credits (user_id, remaining_credits) VALUES ($1, 100)',
        [userId]
      );
    }
    
    // Store tokens
    await storeGoogleTokens(userId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date || Date.now() + 3600000,
      scope: tokens.scope || GOOGLE_CALENDAR_SCOPES.join(' ')
    });
    
    logger.info('Google Calendar connected successfully', { userId, email });
    
    // Success page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Connected Successfully</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }
          .container {
            background: white;
            border-radius: 20px;
            padding: 60px 40px;
            max-width: 500px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          h1 { color: #333; margin-bottom: 16px; }
          p { color: #666; margin-bottom: 20px; line-height: 1.6; }
          .success-icon { font-size: 64px; margin-bottom: 20px; }
          .info { background: #f5f5f5; padding: 20px; border-radius: 8px; margin-top: 30px; }
          .info-item { margin: 10px 0; color: #555; font-size: 14px; }
          .label { font-weight: 600; color: #333; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success-icon">✅</div>
          <h1>Successfully Connected!</h1>
          <p>Your Google Calendar has been connected. You can now enable meeting booking for your AI agents.</p>
          
          <div class="info">
            <div class="info-item">
              <span class="label">Email:</span> ${email}
            </div>
            <div class="info-item">
              <span class="label">User ID:</span> ${userId}
            </div>
            <div class="info-item">
              <span class="label">Status:</span> Active
            </div>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    logger.error('Failed to handle Google callback', { error });
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #d32f2f; }
        </style>
      </head>
      <body>
        <h1>❌ Error</h1>
        <p class="error">Failed to complete authentication</p>
        <p><a href="/">Try Again</a></p>
      </body>
      </html>
    `);
  }
}
