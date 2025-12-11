-- Migration: Create template_sends table for tracking template message sends
-- Description: Tracks individual template message sends with delivery status

CREATE TABLE IF NOT EXISTS template_sends (
    send_id VARCHAR(50) PRIMARY KEY,
    template_id VARCHAR(50) NOT NULL REFERENCES templates(template_id) ON DELETE CASCADE,
    
    -- Optional link to existing conversation (if sending to existing contact)
    conversation_id VARCHAR(50) REFERENCES conversations(conversation_id) ON DELETE SET NULL,
    
    -- Campaign link (if sent via campaign)
    campaign_id VARCHAR(50),
    
    -- Recipient info
    customer_phone VARCHAR(50) NOT NULL,
    
    -- Variable values used in this send (JSONB: { "1": "John", "2": "Acme Corp" })
    variable_values JSONB DEFAULT '{}',
    
    -- Delivery status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED')),
    
    -- Meta's message ID after sending
    platform_message_id VARCHAR(100),
    
    -- Error details if failed
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Timestamps
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_template_sends_template_id ON template_sends(template_id);
CREATE INDEX IF NOT EXISTS idx_template_sends_conversation_id ON template_sends(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_template_sends_campaign_id ON template_sends(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_template_sends_customer_phone ON template_sends(customer_phone);
CREATE INDEX IF NOT EXISTS idx_template_sends_status ON template_sends(status);
CREATE INDEX IF NOT EXISTS idx_template_sends_platform_message_id ON template_sends(platform_message_id) WHERE platform_message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_template_sends_created_at ON template_sends(created_at);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS template_sends_updated_at ON template_sends;
CREATE TRIGGER template_sends_updated_at
    BEFORE UPDATE ON template_sends
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE template_sends IS 'Tracks individual template message sends with delivery status';
COMMENT ON COLUMN template_sends.variable_values IS 'JSONB mapping position to value: { "1": "John", "2": "Acme Corp" }';
