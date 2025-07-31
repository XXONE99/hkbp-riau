-- Create admin users table
CREATE TABLE admin_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create participants table
CREATE TABLE participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  campus TEXT NOT NULL,
  is_present BOOLEAN DEFAULT FALSE,
  attended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create event settings table
CREATE TABLE event_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL DEFAULT 'Parheheon HKBP Riau 2025',
  attendance_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default admin user (username: admin, password: admin123)
INSERT INTO admin_users (username, password) VALUES ('admin', 'admin123');

-- Insert default event settings
INSERT INTO event_settings (event_name, attendance_enabled) VALUES ('Parheheon HKBP Riau 2025', FALSE);

-- Enable Row Level Security
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since we're handling auth manually)
CREATE POLICY "Allow all operations on admin_users" ON admin_users FOR ALL USING (true);
CREATE POLICY "Allow all operations on participants" ON participants FOR ALL USING (true);
CREATE POLICY "Allow all operations on event_settings" ON event_settings FOR ALL USING (true);
