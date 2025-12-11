-- Migration: Create campaign_triggers table for campaign automation
-- Description: Defines when campaigns should execute (immediate, scheduled, or event-based)

CREATE TABLE IF NOT EXISTS campaign_triggers (
    trigger_id VARCHAR(50) PRIMARY KEY,
    campaign_id VARCHAR(50) NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
    
    -- Trigger type
    trigger_type VARCHAR(20) NOT NULL 
        CHECK (trigger_type IN ('IMMEDIATE', 'SCHEDULED', 'EVENT')),
    
    -- For SCHEDULED triggers: when to run
    scheduled_at TIMESTAMP,
    
    -- For EVENT triggers: what event to listen for
    event_type VARCHAR(30) CHECK (event_type IN (
        'NEW_EXTRACTION',      -- When a new extraction is created
        'LEAD_HOT',            -- When lead_status_tag becomes 'Hot'
        'LEAD_WARM',           -- When lead_status_tag becomes 'Warm'
        'TAG_ADDED',           -- When a specific tag is added to contact
        'CONVERSATION_ENDED'   -- When conversation becomes inactive
    )),
    
    -- Event configuration (JSONB for flexible config)
    -- For TAG_ADDED: { "tag": "vip" }
    -- For CONVERSATION_ENDED: { "inactiveMinutes": 60 }
    event_config JSONB DEFAULT '{}',
    
    -- Trigger status
    is_active BOOLEAN DEFAULT true,
    
    -- Execution tracking
    last_triggered_at TIMESTAMP,
    trigger_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_triggers_campaign_id ON campaign_triggers(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_triggers_type ON campaign_triggers(trigger_type);
CREATE INDEX IF NOT EXISTS idx_campaign_triggers_event_type ON campaign_triggers(event_type) WHERE event_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_triggers_scheduled_at ON campaign_triggers(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_campaign_triggers_active ON campaign_triggers(is_active) WHERE is_active = true;

-- Add updated_at trigger
DROP TRIGGER IF EXISTS campaign_triggers_updated_at ON campaign_triggers;
CREATE TRIGGER campaign_triggers_updated_at
    BEFORE UPDATE ON campaign_triggers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE campaign_triggers IS 'Defines campaign execution triggers (immediate/scheduled/event)';
COMMENT ON COLUMN campaign_triggers.event_config IS 'JSONB config for event triggers: { "tag": "vip" } or { "inactiveMinutes": 60 }';
