-- Migration: Add WABA ID and rate limiting fields to phone_numbers
-- Description: Extends phone_numbers table with WhatsApp Business Account ID and daily message rate limiting

-- Add WABA ID column (required for template management at WABA level)
ALTER TABLE phone_numbers 
ADD COLUMN IF NOT EXISTS waba_id VARCHAR(100);

-- Add rate limiting columns for WhatsApp tier-based limits
ALTER TABLE phone_numbers 
ADD COLUMN IF NOT EXISTS daily_message_limit INTEGER DEFAULT 1000;

ALTER TABLE phone_numbers 
ADD COLUMN IF NOT EXISTS daily_messages_sent INTEGER DEFAULT 0;

ALTER TABLE phone_numbers 
ADD COLUMN IF NOT EXISTS tier VARCHAR(20) DEFAULT 'TIER_1K' 
CHECK (tier IN ('TIER_1K', 'TIER_10K', 'TIER_100K', 'TIER_UNLIMITED'));

ALTER TABLE phone_numbers 
ADD COLUMN IF NOT EXISTS limit_reset_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create index for rate limit queries
CREATE INDEX IF NOT EXISTS idx_phone_numbers_limit_reset 
ON phone_numbers(limit_reset_at);

-- Create index for WABA lookups
CREATE INDEX IF NOT EXISTS idx_phone_numbers_waba_id 
ON phone_numbers(waba_id) WHERE waba_id IS NOT NULL;

COMMENT ON COLUMN phone_numbers.waba_id IS 'WhatsApp Business Account ID for template management';
COMMENT ON COLUMN phone_numbers.daily_message_limit IS 'Maximum messages allowed per day based on tier';
COMMENT ON COLUMN phone_numbers.daily_messages_sent IS 'Messages sent today, resets at limit_reset_at';
COMMENT ON COLUMN phone_numbers.tier IS 'WhatsApp messaging tier: TIER_1K, TIER_10K, TIER_100K, TIER_UNLIMITED';
COMMENT ON COLUMN phone_numbers.limit_reset_at IS 'Timestamp when daily_messages_sent resets to 0';
