-- Migration: Increase customer_phone length to support webchat session IDs
-- Webchat uses session IDs like "session_1759591818801_wjrl2neei" (33 chars)
-- WhatsApp/Instagram use phone numbers like "918979556941" (12-15 chars)

ALTER TABLE extractions 
ALTER COLUMN customer_phone TYPE VARCHAR(50);

-- Add comment
COMMENT ON COLUMN extractions.customer_phone IS 'Customer identifier: phone number for WhatsApp/Instagram, session ID for webchat (max 50 chars)';
