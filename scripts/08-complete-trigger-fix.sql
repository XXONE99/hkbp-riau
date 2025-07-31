-- Complete fix for the updated_at trigger issue
-- This script will ensure the participants table has the updated_at column
-- and fix all triggers properly

-- First, let's check and add the updated_at column if it doesn't exist
DO $$
BEGIN
    -- Add updated_at column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'participants' AND column_name = 'updated_at') THEN
        ALTER TABLE participants ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        RAISE NOTICE 'Added updated_at column to participants table';
    ELSE
        RAISE NOTICE 'updated_at column already exists in participants table';
    END IF;
END $$;

-- Drop ALL existing triggers and functions to start fresh
DROP TRIGGER IF EXISTS trigger_auto_generate_participant_number ON participants;
DROP TRIGGER IF EXISTS update_participants_updated_at ON participants;
DROP FUNCTION IF EXISTS auto_generate_participant_number() CASCADE;
DROP FUNCTION IF EXISTS update_participants_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

-- Create a simple updated_at function that always works
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a participant number generation function that doesn't touch updated_at
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

-- Create triggers separately for INSERT and UPDATE
CREATE TRIGGER trigger_auto_generate_participant_number
    BEFORE INSERT ON participants
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_participant_number();

CREATE TRIGGER trigger_set_updated_at
    BEFORE UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Update existing participants to have updated_at if they don't
UPDATE participants 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Test the fix
SELECT 'Testing complete trigger fix...' as status;

DO $$
DECLARE
    test_campus_id UUID;
    test_participant_id UUID;
    old_updated_at TIMESTAMP;
    new_updated_at TIMESTAMP;
BEGIN
    -- Get a campus ID
    SELECT id INTO test_campus_id FROM campuses WHERE abbreviation = 'UI' LIMIT 1;
    
    -- Test 1: Insert new participant
    INSERT INTO participants (name, campus, campus_id) 
    VALUES ('Complete Test User', 'Universitas Indonesia', test_campus_id)
    RETURNING id INTO test_participant_id;
    
    RAISE NOTICE 'Test 1: Insert completed successfully';
    
    -- Get the updated_at before update
    SELECT updated_at INTO old_updated_at FROM participants WHERE id = test_participant_id;
    
    -- Wait a moment
    PERFORM pg_sleep(1);
    
    -- Test 2: Update attendance (this was causing the error)
    UPDATE participants 
    SET is_present = true, attended_at = NOW() 
    WHERE id = test_participant_id;
    
    -- Get the updated_at after update
    SELECT updated_at INTO new_updated_at FROM participants WHERE id = test_participant_id;
    
    RAISE NOTICE 'Test 2: Update completed successfully';
    RAISE NOTICE 'Updated_at changed from % to %', old_updated_at, new_updated_at;
    
    -- Clean up
    DELETE FROM participants WHERE id = test_participant_id;
    
    RAISE NOTICE 'Complete trigger fix test passed successfully!';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Complete trigger fix test failed: %', SQLERRM;
        -- Clean up on error
        DELETE FROM participants WHERE name = 'Complete Test User';
END $$;

-- Verify the table structure
SELECT 'Verifying participants table structure...' as status;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'participants' 
ORDER BY ordinal_position;

-- Show current triggers
SELECT 'Current triggers on participants table:' as status;
SELECT trigger_name, event_manipulation, action_timing, action_statement
FROM information_schema.triggers 
WHERE event_object_table = 'participants';
