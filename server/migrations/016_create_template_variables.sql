-- Migration: Create template_variables table for variable mappings
-- Description: Maps custom variable names to WhatsApp positional variables and extraction fields

CREATE TABLE IF NOT EXISTS template_variables (
    variable_id VARCHAR(50) PRIMARY KEY,
    template_id VARCHAR(50) NOT NULL REFERENCES templates(template_id) ON DELETE CASCADE,
    
    -- Custom variable name (e.g., "customer_name", "company_name")
    variable_name VARCHAR(100) NOT NULL,
    
    -- Position in WhatsApp template (1, 2, 3, etc. maps to {{1}}, {{2}}, {{3}})
    position INTEGER NOT NULL CHECK (position >= 1 AND position <= 10),
    
    -- Component type where this variable appears
    component_type VARCHAR(20) NOT NULL DEFAULT 'BODY' 
        CHECK (component_type IN ('HEADER', 'BODY', 'BUTTON')),
    
    -- Source field from extractions table for auto-fill
    -- NULL means user must provide value manually
    extraction_field VARCHAR(50) CHECK (extraction_field IN (
        'name', 'email', 'company', 'customer_phone',
        'intent_level', 'urgency_level', 'lead_status_tag',
        'total_score', 'smart_notification'
    )),
    
    -- Default value if extraction field is empty
    default_value VARCHAR(255),
    
    -- Sample value for preview
    sample_value VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_template_variables_template_id ON template_variables(template_id);

-- Unique constraint: position must be unique per template
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_variables_unique_position 
ON template_variables(template_id, position);

-- Unique constraint: variable name must be unique per template
CREATE UNIQUE INDEX IF NOT EXISTS idx_template_variables_unique_name 
ON template_variables(template_id, variable_name);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS template_variables_updated_at ON template_variables;
CREATE TRIGGER template_variables_updated_at
    BEFORE UPDATE ON template_variables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE template_variables IS 'Maps custom variable names to WhatsApp positional variables';
COMMENT ON COLUMN template_variables.position IS 'WhatsApp position (1-10) maps to {{1}}-{{10}} in template';
COMMENT ON COLUMN template_variables.extraction_field IS 'Auto-fill from extraction data when sending';
