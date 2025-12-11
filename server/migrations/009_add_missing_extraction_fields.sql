-- Migration: Add missing fields to extractions table
-- Adds lead_status_tag, smart_notification, reasoning, and demo_book_datetime

-- Add missing columns
ALTER TABLE extractions 
ADD COLUMN IF NOT EXISTS lead_status_tag VARCHAR(20),
ADD COLUMN IF NOT EXISTS smart_notification TEXT,
ADD COLUMN IF NOT EXISTS reasoning JSONB,
ADD COLUMN IF NOT EXISTS demo_book_datetime TIMESTAMP;

-- Drop constraint if exists and recreate (PostgreSQL doesn't support IF NOT EXISTS for constraints)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'extractions_lead_status_tag_check'
    ) THEN
        ALTER TABLE extractions 
        ADD CONSTRAINT extractions_lead_status_tag_check 
        CHECK (lead_status_tag IS NULL OR lead_status_tag IN ('Hot', 'Warm', 'Cold'));
    END IF;
END $$;

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_extractions_lead_status_tag ON extractions(lead_status_tag);
CREATE INDEX IF NOT EXISTS idx_extractions_demo_datetime ON extractions(demo_book_datetime);

-- Add comments
COMMENT ON COLUMN extractions.lead_status_tag IS 'Overall lead quality: Hot (12-15), Warm (8-11), Cold (5-7)';
COMMENT ON COLUMN extractions.smart_notification IS 'Human-readable summary of conversation progress';
COMMENT ON COLUMN extractions.reasoning IS 'JSONB object containing reasoning for each scoring dimension';
COMMENT ON COLUMN extractions.demo_book_datetime IS 'Timestamp when demo was booked (if applicable)';
