-- Migration: Remove extraction_field CHECK constraint
-- Description: Since dashboard handles all variable mapping, extraction_field can be any string
-- The server no longer uses extraction_field for auto-fill - dashboard provides resolved values

-- Drop the existing CHECK constraint on extraction_field
ALTER TABLE template_variables 
DROP CONSTRAINT IF EXISTS template_variables_extraction_field_check;

-- Update column comment to reflect new usage
COMMENT ON COLUMN template_variables.extraction_field IS 
'Optional: Dashboard-defined mapping identifier. Can be any string value the dashboard uses for its own variable mapping logic. Server does not validate or use this field - dashboard provides resolved values at send time.';
