-- Migration: Create templates table for WhatsApp message templates
-- Description: Stores user-specific WhatsApp templates with Meta approval tracking

CREATE TABLE IF NOT EXISTS templates (
    template_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    phone_number_id VARCHAR(50) NOT NULL REFERENCES phone_numbers(id) ON DELETE CASCADE,
    
    -- Template identification
    name VARCHAR(512) NOT NULL,
    
    -- Template category (affects delivery and approval)
    category VARCHAR(20) NOT NULL CHECK (category IN ('MARKETING', 'UTILITY', 'AUTHENTICATION')),
    
    -- Template status lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' 
        CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'PAUSED', 'DISABLED')),
    
    -- Language (English only for now)
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    
    -- Template components stored as JSONB
    -- Structure: { header?: {...}, body: {...}, footer?: {...}, buttons?: [...] }
    components JSONB NOT NULL DEFAULT '{}',
    
    -- Meta's template ID after submission
    meta_template_id VARCHAR(100),
    
    -- Rejection details from Meta
    rejection_reason TEXT,
    
    -- Timestamps
    submitted_at TIMESTAMP,
    approved_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_phone_number_id ON templates(phone_number_id);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_meta_template_id ON templates(meta_template_id) WHERE meta_template_id IS NOT NULL;

-- Unique constraint: template name must be unique per phone number
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_unique_name 
ON templates(phone_number_id, name);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS templates_updated_at ON templates;
CREATE TRIGGER templates_updated_at
    BEFORE UPDATE ON templates
    FOR EACH ROW
    EXECUTE FUNCTION update_templates_updated_at();

COMMENT ON TABLE templates IS 'WhatsApp message templates with Meta approval tracking';
COMMENT ON COLUMN templates.components IS 'JSONB structure: { header?: {type, text/format}, body: {text}, footer?: {text}, buttons?: [{type, text, url?}] }';
COMMENT ON COLUMN templates.meta_template_id IS 'Template ID returned by Meta after successful submission';
