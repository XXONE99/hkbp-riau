-- Verify database setup and data
SELECT 'Checking admin_users table...' as status;
SELECT COUNT(*) as admin_count FROM admin_users;
SELECT username FROM admin_users;

SELECT 'Checking campuses table...' as status;
SELECT COUNT(*) as campus_count FROM campuses;
SELECT name, abbreviation FROM campuses ORDER BY name;

SELECT 'Checking participants table...' as status;
SELECT COUNT(*) as participant_count FROM participants;
SELECT participant_number, name, campus, is_present FROM participants ORDER BY participant_number;

SELECT 'Checking event_settings table...' as status;
SELECT COUNT(*) as settings_count FROM event_settings;
SELECT event_name, attendance_enabled FROM event_settings;

-- Test participant number generation
SELECT 'Testing participant number generation...' as status;
SELECT 
  c.abbreviation,
  COUNT(p.id) as current_count,
  c.abbreviation || LPAD((COUNT(p.id) + 1)::text, 2, '0') as next_number
FROM campuses c
LEFT JOIN participants p ON p.campus_id = c.id
GROUP BY c.id, c.abbreviation
ORDER BY c.abbreviation;
