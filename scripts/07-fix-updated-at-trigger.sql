-- Fix the updated_at trigger issue
-- Drop problematic triggers and recreate them properly

-- Drop existing triggers that might be causing issues
DROP TRIGGER IF EXISTS trigger_auto_generate_participant_number ON participants;
DROP TRIGGER IF EXISTS update_participants_updated_at ON participants;
DROP FUNCTION IF EXISTS auto_generate_participant_number();
DROP FUNCTION IF EXISTS update_participants_updated_at();

-- Create a simple updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Only set updated_at if the column exists
    IF TG_OP = 'UPDATE' THEN
        -- Check if updated_at column exists before setting it
        BEGIN
            NEW.updated_at = NOW();
        EXCEPTION
            WHEN undefined_column THEN
                -- Column doesn't exist, ignore
                NULL;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a simplified participant number generation trigger
CREATE OR REPLACE FUNCTION auto_generate_participant_number()
RETURNS TRIGGER AS $$
DECLARE
    campus_abbrev TEXT;
BEGIN
    -- Only generate participant number on INSERT if not provided
    IF TG_OP = 'INSERT' AND (NEW.participant_number IS NULL OR NEW.participant_number = '') THEN
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
        
        -- Generate participant number
        NEW.participant_number := generate_participant_number(campus_abbrev);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers with proper conditions
CREATE TRIGGER trigger_auto_generate_participant_number
    BEFORE INSERT ON participants
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_participant_number();

-- Only create updated_at trigger if the column exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'participants' AND column_name = 'updated_at') THEN
        CREATE TRIGGER update_participants_updated_at 
            BEFORE UPDATE ON participants
            FOR EACH ROW 
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Test the fix
SELECT 'Testing trigger fix...' as status;

-- Verify triggers are working
DO $$
DECLARE
    test_campus_id UUID;
    test_participant_id UUID;
BEGIN
    -- Get a campus ID
    SELECT id INTO test_campus_id FROM campuses WHERE abbreviation = 'UI' LIMIT 1;
    
    -- Test insert
    INSERT INTO participants (name, campus, campus_id) 
    VALUES ('Trigger Test User', 'Universitas Indonesia', test_campus_id)
    RETURNING id INTO test_participant_id;
    
    -- Test update (this should not cause the updated_at error)
    UPDATE participants 
    SET is_present = true, attended_at = NOW() 
    WHERE id = test_participant_id;
    
    -- Clean up
    DELETE FROM participants WHERE id = test_participant_id;
    
    RAISE NOTICE 'Trigger fix test completed successfully';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Trigger fix test failed: %', SQLERRM;
        -- Clean up on error
        DELETE FROM participants WHERE name = 'Trigger Test User';
END $$;
