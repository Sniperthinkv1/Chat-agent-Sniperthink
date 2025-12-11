-- Migration: Increase message_id column length to support WhatsApp message IDs
-- WhatsApp message IDs can be up to 64 characters (e.g., wamid.HBgMOTE4OTc5NTU2OTQxFQIAEhgUM0Y3QzFGNzg4NjE1RDhDODQ4NTQA)

-- Increase message_id length in messages table
ALTER TABLE messages 
ALTER COLUMN message_id TYPE VARCHAR(100);

-- Increase message_id length in message_delivery_status table
ALTER TABLE message_delivery_status 
ALTER COLUMN message_id TYPE VARCHAR(100);

-- Add comment
COMMENT ON COLUMN messages.message_id IS 'Platform message ID (WhatsApp: wamid.*, Instagram: mid.*, WebChat: custom)';
