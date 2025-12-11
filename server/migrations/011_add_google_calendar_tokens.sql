-- Migration 011: Add Google Calendar OAuth tokens
-- This table stores Google OAuth access and refresh tokens for calendar integration

CREATE TABLE IF NOT EXISTS google_calendar_tokens (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    token_expiry TIMESTAMP NOT NULL,
    scope TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for quick token lookups
CREATE INDEX idx_google_calendar_tokens_user_id ON google_calendar_tokens(user_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_google_calendar_tokens_updated_at
    BEFORE UPDATE ON google_calendar_tokens
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
