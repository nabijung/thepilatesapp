-- Add temp_password column to student table
ALTER TABLE student
ADD COLUMN IF NOT EXISTS temp_password BOOLEAN DEFAULT FALSE;


-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_student_email ON student(email);
CREATE INDEX IF NOT EXISTS idx_instructor_email ON instructor(email);