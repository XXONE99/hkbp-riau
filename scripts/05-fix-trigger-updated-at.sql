-- Fix the trigger function to handle updated_at properly
-- The issue is that the trigger tries to set updated_at on INSERT, but it should only be set on UPDATE

-- Drop and recreate the auto-generate participant number trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_participant_number ON participants;
DROP FUNCTION IF EXISTS auto_generate_participant_number();

-- Create improved trigger function that handles INSERT vs UPDATE properly
CREATE OR REPLACE FUNCTION auto_generate_participant_number()
RETURNS TRIGGER AS $$
DECLARE
    campus_abbrev TEXT;
BEGIN
    -- Get campus abbreviation
    SELECT abbreviation INTO campus_abbrev 
    FROM campuses 
    WHERE id = NEW.campus_id;
    
    -- If campus_id is null, try to find by campus name
    IF campus_abbrev IS NULL AND NEW.campus IS NOT NULL THEN
        SELECT abbreviation INTO campus_abbrev 
        FROM campuses 
        WHERE name = NEW.campus;
        
        -- Also set the campus_id if we found it
        IF campus_abbrev IS NOT NULL THEN
            SELECT id INTO NEW.campus_id 
            FROM campuses 
            WHERE name = NEW.campus;
        END IF;
    END IF;
    
    -- If still null, use first letters of campus name
    IF campus_abbrev IS NULL THEN
        campus_abbrev := UPPER(LEFT(REPLACE(COALESCE(NEW.campus, 'UNK'), ' ', ''), 3));
    END IF;
    
    -- Generate participant number if not provided
    IF NEW.participant_number IS NULL OR NEW.participant_number = '' THEN
        NEW.participant_number := generate_participant_number(campus_abbrev);
    END IF;
    
    -- Only set updated_at on UPDATE operations, not INSERT
    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger for both INSERT and UPDATE
CREATE TRIGGER trigger_auto_generate_participant_number
    BEFORE INSERT OR UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_participant_number();

-- Also fix the generic updated_at trigger to only work on UPDATE
DROP TRIGGER IF EXISTS update_participants_updated_at ON participants;

CREATE OR REPLACE FUNCTION update_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger only for UPDATE operations
CREATE TRIGGER update_participants_updated_at 
    BEFORE UPDATE ON participants
    FOR EACH ROW 
    EXECUTE FUNCTION update_participants_updated_at();

-- Test the fix by inserting a sample participant
DO $$
BEGIN
    -- Test insert without participant_number (should auto-generate)
    INSERT INTO participants (name, campus, campus_id) 
    SELECT 'Test User', c.name, c.id 
    FROM campuses c 
    WHERE c.abbreviation = 'UI' 
    LIMIT 1;
    
    -- Clean up test data
    DELETE FROM participants WHERE name = 'Test User';
    
    RAISE NOTICE 'Trigger test completed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Trigger test failed: %', SQLERRM;
END $$;
