-- Migration: Update extractions table to store complete lead scoring data
-- This migration drops the old extractions table and creates a new comprehensive schema

-- Drop old extractions table (CASCADE will remove foreign key constraints)
DROP TABLE IF EXISTS extractions CASCADE;

-- Create new extractions table with complete lead scoring fields
CREATE TABLE extractions (
    extraction_id VARCHAR(50) PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    
    -- Contact Information
    name VARCHAR(100),
    email VARCHAR(255),
    company VARCHAR(255),
    
    -- Lead Scoring - Intent
    intent_level VARCHAR(20), -- Low, Medium, High
    intent_score INTEGER CHECK (intent_score BETWEEN 1 AND 3),
    
    -- Lead Scoring - Urgency
    urgency_level VARCHAR(20), -- Low, Medium, High
    urgency_score INTEGER CHECK (urgency_score BETWEEN 1 AND 3),
    
    -- Lead Scoring - Budget
    budget_constraint VARCHAR(20), -- Yes, No, Maybe
    budget_score INTEGER CHECK (budget_score BETWEEN 1 AND 3),
    
    -- Lead Scoring - Fit
    fit_alignment VARCHAR(20), -- Low, Medium, High
    fit_score INTEGER CHECK (fit_score BETWEEN 1 AND 3),
    
    -- Lead Scoring - Engagement
    engagement_health VARCHAR(20), -- Low, Medium, High
    engagement_score INTEGER CHECK (engagement_score BETWEEN 1 AND 3),
    
    -- CTA Tracking
    cta_pricing_clicked VARCHAR(10), -- Yes, No
    cta_demo_clicked VARCHAR(10), -- Yes, No
    cta_followup_clicked VARCHAR(10), -- Yes, No
    cta_sample_clicked VARCHAR(10), -- Yes, No
    cta_website_clicked VARCHAR(10), -- Yes, No
    cta_escalated_to_human VARCHAR(10), -- Yes, No
    
    -- Overall Scoring
    total_score INTEGER, -- Sum of all scores
    lead_status_tag VARCHAR(20), -- Hot, Warm, Cold
    
    -- Demo Booking
    demo_book_datetime TIMESTAMP,
    
    -- Reasoning (stored as JSONB for structured data)
    reasoning JSONB, -- { intent, urgency, budget, fit, engagement, cta_behavior }
    
    -- Smart Notification
    smart_notification TEXT,
    
    -- Timestamps
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_extractions_conversation_id ON extractions(conversation_id);
CREATE INDEX idx_extractions_extracted_at ON extractions(extracted_at);
CREATE INDEX idx_extractions_email ON extractions(email);
CREATE INDEX idx_extractions_company ON extractions(company);
CREATE INDEX idx_extractions_lead_status_tag ON extractions(lead_status_tag);
CREATE INDEX idx_extractions_total_score ON extractions(total_score);
CREATE INDEX idx_extractions_demo_datetime ON extractions(demo_book_datetime);
CREATE INDEX idx_extractions_intent_score ON extractions(intent_score);
CREATE INDEX idx_extractions_urgency_score ON extractions(urgency_score);

-- Trigger for updated_at timestamp
CREATE TRIGGER update_extractions_updated_at 
    BEFORE UPDATE ON extractions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE extractions IS 'Stores comprehensive lead scoring and extraction data from conversations';
COMMENT ON COLUMN extractions.reasoning IS 'JSONB object containing reasoning for each scoring dimension';
COMMENT ON COLUMN extractions.total_score IS 'Sum of intent_score + urgency_score + budget_score + fit_score + engagement_score';
COMMENT ON COLUMN extractions.lead_status_tag IS 'Overall lead quality: Hot (12-15), Warm (8-11), Cold (5-7)';
