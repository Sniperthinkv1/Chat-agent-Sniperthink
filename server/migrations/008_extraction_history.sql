-- Migration 008: Extraction History Tracking
-- Drop old table and create new one with history support

-- Drop existing extractions table
DROP TABLE IF EXISTS extractions CASCADE;

-- Create new extractions table with history support
CREATE TABLE extractions (
  extraction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  customer_phone VARCHAR(20) NOT NULL,
  
  -- Extraction metadata
  extracted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  is_latest BOOLEAN NOT NULL DEFAULT true,
  message_count_at_extraction INTEGER NOT NULL DEFAULT 0,
  
  -- Contact Information
  name VARCHAR(255),
  email VARCHAR(255),
  company VARCHAR(255),
  
  -- Intent Analysis
  intent TEXT,
  intent_level VARCHAR(20) CHECK (intent_level IN ('Low', 'Medium', 'High')),
  intent_score INTEGER CHECK (intent_score BETWEEN 1 AND 3),
  
  -- Urgency Analysis
  urgency_level VARCHAR(20) CHECK (urgency_level IN ('Low', 'Medium', 'High')),
  urgency_score INTEGER CHECK (urgency_score BETWEEN 1 AND 3),
  
  -- Budget Analysis
  budget_constraint VARCHAR(20) CHECK (budget_constraint IN ('Yes', 'No', 'Maybe')),
  budget_score INTEGER CHECK (budget_score BETWEEN 1 AND 3),
  
  -- Fit Analysis
  fit_alignment VARCHAR(20) CHECK (fit_alignment IN ('Low', 'Medium', 'High')),
  fit_score INTEGER CHECK (fit_score BETWEEN 1 AND 3),
  
  -- Engagement Analysis
  engagement_health VARCHAR(20) CHECK (engagement_health IN ('Low', 'Medium', 'High')),
  engagement_score INTEGER CHECK (engagement_score BETWEEN 1 AND 3),
  
  -- CTA Tracking
  cta_pricing_clicked VARCHAR(10) CHECK (cta_pricing_clicked IN ('Yes', 'No')),
  cta_demo_clicked VARCHAR(10) CHECK (cta_demo_clicked IN ('Yes', 'No')),
  cta_followup_clicked VARCHAR(10) CHECK (cta_followup_clicked IN ('Yes', 'No')),
  cta_sample_clicked VARCHAR(10) CHECK (cta_sample_clicked IN ('Yes', 'No')),
  cta_website_clicked VARCHAR(10) CHECK (cta_website_clicked IN ('Yes', 'No')),
  cta_escalated_to_human VARCHAR(10) CHECK (cta_escalated_to_human IN ('Yes', 'No')),
  
  -- Overall Score
  total_score INTEGER CHECK (total_score BETWEEN 5 AND 15),
  
  -- Additional Notes
  notes TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_extractions_conversation_id ON extractions(conversation_id);
CREATE INDEX idx_extractions_user_id ON extractions(user_id);
CREATE INDEX idx_extractions_customer_phone ON extractions(customer_phone);
CREATE INDEX idx_extractions_extracted_at ON extractions(extracted_at DESC);
CREATE INDEX idx_extractions_is_latest ON extractions(is_latest) WHERE is_latest = true;
CREATE INDEX idx_extractions_conversation_latest ON extractions(conversation_id, is_latest) WHERE is_latest = true;

-- Composite index for common queries
CREATE INDEX idx_extractions_user_conversation ON extractions(user_id, conversation_id, extracted_at DESC);

-- Comments
COMMENT ON TABLE extractions IS 'Lead extraction history - tracks conversation evolution over time';
COMMENT ON COLUMN extractions.is_latest IS 'Flag indicating if this is the most recent extraction for the conversation';
COMMENT ON COLUMN extractions.message_count_at_extraction IS 'Number of messages in conversation when extraction was performed';
COMMENT ON COLUMN extractions.extracted_at IS 'Timestamp when this extraction snapshot was created';
