-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create admin users table
CREATE TABLE IF NOT EXISTS admin_users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create campuses table
CREATE TABLE IF NOT EXISTS campuses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create participants table
CREATE TABLE IF NOT EXISTS participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  participant_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  campus TEXT NOT NULL,
  campus_id UUID REFERENCES campuses(id),
  is_present BOOLEAN DEFAULT FALSE,
  attended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event settings table
CREATE TABLE IF NOT EXISTS event_settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_name TEXT NOT NULL DEFAULT 'Parheheon HKBP Riau 2025',
  attendance_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin user (username: admin, password: admin123)
INSERT INTO admin_users (username, password) 
VALUES ('admin', 'admin123')
ON CONFLICT (username) DO NOTHING;

-- Insert default campuses
INSERT INTO campuses (name, abbreviation) VALUES 
('Universitas Indonesia', 'UI'),
('Institut Teknologi Bandung', 'ITB'),
('Universitas Gadjah Mada', 'UGM'),
('Universitas Padjadjaran', 'UNPAD'),
('Institut Teknologi Sepuluh Nopember', 'ITS'),
('Universitas Airlangga', 'UNAIR'),
('Universitas Brawijaya', 'UB'),
('Universitas Diponegoro', 'UNDIP'),
('Universitas Hasanuddin', 'UNHAS'),
('Universitas Sebelas Maret', 'UNS'),
('Universitas Riau', 'UNRI'),
('Universitas Cenderawasih', 'UNCEN')
ON CONFLICT (abbreviation) DO NOTHING;

-- Insert default event settings
INSERT INTO event_settings (event_name, attendance_enabled) 
VALUES ('Parheheon Naposo HKBP Riau 2025', TRUE)
ON CONFLICT DO NOTHING;

-- Insert sample participants
DO $$
DECLARE
    ui_id UUID;
    itb_id UUID;
    ugm_id UUID;
    unpad_id UUID;
    its_id UUID;
    unri_id UUID;
    uncen_id UUID;
BEGIN
    -- Get campus IDs
    SELECT id INTO ui_id FROM campuses WHERE abbreviation = 'UI';
    SELECT id INTO itb_id FROM campuses WHERE abbreviation = 'ITB';
    SELECT id INTO ugm_id FROM campuses WHERE abbreviation = 'UGM';
    SELECT id INTO unpad_id FROM campuses WHERE abbreviation = 'UNPAD';
    SELECT id INTO its_id FROM campuses WHERE abbreviation = 'ITS';
    SELECT id INTO unri_id FROM campuses WHERE abbreviation = 'UNRI';
    SELECT id INTO uncen_id FROM campuses WHERE abbreviation = 'UNCEN';

    -- Insert sample participants
    INSERT INTO participants (participant_number, name, campus, campus_id, is_present, attended_at) VALUES 
    ('UNCEN01', 'roryah queen', 'Universitas Cenderawasih', uncen_id, TRUE, '2025-01-28T13:51:00Z'),
    ('UGM01', 'Michael Tan', 'Universitas Gadjah Mada', ugm_id, TRUE, '2025-01-28T13:50:00Z'),
    ('UNRI01', 'Andreas Simanjuntak', 'Universitas Riau', unri_id, FALSE, NULL),
    ('ITB01', 'Maria Sitorus', 'Institut Teknologi Bandung', itb_id, TRUE, '2025-01-28T14:15:00Z'),
    ('UI01', 'David Hutabarat', 'Universitas Indonesia', ui_id, FALSE, NULL),
    ('UNPAD01', 'Sarah Manurung', 'Universitas Padjadjaran', unpad_id, TRUE, '2025-01-28T14:30:00Z'),
    ('ITS01', 'Jonathan Siahaan', 'Institut Teknologi Sepuluh Nopember', its_id, FALSE, NULL)
    ON CONFLICT (participant_number) DO NOTHING;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_participants_number ON participants(participant_number);
CREATE INDEX IF NOT EXISTS idx_participants_campus ON participants(campus);
CREATE INDEX IF NOT EXISTS idx_participants_campus_id ON participants(campus_id);
CREATE INDEX IF NOT EXISTS idx_participants_present ON participants(is_present);
CREATE INDEX IF NOT EXISTS idx_campuses_abbreviation ON campuses(abbreviation);

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we're handling auth manually)
CREATE POLICY "Allow all operations on admin_users" ON admin_users FOR ALL USING (true);
CREATE POLICY "Allow all operations on participants" ON participants FOR ALL USING (true);
CREATE POLICY "Allow all operations on campuses" ON campuses FOR ALL USING (true);
CREATE POLICY "Allow all operations on event_settings" ON event_settings FOR ALL USING (true);
