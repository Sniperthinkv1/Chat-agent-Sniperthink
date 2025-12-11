-- Migration: Increase message_id column length to support Instagram message IDs
-- Instagram message IDs can be up to 200 characters (base64 encoded)
-- Example: aWdfZAG1faXRlbToxOklHTWVzc2FnZAUlEOjE3ODQxNDczNTYxMTc1MjQ0OjM0MDI4MjM2Njg0MTcxMDMwMTI0NDI3NjAxNzExMTEzNzU4MjcwMjozMjQ2MTkyMzU3Mzk1MTQ1Njg3Njg0MTE0NzQyMTQyNTY2NAZDZD

-- Increase message_id length in messages table
ALTER TABLE messages 
ALTER COLUMN message_id TYPE VARCHAR(255);

-- Increase message_id length in message_delivery_status table
ALTER TABLE message_delivery_status 
ALTER COLUMN message_id TYPE VARCHAR(255);

-- Increase platform_message_id length in messages table
ALTER TABLE messages 
ALTER COLUMN platform_message_id TYPE VARCHAR(255);

-- Increase platform_message_id length in message_delivery_status table
ALTER TABLE message_delivery_status 
ALTER COLUMN platform_message_id TYPE VARCHAR(255);

-- Add comment
COMMENT ON COLUMN messages.message_id IS 'Platform message ID (WhatsApp: wamid.* up to 100 chars, Instagram: base64 up to 200 chars, WebChat: custom)';
