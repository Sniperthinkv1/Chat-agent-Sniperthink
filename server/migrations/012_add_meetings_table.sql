-- Migration 012: Add meetings table for tracking booked meetings

CREATE TABLE IF NOT EXISTS meetings (
    meeting_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    google_event_id VARCHAR(255) NOT NULL,
    
    -- Meeting details
    title VARCHAR(255) NOT NULL,
    customer_name VARCHAR(255),
    customer_email VARCHAR(255),
    participants TEXT[], -- Array of email addresses
    
    -- Time details
    meeting_time TIMESTAMP NOT NULL,
    duration_minutes INTEGER DEFAULT 30,
    timezone VARCHAR(100),
    
    -- Google Meet details
    meet_link TEXT,
    
    -- Status tracking
    status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'cancelled', 'completed')),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for quick lookups
CREATE INDEX idx_meetings_user_id ON meetings(user_id);
CREATE INDEX idx_meetings_conversation_id ON meetings(conversation_id);
CREATE INDEX idx_meetings_meeting_time ON meetings(meeting_time);
CREATE INDEX idx_meetings_status ON meetings(status);
CREATE INDEX idx_meetings_google_event_id ON meetings(google_event_id);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_meetings_updated_at
    BEFORE UPDATE ON meetings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
