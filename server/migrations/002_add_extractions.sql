-- Lead Extractions table
-- Created: 2024-01-01
-- Description: Structured lead data extraction from conversations

CREATE TABLE extractions (
    extraction_id VARCHAR(50) PRIMARY KEY,
    conversation_id VARCHAR(50) NOT NULL REFERENCES conversations(conversation_id) ON DELETE CASCADE,
    name VARCHAR(100),
    email VARCHAR(255),
    company VARCHAR(255),
    intent VARCHAR(100),
    urgency INTEGER CHECK (urgency BETWEEN 1 AND 3),
    budget INTEGER CHECK (budget BETWEEN 1 AND 3),
    fit INTEGER CHECK (fit BETWEEN 1 AND 3),
    engagement INTEGER CHECK (engagement BETWEEN 1 AND 3),
    demo_datetime TIMESTAMP,
    smart_notification TEXT,
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for extractions
CREATE INDEX idx_extractions_conversation_id ON extractions(conversation_id);
CREATE INDEX idx_extractions_extracted_at ON extractions(extracted_at);
CREATE INDEX idx_extractions_email ON extractions(email);
CREATE INDEX idx_extractions_company ON extractions(company);
CREATE INDEX idx_extractions_urgency ON extractions(urgency);
CREATE INDEX idx_extractions_demo_datetime ON extractions(demo_datetime);

-- Trigger for updated_at timestamp
CREATE TRIGGER update_extractions_updated_at BEFORE UPDATE ON extractions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();