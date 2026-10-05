-- Run this in your Supabase SQL Editor
-- Go to: https://supabase.com/dashboard -> Your Project -> SQL Editor

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  email TEXT NOT NULL,
  website_type TEXT,
  budget TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Allow anyone to INSERT (for your form)
CREATE POLICY "allow_insert" ON leads FOR INSERT WITH CHECK (true);

-- Allow anyone to SELECT (for admin - using API key which bypasses RLS anyway)
CREATE POLICY "allow_select" ON leads FOR SELECT USING (true);

-- Allow DELETE for admin
CREATE POLICY "allow_delete" ON leads FOR DELETE USING (true);
