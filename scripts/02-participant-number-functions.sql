-- Function to generate next participant number for a campus
CREATE OR REPLACE FUNCTION generate_participant_number(campus_abbrev TEXT)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    formatted_number TEXT;
BEGIN
    -- Get the highest existing number for this campus
    SELECT COALESCE(
        MAX(
            CAST(
                SUBSTRING(participant_number FROM LENGTH(campus_abbrev) + 1) AS INTEGER
            )
        ), 
        0
    ) + 1
    INTO next_number
    FROM participants 
    WHERE participant_number LIKE campus_abbrev || '%'
    AND participant_number ~ ('^' || campus_abbrev || '[0-9]+$');
    
    -- Format number with leading zeros (minimum 2 digits)
    formatted_number := LPAD(next_number::TEXT, 2, '0');
    
    RETURN UPPER(campus_abbrev) || formatted_number;
END;
$$ LANGUAGE plpgsql;

-- Function to validate participant number format
CREATE OR REPLACE FUNCTION validate_participant_number(p_number TEXT, campus_abbrev TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN p_number ~ ('^' || UPPER(campus_abbrev) || '[0-9]{2,}$');
END;
$$ LANGUAGE plpgsql;

-- Trigger function to auto-generate participant number
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
    END IF;
    
    -- If still null, use first letters of campus name
    IF campus_abbrev IS NULL THEN
        campus_abbrev := UPPER(LEFT(REPLACE(COALESCE(NEW.campus, 'UNK'), ' ', ''), 3));
    END IF;
    
    -- Generate participant number if not provided
    IF NEW.participant_number IS NULL OR NEW.participant_number = '' THEN
        NEW.participant_number := generate_participant_number(campus_abbrev);
    END IF;
    
    -- Update campus_id if not set
    IF NEW.campus_id IS NULL AND NEW.campus IS NOT NULL THEN
        SELECT id INTO NEW.campus_id 
        FROM campuses 
        WHERE name = NEW.campus;
    END IF;
    
    -- Set updated_at
    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-generating participant numbers
DROP TRIGGER IF EXISTS trigger_auto_generate_participant_number ON participants;
CREATE TRIGGER trigger_auto_generate_participant_number
    BEFORE INSERT OR UPDATE ON participants
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_participant_number();

-- Function to update campus updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_campuses_updated_at BEFORE UPDATE ON campuses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_admin_users_updated_at BEFORE UPDATE ON admin_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_settings_updated_at BEFORE UPDATE ON event_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
