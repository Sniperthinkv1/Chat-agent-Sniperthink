import { google } from 'googleapis';
import dotenv from 'dotenv';

dotenv.config();

export const googleConfig = {
  clientId: process.env['GOOGLE_CLIENT_ID']!,
  clientSecret: process.env['GOOGLE_CLIENT_SECRET']!,
  redirectUri: process.env['GOOGLE_REDIRECT_URI']!,
};

// Validate required Google OAuth configuration
export function validateGoogleConfig(): void {
  const required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required Google OAuth configuration: ${missing.join(', ')}`);
  }
}

// Create OAuth2 client
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    googleConfig.clientId,
    googleConfig.clientSecret,
    googleConfig.redirectUri
  );
}

// Scopes for Google Calendar access
export const GOOGLE_CALENDAR_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
];
