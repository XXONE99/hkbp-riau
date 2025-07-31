-- Verify that the trigger fix is working properly
SELECT 'Testing participant insertion...' as status;

-- Test 1: Insert with campus_id
DO $$
DECLARE
    test_campus_id UUID;
    inserted_participant_number TEXT;
BEGIN
    -- Get a campus ID
    SELECT id INTO test_campus_id FROM campuses WHERE abbreviation = 'UI' LIMIT 1;
    
    -- Insert test participant
    INSERT INTO participants (name, campus, campus_id) 
    VALUES ('Test User 1', 'Universitas Indonesia', test_campus_id)
    RETURNING participant_number INTO inserted_participant_number;
    
    RAISE NOTICE 'Test 1 - Inserted participant with number: %', inserted_participant_number;
    
    -- Clean up
    DELETE FROM participants WHERE name = 'Test User 1';
END $$;

-- Test 2: Insert without campus_id (should still work)
DO $$
DECLARE
    inserted_participant_number TEXT;
BEGIN
    -- Insert test participant without campus_id
    INSERT INTO participants (name, campus) 
    VALUES ('Test User 2', 'Universitas Indonesia')
    RETURNING participant_number INTO inserted_participant_number;
    
    RAISE NOTICE 'Test 2 - Inserted participant with number: %', inserted_participant_number;
    
    -- Clean up
    DELETE FROM participants WHERE name = 'Test User 2';
END $$;

-- Test 3: Update participant (should set updated_at)
DO $$
DECLARE
    test_campus_id UUID;
    test_participant_id UUID;
    old_updated_at TIMESTAMP;
    new_updated_at TIMESTAMP;
BEGIN
    -- Get a campus ID
    SELECT id INTO test_campus_id FROM campuses WHERE abbreviation = 'ITB' LIMIT 1;
    
    -- Insert test participant
    INSERT INTO participants (name, campus, campus_id) 
    VALUES ('Test User 3', 'Institut Teknologi Bandung', test_campus_id)
    RETURNING id INTO test_participant_id;
    
    -- Get initial updated_at
    SELECT updated_at INTO old_updated_at FROM participants WHERE id = test_participant_id;
    
    -- Wait a moment
    PERFORM pg_sleep(1);
    
    -- Update the participant
    UPDATE participants SET name = 'Test User 3 Updated' WHERE id = test_participant_id;
    
    -- Get new updated_at
    SELECT updated_at INTO new_updated_at FROM participants WHERE id = test_participant_id;
    
    RAISE NOTICE 'Test 3 - Updated_at changed: % -> %', old_updated_at, new_updated_at;
    
    -- Clean up
    DELETE FROM participants WHERE id = test_participant_id;
END $$;

SELECT 'All trigger tests completed!' as status;

-- Show current participants count
SELECT COUNT(*) as current_participants_count FROM participants;

-- Show current campuses
SELECT name, abbreviation FROM campuses ORDER BY name;
