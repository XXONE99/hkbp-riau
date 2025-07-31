-- Update existing participants to use new numbering system
-- This script will update existing participant numbers to follow campus-based format

-- First, let's create a temporary function to generate new participant numbers
CREATE OR REPLACE FUNCTION generate_campus_participant_number(campus_name TEXT)
RETURNS TEXT AS $$
DECLARE
    campus_abbrev TEXT;
    next_number INTEGER;
    formatted_number TEXT;
BEGIN
    -- Get campus abbreviation
    SELECT abbreviation INTO campus_abbrev 
    FROM campuses 
    WHERE name = campus_name 
    LIMIT 1;
    
    -- If campus not found, use first 3 letters of campus name
    IF campus_abbrev IS NULL THEN
        campus_abbrev := UPPER(LEFT(REPLACE(campus_name, ' ', ''), 3));
    END IF;
    
    -- Get next available number for this campus
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(participant_number FROM LENGTH(campus_abbrev) + 1) AS INTEGER)
    ), 0) + 1
    INTO next_number
    FROM participants 
    WHERE participant_number LIKE campus_abbrev || '%';
    
    -- Format number with leading zeros (minimum 2 digits)
    formatted_number := LPAD(next_number::TEXT, 2, '0');
    
    RETURN campus_abbrev || formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Update existing participants with new numbering system
-- Note: This will only work if you have existing data
UPDATE participants 
SET participant_number = generate_campus_participant_number(campus)
WHERE participant_number LIKE 'PST%' OR participant_number NOT LIKE '%[0-9][0-9]';

-- Drop the temporary function
DROP FUNCTION IF EXISTS generate_campus_participant_number(TEXT);

-- Add constraint to ensure participant numbers follow the new format
-- ALTER TABLE participants ADD CONSTRAINT check_participant_number_format 
-- CHECK (participant_number ~ '^[A-Z]+[0-9]{2,}$');

-- Create index for better performance on participant number searches
CREATE INDEX IF NOT EXISTS idx_participants_number_prefix 
ON participants (LEFT(participant_number, 3));
