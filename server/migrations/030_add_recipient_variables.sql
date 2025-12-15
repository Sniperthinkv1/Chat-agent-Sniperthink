-- Migration: Add variable_values column to campaign_recipients
-- Description: Stores per-recipient variable values for campaign template sends

-- Add variable_values column to store per-recipient template variables
ALTER TABLE campaign_recipients 
ADD COLUMN IF NOT EXISTS variable_values JSONB DEFAULT '{}';

COMMENT ON COLUMN campaign_recipients.variable_values IS 'Per-recipient template variable values: { "1": "value1", "2": "value2" }';

-- Create index for potential queries on variable values
CREATE INDEX IF NOT EXISTS idx_campaign_recipients_variable_values 
ON campaign_recipients USING gin(variable_values);
