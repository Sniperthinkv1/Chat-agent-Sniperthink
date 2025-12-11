-- Migration: Create contacts table for contact management
-- Description: Stores contacts with auto-sync from extractions and E.164 phone format

CREATE TABLE IF NOT EXISTS contacts (
    contact_id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    
    -- Contact info (phone in E.164 format: +14155551234)
    phone VARCHAR(20) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    company VARCHAR(255),
    
    -- Tags for segmentation (stored as array)
    tags TEXT[] DEFAULT '{}',
    
    -- Source tracking
    source VARCHAR(20) NOT NULL DEFAULT 'MANUAL' 
        CHECK (source IN ('EXTRACTION', 'IMPORT', 'MANUAL')),
    
    -- Link to extraction if synced from there
    extraction_id UUID REFERENCES extractions(extraction_id) ON DELETE SET NULL,
    
    -- Link to conversation
    conversation_id VARCHAR(50) REFERENCES conversations(conversation_id) ON DELETE SET NULL,
    
    -- Contact status
    is_active BOOLEAN DEFAULT true,
    opted_out BOOLEAN DEFAULT false,
    opted_out_at TIMESTAMP,
    
    -- Engagement tracking
    last_contacted_at TIMESTAMP,
    total_messages_sent INTEGER DEFAULT 0,
    total_messages_received INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_contacts_phone ON contacts(phone);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);
CREATE INDEX IF NOT EXISTS idx_contacts_extraction_id ON contacts(extraction_id) WHERE extraction_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_contacts_is_active ON contacts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_contacts_opted_out ON contacts(opted_out) WHERE opted_out = false;

-- Unique constraint: phone must be unique per user
CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_unique_phone 
ON contacts(user_id, phone);

-- Add updated_at trigger
DROP TRIGGER IF EXISTS contacts_updated_at ON contacts;
CREATE TRIGGER contacts_updated_at
    BEFORE UPDATE ON contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE contacts IS 'User contacts with auto-sync from extractions';
COMMENT ON COLUMN contacts.phone IS 'Phone number in E.164 format (+14155551234)';
COMMENT ON COLUMN contacts.tags IS 'Array of tags for segmentation (e.g., {"hot_lead", "vip"})';
