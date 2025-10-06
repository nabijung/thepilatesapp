-- Add instructor_notes column to studio_student table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'studio_student' AND column_name = 'instructor_notes'
    ) THEN
        ALTER TABLE studio_student ADD COLUMN instructor_notes TEXT;
    END IF;
END
$$;