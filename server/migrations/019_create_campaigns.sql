-- Migration: Create campaigns table for bulk template sends
-- Description: Manages bulk messaging campaigns with scheduling and event triggers

CREATE TABLE IF NOT EXISTS campaigns (
    campaign_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    template_id VARCHAR(50) NOT NULL REFERENCES templates(template_id) ON DELETE CASCADE,
    phone_number_id VARCHAR(50) NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
    
    -- Campaign info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Campaign status
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' 
        CHECK (status IN ('DRAFT', 'SCHEDULED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED')),
    
    -- Recipient filtering (JSONB for flexible filters)
    -- Structure: { tags?: string[], excludeTags?: string[], contactIds?: string[] }
    recipient_filter JSONB DEFAULT '{}',
    
    -- Statistics
    total_recipients INTEGER DEFAULT 0,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    
    -- Progress tracking
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    paused_at TIMESTAMP,
    
    -- Error tracking
    last_error TEXT,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_template_id ON campaigns(template_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_phone_number_id ON campaigns(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS campaigns_updated_at ON campaigns;
CREATE TRIGGER campaigns_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE campaigns IS 'Bulk messaging campaigns with template sends';
COMMENT ON COLUMN campaigns.recipient_filter IS 'JSONB filter: { tags?: string[], excludeTags?: string[], contactIds?: string[] }';
