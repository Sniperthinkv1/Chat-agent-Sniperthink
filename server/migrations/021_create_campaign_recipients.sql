-- Migration: Create campaign_recipients table for tracking campaign sends
-- Description: Tracks individual recipient status within a campaign

CREATE TABLE IF NOT EXISTS campaign_recipients (
    recipient_id VARCHAR(50) PRIMARY KEY,
    campaign_id VARCHAR(50) NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    contact_id VARCHAR(50) NOT NULL REFERENCES contacts(contact_id) ON DELETE CASCADE,
    
    -- Link to template send record
    template_send_id VARCHAR(50) REFERENCES template_sends(send_id) ON DELETE SET NULL,
    
    -- Recipient status
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' 
        CHECK (status IN ('PENDING', 'QUEUED', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED')),
    
    -- Skip reason (if status is SKIPPED)
    skip_reason VARCHAR(50) CHECK (skip_reason IN (
        'OPTED_OUT',           -- Contact opted out
        'RATE_LIMITED',        -- Hit daily rate limit
        'INVALID_PHONE',       -- Invalid phone number
        'DUPLICATE',           -- Already sent in this campaign
        'RECENTLY_CONTACTED'   -- Contacted too recently
    )),
    
    -- Error details if failed
    error_message TEXT,
    
    -- Timestamps
    queued_at TIMESTAMP,
    sent_at TIMESTAMP,
    delivered_at TIMESTAMP,
    read_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_campaign_id ON campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_contact_id ON campaign_recipients(contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_template_send_id ON campaign_recipients(template_send_id) WHERE template_send_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_status ON campaign_recipients(status);
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_created_at ON campaign_recipients(created_at);

-- Unique constraint: contact can only be in campaign once
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_recipients_unique 
ON campaign_recipients(campaign_id, contact_id);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS campaign_recipients_updated_at ON campaign_recipients;
CREATE TRIGGER campaign_recipients_updated_at
    BEFORE UPDATE ON campaign_recipients
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE campaign_recipients IS 'Tracks individual recipient status within campaigns';
