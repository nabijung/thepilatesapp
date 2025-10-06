-- Add temp_password column to instructor table
ALTER TABLE student
ADD COLUMN IF NOT EXISTS temp_password BOOLEAN DEFAULT FALSE;