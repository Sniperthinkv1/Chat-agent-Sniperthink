-- Add OpenAI Responses API conversation tracking
-- Created: 2025-02-10
-- Description: Add openai_conversation_id to conversations table for OpenAI Responses API integration

-- Add openai_conversation_id column to conversations table
-- This stores the OpenAI conversation ID from the Responses API
-- One OpenAI conversation per customer conversation for context management
ALTER TABLE conversations 
ADD COLUMN openai_conversation_id VARCHAR(100);

-- Add index for efficient lookups by OpenAI conversation ID
CREATE INDEX idx_conversations_openai_id ON conversations(openai_conversation_id);

-- Add comment explaining the field
COMMENT ON COLUMN conversations.openai_conversation_id IS 'OpenAI Responses API conversation ID for maintaining AI context. One OpenAI conversation per customer conversation.';
