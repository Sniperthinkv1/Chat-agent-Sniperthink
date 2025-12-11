-- Add message delivery status tracking table
-- Created: 2024-01-05
-- Description: Track message delivery status with platform message IDs and error details

CREATE TABLE message_delivery_status (
    message_id VARCHAR(50) PRIMARY KEY REFERENCES messages(message_id) ON DELETE CASCADE,
    platform_message_id VARCHAR(100), -- Message ID from Meta platform (WhatsApp/Instagram)
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'read', 'failed')),
    error_message TEXT, -- Error details if delivery failed
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for querying by status
CREATE INDEX idx_message_delivery_status_status ON message_delivery_status(status);

-- Index for querying by platform message ID
CREATE INDEX idx_message_delivery_status_platform_id ON message_delivery_status(platform_message_id);

-- Trigger for updated_at timestamp
CREATE TRIGGER update_message_delivery_status_updated_at 
    BEFORE UPDATE ON message_delivery_status
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
