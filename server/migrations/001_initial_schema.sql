-- Initial schema for multi-channel AI agent service
-- Created: 2024-01-01
-- Description: Core tables for users, phone numbers, agents, conversations, messages, and credits

-- Users (tenant_id equivalent)
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    company_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Phone Numbers and Instagram Handles
-- Note: meta_phone_number_id is the ID from Meta (WABA ID for WhatsApp, Instagram Account ID for Instagram)
-- This is the ID used in Meta API calls like: POST /v21.0/{meta_phone_number_id}/messages
CREATE TABLE phone_numbers (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('whatsapp', 'instagram', 'webchat')),
    meta_phone_number_id VARCHAR(100) NOT NULL, -- Meta's phone_number_id (WABA ID) or Instagram Account ID
    access_token TEXT NOT NULL, -- Meta access token for this phone number/account
    display_name VARCHAR(255), -- Human-readable: +1234567890 or @instagram_handle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, meta_phone_number_id, platform)
);

-- AI Agents
CREATE TABLE agents (
    agent_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    phone_number_id VARCHAR(50) NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
    prompt_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(phone_number_id) -- One agent per phone number
);

-- Conversations
CREATE TABLE conversations (
    conversation_id VARCHAR(50) PRIMARY KEY,
    agent_id VARCHAR(50) NOT NULL REFERENCES agents(agent_id) ON DELETE CASCADE,
    customer_phone VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_message_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    UNIQUE(agent_id, customer_phone, is_active) -- One active conversation per agent-customer pair
);

-- Messages
CREATE TABLE messages (
    message_id VARCHAR(50) PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    sender VARCHAR(20) NOT NULL CHECK (sender IN ('user', 'agent')),
    text TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'pending')),
    sequence_no INTEGER NOT NULL,
    platform_message_id VARCHAR(100), -- External platform message ID
    UNIQUE(conversation_id, sequence_no)
);

-- Credits
CREATE TABLE credits (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    remaining_credits INTEGER DEFAULT 0 CHECK (remaining_credits >= 0),
    total_used INTEGER DEFAULT 0 CHECK (total_used >= 0),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_phone_numbers_user_id ON phone_numbers(user_id);
CREATE INDEX idx_phone_numbers_platform ON phone_numbers(platform);
CREATE INDEX idx_phone_numbers_meta_id ON phone_numbers(meta_phone_number_id);
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_phone_number_id ON agents(phone_number_id);
CREATE INDEX idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX idx_conversations_customer_phone ON conversations(customer_phone);
CREATE INDEX idx_conversations_last_message_at ON conversations(last_message_at);
CREATE INDEX idx_conversations_is_active ON conversations(is_active);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_messages_sender ON messages(sender);
CREATE INDEX idx_messages_status ON messages(status);

-- Triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_phone_numbers_updated_at BEFORE UPDATE ON phone_numbers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();