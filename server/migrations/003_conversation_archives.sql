-- Conversation Archives table
-- Created: 2024-01-01
-- Description: Archive conversations when agents are relinked

CREATE TABLE conversation_archives (
    archive_id VARCHAR(50) PRIMARY KEY,
    old_agent_id VARCHAR(50) NOT NULL,
    new_agent_id VARCHAR(50) NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    phone_number_id VARCHAR(50) NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
    archived_conversations_count INTEGER DEFAULT 0,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reason VARCHAR(255) DEFAULT 'Agent relinked'
);

-- Indexes for conversation archives
CREATE INDEX idx_conversation_archives_old_agent_id ON conversation_archives(old_agent_id);
CREATE INDEX idx_conversation_archives_new_agent_id ON conversation_archives(new_agent_id);
CREATE INDEX idx_conversation_archives_phone_number_id ON conversation_archives(phone_number_id);
CREATE INDEX idx_conversation_archives_archived_at ON conversation_archives(archived_at);