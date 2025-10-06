-- Add profile_picture column to student table
ALTER TABLE student
ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;

-- Create index on profile_picture_url for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_profile_picture ON student(profile_picture_url);