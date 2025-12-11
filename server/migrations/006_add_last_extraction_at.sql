-- Add last_extraction_at to conversations table
-- Created: 2025-10-02
-- Description: Track when extraction was last performed for each conversation
--              Used to determine if new extraction is needed based on activity

-- Add last_extraction_at column to conversations table
ALTER TABLE conversations 
ADD COLUMN last_extraction_at TIMESTAMP DEFAULT NULL;

-- Add index for efficient querying of conversations needing extraction
CREATE INDEX idx_conversations_last_extraction_at ON conversations(last_extraction_at);

-- Add comment explaining the field
COMMENT ON COLUMN conversations.last_extraction_at IS 
'Timestamp of last extraction performed on this conversation. NULL means never extracted. Used with last_message_at to determine if new extraction is needed.';
