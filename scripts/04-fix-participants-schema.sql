-- Fix participants table schema to match the application code
-- Add campus_id column if it doesn't exist and update existing data

-- First, check if campus_id column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'participants' AND column_name = 'campus_id') THEN
        ALTER TABLE participants ADD COLUMN campus_id UUID REFERENCES campuses(id);
    END IF;
END $$;

-- Update existing participants to have campus_id based on campus name
UPDATE participants 
SET campus_id = c.id 
FROM campuses c 
WHERE participants.campus = c.name 
AND participants.campus_id IS NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_participants_campus_id ON participants(campus_id);

-- Verify the update
SELECT 
    p.participant_number,
    p.name,
    p.campus,
    c.abbreviation as campus_abbrev,
    p.campus_id
FROM participants p
LEFT JOIN campuses c ON p.campus_id = c.id
ORDER BY p.participant_number;
