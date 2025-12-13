-- Migration: Rename extraction_field to dashboard_mapping
-- Description: Clearer naming - this field stores the dashboard's variable mapping identifier
-- The server does NOT use this for any logic - it's purely for dashboard reference

-- Rename the column
ALTER TABLE template_variables 
RENAME COLUMN extraction_field TO dashboard_mapping;

-- Update column comment
COMMENT ON COLUMN template_variables.dashboard_mapping IS 
'Dashboard-defined mapping identifier (e.g., "name", "meetingLink", "orderTotal"). 
The server stores this but does NOT use it - dashboard provides resolved values when sending messages.
This field helps the dashboard remember which data source maps to which template variable.';
