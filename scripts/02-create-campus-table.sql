-- Create campuses table
CREATE TABLE campuses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
('Universitas Sebelas Maret', 'UNS');

-- Enable Row Level Security
ALTER TABLE campuses ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow all operations on campuses" ON campuses FOR ALL USING (true);

-- Add unique constraint for abbreviation
ALTER TABLE campuses ADD CONSTRAINT unique_campus_abbreviation UNIQUE (abbreviation);
