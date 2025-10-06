-- Add goals column to studio_student table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'studio_student' AND column_name = 'goals'
    ) THEN
        ALTER TABLE studio_student ADD COLUMN goals TEXT;
    END IF;
END
$$;

-- Create index for faster lookups of student-studio relationships
CREATE INDEX IF NOT EXISTS idx_studio_student_ids
ON studio_student(student_id, studio_id);

-- Add comment to explain the purpose of the column
COMMENT ON COLUMN studio_student.goals IS 'Client fitness goals specific to this studio';